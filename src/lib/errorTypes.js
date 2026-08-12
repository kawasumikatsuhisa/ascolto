/**
 * 間違いの型の判定。
 *
 * 「どの語を知らなかったか」より「どの規則を外したか」のほうが、直すべき
 * ところがはっきりする。ho andato を選んだなら助動詞の選択、sono andata を
 * 選んだなら性数一致、というふうに、選んだ誤答から型を割り出して記録する。
 *
 * 誤答は articleDrill / verbDrill が型つきで作っているので、ここでは
 * 選ばれた文字列を照らし合わせるだけ。型の判定を別に書くと、選択肢の
 * 作り方を変えたときに二重管理になる。
 *
 * 入力式で打ち間違えた場合や、めくって自己採点した場合は型が分からない。
 * 無理に当てはめず null を返す（記録しない）。
 */

import { verbVariantsDetailed } from './verbDrill.js';
import { articleVariantsDetailed } from './articleDrill.js';

/** 型を記録する種類。数字や単語は「型」より項目ごとの成績のほうが役に立つ。 */
function variantsOf(item) {
  const kind = item?.source?.kind;
  if (kind === 'verb') return verbVariantsDetailed(item.source);
  if (kind === 'article' && item.variantSpec) {
    return articleVariantsDetailed(item.variantSpec);
  }
  return null;
}

/**
 * 選ばれた誤答の型を返す。分からなければ null。
 * @param {object} item 出題
 * @param {string|null} picked 選んだ（打った）答え
 * @returns {string|null} 'verb:ausiliare' のようなタグ
 */
export function errorTypeOf(item, picked) {
  if (!picked || !item || picked === item.answer) return null;
  const variants = variantsOf(item);
  if (!variants) return null;
  return variants.find((v) => v.text === picked)?.type ?? null;
}

/** 成績画面に出す並び順。同数のときにぶれないように固定しておく。 */
export const ERROR_TYPE_ORDER = [
  'verb:ausiliare',
  'verb:accordo',
  'verb:uso-passato',
  'verb:participio',
  'verb:regolarizzato',
  'verb:tempo',
  'verb:persona',
  'art:attacco',
  'art:genere',
  'art:numero',
];
