/**
 * 冠詞の出題を組み立てる。
 *
 * 出題は2種類だけ:
 *   1. 名詞を見せて正しい冠詞を選ばせる（定冠詞・不定冠詞）
 *   2. 前置詞結合を穴埋めにする（di a da in su）
 *
 * 答えも誤答も articles.js の規則から作るので、結合形は保存していない。
 * 誤答は「語頭のクラスを取り違えた形」を最優先に置く。il / lo / l' の
 * 選び分けがこの練習の山なので、そこを外させる選択肢がいちばん効く。
 */

import {
  onsetClass,
  definiteArticle,
  indefiniteArticle,
  combine,
  join,
  COMBINING_PREPOSITIONS,
} from './articles.js';
import { NOUNS } from './nouns.js';

const ONSETS = ['consonant', 'special', 'vowel'];

/** 前置詞つきなら結合形に、そうでなければ冠詞そのものを返す */
function applyPreposition(article, preposition) {
  if (!preposition) return article;
  return combine(preposition, article) ?? `${preposition} ${article}`;
}

/**
 * 誤答の候補を、紛らわしい順に並べて返す。
 * 1. 同じ性・数で語頭の判断だけ違う形（il / lo / l'）
 * 2. 同じ性で数だけ違う形
 * 3. 性が違う形
 */
export function articleVariants({ gender, number, kind, preposition, onset }) {
  const make = (g, n, o) =>
    kind === 'indefinite'
      ? indefiniteArticle({ gender: g, onset: o })
      : definiteArticle({ gender: g, number: n, onset: o });

  const correct = applyPreposition(make(gender, number, onset), preposition);
  const otherGender = gender === 'm' ? 'f' : 'm';
  const otherNumber = number === 'plur' ? 'sing' : 'plur';

  const ordered = [];
  // 語頭の取り違え
  for (const o of ONSETS) if (o !== onset) ordered.push(make(gender, number, o));
  // 数の取り違え（不定冠詞に複数形はないので定冠詞のときだけ）
  if (kind !== 'indefinite') {
    for (const o of ONSETS) ordered.push(make(gender, otherNumber, o));
  }
  // 性の取り違え
  for (const o of ONSETS) ordered.push(make(otherGender, number, o));

  const seen = new Set([correct]);
  const out = [];
  for (const article of ordered) {
    const form = applyPreposition(article, preposition);
    if (seen.has(form)) continue;
    seen.add(form);
    out.push(form);
  }
  return out;
}

/** その問題が問うている規則をタグにする（成績で「間違いの型」を見せるため） */
export function articleTags({ kind, number, onset, gender, preposition }) {
  const tags = ['art:tutto'];

  if (preposition) tags.push(`art:prep-${preposition}`);
  else if (kind === 'indefinite') tags.push('art:indeterminativo');
  else tags.push('art:determinativo');

  if (onset === 'special') tags.push(kind === 'indefinite' ? 'art:uno' : 'art:lo');
  else if (onset === 'vowel') {
    if (kind === 'indefinite') {
      tags.push(gender === 'f' ? 'art:un-apostrofo' : 'art:un-vocale');
    } else {
      tags.push(number === 'plur' ? 'art:gli' : 'art:elisione');
    }
  } else if (number === 'plur' && gender === 'm' && kind !== 'indefinite') {
    tags.push('art:i-plurale');
  }

  if (number === 'plur' && kind !== 'indefinite') tags.push('art:plurale');
  return tags;
}

/** 答えの下に出す一行の説明 */
export function articleHint({ kind, number, onset, gender, preposition }) {
  if (onset === 'special') {
    return kind === 'indefinite'
      ? 's+子音・z・gn・ps などの前は uno'
      : number === 'plur'
        ? 's+子音・z などの前の男性複数は gli'
        : 's+子音・z・gn・ps などの前は lo';
  }
  if (onset === 'vowel') {
    if (kind === 'indefinite') {
      return gender === 'f'
        ? "女性で母音始まりのときだけ un'"
        : '男性の母音始まりは un（アポストロフィなし）';
    }
    return number === 'plur'
      ? '母音の前の男性複数は gli'
      : "母音の前は男女とも l'";
  }
  if (preposition) return `${preposition} + 定冠詞は1語に縮まる`;
  if (number === 'plur' && gender === 'm') return '子音の前の男性複数は i';
  return null;
}

/**
 * 冠詞の問題を1つ作る。
 * @param {() => number} rng
 * @param {(arr:any[], rng:() => number) => any} pick
 * @param {(min:number, max:number, rng:() => number) => number} randInt
 */
export function buildArticleItem(rng, pick, randInt) {
  const index = randInt(0, NOUNS.length - 1, rng);
  const noun = NOUNS[index];

  const roll = rng();
  // 前置詞結合はまとめて3割強。残りを定冠詞と不定冠詞で分ける
  const usePreposition = roll < 0.35;
  const kind = !usePreposition && roll > 0.75 ? 'indefinite' : 'definite';
  // 不定冠詞に複数形はない
  const number = kind === 'indefinite' ? 'sing' : rng() < 0.35 ? 'plur' : 'sing';
  const preposition = usePreposition ? pick(COMBINING_PREPOSITIONS, rng) : null;

  const word = number === 'plur' ? noun.plur : noun.sing;
  const onset = onsetClass(word);
  const spec = { gender: noun.gender, number, kind, onset, preposition };

  const article = applyPreposition(
    kind === 'indefinite'
      ? indefiniteArticle({ gender: noun.gender, onset })
      : definiteArticle({ gender: noun.gender, number, onset }),
    preposition,
  );

  const label = preposition
    ? `${preposition} + 定冠詞`
    : kind === 'indefinite'
      ? '不定冠詞'
      : `定冠詞（${number === 'plur' ? '複数' : '単数'}）`;

  return {
    key: `art:${index}:${number}:${kind}:${preposition ?? '-'}`,
    category: 'articles',
    source: { kind: 'article', index, number, articleKind: kind, preposition },
    reverse: false,
    prompt: `___ ${word}`,
    promptNote: `${label} · ${noun.ja}`,
    answer: article,
    answerNote: articleHint(spec),
    speech: join(article, word),
    answerLang: 'it',
    inputMode: 'text',
    tags: articleTags(spec),
    variantSpec: spec,
  };
}
