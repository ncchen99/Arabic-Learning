/* 阿拉伯文處理工具 —— 搜尋比對與雜湊 */

// 短母音符號、tatweel 等變音記號
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;

/** 去掉母音符號並統一字形，讓「قهوة」也能搜到「قَهْوَة」 */
export function normalizeArabic(s = '') {
  return s
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim();
}

export const hasArabic = (s = '') => /[؀-ۿ]/.test(s);

/** 搜尋用的正規化：阿拉伯文去符號、其他語言轉小寫 */
export function searchKey(s = '') {
  return normalizeArabic(String(s)).toLowerCase();
}

/** 穩定的內容雜湊，當作共用快取的 key（FNV-1a，夠用且不需要非同步） */
export function hashKey(s = '') {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // 再跑一輪不同種子，降低碰撞機率
  let g = 0x9e3779b9;
  for (let i = str.length - 1; i >= 0; i--) {
    g ^= str.charCodeAt(i);
    g = Math.imul(g, 0x85ebca6b) >>> 0;
  }
  return h.toString(36) + g.toString(36);
}
