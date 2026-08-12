import { describe, it, expect } from 'vitest';
import { errorTypeOf, ERROR_TYPE_ORDER } from './errorTypes.js';
import { VERBS } from './verbData.js';
import {
  verbVariantsDetailed,
  buildVerbItem,
  NAMED_SUBJECTS,
  formFor,
} from './verbDrill.js';
import { articleVariantsDetailed, buildArticleItem } from './articleDrill.js';
import { describeTag } from './generator.js';

const indexOf = (inf) => VERBS.findIndex((v) => v.inf === inf);

/** 動詞の出題を1つ組み立てる（生成器を通さずに直接） */
function verbItem({ inf, tense, person = 0, agreement, scope = 'imperfetto' }) {
  const verbIndex = indexOf(inf);
  const source = {
    kind: 'verb',
    verbIndex,
    tense,
    person,
    agreement: agreement ?? { gender: 'm', number: 'sing' },
    scope,
  };
  return {
    source,
    answer: formFor(VERBS[verbIndex], tense, person, source.agreement),
  };
}

describe('動詞の間違いの型', () => {
  it('ho andato は助動詞の選択', () => {
    const item = verbItem({ inf: 'andare', tense: 'passatoProssimo', person: 0 });
    expect(item.answer).toBe('sono andato');
    expect(errorTypeOf(item, 'ho andato')).toBe('verb:ausiliare');
  });

  it('sono andata（Marco が主語）は性数一致', () => {
    const item = verbItem({
      inf: 'andare',
      tense: 'passatoProssimo',
      person: NAMED_SUBJECTS['m-sing'].person,
      agreement: { gender: 'm', number: 'sing' },
    });
    expect(item.answer).toBe('è andato');
    expect(errorTypeOf(item, 'è andata')).toBe('verb:accordo');
    expect(errorTypeOf(item, 'è andati')).toBe('verb:accordo');
  });

  it('近過去の問題で半過去を選んだら使い分け', () => {
    const item = verbItem({ inf: 'andare', tense: 'passatoProssimo', person: 0 });
    expect(errorTypeOf(item, 'andavo')).toBe('verb:uso-passato');
  });

  it('半過去の問題で近過去を選んでも使い分け', () => {
    const item = verbItem({ inf: 'parlare', tense: 'imperfetto', person: 0 });
    expect(item.answer).toBe('parlavo');
    expect(errorTypeOf(item, 'ho parlato')).toBe('verb:uso-passato');
    // 現在形は時制そのものの取り違え
    expect(errorTypeOf(item, 'parlo')).toBe('verb:tempo');
  });

  it('不規則な過去分詞を規則で作った形は participio', () => {
    const item = verbItem({ inf: 'vedere', tense: 'passatoProssimo', person: 0 });
    expect(item.answer).toBe('ho visto');
    expect(errorTypeOf(item, 'ho veduto')).toBe('verb:participio');
  });

  it('人称違いは persona', () => {
    const item = verbItem({ inf: 'parlare', tense: 'presente', person: 0 });
    expect(errorTypeOf(item, 'parla')).toBe('verb:persona');
    expect(errorTypeOf(item, 'parliamo')).toBe('verb:persona');
  });

  it('不規則動詞を規則で活用した形は regolarizzato', () => {
    const item = verbItem({ inf: 'andare', tense: 'presente', person: 0 });
    expect(item.answer).toBe('vado');
    expect(errorTypeOf(item, 'ando')).toBe('verb:regolarizzato');
  });

  it('助動詞の取り違えは人称違いより優先して数える', () => {
    // ho andato は「助動詞違い」でも「sono の別人称」でもないが、
    // avere の他の人称と重なる形が出ても、先に入れた型が残る
    const item = verbItem({ inf: 'andare', tense: 'passatoProssimo', person: 2 });
    const variants = verbVariantsDetailed(item.source);
    const first = variants[0];
    expect(first.type).toBe('verb:ausiliare');
    expect(errorTypeOf(item, first.text)).toBe('verb:ausiliare');
  });
});

