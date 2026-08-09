# ascolto

イタリア語の**数字・日付・時刻・曜日・月**を、「見て分かる」から「思い出して言える」に
持っていくための反復練習アプリ。

選択式ではありません。問題を見て**自分で答えを作ってから**めくり、言えたかどうかを
自己採点します。片手・立ったまま・音を出せない・電波が切れる、という電車内の条件で
使えるように作ってあります。

## 使い方

1. 「はじめる」で1セット（既定20問）が始まる
2. 問題を見て、まず声に出す（出せなければ頭の中で最後まで言い切る）
3. 「めくる」で答えと規則の解説が出る
4. **だめ / あやふや / 言えた** で自己採点する

間違えたものはそのセット内で数問後にもう一度出ます。さらに、どの**規則**で
間違えたかを記録しているので、次のセットからその規則が多く出るようになります。

- 操作するボタンはすべて画面の下（親指の届く範囲）に置いてあります
- 読み上げは既定でオフ。答えの下の「♪ 聞く」を押したときだけ鳴ります
- ホーム画面に追加すればオフラインで起動します
- 設定・成績はこの端末の localStorage にだけ保存されます（サーバーへの送信なし）

PC で使うときは、Space でめくる、1/2/3 で採点、S で読み上げ。

## 出題

| カテゴリ | 例 |
| --- | --- |
| 数字 | `347` → trecentoquarantasette（範囲は 0〜20 / 0〜100 / 0〜1000 / 0〜9999） |
| 時刻 | `03:45` → Sono le quattro meno un quarto（24時間制の言い方も設定でオン） |
| 日付 | `3月8日` → l'otto marzo / `1999年` → millenovecentonovantanove |
| 曜日 | `木曜日` → giovedì / `mercoledì の次は？` → giovedì |
| 月 | `9月` → settembre / `giugno` → 6月 |

向きは「日本語 → 伊」「両方」「伊 → 日本語」から選べます。既定は両方（産出が主）。

## 中核：数詞の生成

`src/lib/italianNumbers.js` の `toItalian(n)` が 0〜9999 を綴りに変換します。
副作用のない純粋関数で、実装ミスがそのまま覚え間違いになる場所なので、
**テストが最優先**です（`npm test`）。

実装している規則:

| 規則 | 例 |
| --- | --- |
| 1〜19 は個別の語 | sedici / diciassette / diciotto / diciannove |
| 20以上の十の位 | venti / trenta / … / novanta |
| 一の位が 1・8 のとき十の位の語末母音を落とす | ventuno / ventotto / ottantotto |
| 末尾の tre はアクセント付き | ventitré / centotré / milletré（単独の 3 は tre） |
| 百の位は cento、1 のとき倍数語なし | cento / duecento（×unocento） |
| o で始まる語の前で cento の o が落ちる | centotto / centottanta / ottocentottantotto |
| 千の位は 1 なら mille、2以上は 〜mila | mille / duemila / ottomila |
| 分かち書きしない | novemilanovecentonovantanove |

網羅テストとして、0〜9999 の全域について次を検証しています。

- 空白・ハイフンが入らない / 使う文字が `[a-zé]` に収まる
- 1万通りの綴りがすべて一意（取り違えがない）
- `oo` が現れない（cento の脱落漏れの検出）
- `venti|trenta|…` の直後に `uno`/`otto` が続かない（母音脱落の漏れの検出）
- `é` は語末の `tré` にしか現れない

時刻・日付側（`src/lib/italianCalendar.js`）も 0:00〜23:59 の全域を検証しています。

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm test         # 全テスト（数詞・暦・出題・保存）
npm run build    # dist/ を作り、sw.js を生成する
npm run preview  # ビルド結果の確認（Service Worker もここで効く）
npm run icons    # public/icons/*.png を生成し直す
```

構成:

```
src/lib/italianNumbers.js    数詞の生成（純粋関数・最重要）
src/lib/italianCalendar.js   曜日・月・日付・時刻の表現
src/lib/generator.js         出題の生成と、苦手な規則への重み付け
src/lib/storage.js           localStorage と成績の更新
src/lib/speech.js            Web Speech API（it-IT）
src/screens/                 画面
src/styles.css               CSS（1ファイル）
scripts/generate-sw.mjs      ビルド後に Service Worker を生成
scripts/generate-icons.mjs   アイコンを生成（依存パッケージなし）
```

依存は React と Vite（＋テストの Vitest）だけです。UI ライブラリは使っていません。

## デプロイ

push すると GitHub Actions がテスト → ビルド → GitHub Pages 公開まで行います
（`.github/workflows/deploy.yml`）。`vite.config.js` の `base` は `'./'` なので、
`https://<user>.github.io/<repo>/` のようなサブパス配信でも動きます。

リポジトリ側では **Settings → Pages → Source** を **GitHub Actions** にしておく
必要があります（設定済み）。

公開の対象ブランチは `main` と、いまの作業ブランチです。`main` を作ったあとは、
ワークフローの `branches:` から作業ブランチの行を消してください。

Pull Request では test と build までは走り、デプロイは行いません。

## オフライン

`scripts/generate-sw.mjs` がビルド後に `dist` を走査し、ハッシュ付きのファイル名も
含めて全ファイルをプリキャッシュする Service Worker を書き出します。版名は
成果物の内容から作るので、中身が変わったときだけ古いキャッシュが捨てられます。
一度開いたあとは、通信が切れても起動します。
