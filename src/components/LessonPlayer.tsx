import { type ReactNode, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { completeLesson, useProgress } from '../lib/progress';
import { useHotkeys } from './ui';

export interface Check {
  q: string;
  options: { label: string; correct?: boolean; why: string }[];
}

export interface Slide {
  title: string;
  body: ReactNode;
  visual?: ReactNode;
  check?: Check;
}

export interface Lesson {
  id: string;
  title: string;
  icon: string;
  blurb: string;
  slides: Slide[];
}

/** Lesson index plus player, with the open lesson kept in the URL so Back works. */
export function LessonBook({ lessons, afterAll }: { lessons: Lesson[]; afterAll: { to: string; label: string } }) {
  const [params, setParams] = useSearchParams();
  const p = useProgress();
  const openId = params.get('l');
  const idx = lessons.findIndex((l) => l.id === openId);
  if (idx >= 0) {
    const nextLesson = lessons[idx + 1];
    return (
      <LessonPlayer
        key={lessons[idx].id}
        lesson={lessons[idx]}
        number={idx + 1}
        total={lessons.length}
        next={nextLesson ? { label: `Next: ${nextLesson.title}`, go: () => setParams({ l: nextLesson.id }) } : null}
        afterAll={afterAll}
        exit={() => setParams({})}
      />
    );
  }
  const firstUndone = lessons.find((l) => !p.lessons[l.id]);
  return (
    <div className="stack">
      {lessons.map((l, i) => (
        <button
          key={l.id}
          className={`tile ${firstUndone?.id === l.id ? 'next' : ''}`}
          style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
          onClick={() => setParams({ l: l.id })}
        >
          <div className={`step ${p.lessons[l.id] ? 'done' : ''}`}>{p.lessons[l.id] ? '✓' : i + 1}</div>
          <div className="ico">{l.icon}</div>
          <div className="body">
            <div className="name">{l.title}</div>
            <div className="desc">{l.blurb}</div>
          </div>
        </button>
      ))}
      {!firstUndone && (
        <Link className="btn primary block" to={afterAll.to}>
          All lessons done! {afterAll.label} →
        </Link>
      )}
    </div>
  );
}

interface PlayerProps {
  lesson: Lesson;
  number: number;
  total: number;
  next: { label: string; go: () => void } | null;
  afterAll: { to: string; label: string };
  exit: () => void;
}

function LessonPlayer({ lesson, number, total, next, afterAll, exit }: PlayerProps) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const finished = i >= lesson.slides.length;
  const slide = lesson.slides[i];
  const needsAnswer = !!slide?.check && (picked === null || !slide.check.options[picked].correct);

  const go = (d: number) => {
    const n = i + d;
    if (n < 0) return;
    if (n >= lesson.slides.length) completeLesson(lesson.id);
    setPicked(null);
    setI(n);
  };

  useHotkeys(
    (k) => {
      if (finished) return;
      if ((k === 'ArrowRight' || k === 'Enter' || k === ' ') && !needsAnswer) go(1);
      if (k === 'ArrowLeft') go(-1);
      const n = Number(k);
      if (slide?.check && n >= 1 && n <= slide.check.options.length) setPicked(n - 1);
    },
    [i, needsAnswer, finished, slide],
  );

  return (
    <div className="stack">
      <div className="row between">
        <button className="btn small ghost" onClick={exit}>
          ← All lessons
        </button>
        <span className="small muted">
          Lesson {number} of {total}
        </span>
      </div>
      <h1>
        {lesson.icon} {lesson.title}
      </h1>
      <div className="lesson-dots">
        {lesson.slides.map((_, k) => (
          <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />
        ))}
      </div>

      {finished ? (
        <div className="panel center stack slide">
          <div style={{ fontSize: '3rem' }}>🎉</div>
          <h2>Lesson complete!</h2>
          <p className="muted">+25 XP. Nice work.</p>
          {next ? (
            <button className="btn primary block" onClick={next.go} autoFocus>
              {next.label} →
            </button>
          ) : (
            <Link className="btn primary block" to={afterAll.to}>
              {afterAll.label} →
            </Link>
          )}
          <button className="btn ghost block" onClick={exit}>
            Back to lessons
          </button>
        </div>
      ) : (
        <div className="panel slide" key={i}>
          <h2>{slide.title}</h2>
          {slide.visual && <div className="visual">{slide.visual}</div>}
          <div>{slide.body}</div>
          {slide.check && (
            <div className="stack mt">
              <div style={{ fontWeight: 700 }}>✏️ Quick check: {slide.check.q}</div>
              <div className="choices">
                {slide.check.options.map((o, k) => (
                  <button
                    key={k}
                    className={`choice ${picked === k ? (o.correct ? 'correct' : 'wrong') : ''}`}
                    onClick={() => setPicked(k)}
                  >
                    <span className="key">{k + 1}</span>
                    {o.label}
                  </button>
                ))}
              </div>
              {picked !== null && (
                <div className={`feedback ${slide.check.options[picked].correct ? 'ok' : 'no'}`}>
                  <div className="head">{slide.check.options[picked].correct ? '✅ Correct!' : '❌ Try again'}</div>
                  {slide.check.options[picked].why}
                </div>
              )}
            </div>
          )}
          <div className="row between mt">
            <button className="btn" onClick={() => go(-1)} disabled={i === 0}>
              ← Back
            </button>
            <button className="btn primary" onClick={() => go(1)} disabled={needsAnswer}>
              {i === lesson.slides.length - 1 ? 'Finish' : 'Next'} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
