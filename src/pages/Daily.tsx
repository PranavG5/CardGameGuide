import { useCallback } from 'react';
import { Page } from '../components/Layout';
import { getProgress, setDaily, today, useProgress } from '../lib/progress';
import { QuizRunner } from '../quiz/QuizRunner';
import { bjQuestion } from '../quiz/blackjack';
import { randomPokerQuestion } from '../quiz/poker';

export default function Daily() {
  const p = useProgress();
  const done = p.daily[today()];
  const next = useCallback(() => {
    const s = getProgress().settings;
    return Math.random() < 0.45 ? bjQuestion({ h17: s.h17, surrender: s.surrender, das: s.das }, false) : randomPokerQuestion();
  }, []);
  const onDone = useCallback((score: number) => {
    if (getProgress().daily[today()] === undefined) setDaily(score);
  }, []);
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { k, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), score: p.daily[k] };
  });
  return (
    <Page title="Daily challenge" back="/">
      <div className="panel mb">
        <div className="row between">
          <div>
            <strong>🔥 {p.streak}-day streak</strong>
            <div className="small muted">Best: {p.bestStreak} days</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {last7.map((d) => (
              <div key={d.k} className="center" title={d.k}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: d.score !== undefined ? 'var(--good)' : 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: '#062a14',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {d.score ?? ''}
                </div>
                <div className="small faint">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <QuizRunner
        module="daily"
        mode="fixed"
        count={10}
        next={next}
        onDone={onDone}
        startLabel={done !== undefined ? 'Play again for practice' : "Start today's 10"}
        intro={
          <>
            <div style={{ fontSize: '2.5rem' }}>📅</div>
            <h2>{done !== undefined ? `Today's score: ${done}/10` : "Today's challenge"}</h2>
            <p className="muted">10 mixed questions from blackjack and poker. A few minutes a day keeps everything fresh and builds your streak.</p>
          </>
        }
      />
    </Page>
  );
}
