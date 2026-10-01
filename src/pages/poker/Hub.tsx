import { Page } from '../../components/Layout';
import { ProgressBar, Tile } from '../../components/ui';
import { nextStep, pathProgress, PK_PATH } from '../../lib/paths';
import { useProgress } from '../../lib/progress';

export default function PokerHub() {
  const p = useProgress();
  const next = nextStep(PK_PATH, p);
  const prog = pathProgress(PK_PATH, p);
  return (
    <Page title="Texas Hold'em" back="/" cheat="poker">
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
        {PK_PATH.map((s, i) => {
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
      <div className="section-title">Memory games & tools</div>
      <div className="grid-2">
        <Tile to="/poker/preflop?mode=sprint" icon="⚡" name="Play-or-fold sprint" desc="60 seconds of preflop decisions" />
        <Tile to="/poker/rankings?tab=race" icon="🏁" name="Rankings race" desc="Which hand wins? Beat the clock" />
        <Tile to="/poker/calculator" icon="🧮" name="Odds calculator" desc="Your win chance for any spot" />
        <Tile to="/glossary" icon="📚" name="Poker glossary" desc="Nuts, kicker, button and more" />
      </div>
    </Page>
  );
}
