import { useCallback, useEffect, useRef, useState } from 'react';
import HomeScreen from './screens/HomeScreen.jsx';
import DrillScreen from './screens/DrillScreen.jsx';
import StatsScreen from './screens/StatsScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import { generateItem } from './lib/generator.js';
import {
  loadSettings,
  saveSettings,
  loadStats,
  saveStats,
  loadErrors,
  saveErrors,
  loadProgress,
  saveProgress,
  rollDailyProgress,
  applyGrade,
  applyErrorType,
  applyResult,
} from './lib/storage.js';
import { errorTypeOf } from './lib/errorTypes.js';
import { initSpeech, stopSpeaking } from './lib/speech.js';

/** 間違えた問題を何問あとに出し直すか */
const REQUEUE_DELAY = { again: 3, hard: 9 };

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [stats, setStats] = useState(loadStats);
  const [errors, setErrors] = useState(loadErrors);
  const [progress, setProgress] = useState(() =>
    rollDailyProgress(loadProgress()),
  );
  const [screen, setScreen] = useState('home');
  const [session, setSession] = useState(null);

  // 答え合わせの時点で出ている問題。setSession の更新関数の中から
  // 別の state を触ると（StrictMode で二重に呼ばれて）数え過ぎるので、
  // 間違いの型は更新関数の外で数える。
  const itemRef = useRef(null);

  useEffect(() => initSpeech(), []);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveStats(stats), [stats]);
  useEffect(() => saveErrors(errors), [errors]);
  useEffect(() => saveProgress(progress), [progress]);

  useEffect(() => {
    itemRef.current = session?.item ?? null;
  }, [session?.item]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  // ソフトキーボードが出ると表示領域が縮む。dvh はこれに追随しない。
  //
  // さらに iOS Safari は、キーボードを出すときにレイアウト側を勝手に
  // スクロールさせる。高さを合わせるだけでは画面がずれたままになるので、
  // 実際に見えている領域（visualViewport）に本体を貼りつける:
  //   height = visualViewport.height
  //   translateY = visualViewport.offsetTop（ずらされた分を戻す）
  // 画面本体は position: fixed にしてあるので、これで常に見えている範囲に収まる。
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;

    if (!viewport) {
      // 未対応のブラウザは CSS の 100dvh にまかせる
      return undefined;
    }

    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--app-height', `${viewport.height}px`);
        root.style.setProperty('--app-offset', `${viewport.offsetTop}px`);
        // ずらされたレイアウト側を戻す。これをしないと、キーボードを
        // 閉じたあとに上部が隠れたままになることがある。
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };

    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
    };
  }, []);

  const nextItem = useCallback(
    (currentStats, queue, done, recent) => {
      const dueIndex = queue.findIndex((entry) => entry.dueAt <= done);
      if (dueIndex >= 0) {
        const rest = queue.slice();
        const [entry] = rest.splice(dueIndex, 1);
        return { item: entry.item, queue: rest };
      }
      return {
        item: generateItem(settings, currentStats, { recentKeys: recent }),
        queue,
      };
    },
    [settings],
  );

  const startSession = useCallback(() => {
    const { item } = nextItem(stats, [], 0, []);
    setSession({
      target: settings.sessionLength,
      done: 0,
      good: 0,
      item,
      revealed: false,
      queue: [],
      recent: [item.key],
      input: '',
      checked: null,
      picked: null,
      bestCombo: 0, // このセット内でいちばん続いた正解数
      finished: false,
    });
    setScreen('drill');
  }, [nextItem, settings.sessionLength, stats]);

  const reveal = useCallback(() => {
    setSession((s) => (s && !s.revealed ? { ...s, revealed: true } : s));
  }, []);

  const grade = useCallback(
    (value) => {
      stopSpeaking();

      // 進捗は先に確定させる。セット内の最長連続を出すのに新しい値が要るのと、
      // 日付をまたいだ場合もここで繰り越すため。
      const isCorrect = value === 'good';
      const nextProgress = applyResult(rollDailyProgress(progress), isCorrect);
      setProgress(nextProgress);

      setSession((s) => {
        if (!s || s.finished) return s;

        const nextStats = applyGrade(stats, s.item.tags, value);
        setStats(nextStats);

        const done = s.done + 1;
        const queue =
          value === 'good'
            ? s.queue
            : [...s.queue, { item: s.item, dueAt: done + REQUEUE_DELAY[value] }];

        const bestCombo = Math.max(s.bestCombo, nextProgress.combo);

        if (done >= s.target) {
          return {
            ...s,
            done,
            good: s.good + (value === 'good' ? 1 : 0),
            queue,
            bestCombo,
            finished: true,
          };
        }

        const recent = [...s.recent, s.item.key].slice(-4);
        const picked = nextItem(nextStats, queue, done, recent);

        return {
          ...s,
          done,
          good: s.good + (value === 'good' ? 1 : 0),
          item: picked.item,
          queue: picked.queue,
          recent: [...recent, picked.item.key].slice(-4),
          bestCombo,
          revealed: false,
          input: '',
          checked: null,
          picked: null,
        };
      });
    },
    [nextItem, progress, stats],
  );

  const setInput = useCallback((value) => {
    setSession((s) => (s ? { ...s, input: value } : s));
  }, []);

  const check = useCallback((isCorrect, picked = null) => {
    if (!isCorrect) {
      // 選んだ誤答から「どの規則を外したか」を割り出して数える。
      // 打ち間違いのように型が分からないものは applyErrorType が捨てる。
      const type = errorTypeOf(itemRef.current, picked);
      if (type) setErrors((e) => applyErrorType(e, type));
    }
    setSession((s) =>
      s ? { ...s, revealed: true, checked: isCorrect, picked } : s,
    );
  }, []);

  const quit = useCallback(() => {
    stopSpeaking();
    setSession(null);
    setScreen('home');
  }, []);

  if (screen === 'drill' && session) {
    return (
      <DrillScreen
        session={session}
        settings={settings}
        progress={progress}
        onReveal={reveal}
        onGrade={grade}
        onInput={setInput}
        onCheck={check}
        onQuit={quit}
        onAgain={startSession}
      />
    );
  }

  if (screen === 'stats') {
    return (
      <StatsScreen
        stats={stats}
        errors={errors}
        progress={progress}
        onBack={() => setScreen('home')}
        onReset={() => {
          setStats({});
          setErrors({});
        }}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        settings={settings}
        onChange={setSettings}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <HomeScreen
      settings={settings}
      progress={progress}
      onStart={startSession}
      onOpenStats={() => setScreen('stats')}
      onOpenSettings={() => setScreen('settings')}
    />
  );
}
