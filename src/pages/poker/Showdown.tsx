import { useCallback } from 'react';
import { Page } from '../../components/Layout';
import { QuizRunner } from '../../quiz/QuizRunner';
import { showdownQuestion } from '../../quiz/poker';

export default function Showdown() {
  const next = useCallback((f: boolean) => showdownQuestion(f), []);
  return (
    <Page title="Who wins?" back="/poker" cheat="poker">
      <p className="muted small">
        Two players reach showdown. Find each player's best five cards, then decide who wins. Watch for kickers, the board pairing, and split pots.
      </p>
      <QuizRunner module="pk-showdown" next={next} focusPrefix="sd:" />
    </Page>
  );
}
