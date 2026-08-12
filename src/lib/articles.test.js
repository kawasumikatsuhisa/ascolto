import { describe, it, expect } from 'vitest';
import {
  onsetClass,
  definiteArticle,
  indefiniteArticle,
  combine,
  articleFor,
  phraseWithArticle,
  COMBINING_PREPOSITIONS,
} from './articles.js';

/** 仕様で必ず通すことになっている表 */
const TABLE = [
  {
    sing: 'libro',
    plur: 'libri',
    gender: 'm',
    def: 'il libro',
    defPlur: 'i libri',
    indef: 'un libro',
    di: 'del libro',
  },
  {
    sing: 'studente',
    plur: 'studenti',
    gender: 'm',
    def: 'lo studente',
    defPlur: 'gli studenti',
    indef: 'uno studente',
    di: 'dello studente',
  },
  {
    sing: 'amico',
    plur: 'amici',
    gender: 'm',
    def: "l'amico",
    defPlur: 'gli amici',
    indef: 'un amico',
    di: "dell'amico",
  },
  {
    sing: 'casa',
    plur: 'case',
    gender: 'f',
    def: 'la casa',
    defPlur: 'le case',
    indef: 'una casa',
    di: 'della casa',
  },
  {
    sing: 'amica',
    plur: 'amiche',
    gender: 'f',
    def: "l'amica",
    defPlur: 'le amiche',
    indef: "un'amica",
    di: "dell'amica",
  },
  {
    sing: 'zio',
    plur: 'zii',
    gender: 'm',
    def: 'lo zio',
    defPlur: 'gli zii',
    indef: 'uno zio',
    di: 'dello zio',
  },
  {
    sing: 'psicologo',
    plur: 'psicologi',
    gender: 'm',
    def: 'lo psicologo',
    defPlur: 'gli psicologi',
    indef: 'uno psicologo',
    di: 'dello psicologo',
  },
];

describe('仕様の表', () => {
  it.each(TABLE.map((r) => [r.sing, r]))('%s: 定冠詞単数', (_w, row) => {
    expect(phraseWithArticle(row.sing, { gender: row.gender })).toBe(row.def);
  });

  it.each(TABLE.map((r) => [r.sing, r]))('%s: 定冠詞複数', (_w, row) => {
    expect(
      phraseWithArticle(row.plur, { gender: row.gender, number: 'plur' }),
    ).toBe(row.defPlur);
  });

  it.each(TABLE.map((r) => [r.sing, r]))('%s: 不定冠詞', (_w, row) => {
    expect(
      phraseWithArticle(row.sing, { gender: row.gender, kind: 'indefinite' }),
    ).toBe(row.indef);
  });

  it.each(TABLE.map((r) => [r.sing, r]))('%s: di + 定冠詞', (_w, row) => {
    expect(
      phraseWithArticle(row.sing, { gender: row.gender, preposition: 'di' }),
    ).toBe(row.di);
  });
});

describe('語頭の分類', () => {
  it('母音で始まる語', () => {
    for (const w of ['amico', 'estate', 'isola', 'ora', 'uovo']) {
      expect(onsetClass(w)).toBe('vowel');
    }
  });

  it('h は発音しないので母音扱い', () => {
    expect(onsetClass('hotel')).toBe('vowel');
    expect(definiteArticle({ gender: 'm', number: 'sing', onset: onsetClass('hotel') })).toBe("l'");
  });

  it('s + 子音', () => {
    for (const w of ['studente', 'sbaglio', 'scontrino', 'spaghetti', 'stadio']) {
      expect(onsetClass(w)).toBe('special');
    }
  });

  it('s + 母音はふつうの子音扱い', () => {
    expect(onsetClass('sale')).toBe('consonant');
    expect(phraseWithArticle('sale', { gender: 'm' })).toBe('il sale');
  });

  it('z / gn / ps / pn / x / y', () => {
    expect(onsetClass('zio')).toBe('special');
    expect(onsetClass('gnocco')).toBe('special');
    expect(onsetClass('psicologo')).toBe('special');
    expect(onsetClass('pneumatico')).toBe('special');
    expect(onsetClass('xilofono')).toBe('special');
    expect(onsetClass('yogurt')).toBe('special');
  });

  it('i + 母音は半子音なので lo を取る', () => {
    expect(onsetClass('iogurt')).toBe('special');
    expect(phraseWithArticle('iogurt', { gender: 'm' })).toBe('lo iogurt');
    // i + 子音はふつうに母音扱い
    expect(onsetClass('isola')).toBe('vowel');
    expect(phraseWithArticle('isola', { gender: 'f' })).toBe("l'isola");
  });

  it('ふつうの子音', () => {
    for (const w of ['libro', 'casa', 'treno', 'monte', 'ponte']) {
      expect(onsetClass(w)).toBe('consonant');
    }
  });
});