describe('冠詞の間違いの型', () => {
  const spec = (over = {}) => ({
    gender: 'm',
    number: 'sing',
    kind: 'definite',
    onset: 'special',
    preposition: null,
    ...over,
  });

  const articleItem = (over = {}) => {
    const variantSpec = spec(over);
    const [first] = articleVariantsDetailed(variantSpec);
    return { source: { kind: 'article' }, variantSpec, answer: null, first };
  };

  it('lo studente に il を選んだら語頭の判断', () => {
    const item = articleItem();
    expect(errorTypeOf(item, 'il')).toBe('art:attacco');
  });

  it('数の取り違え', () => {
    const item = articleItem({ onset: 'consonant' });
    expect(errorTypeOf(item, 'i')).toBe('art:numero');
  });

  it('性の取り違え', () => {
    const item = articleItem({ onset: 'consonant' });
    expect(errorTypeOf(item, 'la')).toBe('art:genere');
  });

  it('前置詞つきでも結合形から型が分かる', () => {
    const item = articleItem({ preposition: 'di' });
    // 正解は dello。del を選んだら語頭の判断を外している
    expect(errorTypeOf(item, 'del')).toBe('art:attacco');
    expect(errorTypeOf(item, 'della')).toBe('art:genere');
  });
});

describe('型が分からないもの', () => {
  it('打ち間違いのような未知の文字列は null', () => {
    const item = verbItem({ inf: 'parlare', tense: 'presente', person: 0 });
    expect(errorTypeOf(item, 'parllo')).toBeNull();
  });

  it('未入力・自己採点は null', () => {
    const item = verbItem({ inf: 'parlare', tense: 'presente', person: 0 });
    expect(errorTypeOf(item, null)).toBeNull();
    expect(errorTypeOf(item, '')).toBeNull();
    expect(errorTypeOf(null, 'parla')).toBeNull();
  });

  it('正解を選んだときは型を付けない', () => {
    const item = verbItem({ inf: 'parlare', tense: 'presente', person: 0 });
    expect(errorTypeOf(item, item.answer)).toBeNull();
  });

  it('数字や単語は型を取らない（項目ごとの成績で足りる）', () => {
    expect(errorTypeOf({ source: { kind: 'number', n: 21 } }, 'ventiuno')).toBeNull();
    expect(
      errorTypeOf({ source: { kind: 'word', topic: 'saluti', index: 0 } }, 'ciao'),
    ).toBeNull();
  });
});

describe('型の一覧', () => {
  const rng = () => 0.42;
  const randInt = (min, max) => min + Math.floor((max - min + 1) * 0.42);
  const pick = (arr) => arr[0];

  it('実際に出る誤答の型が、すべて並び順に載っている', () => {
    const seen = new Set();
    for (let i = 0; i < VERBS.length; i++) {
      for (const tense of ['presente', 'passatoProssimo', 'imperfetto']) {
        if (tense === 'imperfetto' && VERBS[i].punctual) continue;
        for (let person = 0; person < 6; person++) {
          for (const v of verbVariantsDetailed({
            verbIndex: i,
            tense,
            person,
            agreement: { gender: 'm', number: 'sing' },
            scope: 'imperfetto',
          })) {
            seen.add(v.type);
          }
        }
      }
    }
    for (const onset of ['consonant', 'special', 'vowel']) {
      for (const kind of ['definite', 'indefinite']) {
        for (const v of articleVariantsDetailed({
          gender: 'm',
          number: 'sing',
          kind,
          onset,
          preposition: null,
        })) {
          seen.add(v.type);
        }
      }
    }
    for (const type of seen) expect(ERROR_TYPE_ORDER).toContain(type);
  });

  it('どの型にも日本語のラベルがある', () => {
    for (const tag of ERROR_TYPE_ORDER) {
      const label = describeTag(tag);
      expect(label, tag).not.toBe(tag.split(':').slice(1).join(':'));
      expect(label).toMatch(/[ぁ-んァ-ン一-龥]/);
    }
  });

  it('出題から作った選択肢の誤答は、すべて型が付く', () => {
    for (let i = 0; i < 40; i++) {
      const r = () => ((i * 37) % 100) / 100;
      const item = buildVerbItem({ verbScope: 'imperfetto' }, r, randInt);
      for (const v of verbVariantsDetailed(item.source)) {
        expect(errorTypeOf(item, v.text), `${item.prompt} / ${v.text}`).toBe(v.type);
      }
    }
    const article = buildArticleItem(rng, pick, randInt);
    for (const v of articleVariantsDetailed(article.variantSpec)) {
      expect(errorTypeOf(article, v.text)).toBe(v.type);
    }
  });
});
