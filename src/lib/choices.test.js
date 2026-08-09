import { describe, it, expect } from 'vitest';
import {
  buildChoices,
  ruleVariants,
  spellPlain,
  CHOICE_COUNT,
} from './choices.js';
import { generateItem, CATEGORIES } from './generator.js';
import { DEFAULT_SETTINGS } from './storage.js';
import { toItalian } from './italianNumbers.js';

function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const onlyCategory = (id, over = {}) => ({
  ...DEFAULT_SETTINGS,
  ...over,
  categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === id])),
});

/** 選択肢を作るだけの薄い入り口 */
const choicesFor = (item, seed = 1) => buildChoices(item, seeded(seed));

describe('規則を1つだけ破った綴り', () => {
  it('フラグ無しの綴りは toItalian と完全に一致する（誤答生成器が本体とずれない）', () => {
    for (let n = 0; n <= 9999; n++) {
      expect(spellPlain(n)).toBe(toItalian(n));
    }
  });

  it.each([
    [21, 'ventiuno'], // 母音脱落の忘れ
    [28, 'ventiotto'],
    [81, 'ottantauno'],
    [88, 'ottantaotto'],
    [23, 'ventitre'], // アクセントの忘れ
    [33, 'trentatre'],
    [100, 'unocento'], // 倍数語をつけてしまう
    [108, 'centootto'], // cento の o を残す
    [180, 'centoottanta'],
    [1000, 'unomille'], // mille を数えてしまう
    [2000, 'duemille'], // mila を mille にしてしまう
  ])('%i の誤答に %s が含まれる', (n, expected) => {
    expect(ruleVariants(n)).toContain(expected);
  });

  it('規則が働かない数では誤答を作らない', () => {
    for (const n of [5, 17, 45, 347, 0]) {
      expect(ruleVariants(n)).toEqual([]);
    }
  });

  it('どの誤答も正解と一致しない', () => {
    for (let n = 0; n <= 9999; n++) {
      for (const variant of ruleVariants(n)) {
        expect(variant).not.toBe(toItalian(n));
      }
    }
  });

  it('誤答どうしも重複しない', () => {
    for (let n = 0; n <= 9999; n++) {
      const variants = ruleVariants(n);
      expect(new Set(variants).size).toBe(variants.length);
    }
  });

  it('規則が効く数では必ず誤答が作れる', () => {
    // 母音脱落・アクセント・cento の脱落が起きる数は誤答を持つはず
    for (const n of [21, 28, 23, 108, 180, 888, 1000, 2000, 1888]) {
      expect(ruleVariants(n).length).toBeGreaterThan(0);
    }
  });
});

describe('選択肢の基本条件', () => {
  const settings = DEFAULT_SETTINGS;

  it('正解がちょうど1つ含まれる', () => {
    const rng = seeded(5);
    for (let i = 0; i < 400; i++) {
      const item = generateItem(settings, {}, { rng });
      const hits = item.choices.filter((c) => c === item.answer);
      expect(hits).toHaveLength(1);
    }
  });

  it('選択肢に重複がない', () => {
    const rng = seeded(6);
    for (let i = 0; i < 400; i++) {
      const item = generateItem(settings, {}, { rng });
      expect(new Set(item.choices).size).toBe(item.choices.length);
    }
  });

  it('選択肢が4つそろう', () => {
    const rng = seeded(7);
    for (let i = 0; i < 400; i++) {
      const item = generateItem(settings, {}, { rng });
      expect(item.choices).toHaveLength(CHOICE_COUNT);
    }
  });

  it('空文字や null が混ざらない', () => {
    const rng = seeded(8);
    for (let i = 0; i < 400; i++) {
      const item = generateItem(settings, {}, { rng });
      for (const choice of item.choices) {
        expect(typeof choice).toBe('string');
        expect(choice.length).toBeGreaterThan(0);
      }
    }
  });

  it('正解の位置が偏らない', () => {
    const rng = seeded(9);
    const positions = [0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) {
      const item = generateItem(DEFAULT_SETTINGS, {}, { rng });
      positions[item.choices.indexOf(item.answer)]++;
    }
    // 一様なら各500。極端な偏りがないことだけ見る
    for (const count of positions) {
      expect(count).toBeGreaterThan(350);
      expect(count).toBeLessThan(650);
    }
  });
});

