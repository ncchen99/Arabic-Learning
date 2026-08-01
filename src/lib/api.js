/* 呼叫 Vercel 上的 API 代理 —— OpenAI / ElevenLabs 金鑰只存在那一端 */

const BASE = import.meta.env.VITE_API_BASE || 'https://kalima-api.vercel.app';

async function post(path, body) {
  let r;
  try {
    r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('連不上伺服器，請檢查網路');
  }

  let data = {};
  try {
    data = await r.json();
  } catch {
    /* 非 JSON 回應 */
  }
  if (!r.ok) throw new Error(data.error || `伺服器錯誤（${r.status}）`);
  return data;
}

/** 產生一張單字卡的完整內容 */
export async function generateCard(text) {
  const { card } = await post('/api/generate', { text });
  return card;
}

/** 產生阿拉伯語發音，回傳 base64 mp3 */
export async function synthesize(text, voice = 'f') {
  const { mp3 } = await post('/api/tts', { text, voice });
  return mp3;
}
