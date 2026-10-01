import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { recordAnswer, setBest, useProgress, weakSpots } from '../lib/progress';
import { useHotkeys } from '../components/ui';
import type { NextQuestion, Question } from './types';

interface Props {
  module: string;
  next: NextQuestion;
  mode?: 'practice' | 'timed' | 'fixed';
  seconds?: number;
  count?: number;
  bestKey?: string;
  /** Spot key prefix used for "practice my mistakes". */
  focusPrefix?: string;
  intro?: ReactNode;
  onDone?: (score: number, total: number) => void;
  startLabel?: string;
}

interface Missed {
  q: Question;
  chosen: string;
}

export function QuizRunner({ module, next, mode = 'practice', seconds = 60, count = 10, bestKey, focusPrefix, intro, onDone, startLabel }: Props) {
  const progress = useProgress();
  const [phase, setPhase] = useState<'intro' | 'running' | 'over'>(mode === 'practice' ? 'running' : 'intro');
  const [focus, setFocus] = useState(false);
  const [q, setQ] = useState<Question>(() => next(false));
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [run, setRun] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [missed, setMissed] = useState<Missed[]>([]);
  const [newBest, setNewBest] = useState(false);
  const advanceTimer = useRef<number | undefined>(undefined);

  const weakCount = focusPrefix ? weakSpots(focusPrefix).length : 0;
  void progress; // re-render on progress change so weakCount stays fresh

  const finish = useCallback(
    (finalScore: number, finalTotal: number) => {
      setPhase('over');
      if (bestKey) setNewBest(setBest(bestKey, finalScore));
      onDone?.(finalScore, finalTotal);
    },
    [bestKey, onDone],
  );

  // countdown based on a fixed end time so answering quickly never pauses the clock
  const endAt = useRef(0);
  const latest = useRef({ score: 0, total: 0 });
  latest.current = { score, total };
  useEffect(() => {
    if (mode !== 'timed' || phase !== 'running') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        window.clearTimeout(advanceTimer.current);
        finish(latest.current.score, latest.current.total);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [mode, phase, finish]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const goNext = useCallback(
    (useFocus = focus) => {
      setChosen(null);
      setQ(next(useFocus));
    },
    [focus, next],
  );

  const answer = (value: string) => {
    if (chosen !== null || phase !== 'running') return;
    const ok = value === q.answer;
    setChosen(value);
    recordAnswer(module, q.key, ok);
    const s = score + (ok ? 1 : 0);
    const t = total + 1;
    setScore(s);
    setTotal(t);
    const r = ok ? run + 1 : 0;
    setRun(r);
    setBestRun((b) => Math.max(b, r));
    if (!ok) setMissed((m) => [...m, { q, chosen: value }]);
    if (mode === 'timed') {
      advanceTimer.current = window.setTimeout(() => goNext(false), ok ? 280 : 1100);
    } else if (mode === 'fixed' && t >= count) {
      // keep feedback visible; the Next button becomes "See results"
    }
  };

  const proceed = () => {
    if (chosen === null) return;
    if (mode === 'fixed' && total >= count) return finish(score, total);
    goNext();
  };

  const start = () => {
    setScore(0);
    setTotal(0);
    setRun(0);
    setBestRun(0);
    setMissed([]);
    setTimeLeft(seconds);
    endAt.current = Date.now() + seconds * 1000;
    setNewBest(false);
    setChosen(null);
    setQ(next(false));
    setPhase('running');
  };

  useHotkeys(
    (key) => {
      if (phase !== 'running') {
        if (key === 'Enter' || key === ' ') start();
        return;
      }
      const n = Number(key);
      if (n >= 1 && n <= q.choices.length && chosen === null) answer(q.choices[n - 1].value);
      else if ((key === 'Enter' || key === ' ') && chosen !== null && mode !== 'timed') proceed();
    },
    [phase, q, chosen, score, total, run, mode],
  );

  if (phase === 'intro') {
    return (
      <div className="panel center stack">
        {intro}
        {bestKey && (progress.best[bestKey] ?? 0) > 0 && <div className="muted">Your best: {progress.best[bestKey]}</div>}
        <button className="btn primary block" onClick={start} autoFocus>
          {startLabel ?? (mode === 'timed' ? `Start ${seconds}-second round` : 'Start')}
        </button>
      </div>
    );
  }

  if (phase === 'over') {
    const acc = total ? Math.round((score / total) * 100) : 0;
    return (
      <div className="stack">
        <div className="panel center stack">
          <div className="muted">{mode === 'timed' ? "Time's up!" : 'Finished!'}</div>
          <div className="big-number gold-text">{score}</div>
          <div>
            correct out of {total} · {acc}% accuracy · best run {bestRun}
          </div>
          {newBest && <div className="pill gold" style={{ alignSelf: 'center' }}>🏆 New personal best!</div>}
          <button className="btn primary block" onClick={start} autoFocus>
            Play again
          </button>
        </div>
        {missed.length > 0 && (
          <div className="stack">
            <div className="section-title">Review your mistakes</div>
            {missed.map((m, i) => (
              <div key={i} className="panel stack">
                <div style={{ fontWeight: 700 }}>{m.q.prompt}</div>
                {m.q.visual}
                <div className="small">
                  You chose <strong className="bad">{label(m.q, m.chosen)}</strong>. Correct: <strong className="good">{label(m.q, m.q.answer)}</strong>
                </div>
                <div className="small muted">{m.q.explain}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const answered = chosen !== null;
  const ok = chosen === q.answer;
  return (
    <div className="stack">
      <div className="scorebar">
        <div className="stats">
          <span className="pill">✅ {score}/{total}</span>
          <span className="pill">🔥 {run} in a row</span>
          {mode === 'fixed' && <span className="pill">Question {Math.min(total + (answered ? 0 : 1), count)} of {count}</span>}
        </div>
        {mode === 'timed' && <span className={`timer ${timeLeft <= 10 ? 'low' : ''}`}>⏱ {timeLeft}s</span>}
        {mode === 'practice' && focusPrefix && (
          <label className="small row" style={{ gap: 6, cursor: weakCount ? 'pointer' : 'default', opacity: weakCount ? 1 : 0.5 }}>
            <input
              type="checkbox"
              checked={focus && weakCount > 0}
              disabled={!weakCount}
              onChange={(e) => {
                setFocus(e.target.checked);
                if (!answered) goNext(e.target.checked);
              }}
            />
            Practice my mistakes ({weakCount})
          </label>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{q.prompt}</div>
      {q.visual}

      <div className="choices" style={q.columns ? { gridTemplateColumns: `repeat(${q.columns}, 1fr)` } : undefined}>
        {q.choices.map((c, i) => {
          const cls = answered ? (c.value === q.answer ? 'correct' : c.value === chosen ? 'wrong' : 'dim') : '';
          return (
            <button key={c.value} className={`choice ${cls}`} onClick={() => answer(c.value)} disabled={answered}>
              {q.choices.length <= 9 && <span className="key">{i + 1}</span>}
              <span>{c.label}</span>
              {c.sub && <span className="sub">{c.sub}</span>}
            </button>
          );
        })}
      </div>

      {answered && mode !== 'timed' && (
        <div className={`feedback ${ok ? 'ok' : 'no'}`}>
          <div className="head">{ok ? '✅ Correct!' : `❌ Not quite. The answer is ${label(q, q.answer)}.`}</div>
          <div>{q.explain}</div>
          {q.extra?.(chosen!)}
          <button className="btn primary block mt" onClick={proceed} autoFocus>
            {mode === 'fixed' && total >= count ? 'See results' : 'Next'} <span className="key">Enter</span>
          </button>
        </div>
      )}
      {answered && mode === 'timed' && !ok && (
        <div className="feedback no small">
          Answer: <strong>{label(q, q.answer)}</strong>
        </div>
      )}
    </div>
  );
}

const label = (q: Question, v: string) => q.choices.find((c) => c.value === v)?.label ?? v;
