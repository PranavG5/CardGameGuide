import { type ReactNode, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { CardRow } from '../../components/PlayingCard';
import { money, Seg, useHotkeys } from '../../components/ui';
import { POSITION_INFO, type Tier } from '../../lib/poker/preflop';
import { recordAnswer, useProgress } from '../../lib/progress';
import {
  CLASS_INFO, CLASS_ORDER, LEAK_INFO, leakOf, makeSpot, spotKey,
  type HandClass, type Leak, type Spot, type SpotAction, type StreetFilter,
} from '../../lib/poker/spots';
import { TierBadge } from '../../quiz/poker';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const STREET_NAME = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' } as const;
const FILTERS: StreetFilter[] = ['mixed', 'preflop', 'flop', 'turn', 'river'];

const LEAK_KEY = 'cardgameguide:spot-leaks';
const HINT_KEY = 'cardgameguide:spot-hints';

function loadLeaks(): Partial<Record<Leak, number>> {
  try {
    return JSON.parse(localStorage.getItem(LEAK_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function saveLeaks(l: Partial<Record<Leak, number>>) {
  try {
    localStorage.setItem(LEAK_KEY, JSON.stringify(l));
  } catch {
    /* storage unavailable */
  }
}
function loadHints(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

const CLASS_TIP: Record<HandClass, string> = {
  monster: 'Monsters: bet and raise. Building the pot is how these hands make money, and checking gives draws a free card.',
  strong: 'Strong hands: bet when checked to and usually raise against one player. Against several players or a huge bet, calling is often enough.',
  medium: 'Medium hands: keep the pot small. They beat bluffs and weaker pairs but not much else, so call reasonable bets and fold to big ones.',
  weak: 'Weak pairs: check when you can. Call only small bets, and fold to big bets or lots of action.',
  draw: 'Draws: call when the price is lower than your chance to hit. Big bets usually make a draw a fold.',
  air: "Nothing: check when it's free, fold when someone bets. Paying to see cards with no pair and no draw is the most common leak.",
};

/** Labels for the three buttons, which change with the situation. */
function choiceLabels(s: Spot): Record<SpotAction, string> {
  if (s.kind === 'pre') return { fold: 'Fold', call: s.scenario === 'unopened' ? 'Call (limp)' : 'Call', raise: s.scenario === 'unopened' ? 'Raise' : 'Re-raise' };
  return s.bet > 0 ? { fold: 'Fold', call: `Call ${money(s.bet)}`, raise: 'Raise' } : { fold: 'Fold', call: 'Check', raise: 'Bet' };
}

function promptText(s: Spot): string {
  if (s.kind === 'pre') {
    const pos = POSITION_INFO[s.position].name.toLowerCase();
    return s.scenario === 'unopened'
      ? `You're in ${pos} with ${s.code}. Everyone before you folded.`
      : `You're in ${pos} with ${s.code}. A player before you raised to 3 big blinds.`;
  }
  const n = s.opponents;
  const who = n === 1 ? "You're heads-up against one opponent" : `You're against ${n} opponents`;
  const action =
    s.bet === 0
      ? n === 1
        ? 'Your opponent checks to you.'
        : 'Everyone checks to you.'
      : n === 1
        ? `Your opponent bets ${money(s.bet)} (${s.betLabel}).`
        : `One opponent bets ${money(s.bet)} (${s.betLabel}) and ${n === 2 ? 'the other calls' : 'the other two call'}.`;
  return `${STREET_NAME[s.street]}. ${who}. The pot is ${money(s.pot)}. ${action}`;
}

export default function Spots() {
  const progress = useProgress();
  const [params, setParams] = useSearchParams();
  const pf = params.get('street') as StreetFilter | null;
  const filter: StreetFilter = pf && FILTERS.includes(pf) ? pf : 'mixed';
  const [spot, setSpot] = useState<Spot>(() => makeSpot(filter));
  const [chosen, setChosen] = useState<SpotAction | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [run, setRun] = useState(0);
  const [hints, setHints] = useState(loadHints);
  const [sessionLeaks, setSessionLeaks] = useState<Partial<Record<Leak, number>>>({});
  const [leaks, setLeaks] = useState(loadLeaks);

  const deal = useCallback((f: StreetFilter = filter) => {
    setChosen(null);
    setSpot(makeSpot(f));
  }, [filter]);

  const changeFilter = (f: StreetFilter) => {
    setParams(f === 'mixed' ? {} : { street: f }, { replace: true });
    deal(f);
  };

  const toggleHints = () => {
    setHints((h) => {
      try {
        localStorage.setItem(HINT_KEY, h ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !h;
    });
  };

  const answer = spot.kind === 'pre' ? spot.advice.action : spot.sol.answer;
  const canCheck = spot.kind === 'post' && spot.bet === 0;

  const choose = (a: SpotAction) => {
    if (chosen) return;
    const ok = a === answer;
    setChosen(a);
    recordAnswer('pk-spots', spotKey(spot), ok);
    setScore((s) => s + (ok ? 1 : 0));
    setTotal((t) => t + 1);
    setRun((r) => (ok ? r + 1 : 0));
    const leak = leakOf(a, answer, canCheck);
    if (leak) {
      setSessionLeaks((l) => ({ ...l, [leak]: (l[leak] ?? 0) + 1 }));
      const stored = loadLeaks();
      const next = { ...stored, [leak]: (stored[leak] ?? 0) + 1 };
      saveLeaks(next);
      setLeaks(next);
    }
  };

  const order: SpotAction[] = ['fold', 'call', 'raise'];
  useHotkeys(
    (key) => {
      const n = Number(key);
      if (n >= 1 && n <= 3 && !chosen) choose(order[n - 1]);
      else if ((key === 'Enter' || key === ' ') && chosen) deal();
    },
    [chosen, spot, filter],
  );

  const labels = choiceLabels(spot);
  const ok = chosen === answer;

  return (
    <Page title="Fold, check or raise" back="/poker" cheat="poker">
      <div className="row center mb">
        <Seg
          value={filter}
          onChange={changeFilter}
          options={FILTERS.map((f) => ({ value: f, label: f === 'mixed' ? 'Mixed' : STREET_NAME[f] }))}
        />
      </div>

      <div className="scorebar">
        <div className="stats">
          <span className="pill">✅ {score}/{total}</span>
          <span className="pill">🔥 {run} in a row</span>
        </div>
        <label className="small row" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={hints} onChange={toggleHints} />
          Show hints
        </label>
      </div>

      <div className="stack">
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
          {promptText(spot)} {canCheck ? 'Check or bet?' : "What's the play?"}
        </div>

        <SpotTable spot={spot} hints={hints} revealed={!!chosen} />

        <div className="choices" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {order.map((a, i) => {
            const cls = chosen ? (a === answer ? 'correct' : a === chosen ? 'wrong' : 'dim') : '';
            return (
              <button key={a} className={`choice ${cls}`} onClick={() => choose(a)} disabled={!!chosen}>
                <span className="key">{i + 1}</span>
                <span>{labels[a]}</span>
              </button>
            );
          })}
        </div>

        {chosen && (
          <div className={`feedback ${ok ? 'ok' : 'no'}`}>
            <div className="head">{ok ? '✅ Correct!' : `❌ The math says ${labels[answer]}.`}</div>
            {spot.kind === 'post' ? <PostExplain spot={spot} chosen={chosen} /> : <PreExplain spot={spot} />}
            {!ok && <LeakNote leak={leakOf(chosen, answer, canCheck)} />}
            <button className="btn primary block mt" onClick={() => deal()} autoFocus>
              Next hand <span className="key">Enter</span>
            </button>
          </div>
        )}

        <SessionLeaks leaks={sessionLeaks} />
        <LifetimeStats spots={progress.spots} leaks={leaks} onReset={() => { saveLeaks({}); setLeaks({}); }} />
      </div>
    </Page>
  );
}

function SpotTable({ spot, hints, revealed }: { spot: Spot; hints: boolean; revealed: boolean }) {
  const pills: ReactNode[] = [<span key="st" className="pill">🃏 {STREET_NAME[spot.street]}</span>];
  if (spot.kind === 'pre') {
    pills.push(<span key="pos" className="pill">📍 {POSITION_INFO[spot.position].name} ({POSITION_INFO[spot.position].seats})</span>);
    pills.push(<span key="sc" className="pill">{spot.scenario === 'unopened' ? '🟢 Folded to you' : '🔴 Facing a raise'}</span>);
  } else {
    pills.push(<span key="op" className="pill">👥 {spot.opponents} opponent{spot.opponents > 1 ? 's' : ''}</span>);
    pills.push(<span key="pot" className="pill">💰 Pot {money(spot.pot)}</span>);
    pills.push(
      <span key="bet" className="pill">
        {spot.bet > 0 ? `➡️ To call ${money(spot.bet)}` : '✋ Checked to you'}
      </span>,
    );
  }
  const showHint = hints || revealed;
  return (
    <div className="felt">
      <div className="row center" style={{ gap: 8, marginBottom: 12 }}>
        {pills}
      </div>
      {spot.kind === 'post' && (
        <>
          <div className="label">Board</div>
          <CardRow cards={[...spot.board, ...new Array(5 - spot.board.length).fill(null)]} center size="md" />
          <div className="divider" />
        </>
      )}
      <div className="label">Your hand</div>
      <CardRow cards={spot.hero} center size="lg" deal />
      {showHint && (
        <div className="center small" style={{ marginTop: 10, color: '#d7ebe1' }}>
          {spot.kind === 'pre' ? (
            <>
              <TierBadge tier={spot.tier} /> {spot.code}
            </>
          ) : (
            <>
              <strong>{spot.sol.made.label}</strong>
              {spot.sol.draws.outs.length > 0 && spot.street !== 'river' && (
                <> · {spot.sol.draws.label} ({spot.sol.draws.outs.length} outs)</>
              )}
              {hints && !revealed && spot.bet > 0 && <div className="faint">Calling needs {pct(spot.sol.need)} to break even</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EquityBar({ equity, need, line, lineLabel, tone }: { equity: number; need: number; line: number; lineLabel: string; tone: string }) {
  const place = (x: number) => {
    const p = Math.min(1, Math.max(0, x)) * 100;
    return { left: `${p}%` };
  };
  const align = (x: number) => (x < 0.12 ? 'l' : x > 0.88 ? 'r' : '');
  return (
    <div className="eqbar" aria-label={`Win chance ${pct(equity)}`}>
      <div className="fill" style={{ width: `${Math.round(equity * 100)}%`, background: tone }} />
      {need > 0 && (
        <div className={`mark need ${align(need)}`} style={place(need)}>
          <span>Call needs {pct(need)}</span>
        </div>
      )}
      <div className={`mark line ${align(line)}`} style={place(line)}>
        <span>
          {lineLabel} {pct(line)}+
        </span>
      </div>
    </div>
  );
}

function PostExplain({ spot, chosen }: { spot: Extract<Spot, { kind: 'post' }>; chosen: SpotAction }) {
  const s = spot.sol;
  const eq = pct(s.equity);
  const facing = spot.bet > 0;
  const tone = s.answer === 'fold' ? 'var(--bad)' : s.answer === 'raise' ? 'var(--good)' : 'var(--info)';
  const others = spot.opponents - 1;
  let why: ReactNode;
  if (facing) {
    const priceLine = (
      <>
        You call {money(spot.bet)} to win a {money(s.total)} pot{others > 0 ? ` (pot ${money(spot.pot)} + the bet + ${others === 1 ? 'one call' : `${others} calls`} + yours)` : ''}, so you need{' '}
        {money(spot.bet)} ÷ {money(s.total)} = <strong>{pct(s.need)}</strong> to break even.
      </>
    );
    if (s.answer === 'fold')
      why = (
        <>
          {priceLine} You only win <strong>{eq}</strong>. Calling here loses about <strong>{money(-s.evCall)}</strong> every time on average, so fold.
        </>
      );
    else if (s.answer === 'call')
      why = (
        <>
          {priceLine} You win <strong>{eq}</strong>, so calling earns about <strong>+{money(s.evCall)}</strong> on average. You're not far enough ahead to raise (that takes about {pct(s.line)}), so just call.
        </>
      );
    else
      why = (
        <>
          You win <strong>{eq}</strong> against the hands that bet here, well past the {pct(s.line)} raising line. Raise: you're ahead, so make them pay more. (Even a call would earn about +{money(s.evCall)}.)
        </>
      );
  } else if (s.answer === 'raise')
    why = (
      <>
        You win <strong>{eq}</strong> against what {spot.opponents === 1 ? 'your opponent holds' : 'they hold'}, above the {pct(s.line)} betting line for {spot.opponents === 1 ? 'one opponent' : `${spot.opponents} opponents`}. Bet: worse hands will call and pay you{spot.street !== 'river' ? ', and draws have to pay to chase' : ''}.
      </>
    );
  else
    why = (
      <>
        You win <strong>{eq}</strong>, below the {pct(s.line)} betting line for {spot.opponents === 1 ? 'one opponent' : `${spot.opponents} opponents`}. Check: it's free, and {spot.street === 'river' ? 'you get to showdown without risking more' : 'you see the next card without risking more'}.
        {chosen === 'fold' && ' Folding throws away that free chance to win.'}
      </>
    );

  const outs = s.draws.outs.length;
  const toCome = spot.street === 'flop' ? 2 : 1;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <EquityBar equity={s.equity} need={s.need} line={s.line} lineLabel={facing ? 'Raise at' : 'Bet at'} tone={tone} />
      <div>{why}</div>
      <div className="small">
        <span className="pill" style={{ marginRight: 6 }}>{CLASS_INFO[s.cls].name}</span>
        <strong>{s.made.label}.</strong> {s.made.detail}
        {outs > 0 && spot.street !== 'river' && (
          <>
            {' '}
            {s.draws.label}: {outs} outs. Rule of {toCome === 2 ? 4 : 2}: {outs} × {toCome === 2 ? 4 : 2} ≈ {Math.min(100, outs * (toCome === 2 ? 4 : 2))}% to hit {toCome === 2 ? 'by the river' : 'on the river'}.
          </>
        )}
      </div>
      <div className="small">
        <strong>Rule of thumb.</strong> {CLASS_TIP[s.cls]}
      </div>
      <div className="small faint">
        Win chance from {facing ? 'simulated run-outs against the hands that bet like this: mostly pairs and draws, plus some bluffs' : 'simulated run-outs against the hands players usually see a flop with'}.
        {spot.street === 'flop' && ' It assumes you see both the turn and the river.'}
      </div>
    </div>
  );
}

function PreExplain({ spot }: { spot: Extract<Spot, { kind: 'pre' }> }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div>
        <TierBadge tier={spot.tier as Tier} /> {spot.advice.reason}
      </div>
      {spot.scenario === 'unopened' && spot.advice.action !== 'call' && (
        <div className="small faint">When everyone folds to you, calling ("limping") is almost never right. Raise or fold.</div>
      )}
      <div className="small faint">Preflop answers come from the starting-hand chart, which is built from each hand's odds and how many players are left to act behind you.</div>
    </div>
  );
}

function LeakNote({ leak }: { leak: Leak | null }) {
  if (!leak) return null;
  return (
    <div className="callout small mt" style={{ marginBottom: 0 }}>
      <strong>{LEAK_INFO[leak].name}.</strong> {LEAK_INFO[leak].tip}
    </div>
  );
}

function SessionLeaks({ leaks }: { leaks: Partial<Record<Leak, number>> }) {
  const rows = (Object.entries(leaks) as [Leak, number][]).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return null;
  return (
    <div className="panel">
      <strong>Mistakes this session</strong>
      <div className="stack mt" style={{ gap: 6 }}>
        {rows.map(([k, n]) => (
          <div key={k} className="row between small" style={{ flexWrap: 'nowrap' }}>
            <span style={{ flex: 1, minWidth: 0 }}>{LEAK_INFO[k].name}</span>
            <span className="pill">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const GROUP_ORDER = ['preflop', ...CLASS_ORDER] as const;

function LifetimeStats({ spots, leaks, onReset }: { spots: Record<string, { a: number; c: number }>; leaks: Partial<Record<Leak, number>>; onReset: () => void }) {
  const groups: Record<string, { a: number; c: number; check: { a: number; c: number }; bet: { a: number; c: number } }> = {};
  for (const [k, s] of Object.entries(spots)) {
    if (!k.startsWith('sp:')) continue;
    const [, street, cls, facing] = k.split(':');
    const g = street === 'preflop' ? 'preflop' : cls;
    const row = (groups[g] ??= { a: 0, c: 0, check: { a: 0, c: 0 }, bet: { a: 0, c: 0 } });
    row.a += s.a;
    row.c += s.c;
    if (street !== 'preflop') {
      const sub = facing === 'bet' ? row.bet : row.check;
      sub.a += s.a;
      sub.c += s.c;
    }
  }
  const leakRows = (Object.entries(leaks) as [Leak, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!Object.keys(groups).length) return null;
  const name = (g: string) => (g === 'preflop' ? 'Preflop' : CLASS_INFO[g as HandClass].name);
  const sub = (label: string, x: { a: number; c: number }) => (x.a ? `${label} ${Math.round((x.c / x.a) * 100)}%` : null);
  return (
    <div className="panel">
      <strong>Your accuracy by hand type</strong>
      <div className="small muted">All-time. Work on the lowest rows: that's where you lose the most.</div>
      <div className="stack mt" style={{ gap: 10 }}>
        {GROUP_ORDER.filter((g) => groups[g]).map((g) => {
          const r = groups[g];
          const acc = r.c / r.a;
          const detail = [sub('facing a bet', r.bet), sub('checked to you', r.check)].filter(Boolean).join(' · ');
          return (
            <div key={g}>
              <div className="row between small">
                <span>
                  <strong>{name(g)}</strong>
                  {g !== 'preflop' && <span className="faint"> ({CLASS_INFO[g as HandClass].example})</span>}
                </span>
                <span>
                  {r.c}/{r.a} · <strong className={acc >= 0.8 ? 'good' : acc < 0.6 ? 'bad' : ''}>{Math.round(acc * 100)}%</strong>
                </span>
              </div>
              <div className="meter">
                <div style={{ width: `${Math.round(acc * 100)}%`, background: acc >= 0.8 ? 'var(--good)' : acc < 0.6 ? 'var(--bad)' : 'var(--gold)' }} />
              </div>
              {detail && <div className="small faint">{detail}</div>}
            </div>
          );
        })}
      </div>
      {leakRows.length > 0 && (
        <>
          <div className="row between mt">
            <strong>Your most common mistakes</strong>
            <button className="btn small" onClick={onReset}>
              Reset
            </button>
          </div>
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {leakRows.map(([k, n]) => (
              <div key={k} className="small">
                <div className="row between" style={{ flexWrap: 'nowrap' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{LEAK_INFO[k].name}</span>
                  <span className="pill">{n}</span>
                </div>
                <div className="faint">{LEAK_INFO[k].tip}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

