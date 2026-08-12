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
  // 新しい版が主導権を取ったら、その場で読み込み直す。
  //
  // 新しい Service Worker は入れ替わると同時に古いキャッシュを捨てる。
  // いま開いている画面は古い index.html のままなので、そこから
  // 追加のファイルを取りに行くと、キャッシュにも配信元にも無い
  // （名前にハッシュが入っている）ことになり、真っ白になる。
  // 主導権が移った時点で読み込み直せば、新旧が混ざる時間がなくなる。
  // 初回登録でも主導権は移るが、そのときは中身が同じなので読み込み直さない
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    // base が './' なので、いま開いている文書の位置から sw.js を解決する。
    // これで GitHub Pages のサブパス配信でも正しいスコープになる。
    const url = new URL('sw.js', document.baseURI);
    navigator.serviceWorker.register(url).catch(() => {
      /* オフライン化に失敗してもアプリ自体は動く */
    });
  });
}
