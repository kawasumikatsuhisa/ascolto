import { useEffect, useRef } from 'react';
import { CATEGORIES } from '../lib/generator.js';
import { matches } from '../lib/italianNumbers.js';
import { speak, speechSupported } from '../lib/speech.js';

const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.ja ?? id;

/** 表示する文字列の長さに応じて文字サイズを落とす */
function sizeClass(text) {
  const len = String(text).length;
  if (len <= 6) return 'xl';
  if (len <= 14) return 'lg';
  if (len <= 26) return 'md';
  return 'sm';
}

export default function DrillScreen({
  session,
  settings,
  onReveal,
  onGrade,
  onInput,
  onCheck,
  onQuit,
  onAgain,
}) {
  const { item, revealed, done, target, finished } = session;
  const inputRef = useRef(null);

  // 入力モードは「日本語/数字 -> イタリア語」のときだけ使う
  const typingActive = settings.typing && !item.reverse && !finished;

  const say = () => speak(item.speech, settings.speechRate);

  useEffect(() => {
    if (revealed && settings.autoSpeak) speak(item.speech, settings.speechRate);
    // 答えを表示した瞬間だけ読み上げる
  }, [revealed, item, settings.autoSpeak, settings.speechRate]);

  useEffect(() => {
    if (typingActive && !revealed) inputRef.current?.focus();
  }, [typingActive, revealed, item]);

  // PCで練習するとき用のショートカット（スマホでは使われない）
  useEffect(() => {
    const onKey = (e) => {
      if (finished) return;
      if (e.target instanceof HTMLInputElement) return;
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        onReveal();
      } else if (revealed && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
        e.preventDefault();
        onGrade(['again', 'hard', 'good'][Number(e.code.slice(-1)) - 1]);
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        say();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    return (
      <div className="screen">
        <div className="home-body">
          <h2 className="finish-title">1セット終わり</h2>
          <div className="metrics">
            <div className="metric">
              <div className="metric-value">
                {session.good}
                <span className="metric-unit">/{session.done}</span>
              </div>
              <div className="metric-label">言えた</div>
            </div>
          </div>
          <p className="note">
            間違えたものは次のセットで多めに出ます。降りる駅まで、もう1セット。
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-primary btn-tall" onClick={onAgain}>
            もう1セット
          </button>
          <button className="btn btn-ghost" onClick={onQuit}>
            やめる
          </button>
        </div>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    onCheck(matches(session.input, item.answer));
  };

  return (
    <div className="screen">
      <header className="drill-header">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${(done / target) * 100}%` }}
          />
        </div>
        <div className="drill-meta">
          <span>
            {done} / {target}
          </span>
          <span className="drill-category">{categoryLabel(item.category)}</span>
          <button className="link-btn" onClick={onQuit}>
            やめる
          </button>
        </div>
      </header>

      <main className="card">
        <p className="prompt-note">{item.promptNote}</p>
        <p className={`prompt prompt-${sizeClass(item.prompt)}`}>
          {item.prompt}
        </p>

        {revealed && (
          <div className="answer-block">
            {session.checked !== null && (
              <p className={`verdict ${session.checked ? 'ok' : 'ng'}`}>
                {session.checked ? '正解' : `不正解: ${session.input || '（無記入）'}`}
              </p>
            )}
            <p className={`answer answer-${sizeClass(item.answer)}`}>
              {item.answer}
            </p>
            {item.answerNote && <p className="answer-note">{item.answerNote}</p>}
            {speechSupported && (
              <button className="btn btn-speak" onClick={say}>
                ♪ 聞く
              </button>
            )}
          </div>
        )}
      </main>

      <div className="actions">
        {!revealed && typingActive && (
          <form className="typing" onSubmit={submit}>
            <input
              ref={inputRef}
              className="text-input"
              value={session.input}
              onChange={(e) => onInput(e.target.value)}
              placeholder="イタリア語で入力"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              inputMode={item.numericAnswer ? 'numeric' : 'text'}
            />
            <button className="btn btn-primary btn-tall" type="submit">
              答え合わせ
            </button>
          </form>
        )}

        {!revealed && !typingActive && (
          <button className="btn btn-primary btn-tall" onClick={onReveal}>
            めくる
            <span className="btn-sub">先に声に出してから</span>
          </button>
        )}

        {revealed && (
          <div className="grade-row">
            <button
              className="btn btn-grade btn-again"
              onClick={() => onGrade('again')}
            >
              だめ
            </button>
            <button
              className="btn btn-grade btn-hard"
              onClick={() => onGrade('hard')}
            >
              あやふや
            </button>
            <button
              className="btn btn-grade btn-good"
              onClick={() => onGrade('good')}
            >
              言えた
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
