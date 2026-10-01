import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { Seg } from '../../components/ui';
import { QuizRunner } from '../../quiz/QuizRunner';
import { preflopQuestion } from '../../quiz/poker';

export default function Preflop() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'sprint' ? 'sprint' : 'practice';
  const next = useCallback((f: boolean) => preflopQuestion(f), []);
  return (
    <Page title="Preflop practice" back="/poker" cheat="poker">
      <div className="row center mb">
        <Seg
          value={mode}
          onChange={(m) => setParams(m === 'sprint' ? { mode: 'sprint' } : {}, { replace: true })}
          options={[
            { value: 'practice', label: 'Practice' },
            { value: 'sprint', label: '⚡ 60s sprint' },
          ]}
        />
      </div>
      {mode === 'practice' ? (
        <>
          <p className="muted small">
            Your seat and what happened before you change everything. Decide: fold, call or raise. Missed spots come back until you get them. Keys <kbd>1</kbd>{' '}
            <kbd>2</kbd> <kbd>3</kbd>.
          </p>
          <QuizRunner key="p" module="pk-preflop" next={next} focusPrefix="pf:" />
        </>
      ) : (
        <QuizRunner
          key="s"
          module="pk-preflop"
          mode="timed"
          seconds={60}
          bestKey="pk-sprint"
          next={next}
          intro={
            <>
              <div style={{ fontSize: '2.5rem' }}>⚡</div>
              <h2>Play-or-fold sprint</h2>
              <p className="muted">60 seconds of preflop decisions. Build the instinct so you don't need the chart at the table.</p>
            </>
          }
        />
      )}
    </Page>
  );
}
