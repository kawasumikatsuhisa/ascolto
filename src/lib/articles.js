/**
 * 冠詞と前置詞結合。
 *
 * ここには結合形のデータを一切持たない。定冠詞7形 × 前置詞5種 = 35通りに
 * 不定冠詞を足した40以上の形は、すべて規則から組み立てる。名詞側が持つのは
 * 性と綴りだけで、語頭のクラス（母音 / s+子音など / ふつうの子音）も
 * その場で判定する。
 */

/** 前置詞のうち定冠詞と結合するもの */
export const COMBINING_PREPOSITIONS = ['di', 'a', 'da', 'in', 'su'];

/** 結合しない前置詞。con と per は分かち書きのまま */
export const PLAIN_PREPOSITIONS = ['con', 'per'];

/**
 * 語頭の音の分類。
 *  vowel     母音（h は発音しないので母音扱い）
 *  special   s+子音 / z / gn / ps / pn / x / y / i+母音 → lo, gli, uno を取る
 *  consonant それ以外の子音
 */
export function onsetClass(word) {
  const w = String(word).toLowerCase().trim();

  // i+母音 は半子音なので lo を取る（lo iogurt）。
  // 「母音で始まる」より先に見ないと l'iogurt になってしまう。
  if (/^i[aeiouàèéìòù]/.test(w)) return 'special';

  if (/^[aeiouàèéìòùh]/.test(w)) return 'vowel';

  // s の直後が母音でなければ「不純な s」
  if (/^s[^aeiouàèéìòù]/.test(w)) return 'special';
  if (/^(z|gn|ps|pn|x|y)/.test(w)) return 'special';

  return 'consonant';
}

/**
 * 定冠詞。
 * @param {{gender:'m'|'f', number:'sing'|'plur', onset:string}} spec
 */
export function definiteArticle({ gender, number, onset }) {
  if (gender === 'f') {
    if (number === 'plur') return 'le';
    return onset === 'vowel' ? "l'" : 'la';
  }
  if (number === 'plur') return onset === 'consonant' ? 'i' : 'gli';
  if (onset === 'vowel') return "l'";
  return onset === 'special' ? 'lo' : 'il';
}

/**
 * 不定冠詞。複数形は持たない（部分冠詞 dei/degli/delle が代わりになる）。
 * @param {{gender:'m'|'f', onset:string}} spec
 */
export function indefiniteArticle({ gender, onset }) {
  if (gender === 'f') return onset === 'vowel' ? "un'" : 'una';
  return onset === 'special' ? 'uno' : 'un';
}

/** 前置詞ごとの語幹。di と in だけ形が変わる。 */
const PREPOSITION_STEM = { di: 'de', a: 'a', da: 'da', in: 'ne', su: 'su' };

/** 結合したときに語幹へ付く部分。冠詞の頭の子音が重なる。 */
const ARTICLE_TAIL = {
  il: 'l',
  lo: 'llo',
  "l'": "ll'",
  la: 'lla',
  i: 'i',
  gli: 'gli',
  le: 'lle',
};

/**
 * 前置詞 + 定冠詞。結合しない前置詞なら null を返す。
 * @param {string} preposition
 * @param {string} article 定冠詞7形のどれか
 */
export function combine(preposition, article) {
  const stem = PREPOSITION_STEM[preposition];
  const tail = ARTICLE_TAIL[article];
  if (stem === undefined || tail === undefined) return null;
  return stem + tail;
}

/** 冠詞と語をつなぐ。アポストロフィで終わる形は空白を入れない。 */
export function join(article, word) {
  return article.endsWith("'") ? `${article}${word}` : `${article} ${word}`;
}

/**
 * 名詞に冠詞（または前置詞つき冠詞）をつけた形をまるごと作る。
 * @param {string} word 名詞そのもの（単数形でも複数形でもよい）
 * @param {object} spec
 * @param {'m'|'f'} spec.gender
 * @param {'sing'|'plur'} [spec.number]
 * @param {'definite'|'indefinite'} [spec.kind]
 * @param {string|null} [spec.preposition] di a da in su con per のどれか
 */
export function articleFor(word, spec) {
  const { gender, number = 'sing', kind = 'definite', preposition = null } = spec;
  const onset = onsetClass(word);

  if (kind === 'indefinite') {
    const article = indefiniteArticle({ gender, onset });
    if (!preposition) return article;
    // 不定冠詞は結合しない（di un libro のように分かち書き）
    return `${preposition} ${article}`;
  }

  const article = definiteArticle({ gender, number, onset });
  if (!preposition) return article;

  const combined = combine(preposition, article);
  // con / per は結合しないので、前置詞と冠詞を並べるだけ
  return combined ?? `${preposition} ${article}`;
}

/** 冠詞つきの語句をまるごと組み立てる（del libro / all'amico など） */
export function phraseWithArticle(word, spec) {
  return join(articleFor(word, spec), word);
}
