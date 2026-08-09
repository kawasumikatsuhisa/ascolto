/**
 * イタリア語の数詞生成（0〜9999）
 *
 * 綴りの規則:
 *  1. 1〜19 は個別の語 (uno, due, ... sedici, diciassette, diciotto, diciannove)
 *  2. 20以上の十の位は venti / trenta / quaranta / cinquanta / sessanta /
 *     settanta / ottanta / novanta
 *  3. 一の位が 1 または 8 のとき、十の位の語末母音を落とす
 *     venti + uno  -> ventuno / ottanta + otto -> ottantotto
 *  4. 一の位が 3 のときはアクセント付きの tré を使う
 *     ventitré / centotré / milletré （単独の 3 は tre のまま）
 *  5. 百の位は cento。1 のときは倍数語をつけない (cento であって *unocento ではない)
 *     続く語が o で始まるとき cento の語末 o を落とす
 *     cento + otto -> centotto / cento + ottanta -> centottanta
 *  6. 千の位は 1 なら mille、2以上は 〜mila
 *  7. 語はすべて分かち書きせず1語に繋げる
 */

export const MIN_NUMBER = 0;
export const MAX_NUMBER = 9999;

/** 0〜9 の語。倍数語（duecento の due, tremila の tre）にも使う。 */
export const ONES = [
  'zero',
  'uno',
  'due',
  'tre',
  'quattro',
  'cinque',
  'sei',
  'sette',
  'otto',
  'nove',
];

/** 10〜19 の語。規則性がないので個別に持つ。 */
export const TEENS = [
  'dieci',
  'undici',
  'dodici',
  'tredici',
  'quattordici',
  'quindici',
  'sedici',
  'diciassette',
  'diciotto',
  'diciannove',
];

/** 十の位の語。添字が十の位の数字と一致するよう先頭2つは空にしてある。 */
export const TENS = [
  null,
  null,
  'venti',
  'trenta',
  'quaranta',
  'cinquanta',
  'sessanta',
  'settanta',
  'ottanta',
  'novanta',
];

/**
 * 0〜99。アクセントはここでは付けない（複合語の末尾になったときだけ
 * 付くので、最後にまとめて toItalian() で処理する）。
 */
function underHundred(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];

  const tensDigit = Math.floor(n / 10);
  const onesDigit = n % 10;
  const tensWord = TENS[tensDigit];

  if (onesDigit === 0) return tensWord;

  // 規則3: 一の位が 1 か 8 なら十の位の語末母音を落とす
  const stem =
    onesDigit === 1 || onesDigit === 8 ? tensWord.slice(0, -1) : tensWord;

  return stem + ONES[onesDigit];
}

/** 0〜999 */
function underThousand(n) {
  if (n < 100) return underHundred(n);

  const hundredsDigit = Math.floor(n / 100);
  const rest = n % 100;

  // 規則5: 1 のときは倍数語をつけない
  let word = (hundredsDigit === 1 ? '' : ONES[hundredsDigit]) + 'cento';

  if (rest === 0) return word;

  const restWord = underHundred(rest);

  // 規則5: 続く語が o で始まるとき cento の語末 o を落とす
  if (restWord.startsWith('o')) word = word.slice(0, -1);

  return word + restWord;
}

/**
 * 整数をイタリア語の数詞に変換する。
 * @param {number} n 0以上9999以下の整数
 * @returns {string} 分かち書きしない1語の綴り
 */
export function toItalian(n) {
  if (typeof n !== 'number' || !Number.isInteger(n)) {
    throw new TypeError(`toItalian: 整数を渡してください (received: ${n})`);
  }
  if (n < MIN_NUMBER || n > MAX_NUMBER) {
    throw new RangeError(
      `toItalian: ${MIN_NUMBER}〜${MAX_NUMBER} の範囲外です (received: ${n})`,
    );
  }

  if (n === 0) return 'zero';

  const thousandsDigit = Math.floor(n / 1000);
  const rest = n % 1000;

  let word = '';
  // 規則6: 1 なら mille、2以上は 〜mila
  if (thousandsDigit === 1) word = 'mille';
  else if (thousandsDigit > 1) word = ONES[thousandsDigit] + 'mila';

  if (rest > 0) word += underThousand(rest);

  // 規則4: 複合語の末尾に来た tre はアクセントを取る。
  // 単独の 3 (tre) と、末尾が tre で終わらない tredici は対象外。
  if (n > 3 && word.endsWith('tre')) {
    word = word.slice(0, -3) + 'tré';
  }

  return word;
}

/**
 * 表記ゆれを吸収した比較用の正規化。
 * アクセント記号・大文字小文字・空白・アポストロフィを落とすので、
 * 入力チェックでは "ventitre" も "ventitré" として扱える。
 */
export function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // 結合ダイアクリティカルマークを除去
    .toLowerCase()
    .replace(/['’`]/g, '')
    // 時計表記のコロンは端末によって打ちにくいので、14:45 でも 1445 でも通す
    .replace(/[:：]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** 綴りが（表記ゆれを許して）一致するか */
export function matches(input, expected) {
  return normalize(input) === normalize(expected);
}

/**
 * その数を綴るのに必要な規則をタグとして返す。
 * 出題の重み付け（苦手な規則ほど多く出す）と成績表示に使う。
 * @returns {string[]}
 */
export function featureTags(n) {
  const tags = [];
  if (n === 0) return ['num:zero'];

  const thousandsDigit = Math.floor(n / 1000);
  const hundredsDigit = Math.floor((n % 1000) / 100);
  const rest100 = n % 100;
  const tensDigit = Math.floor(rest100 / 10);
  const onesDigit = n % 10;

  if (thousandsDigit === 1) tags.push('num:mille');
  else if (thousandsDigit > 1) tags.push('num:mila');

  if (hundredsDigit > 0) {
    tags.push('num:cento');
    // cento の語末 o が落ちる組み合わせ（8, 80〜89）
    if (rest100 === 8 || (rest100 >= 80 && rest100 <= 89)) {
      tags.push('num:cento-elisione');
    }
  }

  if (rest100 >= 11 && rest100 <= 19) tags.push('num:11-19');
  if (rest100 >= 20) {
    tags.push(`num:${TENS[tensDigit]}`);
    if (onesDigit === 1) tags.push('num:elisione-uno');
    if (onesDigit === 8) tags.push('num:elisione-otto');
    if (onesDigit === 3) tags.push('num:tre-accento');
  }

  if (tags.length === 0) tags.push('num:1-10');
  return tags;
}
