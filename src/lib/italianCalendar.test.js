import { describe, it, expect } from 'vitest';
import {
  WEEKDAYS,
  MONTHS,
  dayWord,
  dateArticle,
  dateToItalian,
  timeToItalian,
  timeTags,
  formatClock,
} from './italianCalendar.js';

describe('曜日と月の一覧', () => {
  it('曜日は日曜始まりの7つ（Date#getDay と同じ並び）', () => {
    expect(WEEKDAYS.map((w) => w.it)).toEqual([
      'domenica',
      'lunedì',
      'martedì',
      'mercoledì',
      'giovedì',
      'venerdì',
      'sabato',
    ]);
  });

  it('月は12個', () => {
    expect(MONTHS.map((m) => m.it)).toEqual([
      'gennaio',
      'febbraio',
      'marzo',
      'aprile',
      'maggio',
      'giugno',
      'luglio',
      'agosto',
      'settembre',
      'ottobre',
      'novembre',
      'dicembre',
    ]);
  });

  it('-dì で終わる曜日にアクセントが付いている', () => {
    expect(WEEKDAYS[1].it).toBe('lunedì');
    expect(WEEKDAYS[5].it).toBe('venerdì');
    expect(WEEKDAYS[6].it).toBe('sabato'); // 土日はアクセントなし
  });
});

describe('日にちの語', () => {
  it('1日だけ序数 primo', () => {
    expect(dayWord(1)).toBe('primo');
    expect(dayWord(2)).toBe('due');
    expect(dayWord(21)).toBe('ventuno');
    expect(dayWord(23)).toBe('ventitré');
    expect(dayWord(28)).toBe('ventotto');
    expect(dayWord(31)).toBe('trentuno');
  });
});

describe('定冠詞の縮約', () => {
  it('母音で始まる日の前では il が l’ になる', () => {
    expect(dateArticle(8)).toBe("l'"); // l'otto
    expect(dateArticle(11)).toBe("l'"); // l'undici
  });

  it('子音で始まる日の前は il のまま', () => {
    expect(dateArticle(1)).toBe('il '); // il primo
    expect(dateArticle(3)).toBe('il ');
    expect(dateArticle(18)).toBe('il '); // il diciotto
    expect(dateArticle(28)).toBe('il '); // il ventotto
  });
});

describe('日付', () => {
  it.each([
    [1, 1, 'il primo gennaio'],
    [3, 1, 'il primo marzo'],
    [3, 3, 'il tre marzo'],
    [3, 8, "l'otto marzo"],
    [5, 11, "l'undici maggio"],
    [8, 15, 'il quindici agosto'],
    [12, 23, 'il ventitré dicembre'],
    [12, 25, 'il venticinque dicembre'],
    [12, 31, 'il trentuno dicembre'],
  ])('%i月%i日 -> %s', (month, day, expected) => {
    expect(dateToItalian(month, day)).toBe(expected);
  });

  it('曜日を前置すると冠詞が消える', () => {
    expect(dateToItalian(3, 8, { weekday: 0 })).toBe('domenica otto marzo');
    expect(dateToItalian(3, 1, { weekday: 1 })).toBe('lunedì primo marzo');
  });

  it('年を後置できる', () => {
    expect(dateToItalian(4, 25, { year: 1945 })).toBe(
      'il venticinque aprile millenovecentoquarantacinque',
    );
    expect(dateToItalian(1, 1, { weekday: 4, year: 2026 })).toBe(
      'giovedì primo gennaio duemilaventisei',
    );
  });
});

