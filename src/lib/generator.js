/**
 * 出題の生成。
 *
 * 「選択肢を見れば分かるが、思い出して言えない」を潰すのが目的なので、
 * 既定の向きは 日本語/数字 -> イタリア語（産出）。
 *
 * 苦手なものだけを多く回すために、各問題には「どの規則を使うか」を表す
 * タグを持たせてある（例: num:elisione-otto, time:meno, date:primo）。
 * 候補をいくつか作り、その中でいちばんタグの重みが高いものを採用する
 * トーナメント方式で、正答率の低い規則が自然と多く出るようにしている。
 */

import { toItalian, featureTags } from './italianNumbers.js';
import { buildChoices } from './choices.js';
import { TOPICS, TOPIC_IDS, topicById } from './vocabulary.js';
import {
  WEEKDAYS,
  MONTHS,
  daysInMonth,
  dateToItalian,
  dateTags,
  timeToItalian,
  timeTags,
  formatClock,
} from './italianCalendar.js';

export const CATEGORIES = [
  { id: 'numbers', ja: '数字', hint: 'uno / venti / cento' },
  { id: 'time', ja: '時刻', hint: 'e / meno' },
  { id: 'date', ja: '日付', hint: 'il primo 〜' },
  { id: 'weekday', ja: '曜日', hint: 'lunedì 〜' },
  { id: 'month', ja: '月', hint: 'gennaio 〜' },
  { id: 'words', ja: '単語', hint: 'あいさつ / カルチョ' },
];

export { TOPICS, TOPIC_IDS } from './vocabulary.js';

export const NUMBER_RANGES = [
  { id: 'r20', ja: '0〜20', min: 0, max: 20 },
  { id: 'r100', ja: '0〜100', min: 0, max: 100 },
  { id: 'r1000', ja: '0〜1000', min: 0, max: 1000 },
  { id: 'r9999', ja: '0〜9999', min: 0, max: 9999 },
];

/** 時刻に使う分。5分刻みを基本にし、15/30/45 を厚めにする。 */
const MINUTES = [
  0, 0, 5, 10, 15, 15, 20, 25, 30, 30, 35, 40, 45, 45, 50, 55,
];

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const randInt = (min, max, rng) => min + Math.floor(rng() * (max - min + 1));

/**
 * 答えを見せるときに一緒に出す短い解説。
 * 「なぜその綴りになるか」を毎回そえることで、間違いが定着しないようにする。
 * 上にあるものほど優先して表示する。
 */
const HINTS = [
  ['num:cento-elisione', 'o で始まる語の前では cento の o が落ちる'],
  ['num:elisione-uno', '十の位の語末母音が落ちる（venti + uno → ventuno）'],
  ['num:elisione-otto', '十の位の語末母音が落ちる（ottanta + otto → ottantotto）'],
  ['num:tre-accento', '複合語の末尾の tre はアクセント付きの tré'],
  ['num:mille', '1000 は mille（unomille とは言わない）'],
  ['num:mila', '2000以上は 〜mila'],
  ['date:primo', '1日だけ序数の primo'],
  ['date:elisione-articolo', "母音で始まる日の前では il が l' になる"],
  ['time:ufficiale', '24時間制。時も分もそのまま基数で読む'],
  ['time:meno', '31分からは次の時に meno でつなぐ'],
  ['time:un-quarto', '15分は un quarto'],
  ['time:mezza', '30分は e mezza'],
  ['time:una', "1時だけ単数で È l'una"],
  ['time:mezzogiorno', '正午は mezzogiorno'],
  ['time:mezzanotte', '深夜0時は mezzanotte'],
  ['weekday:sequenza', '曜日は lunedì から順に'],
  ['month:sequenza', '月は gennaio から順に'],
];

/** タグから解説を1つ選ぶ。該当なしなら null。 */
export function hintFor(tags) {
  for (const [tag, hint] of HINTS) {
    if (tags.includes(tag)) return hint;
  }
  return null;
}

/**
 * タグの重み。未出題と正答率の低いタグを重くする。
 * @param {{seen:number, wrong:number}|undefined} stat
 */
export function tagWeight(stat) {
  if (!stat || !stat.seen) return 3; // 一度も出ていないものを先に見せる
  const wrongRate = stat.wrong / stat.seen;
  const fewSamples = stat.seen < 3 ? 0.7 : 0;
  return 1 + 4 * wrongRate + fewSamples;
}

