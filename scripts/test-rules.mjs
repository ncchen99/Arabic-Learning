/* 用真的 ID token 打 Firestore REST API，驗證線上安全規則。
   - account 使用者：用 IAM signJwt 產生 custom token（sign_in_provider = 'custom'，
     跟 Google 登入一樣「不是匿名」）
   - 訪客：直接用 REST 開一個真的匿名帳號（sign_in_provider = 'anonymous'） */

import { execSync } from 'node:child_process';

const PROJECT = 'kalima-arabic';
const API_KEY = 'AIzaSyAGH6UvBV0CPIBa23kAfpzFK6GDehqNbgo';
const SA = 'firebase-adminsdk-fbsvc@kalima-arabic.iam.gserviceaccount.com';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const ADMIN = execSync('gcloud auth print-access-token', {
  env: { ...process.env, CLOUDSDK_PYTHON: '/opt/homebrew/bin/python3.11' },
}).toString().trim();

async function customToken(uid) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: SA, sub: SA, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now, exp: now + 3600, uid,
  };
  const r = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA}:signJwt`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: JSON.stringify(claims) }),
    }
  );
  const d = await r.json();
  if (!d.signedJwt) throw new Error(JSON.stringify(d));
  return d.signedJwt;
}

async function idTokenFromCustom(uid) {
  const token = await customToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }) }
  );
  const d = await r.json();
  if (!d.idToken) throw new Error(JSON.stringify(d));
  return { idToken: d.idToken, uid: uidOf(d.idToken) };
}

// signInWithCustomToken 不一定回 localId，直接從 JWT 取
function uidOf(idToken) {
  return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()).user_id;
}

async function anonToken() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const d = await r.json();
  if (!d.idToken) throw new Error(JSON.stringify(d));
  return { idToken: d.idToken, uid: d.localId };
}

const S = (v) => ({ stringValue: v });
const B = (v) => ({ booleanValue: v });
const I = (v) => ({ integerValue: String(v) });

async function call(method, path, auth, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.text() };
}

const results = [];
function check(name, expect, got) {
  // 讀不存在的文件會回 404，那代表規則放行了（被擋是 403）
  const ok = expect === 'allow'
    ? got.status < 300 || got.status === 404
    : got.status === 403 || got.status === 401;
  results.push({ name, expect, status: got.status, ok });
  console.log(`${ok ? '✅' : '❌'}  ${name}  (expect ${expect}, http ${got.status})`);
  if (!ok) console.log('    ', got.body.slice(0, 220));
}

const owner = await idTokenFromCustom('rules-test-owner');
const other = await idTokenFromCustom('rules-test-other');
const guest = await anonToken();
console.log('owner', owner.uid, '| other', other.uid, '| guest(anon)', guest.uid, '\n');

const openRoom = 'zzrulestestopen00000';
const lockRoom = 'zzrulestestlock00000';

const roomFields = (uid, open) => ({
  fields: {
    name: S('規則測試教室'), emblem: S('lantern'), ownerUid: S(uid),
    ownerName: S('tester'), openEdit: B(open), cardCount: I(0),
  },
});

/* ── 建立教室 ───────────────────────────────────────── */
check('訪客不能建立教室', 'deny',
  await call('POST', `/rooms?documentId=${openRoom}x`, guest.idToken, roomFields(guest.uid, true)));
check('不能冒用別人的 uid 當擁有者', 'deny',
  await call('POST', `/rooms?documentId=${openRoom}y`, owner.idToken, roomFields(other.uid, true)));
check('登入者可以建立自己的教室（開放編輯）', 'allow',
  await call('POST', `/rooms?documentId=${openRoom}`, owner.idToken, roomFields(owner.uid, true)));
check('登入者可以建立自己的教室（唯讀）', 'allow',
  await call('POST', `/rooms?documentId=${lockRoom}`, owner.idToken, roomFields(owner.uid, false)));

/* ── 讀取：連結即權限 ───────────────────────────────── */
check('完全沒登入也能讀教室', 'allow', await call('GET', `/rooms/${openRoom}`, null));
check('沒人能列舉全站教室', 'deny', await call('GET', '/rooms?pageSize=10', owner.idToken));

/* ── 卡片 ───────────────────────────────────────────── */
const card = { fields: { arabic: S('قَهْوَة'), chinese: S('咖啡'), transliteration: S('qahwa') } };

check('開放教室：登入者可以新增卡片', 'allow',
  await call('POST', `/rooms/${openRoom}/cards?documentId=c1`, other.idToken, card));
check('開放教室：訪客不能新增卡片', 'deny',
  await call('POST', `/rooms/${openRoom}/cards?documentId=c2`, guest.idToken, card));
check('唯讀教室：非擁有者不能新增卡片', 'deny',
  await call('POST', `/rooms/${lockRoom}/cards?documentId=c3`, other.idToken, card));
check('唯讀教室：擁有者可以新增卡片', 'allow',
  await call('POST', `/rooms/${lockRoom}/cards?documentId=c3`, owner.idToken, card));
check('完全沒登入也能讀卡片清單', 'allow', await call('GET', `/rooms/${lockRoom}/cards`, null));
check('唯讀教室：非擁有者不能刪卡片', 'deny',
  await call('DELETE', `/rooms/${lockRoom}/cards/c3`, other.idToken));

/* ── 教室設定 ───────────────────────────────────────── */
const rename = { fields: { ...roomFields(owner.uid, true).fields, name: S('被改名了') } };
check('非擁有者不能改教室設定', 'deny',
  await call('PATCH', `/rooms/${openRoom}?updateMask.fieldPaths=name`, other.idToken,
    { fields: { name: S('駭客改的') } }));
check('非擁有者不能刪除教室', 'deny', await call('DELETE', `/rooms/${openRoom}`, other.idToken));
check('擁有者可以改教室設定', 'allow',
  await call('PATCH', `/rooms/${openRoom}?updateMask.fieldPaths=name`, owner.idToken, rename));

/* ── 共用快取 ───────────────────────────────────────── */
check('訪客可以讀共用語音快取', 'allow', await call('GET', '/audio/none', guest.idToken));
check('完全沒登入不能讀共用快取', 'deny', await call('GET', '/audio/none', null));
check('沒人能竄改既有的 lexicon', 'deny',
  await call('PATCH', '/lexicon/zzruleslex?updateMask.fieldPaths=arabic', owner.idToken,
    { fields: { arabic: S('x') } }));
check('訪客可以讀土耳其語快取', 'allow', await call('GET', '/turkish/none', guest.idToken));
check('完全沒登入不能讀土耳其語快取', 'deny', await call('GET', '/turkish/none', null));
check('訪客可以新增土耳其語快取', 'allow',
  await call('POST', '/turkish?documentId=zzrulestr', guest.idToken,
    { fields: { turkish: S('teşekkürler'), note: S('測試') } }));
check('沒人能竄改既有的土耳其語快取', 'deny',
  await call('PATCH', '/turkish/zzrulestr?updateMask.fieldPaths=turkish', owner.idToken,
    { fields: { turkish: S('駭客改的') } }));

/* ── 我的教室清單 ───────────────────────────────────── */
check('別人不能看我的教室清單', 'deny',
  await call('GET', `/users/${owner.uid}/rooms`, other.idToken));
check('自己可以寫自己的教室清單', 'allow',
  await call('PATCH', `/users/${owner.uid}/rooms/${openRoom}?updateMask.fieldPaths=name`, owner.idToken,
    { fields: { name: S('規則測試教室') } }));

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} 通過`);

/* ── 用 owner 權限（繞過規則）把測試資料清乾淨 ─────── */
for (const p of [
  `/rooms/${openRoom}/cards/c1`, `/rooms/${lockRoom}/cards/c3`,
  `/rooms/${openRoom}`, `/rooms/${lockRoom}`,
  `/users/${owner.uid}/rooms/${openRoom}`, '/turkish/zzrulestr',
]) {
  await fetch(BASE + p, { method: 'DELETE', headers: { Authorization: `Bearer ${ADMIN}` } });
}
console.log('測試資料已清除');
console.log('要刪掉的測試帳號 uid:', [owner.uid, other.uid, guest.uid].join(' '));
