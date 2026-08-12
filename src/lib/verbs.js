/**
 * 動詞の活用。
 *
 * 規則動詞は語幹＋語尾で作る。活用表は保存しない。
 * 不規則動詞だけ、単純形の活用を verbData.js に持たせる。
 *
 * 複合時制（近過去など）は「助動詞の活用 + 過去分詞」で組み立てるので、
 * ここでは単純形だけを扱う。
 */

/** 人称。添字がそのまま活用形の並び順になる。 */
export const PERSONS = [
  { id: 'io', it: 'io', ja: '私' },
  { id: 'tu', it: 'tu', ja: '君' },
  { id: 'lui', it: 'lui', ja: '彼' },
  { id: 'noi', it: 'noi', ja: '私たち' },
  { id: 'voi', it: 'voi', ja: '君たち' },
  { id: 'loro', it: 'loro', ja: '彼ら' },
];

/** 単純形の時制。遠過去は読解用なので出題には使わない。 */
export const SIMPLE_TENSES = [
  'presente',
  'imperfetto',
  'passatoRemoto',
  'futuro',
  'condizionale',
  'congPresente',
  'congImperfetto',
];

const ENDINGS = {
  are: {
    presente: ['o', 'i', 'a', 'iamo', 'ate', 'ano'],
    imperfetto: ['avo', 'avi', 'ava', 'avamo', 'avate', 'avano'],
    passatoRemoto: ['ai', 'asti', 'ò', 'ammo', 'aste', 'arono'],
    congPresente: ['i', 'i', 'i', 'iamo', 'iate', 'ino'],
    congImperfetto: ['assi', 'assi', 'asse', 'assimo', 'aste', 'assero'],
  },
  ere: {
    presente: ['o', 'i', 'e', 'iamo', 'ete', 'ono'],
    imperfetto: ['evo', 'evi', 'eva', 'evamo', 'evate', 'evano'],
    passatoRemoto: ['ei', 'esti', 'é', 'emmo', 'este', 'erono'],
    congPresente: ['a', 'a', 'a', 'iamo', 'iate', 'ano'],
    congImperfetto: ['essi', 'essi', 'esse', 'essimo', 'este', 'essero'],
  },
  ire: {
    presente: ['o', 'i', 'e', 'iamo', 'ite', 'ono'],
    imperfetto: ['ivo', 'ivi', 'iva', 'ivamo', 'ivate', 'ivano'],
    passatoRemoto: ['ii', 'isti', 'ì', 'immo', 'iste', 'irono'],
    congPresente: ['a', 'a', 'a', 'iamo', 'iate', 'ano'],
    congImperfetto: ['issi', 'issi', 'isse', 'issimo', 'iste', 'issero'],
  },
};

/**
 * 未来と条件法は語尾が違うだけで、語幹は同じものを使う。
 * essere なら sar- から sarò と sarei の両方が出る。だから不規則動詞でも
 * 保存するのは語幹1つでよく、12の形はそこから作れる。
 */
const STEM_ENDINGS = {
  futuro: ['ò', 'ai', 'à', 'emo', 'ete', 'anno'],
  condizionale: ['ei', 'esti', 'ebbe', 'emmo', 'este', 'ebbero'],
};

/** 未来・条件法の語幹を使う時制か */
export const usesFutureStem = (tense) => tense in STEM_ENDINGS;

/** -isc- 型（capire）は現在形と接続法現在だけ語幹が伸びる */
const ISC_ENDINGS = {
  presente: ['isco', 'isci', 'isce', 'iamo', 'ite', 'iscono'],
  congPresente: ['isca', 'isca', 'isca', 'iamo', 'iate', 'iscano'],
};

/** 不定詞の語尾（are / ere / ire）。分からなければ null。 */
export function infinitiveGroup(infinitive) {
  const m = /(are|ere|ire)$/.exec(infinitive);
  return m ? m[1] : null;
}

/** 不定詞から語幹を取る */
export function verbStem(infinitive) {
  return infinitive.slice(0, -3);
}

/**
 * 綴りの調整。-are 動詞だけに効く。
 *  cercare  + i   -> cerchi    （c/g の音を保つため h を入れる）
 *  mangiare + i   -> mangi     （ci/gi の i は e と i のどちらの前でも落ちる）
 *  studiare + i   -> studi     （語幹の i は i の前でだけ重ならない）
 *  studiare + erò -> studierò  （e の前では残る。ci/gi との違いはここ）
 *
 * sciare のように i にアクセントが乗る語（tu scii）はこの規則から外れるが、
 * 数が少ないので扱わない。
 */