/** 問題の優先度。いちばん弱いタグに引っぱられるよう最大値を採る。 */
export function scoreItem(item, stats) {
  let best = 0;
  for (const tag of item.tags) best = Math.max(best, tagWeight(stats[tag]));
  return best;
}

// ---------------------------------------------------------------- 数字

function makeNumberItem(settings, rng) {
  const range =
    NUMBER_RANGES.find((r) => r.id === settings.numberRange) ?? NUMBER_RANGES[1];
  const n = randInt(range.min, range.max, rng);
  const word = toItalian(n);
  const reverse = wantsReverse(settings, rng);
  const tags = featureTags(n);

  return {
    key: `num:${n}:${reverse ? 'r' : 'p'}`,
    category: 'numbers',
    source: { kind: 'number', n },
    reverse,
    prompt: reverse ? word : String(n),
    promptNote: reverse ? '数字で言う' : 'イタリア語で言う',
    answer: reverse ? String(n) : word,
    answerNote: hintFor(tags),
    speech: word,
    answerLang: reverse ? 'num' : 'it',
    inputMode: reverse ? 'numeric' : 'text',
    tags,
  };
}

// ---------------------------------------------------------------- 時刻

function makeTimeItem(settings, rng) {
  const official = settings.officialTime && rng() < 0.35;
  const hour = official ? randInt(1, 23, rng) : randInt(0, 23, rng);
  const minute = official ? randInt(0, 59, rng) : pick(MINUTES, rng);
  const phrase = timeToItalian(hour, minute, { official });
  const clock = formatClock(hour, minute);
  const reverse = wantsReverse(settings, rng);
  const tags = timeTags(hour, minute, { official });

  return {
    key: `time:${clock}:${official ? 'u' : 'c'}:${reverse ? 'r' : 'p'}`,
    category: 'time',
    source: { kind: 'time', hour, minute, official },
    reverse,
    prompt: reverse ? phrase : clock,
    promptNote: reverse
      ? '何時何分？'
      : official
        ? '24時間制で言う（Che ore sono?）'
        : 'Che ore sono?',
    answer: reverse ? clock : phrase,
    answerNote: hintFor(tags),
    speech: phrase,
    // 14:45 のコロンは数字キーボードに無いので、時刻は文字キーボードで打たせる
    answerLang: reverse ? 'num' : 'it',
    inputMode: 'text',
    tags,
  };
}

// ---------------------------------------------------------------- 日付

function makeDateItem(settings, rng) {
  const roll = rng();

  // 年だけ読む（duemilaventisei / millenovecentonovantanove）
  if (roll < 0.2) {
    const year = randInt(1900, 2100, rng);
    const tags = ['date:anno', ...featureTags(year)];
    return {
      key: `year:${year}`,
      category: 'date',
      source: { kind: 'year', year },
      reverse: false,
      prompt: `${year}年`,
      promptNote: '年号をイタリア語で言う',
      answer: toItalian(year),
      answerLang: 'it',
      answerNote: hintFor(tags),
      speech: toItalian(year),
      tags,
    };
  }

  // 曜日つきのフルの言い方（実在の日付から曜日を取る）
  if (roll < 0.45) {
    const base = new Date();
    base.setDate(base.getDate() + randInt(-180, 365, rng));
    const month = base.getMonth() + 1;
    const day = base.getDate();
    const weekday = base.getDay();
    const tags = [`weekday:${WEEKDAYS[weekday].it}`, ...dateTags(month, day)];
    return {
      key: `fulldate:${month}-${day}-${weekday}`,
      category: 'date',
      source: { kind: 'date', month, day, weekday },
      reverse: false,
      prompt: `${month}月${day}日(${WEEKDAYS[weekday].jaShort})`,
      promptNote: '曜日から続けて言う',
      answer: dateToItalian(month, day, { weekday }),
      answerLang: 'it',
      answerNote: hintFor(tags) ?? '曜日を前に置くときは冠詞をつけない',
      speech: dateToItalian(month, day, { weekday }),
      tags,
    };
  }

  const month = randInt(1, 12, rng);
  const day = randInt(1, daysInMonth(month), rng);
  const tags = dateTags(month, day);
  return {
    key: `date:${month}-${day}`,
    category: 'date',
    source: { kind: 'date', month, day },
    reverse: false,
    prompt: `${month}月${day}日`,
    promptNote: '冠詞をつけて言う',
    answer: dateToItalian(month, day),
    answerLang: 'it',
    answerNote: hintFor(tags),
    speech: dateToItalian(month, day),
    tags,
  };
}

