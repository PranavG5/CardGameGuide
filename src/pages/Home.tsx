import { Link } from 'react-router-dom';
import { Page } from '../components/Layout';
import { PlayingCard } from '../components/PlayingCard';
import { ProgressBar, Tile } from '../components/ui';
import { parseCard } from '../lib/cards';
import { BJ_PATH, nextStep, pathProgress, PK_PATH } from '../lib/paths';
import { levelInfo, today, useProgress } from '../lib/progress';

export default function Home() {
  const p = useProgress();
  const lvl = levelInfo(p.xp);
  const bj = pathProgress(BJ_PATH, p);
  const pk = pathProgress(PK_PATH, p);
  const bjNext = nextStep(BJ_PATH, p);
  const pkNext = nextStep(PK_PATH, p);
  const dailyDone = p.daily[today()];
  const isNew = p.xp === 0;

  return (
    <Page>
      <section className="hero">
        <div className="deco hide-xs" aria-hidden>
          <PlayingCard card={parseCard('As')} size="md" />
          <span style={{ marginLeft: -26, marginTop: 10 }}>
            <PlayingCard card={parseCard('Kh')} size="md" />
          </span>
        </div>
        <h1>Learn Blackjack & Poker, fast.</h1>
        <p>
          Short lessons, practice hands with instant coaching, and quick memory games that make the right play automatic. No sign-up. No real money.
        </p>
        <div className="row">
          <Link to={bjNext?.to ?? '/blackjack'} className="btn primary">
            {isNew ? 'Start with Blackjack' : 'Continue Blackjack'}
          </Link>
          <Link to={pkNext?.to ?? '/poker'} className="btn">
            {isNew ? "Start with Texas Hold'em" : "Continue Hold'em"}
          </Link>
        </div>
        {isNew && <p className="small" style={{ marginTop: 12, marginBottom: 0 }}>New to both? Start with Blackjack. You can learn the basics in about 10 minutes.</p>}
      </section>

      <div className="game-cards">
        <Link to="/blackjack" className="game-card">
          <div className="gc-top">
            <h2>🂡 Blackjack</h2>
            <span className="pill">{Math.round(bj * 100)}%</span>
          </div>
          <div className="muted small">Beat the dealer to 21. Learn the one chart that cuts the house edge to about half a percent.</div>
          <ProgressBar value={bj} />
          <div className="small">{bjNext ? <>Next up: <strong>{bjNext.name}</strong></> : '🎓 Path complete! Keep sharp with the speed drill.'}</div>
        </Link>
        <Link to="/poker" className="game-card">
          <div className="gc-top">
            <h2>♠ Texas Hold'em</h2>
            <span className="pill">{Math.round(pk * 100)}%</span>
          </div>
          <div className="muted small">Make the best five-card hand. Learn which hands to play, when to fold, and how to read the odds.</div>
          <ProgressBar value={pk} />
          <div className="small">{pkNext ? <>Next up: <strong>{pkNext.name}</strong></> : '🎓 Path complete! Play coached hands to keep improving.'}</div>
        </Link>
      </div>

      <div className="section-title">Daily practice</div>
      <div className="stack">
        <Tile
          to="/daily"
          icon="📅"
          name="Daily challenge"
          desc={dailyDone !== undefined ? `Done today: ${dailyDone}/10. Come back tomorrow to keep your streak.` : '10 mixed questions from both games. About 3 minutes.'}
          right={<span className="check">{dailyDone !== undefined ? '✅' : '▶️'}</span>}
        />
      </div>

      <div className="section-title">Your progress</div>
      <div className="panel">
        <div className="row between">
          <div>
            <div style={{ fontWeight: 800 }}>
              Level {lvl.level} · {lvl.title}
            </div>
            <div className="small muted">
              {p.xp} XP · {p.streak > 0 ? `🔥 ${p.streak}-day streak` : 'Practice today to start a streak'}
            </div>
          </div>
          <Link to="/progress" className="btn small">
            Details
          </Link>
        </div>
        <div className="mt">
          <ProgressBar value={lvl.frac} />
          <div className="small faint" style={{ marginTop: 4 }}>
            {lvl.need - lvl.into} XP to level {lvl.level + 1}
          </div>
        </div>
      </div>

      <div className="section-title">Handy tools</div>
      <div className="grid-2">
        <Tile to="/glossary" icon="📚" name="Glossary" desc="Every term explained simply" />
        <Tile to="/poker/calculator" icon="🧮" name="Poker odds calculator" desc="Your win chance for any hand" />
        <Tile to="/blackjack/chart" icon="🗺️" name="Blackjack chart" desc="The full basic strategy" />
        <Tile to="/settings" icon="⚙️" name="Settings" desc="Table rules, card colors, reset" />
      </div>

      <div className="section-title">How it works</div>
      <div className="grid-2">
        <div className="panel">
          <h3>1. Learn</h3>
          <p className="small muted">Bite-size lessons with a quick check on each idea. No walls of text.</p>
        </div>
        <div className="panel">
          <h3>2. Practice</h3>
          <p className="small muted">Real situations with instant feedback on why a play is right, in plain English.</p>
        </div>
        <div className="panel">
          <h3>3. Drill</h3>
          <p className="small muted">Fast memory games and mistake review so the right play becomes automatic.</p>
        </div>
        <div className="panel">
          <h3>4. Play</h3>
          <p className="small muted">Full games with a coach who flags mistakes as you play, with fake chips only.</p>
        </div>
      </div>
    </Page>
  );
}
