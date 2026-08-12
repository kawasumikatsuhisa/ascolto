/**
 * 選択肢（誤答）の生成。
 *
 * ここが選択式の肝。無関係な語を並べると「なんとなく見覚えのある方」を
 * 選べてしまい、Duolingo と同じ「見て分かるが言えない」状態のままになる。
 * そこで誤答は、その問題が問うている規則を**適用し忘れた形**を第一候補にする。
 *
 *   21  -> ventuno   に対して ventiuno   （母音脱落の忘れ）
 *   28  -> ventotto  に対して ventiotto
 *   23  -> ventitré  に対して ventitre   （アクセントの忘れ）
 *   180 -> centottanta に対して centoottanta
 *   100 -> cento     に対して unocento
 *   3:45 -> Sono le quattro meno un quarto に対して Sono le tre meno un quarto
 *
 * こうすると「選ぶ」行為がそのまま規則の弁別になる。
 * 入力モードでは判定を諦めていたアクセントの有無も、選択式なら問える。
 */

import { toItalian, ONES, TEENS, TENS } from './italianNumbers.js';
import {
  MONTHS,
  WEEKDAYS,
  dayWord,
  daysInMonth,
  dateToItalian,
  timeToItalian,
  hourPhrase,
  to12Hour,
  formatClock,
} from './italianCalendar.js';
import { topicById } from './vocabulary.js';
import { articleVariants } from './articleDrill.js';

export const CHOICE_COUNT = 4;

// ----------------------------------------------------- 規則を1つだけ破る綴り

/**
 * toItalian() と同じ組み立てだが、フラグで規則を1つずつ無効にできる。
 * フラグを渡さなければ正しい綴りと完全に一致する（テストで担保）。
 */
function spell(n, f = {}) {
  if (n === 0) return 'zero';

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;

  let word = '';
  if (thousands === 1) word = f.milleCounted ? 'unomille' : 'mille';
  else if (thousands > 1) word = ONES[thousands] + (f.milaAsMille ? 'mille' : 'mila');

  if (rest > 0) word += spellUnderThousand(rest, f);

  if (!f.noAccent && n > 3 && word.endsWith('tre')) {
    word = word.slice(0, -3) + 'tré';
  }
  return word;
}

function spellUnderThousand(n, f) {
  if (n < 100) return spellUnderHundred(n, f);

  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  let word = (hundreds === 1 && !f.centoMultiplier ? '' : ONES[hundreds]) + 'cento';
  if (rest === 0) return word;

  const restWord = spellUnderHundred(rest, f);
  if (!f.noCentoElision && restWord.startsWith('o')) word = word.slice(0, -1);
  return word + restWord;
}

function spellUnderHundred(n, f) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];

  const tens = TENS[Math.floor(n / 10)];
  const ones = n % 10;
  if (ones === 0) return tens;

  const stem =
    !f.noTensElision && (ones === 1 || ones === 8) ? tens.slice(0, -1) : tens;
  return stem + ONES[ones];
}

/** 規則を1つだけ破った綴りの一覧。その数に効かない規則は自動的に落ちる。 */
export function ruleVariants(n) {
  const correct = toItalian(n);
  return [
    spell(n, { noTensElision: true }), // ventuno   -> ventiuno
    spell(n, { noCentoElision: true }), // centottanta -> centoottanta
    spell(n, { noAccent: true }), // ventitré  -> ventitre
    spell(n, { centoMultiplier: true }), // cento     -> unocento
    spell(n, { milleCounted: true }), // mille     -> unomille
    spell(n, { milaAsMille: true }), // duemila   -> duemille
  ].filter((word) => word !== correct);
}

/** フラグ無しの spell() は正しい綴りと一致する（テスト用に公開） */
export const spellPlain = (n) => spell(n);

// ------------------------------------------------------------------ 補助

const asString = (v) => (v === null || v === undefined ? null : String(v));

/** 0〜9999 に収まる数だけ綴りに変換する */
const wordOf = (n) =>
  typeof n === 'number' && n >= 0 && n <= 9999 ? toItalian(n) : null;

/** 十の位と一の位を入れ替えた数（47 -> 74）。同じ数になるなら null。 */
function swapDigits(n) {
  const swapped = (n % 10) * 10 + Math.floor((n % 100) / 10) + Math.floor(n / 100) * 100;
  return swapped === n || swapped > 9999 ? null : swapped;
}

// ------------------------------------------------------------ 種類別の誤答

function numberDistractors({ n }, reverse) {
  // 0 の近くは n-1 などが範囲外になるので、候補は多めに並べておく
  const neighbours = [
    n + 1,
    n - 1,
    swapDigits(n),
    n + 10,
    n - 10,
    n + 100,
    n - 100,
    n + 2,
    n + 20,
    n + 3,
  ];

  if (reverse) {
    // 答えが数字のときは、綴りが紛らわしい数を並べる
    return neighbours.map((v) =>
      typeof v === 'number' && v >= 0 && v <= 9999 ? String(v) : null,
    );
  }
  return [
    ...ruleVariants(n), // 規則の適用忘れを最優先で使う
    ...neighbours.map(wordOf),
  ];
}

