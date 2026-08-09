import { describe, it, expect } from 'vitest';
import { TOPICS, TOPIC_IDS, topicById, topicSize } from './vocabulary.js';
import {
  generateItem,
  describeTag,
  isAggregateTag,
  tagGroup,
  CATEGORIES,
} from './generator.js';
import { CHOICE_COUNT } from './choices.js';
import { DEFAULT_SETTINGS } from './storage.js';

function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const wordsOnly = (over = {}) => ({
  ...DEFAULT_SETTINGS,
  ...over,
  categories: Object.fromEntries(
    CATEGORIES.map((c) => [c.id, c.id === 'words']),
  ),
});

describe('語彙データ', () => {
  it('話題の id が重複しない', () => {
    expect(new Set(TOPIC_IDS).size).toBe(TOPIC_IDS.length);
  });

  it.each(TOPICS.map((t) => [t.id, t]))('%s: 各項目が埋まっている', (_id, topic) => {
    expect(topic.ja).toBeTruthy();
    expect(topic.hint).toBeTruthy();
    for (const entry of topic.entries) {
      expect(entry.it.trim()).toBe(entry.it);
      expect(entry.ja.trim()).toBe(entry.ja);
      expect(entry.it.length).toBeGreaterThan(0);
      expect(entry.ja.length).toBeGreaterThan(0);
      if ('note' in entry) expect(entry.note.length).toBeGreaterThan(0);
    }
  });

  it.each(TOPICS.map((t) => [t.id, t]))(
    '%s: 同じ話題の中でイタリア語が重複しない',
    (_id, topic) => {
      // 重複があると、誤答として正解と同じ文字列が選択肢に並んでしまう
      const words = topic.entries.map((e) => e.it);
      expect(new Set(words).size).toBe(words.length);
    },
  );

  it.each(TOPICS.map((t) => [t.id, t]))(
    '%s: 同じ話題の中で日本語が重複しない',
    (_id, topic) => {
      // per favore / per piacere のように訳が同じものは、逆向きで
      // 選択肢が割れないので、訳し分けるか片方を落とす
      const glosses = topic.entries.map((e) => e.ja);
      const duplicates = glosses.filter((g, i) => glosses.indexOf(g) !== i);
      expect(duplicates).toEqual([]);
    },
  );

  it.each(TOPICS.map((t) => [t.id, t]))(
    '%s: イタリア語にカタカナや漢字が混ざっていない',
    (_id, topic) => {
      for (const entry of topic.entries) {
        expect(entry.it).toMatch(/^[a-zàèéìòùA-ZÀÈÉÌÒÙ' !?]+$/);
      }
    },
  );

  it.each(TOPICS.map((t) => [t.id, topicSize(t.id)]))(
    '%s: 選択肢を作れるだけの数がある',
    (_id, size) => {
      expect(size).toBeGreaterThanOrEqual(CHOICE_COUNT);
    },
  );

  it('topicById は未知の id で null を返す', () => {
    expect(topicById('nope')).toBeNull();
    expect(topicSize('nope')).toBe(0);
  });
});

describe('単語の出題', () => {
  it('有効にした話題からしか出さない', () => {
    const rng = seeded(3);
    for (const id of TOPIC_IDS) {
      const settings = wordsOnly({
        topics: Object.fromEntries(TOPIC_IDS.map((t) => [t, t === id])),
      });
      for (let i = 0; i < 120; i++) {
        const item = generateItem(settings, {}, { rng });
        expect(item.category).toBe('words');
        expect(item.source.topic).toBe(id);
      }
    }
  });

  it('話題が全部オフでも壊れない', () => {
    const rng = seeded(4);
    const settings = wordsOnly({
      topics: Object.fromEntries(TOPIC_IDS.map((t) => [t, false])),
    });
    const item = generateItem(settings, {}, { rng });
    expect(TOPIC_IDS).toContain(item.source.topic);
  });

  it('問題文と答えが語彙データと一致する', () => {
    const rng = seeded(5);
    const settings = wordsOnly();
    for (let i = 0; i < 400; i++) {
      const item = generateItem(settings, {}, { rng });
      const entry = topicById(item.source.topic).entries[item.source.index];
      expect(item.speech).toBe(entry.it);
      if (item.reverse) {
        expect(item.prompt).toBe(entry.it);
        expect(item.answer).toBe(entry.ja);
      } else {
        expect(item.prompt).toBe(entry.ja);
        expect(item.answer).toBe(entry.it);
      }
    }
  });

  it('話題ごとと単語ごとの両方のタグを持つ', () => {
    const rng = seeded(6);
    const settings = wordsOnly();
    for (let i = 0; i < 200; i++) {
      const item = generateItem(settings, {}, { rng });
      expect(item.tags).toContain(`word:${item.source.topic}`);
      expect(item.tags).toContain(
        `word:${item.source.topic}:${item.source.index}`,
      );
    }
  });
});

describe('単語の選択肢', () => {
  it('誤答が必ず同じ話題の中から採られる', () => {
    const rng = seeded(7);
    const settings = wordsOnly();
    for (let i = 0; i < 400; i++) {
      const item = generateItem(settings, {}, { rng });
      const pool = topicById(item.source.topic).entries.map((e) =>
        item.reverse ? e.ja : e.it,
      );
      for (const choice of item.choices) {
        expect(pool).toContain(choice);
      }
    }
  });

  it('選択肢が4つそろい、正解がちょうど1つ', () => {
    const rng = seeded(8);
    const settings = wordsOnly();
    for (let i = 0; i < 400; i++) {
      const item = generateItem(settings, {}, { rng });
      expect(item.choices).toHaveLength(CHOICE_COUNT);
      expect(item.choices.filter((c) => c === item.answer)).toHaveLength(1);
      expect(new Set(item.choices).size).toBe(CHOICE_COUNT);
    }
  });

  it('同じ問題でも毎回同じ並びにならない', () => {
    const rng = seeded(9);
    const settings = wordsOnly({
      topics: Object.fromEntries(TOPIC_IDS.map((t) => [t, t === 'calcio'])),
    });
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const item = generateItem(settings, {}, { rng });
      seen.add(item.choices.join('|'));
    }
    expect(seen.size).toBeGreaterThan(50);
  });
});

describe('成績表示のラベル', () => {
  it('単語ごとのタグはその単語を表示する', () => {
    // word:saluti:3 のように区切りが3つあるタグで、添字を落として
    // 「あいさつぜんぶ」に潰れてしまう不具合があった
    for (const topic of TOPICS) {
      topic.entries.forEach((entry, index) => {
        expect(describeTag(`word:${topic.id}:${index}`)).toBe(entry.it);
      });
    }
  });

  it('話題ぜんぶのタグだけが集計扱いになる', () => {
    for (const topic of TOPICS) {
      expect(isAggregateTag(`word:${topic.id}`)).toBe(true);
      expect(describeTag(`word:${topic.id}`)).toBe(`${topic.ja}ぜんぶ`);
      topic.entries.forEach((_, index) => {
        expect(isAggregateTag(`word:${topic.id}:${index}`)).toBe(false);
      });
    }
    expect(isAggregateTag('num:mille')).toBe(false);
    expect(isAggregateTag('time:meno')).toBe(false);
  });

  it('同じ話題の単語は同じ見出しにまとまる', () => {
    for (const topic of TOPICS) {
      const heading = `単語 · ${topic.ja}`;
      expect(tagGroup(`word:${topic.id}`)).toBe(heading);
      topic.entries.forEach((_, index) => {
        expect(tagGroup(`word:${topic.id}:${index}`)).toBe(heading);
      });
    }
  });

  it('話題が違えば見出しも違う', () => {
    const headings = TOPICS.map((t) => tagGroup(`word:${t.id}:0`));
    expect(new Set(headings).size).toBe(TOPICS.length);
  });

  it('実際に出題したタグがすべて意味のあるラベルになる', () => {
    const rng = seeded(11);
    const settings = wordsOnly();
    for (let i = 0; i < 300; i++) {
      const item = generateItem(settings, {}, { rng });
      for (const tag of item.tags) {
        const label = describeTag(tag);
        expect(label).toBeTruthy();
        expect(label).not.toBe(tag); // 生のタグがそのまま出ていない
      }
    }
  });
});
