import { describe, it, expect } from 'vitest';
import {
  toItalian,
  normalize,
  matches,
  featureTags,
} from './italianNumbers.js';

/** 表を [数, 綴り] の配列として it.each に渡すためのヘルパ */
const table = (pairs) => pairs.map(([n, word]) => ({ n, word }));

describe('0〜19 は個別の語', () => {
  it.each(
    table([
      [0, 'zero'],
      [1, 'uno'],
      [2, 'due'],
      [3, 'tre'],
      [4, 'quattro'],
      [5, 'cinque'],
      [6, 'sei'],
      [7, 'sette'],
      [8, 'otto'],
      [9, 'nove'],
      [10, 'dieci'],
      [11, 'undici'],
      [12, 'dodici'],
      [13, 'tredici'],
      [14, 'quattordici'],
      [15, 'quindici'],
      [16, 'sedici'],
      [17, 'diciassette'],
      [18, 'diciotto'],
      [19, 'diciannove'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });
});

describe('十の位ちょうど', () => {
  it.each(
    table([
      [20, 'venti'],
      [30, 'trenta'],
      [40, 'quaranta'],
      [50, 'cinquanta'],
      [60, 'sessanta'],
      [70, 'settanta'],
      [80, 'ottanta'],
      [90, 'novanta'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });
});

describe('一の位が 1 のとき十の位の語末母音が落ちる', () => {
  it.each(
    table([
      [21, 'ventuno'],
      [31, 'trentuno'],
      [41, 'quarantuno'],
      [51, 'cinquantuno'],
      [61, 'sessantuno'],
      [71, 'settantuno'],
      [81, 'ottantuno'],
      [91, 'novantuno'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });
});

describe('一の位が 8 のとき十の位の語末母音が落ちる', () => {
  it.each(
    table([
      [28, 'ventotto'],
      [38, 'trentotto'],
      [48, 'quarantotto'],
      [58, 'cinquantotto'],
      [68, 'sessantotto'],
      [78, 'settantotto'],
      [88, 'ottantotto'],
      [98, 'novantotto'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });
});

describe('一の位が 1 でも 8 でもないときは母音を落とさない', () => {
  it.each(
    table([
      [22, 'ventidue'],
      [24, 'ventiquattro'],
      [25, 'venticinque'],
      [26, 'ventisei'],
      [27, 'ventisette'],
      [29, 'ventinove'],
      [42, 'quarantadue'],
      [55, 'cinquantacinque'],
      [67, 'sessantasette'],
      [99, 'novantanove'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });
});

describe('末尾の tre はアクセント付き tré', () => {
  it.each(
    table([
      [23, 'ventitré'],
      [33, 'trentatré'],
      [43, 'quarantatré'],
      [53, 'cinquantatré'],
      [63, 'sessantatré'],
      [73, 'settantatré'],
      [83, 'ottantatré'],
      [93, 'novantatré'],
      [103, 'centotré'],
      [123, 'centoventitré'],
      [1003, 'milletré'],
      [2023, 'duemilaventitré'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });

  it('単独の 3 はアクセントを取らない', () => {
    expect(toItalian(3)).toBe('tre');
  });

  it('13 は tredici（末尾が tre ではないので無関係）', () => {
    expect(toItalian(13)).toBe('tredici');
  });

  it('3000 は tremila（tre は末尾ではない）', () => {
    expect(toItalian(3000)).toBe('tremila');
  });

  it('300 は trecento（tre は末尾ではない）', () => {
    expect(toItalian(300)).toBe('trecento');
  });
});

describe('百の位: 1 のときは倍数語をつけない', () => {
  it.each(
    table([
      [100, 'cento'],
      [200, 'duecento'],
      [300, 'trecento'],
      [400, 'quattrocento'],
      [500, 'cinquecento'],
      [600, 'seicento'],
      [700, 'settecento'],
      [800, 'ottocento'],
      [900, 'novecento'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });

  it('unocento にはならない', () => {
    expect(toItalian(100)).not.toContain('uno');
  });
});

describe('続く語が o で始まるとき cento の語末 o が落ちる', () => {
  it.each(
    table([
      [108, 'centotto'],
      [180, 'centottanta'],
      [181, 'centottantuno'],
      [183, 'centottantatré'],
      [188, 'centottantotto'],
      [189, 'centottantanove'],
      [208, 'duecentotto'],
      [280, 'duecentottanta'],
      [888, 'ottocentottantotto'],
      [980, 'novecentottanta'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });

  it('o で始まらない語の前では落とさない', () => {
    expect(toItalian(101)).toBe('centouno');
    expect(toItalian(111)).toBe('centoundici');
    expect(toItalian(118)).toBe('centodiciotto');
    expect(toItalian(102)).toBe('centodue');
  });
});

describe('百の位と十の位の組み合わせ', () => {
  it.each(
    table([
      [101, 'centouno'],
      [110, 'centodieci'],
      [115, 'centoquindici'],
      [121, 'centoventuno'],
      [133, 'centotrentatré'],
      [199, 'centonovantanove'],
      [220, 'duecentoventi'],
      [345, 'trecentoquarantacinque'],
      [617, 'seicentodiciassette'],
      [721, 'settecentoventuno'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });
});

describe('千の位: 1 は mille、2以上は 〜mila', () => {
  it.each(
    table([
      [1000, 'mille'],
      [2000, 'duemila'],
      [3000, 'tremila'],
      [4000, 'quattromila'],
      [5000, 'cinquemila'],
      [6000, 'seimila'],
      [7000, 'settemila'],
      [8000, 'ottomila'],
      [9000, 'novemila'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });

  it('unomila にはならない', () => {
    expect(toItalian(1000)).toBe('mille');
  });
});

describe('4桁の合成', () => {
  it.each(
    table([
      [1001, 'milleuno'],
      [1008, 'milleotto'],
      [1080, 'milleottanta'],
      [1100, 'millecento'],
      [1108, 'millecentotto'],
      [1180, 'millecentottanta'],
      [1492, 'millequattrocentonovantadue'],
      [1800, 'milleottocento'],
      [1888, 'milleottocentottantotto'],
      [1900, 'millenovecento'],
      [1999, 'millenovecentonovantanove'],
      [2001, 'duemilauno'],
      [2008, 'duemilaotto'],
      [2024, 'duemilaventiquattro'],
      [2026, 'duemilaventisei'],
      [2800, 'duemilaottocento'],
      [8888, 'ottomilaottocentottantotto'],
      [9999, 'novemilanovecentonovantanove'],
    ]),
  )('$n -> $word', ({ n, word }) => {
    expect(toItalian(n)).toBe(word);
  });
});

describe('分かち書きしない', () => {
  it('0〜9999 のどれにも空白・ハイフンが入らない', () => {
    for (let n = 0; n <= 9999; n++) {
      expect(toItalian(n)).not.toMatch(/[\s-]/);
    }
  });

  it('使う文字はイタリア語の綴りに現れるものだけ', () => {
    for (let n = 0; n <= 9999; n++) {
      expect(toItalian(n)).toMatch(/^[a-zé]+$/);
    }
  });
});

describe('全域の健全性', () => {
  it('0〜9999 すべてで例外なく文字列を返す', () => {
    for (let n = 0; n <= 9999; n++) {
      const w = toItalian(n);
      expect(typeof w).toBe('string');
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('異なる数は異なる綴りになる（1万通りすべて一意）', () => {
    const seen = new Map();
    for (let n = 0; n <= 9999; n++) {
      const w = toItalian(n);
      expect(seen.has(w)).toBe(false);
      seen.set(w, n);
    }
    expect(seen.size).toBe(10000);
  });

  it('母音の連続 oo は現れない（cento の脱落漏れ検出）', () => {
    for (let n = 0; n <= 9999; n++) {
      expect(toItalian(n)).not.toContain('oo');
    }
  });

  it('venti/trenta… の直後に uno や otto がそのまま続かない', () => {
    for (let n = 0; n <= 9999; n++) {
      const w = toItalian(n);
      expect(w).not.toMatch(/(venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta)(uno|otto)/);
    }
  });

  it('アクセント付き é は語末の tré にしか現れない', () => {
    for (let n = 0; n <= 9999; n++) {
      const w = toItalian(n);
      if (w.includes('é')) {
        expect(w.endsWith('tré')).toBe(true);
        expect(w.split('é').length - 1).toBe(1);
      }
    }
  });
});

describe('入力の検証', () => {
  it('範囲外は RangeError', () => {
    expect(() => toItalian(-1)).toThrow(RangeError);
    expect(() => toItalian(10000)).toThrow(RangeError);
  });

  it('整数以外は TypeError', () => {
    expect(() => toItalian(1.5)).toThrow(TypeError);
    expect(() => toItalian('12')).toThrow(TypeError);
    expect(() => toItalian(NaN)).toThrow(TypeError);
    expect(() => toItalian(null)).toThrow(TypeError);
  });
});

describe('normalize / matches', () => {
  it('アクセントと大文字小文字を無視する', () => {
    expect(normalize('Ventitré')).toBe('ventitre');
    expect(matches('ventitre', 'ventitré')).toBe(true);
    expect(matches('VENTITRÉ', toItalian(23))).toBe(true);
  });

  it('時計表記のコロンを無視する（1445 でも 14:45 でも通す）', () => {
    expect(matches('1445', '14:45')).toBe(true);
    expect(matches('14:45', '14:45')).toBe(true);
    expect(matches('0905', '09:05')).toBe(true);
    expect(matches('1345', '14:45')).toBe(false);
  });

  it('前後の空白とアポストロフィを無視する', () => {
    expect(matches('  centotto  ', 'centotto')).toBe(true);
    expect(matches("Sono le 3 e mezza", 'sono le 3 e mezza')).toBe(true);
    expect(matches("è l'una", 'È l’una')).toBe(true);
  });

  it('綴りを間違えていれば一致しない', () => {
    // 母音脱落の失敗はそのまま不正解にする（空白除去で救わない）
    expect(matches('ventiuno', 'ventuno')).toBe(false);
    expect(matches('cento otto', 'centotto')).toBe(false);
    expect(matches('centoottanta', 'centottanta')).toBe(false);
    expect(matches('unocento', 'cento')).toBe(false);
  });
});

describe('featureTags', () => {
  it('母音脱落を検出する', () => {
    expect(featureTags(21)).toContain('num:elisione-uno');
    expect(featureTags(28)).toContain('num:elisione-otto');
    expect(featureTags(23)).toContain('num:tre-accento');
  });

  it('cento の脱落を検出する', () => {
    expect(featureTags(180)).toContain('num:cento-elisione');
    expect(featureTags(108)).toContain('num:cento-elisione');
    expect(featureTags(101)).not.toContain('num:cento-elisione');
  });

  it('mille と mila を区別する', () => {
    expect(featureTags(1500)).toContain('num:mille');
    expect(featureTags(2500)).toContain('num:mila');
  });

  it('必ず1つ以上のタグを返す', () => {
    for (let n = 0; n <= 9999; n++) {
      expect(featureTags(n).length).toBeGreaterThan(0);
    }
  });
});
