/* 教室徽章：建立教室時挑一個，教室列表與標題會用到 */

import {
  Airplane01Icon, AlAqsaMosqueIcon, BookOpen01Icon, Coffee02Icon,
  LanternIcon, Moon02Icon, Sun03Icon, StarsIcon,
} from '@hugeicons/core-free-icons';

export const EMBLEMS = [
  { id: 'lantern', icon: LanternIcon },
  { id: 'moon', icon: Moon02Icon },
  { id: 'stars', icon: StarsIcon },
  { id: 'mosque', icon: AlAqsaMosqueIcon },
  { id: 'coffee', icon: Coffee02Icon },
  { id: 'book', icon: BookOpen01Icon },
  { id: 'plane', icon: Airplane01Icon },
  { id: 'sun', icon: Sun03Icon },
];

export const DEFAULT_EMBLEM = 'lantern';

export const emblemIcon = (id) =>
  (EMBLEMS.find((e) => e.id === id) || EMBLEMS[0]).icon;
