/**
 * 動詞の出題。
 *
 * 活用表を埋めさせるドリルは作らない。文の空欄に正しい形を選ばせる。
 *
 *   Noi ___ al cinema.   （andiamo / vado / andate / andiamo）
 *
 * 誤答は狙って作る。人称違いを基本に、不規則動詞なら「規則どおりに活用して
 * しまった形」（andare の ando）を必ず混ぜる。ここを外させるのがいちばん効く。
 */

import {
  PERSONS,
  conjugateRegular,
  regularParticiple,
} from './verbs.js';
import { VERBS } from './verbData.js';

/** 出題する時制。上から順に開けていく。 */
export const VERB_SCOPES = [
  { id: 'presente', ja: '現在だけ', hint: '直説法現在' },
];

/** その動詞・時制の6形。不規則があればそれを、なければ規則で作る。 */
export function formsOf(verb, tense) {
  const stored = verb.irregular?.[tense];
  if (stored) return stored;
  return conjugateRegular(verb.inf, tense, { isc: verb.isc });
}

/** 過去分詞。不規則なら保存したもの、なければ規則で作る。 */
export function participleOf(verb) {
  return verb.pp ?? regularParticiple(verb.inf);
}

/** その動詞がその時制で不規則かどうか */
export const isIrregularIn = (verb, tense) => Boolean(verb.irregular?.[tense]);

/**
 * 誤答の候補。紛らわしい順に並べる。
 * 1. 規則どおりに活用してしまった形（不規則動詞のとき）
 * 2. 別の人称
 */
export function verbVariants({ verbIndex, tense, person }) {
  const verb = VERBS[verbIndex];
  const correct = formsOf(verb, tense)[person];
  const out = [];

  if (isIrregularIn(verb, tense)) {
    // 不規則を知らずに規則活用してしまった形
    const regular = conjugateRegular(verb.inf, tense, { isc: verb.isc });
    out.push(regular[person]);
    // 人称も外したうえで規則活用した形
    out.push(regular[(person + 1) % PERSONS.length]);
  }

  const forms = formsOf(verb, tense);
  // 近い人称から順に。単複の取り違えが起きやすいので 3人称と1人称を先に
  for (const offset of [2, 1, 3, 5, 4]) {
    out.push(forms[(person + offset) % PERSONS.length]);
  }

  const seen = new Set([correct]);
  return out.filter((form) => {
    if (!form || seen.has(form)) return false;
    seen.add(form);
    return true;
  });
}

/** その問題が問うている型をタグにする */
export function verbTags(verb, tense) {
  const tags = ['verb:tutto', `verb:${tense}`, `verb:${verb.inf}`];
  tags.push(isIrregularIn(verb, tense) ? 'verb:irregolare' : 'verb:regolare');
  if (verb.isc) tags.push('verb:isc');
  return tags;
}

/** 答えの下に出す説明 */
export function verbHint(verb, tense) {
  if (isIrregularIn(verb, tense)) {
    return `不規則: ${formsOf(verb, tense).join(' / ')}`;
  }
  if (verb.isc) return '-isc- 型。noi と voi には入らない';
  return null;
}

const TENSE_LABEL = { presente: '直説法現在' };

/**
 * 動詞の問題を1つ作る。
 * @param {object} settings
 * @param {() => number} rng
 * @param {(min:number, max:number, rng:() => number) => number} randInt
 */
export function buildVerbItem(settings, rng, randInt) {
  const verbIndex = randInt(0, VERBS.length - 1, rng);
  const verb = VERBS[verbIndex];
  const person = randInt(0, PERSONS.length - 1, rng);
  const tense = 'presente';

  const answer = formsOf(verb, tense)[person];
  const subject = PERSONS[person].it;
  const sentence = `${subject} ___ ${verb.tail}.`;

  return {
    key: `verb:${verb.inf}:${tense}:${person}`,
    category: 'verbs',
    source: { kind: 'verb', verbIndex, tense, person },
    reverse: false,
    prompt: sentence,
    promptNote: `${TENSE_LABEL[tense]} · ${verb.inf}（${verb.ja}）`,
    answer,
    answerNote: verbHint(verb, tense),
    speech: sentence.replace('___', answer),
    answerLang: 'it',
    inputMode: 'text',
    tags: verbTags(verb, tense),
  };
}
