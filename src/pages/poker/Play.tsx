import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { CardRow, PlayingCard } from '../../components/PlayingCard';
import { Toast } from '../../components/ui';
import { botAction, coachAdvice, type Coach } from '../../lib/poker/ai';
import { describeMadeHand, findDraws } from '../../lib/poker/draws';
import { type Action, apply, createTable, heroIndex, isHeroTurn, legal, pot, positionOf, startHand, type TableState } from '../../lib/poker/table';
import { addHands, recordAnswer, updateSettings, useProgress } from '../../lib/progress';
import { sameCard } from '../../lib/cards';
import { handCode, tierOfCode, TIER_INFO } from '../../lib/poker/preflop';

// Seat centers as % of the table: [desktop left, desktop top, mobile left, mobile top].
const SEAT_POS = [
  [50, 90, 50, 90],
  [9, 66, 13, 69],
  [14, 16, 13, 29],
  [50, 5, 50, 13],
  [86, 16, 87, 29],
  [91, 66, 87, 69],
];

const STYLE_TAG: Record<string, string> = { tight: 'Tight', loose: 'Loose', aggressive: 'Aggro', passive: 'Calls a lot' };

function actionName(a: Action, t: TableState): string {
  if (a.type === 'raise') return t.currentBet === 0 ? 'Bet' : 'Raise';
  return a.type[0].toUpperCase() + a.type.slice(1);
}

