import { Page } from '../../components/Layout';
import { ProgressBar, Tile } from '../../components/ui';
import { BJ_PATH, nextStep, pathProgress } from '../../lib/paths';
import { useProgress } from '../../lib/progress';

export default function BlackjackHub() {
  const p = useProgress();
  const next = nextStep(BJ_PATH, p);
  const prog = pathProgress(BJ_PATH, p);
  return (
    <Page title="Blackjack" back="/" cheat="blackjack">
      <div className="panel mb">
        <div className="row between">
          <strong>Your learning path</strong>
          <span className="small muted">{Math.round(prog * 100)}% complete</span>
        </div>
        <div className="mt">
          <ProgressBar value={prog} />
        </div>
      </div>
      <div className="stack">
        {BJ_PATH.map((s, i) => {
          const d = s.done(p);
          return (
            <Tile
              key={s.id}
              to={s.to}
              step={i + 1}
              done={d >= 1}
              next={next?.id === s.id}
              icon={s.icon}
              name={s.name}
              desc={d > 0 && d < 1 ? `${s.desc} · ${Math.round(d * 100)}%` : s.desc}
            />
          );
        })}
      </div>
      <div className="section-title">Go deeper</div>
      <div className="grid-2">
        <Tile to="/blackjack/odds" icon="📊" name="Why the chart works" desc="Dealer bust odds by upcard" />
        <Tile to="/blackjack/counting" icon="🧠" name="Card counting basics" desc="Hi-Lo intro and counting drill" />
      </div>
      <div className="callout info mt small">
        <strong>Top tip before you play for real:</strong> only sit at tables where blackjack pays <strong>3 to 2</strong>. Tables paying 6 to 5 quietly
        take about 1.4% more of every bet, which is more than all of basic strategy's savings.
      </div>
    </Page>
  );
}
