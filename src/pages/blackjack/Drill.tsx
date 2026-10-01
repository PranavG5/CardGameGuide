import { useCallback } from 'react';
import { Page } from '../../components/Layout';
import { QuizRunner } from '../../quiz/QuizRunner';
import { bjQuestion } from '../../quiz/blackjack';
import { useProgress } from '../../lib/progress';

export default function BlackjackDrill() {
  const { settings } = useProgress();
  const rules = { h17: settings.h17, surrender: settings.surrender, das: settings.das };
  const next = useCallback((focus: boolean) => bjQuestion(rules, focus), [rules.h17, rules.surrender, rules.das]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Page title="Speed drill" back="/blackjack" cheat="blackjack">
      <QuizRunner
        module="bj-drill"
        mode="timed"
        seconds={60}
        bestKey="bj-drill"
        next={next}
        intro={
          <>
            <div style={{ fontSize: '2.5rem' }}>⚡</div>
            <h2>60-second speed drill</h2>
            <p className="muted">
              Answer as many hands as you can in 60 seconds. Wrong answers flash the right play and cost you time. Mistakes are reviewed at the end. Use number keys for speed.
            </p>
            <p className="small faint">Goal: 15 correct to complete this step. Pros hit 30+.</p>
          </>
        }
      />
    </Page>
  );
}
