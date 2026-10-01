import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { StrategyChart, type ChartTable } from '../../components/StrategyChart';
import { Seg } from '../../components/ui';
import { completeLesson, getProgress } from '../../lib/progress';

export default function BlackjackChart() {
  const [tab, setTab] = useState<'all' | ChartTable>('hard');
  useEffect(() => {
    if (!getProgress().lessons['bj-chart-seen']) completeLesson('bj-chart-seen');
  }, []);
  return (
    <Page title="Basic strategy chart" back="/blackjack">
      <p className="muted">
        This chart shows the best play for every hand. Find your hand on the left, the dealer's upcard across the top, and do what the square says.
      </p>
      <div className="row center mb">
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'hard', label: 'Hard' },
            { value: 'soft', label: 'Soft' },
            { value: 'pair', label: 'Pairs' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
      <div className="panel">
        <StrategyChart only={tab === 'all' ? undefined : tab} key={tab} />
      </div>
      <div className="callout mt small">
        <strong>How to read it:</strong> check Pairs first (if you have one), then Soft (if you have an Ace counted as 11), otherwise Hard. "D" means double if
        you're allowed (only on your first two cards), otherwise hit. "Ds" means double if allowed, otherwise stand.
      </div>
      <div className="callout info small">
        Many casinos let you keep a strategy card at the table. Practice until you don't need it, but it's not cheating to use one.
      </div>
      <div className="grid-2 mt">
        <Link className="btn primary" to="/blackjack/practice">
          Practice with this chart →
        </Link>
        <button className="btn" onClick={() => window.print()}>
          🖨️ Print chart
        </button>
      </div>
    </Page>
  );
}
