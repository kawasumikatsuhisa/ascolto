import { CATEGORIES, NUMBER_RANGES } from '../lib/generator.js';
import { hasItalianVoice, speak, speechSupported } from '../lib/speech.js';

const DIRECTIONS = [
  { id: 'production', ja: '日本語 → 伊', hint: '思い出して言う練習だけ' },
  { id: 'both', ja: '両方', hint: '産出を主、聞き取りを従' },
  { id: 'recognition', ja: '伊 → 日本語', hint: '意味を取る練習だけ' },
];

const LENGTHS = [10, 20, 30, 50];

const ANSWER_MODES = [
  {
    id: 'choice',
    ja: '選択式',
    hint: '4つから選ぶ。誤答はその規則のよくある間違い',
  },
  {
    id: 'reveal',
    ja: 'めくって自己採点',
    hint: '先に声に出してから答えを見る。産出の練習になる',
  },
  { id: 'typing', ja: '入力', hint: '綴りを打って答え合わせ（座れているとき向き）' },
];

export default function SettingsScreen({ settings, onChange, onBack }) {
  const set = (patch) => onChange({ ...settings, ...patch });
  const toggleCategory = (id) =>
    set({
      categories: { ...settings.categories, [id]: !settings.categories[id] },
    });

  return (
    <div className="screen">
      <header className="sub-header">
        <button className="link-btn" onClick={onBack}>
          ← 戻る
        </button>
        <h2>設定</h2>
      </header>

      <div className="scroll-body">
        <section className="field">
          <h3>出すもの</h3>
          <div className="toggle-grid">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`toggle ${settings.categories[c.id] ? 'on' : ''}`}
                onClick={() => toggleCategory(c.id)}
              >
                <span className="toggle-main">{c.ja}</span>
                <span className="toggle-sub">{c.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <h3>数字の範囲</h3>
          <div className="seg">
            {NUMBER_RANGES.map((r) => (
              <button
                key={r.id}
                className={`seg-btn ${settings.numberRange === r.id ? 'on' : ''}`}
                onClick={() => set({ numberRange: r.id })}
              >
                {r.ja}
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <h3>向き</h3>
          <div className="seg seg-col">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                className={`seg-btn ${settings.direction === d.id ? 'on' : ''}`}
                onClick={() => set({ direction: d.id })}
              >
                <span>{d.ja}</span>
                <span className="seg-sub">{d.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <h3>1セットの長さ</h3>
          <div className="seg">
            {LENGTHS.map((n) => (
              <button
                key={n}
                className={`seg-btn ${settings.sessionLength === n ? 'on' : ''}`}
                onClick={() => set({ sessionLength: n })}
              >
                {n}問
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <h3>回答方法</h3>
          <div className="seg seg-col">
            {ANSWER_MODES.map((m) => (
              <button
                key={m.id}
                className={`seg-btn ${settings.answerMode === m.id ? 'on' : ''}`}
                onClick={() => set({ answerMode: m.id })}
              >
                <span>{m.ja}</span>
                <span className="seg-sub">{m.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="field">
          <h3>その他</h3>
          <Switch
            label="時刻を24時間制でも出す"
            sub="Sono le quattordici e quarantacinque"
            value={settings.officialTime}
            onChange={(v) => set({ officialTime: v })}
          />
          <Switch
            label="答えを自動で読み上げる"
            sub="音を出せない場面が多いので既定はオフ"
            value={settings.autoSpeak}
            onChange={(v) => set({ autoSpeak: v })}
          />
          <Switch
            label="明るい配色"
            value={settings.theme === 'light'}
            onChange={(v) => set({ theme: v ? 'light' : 'dark' })}
          />
        </section>

        <section className="field">
          <h3>読み上げの速さ</h3>
          <input
            className="range"
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={settings.speechRate}
            onChange={(e) => set({ speechRate: Number(e.target.value) })}
          />
          <div className="row-between">
            <span className="note-inline">{settings.speechRate.toFixed(2)}倍</span>
            <button
              className="btn btn-ghost btn-small"
              onClick={() => speak('Sono le quattro meno un quarto', settings.speechRate)}
            >
              試す
            </button>
          </div>
          {!speechSupported && (
            <p className="note">この端末では読み上げが使えません。</p>
          )}
          {speechSupported && !hasItalianVoice() && (
            <p className="note">
              イタリア語の音声が見つかりません。端末の設定で it-IT
              の音声を追加すると読み上げられます。
            </p>
          )}
        </section>

        <p className="note">
          設定と成績はこの端末のブラウザにだけ保存されます。オフラインでも動きます。
        </p>
      </div>
    </div>
  );
}

function Switch({ label, sub, value, onChange }) {
  return (
    <button className="switch" onClick={() => onChange(!value)}>
      <span className="switch-text">
        <span className="switch-label">{label}</span>
        {sub && <span className="switch-sub">{sub}</span>}
      </span>
      <span className={`switch-track ${value ? 'on' : ''}`}>
        <span className="switch-knob" />
      </span>
    </button>
  );
}