// ---------------------------------------------------------------- 曜日・月

function makeWeekdayItem(settings, rng) {
  const index = randInt(0, 6, rng);
  const w = WEEKDAYS[index];
  const roll = rng();

  if (roll < 0.2) {
    const next = WEEKDAYS[(index + 1) % 7];
    return {
      key: `weekday-seq:${index}`,
      category: 'weekday',
      source: { kind: 'weekday', index: (index + 1) % 7 },
      reverse: false,
      prompt: `${w.it} の次は？`,
      promptNote: '曜日をイタリア語で',
      answer: next.it,
      answerNote: next.ja,
      speech: next.it,
      answerLang: 'it',
      tags: [`weekday:${next.it}`, 'weekday:sequenza'],
    };
  }

  const reverse = wantsReverse(settings, rng);
  return {
    key: `weekday:${index}:${reverse ? 'r' : 'p'}`,
    category: 'weekday',
    source: { kind: 'weekday', index },
    reverse,
    prompt: reverse ? w.it : w.ja,
    promptNote: reverse ? '日本語で' : 'イタリア語で言う',
    answer: reverse ? w.ja : w.it,
    answerNote: null,
    speech: w.it,
    answerLang: reverse ? 'ja' : 'it',
    tags: [`weekday:${w.it}`],
  };
}

function makeMonthItem(settings, rng) {
  const index = randInt(0, 11, rng);
  const m = MONTHS[index];
  const roll = rng();

  if (roll < 0.2) {
    const next = MONTHS[(index + 1) % 12];
    return {
      key: `month-seq:${index}`,
      category: 'month',
      source: { kind: 'month', index: (index + 1) % 12 },
      reverse: false,
      prompt: `${m.it} の次は？`,
      promptNote: '月をイタリア語で',
      answer: next.it,
      answerNote: next.ja,
      speech: next.it,
      answerLang: 'it',
      tags: [`month:${next.it}`, 'month:sequenza'],
    };
  }

  const reverse = wantsReverse(settings, rng);
  return {
    key: `month:${index}:${reverse ? 'r' : 'p'}`,
    category: 'month',
    source: { kind: 'month', index },
    reverse,
    prompt: reverse ? m.it : m.ja,
    promptNote: reverse ? '日本語で' : 'イタリア語で言う',
    answer: reverse ? m.ja : m.it,
    answerNote: null,
    speech: m.it,
    answerLang: reverse ? 'ja' : 'it',
    tags: [`month:${m.it}`],
  };
}

// ---------------------------------------------------------------- 単語

/** 有効になっている話題。全部オフなら最初の話題に落とす。 */
function activeTopics(settings) {
  const list = TOPIC_IDS.filter((id) => settings.topics?.[id]);
  return list.length ? list : [TOPIC_IDS[0]];
}

function makeWordItem(settings, rng) {
  const topicId = pick(activeTopics(settings), rng);
  const topic = topicById(topicId);
  const index = randInt(0, topic.entries.length - 1, rng);
  const entry = topic.entries[index];
  const reverse = wantsReverse(settings, rng);

  return {
    key: `word:${topicId}:${index}:${reverse ? 'r' : 'p'}`,
    category: 'words',
    source: { kind: 'word', topic: topicId, index },
    reverse,
    prompt: reverse ? entry.it : entry.ja,
    promptNote: `${topic.ja} · ${reverse ? '日本語で' : 'イタリア語で言う'}`,
    answer: reverse ? entry.ja : entry.it,
    answerNote: entry.note ?? null,
    speech: entry.it,
    answerLang: reverse ? 'ja' : 'it',
    // 話題ごとの成績と、単語ごとの成績の両方を取る
    tags: [`word:${topicId}`, `word:${topicId}:${index}`],
  };
}

/** 逆向き（イタリア語 -> 日本語/数字）を出すかどうか */
function wantsReverse(settings, rng) {
  if (settings.direction === 'production') return false;
  if (settings.direction === 'recognition') return true;
  return rng() < 0.3; // both: 産出を主、認識を従にする
}

const BUILDERS = {
  numbers: makeNumberItem,
  time: makeTimeItem,
  date: makeDateItem,
  weekday: makeWeekdayItem,
  month: makeMonthItem,
  words: makeWordItem,
};

