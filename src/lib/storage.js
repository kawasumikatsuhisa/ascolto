/**
 * localStorage への保存。
 * 電車内でタブが落ちても続きから再開できるように、設定・成績・進捗を
 * すべてローカルに置く。読み書きは常に例外を握りつぶして既定値に落とす
 * （プライベートブラウズなどで localStorage が使えないことがある）。
 */

const PREFIX = 'ascolto.v1.';

export const DEFAULT_SETTINGS = {
  categories: {
    numbers: true,
    time: true,
    date: true,
    weekday: true,
    month: true,
    words: true,
  },
  // 単語カテゴリで出す話題
  topics: {
    saluti: true,
    bar: true,
    treno: true,
    negozio: true,
    famiglia: true,
    calcio: true,
  },
  numberRange: 'r100',
  direction: 'both', // production | recognition | both
  officialTime: false,
  sessionLength: 20,
  autoSpeak: false, // 音を出せない場面が多いので既定はオフ
  speechRate: 0.85,
  // 回答方法: choice（選択式）/ reveal（めくって自己採点）/ typing（入力）
  answerMode: 'choice',
  theme: 'dark',
};

export const DEFAULT_PROGRESS = {
  day: null, // YYYY-MM-DD
  todayCount: 0,
  streak: 0,
  total: 0,
  correct: 0,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* 容量超過やプライベートモードでは黙って諦める */
  }
}

export const loadSettings = () => {
  const stored = read('settings', {});
  const settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    categories: { ...DEFAULT_SETTINGS.categories, ...(stored.categories ?? {}) },
    topics: { ...DEFAULT_SETTINGS.topics, ...(stored.topics ?? {}) },
  };

  // 旧版の typing フラグから answerMode へ移行する
  if (!stored.answerMode && 'typing' in stored) {
    settings.answerMode = stored.typing ? 'typing' : 'reveal';
  }
  delete settings.typing;

  return settings;
};
export const saveSettings = (v) => write('settings', v);

export const loadStats = () => read('stats', {});
export const saveStats = (v) => write('stats', v);

export const loadProgress = () => ({ ...DEFAULT_PROGRESS, ...read('progress', {}) });
export const saveProgress = (v) => write('progress', v);

export function clearAll() {
  try {
    for (const key of ['settings', 'stats', 'progress']) {
      localStorage.removeItem(PREFIX + key);
    }
  } catch {
    /* noop */
  }
}

/** 端末のローカル日付を YYYY-MM-DD で返す */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 昨日から続いていれば連続日数を伸ばし、飛んでいればリセットする */
export function rollDailyProgress(progress, today = todayKey()) {
  if (progress.day === today) return progress;

  const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const streak = progress.day === yesterday ? progress.streak : 0;
  return { ...progress, day: today, todayCount: 0, streak };
}

/**
 * 1問ぶんの結果を成績に反映する。
 * grade: 'again'（分からなかった）| 'hard'（あやふや）| 'good'（言えた）
 */
export function applyGrade(stats, tags, grade) {
  const next = { ...stats };
  const wrongDelta = grade === 'good' ? 0 : grade === 'hard' ? 0.5 : 1;
  for (const tag of tags) {
    const prev = next[tag] ?? { seen: 0, wrong: 0 };
    next[tag] = {
      seen: prev.seen + 1,
      wrong: Math.round((prev.wrong + wrongDelta) * 100) / 100,
    };
  }
  return next;
}
