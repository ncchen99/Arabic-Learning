import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
      manifest: {
        name: 'Kalima 阿拉伯語單字卡',
        short_name: 'Kalima',
        description: '輸入中文或阿拉伯語，AI 幫你做成帶母音符號的單字卡，還有標準發音。',
        lang: 'zh-Hant',
        dir: 'ltr',
        theme_color: '#0C1A21',
        background_color: '#0C1A21',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 字型檔比較大，放寬預快取上限
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            // Firestore 與 Auth 的請求絕對不要被 SW 快取
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
