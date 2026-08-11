import { describe, it, expect } from 'vitest';
import {
  applyGrade,
  applyResult,
  accuracyOf,
  rollDailyProgress,
  todayKey,
  DEFAULT_PROGRESS,
} from './storage.js';

describe('applyGrade', () => {
  it('good は seen だけ増やす', () => {
    const s = applyGrade({}, ['num:venti'], 'good');
    expect(s['num:venti']).toEqual({ seen: 1, wrong: 0 });
  });

  it('again は wrong を1増やす', () => {
    const s = applyGrade({}, ['num:venti'], 'again');
    expect(s['num:venti']).toEqual({ seen: 1, wrong: 1 });
  });

  it('hard は半分だけ間違い扱い', () => {
    const s = applyGrade({}, ['num:venti'], 'hard');
    expect(s['num:venti']).toEqual({ seen: 1, wrong: 0.5 });
  });

  it('タグを複数持つ問題は全タグに反映する', () => {
    const s = applyGrade({}, ['a', 'b', 'c'], 'again');
    expect(Object.keys(s)).toEqual(['a', 'b', 'c']);
  });

  it('元のオブジェクトを壊さない', () => {
    const before = { a: { seen: 1, wrong: 0 } };
    const after = applyGrade(before, ['a'], 'again');
    expect(before.a).toEqual({ seen: 1, wrong: 0 });
    expect(after.a).toEqual({ seen: 2, wrong: 1 });
  });

  it('積み重ねても浮動小数の誤差が出ない', () => {
    let s = {};
    for (let i = 0; i < 10; i++) s = applyGrade(s, ['a'], 'hard');
    expect(s.a).toEqual({ seen: 10, wrong: 5 });
  });
});

describe('rollDailyProgress', () => {
  const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const longAgo = '2000-01-01';

  it('同じ日なら何もしない', () => {
    const p = { ...DEFAULT_PROGRESS, day: todayKey(), todayCount: 7, streak: 3 };
    expect(rollDailyProgress(p)).toBe(p);
  });

  it('昨日から続いていれば連続日数を保つ', () => {
    const p = { ...DEFAULT_PROGRESS, day: yesterday, todayCount: 20, streak: 3 };
    const next = rollDailyProgress(p);
    expect(next.streak).toBe(3);
    expect(next.todayCount).toBe(0);
    expect(next.day).toBe(todayKey());
  });

  it('日が飛んでいたら連続日数をリセットする', () => {
    const p = { ...DEFAULT_PROGRESS, day: longAgo, todayCount: 20, streak: 9 };
    expect(rollDailyProgress(p).streak).toBe(0);
  });

  it('初回起動でも壊れない', () => {
    const next = rollDailyProgress(DEFAULT_PROGRESS);
    expect(next.streak).toBe(0);
    expect(next.day).toBe(todayKey());
  });
});

describe('todayKey', () => {
  it('YYYY-MM-DD 形式でゼロ埋めする', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('applyResult', () => {
  const fresh = { ...DEFAULT_PROGRESS, day: todayKey() };

  it('正解で今日と通算の両方が増える', () => {
    const p = applyResult(fresh, true);
    expect(p.todayCount).toBe(1);
    expect(p.todayCorrect).toBe(1);
    expect(p.total).toBe(1);
    expect(p.correct).toBe(1);
  });

  it('不正解では正解数だけ増えない', () => {
    const p = applyResult(fresh, false);
    expect(p.todayCount).toBe(1);
    expect(p.todayCorrect).toBe(0);
    expect(p.total).toBe(1);
    expect(p.correct).toBe(0);
  });

  it('連続正解が積み上がる', () => {
    let p = fresh;
    for (let i = 0; i < 5; i++) p = applyResult(p, true);
    expect(p.combo).toBe(5);
    expect(p.bestCombo).toBe(5);
  });

  it('間違えると連続正解が切れるが、最高記録は残る', () => {
    let p = fresh;
    for (let i = 0; i < 7; i++) p = applyResult(p, true);
    p = applyResult(p, false);
    expect(p.combo).toBe(0);
    expect(p.bestCombo).toBe(7);

    for (let i = 0; i < 3; i++) p = applyResult(p, true);
    expect(p.combo).toBe(3);
    expect(p.bestCombo).toBe(7); // 更新されない
  });

  it('元のオブジェクトを壊さない', () => {
    const before = { ...fresh };
    applyResult(before, true);
    expect(before).toEqual(fresh);
  });

  it('その日の1問目で連続日数が伸びる', () => {
    const p = applyResult(fresh, true);
    expect(p.streak).toBe(1);
    expect(applyResult(p, true).streak).toBe(1); // 2問目では伸びない
  });
});

describe('日をまたぐとき', () => {
  it('今日の集計はリセットされ、通算と連続正解は残る', () => {
    const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    let p = { ...DEFAULT_PROGRESS, day: yesterday };
    for (let i = 0; i < 4; i++) p = applyResult(p, true);
    expect(p.todayCorrect).toBe(4);

    const rolled = rollDailyProgress(p);
    expect(rolled.todayCount).toBe(0);
    expect(rolled.todayCorrect).toBe(0);
    expect(rolled.total).toBe(4);
    expect(rolled.correct).toBe(4);
    // 正解が続いている限りの数なので、日付では切らない
    expect(rolled.combo).toBe(4);
    expect(rolled.bestCombo).toBe(4);
  });
});

describe('accuracyOf', () => {
  it('割合を四捨五入して返す', () => {
    expect(accuracyOf(17, 20)).toBe(85);
    expect(accuracyOf(1, 3)).toBe(33);
    expect(accuracyOf(20, 20)).toBe(100);
    expect(accuracyOf(0, 5)).toBe(0);
  });

  it('1問も答えていなければ null', () => {
    expect(accuracyOf(0, 0)).toBeNull();
  });
});
