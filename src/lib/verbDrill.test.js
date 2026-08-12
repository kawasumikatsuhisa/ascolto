import { describe, it, expect } from 'vitest';
import { VERBS, verbByInfinitive, agreesWithSubject } from './verbData.js';
import {
  formsOf,
  participleOf,
  isIrregularIn,
  verbVariants,
  verbTags,
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
  it.each([
    ['fare', 'fatto'],
    ['dire', 'detto'],
    ['vedere', 'visto'],
    ['prendere', 'preso'],
    ['scrivere', 'scritto'],
    ['aprire', 'aperto'],
    ['rimanere', 'rimasto'],
    ['nascere', 'nato'],
  ])('%s -> %s', (inf, expected) => {
    expect(participleOf(verbByInfinitive(inf))).toBe(expected);
  });

  it('規則動詞は生成される', () => {
    expect(participleOf(verbByInfinitive('parlare'))).toBe('parlato');
    expect(participleOf(verbByInfinitive('dormire'))).toBe('dormito');
    expect(participleOf(verbByInfinitive('credere'))).toBe('creduto');
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