/** 有効になっているカテゴリ。全部オフなら数字にフォールバックする。 */
function activeCategories(settings) {
  const list = CATEGORIES.filter((c) => settings.categories[c.id]).map(
    (c) => c.id,
  );
  return list.length ? list : ['numbers'];
}

/** 候補を1つだけ作る（重み付けなし） */
export function buildCandidate(settings, rng = Math.random) {
  const category = pick(activeCategories(settings), rng);
  return BUILDERS[category](settings, rng);
}

/**
 * 候補を複数作り、いちばん苦手なタグを含むものを採用する。
 * @param {object} settings
 * @param {Record<string,{seen:number,wrong:number}>} stats
 * @param {object} [opts]
 * @param {string[]} [opts.recentKeys] 直近に出した key（連続を避ける）
 * @param {number} [opts.candidates] 候補数
 * @param {() => number} [opts.rng]
 */
export function generateItem(settings, stats = {}, opts = {}) {
  const { recentKeys = [], candidates = 6, rng = Math.random } = opts;
  const recent = new Set(recentKeys);

  let best = null;
  let bestScore = -Infinity;

  for (let i = 0; i < candidates; i++) {
    const item = buildCandidate(settings, rng);
    // スコアに揺らぎを入れて、同じ問題ばかりにならないようにする
    let score = scoreItem(item, stats) * (0.75 + 0.5 * rng());
    if (recent.has(item.key)) score -= 100;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  // 選択肢は採用が決まってから作る（捨てる候補のぶんを無駄に作らない）
  return { ...best, choices: buildChoices(best, rng) };
}

/** 話題ぜんぶの成績を表すタグか（word:saluti のように単語の添字が無いもの） */
export function isAggregateTag(tag) {
  const parts = tag.split(':');
  return parts[0] === 'word' && parts.length === 2;
}

/** タグの日本語ラベル（成績画面用） */
export function describeTag(tag) {
  // word:saluti:3 のように区切りが3つある種類があるので、
  // 先頭だけ取って残りは繋ぎ直す（[group, rest] の分割代入だと添字が落ちる）
  const [group, ...restParts] = tag.split(':');
  const rest = restParts.join(':');
  const fixed = {
    'num:zero': 'zero',
    'num:1-10': '1〜10',
    'num:11-19': '11〜19',
    'num:cento': '百の位',
    'num:cento-elisione': 'cento の o 脱落',
    'num:mille': 'mille',
    'num:mila': '〜mila',
    'num:elisione-uno': '十の位 + 1（母音脱落）',
    'num:elisione-otto': '十の位 + 8（母音脱落）',
    'num:tre-accento': '〜tré（アクセント）',
    'time:in-punto': 'ちょうど',
    'time:e': 'e（〜分過ぎ）',
    'time:meno': 'meno（〜分前）',
    'time:un-quarto': 'un quarto（15分）',
    'time:mezza': 'mezza（30分）',
    'time:una': "È l'una（1時）",
    'time:mezzogiorno': 'mezzogiorno',
    'time:mezzanotte': 'mezzanotte',
    'time:ufficiale': '24時間制',
    'date:primo': 'il primo（1日）',
    'date:elisione-articolo': "l'otto / l'undici（冠詞の縮約）",
    'date:anno': '年号',
    'weekday:sequenza': '曜日の順番',
    'month:sequenza': '月の順番',
  };
  if (fixed[tag]) return fixed[tag];
  if (group === 'date' && rest.startsWith('num-')) {
    return `日にちの数字（${rest.slice(4)}）`;
  }
  if (group === 'word') {
    const [topicId, index] = rest.split(':');
    const topic = topicById(topicId);
    if (!topic) return rest;
    // 話題そのもののタグか、単語ごとのタグか
    if (index === undefined) return `${topic.ja}ぜんぶ`;
    return topic.entries[Number(index)]?.it ?? rest;
  }
  return rest;
}

/** タグのグループ（成績画面の見出し） */
export function tagGroup(tag) {
  const group = tag.split(':')[0];
  if (group === 'word') {
    const topic = topicById(tag.split(':')[1]);
    return topic ? `単語 · ${topic.ja}` : '単語';
  }
  return (
    { num: '数字', time: '時刻', date: '日付', weekday: '曜日', month: '月' }[
      group
    ] ?? group
  );
}
