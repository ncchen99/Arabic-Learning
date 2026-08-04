/* POST /api/turkish  { arabic, chinese, pos }  →  土耳其語對照區塊

   同一張單字卡的土耳其語補充。刻意跟 /api/generate 分開，因為：
   ─ 舊卡片（在這個功能之前建立的）也要能補上，不必重做整張卡；
   ─ 結果存在共用的 turkish/{hash}，一個字全站只會呼叫一次 OpenAI。

   用的是土耳其官方標準語（İstanbul Türkçesi / TDK Güncel Türkçe Sözlük），
   不是任何地方口音。 */

import { cors, rateLimit, readJson } from './_shared.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['turkish', 'turkish_alt', 'pos', 'from_arabic', 'arabic_source', 'note'],
  properties: {
    turkish: {
      type: 'string',
      maxLength: 90,
      description: 'TDK 標準土耳其語的對應詞或短句，用土耳其文正字法（含 ı İ ö ü ç ş ğ）',
    },
    turkish_alt: {
      type: 'string',
      maxLength: 120,
      description: '其他常見說法或同義詞，用「、」分隔；沒有就空字串',
    },
    pos: {
      type: 'string',
      maxLength: 30,
      description: '土耳其語這個詞的詞性或類型，例如「名詞」「動詞（不定式）」「短句」「形容詞」',
    },
    from_arabic: {
      type: 'boolean',
      description: '這個土耳其語詞是不是從阿拉伯語借來的（Arapça kökenli）',
    },
    arabic_source: {
      type: 'string',
      maxLength: 60,
      description:
        'from_arabic 為 true 時，填來源的阿拉伯語詞（含母音符號）加上拉丁轉寫，格式「كِتَاب kitāb」；否則空字串',
    },
    note: {
      type: 'string',
      maxLength: 130,
      description: '土耳其語用法提示，一到兩句話，35 個中文字以內，以句號結尾',
    },
  },
};

const INSTRUCTIONS = `你是土耳其語教學專家，服務對象是說繁體中文（台灣）、正在同時學阿拉伯語的初學者。

使用者會給你一張阿拉伯語單字卡的內容（阿拉伯語詞條、中文意思、詞性）。
請提供「這個意思在土耳其語怎麼說」。

【語言標準】
- 一律使用土耳其官方標準語（İstanbul Türkçesi，以 TDK《Güncel Türkçe Sözlük》為準）。
- 不要用任何地方方言、鄂圖曼土耳其語古語或已經廢棄的詞。
- 名詞用主格單數、不加所有格詞尾；動詞用不定式（-mak / -mek 結尾）。
- 正字法要正確，該用 ı 的地方不要寫成 i，該用 İ 的地方不要寫成 I。

【阿拉伯語借詞】
- 土耳其語有大量阿拉伯語借詞（kitap、kahve、merhaba、saat、hayat…）。
  如果這個土耳其語詞確實源自阿拉伯語，from_arabic 填 true，
  arabic_source 填來源的阿拉伯語詞（含母音符號）與拉丁轉寫。
- 只有真的是阿拉伯語詞源才填 true。波斯語、法語、希臘語借詞或突厥語固有詞都填 false，
  arabic_source 留空字串。不確定就填 false，寧可漏掉也不要編造詞源。

【note 怎麼寫】
- 重點放在「正式與口語的差別」「使用場合」「和中文或阿拉伯語不同的地方」
  或「同一個字在土耳其語和阿拉伯語意思有出入之處」。
- 一到兩句話就好（35 個中文字以內），簡短精準比長篇更好。
- 只寫給學習者看的內容本身，不要提到字數、格式或你被交代的規則。

【通用規則】
- 所有說明使用繁體中文、台灣用語，不要用簡體或中國用語。
- 除了土耳其文、阿拉伯文、繁體中文和拉丁轉寫之外，不要出現其他文字系統的字元。`;

/* 只允許土耳其文正字法會用到的字元，擋掉模型偶爾漂到別的語言的情況。
   turkish_alt 是用「、」串起來的清單，所以多放行中文的頓號與斜線。 */
const TURKISH_OK = /^[A-Za-zÇçĞğİıÖöŞşÜü0-9\s.,!?'’\-()]+$/;
const TURKISH_LIST_OK = /^[A-Za-zÇçĞğİıÖöŞşÜü0-9\s.,!?'’\-()、，；;/／]+$/;

function looksBroken(tr) {
  if (!tr.turkish || !TURKISH_OK.test(tr.turkish)) return true;
  if (tr.turkish_alt && !TURKISH_LIST_OK.test(tr.turkish_alt)) return true;
  // 尾端陷入重複迴圈
  if (/(.{1,4})\1{6,}/.test(`${tr.turkish} ${tr.note}`)) return true;
  return false;
}

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  if (!rateLimit(req, res, { max: 30, windowMs: 60_000 })) return;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: '伺服器未設定 OPENAI_API_KEY' });

  let arabic, chinese, pos;
  try {
    ({ arabic, chinese, pos } = await readJson(req));
  } catch {
    return res.status(400).json({ error: '請求格式錯誤' });
  }

  arabic = typeof arabic === 'string' ? arabic.trim().slice(0, 200) : '';
  chinese = typeof chinese === 'string' ? chinese.trim().slice(0, 90) : '';
  pos = typeof pos === 'string' ? pos.trim().slice(0, 30) : '';
  if (!arabic || !chinese) return res.status(400).json({ error: '缺少單字內容' });

  const input = `阿拉伯語：${arabic}\n中文意思：${chinese}${pos ? `\n詞性：${pos}` : ''}`;

  async function askOnce() {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        instructions: INSTRUCTIONS,
        input,
        max_output_tokens: 4000,
        reasoning: { effort: 'low' },
        text: {
          format: { type: 'json_schema', name: 'turkish_note', strict: true, schema: SCHEMA },
        },
      }),
    });

    const data = await r.json();
    if (!r.ok || data.error) {
      console.error('OpenAI error', r.status, JSON.stringify(data.error));
      throw new Error('土耳其語內容產生失敗，請稍後再試');
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

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const tr = await askOnce();
      if (looksBroken(tr)) {
        lastError = new Error('AI 這次回應有問題，請再試一次');
        console.warn('degenerate turkish output', { arabic, attempt });
        continue;
      }
      /* 詞源不確定時寧可不顯示，也不要給學習者錯的資訊。
         說是借詞卻交不出阿拉伯語來源，就當作沒說 —— 但土耳其語本身還是好的，
         沒必要為了這一欄整個重來。 */
      if (!tr.from_arabic || !/[؀-ۿ]/.test(tr.arabic_source || '')) {
        tr.from_arabic = false;
        tr.arabic_source = '';
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ tr });
    } catch (e) {
      lastError = e;
      console.warn('turkish attempt failed', { arabic, attempt, message: e.message });
    }
  }

  console.error('turkish failed', lastError);
  return res.status(502).json({ error: lastError?.message || '產生土耳其語內容時發生錯誤' });
}
