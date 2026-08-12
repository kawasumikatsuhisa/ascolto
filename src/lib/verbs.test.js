import { describe, it, expect } from 'vitest';
import {
  PERSONS,
  SIMPLE_TENSES,
  conjugateRegular,
  regularParticiple,
  agreeParticiple,
  infinitiveGroup,
  regularFutureStem,
  conjugateFromStem,
  congiuntiveFromPresente,
} from './verbs.js';

describe('-are 規則動詞（parlare）', () => {
  it.each([
    ['presente', ['parlo', 'parli', 'parla', 'parliamo', 'parlate', 'parlano']],
    [
      'imperfetto',
      ['parlavo', 'parlavi', 'parlava', 'parlavamo', 'parlavate', 'parlavano'],
    ],
    [
      'futuro',
      ['parlerò', 'parlerai', 'parlerà', 'parleremo', 'parlerete', 'parleranno'],
    ],
    [
      'condizionale',
      [
        'parlerei',
        'parleresti',
        'parlerebbe',
        'parleremmo',
        'parlereste',
        'parlerebbero',
      ],
    ],
    [
      'congPresente',
      ['parli', 'parli', 'parli', 'parliamo', 'parliate', 'parlino'],
    ],
    [
      'congImperfetto',
      [
        'parlassi',
        'parlassi',
        'parlasse',
        'parlassimo',
        'parlaste',
        'parlassero',
      ],
    ],
    [
      'passatoRemoto',
      ['parlai', 'parlasti', 'parlò', 'parlammo', 'parlaste', 'parlarono'],
    ],
  ])('%s', (tense, expected) => {
    expect(conjugateRegular('parlare', tense)).toEqual(expected);
  });
});

describe('-ere 規則動詞（credere）', () => {
  it.each([
    ['presente', ['credo', 'credi', 'crede', 'crediamo', 'credete', 'credono']],
    [
      'imperfetto',
      ['credevo', 'credevi', 'credeva', 'credevamo', 'credevate', 'credevano'],
    ],
    [
      'futuro',
      ['crederò', 'crederai', 'crederà', 'crederemo', 'crederete', 'crederanno'],
    ],
    [
      'congPresente',
      ['creda', 'creda', 'creda', 'crediamo', 'crediate', 'credano'],
    ],
    [
      'congImperfetto',
      [
        'credessi',
        'credessi',
        'credesse',
        'credessimo',
        'credeste',
        'credessero',
      ],
    ],
  ])('%s', (tense, expected) => {
    expect(conjugateRegular('credere', tense)).toEqual(expected);
  });
});

describe('-ire 規則動詞（dormire）', () => {
  it.each([
    ['presente', ['dormo', 'dormi', 'dorme', 'dormiamo', 'dormite', 'dormono']],
    [
      'imperfetto',
      ['dormivo', 'dormivi', 'dormiva', 'dormivamo', 'dormivate', 'dormivano'],
    ],
    [
      'futuro',
      ['dormirò', 'dormirai', 'dormirà', 'dormiremo', 'dormirete', 'dormiranno'],
    ],
    [
      'congPresente',
      ['dorma', 'dorma', 'dorma', 'dormiamo', 'dormiate', 'dormano'],
    ],
  ])('%s', (tense, expected) => {
    expect(conjugateRegular('dormire', tense)).toEqual(expected);
  });
});

describe('-isc- 型（capire）', () => {
  it('現在形だけ語幹が伸びる', () => {
    expect(conjugateRegular('capire', 'presente', { isc: true })).toEqual([
      'capisco',
      'capisci',
      'capisce',
      'capiamo',
      'capite',
      'capiscono',
    ]);
  });

  it('接続法現在も -isc- を取る', () => {
    expect(conjugateRegular('capire', 'congPresente', { isc: true })).toEqual([
      'capisca',
      'capisca',
      'capisca',
      'capiamo',
      'capiate',
      'capiscano',
    ]);
  });

  it('半過去と未来はふつうの -ire と同じ', () => {
    expect(conjugateRegular('capire', 'imperfetto', { isc: true })).toEqual(
      conjugateRegular('capire', 'imperfetto'),
    );
    expect(conjugateRegular('capire', 'futuro', { isc: true })).toEqual(
      conjugateRegular('capire', 'futuro'),
    );
  });

  it('noi と voi には -isc- が入らない', () => {
    const forms = conjugateRegular('finire', 'presente', { isc: true });
    expect(forms[3]).toBe('finiamo');
    expect(forms[4]).toBe('finite');
  });
});

