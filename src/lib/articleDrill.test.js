import { describe, it, expect } from 'vitest';
import { NOUNS } from './nouns.js';
import { articleVariants, articleTags } from './articleDrill.js';
import {
  onsetClass,
  definiteArticle,
  indefiniteArticle,
  combine,
  phraseWithArticle,
} from './articles.js';
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

const articlesOnly = {
  ...DEFAULT_SETTINGS,
  categories: Object.fromEntries(
    CATEGORIES.map((c) => [c.id, c.id === 'articles']),
  ),
};

const DEFINITE = ['il', 'lo', "l'", 'la', 'i', 'gli', 'le'];
const INDEFINITE = ['un', 'uno', 'una', "un'"];

describe('名詞データ', () => {
  it('単数・複数・性・訳がそろっている', () => {
    for (const noun of NOUNS) {
      expect(noun.sing).toBeTruthy();
      expect(noun.plur).toBeTruthy();
      expect(['m', 'f']).toContain(noun.gender);
      expect(noun.ja).toBeTruthy();
    }
  });

  it('同じ語を二重に持たない', () => {
    const words = NOUNS.map((n) => n.sing);
    expect(new Set(words).size).toBe(words.length);
  });

  it('語頭のクラスがどれも十分にある', () => {
    const counts = { consonant: 0, special: 0, vowel: 0 };
    for (const noun of NOUNS) counts[onsetClass(noun.sing)]++;
    for (const key of Object.keys(counts)) {
      expect(counts[key]).toBeGreaterThanOrEqual(10);
    }
  });

  it('複数形の語頭クラスが単数と食い違わない', () => {
    // 食い違うと「単数は lo、複数は i」のような妙な組み合わせが出てしまう
    for (const noun of NOUNS) {
      expect(onsetClass(noun.plur)).toBe(onsetClass(noun.sing));
    }
  });
});

describe('誤答の並び', () => {
  it('語頭を取り違えた形が先頭に来る', () => {
    // lo studente に対する il が、この練習でいちばん効く誤答
    const variants = articleVariants({
      gender: 'm',
      number: 'sing',
      kind: 'definite',
      preposition: null,
      onset: 'special',
    });
    expect(variants.slice(0, 2)).toEqual(expect.arrayContaining(['il', "l'"]));
  });

  it('正解と同じ形は混ざらない', () => {
    for (const gender of ['m', 'f']) {
      for (const number of ['sing', 'plur']) {
        for (const onset of ['consonant', 'special', 'vowel']) {
          const correct = definiteArticle({ gender, number, onset });
          const variants = articleVariants({
            gender,
            number,
            onset,
            kind: 'definite',
            preposition: null,
          });
          expect(variants).not.toContain(correct);
          expect(new Set(variants).size).toBe(variants.length);
        }
      }
    }
  });

  it('前置詞つきなら誤答も結合形になる', () => {
    const variants = articleVariants({
      gender: 'm',
      number: 'sing',
      kind: 'definite',
      preposition: 'di',
      onset: 'special',
    });
    expect(variants).toContain('del');
    expect(variants).toContain("dell'");
    for (const v of variants) expect(v).toMatch(/^(de|a|da|ne|su)/);
  });

  it('不定冠詞の誤答は un / uno / una / un’ の中から出る', () => {
    for (const gender of ['m', 'f']) {
      for (const onset of ['consonant', 'special', 'vowel']) {
        const variants = articleVariants({
          gender,
          number: 'sing',
          kind: 'indefinite',
          preposition: null,
          onset,
        });
        for (const v of variants) expect(INDEFINITE).toContain(v);
      }
    }
  });

  it('どの組み合わせでも誤答が3つ以上そろう', () => {
    for (const kind of ['definite', 'indefinite']) {
      for (const gender of ['m', 'f']) {
        for (const number of ['sing', 'plur']) {
          for (const onset of ['consonant', 'special', 'vowel']) {
            for (const preposition of [null, 'di', 'a', 'su']) {
              if (kind === 'indefinite' && number === 'plur') continue;
              const variants = articleVariants({
                gender,
                number,
                kind,
                onset,
                preposition,
              });
              expect(variants.length).toBeGreaterThanOrEqual(3);
            }
          }
        }
      }
    }
  });
});

describe('間違いの型のタグ', () => {
  it('lo を取る語頭にタグが付く', () => {
    expect(
      articleTags({ kind: 'definite', number: 'sing', onset: 'special', gender: 'm' }),
    ).toContain('art:lo');
  });

  it("母音の前の l' にタグが付く", () => {
    expect(
      articleTags({ kind: 'definite', number: 'sing', onset: 'vowel', gender: 'f' }),
    ).toContain('art:elisione');
  });

  it("女性の母音始まり un' にタグが付く", () => {
    expect(
      articleTags({ kind: 'indefinite', number: 'sing', onset: 'vowel', gender: 'f' }),
    ).toContain('art:un-apostrofo');
  });

  it('前置詞ごとにタグが分かれる', () => {
    for (const preposition of ['di', 'a', 'da', 'in', 'su']) {
      expect(
        articleTags({
          kind: 'definite',
          number: 'sing',
          onset: 'consonant',
          gender: 'm',
          preposition,
        }),
      ).toContain(`art:prep-${preposition}`);
    }
  });

  it('タグに日本語のラベルがある', () => {
    const tags = [
      'art:lo',
      'art:elisione',
      'art:un-apostrofo',
      'art:gli',
      'art:prep-di',
      'art:determinativo',
    ];
    for (const tag of tags) {
      expect(describeTag(tag)).toBeTruthy();
      expect(describeTag(tag)).not.toBe(tag);
      expect(tagGroup(tag)).toBe('冠詞');
    }
  });
});

