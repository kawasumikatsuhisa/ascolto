# ascolto

イタリア語の**数字・日付・時刻・曜日・月・よく使う単語**を、「見て分かる」から
「思い出して言える」に持っていくための反復練習アプリ。

片手・立ったまま・音を出せない・電波が切れる、という電車内の条件で使えるように
作ってあります。

## 使い方

1. 「はじめる」で1セット（既定20問）が始まる
2. 問題を見て、まず自分で答えを作る（声に出せない場面なら頭の中で最後まで）
3. 答えると、正誤とその綴りになる規則が出る

回答方法は3つから選べます（設定 → 回答方法）。

| | 内容 |
| --- | --- |
| **選択式**（既定） | 4つから選ぶ。誤答はその規則の「よくある間違い」 |
| めくって自己採点 | 声に出してから答えを見て、だめ / あやふや / 言えた で採点 |
| 入力 | 綴りを打って答え合わせ（アクセント記号は無くても正解） |

### 選択肢の作り方

選択式は、無関係な語を並べると「見覚えのある方」を選べてしまい、
かえって覚えられません。そこで誤答は、**その問題が問うている規則を1つだけ
破った綴り**を優先して使います。

| 問題 | 正解 | 混ぜる誤答 | 問うている規則 |
| --- | --- | --- | --- |
| 21 | ventuno | ventiuno | 母音脱落 |
| 23 | ventitré | ventitre | アクセント |
| 180 | centottanta | centoottanta | cento の o 脱落 |
| 100 | cento | unocento | 倍数語をつけない |
| 2000 | duemila | duemille | 〜mila |
| 3:45 | Sono le quattro meno un quarto | Sono le tre meno un quarto | 次の時に繰り上げる |
| 3月1日 | il primo marzo | il uno marzo | 1日は序数 |

選ぶ行為がそのまま規則の弁別になります。入力モードでは判定を諦めていた
アクセントの有無も、選択式なら問えます。

間違えたものはそのセット内で数問後にもう一度出ます。さらに、どの**規則**（単語なら
どの語）で間違えたかを記録しているので、次のセットからそこが多く出るようになります。

- 操作するボタンはすべて画面の下（親指の届く範囲）に置いてあります
- 長い数詞は語の切れ目（〜mila / 〜cento / 十の位）で折り返します
- 読み上げは既定でオフ。答えの下の「♪ 聞く」を押したときだけ鳴ります
- ホーム画面に追加すればオフラインで起動します
- 設定・成績はこの端末の localStorage にだけ保存されます（サーバーへの送信なし）

PC で使うときは、選択式なら 1〜4 で選んで Space で次へ。めくる方式なら
Space でめくって 1/2/3 で採点。どちらも S で読み上げ。

## 出題

| カテゴリ | 例 |
| --- | --- |
| 数字 | `347` → trecentoquarantasette（範囲は 0〜20 / 0〜100 / 0〜1000 / 0〜9999） |
| 時刻 | `03:45` → Sono le quattro meno un quarto（24時間制の言い方も設定でオン） |
| 日付 | `3月8日` → l'otto marzo / `1999年` → millenovecentonovantanove |
| 曜日 | `木曜日` → giovedì / `mercoledì の次は？` → giovedì |
| 月 | `9月` → settembre / `giugno` → 6月 |
| 単語 | `片道` → solo andata / `il rigore` → PK |

向きは「日本語 → 伊」「両方」「伊 → 日本語」から選べます。既定は両方（産出が主）。

### 単語の話題

単語は話題ごとに分かれていて、設定で個別にオン/オフできます。

| 話題 | 語数 | 例 |
| --- | --- | --- |
| あいさつ | 29 | ciao / prego / in bocca al lupo |
| バール・食事 | 30 | un caffè / il conto / al banco |
| 電車・移動 | 30 | il binario / in ritardo / convalidare |
| カルチョ | 34 | il rigore / il fuorigioco / Forza! |

イタリア語側には冠詞をつけてあります（`il calcio` / `la partita`）。名詞の性は
まとめて覚えるほうが早く、口に出すときも冠詞ごと出てくるためです。

日本語訳だけでは落ちない情報（`scusa` と `scusi` の使い分け、cappuccino は朝だけ、
`in bocca al lupo` の返しは `crepi`、切符は乗る前に convalidare しないと罰金）は、
答えと一緒に注記として出ます。

**選択肢の誤答は必ず同じ話題の中から採ります。** 話題をまたぐと、`ciao` の誤答が
`il portiere` のようになって、意味を知らなくても消去法で当たってしまうためです。

語を足すときは `src/lib/vocabulary.js` の該当する話題に
`{ it, ja, note? }` を追加するだけです。話題ごと足す場合は `TOPICS` に
1ブロック増やせば、設定画面・出題・成績表示にそのまま乗ります。
同じ話題の中でイタリア語と日本語がそれぞれ重複していないことをテストが確認します
（訳が重なると「正解が2つある問題」ができてしまうため）。

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

誤答生成器（`src/lib/choices.js`）は数詞生成器とは別実装なので、規則を1つも
破らない設定で綴らせた結果が `toItalian()` と 0〜9999 の全域で一致することを
テストしています。片方だけ直して食い違う事故を防ぐためです。

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm test         # 全テスト（数詞・暦・語彙・出題・選択肢・保存）
npm run build    # dist/ を作り、sw.js を生成する
npm run preview  # ビルド結果の確認（Service Worker もここで効く）
npm run icons    # public/icons/*.png を生成し直す
```

構成:

```
src/lib/italianNumbers.js    数詞の生成（純粋関数・最重要）
src/lib/italianCalendar.js   曜日・月・日付・時刻の表現
src/lib/vocabulary.js        単語（話題ごとの語彙データ）
src/lib/generator.js         出題の生成と、苦手な規則への重み付け
src/lib/choices.js           選択肢（規則を1つだけ破った誤答）の生成
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
