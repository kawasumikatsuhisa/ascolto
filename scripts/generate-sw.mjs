/**
 * ビルド成果物の一覧を Service Worker に埋め込む。
 * ファイル名にハッシュが入っていても取りこぼさないよう、dist を実際に
 * 走査してプリキャッシュ対象を作る。内容から版名を作るので、中身が
 * 変わったときだけ古いキャッシュが捨てられる。
 *
 *   npm run build （vite build のあとに自動で走る）
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const TEMPLATE = path.join(ROOT, 'scripts', 'sw-template.js');

if (!fs.existsSync(DIST)) {
  console.error('dist が見つかりません。先に vite build を実行してください。');
  process.exit(1);
}

/** dist 以下のファイルを相対パスで列挙する */
function walk(dir, base = DIST) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, base);
    return [path.relative(base, full).split(path.sep).join('/')];
  });
}

const files = walk(DIST)
  .filter((file) => file !== 'sw.js')
  .sort();

const hash = crypto.createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(fs.readFileSync(path.join(DIST, file)));
}
const version = hash.digest('hex').slice(0, 12);

const output = fs
  .readFileSync(TEMPLATE, 'utf8')
  .replaceAll('__VERSION__', version)
  .replaceAll('__PRECACHE__', JSON.stringify(files, null, 2));

if (output.includes('__VERSION__') || output.includes('__PRECACHE__')) {
  console.error('sw-template.js のプレースホルダを差し替えられませんでした。');
  process.exit(1);
}

fs.writeFileSync(path.join(DIST, 'sw.js'), output);

console.log(
  `sw.js を生成しました（version ${version}, ${files.length} ファイルをプリキャッシュ）`,
);
