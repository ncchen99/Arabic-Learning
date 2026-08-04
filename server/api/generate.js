/* POST /api/generate  { text }  →  單字卡內容（OpenAI 結構化輸出）
   使用者輸入中文、阿拉伯語或土耳其語，AI 產出阿拉伯語詞條/句子、母音符號、轉寫、
   分類、詞根、詳細說明與文化提示。比 Google 翻譯多了教學所需的全部欄位，
   而且只要一次 API 呼叫。 */

import { cors, rateLimit, readJson } from './_shared.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

export const CATEGORIES = [
  '日常對話', '飲食', '旅行交通', '購物數字',
  '時間日期', '家庭人物', '身體健康', '情緒感受', '自然天氣',
  '居家生活', '工作學習', '動詞', '形容詞', '宗教文化', '其他',
];

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;

function normalizeArabic(s = '') {
  return String(s)
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim();
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'arabic', 'arabic_plain', 'transliteration', 'chinese', 'chinese_alt',
    'pos', 'plural', 'plural_translit', 'root', 'category', 'note',
  ],
  properties: {
    arabic: { type: 'string', maxLength: 120, description: '標註完整短母音符號(harakat)的敘利亞阿拉伯語單字或短句' },
    arabic_plain: { type: 'string', maxLength: 120, description: '同一個單字或短句，但不含任何符號，供搜尋比對使用' },
    transliteration: { type: 'string', maxLength: 120, description: '敘利亞阿拉伯語學術拉丁轉寫' },
    chinese: { type: 'string', maxLength: 60, description: '最主要的繁體中文意思或翻譯，盡量簡短' },
    chinese_alt: { type: 'string', maxLength: 90, description: '其他常見中文意思，用「、」分隔；沒有就空字串' },
    pos: { type: 'string', maxLength: 30, description: '詞性或類型，例如「短句」「動詞短語」「名詞（陰性）」「動詞」「形容詞」' },
    plural: { type: 'string', maxLength: 90, description: '名詞的複數形（含母音符號）；非名詞、短句或無複數則空字串' },
    plural_translit: { type: 'string', maxLength: 90, description: '複數形的拉丁轉寫；plural 為空字串時這裡也是空字串' },
    root: { type: 'string', maxLength: 30, description: '三字母詞根，字母間以空格分隔，例如「ق ه و」；外來語或短句則空字串' },
    category: { type: 'string', enum: CATEGORIES, description: '單字分類' },
    note: {
      type: 'string',
      maxLength: 150,
      description: '敘利亞方言用法提示或文化小知識，一到兩句話，40 個中文字以內，以句號結尾',
    },
  },
};

/* 模型偶爾會失控：字串尾端陷入重複迴圈（「}]}】}]}...」）、
   混入不相干的文字系統，或是話講到一半被 maxLength 截斷。 */
const REPEAT = /(.{1,4})\1{6,}/;
// 預期只會出現：阿拉伯文、中日韓漢字、注音、拉丁字母、數字、標點、空白
const FOREIGN_SCRIPT =
  /[ऀ-ॿঀ-৿฀-๿Ѐ-ӿ가-힯぀-ヿ֐-׿]/;
// U+FFFD 取代字元與 Unicode 非字元，出現就代表輸出壞掉了
const BROKEN_CHAR = /[\uFFF0-\uFFFF]/;

function looksDegenerate(card) {
  const strings = [
    card.arabic, card.chinese, card.chinese_alt, card.note, card.pos,
    card.plural, card.plural_translit, card.root, card.transliteration,
  ].filter((s) => typeof s === 'string');

  if (strings.some((s) => REPEAT.test(s) || FOREIGN_SCRIPT.test(s) || BROKEN_CHAR.test(s))) {
    return true;
  }

  const note = card.note || '';
  // note 被截斷的徵兆：長度貼著上限，而且結尾不是完整句子
  if (note.length >= 140 && !/[。！？.!?]$/.test(note.trim())) return true;
  // 系統指令外洩到內容裡
  if (/JSON|schema|不要加其他說明|請輸出|欄位/i.test(note)) return true;

  return false;
}

/* 模型偶爾會在講完重點後繼續漂移，寫出前後不搭的第三、四句
   （有時甚至是一整句阿拉伯文）。前兩句幾乎都是好的，所以直接只保留前兩句，
   比起猜哪裡壞掉更可靠。 */
function firstSentences(s, n) {
  if (typeof s !== 'string') return s;
  const parts = s.match(/[^。！？]*[。！？]/g);
  if (!parts || parts.length <= n) return s;
  return parts.slice(0, n).join('').trim();
}

/** 無傷大雅的收尾清理：重複標點、尾端碎片、頭尾空白 */
function tidy(card) {
  const fix = (s) => {
    if (typeof s !== 'string') return s;
    let out = s.trim().replace(/([。！？])[。．.]+$/, '$1');
    // 尾端沒講完的殘句：砍到最後一個句號
    if (!/[。！？]$/.test(out)) {
      const m = out.match(/^([\s\S]*[。！？])[\s\S]{1,15}$/);
      if (m) out = m[1];
    }
    // 「…書面語。ق。」這種：句號後面跟著一小段沒有中文的碎片，整段砍掉
    out = out.replace(/([。！？])[^一-龥。！？]{1,8}[。！？]?$/u, '$1');
    return out.replace(/\s+$/, '');
  };
  card.note = firstSentences(fix(card.note), 2);
  card.chinese = fix(card.chinese);
  return card;
}

