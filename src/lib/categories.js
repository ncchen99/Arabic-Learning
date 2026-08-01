/* 分類清單必須與 server/api/generate.js 的 CATEGORIES 一致。
   每個分類配一個 Hugeicons 線條圖示（不用 emoji，才能跟整體線條風格一致）。 */

import {
  AlAqsaMosqueIcon, Airplane01Icon, BookOpen01Icon, BubbleChatIcon, Clock01Icon,
  FavouriteIcon, FlashIcon, HandPrayerIcon, Home05Icon, PaintBoardIcon,
  Restaurant01Icon, ShoppingBag02Icon, SparklesIcon, StethoscopeIcon,
  SunCloud01Icon, UserGroupIcon,
} from '@hugeicons/core-free-icons';

export const CATEGORIES = [
  '日常對話', '飲食', '旅行交通', '購物數字',
  '時間日期', '家庭人物', '身體健康', '情緒感受', '自然天氣',
  '居家生活', '工作學習', '動詞', '形容詞', '宗教文化', '其他',
];

const ICONS = {
  問候寒暄: BubbleChatIcon,
  '問候、寒暄': BubbleChatIcon,
  日常對話: BubbleChatIcon,
  飲食: Restaurant01Icon,
  旅行交通: Airplane01Icon,
  購物數字: ShoppingBag02Icon,
  時間日期: Clock01Icon,
  家庭人物: UserGroupIcon,
  身體健康: StethoscopeIcon,
  情緒感受: FavouriteIcon,
  自然天氣: SunCloud01Icon,
  居家生活: Home05Icon,
  工作學習: BookOpen01Icon,
  動詞: FlashIcon,
  形容詞: PaintBoardIcon,
  宗教文化: AlAqsaMosqueIcon,
  其他: SparklesIcon,
};

export const normalizeCategory = (c) => {
  if (!c || c === '問候寒暄' || c === '問候、寒暄') return '日常對話';
  return c;
};

export const categoryIcon = (c) => ICONS[normalizeCategory(c)] || SparklesIcon;