describe('綴りの調整', () => {
  it('-care は e・i の前で h を入れる', () => {
    expect(conjugateRegular('cercare', 'presente')).toEqual([
      'cerco',
      'cerchi',
      'cerca',
      'cerchiamo',
      'cercate',
      'cercano',
    ]);
    expect(conjugateRegular('cercare', 'futuro')[0]).toBe('cercherò');
    expect(conjugateRegular('cercare', 'congPresente')).toEqual([
      'cerchi',
      'cerchi',
      'cerchi',
      'cerchiamo',
      'cerchiate',
      'cerchino',
    ]);
  });

  it('-gare も同じ', () => {
    expect(conjugateRegular('pagare', 'presente')).toEqual([
      'pago',
      'paghi',
      'paga',
      'paghiamo',
      'pagate',
      'pagano',
    ]);
    expect(conjugateRegular('pagare', 'futuro')[0]).toBe('pagherò');
  });

  it('-giare は e・i の前で i を落とす', () => {
    expect(conjugateRegular('mangiare', 'presente')).toEqual([
      'mangio',
      'mangi',
      'mangia',
      'mangiamo',
      'mangiate',
      'mangiano',
    ]);
    expect(conjugateRegular('mangiare', 'futuro')[0]).toBe('mangerò');
    expect(conjugateRegular('mangiare', 'congPresente')[5]).toBe('mangino');
  });

  it('-iare の語幹の i は i の前でだけ落ちる', () => {
    // studii / studiiamo にならないこと。ci/gi と違って e の前では残る
    expect(conjugateRegular('studiare', 'presente')).toEqual([
      'studio',
      'studi',
      'studia',
      'studiamo',
      'studiate',
      'studiano',
    ]);
    expect(conjugateRegular('studiare', 'futuro')[0]).toBe('studierò');
    expect(conjugateRegular('studiare', 'condizionale')[0]).toBe('studierei');
    expect(conjugateRegular('studiare', 'congPresente')).toEqual([
      'studi',
      'studi',
      'studi',
      'studiamo',
      'studiate',
      'studino',
    ]);
  });

  it('どの -are 動詞でも i が3つ以上続かない', () => {
    for (const verb of ['studiare', 'mangiare', 'cominciare', 'cercare', 'parlare']) {
      for (const tense of SIMPLE_TENSES) {
        for (const form of conjugateRegular(verb, tense)) {
          expect(form, `${verb} ${tense}`).not.toMatch(/ii/);
        }
      }
    }
  });

  it('-ciare も同じ', () => {
    expect(conjugateRegular('cominciare', 'presente')[1]).toBe('cominci');
    expect(conjugateRegular('cominciare', 'futuro')[0]).toBe('comincerò');
  });

  it('半過去や遠過去では調整が起きない', () => {
    expect(conjugateRegular('cercare', 'imperfetto')[0]).toBe('cercavo');
    expect(conjugateRegular('mangiare', 'imperfetto')[0]).toBe('mangiavo');
    expect(conjugateRegular('mangiare', 'passatoRemoto')[2]).toBe('mangiò');
    expect(conjugateRegular('cercare', 'passatoRemoto')[2]).toBe('cercò');
  });
});

describe('過去分詞', () => {
  it.each([
    ['parlare', 'parlato'],
    ['mangiare', 'mangiato'],
    ['credere', 'creduto'],
    ['dormire', 'dormito'],
    ['capire', 'capito'],
  ])('%s -> %s', (infinitive, expected) => {
    expect(regularParticiple(infinitive)).toBe(expected);
  });

  it('主語に合わせて語尾が変わる', () => {
    expect(agreeParticiple('andato', { gender: 'm', number: 'sing' })).toBe('andato');
    expect(agreeParticiple('andato', { gender: 'f', number: 'sing' })).toBe('andata');
    expect(agreeParticiple('andato', { gender: 'm', number: 'plur' })).toBe('andati');
    expect(agreeParticiple('andato', { gender: 'f', number: 'plur' })).toBe('andate');
  });

  it('-o で終わらない過去分詞は変えない', () => {
    // rimasto などは -o なので変わるが、外来の不変化形は触らない
    expect(agreeParticiple('andato')).toBe('andato');
    expect(agreeParticiple('bevuto', { gender: 'f' })).toBe('bevuta');
  });
});

