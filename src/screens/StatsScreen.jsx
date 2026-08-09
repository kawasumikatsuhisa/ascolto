import { useMemo, useState } from 'react';
import { describeTag, isAggregateTag, tagGroup } from '../lib/generator.js';

/** 単語は項目数が多いので、グループごとに苦手な順で上位だけ出す */
const ROWS_PER_GROUP = 12;

export default function StatsScreen({ stats, progress, accuracy, onBack, onReset }) {
  const [confirming, setConfirming] = useState(false);

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
          <div className="metric">
            <div className="metric-value">
              {progress.total}
              <span className="metric-unit">問</span>
            </div>
            <div className="metric-label">のべ</div>
          </div>
          <div className="metric">
            <div className="metric-value">
              {accuracy === null ? '—' : accuracy}
              <span className="metric-unit">{accuracy === null ? '' : '%'}</span>
            </div>
            <div className="metric-label">正答率</div>
          </div>
          <div className="metric">
            <div className="metric-value">
              {progress.streak}
              <span className="metric-unit">日</span>
            </div>
            <div className="metric-label">連続</div>
          </div>
        </div>

        {weakest.length > 0 && (
          <p className="note">
            いま弱いのは <strong>{weakest.map((w) => w.label).join(' / ')}</strong>。
            出題はここに寄せてあります。
          </p>
        )}

        {groups.length === 0 && (
          <p className="note">まだ記録がありません。1セットやってみてください。</p>
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
              <p className="note">タグごとの正答率を消します。よろしいですか？</p>
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

function barColor(rate) {
  if (rate >= 0.9) return 'var(--good)';
  if (rate >= 0.7) return 'var(--hard)';
  return 'var(--again)';
}
