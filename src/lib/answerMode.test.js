import { describe, it, expect } from 'vitest';
import { resolveAnswerMode } from './answerMode.js';
import { generateItem, CATEGORIES } from './generator.js';
import { DEFAULT_SETTINGS } from './storage.js';

function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const choices = ['a', 'b', 'c', 'd'];

describe('回答方法の決定', () => {
  it('「めくる」を選んだら常にめくる', () => {
    for (const answerLang of ['it', 'ja', 'num']) {
      expect(
        resolveAnswerMode({ answerMode: 'reveal' }, { answerLang, choices }),
      ).toBe('reveal');
    }
  });

  it('「選択式」を選んだら常に選択式', () => {
    for (const answerLang of ['it', 'ja', 'num']) {
      expect(
        resolveAnswerMode({ answerMode: 'choice' }, { answerLang, choices }),
      ).toBe('choice');
    }
  });

  it('「入力」を選んだら、イタリア語でも数字でも入力になる', () => {
    // 以前は 伊 -> 数字 の問題が黙ってめくる方式に落ちていた
    expect(
      resolveAnswerMode({ answerMode: 'typing' }, { answerLang: 'it', choices }),
    ).toBe('typing');
    expect(
      resolveAnswerMode({ answerMode: 'typing' }, { answerLang: 'num', choices }),
    ).toBe('typing');
  });

  it('答えが日本語のときだけ選択式に落とす（めくるにはしない）', () => {
    expect(
      resolveAnswerMode({ answerMode: 'typing' }, { answerLang: 'ja', choices }),
    ).toBe('choice');
  });

  it('選択肢が作れないときはめくるに落ちる', () => {
    expect(
      resolveAnswerMode({ answerMode: 'choice' }, { answerLang: 'it' }),
    ).toBe('reveal');
    expect(
      resolveAnswerMode({ answerMode: 'typing' }, { answerLang: 'ja' }),
    ).toBe('reveal');
  });
});

describe('実際の出題での回答方法', () => {
  const settings = (over) => ({ ...DEFAULT_SETTINGS, ...over });

  it('入力を選ぶと、めくる方式は一度も出ない', () => {
    const rng = seeded(21);
    for (const direction of ['production', 'both', 'recognition']) {
      const s = settings({ answerMode: 'typing', direction, officialTime: true });
      for (let i = 0; i < 500; i++) {
        const item = generateItem(s, {}, { rng });
        expect(resolveAnswerMode(s, item)).not.toBe('reveal');
      }
    }
  });

  it('向きが「両方」でも入力が大半になる', () => {
    const rng = seeded(22);
    const s = settings({ answerMode: 'typing', direction: 'both' });
    let typing = 0;
    for (let i = 0; i < 1000; i++) {
      if (resolveAnswerMode(s, generateItem(s, {}, { rng })) === 'typing') typing++;
    }
    expect(typing).toBeGreaterThan(800);
  });

  it('日本語で答える問題では入力を出さない', () => {
    const rng = seeded(23);
    const s = settings({ answerMode: 'typing', direction: 'recognition' });
    for (let i = 0; i < 500; i++) {
      const item = generateItem(s, {}, { rng });
      if (item.answerLang === 'ja') {
        expect(resolveAnswerMode(s, item)).toBe('choice');
      }
    }
  });

  it('どのカテゴリでも answerLang と inputMode が設定されている', () => {
    const rng = seeded(24);
    const s = settings({ officialTime: true });
    for (let i = 0; i < 1000; i++) {
      const item = generateItem(s, {}, { rng });
      expect(['it', 'ja', 'num']).toContain(item.answerLang);
      if (item.inputMode !== undefined) {
        expect(['text', 'numeric']).toContain(item.inputMode);
      }
    }
  });

  it('数字キーボードを出すのは、答えが数字だけの問題に限る', () => {
    const rng = seeded(25);
    const s = settings({ officialTime: true });
    for (let i = 0; i < 1000; i++) {
      const item = generateItem(s, {}, { rng });
      if (item.inputMode === 'numeric') {
        // コロンを含む時刻は数字キーボードでは打てないので text にしてある
        expect(item.answer).toMatch(/^\d+$/);
      }
    }
  });
});
