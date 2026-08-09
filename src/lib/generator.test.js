import { describe, it, expect } from 'vitest';
import {
  generateItem,
  buildCandidate,
  tagWeight,
  scoreItem,
  describeTag,
  hintFor,
  CATEGORIES,
  NUMBER_RANGES,
} from './generator.js';
import { DEFAULT_SETTINGS } from './storage.js';
import { toItalian } from './italianNumbers.js';

/** 決定的なテストのための線形合同法の擬似乱数 */
function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const settingsWith = (over = {}) => ({ ...DEFAULT_SETTINGS, ...over });

const onlyCategory = (id) =>
  settingsWith({
    categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === id])),
  });

describe('生成された問題の形', () => {
  it('必要なフィールドがすべて埋まっている', () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      const item = buildCandidate(DEFAULT_SETTINGS, rng);
      expect(typeof item.key).toBe('string');
      expect(item.prompt).toBeTruthy();
      expect(item.answer).toBeTruthy();
      expect(item.speech).toBeTruthy();
      expect(Array.isArray(item.tags)).toBe(true);
      expect(item.tags.length).toBeGreaterThan(0);
      expect(CATEGORIES.map((c) => c.id)).toContain(item.category);
    }
  });

  it('読み上げ用テキストには数字が混ざらない', () => {
    const rng = seeded(99);
    for (let i = 0; i < 500; i++) {
      const item = buildCandidate(DEFAULT_SETTINGS, rng);
      expect(item.speech).not.toMatch(/[0-9]/);
    }
  });

  it('問題文と答えが同じになることはない', () => {
    const rng = seeded(3);
    for (let i = 0; i < 500; i++) {
      const item = buildCandidate(DEFAULT_SETTINGS, rng);
      expect(item.prompt).not.toBe(item.answer);
    }
  });
});

describe('カテゴリの絞り込み', () => {
  it.each(CATEGORIES.map((c) => c.id))('%s だけを出せる', (id) => {
    const rng = seeded(42);
    const settings = onlyCategory(id);
    for (let i = 0; i < 100; i++) {
      expect(buildCandidate(settings, rng).category).toBe(id);
    }
  });

  it('すべてオフなら数字にフォールバックする', () => {
    const rng = seeded(5);
    const settings = settingsWith({
      categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, false])),
    });
    expect(buildCandidate(settings, rng).category).toBe('numbers');
  });
});

describe('数字の出題範囲', () => {
  it.each(NUMBER_RANGES.map((r) => [r.id, r.min, r.max]))(
    '%s は範囲内の数しか出さない',
    (id, min, max) => {
      const rng = seeded(11);
      const settings = { ...onlyCategory('numbers'), numberRange: id };
      for (let i = 0; i < 300; i++) {
        const item = buildCandidate(settings, rng);
        const n = Number(item.reverse ? item.answer : item.prompt);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(min);
        expect(n).toBeLessThanOrEqual(max);
        // 綴りが数詞生成器と一致している
        expect(item.speech).toBe(toItalian(n));
      }
    },
  );
});

describe('出題の向き', () => {
  it('production では常に日本語/数字 -> イタリア語', () => {
    const rng = seeded(21);
    const settings = settingsWith({ direction: 'production' });
    for (let i = 0; i < 300; i++) {
      expect(buildCandidate(settings, rng).reverse).toBe(false);
    }
  });

  it('recognition では逆向きが出る', () => {
    const rng = seeded(21);
    const settings = settingsWith({
      ...onlyCategory('numbers'),
      direction: 'recognition',
    });
    for (let i = 0; i < 100; i++) {
      expect(buildCandidate(settings, rng).reverse).toBe(true);
    }
  });
});