const INSTRUCTIONS = `你是敘利亞阿拉伯語（Syrian Levantine Arabic / 敘利亞方言）教學專家，服務對象是說繁體中文（台灣）的初學者。

使用者會輸入「中文」、「阿拉伯語」或「土耳其語」，可能是單字或短句。請據此製作一張學習卡片：

【如果使用者輸入阿拉伯語（單字或短句）】
- arabic 欄位必須直接使用使用者輸入的該阿拉伯單字或句子，絕對不可將其改寫、替換、簡化、補母音符號或強制轉為詞典形（如單數形或動詞原形）。必須完全保持使用者輸入的原文。
- chinese 欄位填寫該阿拉伯語單字或句子的繁體中文翻譯與介紹，chinese_alt 可放其他常見譯法。
- transliteration 欄位提供對應使用者輸入原文字句的敘利亞阿拉伯語學術拉丁轉寫。
- pos 欄位標明詞性或類型（例如「短句」、「動詞短語」、「名詞（陰性）」、「動詞」等）。
- 若輸入為短句或非名詞，plural、plural_translit、root 若不適用可留空字串。

【如果使用者輸入中文】
- 將中文翻譯為「敘利亞阿拉伯語」（Syrian Levantine Arabic / 敘利亞方言）。
- 必須優先提供敘利亞當地日常生活實際使用的口語詞彙與方言習慣表達（例如「你好」用 Marḥaba 或 Shlōnak、「我想」用 Biddī 等）。若該詞彙在敘利亞方言與現代標準阿拉伯語（MSA）中相同，則輸出該通用形式。
- 名詞請以單數、不帶冠詞的形式作為詞條；動詞請用敘利亞口語常見之動詞詞典形或第三人稱陽性單數過去式。
- 阿拉伯語詞條（arabic）必須標註完整的短母音符號（harakat），準確反映敘利亞方言的實際發音與讀法。

【如果使用者輸入土耳其語（拉丁字母，可能含 ı İ ö ü ç ş ğ）】
- 先用土耳其官方標準語（İstanbul Türkçesi，以 TDK 為準）理解它的意思，
  再照「使用者輸入中文」那一段的做法翻成敘利亞阿拉伯語。
- chinese 欄位填的是繁體中文意思，不是土耳其文；卡片的主角永遠是阿拉伯語。
- 土耳其語裡有很多阿拉伯語借詞（kitap、kahve、saat…），但不要為了湊詞源
  硬選一個敘利亞人不會用的詞 —— 一律以敘利亞日常口語實際會說的講法為準。
- 拉丁字母的輸入若其實不是土耳其語（例如英文），就直接照它的意思處理。

【通用規則】
- 所有中文說明使用繁體中文、台灣用語，不要用簡體或中國用語。
- note 要寫得有趣且實用，重點放在「敘利亞方言用語習慣」、「使用場合禮節」、「與現代標準阿拉伯語（MSA）的差異」或「敘利亞/黎凡特文化」，不要空泛。
  一到兩句話就好（40 個中文字以內），寫滿字數不是目標，簡短精準比長篇更好。
- note 只寫給學習者看的內容本身，不要提到字數、格式或你被交代的規則。
- 使用者沒學過阿拉伯字母，主要靠拉丁轉寫學發音，所以轉寫要準確、一致，
  並使用常見的學術轉寫慣例（如 ā ī ū ṣ ḍ ṭ ẓ ḥ ʿ ʾ ō ē），真實反映敘利亞方言發音。
- 除了阿拉伯文、繁體中文和拉丁轉寫之外，不要出現任何其他文字系統的字元。`;

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  if (!rateLimit(req, res, { max: 30, windowMs: 60_000 })) return;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: '伺服器未設定 OPENAI_API_KEY' });

  let text;
  try {
    ({ text } = await readJson(req));
  } catch {
    return res.status(400).json({ error: '請求格式錯誤' });
  }

  text = typeof text === 'string' ? text.trim() : '';
  if (!text) return res.status(400).json({ error: '請輸入內容' });
  if ([...text].length > 40) return res.status(400).json({ error: '一次最多 40 個字' });

  const isArabicInput = /[؀-ۿ]/.test(text);

  async function askOnce() {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: INSTRUCTIONS,
        input: text,
        // reasoning tokens 也算在這個額度裡，給足空間避免被截斷
        max_output_tokens: 8000,
        // 低推理強度：輸出比 effort:none 穩定，又不會太慢
        reasoning: { effort: 'low' },
        text: {
          format: { type: 'json_schema', name: 'arabic_card', strict: true, schema: SCHEMA },
        },
      }),
    });

    const data = await r.json();
    if (!r.ok || data.error) {
      console.error('OpenAI error', r.status, JSON.stringify(data.error));
      throw new Error('AI 產生失敗，請稍後再試');
    }
    if (data.status === 'incomplete') throw new Error('AI 回應被截斷，請再試一次');

    const raw = (data.output || [])
      .filter((o) => o.type === 'message')
      .flatMap((o) => o.content || [])
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text)
      .join('');

    if (!raw) throw new Error('AI 沒有回傳內容');
    return JSON.parse(raw);
  }

  // 截斷或內容失控都值得重試一次，兩次都不行才回報失敗
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const card = await askOnce();
      if (looksDegenerate(card)) {
        lastError = new Error('AI 這次回應有問題，請再試一次');
        console.warn('degenerate output', { text, attempt });
        continue;
      }

      if (isArabicInput) {
        // 直接使用使用者輸入的單字或句子作為卡片的阿拉伯文欄位，不經 AI 改寫或補符號
        card.arabic = text;
        card.arabic_plain = normalizeArabic(text);
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ card: tidy(card) });
    } catch (e) {
      lastError = e;
      console.warn('generate attempt failed', { text, attempt, message: e.message });
    }
  }

  console.error('generate failed', lastError);
  return res.status(502).json({ error: lastError?.message || '產生單字卡時發生錯誤' });
}