describe('冠詞の出題', () => {
  it('名詞の日本語訳を必ず添える', () => {
    const rng = seeded(11);
    for (let i = 0; i < 400; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      const noun = NOUNS[item.source.index];
      expect(item.promptGloss).toBe(noun.ja);
      expect(item.promptGloss).toBeTruthy();
    }
  });

  it('見出しは文法の分類だけにして、訳を混ぜない', () => {
    const rng = seeded(12);
    const notes = new Set();
    for (let i = 0; i < 400; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      notes.add(item.promptNote);
      expect(item.promptNote).not.toContain(item.promptGloss);
    }
    // 前置詞つきは意味を添える。名詞とつなげると「目の上に」のような
    // 言わない言い方ができるので、こちら側に置いてある
    expect(notes).toContain('in（〜の中に）+ 定冠詞');
    expect(notes).toContain('di（〜の）+ 定冠詞');
    expect(notes).toContain('定冠詞（単数）');
    expect(notes).toContain('不定冠詞');
  });

  it('答えが規則から出る形と一致する', () => {
    const rng = seeded(5);
    for (let i = 0; i < 600; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      expect(item.category).toBe('articles');

      const noun = NOUNS[item.source.index];
      const word = item.source.number === 'plur' ? noun.plur : noun.sing;
      const onset = onsetClass(word);
      const base =
        item.source.articleKind === 'indefinite'
          ? indefiniteArticle({ gender: noun.gender, onset })
          : definiteArticle({
              gender: noun.gender,
              number: item.source.number,
              onset,
            });
      const expected = item.source.preposition
        ? (combine(item.source.preposition, base) ??
          `${item.source.preposition} ${base}`)
        : base;
      expect(item.answer).toBe(expected);
      expect(item.prompt).toBe(`___ ${word}`);
    }
  });

  it('選択肢が4つで、正解がちょうど1つ', () => {
    const rng = seeded(6);
    for (let i = 0; i < 600; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      expect(item.choices).toHaveLength(CHOICE_COUNT);
      expect(item.choices.filter((c) => c === item.answer)).toHaveLength(1);
      expect(new Set(item.choices).size).toBe(CHOICE_COUNT);
    }
  });

  it('選択肢がすべて本物の冠詞の形', () => {
    const rng = seeded(7);
    const prepForms = new Set();
    for (const p of ['di', 'a', 'da', 'in', 'su']) {
      for (const a of DEFINITE) prepForms.add(combine(p, a));
    }
    for (let i = 0; i < 600; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      for (const choice of item.choices) {
        const ok =
          DEFINITE.includes(choice) ||
          INDEFINITE.includes(choice) ||
          prepForms.has(choice);
        expect(ok).toBe(true);
      }
    }
  });

  it('不定冠詞の問題に複数形は出ない', () => {
    const rng = seeded(8);
    for (let i = 0; i < 600; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      if (item.source.articleKind === 'indefinite') {
        expect(item.source.number).toBe('sing');
        expect(item.source.preposition).toBeNull();
      }
    }
  });

  it('読み上げは冠詞つきの語句になる', () => {
    const rng = seeded(9);
    for (let i = 0; i < 300; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      const noun = NOUNS[item.source.index];
      const word = item.source.number === 'plur' ? noun.plur : noun.sing;
      expect(item.speech).toContain(word);
      expect(item.speech).not.toContain('_');
    }
  });

  it('定冠詞・不定冠詞・前置詞結合がどれも出る', () => {
    const rng = seeded(10);
    const kinds = new Set();
    for (let i = 0; i < 400; i++) {
      const item = generateItem(articlesOnly, {}, { rng });
      kinds.add(
        item.source.preposition ? 'prep' : item.source.articleKind,
      );
    }
    expect(kinds).toEqual(new Set(['definite', 'indefinite', 'prep']));
  });
});

describe('仕様の表が出題でも守られる', () => {
  it.each([
    ['libro', 'm', 'il libro'],
    ['studente', 'm', 'lo studente'],
    ['amico', 'm', "l'amico"],
    ['casa', 'f', 'la casa'],
    ['amica', 'f', "l'amica"],
    ['zio', 'm', 'lo zio'],
    ['psicologo', 'm', 'lo psicologo'],
  ])('%s は名詞データにあり、定冠詞が %s になる', (word, gender, expected) => {
    const noun = NOUNS.find((n) => n.sing === word);
    expect(noun).toBeDefined();
    expect(noun.gender).toBe(gender);
    expect(phraseWithArticle(noun.sing, { gender: noun.gender })).toBe(expected);
  });
});
