/* POST /api/tts  { text, voice }  →  { mp3: base64 }
   ElevenLabs 阿拉伯語／土耳其語發音。回傳 base64 讓前端存進 Firestore 快取，
   同一句話只會真的呼叫 ElevenLabs 一次。

   語言是從 voice 推出來的，前端不必也不能自己指定，
   免得有人拿阿拉伯語的聲音去唸別的東西。 */

import { cors, rateLimit, readJson } from './_shared.js';

const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

/* 全部是 ElevenLabs 語音庫裡的母語者（professional voices）。
   key 會進到語音快取的雜湊，所以換 ID 前請一併換 key，避免播到舊的聲音。
   清單必須與 src/lib/voices.js 一致。 */
const VOICES = {
  // 阿拉伯語
  sana: 'mRdG9GYEjJmIzqbYTidv',   // 女，現代標準阿拉伯語
  anas: 'R6nda3uM038xEEKi7GFl',   // 男，現代標準阿拉伯語
  tariq: '18HMWpalD7cscJTD8lEY',  // 男，現代標準阿拉伯語，低沉
  fatima: 'I3u6waC588j43py1kDN2', // 女，埃及腔
  hasawi: 'kr4VZw8MSZMHE0y2m40n', // 男，沙烏地腔
  // 土耳其語（伊斯坦堡腔＝官方標準語）
  mine: '8WPhqbK1tiExOyeiOUT0',   // 女，溫暖清楚
  selim: 'fW7rletfQVdBv3kQJPr2',  // 男，沉穩清楚
};
const DEFAULT_VOICE = 'sana';

/* 沒列出來的一律當阿拉伯語 */
const TURKISH_VOICES = new Set(['mine', 'selim']);

/* 舊版只有 f／m 兩個代號，留著讓還沒更新的裝置不會壞掉 */
const ALIASES = { f: 'sana', m: 'anas' };

/* 每種語言各自的字元白名單：擋掉拿這支 API 當通用 TTS 用 */
const SCRIPT_OK = {
  ar: /[؀-ۿ]/,
  tr: /^[A-Za-zÇçĞğİıÖöŞşÜü0-9\s.,!?'’\-()]+$/,
};

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  if (!rateLimit(req, res, { max: 40, windowMs: 60_000 })) return;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(500).json({ error: '伺服器未設定 ELEVENLABS_API_KEY' });

  let text, voice;
  try {
    ({ text, voice } = await readJson(req));
  } catch {
    return res.status(400).json({ error: '請求格式錯誤' });
  }

  text = typeof text === 'string' ? text.trim() : '';
  if (!text) return res.status(400).json({ error: '沒有要發音的內容' });
  if ([...text].length > 200) return res.status(400).json({ error: '句子太長' });

  const voiceKey = ALIASES[voice] || voice;
  const voiceId = VOICES[voiceKey] || VOICES[DEFAULT_VOICE];
  const lang = TURKISH_VOICES.has(voiceKey) ? 'tr' : 'ar';

  if (!SCRIPT_OK[lang].test(text)) {
    return res
      .status(400)
      .json({ error: lang === 'tr' ? '只支援土耳其語發音' : '只支援阿拉伯語發音' });
  }

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: MODEL,
          language_code: lang,
          voice_settings: { stability: 0.45, similarity_boost: 0.8, speed: 0.92 },
        }),
      }
    );

    if (!r.ok) {
      const detail = await r.text();
      console.error('ElevenLabs error', r.status, detail.slice(0, 400));
      if (r.status === 401 || r.status === 402) {
        return res.status(502).json({ error: '語音服務額度不足或金鑰無效' });
      }
      return res.status(502).json({ error: '語音產生失敗，請稍後再試' });
    }

    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return res.status(502).json({ error: '語音產生失敗' });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ mp3: buf.toString('base64') });
  } catch (e) {
    console.error('tts failed', e);
    return res.status(500).json({ error: '產生語音時發生錯誤' });
  }
}
