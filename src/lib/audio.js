/* 三層語音快取：記憶體 → IndexedDB（離線可用）→ Firestore → ElevenLabs
   同一句話一輩子只會真的呼叫一次 ElevenLabs。 */

import { synthesize } from './api.js';
import { audioKey, getAudioDoc, saveAudioDoc } from './store.js';
import { DEFAULT_VOICE } from './voices.js';

const DB_NAME = 'kalima-audio';
const STORE = 'mp3';

let dbPromise;
function idb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(() => null);
  }
  return dbPromise;
}

async function idbGet(key) {
  const d = await idb();
  if (!d) return null;
  return new Promise((resolve) => {
    const r = d.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => resolve(null);
  });
}

async function idbSet(key, value) {
  const d = await idb();
  if (!d) return;
  try {
    d.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
  } catch {
    /* 容量滿了就算了 */
  }
}

const memory = new Map();

function toBlobUrl(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
}

/** 取得可播放的 URL，必要時才產生語音 */
export async function getAudioUrl(text, voice = DEFAULT_VOICE) {
  const key = audioKey(text, voice);

  if (memory.has(key)) return memory.get(key);

  let base64 = await idbGet(key);

  if (!base64) {
    base64 = await getAudioDoc(text, voice);
    if (base64) idbSet(key, base64);
  }

  if (!base64) {
    base64 = await synthesize(text, voice);
    idbSet(key, base64);
    saveAudioDoc(text, voice, base64);
  }

  const url = toBlobUrl(base64);
  memory.set(key, url);
  return url;
}

/* 全 app 共用一個 <audio>，避免多段語音疊在一起播 */
let player;
export async function play(text, voice = DEFAULT_VOICE, rate = 1) {
  const url = await getAudioUrl(text, voice);
  if (!player) player = new Audio();
  player.pause();
  player.src = url;
  player.playbackRate = rate;
  await player.play();
  return player;
}

export function stop() {
  if (player) player.pause();
}

/** 背景預熱：先把語音抓下來，等使用者按播放時就是瞬間的 */
export function prefetch(text, voice = DEFAULT_VOICE) {
  if (!text) return;
  if (navigator.connection?.saveData) return;
  getAudioUrl(text, voice).catch(() => {});
}