describe('時刻（会話体）', () => {
  it.each([
    [0, 0, 'È mezzanotte'],
    [12, 0, 'È mezzogiorno'],
    [1, 0, "È l'una"],
    [13, 0, "È l'una"],
    [2, 0, 'Sono le due'],
    [15, 0, 'Sono le tre'],
    [20, 0, 'Sono le otto'],
    [23, 0, 'Sono le undici'],
  ])('%i:%i -> %s', (h, m, expected) => {
    expect(timeToItalian(h, m)).toBe(expected);
  });

  it.each([
    [3, 10, 'Sono le tre e dieci'],
    [3, 15, 'Sono le tre e un quarto'],
    [3, 20, 'Sono le tre e venti'],
    [3, 30, 'Sono le tre e mezza'],
    [1, 5, "È l'una e cinque"],
    [13, 30, "È l'una e mezza"],
    [8, 25, 'Sono le otto e venticinque'],
  ])('%i:%i -> %s', (h, m, expected) => {
    expect(timeToItalian(h, m)).toBe(expected);
  });

  it.each([
    [3, 45, 'Sono le quattro meno un quarto'],
    [3, 50, 'Sono le quattro meno dieci'],
    [3, 40, 'Sono le quattro meno venti'],
    [3, 35, 'Sono le quattro meno venticinque'],
    [12, 40, "È l'una meno venti"], // 12時台の次は1時
    [0, 50, "È l'una meno dieci"],
    [23, 45, 'Sono le dodici meno un quarto'],
    [19, 55, 'Sono le otto meno cinque'],
  ])('%i:%i -> %s', (h, m, expected) => {
    expect(timeToItalian(h, m)).toBe(expected);
  });

  it('24時間表記の午後も12時間制で読む', () => {
    expect(timeToItalian(14, 45)).toBe('Sono le tre meno un quarto');
    expect(timeToItalian(18, 30)).toBe('Sono le sei e mezza');
  });
});

describe('時刻（公式体・24時間制）', () => {
  it.each([
    [14, 45, 'Sono le quattordici e quarantacinque'],
    [20, 0, 'Sono le venti'],
    [21, 3, 'Sono le ventuno e tre'],
    [23, 58, 'Sono le ventitré e cinquantotto'],
    [1, 20, "È l'una e venti"],
    [16, 8, 'Sono le sedici e otto'],
  ])('%i:%i -> %s', (h, m, expected) => {
    expect(timeToItalian(h, m, { official: true })).toBe(expected);
  });
});

describe('時刻の全域チェック', () => {
  it('0:00〜23:59 のどれでも文字列を返し、数字が混ざらない', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const conv = timeToItalian(h, m);
        const off = timeToItalian(h, m, { official: true });
        expect(conv).toMatch(/^[A-Za-zàéèìòùÀÉÈÌÒÙ' ]+$/);
        expect(off).toMatch(/^[A-Za-zàéèìòùÀÉÈÌÒÙ' ]+$/);
      }
    }
  });

  it('会話体では e と meno が同時に現れない', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const t = timeToItalian(h, m);
        expect(t.includes(' e ') && t.includes(' meno ')).toBe(false);
      }
    }
  });
});

describe('時刻のタグ', () => {
  it('meno / e / 15分 / 30分 を区別する', () => {
    expect(timeTags(3, 45)).toContain('time:meno');
    expect(timeTags(3, 45)).toContain('time:un-quarto');
    expect(timeTags(3, 15)).toContain('time:e');
    expect(timeTags(3, 15)).toContain('time:un-quarto');
    expect(timeTags(3, 30)).toContain('time:mezza');
    expect(timeTags(5, 0)).toContain('time:in-punto');
  });

  it('1時になる場合に una タグが付く', () => {
    expect(timeTags(1, 20)).toContain('time:una');
    expect(timeTags(12, 40)).toContain('time:una'); // 「1時20分前」
    expect(timeTags(3, 20)).not.toContain('time:una');
  });
});

describe('formatClock', () => {
  it('ゼロ埋めする', () => {
    expect(formatClock(9, 5)).toBe('09:05');
    expect(formatClock(14, 45)).toBe('14:45');
    expect(formatClock(0, 0)).toBe('00:00');
  });
});
