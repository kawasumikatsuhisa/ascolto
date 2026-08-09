import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service Worker は本番ビルドでのみ登録する（dev では邪魔になる）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // base が './' なので、いま開いている文書の位置から sw.js を解決する。
    // これで GitHub Pages のサブパス配信でも正しいスコープになる。
    const url = new URL('sw.js', document.baseURI);
    navigator.serviceWorker.register(url).catch(() => {
      /* オフライン化に失敗してもアプリ自体は動く */
    });
  });
}
