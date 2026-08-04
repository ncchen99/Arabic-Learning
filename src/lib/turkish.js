/* 土耳其語對照的取得邏輯：記憶體 → Firestore 共用快取 → OpenAI
   跟語音一樣，同一個字全站只會真的產生一次。 */

import { useEffect, useState } from 'react';
import { generateTurkish } from './api.js';
import { getTurkishDoc, saveTurkishDoc, turkishKey } from './store.js';

/* 同一次瀏覽裡在卡片之間來回切換不必重打 Firestore */
const memory = new Map();
/* 同一個字同時被要求兩次時共用同一個 promise，避免重複呼叫 API */
const inflight = new Map();

export async function getTurkish(card) {
  const arabic = card?.arabic;
  if (!arabic) return null;
  const key = turkishKey(arabic);

  if (memory.has(key)) return memory.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    let tr = await getTurkishDoc(arabic).catch(() => null);
    if (!tr) {
      tr = await generateTurkish({
        arabic,
        chinese: card.chinese,
        pos: card.pos,
      });
      saveTurkishDoc(arabic, tr);
    }
    memory.set(key, tr);
    return tr;
  })().finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}

/** 背景預熱：先把下一張卡的土耳其語抓下來 */
export function prefetchTurkish(card) {
  if (!card?.arabic) return;
  if (navigator.connection?.saveData) return;
  getTurkish(card).catch(() => {});
}

/** 卡片的土耳其語區塊；enabled 為 false 時完全不動作 */
export function useTurkish(card, enabled = true) {
  const [state, setState] = useState(() => ({ tr: null, loading: false, error: '' }));
  const [attempt, setAttempt] = useState(0);
  const arabic = card?.arabic;

  useEffect(() => {
    if (!enabled || !arabic) {
      setState({ tr: null, loading: false, error: '' });
      return undefined;
    }

    // 已經在記憶體裡就直接顯示，不要閃一下 loading
    const cached = memory.get(turkishKey(arabic));
    if (cached) {
      setState({ tr: cached, loading: false, error: '' });
      return undefined;
    }

    let alive = true;
    setState({ tr: null, loading: true, error: '' });
    getTurkish(card)
      .then((tr) => alive && setState({ tr, loading: false, error: '' }))
      .catch((e) => alive && setState({ tr: null, loading: false, error: e.message || '載入失敗' }));

    return () => {
      alive = false;
    };
  }, [arabic, enabled, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