function timeDistractors({ hour, minute, official }, reverse) {
  if (reverse) {
    const shift = (h, m) => formatClock((h + 24) % 24, (m + 60) % 60);
    return [
      shift(hour + 1, minute),
      shift(hour - 1, minute),
      shift(hour, minute + 15),
      shift(hour, minute - 15),
      shift(hour + 12, minute),
    ];
  }

  const out = [];

  if (!official && minute > 30) {
    // 「次の時に繰り上げる」のを忘れた形。meno でいちばん多い間違い。
    // 1時間前の時刻として綴らせると、un quarto などの言い方はそのままで
    // 時だけが1つ手前になる。
    out.push(timeToItalian((hour + 23) % 24, minute));
  }

  if (to12Hour(hour) === 1 || (minute > 30 && (to12Hour(hour) % 12) + 1 === 1)) {
    // È l'una を Sono le una と言ってしまう形
    out.push(timeToItalian(hour, minute, { official }).replace("È l'una", 'Sono le una'));
  }

  out.push(
    timeToItalian((hour + 1) % 24, minute, { official }),
    timeToItalian((hour + 23) % 24, minute, { official }),
    timeToItalian(hour, (minute + 15) % 60, { official }),
    timeToItalian(hour, (minute + 45) % 60, { official }),
    timeToItalian((hour + 2) % 24, minute, { official }),
  );
  return out;
}

function dateDistractors({ month, day, weekday = null }) {
  const monthWord = MONTHS[month - 1].it;
  const out = [];

  if (day === 1) {
    // 序数を使わず基数で言ってしまう形
    out.push(weekday === null ? `il uno ${monthWord}` : `${WEEKDAYS[weekday].it} uno ${monthWord}`);
  }

  if (weekday === null) {
    // 冠詞の縮約を間違える形（l'otto <-> il otto）
    const correct = dateToItalian(month, day);
    out.push(
      correct.startsWith("l'")
        ? `il ${dayWord(day)} ${monthWord}`
        : `l'${dayWord(day)} ${monthWord}`,
    );
  } else {
    // 曜日を前に置いたのに冠詞を残してしまう形
    out.push(`${WEEKDAYS[weekday].it} ${dateToItalian(month, day)}`);
  }

  const opts = weekday === null ? {} : { weekday };
  const nextMonth = (month % 12) + 1;
  const prevMonth = ((month + 10) % 12) + 1;
  out.push(dateToItalian(nextMonth, Math.min(day, daysInMonth(nextMonth)), opts));
  out.push(dateToItalian(prevMonth, Math.min(day, daysInMonth(prevMonth)), opts));
  if (day + 1 <= daysInMonth(month)) out.push(dateToItalian(month, day + 1, opts));
  if (day > 1) out.push(dateToItalian(month, day - 1, opts));
  if (weekday !== null) {
    // 曜日だけ違う形
    out.push(dateToItalian(month, day, { weekday: (weekday + 1) % 7 }));
    out.push(dateToItalian(month, day, { weekday: (weekday + 6) % 7 }));
  }
  return out;
}

function yearDistractors({ year }) {
  return [
    ...ruleVariants(year),
    wordOf(year + 1),
    wordOf(year - 1),
    wordOf(year + 100),
    wordOf(year - 100),
    wordOf(year + 10),
  ];
}

/** 曜日・月は「隣のもの」がいちばん紛らわしい */
function cycleDistractors(list, index, key) {
  const at = (offset) => list[(index + offset + list.length) % list.length][key];
  return [at(1), at(-1), at(2), at(-2), at(3)];
}

/**
 * 単語の誤答は必ず同じ話題の中から採る。
 * 話題をまたぐと（ciao の誤答が portiere など）意味を知らなくても
 * 消去法で当たってしまい、選択式にする意味がなくなる。
 */
function wordDistractors({ topic, index }, reverse, rng) {
  const entries = topicById(topic)?.entries ?? [];
  const others = entries.filter((_, i) => i !== index);
  return shuffle(others, rng).map((entry) => (reverse ? entry.ja : entry.it));
}

// ------------------------------------------------------------------ 本体

function rawDistractors(item, rng) {
  const source = item.source ?? {};
  switch (source.kind) {
    case 'number':
      return numberDistractors(source, item.reverse);
    case 'time':
      return timeDistractors(source, item.reverse);
    case 'date':
      return dateDistractors(source);
    case 'year':
      return yearDistractors(source);
    case 'weekday':
      return cycleDistractors(WEEKDAYS, source.index, item.reverse ? 'ja' : 'it');
    case 'month':
      return cycleDistractors(MONTHS, source.index, item.reverse ? 'ja' : 'it');
    case 'word':
      return wordDistractors(source, item.reverse, rng);
    case 'article':
      // 語頭の取り違え → 数の取り違え → 性の取り違え の順に並んでいる
      return articleVariants(item.variantSpec);
    default:
      return [];
  }
}

/** Fisher-Yates */
function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 正解を含む選択肢を作る。
 * 誤答は前から順に採るので、規則の適用忘れが必ず1つ目に入る。
 * @returns {string[]} 並びをシャッフルした CHOICE_COUNT 個の選択肢
 */
export function buildChoices(item, rng = Math.random) {
  const seen = new Set([item.answer]);
  const wrong = [];

  for (const candidate of rawDistractors(item, rng)) {
    const text = asString(candidate);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    wrong.push(text);
    if (wrong.length === CHOICE_COUNT - 1) break;
  }

  // 候補が足りないときは選択肢を減らす（水増しした偽の選択肢は作らない）
  return shuffle([item.answer, ...wrong], rng);
}
