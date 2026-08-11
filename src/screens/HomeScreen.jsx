import { CATEGORIES, NUMBER_RANGES } from '../lib/generator.js';
import { TOPICS } from '../lib/vocabulary.js';
import { accuracyOf } from '../lib/storage.js';

export default function HomeScreen({
  settings,
  progress,
  onStart,
  onOpenStats,
  onOpenSettings,
}) {
  const enabled = CATEGORIES.filter((c) => settings.categories[c.id]);
  const range = NUMBER_RANGES.find((r) => r.id === settings.numberRange);
  const topics = TOPICS.filter((t) => settings.topics?.[t.id]);
  const todayAccuracy = accuracyOf(progress.todayCorrect, progress.todayCount);
  const overallAccuracy = accuracyOf(progress.correct, progress.total);

  const chipLabel = (c) => {
    if (c.id === 'numbers' && range) return `${c.ja} ${range.ja}`;
    if (c.id === 'words' && topics.length) {
      return `${c.ja}（${topics.map((t) => t.ja).join('・')}）`;
    }
    return c.ja;
  };

  return (
    <div className="screen">
      <header className="home-header">
        <h1 className="logo">ascolto</h1>
        <p className="tagline">数字・日付・時刻・曜日・月・単語を思い出して言う</p>
      </header>

      <div className="home-body">
        <div className="metrics">
          <Metric label="きょう" value={progress.todayCount} unit="問" />
          <Metric
            label="きょうの正答率"
            value={todayAccuracy === null ? '—' : todayAccuracy}
            unit={todayAccuracy === null ? '' : '%'}
          />
          <Metric label="連続" value={progress.streak} unit="日" />
        </div>

        {progress.bestCombo > 0 && (
          <p className="note">
            連続正解 <strong>{progress.combo}問</strong>
            <span className="note-sep">最高 {progress.bestCombo}問</span>
            <span className="note-sep">通算 {overallAccuracy}%</span>
          </p>
        )}

        <div className="chips">
          {enabled.map((c) => (
            <span className="chip" key={c.id}>
              {chipLabel(c)}
            </span>
          ))}
          {enabled.length === 0 && (
            <span className="chip chip-warn">カテゴリが全部オフです</span>
          )}
        </div>

        <p className="note">{modeNote(settings.answerMode)}</p>
      </div>

      <div className="actions">
        <button className="btn btn-primary btn-tall" onClick={onStart}>
          はじめる
          <span className="btn-sub">{settings.sessionLength}問</span>
        </button>
        <div className="actions-row">
          <button className="btn btn-ghost" onClick={onOpenStats}>
            成績
          </button>
          <button className="btn btn-ghost" onClick={onOpenSettings}>
            設定
          </button>
        </div>
      </div>
    </div>
  );
}

const MODE_NOTES = {
  choice:
    '選ぶ前に、まず自分で答えを作る。選択肢には「よくある間違い」が混ぜてあります。',
  reveal:
    '問題を見たら、まず声に出す（出せなければ頭の中で）。それから「めくる」で答え合わせ。',
  typing: '綴りを打って答え合わせ。アクセント記号は無くても正解になります。',
};

const modeNote = (mode) => MODE_NOTES[mode] ?? MODE_NOTES.reveal;

function Metric({ label, value, unit }) {
  return (
    <div className="metric">
      <div className="metric-value">
        {value}
        <span className="metric-unit">{unit}</span>
      </div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