describe('前置詞結合', () => {
  const ARTICLES = ['il', 'lo', "l'", 'la', 'i', 'gli', 'le'];

  it.each([
    ['di', ['del', 'dello', "dell'", 'della', 'dei', 'degli', 'delle']],
    ['a', ['al', 'allo', "all'", 'alla', 'ai', 'agli', 'alle']],
    ['da', ['dal', 'dallo', "dall'", 'dalla', 'dai', 'dagli', 'dalle']],
    ['in', ['nel', 'nello', "nell'", 'nella', 'nei', 'negli', 'nelle']],
    ['su', ['sul', 'sullo', "sull'", 'sulla', 'sui', 'sugli', 'sulle']],
  ])('%s + 定冠詞7形', (preposition, expected) => {
    expect(ARTICLES.map((a) => combine(preposition, a))).toEqual(expected);
  });

  it('con と per は結合しない', () => {
    expect(combine('con', 'il')).toBeNull();
    expect(combine('per', 'la')).toBeNull();
    expect(phraseWithArticle('libro', { gender: 'm', preposition: 'con' })).toBe(
      'con il libro',
    );
    expect(phraseWithArticle('casa', { gender: 'f', preposition: 'per' })).toBe(
      'per la casa',
    );
  });

  it('結合する前置詞は5つだけ', () => {
    expect(COMBINING_PREPOSITIONS).toEqual(['di', 'a', 'da', 'in', 'su']);
  });

  it('アポストロフィの形は空白を入れずにつなぐ', () => {
    expect(phraseWithArticle('amico', { gender: 'm', preposition: 'a' })).toBe(
      "all'amico",
    );
    expect(phraseWithArticle('estate', { gender: 'f', preposition: 'in' })).toBe(
      "nell'estate",
    );
  });

  it('不定冠詞は結合しない', () => {
    expect(
      phraseWithArticle('libro', {
        gender: 'm',
        kind: 'indefinite',
        preposition: 'di',
      }),
    ).toBe('di un libro');
  });
});

describe('定冠詞の全パターン', () => {
  it('7形すべてが規則から出る', () => {
    const got = [];
    for (const gender of ['m', 'f']) {
      for (const number of ['sing', 'plur']) {
        for (const onset of ['consonant', 'special', 'vowel']) {
          got.push(definiteArticle({ gender, number, onset }));
        }
      }
    }
    expect(new Set(got)).toEqual(new Set(['il', 'lo', "l'", 'la', 'i', 'gli', 'le']));
  });

  it('女性複数は語頭によらず le', () => {
    for (const onset of ['consonant', 'special', 'vowel']) {
      expect(definiteArticle({ gender: 'f', number: 'plur', onset })).toBe('le');
    }
  });

  it('男性複数は i か gli の2つだけ', () => {
    expect(definiteArticle({ gender: 'm', number: 'plur', onset: 'consonant' })).toBe('i');
    expect(definiteArticle({ gender: 'm', number: 'plur', onset: 'special' })).toBe('gli');
    expect(definiteArticle({ gender: 'm', number: 'plur', onset: 'vowel' })).toBe('gli');
  });
});

describe('不定冠詞', () => {
  it("un' は女性の母音始まりだけ", () => {
    expect(indefiniteArticle({ gender: 'f', onset: 'vowel' })).toBe("un'");
    // 男性の母音始まりはアポストロフィを付けない
    expect(indefiniteArticle({ gender: 'm', onset: 'vowel' })).toBe('un');
  });

  it('男性は un / uno の2つ', () => {
    expect(indefiniteArticle({ gender: 'm', onset: 'consonant' })).toBe('un');
    expect(indefiniteArticle({ gender: 'm', onset: 'special' })).toBe('uno');
  });
});

describe('articleFor は冠詞だけを返す', () => {
  it('語をつけずに冠詞そのものが取れる', () => {
    expect(articleFor('studente', { gender: 'm' })).toBe('lo');
    expect(articleFor('studente', { gender: 'm', preposition: 'su' })).toBe('sullo');
    expect(articleFor('amiche', { gender: 'f', number: 'plur', preposition: 'da' })).toBe('dalle');
  });
});
