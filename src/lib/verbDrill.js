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
  conjugateFromStem,
  regularParticiple,
  regularFutureStem,
  congiuntiveFromPresente,
  agreeParticiple,
  usesFutureStem,
} from './verbs.js';
import { VERBS, verbByInfinitive } from './verbData.js';

/** 出題する時制。上から順に開けていく。 */
export const VERB_SCOPES = [
  { id: 'presente', ja: '現在だけ', hint: '直説法現在' },
  { id: 'passato', ja: '現在 + 近過去', hint: 'essere / avere の選択' },
  { id: 'imperfetto', ja: '＋ 半過去', hint: '近過去との使い分け' },
  { id: 'futuro', ja: '＋ 未来・条件法', hint: '縮む語幹（verrò / vorrei）' },
  { id: 'congiuntivo', ja: '＋ 接続法現在', hint: 'Penso che 〜 のあと' },
];

/** どこまで開けるとどの時制が出るか */
const SCOPE_TENSES = {
  presente: ['presente'],
  passato: ['presente', 'passatoProssimo'],
  imperfetto: ['presente', 'passatoProssimo', 'imperfetto'],
  futuro: ['presente', 'passatoProssimo', 'imperfetto', 'futuro', 'condizionale'],
  congiuntivo: [
    'presente',
    'passatoProssimo',
    'imperfetto',
    'futuro',
    'condizionale',
    'congPresente',
  ],
};

export const tensesInScope = (scope) => SCOPE_TENSES[scope] ?? SCOPE_TENSES.presente;

/** 複合時制かどうか */
export const isCompound = (tense) => tense === 'passatoProssimo';

/** 複合時制で使う助動詞の時制 */
const AUX_TENSE = { passatoProssimo: 'presente' };

/**
 * 主語。essere を取る動詞は過去分詞が主語と一致するので、
 * 性がはっきりする名前を使う（io だと男女どちらでも正解になってしまう）。
 */
export const NAMED_SUBJECTS = {
  'm-sing': { text: 'Marco', person: 2, gender: 'm', number: 'sing' },
  'f-sing': { text: 'Anna', person: 2, gender: 'f', number: 'sing' },
  'm-plur': { text: 'Marco e Luca', person: 5, gender: 'm', number: 'plur' },
  'f-plur': { text: 'Anna e Maria', person: 5, gender: 'f', number: 'plur' },
};

/** その動詞・時制の6形。不規則があればそれを、なければ規則で作る。 */
export function formsOf(verb, tense) {
  const stored = verb.irregular?.[tense];
  if (stored) return stored;
  // 未来と条件法は語幹1つから作る（sar- から sarò と sarei）
  if (usesFutureStem(tense) && verb.fut) return conjugateFromStem(verb.fut, tense);
  // 接続法現在は不規則動詞でも直説法現在から作れる（vengo -> venga）
  if (tense === 'congPresente' && hasIrregularCongiuntivo(verb)) {
    return congiuntiveFromPresente(formsOf(verb, 'presente'), { stem: verb.cong });
  }
  return conjugateRegular(verb.inf, tense, { isc: verb.isc });
}

/** 接続法現在が規則どおりにならない動詞か（現在形が不規則ならそうなる） */
export const hasIrregularCongiuntivo = (verb) =>
  Boolean(verb.cong || verb.irregular?.presente);

/** 未来・条件法で語幹が縮む動詞か */
export const hasIrregularStem = (verb, tense) =>
  Boolean(usesFutureStem(tense) && verb.fut);

/** 過去分詞。不規則なら保存したもの、なければ規則で作る。 */
export function participleOf(verb) {
  return verb.pp ?? regularParticiple(verb.inf);
}

/** その動詞がその時制で不規則かどうか */
export const isIrregularIn = (verb, tense) =>
  Boolean(verb.irregular?.[tense]) ||
  hasIrregularStem(verb, tense) ||
  (tense === 'congPresente' && hasIrregularCongiuntivo(verb));

/**
 * 複合時制の形を組み立てる。個別には保存しない。
 *   助動詞の活用 + 過去分詞（essere なら主語と性数一致）
 */
export function compoundForm(verb, tense, person, agreement = {}) {
  const auxVerb = verbByInfinitive(verb.aux);
  const aux = formsOf(auxVerb, AUX_TENSE[tense])[person];
  const participle =
    verb.aux === 'essere'
      ? agreeParticiple(participleOf(verb), agreement)
      : participleOf(verb);
  return `${aux} ${participle}`;
}

