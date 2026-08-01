/* 共用工具：CORS、速率限制、請求解析 —— API 金鑰只存在於此伺服器端 */

const ALLOWED = (
  process.env.ALLOWED_ORIGINS ||
  'https://kalima-arabic.web.app,https://kalima-arabic.firebaseapp.com,http://localhost:5173,http://localhost:4173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: '只接受 POST' });
    return false;
  }
  // 瀏覽器一定會帶 Origin；不在白名單就擋掉，避免金鑰被外部網站盜用
  if (!origin || !ALLOWED.includes(origin)) {
    res.status(403).json({ error: '來源不被允許' });
    return false;
  }
  return true;
}

/* 每個 serverless 實例各自計數，是「盡力而為」的防濫用，不是嚴格配額 */
const hits = new Map();
export function rateLimit(req, res, { max = 40, windowMs = 60_000 } = {}) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + windowMs });
  } else if (++rec.n > max) {
    res.status(429).json({ error: '請求太頻繁，請稍後再試' });
    return false;
  }
  if (hits.size > 5000) hits.clear();
  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 64 * 1024) throw new Error('請求內容過大');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