describe('誤答が規則の弁別になっている', () => {
  it('母音脱落の問題では、脱落させ忘れた綴りが選択肢に入る', () => {
    const item = {
      answer: toItalian(21),
      reverse: false,
      source: { kind: 'number', n: 21 },
    };
    expect(choicesFor(item)).toContain('ventiuno');
  });

  it('アクセントの問題では、アクセント無しの綴りが選択肢に入る', () => {
    const item = {
      answer: toItalian(23),
      reverse: false,
      source: { kind: 'number', n: 23 },
    };
    const choices = choicesFor(item);
    expect(choices).toContain('ventitré');
    expect(choices).toContain('ventitre');
  });

  it('cento の脱落の問題では、o を残した綴りが選択肢に入る', () => {
    const item = {
      answer: toItalian(180),
      reverse: false,
      source: { kind: 'number', n: 180 },
    };
    expect(choicesFor(item)).toContain('centoottanta');
  });

  it('mille の問題では unomille が選択肢に入る', () => {
    const item = {
      answer: toItalian(1000),
      reverse: false,
      source: { kind: 'number', n: 1000 },
    };
    expect(choicesFor(item)).toContain('unomille');
  });

  it('meno の問題では、時を繰り上げ忘れた言い方が選択肢に入る', () => {
    const item = {
      answer: 'Sono le quattro meno un quarto',
      reverse: false,
      source: { kind: 'time', hour: 3, minute: 45, official: false },
    };
    const choices = choicesFor(item);
    expect(choices).toContain('Sono le quattro meno un quarto');
    // 繰り上げを忘れた形。un quarto の言い方はそのままで時だけ手前になる
    expect(choices).toContain('Sono le tre meno un quarto');
  });

  it("È l'una の問題では Sono le una が選択肢に入る", () => {
    const item = {
      answer: "È l'una e venti",
      reverse: false,
      source: { kind: 'time', hour: 13, minute: 20, official: false },
    };
    expect(choicesFor(item)).toContain('Sono le una e venti');
  });

  it('1日の問題では基数で言った形が選択肢に入る', () => {
    const item = {
      answer: 'il primo marzo',
      reverse: false,
      source: { kind: 'date', month: 3, day: 1 },
    };
    expect(choicesFor(item)).toContain('il uno marzo');
  });

  it('冠詞が縮約する日付では、縮約しない形が選択肢に入る', () => {
    const item = {
      answer: "l'otto marzo",
      reverse: false,
      source: { kind: 'date', month: 3, day: 8 },
    };
    expect(choicesFor(item)).toContain('il otto marzo');
  });

  it('曜日・月は隣接するものが誤答になる', () => {
    const weekday = {
      answer: 'mercoledì',
      reverse: false,
      source: { kind: 'weekday', index: 3 },
    };
    const choices = choicesFor(weekday);
    expect(choices).toContain('mercoledì');
    expect(choices.filter((c) => c !== 'mercoledì').length).toBe(3);
    expect(choices).toContain('giovedì');
    expect(choices).toContain('martedì');
  });
});

describe('選択肢が答えを漏らさない', () => {
  it('カテゴリごとに、誤答が正解と同じ形にならない', () => {
    const rng = seeded(31);
    for (const category of CATEGORIES.map((c) => c.id)) {
      const settings = onlyCategory(category, { officialTime: true });
      for (let i = 0; i < 300; i++) {
        const item = generateItem(settings, {}, { rng });
        const wrong = item.choices.filter((c) => c !== item.answer);
        expect(wrong).toHaveLength(CHOICE_COUNT - 1);
        for (const choice of wrong) {
          expect(choice).not.toBe(item.answer);
        }
      }
    }
  });

  it('数字の逆向きでは、選択肢がすべて数字になる', () => {
    const rng = seeded(32);
    const settings = onlyCategory('numbers', { direction: 'recognition' });
    for (let i = 0; i < 200; i++) {
      const item = generateItem(settings, {}, { rng });
      for (const choice of item.choices) {
        expect(choice).toMatch(/^\d+$/);
      }
    }
  });

  it('時刻の逆向きでは、選択肢がすべて時計表記になる', () => {
    const rng = seeded(33);
    const settings = onlyCategory('time', { direction: 'recognition' });
    for (let i = 0; i < 200; i++) {
      const item = generateItem(settings, {}, { rng });
      for (const choice of item.choices) {
        expect(choice).toMatch(/^\d{2}:\d{2}$/);
      }
    }
  });

  it('曜日・月の逆向きでは、選択肢がすべて日本語になる', () => {
    const rng = seeded(34);
    for (const category of ['weekday', 'month']) {
      const settings = onlyCategory(category, { direction: 'recognition' });
      for (let i = 0; i < 200; i++) {
        const item = generateItem(settings, {}, { rng });
        if (item.tags.includes(`${category}:sequenza`)) continue; // 順番問題は伊で答える
        for (const choice of item.choices) {
          expect(choice).toMatch(/^[0-9]+月$|曜日$/);
        }
      }
    }
  });
});
