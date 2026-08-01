/* Firestore 資料存取
   ─ rooms/{roomId}              學習教室；roomId 本身就是分享連結的通行證
   ─ rooms/{roomId}/cards/{id}   教室裡的單字卡，有連結的人都能讀
   ─ users/{uid}/rooms/{roomId}  「我的教室」清單（登入者才有）
   ─ lexicon/{hash}              AI 產生的內容，全站共用（同一個字只呼叫 OpenAI 一次）
   ─ audio/{hash}                ElevenLabs 語音 base64，全站共用 */

import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { hashKey, searchKey } from './arabic.js';
import { DEFAULT_EMBLEM } from './emblems.js';

/* ── 教室 ───────────────────────────────────────────────── */

/* 沒有邀請碼制度：roomId 就是密碼。32 字元表 × 20 位 ≈ 100 bits，
   猜不到；也刻意避開 0/1/l/o 這些看起來像的字元，方便口頭念出來。 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export function newRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const roomUrl = (roomId) => `${location.origin}/r/${roomId}`;

export async function createRoom(user, { name, emblem, openEdit }) {
  const id = newRoomId();
  await setDoc(doc(db, 'rooms', id), {
    name: name.trim().slice(0, 40),
    emblem: emblem || DEFAULT_EMBLEM,
    ownerUid: user.uid,
    ownerName: (user.displayName || '').slice(0, 40),
    openEdit: openEdit !== false,
    cardCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await rememberRoom(user, { id, name, emblem });
  return id;
}

export function watchRoom(roomId, cb, onError) {
  return onSnapshot(
    doc(db, 'rooms', roomId),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError
  );
}

export const getRoom = async (roomId) => {
  const snap = await getDoc(doc(db, 'rooms', roomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateRoom = (roomId, patch) =>
  updateDoc(doc(db, 'rooms', roomId), { ...patch, updatedAt: serverTimestamp() });

/** 刪除教室：子集合不會自動消失，要自己把卡片清掉 */
export async function deleteRoom(roomId) {
  const snap = await getDocs(collection(db, 'rooms', roomId, 'cards'));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'rooms', roomId));
}

/* ── 我的教室清單 ───────────────────────────────────────── */

/* 訪客沒有帳號，教室清單只好放在這台裝置上 */
const LOCAL_KEY = 'kalima.rooms';

export function localRooms() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocalRooms(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 30)));
}

export function watchMyRooms(uid, cb, onError) {
  const q = query(collection(db, 'users', uid, 'rooms'), orderBy('visitedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

/** 進過的教室記下來，下次打開 App 就在首頁看得到 */
export async function rememberRoom(user, room) {
  const entry = { id: room.id, name: room.name || '學習教室', emblem: room.emblem || DEFAULT_EMBLEM };
  writeLocalRooms([entry, ...localRooms().filter((r) => r.id !== room.id)]);

  if (!user || user.isAnonymous) return;
  try {
    await setDoc(
      doc(db, 'users', user.uid, 'rooms', room.id),
      { name: entry.name, emblem: entry.emblem, visitedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    /* 記錄失敗不影響學習，安靜略過 */
  }
}

export async function forgetRoom(user, roomId) {
  writeLocalRooms(localRooms().filter((r) => r.id !== roomId));
  if (!user || user.isAnonymous) return;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'rooms', roomId));
  } catch {
    /* 同上 */
  }
}

/* ── 教室裡的單字卡 ─────────────────────────────────────── */

export function watchCards(roomId, cb, onError) {
  const q = query(collection(db, 'rooms', roomId, 'cards'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

/** 把 AI 產生的內容存成教室的單字卡，順便建好搜尋索引欄位 */
export async function addCard(roomId, uid, card, sourceText) {
  const ref = await addDoc(collection(db, 'rooms', roomId, 'cards'), {
    ...card,
    source: sourceText || '',
    // 預先算好小寫／去符號的搜尋字串，前端篩選時不必每次重算
    searchIndex: [
      searchKey(card.arabic),
      searchKey(card.arabic_plain),
      searchKey(card.plural),
      (card.transliteration || '').toLowerCase(),
      (card.plural_translit || '').toLowerCase(),
      card.chinese || '',
      card.chinese_alt || '',
      sourceText || '',
    ].join(' '),
    starred: false,
    addedBy: uid,
    createdAt: serverTimestamp(),
  });
  bumpCount(roomId, 1);
  return ref.id;
}

export async function deleteCard(roomId, id) {
  await deleteDoc(doc(db, 'rooms', roomId, 'cards', id));
  bumpCount(roomId, -1);
}

export const setStarred = (roomId, id, starred) =>
  updateDoc(doc(db, 'rooms', roomId, 'cards', id), { starred });

/* 教室列表要顯示張數，所以在教室文件上記一份；算錯也不影響學習 */
function bumpCount(roomId, delta) {
  updateDoc(doc(db, 'rooms', roomId), {
    cardCount: increment(delta),
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

/* ── 共用快取：AI 內容 ──────────────────────────────────── */

export const lexiconKey = (text) => hashKey(searchKey(text));

export async function getLexicon(text) {
  const snap = await getDoc(doc(db, 'lexicon', lexiconKey(text)));
  return snap.exists() ? snap.data() : null;
}

export async function saveLexicon(text, card) {
  try {
    await setDoc(doc(db, 'lexicon', lexiconKey(text)), card);
  } catch {
    /* 快取寫入失敗不影響使用者，安靜略過 */
  }
}

/* ── 共用快取：語音 ─────────────────────────────────────── */

export const audioKey = (text, voice) => hashKey(`${voice}:${text}`);

export async function getAudioDoc(text, voice) {
  const snap = await getDoc(doc(db, 'audio', audioKey(text, voice)));
  return snap.exists() ? snap.data().mp3 : null;
}

export async function saveAudioDoc(text, voice, mp3) {
  try {
    await setDoc(doc(db, 'audio', audioKey(text, voice)), {
      mp3,
      createdAt: serverTimestamp(),
    });
  } catch {
    /* 同上 */
  }
}
