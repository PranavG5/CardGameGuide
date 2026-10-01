import { Link } from 'react-router-dom';
import { Page } from '../components/Layout';
import { ProgressBar } from '../components/ui';
import { upLabel } from '../lib/blackjack/hand';
import { RANKINGS } from '../components/RankingsList';
import { accuracy, levelInfo, useProgress, weakSpots } from '../lib/progress';
import { POSITION_INFO, type Position } from '../lib/poker/preflop';
import { CATEGORY_NAME, type Category } from '../lib/poker/evaluator';

const MODULES: { id: string; name: string; to: string }[] = [
  { id: 'bj-practice', name: 'Blackjack practice hands', to: '/blackjack/practice' },
  { id: 'bj-drill', name: 'Blackjack speed drill', to: '/blackjack/drill' },
  { id: 'bj-play', name: 'Blackjack table decisions', to: '/blackjack/play' },
  { id: 'bj-count', name: 'Card counting', to: '/blackjack/counting' },
  { id: 'pk-rank', name: 'Hand rankings', to: '/poker/rankings' },
  { id: 'pk-tier', name: 'Starting hand groups', to: '/poker/starting-hands' },
  { id: 'pk-preflop', name: 'Preflop decisions', to: '/poker/preflop' },
  { id: 'pk-showdown', name: 'Who wins?', to: '/poker/showdown' },
  { id: 'pk-outs', name: 'Draws & outs', to: '/poker/draws' },
  { id: 'pk-potodds', name: 'Pot odds', to: '/poker/pot-odds' },
  { id: 'pk-play', name: 'Poker table (coach agreement)', to: '/poker/play' },
  { id: 'daily', name: 'Daily challenge', to: '/daily' },
];

const SCEN: Record<string, string> = { unopened: 'folded to you', raised: 'facing a raise' };

/** Turn a spot key into plain English. */
export function spotLabel(key: string): { text: string; to: string } | null {
  const [kind, a, b, c] = key.split(':');
  if (kind === 'bj') {
    const up = upLabel(Number(c));
    const hand = a === 'hard' ? `Hard ${b}` : a === 'soft' ? `Soft ${b} (A,${Number(b) - 11})` : `Pair of ${b === '11' ? 'Aces' : b + 's'}`;
    return { text: `${hand} vs dealer ${up}`, to: '/blackjack/practice' };
  }
  if (kind === 'pf') return { text: `${a} in ${POSITION_INFO[b as Position]?.name.toLowerCase()}, ${SCEN[c]}`, to: '/poker/preflop' };
  if (kind === 'tier') return { text: `Which group is ${a}?`, to: '/poker/starting-hands' };
  if (kind === 'rk') {
    const [x, y] = a.split('-').map(Number);
    return { text: `${RANKINGS[x].name} vs ${RANKINGS[y].name}`, to: '/poker/rankings?tab=compare' };
  }
  if (kind === 'nh5' || kind === 'nh7') return { text: `Recognizing a ${a}`, to: `/poker/rankings?tab=${kind === 'nh5' ? 'name' : 'seven'}` };
  if (kind === 'sd') return { text: a === 'tie' ? 'Spotting split pots' : a === 'diff' ? 'Comparing hand types' : `Kickers with ${CATEGORY_NAME[Number(a.split('-')[1]) as Category]}`, to: '/poker/showdown' };
  return null;
}

export default function ProgressPage() {
  const p = useProgress();
  const lvl = levelInfo(p.xp);
  const weak = [...weakSpots('bj:'), ...weakSpots('pf:'), ...weakSpots('tier:'), ...weakSpots('rk:'), ...weakSpots('nh'), ...weakSpots('sd:')]
    .map((k) => ({ k, l: spotLabel(k), s: p.spots[k] }))
    .filter((x) => x.l)
    .slice(0, 12);
  const used = MODULES.filter((m) => p.modules[m.id]?.a);
  return (
    <Page title="Your progress" back="/">
      <div className="panel">
        <div className="row between">
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.3rem' }}>
              Level {lvl.level} · {lvl.title}
            </div>
            <div className="small muted">{p.xp} XP total</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800 }}>🔥 {p.streak} day{p.streak === 1 ? '' : 's'}</div>
            <div className="small muted">Best streak: {p.bestStreak}</div>
          </div>
        </div>
        <div className="mt">
          <ProgressBar value={lvl.frac} />
        </div>
        <div className="row between small muted mt">
          <span>🂡 {p.hands.bj} blackjack hands</span>
          <span>♠ {p.hands.poker} poker hands</span>
          <span>📖 {Object.keys(p.lessons).filter((k) => !k.endsWith('-seen')).length} lessons</span>
        </div>
      </div>

      <div className="section-title">Spots to work on</div>
      {weak.length === 0 ? (
        <div className="panel muted small">No weak spots right now. Mistakes you make in practice show up here until you get them right twice in a row.</div>
      ) : (
        <div className="panel">
          {weak.map(({ k, l, s }) => (
            <Link key={k} to={l!.to} className="rank-row" style={{ color: 'var(--text)' }}>
              <div className="info">
                <div style={{ fontWeight: 700 }}>{l!.text}</div>
                <div className="small faint">
                  {s.c}/{s.a} correct
                </div>
              </div>
              <span className="small">Practice →</span>
            </Link>
          ))}
          <div className="small muted mt">Tip: turn on "Practice my mistakes" in the trainers to drill only these.</div>
        </div>
      )}

      <div className="section-title">Accuracy by skill</div>
      <div className="panel">
        {used.length === 0 && <div className="muted small">Answer some questions and your stats appear here.</div>}
        {used.map((m) => {
          const st = p.modules[m.id];
          const acc = accuracy(st);
          return (
            <Link key={m.id} to={m.to} className="rank-row" style={{ color: 'var(--text)' }}>
              <div className="info">
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div style={{ marginTop: 4 }}>
                  <ProgressBar value={acc} />
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 70 }}>
                <div style={{ fontWeight: 800 }} className={acc >= 0.9 ? 'good' : acc < 0.6 ? 'bad' : ''}>
                  {Math.round(acc * 100)}%
                </div>
                <div className="small faint">{st.a} tries</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="section-title">Personal bests</div>
      <div className="panel">
        <div className="row between">
          <span>⚡ Blackjack speed drill</span>
          <strong>{p.best['bj-drill'] ?? '-'}</strong>
        </div>
        <div className="row between mt">
          <span>⚡ Play-or-fold sprint</span>
          <strong>{p.best['pk-sprint'] ?? '-'}</strong>
        </div>
        <div className="row between mt">
          <span>🏁 Rankings race</span>
          <strong>{p.best['pk-rank-race'] ?? '-'}</strong>
        </div>
        <div className="row between mt">
          <span>🧠 Hi-Lo value drill</span>
          <strong>{p.best['hilo-values'] ?? '-'}</strong>
        </div>
      </div>
    </Page>
  );
}