function adjust(stem, ending, group) {
  if (group !== 'are') return stem;
  if (!/^[ei]/.test(ending)) return stem;

  // ci / gi の i は c・g を柔らかく保つためだけのもの
  if (/[cg]i$/.test(stem)) return stem.slice(0, -1);

  // それ以外の i 語幹は、語尾も i で始まるときだけ1つにまとめる
  if (/i$/.test(stem)) return /^i/.test(ending) ? stem.slice(0, -1) : stem;

  if (/[cg]$/.test(stem)) return `${stem}h`;
  return stem;
}

/**
 * 規則動詞を活用する。
 * @param {string} infinitive parlare / credere / dormire / capire
 * @param {string} tense SIMPLE_TENSES のどれか
 * @param {{isc?: boolean}} [options] -ire の -isc- 型なら isc: true
 * @returns {string[]} io tu lui noi voi loro の6形
 */
export function conjugateRegular(infinitive, tense, options = {}) {
  const group = infinitiveGroup(infinitive);
  if (!group) throw new Error(`活用できない不定詞: ${infinitive}`);

  // 未来と条件法は語幹が同じなので、そちらの入り口にまわす
  if (usesFutureStem(tense)) {
    return conjugateFromStem(regularFutureStem(infinitive), tense);
  }

  const table = ENDINGS[group][tense];
  if (!table) throw new Error(`知らない時制: ${tense}`);

  const stem = verbStem(infinitive);
  const endings =
    options.isc && group === 'ire' && ISC_ENDINGS[tense]
      ? ISC_ENDINGS[tense]
      : table;

  return endings.map((ending) => adjust(stem, ending, group) + ending);
}

/**
 * 規則動詞の未来・条件法の語幹。
 *   parlare -> parler   cercare -> cercher   mangiare -> manger
 *   credere -> creder   dormire -> dormir
 * -are の a が e に変わるところと綴りの調整は、活用と同じ規則で処理する。
 */
export function regularFutureStem(infinitive) {
  const group = infinitiveGroup(infinitive);
  if (!group) throw new Error(`活用できない不定詞: ${infinitive}`);
  const link = group === 'ire' ? 'ir' : 'er';
  return adjust(verbStem(infinitive), link, group) + link;
}

/**
 * 語幹から未来・条件法を作る。
 * @param {string} stem sar / andr / parler など（語尾の直前まで）
 * @param {'futuro'|'condizionale'} tense
 */
export function conjugateFromStem(stem, tense) {
  const endings = STEM_ENDINGS[tense];
  if (!endings) throw new Error(`語幹から作れない時制: ${tense}`);
  return endings.map((ending) => stem + ending);
}

/**
 * 不規則動詞の接続法現在を、直説法現在から作る。
 *
 * 不規則動詞の接続法現在は 1人称単数から出てくる。
 *   vengo -> venga / vengano     esco -> esca / escano
 *   faccio -> faccia             vado -> vada
 * noi は直説法とまったく同じ形で、voi はその -iamo を -iate に替えるだけ。
 *   facciamo -> facciate         siamo -> siate
 * だから活用表を持たなくても、現在形さえあれば6形そろう。
 *
 * essere / avere / sapere / dare / stare / dovere だけはこの手順から外れるので、
 * 語幹（si- abbi- sappi- di- sti- debb-）を渡して差し替える。
 *
 * @param {string[]} presente 直説法現在の6形
 * @param {{stem?: string}} [options] 語幹を差し替えるとき
 */
export function congiuntiveFromPresente(presente, { stem } = {}) {
  const base = stem ?? presente[0].replace(/o$/, '');
  const noi = presente[3];
  const voi = noi.replace(/iamo$/, 'iate');
  return [`${base}a`, `${base}a`, `${base}a`, noi, voi, `${base}ano`];
}

/** 規則動詞の過去分詞（-ato / -uto / -ito） */
export function regularParticiple(infinitive) {
  const group = infinitiveGroup(infinitive);
  const stem = verbStem(infinitive);
  if (group === 'are') return `${stem}ato`;
  if (group === 'ere') return `${stem}uto`;
  if (group === 'ire') return `${stem}ito`;
  throw new Error(`活用できない不定詞: ${infinitive}`);
}

/**
 * 過去分詞を主語に合わせる。essere を取る動詞でだけ使う。
 * andato / andata / andati / andate
 */
export function agreeParticiple(participle, { gender = 'm', number = 'sing' } = {}) {
  if (!participle.endsWith('o')) return participle; // 不規則で -o 以外なら触らない
  const base = participle.slice(0, -1);
  if (number === 'plur') return `${base}${gender === 'f' ? 'e' : 'i'}`;
  return `${base}${gender === 'f' ? 'a' : 'o'}`;
}
