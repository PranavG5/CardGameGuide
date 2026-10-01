import { useCallback } from 'react';
import { Page } from '../../components/Layout';
import { QuizRunner } from '../../quiz/QuizRunner';
import { bjQuestion } from '../../quiz/blackjack';
import { useProgress } from '../../lib/progress';

export default function BlackjackPractice() {
  const { settings } = useProgress();
  const rules = { h17: settings.h17, surrender: settings.surrender, das: settings.das };
  const next = useCallback((focus: boolean) => bjQuestion(rules, focus), [rules.h17, rules.surrender, rules.das]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Page title="Practice hands" back="/blackjack" cheat="blackjack">
      <p className="muted small">
        Pick the best play. You'll see why after each hand, plus the long-run result of every option. Hands you miss come back until you get them right.
        Keys: <kbd>1</kbd>-<kbd>5</kbd> to answer, <kbd>Enter</kbd> for next.
      </p>
      <QuizRunner module="bj-practice" next={next} focusPrefix="bj:" key={`${rules.h17}${rules.surrender}${rules.das}`} />
    </Page>
  );
}
