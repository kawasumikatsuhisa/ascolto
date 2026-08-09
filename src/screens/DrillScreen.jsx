import { Fragment, useEffect, useMemo, useRef } from 'react';
import { CATEGORIES } from '../lib/generator.js';
import { matches } from '../lib/italianNumbers.js';
import { speak, speechSupported } from '../lib/speech.js';
import { topicById } from '../lib/vocabulary.js';
import { resolveAnswerMode } from '../lib/answerMode.js';

const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.ja ?? id;

/**
 * 表示する文字列の長さに応じて文字サイズを落とす。
 * イタリア語の数詞は分かち書きしないので、長いものは途中で折り返すしかない。
 * 1行に収まるところまで段階的に小さくする。
 */
function sizeClass(text) {
  const len = String(text).length;
  if (len <= 6) return 'xl';
  if (len <= 12) return 'lg';
  if (len <= 18) return 'md';
  if (len <= 20) return 'sm';
  if (len <= 26) return 'xs';
  return 'xxs';
}

/**
 * イタリア語の数詞は分かち書きしないので、狭い画面では折り返すしかない。
 * 何もしないと音節の途中で切れて読みにくいので、語の切れ目（〜mila /
 * 〜cento / 十の位）に <wbr> を入れて、そこで折り返させる。
 * 見た目が整うだけでなく、語の組み立てが見えるので読み解きの助けにもなる。
 */
const MORPHEME_BREAK =
  /(?=mila|mille|cento|venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta)/;

function Wrapped({ text }) {
  const parts = String(text).split(MORPHEME_BREAK);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
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

  const mode = resolveAnswerMode(settings, item);

  // 選択肢は「いちばん長いもの」に合わせて全部を同じ大きさにする。
  // ボタンごとに文字サイズが変わると、長さがヒントになってしまう。
  const choiceSize = sizeClass(
    (item.choices ?? []).reduce((a, b) => (a.length >= b.length ? a : b), ''),
  );

  // 単語で間違えたとき、選んだ語が何だったのかを添える。
  // ammonizione と cartellino giallo のように意味の近い語では、
  // 正解を見せるだけでは「なぜ違うのか」が分からないため。
  const pickedMeaning = useMemo(() => {
    if (item.source?.kind !== 'word' || !session.picked) return null;
    const entry = topicById(item.source.topic)?.entries.find(
      (e) => (item.reverse ? e.ja : e.it) === session.picked,
    );
    if (!entry) return null;
    return item.reverse ? entry.it : entry.ja;
  }, [item, session.picked]);

  const say = () => speak(item.speech, settings.speechRate);

  useEffect(() => {
    if (revealed && settings.autoSpeak) speak(item.speech, settings.speechRate);
    // 答えを表示した瞬間だけ読み上げる
  }, [revealed, item, settings.autoSpeak, settings.speechRate]);

  useEffect(() => {
    if (mode === 'typing' && !revealed) inputRef.current?.focus();
  }, [mode, revealed, item]);

  // PCで練習するとき用のショートカット（スマホでは使われない）
  useEffect(() => {
    const onKey = (e) => {
      if (finished || e.target instanceof HTMLInputElement) return;

      if (mode === 'choice' && !revealed) {
        const index = Number(e.key) - 1;
        if (index >= 0 && index < item.choices.length) {
          e.preventDefault();
          onCheck(item.choices[index] === item.answer, item.choices[index]);
        }
        return;
      }
      if (!revealed && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        onReveal();
      } else if (revealed && mode === 'choice' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        onGrade(session.checked ? 'good' : 'again');
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
              <div className="metric-label">正解</div>
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

  const submitTyping = (e) => {
    e.preventDefault();
    onCheck(matches(session.input, item.answer), session.input);
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
          <Wrapped text={item.prompt} />
        </p>

        {revealed && (
          <div className="answer-block">
            {session.checked !== null && (
              <p className={`verdict ${session.checked ? 'ok' : 'ng'}`}>
                {session.checked ? '正解' : '不正解'}
              </p>
            )}
            {!session.checked && session.picked && (
              <p className="picked">
                選んだのは <Wrapped text={session.picked} />
                {pickedMeaning && `（${pickedMeaning}）`}
              </p>
            )}
            <p className={`answer answer-${sizeClass(item.answer)}`}>
              <Wrapped text={item.answer} />
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
        {/* 選択式: 選ぶ → 正誤と規則を見る → 次へ */}
        {mode === 'choice' && !revealed && (
          <div className="choice-list">
            {item.choices.map((choice) => (
              <button
                key={choice}
                className={`btn btn-choice choice-${choiceSize}`}
                onClick={() => onCheck(choice === item.answer, choice)}
              >
                <Wrapped text={choice} />
              </button>
            ))}
          </div>
        )}

        {mode === 'choice' && revealed && (
          <button
            className="btn btn-primary btn-tall"
            onClick={() => onGrade(session.checked ? 'good' : 'again')}
          >
            次へ
          </button>
        )}

        {mode === 'typing' && !revealed && (
          <form className="typing" onSubmit={submitTyping}>
            <input
              ref={inputRef}
              className="text-input"
              value={session.input}
              onChange={(e) => onInput(e.target.value)}
              placeholder="イタリア語で入力"
              // 予測変換・自動修正はあえて有効のまま。長いイタリア語を
              // 電車で打つのに候補が出ないとつらい。綴りの照合は
              // matches() が大文字小文字とアクセントを吸収する。
              lang="it"
              autoComplete="off"
              autoCapitalize="off"
              inputMode={item.inputMode ?? 'text'}
              onFocus={() => window.scrollTo(0, 0)}
            />
            <button className="btn btn-primary btn-tall" type="submit">
              答え合わせ
            </button>
          </form>
        )}

        {mode === 'reveal' && !revealed && (
          <button className="btn btn-primary btn-tall" onClick={onReveal}>
            めくる
            <span className="btn-sub">先に声に出してから</span>
          </button>
        )}

        {mode !== 'choice' && revealed && (
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
