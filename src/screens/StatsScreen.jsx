import { useMemo, useState } from 'react';
import { describeTag, isAggregateTag, tagGroup } from '../lib/generator.js';
import { ERROR_TYPE_ORDER } from '../lib/errorTypes.js';
import { accuracyOf } from '../lib/storage.js';

/** 単語は項目数が多いので、グループごとに苦手な順で上位だけ出す */
const ROWS_PER_GROUP = 12;

export default function StatsScreen({ stats, errors = {}, progress, onBack, onReset }) {
  const [confirming, setConfirming] = useState(false);

  const todayAccuracy = accuracyOf(progress.todayCorrect, progress.todayCount);
  const overallAccuracy = accuracyOf(progress.correct, progress.total);

  const groups = useMemo(() => {
    const rows = Object.entries(stats)
      .filter(([, s]) => s.seen > 0)
      .map(([tag, s]) => ({
        tag,
        group: tagGroup(tag),
        label: describeTag(tag),
        seen: s.seen,
        rate: 1 - s.wrong / s.seen,
      }))
      // 苦手なものを上に、同率なら出題数が多い順
      .sort((a, b) => a.rate - b.rate || b.seen - a.seen);

    const byGroup = new Map();
    for (const row of rows) {
      if (!byGroup.has(row.group)) {
        byGroup.set(row.group, { summary: null, rows: [] });
      }
      const bucket = byGroup.get(row.group);
      // 話題ぜんぶの成績は見出しに出す。個々の語と同じ列に混ぜると
      // 「あいさつぜんぶ」が語のあいだに紛れて分かりにくい。
      if (isAggregateTag(row.tag)) bucket.summary = row;
      else bucket.rows.push(row);
    }
    return [...byGroup.entries()];
  }, [stats]);

  // 間違いの型の内訳。多い順に、いちばん多い型を満杯にした帯で見せる。
  // 「どの語を落としたか」ではなく「どの規則で転んだか」を先に見せたい。
  const errorRows = useMemo(() => {
    const rows = Object.entries(errors)
      .filter(([, count]) => count > 0)
      .map(([tag, count]) => ({
        tag,
        count,
        label: describeTag(tag),
        area: tagGroup(tag),
      }));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const order = (tag) => {
      const i = ERROR_TYPE_ORDER.indexOf(tag);
      return i === -1 ? ERROR_TYPE_ORDER.length : i;
    };
    rows.sort((a, b) => b.count - a.count || order(a.tag) - order(b.tag));
    return rows.map((row) => ({ ...row, share: total > 0 ? row.count / total : 0 }));
  }, [errors]);

  const errorTop = errorRows[0];
  // 「いちばん多い型」は、ちゃんと抜けているときだけ言う。
  // 同数で並んでいるのに1つを名指しすると、狙いどころを見誤らせる。
  const errorLeader =
    errorTop &&
    errorTop.share >= 0.25 &&
    (errorRows.length === 1 || errorTop.count > errorRows[1].count)
      ? errorTop
      : null;

  const weakest = groups
    .flatMap(([, bucket]) => bucket.rows)
    .sort((a, b) => a.rate - b.rate || b.seen - a.seen)
    .slice(0, 3);

  return (
    <div className="screen">
      <header className="sub-header">
        <button className="link-btn" onClick={onBack}>
          ← 戻る
        </button>
        <h2>成績</h2>
      </header>

      <div className="scroll-body">
        <div className="metrics">
          <Metric label="きょう" value={progress.todayCount} unit="問" />
          <Metric
            label="きょうの正答率"
            value={todayAccuracy === null ? '—' : todayAccuracy}
            unit={todayAccuracy === null ? '' : '%'}
          />
          <Metric label="連続" value={progress.streak} unit="日" />
          <Metric label="のべ" value={progress.total} unit="問" />
          <Metric
            label="通算の正答率"
            value={overallAccuracy === null ? '—' : overallAccuracy}
            unit={overallAccuracy === null ? '' : '%'}
          />
          <Metric label="連続正解" value={progress.combo} unit="問" />
        </div>

        {progress.bestCombo > 0 && (
          <p className="note">
            連続正解の最高記録は <strong>{progress.bestCombo}問</strong>です。
          </p>
        )}

        {weakest.length > 0 && (
          <p className="note">
            いま弱いのは <strong>{weakest.map((w) => w.label).join(' / ')}</strong>。
            出題はここに寄せてあります。
          </p>
        )}

        {groups.length === 0 && (
          <p className="note">まだ記録がありません。1セットやってみてください。</p>
        )}

        {errorRows.length > 0 && (
          <section className="stat-group">
            <h3>
              <span>間違いの型</span>
              <span className="stat-more">冠詞・動詞で選んだ誤答の内訳</span>
            </h3>
            {errorLeader && (
              <p className="note">
                いちばん多いのは <strong>{errorLeader.label}</strong>（
                {Math.round(errorLeader.share * 100)}%）。ここを1つ潰すと効きます。
              </p>
            )}
            {errorRows.map((row) => (
              <div className="stat-row error-row" key={row.tag}>
                <div className="stat-label">
                  <span className="stat-name">{row.label}</span>
                  <span className="stat-area">{row.area}</span>
                </div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{
                      width: `${Math.round((row.count / errorTop.count) * 100)}%`,
                      background: 'var(--again)',
                    }}
                  />
                </div>
                <div className="stat-value">
                  {row.count}回
                  <span className="stat-seen">{Math.round(row.share * 100)}%</span>
                </div>
              </div>
            ))}
          </section>
        )}

        {groups.map(([group, { summary, rows }]) => (
          <section className="stat-group" key={group}>
            <h3>
              <span>
                {group}
                {summary && (
                  <span className="stat-summary">
                    {Math.round(summary.rate * 100)}% · {summary.seen}問
                  </span>
                )}
              </span>
              {rows.length > ROWS_PER_GROUP && (
                <span className="stat-more">
                  苦手な{ROWS_PER_GROUP}件 / 全{rows.length}件
                </span>
              )}
            </h3>
            {rows.slice(0, ROWS_PER_GROUP).map((row) => (
              <div className="stat-row" key={row.tag}>
                <div className="stat-label">{row.label}</div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{
                      width: `${Math.round(row.rate * 100)}%`,
                      background: barColor(row.rate),
                    }}
                  />
                </div>
                <div className="stat-value">
                  {Math.round(row.rate * 100)}%
                  <span className="stat-seen">{row.seen}</span>
                </div>
              </div>
            ))}
          </section>
        ))}

        <div className="danger-zone">
          {confirming ? (
            <>
              <p className="note">
                タグごとの正答率と間違いの型を消します。よろしいですか？
              </p>
              <div className="actions-row">
                <button
                  className="btn btn-ghost"
                  onClick={() => setConfirming(false)}
                >
                  やめる
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    onReset();
                    setConfirming(false);
                  }}
                >
                  消す
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => setConfirming(true)}>
              成績をリセット
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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

function barColor(rate) {
  if (rate >= 0.9) return 'var(--good)';
  if (rate >= 0.7) return 'var(--hard)';
  return 'var(--again)';
}