describe('重み付け', () => {
  it('未出題のタグがいちばん重い', () => {
    expect(tagWeight(undefined)).toBeGreaterThan(
      tagWeight({ seen: 10, wrong: 0 }),
    );
  });

  it('間違いが多いタグほど重い', () => {
    expect(tagWeight({ seen: 10, wrong: 8 })).toBeGreaterThan(
      tagWeight({ seen: 10, wrong: 2 }),
    );
  });

  it('できているタグの重みは 1 に近づく', () => {
    expect(tagWeight({ seen: 50, wrong: 0 })).toBe(1);
  });

  it('問題のスコアはいちばん弱いタグに引っぱられる', () => {
    const stats = { a: { seen: 10, wrong: 0 }, b: { seen: 10, wrong: 10 } };
    expect(scoreItem({ tags: ['a', 'b'] }, stats)).toBe(tagWeight(stats.b));
  });
});

describe('苦手なものが多く出る', () => {
  it('間違えた十の位が、正解している十の位より多く出題される', () => {
    const settings = { ...onlyCategory('numbers'), numberRange: 'r100' };
    const stats = {};
    // venti 台は全滅、novanta 台は全問正解という成績にする
    for (const tag of ['num:venti', 'num:trenta', 'num:quaranta']) {
      stats[tag] = { seen: 20, wrong: 20 };
    }
    for (const tag of ['num:novanta', 'num:ottanta', 'num:settanta']) {
      stats[tag] = { seen: 20, wrong: 0 };
    }

    const rng = seeded(1234);
    let weak = 0;
    let strong = 0;
    for (let i = 0; i < 600; i++) {
      const item = generateItem(settings, stats, { rng });
      if (item.tags.some((t) => ['num:venti', 'num:trenta', 'num:quaranta'].includes(t))) weak++;
      if (item.tags.some((t) => ['num:novanta', 'num:ottanta', 'num:settanta'].includes(t))) strong++;
    }
    expect(weak).toBeGreaterThan(strong * 2);
  });

  it('直前に出した問題は避ける', () => {
    const settings = onlyCategory('weekday');
    const rng = seeded(8);
    const seen = [];
    let repeats = 0;
    for (let i = 0; i < 200; i++) {
      const item = generateItem(settings, {}, { rng, recentKeys: seen.slice(-3) });
      if (seen.slice(-3).includes(item.key)) repeats++;
      seen.push(item.key);
    }
    // 曜日は候補が少ないので完全には避けられないが、大半は避けられる
    expect(repeats).toBeLessThan(20);
  });
});

describe('答えに添える解説', () => {
  it('母音脱落やアクセントの規則を説明する', () => {
    expect(hintFor(['num:elisione-uno'])).toContain('ventuno');
    expect(hintFor(['num:tre-accento'])).toContain('tré');
    expect(hintFor(['num:cento-elisione'])).toContain('cento');
    expect(hintFor(['time:meno'])).toContain('meno');
    expect(hintFor(['date:primo'])).toContain('primo');
  });

  it('該当する規則がなければ null', () => {
    expect(hintFor(['weekday:sabato'])).toBeNull();
    expect(hintFor([])).toBeNull();
  });

  it('解説が問題文や答えの丸写しにならない', () => {
    const rng = seeded(77);
    for (let i = 0; i < 400; i++) {
      const item = buildCandidate(DEFAULT_SETTINGS, rng);
      if (!item.answerNote) continue;
      expect(item.answerNote).not.toBe(item.prompt);
      expect(item.answerNote).not.toBe(item.answer);
    }
  });
});

describe('describeTag', () => {
  it('主要な規則に日本語ラベルがある', () => {
    expect(describeTag('num:elisione-otto')).toContain('母音脱落');
    expect(describeTag('num:cento-elisione')).toContain('cento');
    expect(describeTag('time:meno')).toContain('meno');
    expect(describeTag('date:primo')).toContain('primo');
  });

  it('未知のタグでも空文字を返さない', () => {
    expect(describeTag('weekday:lunedì')).toBe('lunedì');
    expect(describeTag('month:agosto')).toBe('agosto');
  });
});