export default function PokerPlay() {
  const p = useProgress();
  const coachOn = p.settings.coach;
  const [t, setT] = useState<TableState>(() => startHand(createTable(200)));
  const [toast, setToast] = useState<{ tone: 'ok' | 'no'; text: string } | null>(null);
  const [stats, setStats] = useState({ hands: 0, decisions: 0, agreed: 0, net: 0 });
  const [showLog, setShowLog] = useState(false);
  const [custom, setCustom] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const counted = useRef(0);
  const handStartStack = useRef(t.seats[heroIndex(t)].stack + t.seats[heroIndex(t)].contributed);
  const toastTimer = useRef<number | undefined>(undefined);
  const hi = heroIndex(t);
  const hero = t.seats[hi];

  const flash = (tone: 'ok' | 'no', text: string, ms = tone === 'ok' ? 1000 : 4500) => {
    window.clearTimeout(toastTimer.current);
    setToast({ tone, text });
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  // Bots act with a short "thinking" delay.
  useEffect(() => {
    if (t.over || t.toAct < 0 || t.seats[t.toAct].isHero) return;
    const fast = hero.folded;
    const id = window.setTimeout(() => setT((prev) => (prev.over || prev.seats[prev.toAct]?.isHero ? prev : apply(prev, botAction(prev, prev.toAct)))), fast ? 350 : 750);
    return () => window.clearTimeout(id);
  }, [t, hero.folded]);

  // Hand finished.
  useEffect(() => {
    if (t.over && counted.current !== t.handNo) {
      counted.current = t.handNo;
      addHands('poker');
      const net = t.seats[hi].stack - handStartStack.current;
      setStats((s) => ({ ...s, hands: s.hands + 1, net: s.net + net }));
    }
  }, [t, hi]);

  const heroTurn = isHeroTurn(t);
  const coach: Coach | null = useMemo(() => (heroTurn ? coachAdvice(t, hi) : null), [t, heroTurn, hi]);
  const L = heroTurn ? legal(t, hi) : null;
  useEffect(() => {
    setCustom(null);
    setPeek(false);
  }, [t.toAct, t.street]);

  const presets = useMemo(() => {
    if (!L || !L.canRaise) return [];
    const p0 = pot(t);
    const clamp = (x: number) => Math.max(L.minTo, Math.min(L.maxTo, Math.round(x)));
    const out: { label: string; to: number }[] = [];
    if (t.street === 'preflop') {
      if (t.raises <= 1) {
        out.push({ label: '3 BB', to: clamp(t.bb * 3) }, { label: '4 BB', to: clamp(t.bb * 4) });
      } else out.push({ label: '3×', to: clamp(t.currentBet * 3) });
    } else {
      const base = t.currentBet;
      const after = p0 + (t.currentBet - hero.bet);
      out.push({ label: '½ pot', to: clamp(base + after * 0.5) }, { label: '¾ pot', to: clamp(base + after * 0.75) }, { label: 'Pot', to: clamp(base + after) });
    }
    out.push({ label: 'All-in', to: L.maxTo });
    return out.filter((o, i) => out.findIndex((x) => x.to === o.to) === i);
  }, [L, t, hero.bet]);

  const act = (a: Action) => {
    if (!heroTurn || !coach) return;
    const mine = a.type;
    const agree = mine === coach.action;
    const key = t.street === 'preflop' ? null : `pp:${t.street}`;
    recordAnswer('pk-play', key, agree, agree ? 4 : 1);
    setStats((s) => ({ ...s, decisions: s.decisions + 1, agreed: s.agreed + (agree ? 1 : 0) }));
    if (coachOn) {
      if (agree) flash('ok', `✓ Coach agrees: ${actionName(a, t)}.`);
      else if (mine === 'fold' && coach.action === 'check') flash('no', '✗ Never fold when you can check for free!');
      else flash('no', `✗ Coach suggests ${coach.headline}. ${coach.reasons[coach.reasons.length - 1]}`);
    }
    setT(apply(t, a));
  };

  const nextHand = () => {
    let base = t;
    if (hero.stack <= 0) return;
    base = startHand(base);
    handStartStack.current = base.seats[hi].stack + base.seats[hi].contributed;
    setToast(null);
    setT(base);
  };

  const rebuy = () => {
    const fresh = { ...t, seats: t.seats.map((s) => (s.isHero ? { ...s, stack: 200 } : s)) };
    const started = startHand(fresh);
    handStartStack.current = started.seats[hi].stack + started.seats[hi].contributed;
    setT(started);
  };

  // Keyboard shortcuts: F fold, C check/call, R raise (coach size), N next hand.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const key = e.key.toLowerCase();
      if (heroTurn && L) {
        if (key === 'f') act({ type: 'fold' });
        if (key === 'c') act(L.canCheck ? { type: 'check' } : { type: 'call' });
        if (key === 'r' && L.canRaise) act({ type: 'raise', to: coach?.to ?? presets[0]?.to ?? L.minTo });
      } else if (t.over && (key === 'n' || key === 'enter')) {
        if ((e.target as HTMLElement)?.tagName === 'BUTTON' && key === 'enter') return;
        nextHand();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const made = hero.hole.length ? describeMadeHand(hero.hole, t.board) : null;
  const draw = hero.hole.length && t.board.length >= 3 && t.board.length < 5 ? findDraws(hero.hole, t.board) : null;
  const winnerSeats = new Set(t.winners.map((w) => w.seat));
  const heroWin = t.winners.find((w) => w.seat === hi);
  const showCoach = coachOn || peek;

  return (
    <Page title="Hold'em table" back="/poker" cheat="poker" wide>
      <div className="row between">
        <span className="pill">Blinds $1/$2 · Hand #{t.handNo}</span>
        <label className="pill" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={coachOn} onChange={(e) => updateSettings({ coach: e.target.checked })} /> Coach
        </label>
      </div>

      <div className="ptable">
        <div className="board">
          <CardRow cards={[0, 1, 2, 3, 4].map((i) => t.board[i] ?? null)} size="sm" />
          <div className="pot">Pot ${pot(t)}</div>
        </div>
        {t.seats.map((s, i) => {
          const pos = s.hole.length ? positionOf(t, i) : null;
          const acting = !t.over && t.toAct === i;
          const showCards = s.isHero || s.showCards;
          const winnerBest = t.winners.find((w) => w.seat === i)?.best ?? [];
          return (
            <div
              key={i}
              className={`seat ${acting ? 'acting' : ''} ${s.folded ? 'folded' : ''} ${winnerSeats.has(i) && t.over ? 'winner' : ''}`}
              style={{ '--l': `${SEAT_POS[i][0]}%`, '--t': `${SEAT_POS[i][1]}%`, '--lm': `${SEAT_POS[i][2]}%`, '--tm': `${SEAT_POS[i][3]}%` } as React.CSSProperties}
            >
              {s.hole.length > 0 && !s.isHero &&
                (showCards ? (
                  <CardRow cards={s.hole} size="sm" overlap highlight={(c) => t.over && winnerBest.some((b) => sameCard(b, c))} />
                ) : (
                  <div className="cards overlap">
                    <PlayingCard faceDown size="sm" />
                    <PlayingCard faceDown size="sm" />
                  </div>
                ))}
              <div className="plate">
                <div className="nm">
                  {s.name} {t.button === i && <span className="dealer-btn">D</span>}
                </div>
                <div className="stk">${s.stack}</div>
                <div className="act">{s.lastAction || (pos ? pos.label : '')}</div>
                {!s.isHero && <div className="pos-tag">{STYLE_TAG[s.style]}</div>}
              </div>
              {s.bet > 0 && !t.over && <span className="betchip">${s.bet}</span>}
            </div>
          );
        })}
      </div>

      <div className="felt mt" style={{ padding: 12 }}>
        <div className="row center" style={{ gap: 16 }}>
          <div className="center">
            <CardRow cards={hero.hole} size="lg" highlight={(c) => t.over && (heroWin?.best ?? []).some((b) => sameCard(b, c))} deal />
          </div>
          <div style={{ minWidth: 170 }}>
            <div className="small" style={{ color: '#cde7da' }}>
              {hero.hole.length ? `Your seat: ${positionOf(t, hi).label}` : 'Sitting out'}
            </div>
            {made && hero.hole.length > 0 && (
              <div style={{ fontWeight: 800 }}>
                {hero.folded
                  ? 'You folded'
                  : t.board.length
                    ? made.label
                    : `${handCode(hero.hole[0], hero.hole[1])} · ${TIER_INFO[tierOfCode(handCode(hero.hole[0], hero.hole[1]))].name} hand`}
              </div>
            )}
            {draw && draw.outs.length >= 4 && <div className="small">+ {draw.label} ({draw.outs.length} outs)</div>}
          </div>
        </div>
      </div>

      {heroTurn && L && coach && (
        <div className="stack mt">
          <div className="choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
            <button className={`btn bad ${showCoach && coach.action === 'fold' ? 'hint' : ''}`} onClick={() => act({ type: 'fold' })}>
              Fold <span className="key">F</span>
            </button>
            {L.canCheck ? (
              <button className={`btn ${showCoach && coach.action === 'check' ? 'hint' : ''}`} onClick={() => act({ type: 'check' })}>
                Check <span className="key">C</span>
              </button>
            ) : (
              <button className={`btn ${showCoach && coach.action === 'call' ? 'hint' : ''}`} onClick={() => act({ type: 'call' })}>
                Call ${L.toCall} <span className="key">C</span>
              </button>
            )}
          </div>
          {L.canRaise && (
            <div className="panel tight stack" style={{ gap: 8 }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="small muted">{t.currentBet === 0 ? 'Bet' : 'Raise to'}:</span>
                {presets.map((pr) => (
                  <button
                    key={pr.label}
                    className={`btn small ${showCoach && coach.action === 'raise' && coach.to === pr.to ? 'hint' : ''}`}
                    onClick={() => act({ type: 'raise', to: pr.to })}
                  >
                    {pr.label} ${pr.to}
                  </button>
                ))}
              </div>
              {L.maxTo > L.minTo && (
                <div className="row" style={{ gap: 8 }}>
                  <input
                    type="range"
                    min={L.minTo}
                    max={L.maxTo}
                    value={custom ?? coach.to ?? L.minTo}
                    onChange={(e) => setCustom(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--gold)' }}
                    aria-label="Custom amount"
                  />
                  <button className={`btn small ${showCoach && coach.action === 'raise' && custom === null ? 'hint' : ''}`} onClick={() => act({ type: 'raise', to: custom ?? coach.to ?? L.minTo })}>
                    {t.currentBet === 0 ? 'Bet' : 'Raise to'} ${custom ?? coach.to ?? L.minTo} <span className="key">R</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {showCoach ? (
            <div className="coach">
              <div className="ch">
                🧑‍🏫 Coach suggests: <span className="rec">{coach.headline}</span>
              </div>
              {coach.equity !== undefined && (
                <div>
                  <div className="small">
                    Win chance ≈ <strong>{Math.round(coach.equity * 100)}%</strong>
                    {coach.needed !== undefined && (
                      <>
                        {' '}
                        · Need <strong>{Math.round(coach.needed * 100)}%</strong> to call
                      </>
                    )}
                  </div>
                  <div className="meter">
                    <div style={{ width: `${coach.equity * 100}%`, background: coach.needed !== undefined && coach.equity < coach.needed ? 'var(--bad)' : 'var(--good)' }} />
                    {coach.needed !== undefined && <div className="need" style={{ width: `${coach.needed * 100}%` }} />}
                  </div>
                </div>
              )}
              <ul className="small" style={{ marginBottom: 0 }}>
                {coach.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <button className="btn ghost small" onClick={() => setPeek(true)}>
              🧑‍🏫 Ask the coach
            </button>
          )}
        </div>
      )}

      {!heroTurn && !t.over && <div className="center muted mt">{t.seats[t.toAct]?.name} is thinking…</div>}

      {t.over && (
        <div className="panel stack mt">
          {t.winners.map((w, i) => (
            <div key={i} className={w.seat === hi ? 'good' : ''} style={{ fontWeight: 800 }}>
              {t.seats[w.seat].isHero ? 'You win' : `${t.seats[w.seat].name} wins`} ${w.amount}
              {w.hand && w.best.length ? ` with ${w.hand}` : w.hand === 'Everyone else folded' ? ' (everyone else folded)' : ''}
            </div>
          ))}
          {t.seats.some((s) => s.showCards && !s.isHero) && (
            <div className="small muted">Shown cards stay up on the table so you can see what everyone had.</div>
          )}
          {hero.stack <= 0 ? (
            <button className="btn primary block" onClick={rebuy}>
              You're out of chips. Rebuy $200
            </button>
          ) : (
            <button className="btn primary block" onClick={nextHand} autoFocus>
              Next hand <span className="key">N</span>
            </button>
          )}
        </div>
      )}

      <div className="section-title">This session</div>
      <div className="panel">
        <div className="row between">
          <span>Hands: <strong>{stats.hands}</strong></span>
          <span>
            Coach agreement: <strong>{stats.decisions ? Math.round((stats.agreed / stats.decisions) * 100) : 0}%</strong>
          </span>
          <span>
            Chips: <strong className={stats.net >= 0 ? 'good' : 'bad'}>{stats.net >= 0 ? '+' : '−'}${Math.abs(stats.net)}</strong>
          </span>
        </div>
        <div className="small faint mt">
          The coach plays a simple, solid style: tight before the flop, bet strong hands, and call only with the right price. Short-term results swing a lot
          in poker; judge yourself on decisions, not chips.
        </div>
      </div>

      <div className="mt">
        <button className="btn small ghost" onClick={() => setShowLog((x) => !x)}>
          {showLog ? 'Hide' : 'Show'} hand log
        </button>
        {showLog && (
          <div className="panel tight small mt" style={{ maxHeight: 220, overflow: 'auto' }}>
            {t.log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </div>
      <p className="small faint mt">
        Keys: <kbd>F</kbd> fold, <kbd>C</kbd> check/call, <kbd>R</kbd> raise, <kbd>N</kbd> next hand. New to this? Do the <Link to="/poker/preflop">preflop practice</Link> first.
      </p>
      {toast && <Toast tone={toast.tone}>{toast.text}</Toast>}
    </Page>
  );
}
