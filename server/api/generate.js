/* POST /api/generate  { text }  →  單字卡內容（OpenAI 結構化輸出）
   使用者輸入中文或阿拉伯語，AI 直接產出阿拉伯語詞條、母音符號、轉寫、
   分類、詞根、例句與文化提示。比 Google 翻譯多了教學所需的全部欄位，
   而且只要一次 API 呼叫。 */

import { cors, rateLimit, readJson } from './_shared.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

export const CATEGORIES = [
  '問候寒暄', '日常對話', '飲食', '旅行交通', '購物數字',
  '時間日期', '家庭人物', '身體健康', '情緒感受', '自然天氣',
  '居家生活', '工作學習', '動詞', '形容詞', '宗教文化', '其他',
];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'arabic', 'arabic_plain', 'transliteration', 'chinese', 'chinese_alt',
    'pos', 'plural', 'plural_translit', 'root', 'category', 'note',
  ],
  properties: {
    arabic: { type: 'string', maxLength: 60, description: '標註完整短母音符號(harakat)的現代標準阿拉伯語詞條' },
    arabic_plain: { type: 'string', maxLength: 60, description: '同一個詞，但不含任何符號，供搜尋比對使用' },
    transliteration: { type: 'string', maxLength: 60, description: '學術拉丁轉寫，例如 qahwa' },
    chinese: { type: 'string', maxLength: 30, description: '最主要的繁體中文意思，盡量簡短' },
    chinese_alt: { type: 'string', maxLength: 60, description: '其他常見中文意思，用「、」分隔；沒有就空字串' },
    pos: { type: 'string', maxLength: 20, description: '詞性，名詞要註明陰陽性，例如「名詞（陰性）」「動詞」「形容詞」' },
    plural: { type: 'string', maxLength: 60, description: '名詞的複數形（含母音符號）；非名詞或無複數則空字串' },
    plural_translit: { type: 'string', maxLength: 60, description: '複數形的拉丁轉寫；plural 為空字串時這裡也是空字串' },
    root: { type: 'string', maxLength: 20, description: '三字母詞根，字母間以空格分隔，例如「ق ه و」；外來語則空字串' },
    category: { type: 'string', enum: CATEGORIES, description: '單字分類' },
    note: {
      type: 'string',
      maxLength: 105,
      description: '用法提示或文化小知識，一到兩句話，40 個中文字以內，以句號結尾',
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
const BROKEN_CHAR = /[￰-￿﷐-﷯]/;

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

const INSTRUCTIONS = `你是阿拉伯語教學專家，服務對象是說繁體中文（台灣）的初學者。

使用者會輸入「中文」或「阿拉伯語」，也可能是短句。請據此製作一張單字卡：
- 阿拉伯語一律使用現代標準阿拉伯語（MSA, الفصحى），不要用方言。
- 所有阿拉伯語詞條與例句都要標註完整的短母音符號（harakat），這是初學者最需要的。
- 若使用者輸入的是阿拉伯語，chinese 欄位放它的中文意思；若輸入中文，則翻成阿拉伯語。
- 名詞請以單數、不帶冠詞的形式作為詞條。動詞請用第三人稱陽性單數過去式（詞典形）。
- 所有中文說明使用繁體中文、台灣用語，不要用簡體或中國用語。
- note 要寫得有趣且實用，例如使用場合、禮節、與文化的關聯，不要空泛。
  一到兩句話就好（40 個中文字以內），寫滿字數不是目標，簡短精準比長篇更好。
- note 只寫給學習者看的內容本身，不要提到字數、格式或你被交代的規則。
- 使用者沒學過阿拉伯字母，主要靠拉丁轉寫學發音，所以轉寫要準確、一致，
  並使用常見的學術轉寫慣例（如 ā ī ū ṣ ḍ ṭ ẓ ḥ ʿ ʾ）。
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
