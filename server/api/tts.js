/* POST /api/tts  { text, voice }  →  { mp3: base64 }
   ElevenLabs 阿拉伯語發音。回傳 base64 讓前端存進 Firestore 快取，
   同一句話只會真的呼叫 ElevenLabs 一次。 */

import { cors, rateLimit, readJson } from './_shared.js';

const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

/* 全部是 ElevenLabs 語音庫裡的阿拉伯語母語者（professional voices）。
   key 會進到語音快取的雜湊，所以換 ID 前請一併換 key，避免播到舊的聲音。
   清單必須與 src/lib/voices.js 一致。 */
const VOICES = {
  sana: 'mRdG9GYEjJmIzqbYTidv',   // 女，現代標準阿拉伯語
  anas: 'R6nda3uM038xEEKi7GFl',   // 男，現代標準阿拉伯語
  tariq: '18HMWpalD7cscJTD8lEY',  // 男，現代標準阿拉伯語，低沉
  fatima: 'I3u6waC588j43py1kDN2', // 女，埃及腔
  hasawi: 'kr4VZw8MSZMHE0y2m40n', // 男，沙烏地腔
};
const DEFAULT_VOICE = 'sana';

/* 舊版只有 f／m 兩個代號，留著讓還沒更新的裝置不會壞掉 */
const ALIASES = { f: 'sana', m: 'anas' };

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
  // 只允許阿拉伯文字母、符號與基本標點，避免被拿來當通用 TTS 用
  if (!/[؀-ۿ]/.test(text)) {
    return res.status(400).json({ error: '只支援阿拉伯語發音' });
  }

  const voiceKey = ALIASES[voice] || voice;
  const voiceId = VOICES[voiceKey] || VOICES[DEFAULT_VOICE];

  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: MODEL,
          language_code: 'ar',
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