/** その時制・人称の形。単純形でも複合形でも同じ入り口で取れる。 */
export function formFor(verb, tense, person, agreement = {}) {
  return isCompound(tense)
    ? compoundForm(verb, tense, person, agreement)
    : formsOf(verb, tense)[person];
}

/**
 * 誤答の候補。紛らわしい順に並べ、1つずつ「何を外した形か」を付けて返す。
 * 型を付けておくと、選ばれたときにどの規則で転んだのかが記録できる。
 *
 * 1. 規則どおりに活用してしまった形（不規則動詞のとき）
 * 2. 別の人称
 */
export function verbVariantsDetailed({ verbIndex, tense, person, agreement, scope }) {
  const verb = VERBS[verbIndex];
  const correct = formFor(verb, tense, person, agreement);
  const out = [];
  const add = (text, type) => out.push({ text, type });
  // 半過去まで開けているときだけ、時制の取り違えを誤答に混ぜる。
  // 使い分けを覚える前に出しても、ただ紛らわしいだけになる。
  const contrastTenses = tensesInScope(scope).includes('imperfetto');

  if (isCompound(tense)) {
    const other = verb.aux === 'essere' ? 'avere' : 'essere';
    const otherAux = formsOf(verbByInfinitive(other), AUX_TENSE[tense])[person];
    const plain = participleOf(verb);
    const agreed =
      verb.aux === 'essere' ? agreeParticiple(plain, agreement) : plain;

    // 助動詞の取り違え。ho andato がいちばん踏まれる地雷
    add(`${otherAux} ${agreed}`, 'verb:ausiliare');

    // 時制の取り違え（半過去との使い分け）
    if (contrastTenses) {
      add(formsOf(verb, 'imperfetto')[person], 'verb:uso-passato');
    }

    // 過去分詞の一致違い（essere を取る動詞だけ）
    if (verb.aux === 'essere') {
      const aux = formsOf(verbByInfinitive(verb.aux), AUX_TENSE[tense])[person];
      for (const g of ['m', 'f']) {
        for (const n of ['sing', 'plur']) {
          add(
            `${aux} ${agreeParticiple(plain, { gender: g, number: n })}`,
            'verb:accordo',
          );
        }
      }
    }

    // 不規則な過去分詞を規則どおりに作ってしまった形
    if (verb.pp) {
      const aux = formsOf(verbByInfinitive(verb.aux), AUX_TENSE[tense])[person];
      const regular = regularParticiple(verb.inf);
      add(
        `${aux} ${verb.aux === 'essere' ? agreeParticiple(regular, agreement) : regular}`,
        'verb:participio',
      );
    }

    // 人称違い
    for (const offset of [1, 2, 3]) {
      const p = (person + offset) % PERSONS.length;
      add(
        `${formsOf(verbByInfinitive(verb.aux), AUX_TENSE[tense])[p]} ${agreed}`,
        'verb:persona',
      );
    }

    return dedupe(out, correct);
  }

  // 半過去なら、近過去との取り違えをいちばん前に置く
  if (tense === 'imperfetto' && contrastTenses) {
    add(compoundForm(verb, 'passatoProssimo', person, agreement), 'verb:uso-passato');
    add(formsOf(verb, 'presente')[person], 'verb:tempo');
  }

  // 接続法のところで直説法を使ってしまう（Penso che tu sei）のがいちばん多い
  if (tense === 'congPresente') {
    add(formsOf(verb, 'presente')[person], 'verb:indicativo');
    // -are は -i、-ere と -ire は -a。この取り違え（vada を vadi にしてしまう）。
    // 不定詞から規則活用した形（fare なら fi）は誰も書かないので出さない
    const swapped = swapCongEnding(formsOf(verb, tense)[person]);
    if (swapped) add(swapped, 'verb:regolarizzato');
  }

  if (usesFutureStem(tense)) {
    // 語幹を縮め忘れた形（verrò に対する venirò）がいちばん効く
    if (hasIrregularStem(verb, tense)) {
      add(conjugateRegular(verb.inf, tense, { isc: verb.isc })[person], 'verb:regolarizzato');
    }
    // 未来と条件法は語幹が同じなので、語尾だけで見分けることになる
    const other = tense === 'futuro' ? 'condizionale' : 'futuro';
    add(formsOf(verb, other)[person], 'verb:modo');
  }

  if (isIrregularIn(verb, tense) && tense !== 'congPresente') {
    // 不規則を知らずに規則活用してしまった形
    const regular = conjugateRegular(verb.inf, tense, { isc: verb.isc });
    add(regular[person], 'verb:regolarizzato');
    // 人称も外したうえで規則活用した形
    add(regular[(person + 1) % PERSONS.length], 'verb:regolarizzato');
  }

  const forms = formsOf(verb, tense);
  // 近い人称から順に。単複の取り違えが起きやすいので 3人称と1人称を先に
  for (const offset of [2, 1, 3, 5, 4]) {
    add(forms[(person + offset) % PERSONS.length], 'verb:persona');
  }

  return dedupe(out, correct);
}

