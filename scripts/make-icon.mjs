#!/usr/bin/env node
/* 產生 App Icon 的來源 SVG：khatam（八角星）金色徽章 × 午夜藍
   幾何用計算的，確保每個角度都精準。
   產出 public/icon.svg，再交給 @vite-pwa/assets-generator 轉成整套 PNG。 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const C = 256; // 畫布中心

/** 產生 n 角星的路徑（2n 個頂點，外半徑與內半徑交替） */
function star(points, R, r, rotate = 0) {
  const step = Math.PI / points;
  const start = -Math.PI / 2 + rotate;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = start + i * step;
    pts.push(`${(C + rad * Math.cos(a)).toFixed(2)} ${(C + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** 正多邊形 */
function poly(sides, R, rotate = 0) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + rotate + (i * 2 * Math.PI) / sides;
    pts.push(`${(C + R * Math.cos(a)).toFixed(2)} ${(C + R * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16394a"/>
      <stop offset="1" stop-color="#0a161d"/>
    </linearGradient>
    <linearGradient id="gold" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#f2d79b"/>
      <stop offset="0.45" stop-color="#d9a94e"/>
      <stop offset="1" stop-color="#a9762a"/>
    </linearGradient>
  </defs>

  <!-- 滿版底色，maskable 安全 -->
  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- 外圈細環 -->
  <circle cx="256" cy="256" r="228" fill="none" stroke="#d9a94e" stroke-opacity=".28" stroke-width="3"/>

  <!-- 主體：八角星 -->
  <path d="${star(8, 196, 118)}" fill="url(#gold)"/>

  <!-- 星內挖空的八邊形，做出「花磚」的層次 -->
  <path d="${poly(8, 104, Math.PI / 8)}" fill="url(#bg)"/>

  <!-- 中央小八角星：內外半徑比拉高，才像花磚的圓花飾而不是星芒 -->
  <path d="${star(8, 82, 54, Math.PI / 8)}" fill="url(#gold)"/>

  <!-- 中心點綴 -->
  <circle cx="256" cy="256" r="26" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="11" fill="#f2d79b"/>
</svg>
`;

fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public', 'icon.svg'), svg);
console.log('✔ public/icon.svg');
