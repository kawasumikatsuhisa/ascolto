import { describe, it, expect } from 'vitest';
import { VERBS, verbByInfinitive, agreesWithSubject } from './verbData.js';
import {
  formsOf,
  participleOf,
  isIrregularIn,
  verbVariants,
  verbTags,
  compoundForm,
  formFor,
  NAMED_SUBJECTS,
} from './verbDrill.js';
import { PERSONS, conjugateRegular, regularParticiple } from './verbs.js';
import { generateItem, CATEGORIES, describeTag, tagGroup } from './generator.js';
import { CHOICE_COUNT } from './choices.js';
import { DEFAULT_SETTINGS } from './storage.js';

function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const verbsOnly = {
  ...DEFAULT_SETTINGS,
  categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === 'verbs'])),
};

describe('動詞データ', () => {
  it('必要なものがそろっている', () => {
    for (const verb of VERBS) {
      expect(verb.inf).toMatch(/(are|ere|ire)$/);
      expect(verb.ja).toBeTruthy();
      expect(verb.tail).toBeTruthy();
      expect(['avere', 'essere']).toContain(verb.aux);
    }
  });

  it('不定詞が重複しない', () => {
    const infs = VERBS.map((v) => v.inf);
    expect(new Set(infs).size).toBe(infs.length);
  });

  it('保存された不規則形は6つそろっている', () => {
    for (const verb of VERBS) {
      for (const forms of Object.values(verb.irregular ?? {})) {
        expect(forms).toHaveLength(PERSONS.length);
        for (const form of forms) expect(form).toBeTruthy();
      }
    }
  });

  it('規則どおりの過去分詞は保存しない', () => {
    // -ato / -uto / -ito で済むものに pp を書いていたら無駄なデータ
    for (const verb of VERBS) {
      if (!verb.pp) continue;
      expect(verb.pp, verb.inf).not.toBe(regularParticiple(verb.inf));
    }
  });

  it('essere を取る動詞は過去分詞が主語と一致する', () => {
    for (const verb of VERBS) {
      expect(agreesWithSubject(verb)).toBe(verb.aux === 'essere');
    }
  });

  it('頻度の高い不規則動詞がそろっている', () => {
    const must = [
      'essere', 'avere', 'fare', 'andare', 'stare', 'dare', 'dire',
      'potere', 'volere', 'dovere', 'sapere', 'venire', 'uscire', 'bere',
      'rimanere', 'tenere', 'scegliere',
    ];
    for (const inf of must) {
      const verb = verbByInfinitive(inf);
      expect(verb, inf).toBeTruthy();
      expect(isIrregularIn(verb, 'presente'), inf).toBe(true);
    }
  });
});