/**
 * 接続法の語尾を取り違えた形。単数と3人称複数にしか効かないので、
 * noi（-iamo）と voi（-iate）では null を返す。
 */
function swapCongEnding(form) {
  const swapped = form.endsWith('a')
    ? `${form.slice(0, -1)}i`
    : form.endsWith('i')
      ? `${form.slice(0, -1)}a`
      : null;
  // 語幹が i で終わる語（faccia -> faccii、dia -> dii）は綴りとして成り立たない。
  // ありえない形を選択肢に混ぜると、消去法で当てられてしまう
  return swapped && !/ii/.test(swapped) ? swapped : null;
}

/** 空と重複を落とす。先に入れたほうの型を残す。 */
function dedupe(variants, correct) {
  const seen = new Set([correct]);
  return variants.filter(({ text }) => {
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

/** 誤答の文字列だけ（選択肢を作るときはこちら） */
export function verbVariants(source) {
  return verbVariantsDetailed(source).map((v) => v.text);
}

/** その問題が問うている型をタグにする */
export function verbTags(verb, tense, scope) {
  const tags = ['verb:tutto', `verb:${tense}`, `verb:${verb.inf}`];

  // 近過去と半過去が両方出るときは、使い分けそのものが問われている
  if (
    tensesInScope(scope).includes('imperfetto') &&
    (isCompound(tense) || tense === 'imperfetto')
  ) {
    tags.push('verb:uso-passato');
  }

  if (isCompound(tense)) {
    // 複合時制で問われるのは助動詞の選択と一致。人称より先にここを見せたい
    tags.push('verb:ausiliare', `verb:aux-${verb.aux}`);
    if (verb.aux === 'essere') tags.push('verb:accordo');
    if (verb.pp) tags.push('verb:participio');
    return tags;
  }

  tags.push(isIrregularIn(verb, tense) ? 'verb:irregolare' : 'verb:regolare');
  if (verb.isc && tense === 'presente') tags.push('verb:isc');
  // 未来と条件法でつまずくのはほぼ語幹なので、そこだけ別に数える
  if (hasIrregularStem(verb, tense)) tags.push('verb:radice');
  return tags;
}

/** 答えの下に出す説明 */
export function verbHint(verb, tense) {
  if (tense === 'congPresente') {
    const base = 'Penso che / Voglio che のあとは接続法';
    return isIrregularIn(verb, tense)
      ? `${base}（${verb.inf}: ${formsOf(verb, tense)[0]}）`
      : `${base}。-are は -i、-ere と -ire は -a`;
  }
  if (usesFutureStem(tense)) {
    const stem = verb.fut ?? regularFutureStem(verb.inf);
    const base = tense === 'futuro' ? '未来' : '条件法（〜だろう・〜したい）';
    return hasIrregularStem(verb, tense)
      ? `${base}。語幹が縮む: ${stem}-（未来も条件法も同じ語幹）`
      : `${base}。語幹は ${stem}-`;
  }
  if (tense === 'imperfetto') {
    const base = '習慣や状態は半過去。一回きりの出来事なら近過去';
    return isIrregularIn(verb, tense)
      ? `${base}（${verb.inf} は不規則: ${formsOf(verb, tense)[0]}）`
      : base;
  }
  if (isCompound(tense)) {
    const aux = `助動詞は ${verb.aux}`;
    if (verb.aux === 'essere') return `${aux}。過去分詞は主語と性数一致する`;
    return `${aux}。過去分詞は変化しない`;
  }
  if (isIrregularIn(verb, tense)) {
    return `不規則: ${formsOf(verb, tense).join(' / ')}`;
  }
  if (verb.isc) return '-isc- 型。noi と voi には入らない';
  return null;
}

const TENSE_LABEL = {
  presente: '直説法現在',
  passatoProssimo: '近過去',
  imperfetto: '半過去',
  futuro: '未来',
  condizionale: '条件法',
  congPresente: '接続法現在',
};

/**
 * 問題の上に出す見出し。
 *
 * 近過去と半過去の両方が出るようになったら、どちらなのかは書かない。
 * 「半過去」と書いてしまうと、Ieri / Ogni giorno を読まなくても
 * 選択肢を外側から絞れてしまい、使い分けの練習にならない。
 */
function tenseLabel(tense, scope) {
  const contrast = tensesInScope(scope).includes('imperfetto');
  if (contrast && (isCompound(tense) || tense === 'imperfetto')) return '過去';
  return TENSE_LABEL[tense];
}

/**
 * 時を示す語。これが無いとどの時制か決められない。
 * 近過去は一回きりの出来事、半過去は習慣や状態を表す語を選ぶ。
 */
const TIME_MARKERS = {
  passatoProssimo: ['Ieri'],
  imperfetto: ['Ogni estate', 'Di solito', 'Ogni giorno'],
  futuro: ['Domani', 'La settimana prossima', "L'anno prossimo"],
  // 条件法は時ではなく条件で決まるので、時の副詞ではなく前置きを置く
  condizionale: ['Con più tempo,', 'Se possibile,'],
  // 接続法は前の主節が呼び出す。che のあとに来ることが形と結びつくように
  congPresente: ['Penso che', 'Credo che', 'Voglio che', 'Spero che'],
};

/** 接続法の従属節に立てる人称（io と noi は主節と同じ人になってしまう） */
const CONG_PERSONS = [1, 2, 4, 5];

/**
 * 動詞の問題を1つ作る。
 * @param {object} settings
 * @param {() => number} rng
 * @param {(min:number, max:number, rng:() => number) => number} randInt
 */
export function buildVerbItem(settings, rng, randInt) {
  const verbIndex = randInt(0, VERBS.length - 1, rng);
  const verb = VERBS[verbIndex];
  const tenses = tensesInScope(settings.verbScope).filter(
    // nascere や morire は「毎年〜していた」「明日〜するだろう」にならないし、
    // 「〜してほしい」の対象にもしない
    (t) =>
      !(
        verb.punctual &&
        (t === 'imperfetto' || t === 'congPresente' || usesFutureStem(t))
      ),
  );
  const tense = tenses[randInt(0, tenses.length - 1, rng)];

  // essere を取る動詞の複合時制だけ、性がはっきりする主語を使う。
  // io では andato と andata のどちらも正解になってしまうため。
  const needsNamedSubject = isCompound(tense) && verb.aux === 'essere';
  const named = needsNamedSubject
    ? Object.values(NAMED_SUBJECTS)[randInt(0, 3, rng)]
    : null;

  // 接続法の主語は主節（Penso / Voglio）と別人でないといけない。
  // 同じ人なら「Penso di essere」と不定詞になるので、io と noi は使わない。
  const person = named
    ? named.person
    : tense === 'congPresente'
      ? CONG_PERSONS[randInt(0, CONG_PERSONS.length - 1, rng)]
      : randInt(0, PERSONS.length - 1, rng);
  const agreement = named
    ? { gender: named.gender, number: named.number }
    : { gender: 'm', number: person === 3 || person === 4 || person === 5 ? 'plur' : 'sing' };

  const answer = formFor(verb, tense, person, agreement);
  const subject = named ? named.text : PERSONS[person].it;
  const markers = TIME_MARKERS[tense];
  const marker = markers ? markers[randInt(0, markers.length - 1, rng)] : null;
  const sentence = `${marker ? `${marker} ` : ''}${subject} ___ ${verb.tail}.`;

  return {
    key: `verb:${verb.inf}:${tense}:${person}:${agreement.gender}${agreement.number}`,
    category: 'verbs',
    source: {
      kind: 'verb',
      verbIndex,
      tense,
      person,
      agreement,
      scope: settings.verbScope,
    },
    reverse: false,
    prompt: sentence,
    promptNote: `${tenseLabel(tense, settings.verbScope)} · ${verb.inf}（${verb.ja}）`,
    answer,
    answerNote: verbHint(verb, tense),
    speech: sentence.replace('___', answer),
    answerLang: 'it',
    inputMode: 'text',
    tags: verbTags(verb, tense, settings.verbScope),
  };
}
