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
    articles: true,
    verbs: true,
  },
  // 動詞をどこまで出すか（VERB_SCOPES の id）
  verbScope: 'presente',
  // 単語カテゴリで出す話題
  topics: {
    saluti: true,
    bar: true,
    treno: true,
    negozio: true,
    famiglia: true,
    tempo: true,
    salute: true,
    viaggio: true,
    lavoro: true,
    informatica: true,
    cultura: true,
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
  todayCorrect: 0,
  streak: 0, // 連続日数
  total: 0,
  correct: 0,
  combo: 0, // 連続正解（いま続いている数）
  todayBestCombo: 0, // きょうの最長連続
  bestCombo: 0, // 連続正解の最高記録（通算）
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

/** 間違いの型ごとの回数（'verb:ausiliare' -> 12） */
export const loadErrors = () => read('errors', {});
export const saveErrors = (v) => write('errors', v);

export const loadProgress = () => {
  const stored = read('progress', {});
  const progress = { ...DEFAULT_PROGRESS, ...stored };

  // 旧版には todayCorrect が無い。そのまま 0 にすると、その日の正答率が
  // 0% と表示されてしまうので、今日の集計だけ取り直す（通算はそのまま）。
  if (stored.todayCount > 0 && stored.todayCorrect === undefined) {
    progress.todayCount = 0;
    progress.todayCorrect = 0;
  }

  // 旧版には「きょうの最長連続」が無い。いま続いている数だけは確実に
  // 今日のものなので、それを下限として引き継ぐ（0 から数え直さない）。
  if (stored.todayBestCombo === undefined) {
    progress.todayBestCombo = progress.todayCount > 0 ? progress.combo : 0;
  }
  return progress;
};
export const saveProgress = (v) => write('progress', v);

export function clearAll() {
  try {
    for (const key of ['settings', 'stats', 'errors', 'progress']) {
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
  // 連続正解は日をまたいでも切らさない（正解が続いている限りの数なので）。
  // ただし「きょうの最長連続」は今日ぶんの記録なので数え直す。
  return {
    ...progress,
    day: today,
    todayCount: 0,
    todayCorrect: 0,
    todayBestCombo: 0,
    streak,
  };
}

/**
 * 1問ぶんの結果を進捗に反映する。
 * @param {object} progress
 * @param {boolean} isCorrect 「言えた」なら true
 */
export function applyResult(progress, isCorrect) {
  const combo = isCorrect ? progress.combo + 1 : 0;
  const todayCount = progress.todayCount + 1;
  // きょうの最長連続。連続正解は日をまたいでも切らさないので、そのまま
  // 使うと昨日ぶんまで数えてしまう。今日答えた数で頭を打たせる。
  const todayCombo = Math.min(combo, todayCount);
  return {
    ...progress,
    todayCount,
    todayCorrect: progress.todayCorrect + (isCorrect ? 1 : 0),
    total: progress.total + 1,
    correct: progress.correct + (isCorrect ? 1 : 0),
    combo,
    todayBestCombo: Math.max(progress.todayBestCombo, todayCombo),
    bestCombo: Math.max(progress.bestCombo, combo),
    // その日の1問目を答えた時点で連続日数を伸ばす
    streak: progress.todayCount === 0 ? progress.streak + 1 : progress.streak,
  };
}

/**
 * 間違いの型を1回ぶん数える。型が分からなければ（入力式の打ち間違いなど）
 * 何もしない。当てはまらないものを無理に数えると内訳が濁る。
 */
export function applyErrorType(errors, type) {
  if (!type) return errors;
  return { ...errors, [type]: (errors[type] ?? 0) + 1 };
}

/** 正答率（%）。1問も答えていなければ null。 */
export function accuracyOf(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : null;
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
