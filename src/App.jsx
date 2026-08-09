import { useCallback, useEffect, useMemo, useState } from 'react';
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
  loadProgress,
  saveProgress,
  rollDailyProgress,
  applyGrade,
} from './lib/storage.js';
import { initSpeech, stopSpeaking } from './lib/speech.js';

/** 間違えた問題を何問あとに出し直すか */
const REQUEUE_DELAY = { again: 3, hard: 9 };

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [stats, setStats] = useState(loadStats);
  const [progress, setProgress] = useState(() =>
    rollDailyProgress(loadProgress()),
  );
  const [screen, setScreen] = useState('home');
  const [session, setSession] = useState(null);

  useEffect(() => initSpeech(), []);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveStats(stats), [stats]);
  useEffect(() => saveProgress(progress), [progress]);

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
      setSession((s) => {
        if (!s || s.finished) return s;

        const nextStats = applyGrade(stats, s.item.tags, value);
        setStats(nextStats);

        setProgress((p) => ({
          ...p,
          todayCount: p.todayCount + 1,
          total: p.total + 1,
          correct: p.correct + (value === 'good' ? 1 : 0),
          // その日の1問目を答えた時点で連続日数を伸ばす
          streak: p.todayCount === 0 ? p.streak + 1 : p.streak,
        }));

        const done = s.done + 1;
        const queue =
          value === 'good'
            ? s.queue
            : [...s.queue, { item: s.item, dueAt: done + REQUEUE_DELAY[value] }];

        if (done >= s.target) {
          return {
            ...s,
            done,
            good: s.good + (value === 'good' ? 1 : 0),
            queue,
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
          revealed: false,
          input: '',
          checked: null,
          picked: null,
        };
      });
    },
    [nextItem, stats],
  );

  const setInput = useCallback((value) => {
    setSession((s) => (s ? { ...s, input: value } : s));
  }, []);

  const check = useCallback((isCorrect, picked = null) => {
    setSession((s) =>
      s ? { ...s, revealed: true, checked: isCorrect, picked } : s,
    );
  }, []);

  const quit = useCallback(() => {
    stopSpeaking();
    setSession(null);
    setScreen('home');
  }, []);

  const accuracy = useMemo(
    () => (progress.total ? Math.round((progress.correct / progress.total) * 100) : null),
    [progress],
  );

  if (screen === 'drill' && session) {
    return (
      <DrillScreen
        session={session}
        settings={settings}
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
        progress={progress}
        accuracy={accuracy}
        onBack={() => setScreen('home')}
        onReset={() => setStats({})}
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
      accuracy={accuracy}
      onStart={startSession}
      onOpenStats={() => setScreen('stats')}
      onOpenSettings={() => setScreen('settings')}
    />
  );
}
