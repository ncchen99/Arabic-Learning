#!/usr/bin/env node
/* 產生 Kalima 阿拉伯語學習小教室 PWA App Icon
   使用 Hugeicons 中的 AlphabetArabicIcon / BookOpen01Icon 圖標
   滿版 Midnight Desert 深青藍背景 × 溫潤黃銅金漸層，確保 iOS 與 Android 100% 滿版 cover 填滿。 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AlphabetArabicIcon, BookOpen01Icon } from '@hugeicons/core-free-icons';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** 將 Hugeicons 圖標資料轉為 SVG path 元素 */
function renderIconPaths(iconData, strokeColor = 'url(#gold)', strokeWidth = 1.75) {
  return iconData.map(([tag, attrs]) => {
    const a = { ...attrs };
    delete a.key;
    a.stroke = strokeColor;
    if (a.fill === 'currentColor') a.fill = strokeColor;
    else if (!a.fill) a.fill = 'none';
    
    const origWidth = a.strokeWidth ? parseFloat(a.strokeWidth) : 1.5;
    a.strokeWidth = (origWidth * (strokeWidth / 1.5)).toFixed(2);

    const attrStr = Object.entries(a)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}="${v}"`)
      .join(' ');
    return `<${tag} ${attrStr} />`;
  }).join('\n    ');
}

// 選用 Hugeicons 的 AlphabetArabicIcon (代表阿拉伯語字母/語言學習)
const iconPaths = renderIconPaths(AlphabetArabicIcon, 'url(#gold)', 1.8);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- 午夜沙漠深色背景漸層 -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14303c"/>
      <stop offset="100%" stop-color="#0c1a21"/>
    </linearGradient>

    <!-- 黃銅金金屬漸層 -->
    <linearGradient id="gold" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="#f5e1ad"/>
      <stop offset="40%" stop-color="#c4a05c"/>
      <stop offset="100%" stop-color="#967232"/>
    </linearGradient>

    <!-- 立體陰影 -->
    <filter id="icon-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- 100% 滿版 cover 背景，無圓角、無留白 -->
  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- 背景點綴：微弱幾何圓環與星紋暗紋 (Safe Zone 內飾) -->
  <circle cx="256" cy="256" r="216" fill="none" stroke="#c4a05c" stroke-opacity="0.18" stroke-width="2"/>
  <circle cx="256" cy="256" r="184" fill="none" stroke="#c4a05c" stroke-opacity="0.08" stroke-width="1.5" stroke-dasharray="5 5"/>

  <!-- 主圖標：Hugeicons AlphabetArabicIcon (縮放並置中於 256, 256) -->
  <g filter="url(#icon-shadow)" transform="translate(106, 106) scale(12.5)">
    <g stroke-linecap="round" stroke-linejoin="round">
      ${iconPaths}
    </g>
  </g>
</svg>
`;

fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public', 'icon.svg'), svg);
console.log('✔ public/icon.svg generated successfully!');