describe('全体の健全性', () => {
  const VERBS = ['parlare', 'credere', 'dormire', 'cercare', 'mangiare', 'pagare'];

  it('どの動詞・時制でも6形そろう', () => {
    for (const verb of VERBS) {
      for (const tense of SIMPLE_TENSES) {
        const forms = conjugateRegular(verb, tense);
        expect(forms).toHaveLength(PERSONS.length);
        for (const form of forms) expect(form.length).toBeGreaterThan(2);
      }
    }
  });

  it('活用形に不定詞の語尾がそのまま残らない', () => {
    for (const verb of VERBS) {
      for (const tense of SIMPLE_TENSES) {
        for (const form of conjugateRegular(verb, tense)) {
          expect(form).not.toBe(verb);
        }
      }
    }
  });

  it('語尾の判定', () => {
    expect(infinitiveGroup('parlare')).toBe('are');
    expect(infinitiveGroup('credere')).toBe('ere');
    expect(infinitiveGroup('dormire')).toBe('ire');
    expect(infinitiveGroup('boh')).toBeNull();
  });

  it('知らない時制や不定詞は例外にする', () => {
    expect(() => conjugateRegular('parlare', 'nope')).toThrow();
    expect(() => conjugateRegular('boh', 'presente')).toThrow();
    expect(() => regularParticiple('boh')).toThrow();
  });
});

describe('未来・条件法は語幹1つから作る', () => {
  it('規則動詞の語幹', () => {
    expect(regularFutureStem('parlare')).toBe('parler');
    expect(regularFutureStem('credere')).toBe('creder');
    expect(regularFutureStem('dormire')).toBe('dormir');
    expect(regularFutureStem('cercare')).toBe('cercher');
    expect(regularFutureStem('mangiare')).toBe('manger');
    expect(regularFutureStem('studiare')).toBe('studier');
  });

  it('同じ語幹から未来と条件法の両方が出る', () => {
    expect(conjugateFromStem('sar', 'futuro')).toEqual([
      'sarò',
      'sarai',
      'sarà',
      'saremo',
      'sarete',
      'saranno',
    ]);
    expect(conjugateFromStem('sar', 'condizionale')).toEqual([
      'sarei',
      'saresti',
      'sarebbe',
      'saremmo',
      'sareste',
      'sarebbero',
    ]);
  });

  it('語幹が違うだけで語尾は活用の種類によらない', () => {
    for (const tense of ['futuro', 'condizionale']) {
      for (const inf of ['parlare', 'credere', 'dormire']) {
        const fromStem = conjugateFromStem(regularFutureStem(inf), tense);
        expect(conjugateRegular(inf, tense)).toEqual(fromStem);
      }
    }
  });

  it('知らない時制は例外にする', () => {
    expect(() => conjugateFromStem('sar', 'presente')).toThrow();
  });
});

describe('接続法現在は直説法現在から作る', () => {
  it('1人称単数から io / tu / lui と loro が出る', () => {
    expect(
      congiuntiveFromPresente(['vengo', 'vieni', 'viene', 'veniamo', 'venite', 'vengono']),
    ).toEqual(['venga', 'venga', 'venga', 'veniamo', 'veniate', 'vengano']);
  });

  it('noi は直説法と同じ形、voi はその -iamo を -iate に替える', () => {
    const forms = congiuntiveFromPresente([
      'faccio',
      'fai',
      'fa',
      'facciamo',
      'fate',
      'fanno',
    ]);
    expect(forms[3]).toBe('facciamo');
    expect(forms[4]).toBe('facciate');
  });

  it('現在形から作れないものは語幹を渡す', () => {
    const presente = ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'];
    expect(congiuntiveFromPresente(presente, { stem: 'si' })).toEqual([
      'sia',
      'sia',
      'sia',
      'siamo',
      'siate',
      'siano',
    ]);
  });
});
