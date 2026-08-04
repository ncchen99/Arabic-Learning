/* 發音的聲音清單 —— 全部是阿拉伯語母語者。
   id 會進到語音快取的雜湊，必須與 server/api/tts.js 的 VOICES 一致。 */

export const VOICES = [
  { id: 'sana', name: 'Sana', gender: 'f', dialect: 'msa', hint: '女聲 · 清晰標準，適合初學者' },
  { id: 'anas', name: 'Anas', gender: 'm', dialect: 'msa', hint: '男聲 · 沉穩清楚' },
  { id: 'tariq', name: 'Tariq', gender: 'm', dialect: 'msa', hint: '男聲 · 低沉，像新聞播報' },
  { id: 'fatima', name: 'Fatima', gender: 'f', dialect: 'eg', hint: '女聲 · 埃及腔，日常口語感' },
  { id: 'hasawi', name: 'Hasawi', gender: 'm', dialect: 'sa', hint: '男聲 · 沙烏地腔（海灣地區）' },
];

export const DIALECT_LABEL = {
  msa: '現代標準阿拉伯語',
  eg: '埃及腔',
  sa: '沙烏地腔',
};

export const DEFAULT_VOICE = 'sana';

/* 土耳其語的聲音（伊斯坦堡腔＝官方標準語）。
   刻意不做成另一個設定項：直接跟著使用者選的阿拉伯語聲音的性別走，
   同一張卡片兩種語言聽起來才像同一個人在教。 */
export const TURKISH_VOICES = {
  f: { id: 'mine', name: 'Mine' },
  m: { id: 'selim', name: 'Selim' },
};

export function turkishVoiceFor(arabicVoice) {
  const found = VOICES.find((x) => x.id === normalizeVoice(arabicVoice));
  return TURKISH_VOICES[found.gender].id;
}

/* 舊版存在 localStorage 的是 f／m */
const LEGACY = { f: 'sana', m: 'anas' };

export function normalizeVoice(v) {
  const id = LEGACY[v] || v;
  return VOICES.some((x) => x.id === id) ? id : DEFAULT_VOICE;
}

export const voiceLabel = (v) => {
  const found = VOICES.find((x) => x.id === normalizeVoice(v));
  return `${found.name}· ${found.gender === 'f' ? '女聲' : '男聲'}`;
};
