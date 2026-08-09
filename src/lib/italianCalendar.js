/**
 * 曜日・月・日付・時刻のイタリア語表現。
 * 数詞は italianNumbers.js の toItalian() に委ねる。
 */

import { toItalian, featureTags } from './italianNumbers.js';

/** JavaScript の Date#getDay() と同じ並び（0 = 日曜） */
export const WEEKDAYS = [
  { it: 'domenica', ja: '日曜日', jaShort: '日' },
  { it: 'lunedì', ja: '月曜日', jaShort: '月' },
  { it: 'martedì', ja: '火曜日', jaShort: '火' },
  { it: 'mercoledì', ja: '水曜日', jaShort: '水' },
  { it: 'giovedì', ja: '木曜日', jaShort: '木' },
  { it: 'venerdì', ja: '金曜日', jaShort: '金' },
  { it: 'sabato', ja: '土曜日', jaShort: '土' },
];

/** 添字 0 = 1月 */
export const MONTHS = [
  { it: 'gennaio', ja: '1月' },
  { it: 'febbraio', ja: '2月' },
  { it: 'marzo', ja: '3月' },
  { it: 'aprile', ja: '4月' },
  { it: 'maggio', ja: '5月' },
  { it: 'giugno', ja: '6月' },
  { it: 'luglio', ja: '7月' },
  { it: 'agosto', ja: '8月' },
  { it: 'settembre', ja: '9月' },
  { it: 'ottobre', ja: '10月' },
  { it: 'novembre', ja: '11月' },
  { it: 'dicembre', ja: '12月' },
];

/** 各月の日数（閏年は考慮せず2月は28日までとする） */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const daysInMonth = (month) => DAYS_IN_MONTH[month - 1];

/**
 * 日にちの語。1日だけ序数 primo を使い、2日以降は基数。
 * @param {number} day 1〜31
 */
export function dayWord(day) {
  return day === 1 ? 'primo' : toItalian(day);
}

/**
 * 日付の前に置く定冠詞。母音で始まる語の前では il が l' に縮まる。
 * l'otto marzo / l'undici marzo / il primo marzo / il tre marzo
 */
export function dateArticle(day) {
  return /^[aeiou]/.test(dayWord(day)) ? "l'" : 'il ';
}

/**
 * 日付のイタリア語表現。
 * @param {number} month 1〜12
 * @param {number} day 1〜31
 * @param {object} [opts]
 * @param {number|null} [opts.weekday] 0〜6。指定すると曜日を前置し冠詞を省く
 * @param {number|null} [opts.year] 指定すると年を後置する
 */
export function dateToItalian(month, day, opts = {}) {
  const { weekday = null, year = null } = opts;
  const monthWord = MONTHS[month - 1].it;
  const core = `${dayWord(day)} ${monthWord}`;

  let text;
  if (weekday === null) {
    text = `${dateArticle(day)}${core}`;
  } else {
    // 曜日を前に置くときは冠詞をつけない: domenica otto marzo
    text = `${WEEKDAYS[weekday].it} ${core}`;
  }

  if (year !== null) text += ` ${toItalian(year)}`;
  return text;
}

/** 日付に対応する練習タグ */
export function dateTags(month, day) {
  const tags = [`month:${MONTHS[month - 1].it}`];
  if (day === 1) tags.push('date:primo');
  if (dateArticle(day) === "l'") tags.push('date:elisione-articolo');
  tags.push(...featureTags(day).map((t) => t.replace(/^num:/, 'date:num-')));
  return tags;
}

/** 12時間制の時（1〜12）に変換する。0時は 12 として扱う。 */
function to12(hour24) {
  const h = hour24 % 12;
  return h === 0 ? 12 : h;
}

/** 「Sono le 〜」か「È l'una」か。1時だけ単数形になる。 */
function hourPhrase(hour12) {
  return hour12 === 1 ? "È l'una" : `Sono le ${toItalian(hour12)}`;
}

/**
 * 時刻のイタリア語表現。
 *
 * 会話体（既定）:
 *   - ちょうど 0分 は「Sono le tre」、12時は mezzogiorno、0時は mezzanotte
 *   - 1時は単数で「È l'una」
 *   - 1〜30分は「e 〜」。15分は e un quarto、30分は e mezza
 *   - 31〜59分は次の時から引いて「meno 〜」。45分は meno un quarto
 * 公式体（24時間制。駅のアナウンスなど）:
 *   - 「Sono le quattordici e quarantacinque」のように時も分も基数で読む
 *
 * @param {number} hour 0〜23
 * @param {number} minute 0〜59
 * @param {object} [opts]
 * @param {boolean} [opts.official] 24時間制で読む
 */
export function timeToItalian(hour, minute, opts = {}) {
  if (opts.official) {
    const head = hour === 1 ? "È l'una" : `Sono le ${toItalian(hour)}`;
    return minute === 0 ? head : `${head} e ${toItalian(minute)}`;
  }

  if (minute === 0) {
    if (hour === 12) return 'È mezzogiorno';
    if (hour === 0) return 'È mezzanotte';
    return hourPhrase(to12(hour));
  }

  if (minute <= 30) {
    const tail =
      minute === 15 ? 'un quarto' : minute === 30 ? 'mezza' : toItalian(minute);
    return `${hourPhrase(to12(hour))} e ${tail}`;
  }

  // 31分以降は次の時から引く: 7:45 -> Sono le otto meno un quarto
  const nextHour12 = (to12(hour) % 12) + 1;
  const remaining = 60 - minute;
  const tail = remaining === 15 ? 'un quarto' : toItalian(remaining);
  return `${hourPhrase(nextHour12)} meno ${tail}`;
}

/** 時刻に対応する練習タグ */
export function timeTags(hour, minute, opts = {}) {
  if (opts.official) return ['time:ufficiale'];

  const tags = [];
  if (minute === 0) {
    tags.push('time:in-punto');
    if (hour === 12) tags.push('time:mezzogiorno');
    if (hour === 0) tags.push('time:mezzanotte');
  } else if (minute <= 30) {
    tags.push('time:e');
    if (minute === 15) tags.push('time:un-quarto');
    if (minute === 30) tags.push('time:mezza');
  } else {
    tags.push('time:meno');
    if (minute === 45) tags.push('time:un-quarto');
  }

  const shownHour = minute > 30 ? (to12(hour) % 12) + 1 : to12(hour);
  if (shownHour === 1 && !(minute === 0 && (hour === 0 || hour === 12))) {
    tags.push('time:una');
  }
  return tags;
}

/** 時刻を "14:45" 形式で表示する */
export function formatClock(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