describe('現在形', () => {
  it.each([
    ['essere', ['sono', 'sei', 'è', 'siamo', 'siete', 'sono']],
    ['avere', ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno']],
    ['fare', ['faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno']],
    ['andare', ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno']],
    ['potere', ['posso', 'puoi', 'può', 'possiamo', 'potete', 'possono']],
    ['uscire', ['esco', 'esci', 'esce', 'usciamo', 'uscite', 'escono']],
  ])('%s', (inf, expected) => {
    expect(formsOf(verbByInfinitive(inf), 'presente')).toEqual(expected);
  });

  it('規則動詞は保存せずに生成する', () => {
    const parlare = verbByInfinitive('parlare');
    expect(parlare.irregular).toBeUndefined();
    expect(formsOf(parlare, 'presente')).toEqual(
      conjugateRegular('parlare', 'presente'),
    );
  });

  it('-isc- 型が正しく出る', () => {
    expect(formsOf(verbByInfinitive('capire'), 'presente')).toEqual([
      'capisco', 'capisci', 'capisce', 'capiamo', 'capite', 'capiscono',
    ]);
  });
});

describe('過去分詞', () => {
  // 全動詞ぶん固定する。近過去はここが狂うとそのまま覚え間違いになるので、
  // 「保存する / 生成させる」の判断ミスを必ず捕まえたい。
  const PARTICIPLES = {
    essere: 'stato', avere: 'avuto', fare: 'fatto', andare: 'andato',
    stare: 'stato', dare: 'dato', dire: 'detto', potere: 'potuto',
    volere: 'voluto', dovere: 'dovuto', sapere: 'saputo', venire: 'venuto',
    uscire: 'uscito', bere: 'bevuto', rimanere: 'rimasto', tenere: 'tenuto',
    scegliere: 'scelto', piacere: 'piaciuto', salire: 'salito', morire: 'morto',
    vedere: 'visto', prendere: 'preso', scrivere: 'scritto', leggere: 'letto',
    chiedere: 'chiesto', mettere: 'messo', chiudere: 'chiuso', perdere: 'perso',
    aprire: 'aperto', offrire: 'offerto', nascere: 'nato', scendere: 'sceso',
    parlare: 'parlato', mangiare: 'mangiato', lavorare: 'lavorato',
    guardare: 'guardato', comprare: 'comprato', studiare: 'studiato',
    abitare: 'abitato', cercare: 'cercato', arrivare: 'arrivato',
    entrare: 'entrato', tornare: 'tornato', restare: 'restato',
    credere: 'creduto', vendere: 'venduto', dormire: 'dormito',
    partire: 'partito', capire: 'capito', finire: 'finito',
    preferire: 'preferito',
  };

  it.each(Object.entries(PARTICIPLES))('%s -> %s', (inf, expected) => {
    expect(participleOf(verbByInfinitive(inf))).toBe(expected);
  });

  it('データにある動詞をすべて確かめている', () => {
    expect(Object.keys(PARTICIPLES).sort()).toEqual(VERBS.map((v) => v.inf).sort());
  });
});

describe('誤答', () => {
  it('不規則動詞では規則活用した形が先頭に来る', () => {
    const index = VERBS.findIndex((v) => v.inf === 'andare');
    const variants = verbVariants({ verbIndex: index, tense: 'presente', person: 0 });
    // vado に対する ando が、この練習でいちばん効く誤答
    expect(variants[0]).toBe('ando');
  });

  it('正解と同じ形は混ざらない', () => {
    for (let verbIndex = 0; verbIndex < VERBS.length; verbIndex++) {
      for (let person = 0; person < PERSONS.length; person++) {
        const correct = formsOf(VERBS[verbIndex], 'presente')[person];
        const variants = verbVariants({ verbIndex, tense: 'presente', person });
        expect(variants).not.toContain(correct);
        expect(new Set(variants).size).toBe(variants.length);
      }
    }
  });

  it('どの動詞・人称でも誤答が3つ以上そろう', () => {
    for (let verbIndex = 0; verbIndex < VERBS.length; verbIndex++) {
      for (let person = 0; person < PERSONS.length; person++) {
        const variants = verbVariants({ verbIndex, tense: 'presente', person });
        expect(variants.length, VERBS[verbIndex].inf).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('動詞の出題', () => {
  it('答えがその人称の活用形と一致する', () => {
    const rng = seeded(3);
    for (let i = 0; i < 600; i++) {
      const item = generateItem(verbsOnly, {}, { rng });
      expect(item.category).toBe('verbs');
      const verb = VERBS[item.source.verbIndex];
      expect(item.answer).toBe(formsOf(verb, item.source.tense)[item.source.person]);
    }
  });

  it('文の空欄として出る（活用表ではない）', () => {
    const rng = seeded(4);
    for (let i = 0; i < 300; i++) {
      const item = generateItem(verbsOnly, {}, { rng });
      const subject = PERSONS[item.source.person].it;
      expect(item.prompt.startsWith(`${subject} ___ `)).toBe(true);
      expect(item.prompt.endsWith('.')).toBe(true);
    }
  });

  it('読み上げは空欄を埋めた文になる', () => {
    const rng = seeded(5);
    for (let i = 0; i < 300; i++) {
      const item = generateItem(verbsOnly, {}, { rng });
      expect(item.speech).not.toContain('_');
      expect(item.speech).toContain(item.answer);
    }
  });

  it('選択肢が4つで、正解がちょうど1つ', () => {
    const rng = seeded(6);
    for (let i = 0; i < 600; i++) {
      const item = generateItem(verbsOnly, {}, { rng });
      expect(item.choices).toHaveLength(CHOICE_COUNT);
      expect(item.choices.filter((c) => c === item.answer)).toHaveLength(1);
      expect(new Set(item.choices).size).toBe(CHOICE_COUNT);
    }
  });

  it('不規則動詞と規則動詞のどちらも出る', () => {
    const rng = seeded(7);
    const kinds = new Set();
    for (let i = 0; i < 400; i++) {
      const item = generateItem(verbsOnly, {}, { rng });
      kinds.add(isIrregularIn(VERBS[item.source.verbIndex], 'presente'));
    }
    expect(kinds).toEqual(new Set([true, false]));
  });

  it('タグに間違いの型と動詞そのものが入る', () => {
    const rng = seeded(8);
    for (let i = 0; i < 200; i++) {
      const item = generateItem(verbsOnly, {}, { rng });
      const verb = VERBS[item.source.verbIndex];
      expect(item.tags).toContain('verb:presente');
      expect(item.tags).toContain(`verb:${verb.inf}`);
      expect(item.tags).toContain(
        isIrregularIn(verb, 'presente') ? 'verb:irregolare' : 'verb:regolare',
      );
    }
  });

  it('タグに日本語のラベルがある', () => {
    for (const tag of ['verb:presente', 'verb:irregolare', 'verb:regolare', 'verb:isc']) {
      expect(describeTag(tag)).not.toBe(tag);
      expect(tagGroup(tag)).toBe('動詞');
    }
    // 動詞そのもののタグは不定詞をそのまま見せる
    expect(describeTag('verb:andare')).toBe('andare');
  });
});

describe('タグの組み立て', () => {
  it('不規則と規則を取り違えない', () => {
    expect(verbTags(verbByInfinitive('andare'), 'presente')).toContain('verb:irregolare');
    expect(verbTags(verbByInfinitive('parlare'), 'presente')).toContain('verb:regolare');
    expect(verbTags(verbByInfinitive('capire'), 'presente')).toContain('verb:isc');
  });
});

describe('近過去', () => {
  const passato = { ...verbsOnly, verbScope: 'passato' };

  it('助動詞の活用 + 過去分詞で組み立つ', () => {
    expect(compoundForm(verbByInfinitive('parlare'), 'passatoProssimo', 0)).toBe(
      'ho parlato',
    );
    expect(
      compoundForm(verbByInfinitive('andare'), 'passatoProssimo', 2, {
        gender: 'f',
        number: 'sing',
      }),
    ).toBe('è andata');
    expect(
      compoundForm(verbByInfinitive('venire'), 'passatoProssimo', 5, {
        gender: 'f',
        number: 'plur',
      }),
    ).toBe('sono venute');
  });

  it('avere を取る動詞は過去分詞が変わらない', () => {
    for (const agreement of [
      { gender: 'm', number: 'sing' },
      { gender: 'f', number: 'plur' },
    ]) {
      expect(
        compoundForm(verbByInfinitive('mangiare'), 'passatoProssimo', 2, agreement),
      ).toBe('ha mangiato');
    }
  });

  it('助動詞を取り違えた形が誤答に入る', () => {
    const index = VERBS.findIndex((v) => v.inf === 'andare');
    const variants = verbVariants({
      verbIndex: index,
      tense: 'passatoProssimo',
      person: 2,
      agreement: { gender: 'm', number: 'sing' },
    });
    // ho andato / ha andato が日本語話者のいちばんの地雷
    expect(variants[0]).toBe('ha andato');
  });

  it('一致違いが誤答に入る', () => {
    const index = VERBS.findIndex((v) => v.inf === 'andare');
    const variants = verbVariants({
      verbIndex: index,
      tense: 'passatoProssimo',
      person: 2,
      agreement: { gender: 'f', number: 'sing' },
    });
    expect(variants).toContain('è andato');
    expect(variants).toContain('è andati');
  });

  it('不規則な過去分詞を規則で作った形が誤答に入る', () => {
    const index = VERBS.findIndex((v) => v.inf === 'scrivere');
    const variants = verbVariants({
      verbIndex: index,
      tense: 'passatoProssimo',
      person: 1,
      agreement: {},
    });
    expect(variants).toContain('hai scrivuto');
  });

  it('essere を取る動詞は性がはっきりする主語で出る', () => {
    const rng = seeded(21);
    for (let i = 0; i < 800; i++) {
      const item = generateItem(passato, {}, { rng });
      if (item.source.tense !== 'passatoProssimo') continue;
      const verb = VERBS[item.source.verbIndex];
      if (verb.aux !== 'essere') continue;
      // io では andato / andata のどちらも正解になってしまう
      const subjects = Object.values(NAMED_SUBJECTS).map((s) => s.text);
      const used = item.prompt.replace(/^Ieri /, '').split(' ___ ')[0];
      expect(subjects).toContain(used);
    }
  });

  it('答えが組み立てた形と一致する', () => {
    const rng = seeded(22);
    for (let i = 0; i < 800; i++) {
      const item = generateItem(passato, {}, { rng });
      const verb = VERBS[item.source.verbIndex];
      expect(item.answer).toBe(
        formFor(verb, item.source.tense, item.source.person, item.source.agreement),
      );
    }
  });

  it('過去の文には時を示す語が付く', () => {
    const rng = seeded(23);
    for (let i = 0; i < 400; i++) {
      const item = generateItem(passato, {}, { rng });
      if (item.source.tense === 'passatoProssimo') {
        expect(item.prompt.startsWith('Ieri ')).toBe(true);
      } else {
        expect(item.prompt.startsWith('Ieri ')).toBe(false);
      }
    }
  });

  it('例文が時を示す語と矛盾しない', () => {
    // 「Ieri ... domani mattina」のような文を作らない
    for (const verb of VERBS) {
      expect(verb.tail).not.toMatch(/domani|ieri/);
    }
  });

  it('選択肢が4つで、正解がちょうど1つ', () => {
    const rng = seeded(24);
    for (let i = 0; i < 800; i++) {
      const item = generateItem(passato, {}, { rng });
      expect(item.choices).toHaveLength(CHOICE_COUNT);
      expect(item.choices.filter((c) => c === item.answer)).toHaveLength(1);
      expect(new Set(item.choices).size).toBe(CHOICE_COUNT);
    }
  });

  it('間違いの型がタグに出る', () => {
    const rng = seeded(25);
    let sawAgreement = false;
    let sawParticiple = false;
    for (let i = 0; i < 800; i++) {
      const item = generateItem(passato, {}, { rng });
      if (item.source.tense !== 'passatoProssimo') continue;
      const verb = VERBS[item.source.verbIndex];
      expect(item.tags).toContain('verb:ausiliare');
      expect(item.tags).toContain(`verb:aux-${verb.aux}`);
      if (verb.aux === 'essere') {
        expect(item.tags).toContain('verb:accordo');
        sawAgreement = true;
      }
      if (verb.pp) {
        expect(item.tags).toContain('verb:participio');
        sawParticiple = true;
      }
    }
    expect(sawAgreement).toBe(true);
    expect(sawParticiple).toBe(true);
  });

  it('出題範囲の設定で時制が決まる', () => {
    const rng = seeded(26);
    const onlyPresent = new Set();
    for (let i = 0; i < 200; i++) {
      onlyPresent.add(generateItem(verbsOnly, {}, { rng }).source.tense);
    }
    expect(onlyPresent).toEqual(new Set(['presente']));

    const both = new Set();
    for (let i = 0; i < 400; i++) {
      both.add(generateItem(passato, {}, { rng }).source.tense);
    }
    expect(both).toEqual(new Set(['presente', 'passatoProssimo']));
  });
});

describe('半過去', () => {
  const imperfetto = { ...verbsOnly, verbScope: 'imperfetto' };

  it.each([
    ['essere', ['ero', 'eri', 'era', 'eravamo', 'eravate', 'erano']],
    ['fare', ['facevo', 'facevi', 'faceva', 'facevamo', 'facevate', 'facevano']],
    ['dire', ['dicevo', 'dicevi', 'diceva', 'dicevamo', 'dicevate', 'dicevano']],
    ['bere', ['bevevo', 'bevevi', 'beveva', 'bevevamo', 'bevevate', 'bevevano']],
  ])('%s は不規則', (inf, expected) => {
    expect(formsOf(verbByInfinitive(inf), 'imperfetto')).toEqual(expected);
  });

  it('不規則なのはこの4語だけで、ほかは生成する', () => {
    const stored = VERBS.filter((v) => v.irregular?.imperfetto).map((v) => v.inf);
    expect(stored.sort()).toEqual(['bere', 'dire', 'essere', 'fare']);
  });

  it('近過去の形が誤答の先頭に来る', () => {
    const index = VERBS.findIndex((v) => v.inf === 'andare');
    const variants = verbVariants({
      verbIndex: index,
      tense: 'imperfetto',
      person: 0,
      agreement: { gender: 'm', number: 'sing' },
      scope: 'imperfetto',
    });
    expect(variants[0]).toBe('sono andato');
  });

  it('近過去の問題には半過去が誤答に入る', () => {
    const index = VERBS.findIndex((v) => v.inf === 'andare');
    const variants = verbVariants({
      verbIndex: index,
      tense: 'passatoProssimo',
      person: 0,
      agreement: { gender: 'm', number: 'sing' },
      scope: 'imperfetto',
    });
    expect(variants).toContain('andavo');
  });

  it('半過去を開けていなければ時制の取り違えは混ぜない', () => {
    const index = VERBS.findIndex((v) => v.inf === 'andare');
    const variants = verbVariants({
      verbIndex: index,
      tense: 'passatoProssimo',
      person: 0,
      agreement: { gender: 'm', number: 'sing' },
      scope: 'passato',
    });
    expect(variants).not.toContain('andavo');
  });

  it('習慣を表す語が前に付く', () => {
    const rng = seeded(31);
    for (let i = 0; i < 600; i++) {
      const item = generateItem(imperfetto, {}, { rng });
      if (item.source.tense !== 'imperfetto') continue;
      expect(item.prompt).toMatch(/^(Ogni estate|Di solito|Ogni giorno) /);
    }
  });

  it('一回きりの動詞は半過去で出さない', () => {
    const rng = seeded(32);
    for (let i = 0; i < 1200; i++) {
      const item = generateItem(imperfetto, {}, { rng });
      const verb = VERBS[item.source.verbIndex];
      if (verb.punctual) expect(item.source.tense).not.toBe('imperfetto');
    }
  });

  it('近過去と半過去の両方が出る', () => {
    const rng = seeded(33);
    const tenses = new Set();
    for (let i = 0; i < 600; i++) {
      tenses.add(generateItem(imperfetto, {}, { rng }).source.tense);
    }
    expect(tenses).toEqual(new Set(['presente', 'passatoProssimo', 'imperfetto']));
  });

  it('使い分けのタグが付く', () => {
    const rng = seeded(34);
    for (let i = 0; i < 600; i++) {
      const item = generateItem(imperfetto, {}, { rng });
      if (item.source.tense === 'presente') {
        expect(item.tags).not.toContain('verb:uso-passato');
      } else {
        expect(item.tags).toContain('verb:uso-passato');
      }
    }
  });

  it('選択肢が4つで、正解がちょうど1つ', () => {
    const rng = seeded(35);
    for (let i = 0; i < 800; i++) {
      const item = generateItem(imperfetto, {}, { rng });
      expect(item.choices).toHaveLength(CHOICE_COUNT);
      expect(item.choices.filter((c) => c === item.answer)).toHaveLength(1);
      expect(new Set(item.choices).size).toBe(CHOICE_COUNT);
    }
  });
});
