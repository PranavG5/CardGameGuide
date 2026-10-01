import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { CardRow } from '../../components/PlayingCard';
import { money, Toast } from '../../components/ui';
import { act, type BJState, deal, dealerStep, newGame, options, resolveInsurance, roundNet, trueCount, type Result } from '../../lib/blackjack/engine';
import { bjValue, handTotal, totalLabel, upLabel } from '../../lib/blackjack/hand';
import { advise, INSURANCE_TIP, MOVE_LABEL, type Move, type Rules } from '../../lib/blackjack/strategy';
import { addHands, recordAnswer, setBankroll, updateSettings, useProgress } from '../../lib/progress';

const CHIPS = [
  { v: 5, color: '#c0392b' },
  { v: 10, color: '#2563eb' },
  { v: 25, color: '#15803d' },
  { v: 100, color: '#111827' },
];

const RESULT_TEXT: Record<Result, string> = {
  win: 'Win',
  lose: 'Lose',
  push: 'Push',
  blackjack: 'Blackjack!',
  surrender: 'Surrendered',
  bust: 'Bust',
};

interface Mistake {
  hand: string;
  up: string;
  chose: string;
  right: string;
  why: string;
}

export default function BlackjackPlay() {
  const p = useProgress();
  const rules: Rules = useMemo(() => ({ h17: p.settings.h17, surrender: p.settings.surrender, das: p.settings.das }), [p.settings.h17, p.settings.surrender, p.settings.das]);
  const coach = p.settings.coach;
  const [s, setS] = useState<BJState>(() => newGame(p.bjBankroll > 0 ? p.bjBankroll : 1000));
  const [bet, setBet] = useState(10);
  const [hints, setHints] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [toast, setToast] = useState<{ tone: 'ok' | 'no'; text: string } | null>(null);
  const [stats, setStats] = useState({ hands: 0, decisions: 0, correct: 0, net: 0 });
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const settled = useRef(true);
  const toastTimer = useRef<number | undefined>(undefined);

  const flash = (tone: 'ok' | 'no', text: string, ms = tone === 'ok' ? 1100 : 4200) => {
    window.clearTimeout(toastTimer.current);
    setToast({ tone, text });
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  // Dealer plays automatically, one card at a time.
  useEffect(() => {
    if (s.phase !== 'dealer') return;
    const id = window.setTimeout(() => setS((prev) => dealerStep(prev, rules)), 700);
    return () => window.clearTimeout(id);
  }, [s, rules]);

  // Round finished: save bankroll and stats once.
  useEffect(() => {
    if (s.phase === 'done' && !settled.current) {
      settled.current = true;
      setBankroll(s.bankroll);
      addHands('bj');
      setStats((st) => ({ ...st, hands: st.hands + 1, net: st.net + roundNet(s) }));
    }
  }, [s]);

  const up = s.dealer.length ? bjValue(s.dealer[0].rank) : 0;
  const hand = s.hands[s.active];
  const opts = options(s, rules);
  const advice = s.phase === 'player' && hand ? advise(hand.cards, up, rules, opts) : null;

  const startRound = useCallback(() => {
    const b = Math.min(bet, s.bankroll);
    if (b <= 0) return;
    settled.current = false;
    setToast(null);
    setS(deal(s, b));
  }, [bet, s]);

  const doMove = (m: Move) => {
    if (!hand || !advice) return;
    const ok = advice.move === m;
    const { total, soft } = handTotal(hand.cards);
    const pairV = hand.cards.length === 2 && bjValue(hand.cards[0].rank) === bjValue(hand.cards[1].rank) ? bjValue(hand.cards[0].rank) : 0;
    let key: string | null = null;
    if (hand.cards.length === 2) {
      if (pairV && advice.table === 'pair') key = `bj:pair:${pairV}:${up}`;
      else if (soft && total >= 13 && total <= 20) key = `bj:soft:${total}:${up}`;
      else if (!soft && total >= 5 && total <= 19) key = `bj:hard:${total}:${up}`;
    }
    recordAnswer('bj-play', key, ok, ok ? 4 : 1);
    setStats((st) => ({ ...st, decisions: st.decisions + 1, correct: st.correct + (ok ? 1 : 0) }));
    if (!ok) {
      setMistakes((ms) => [{ hand: totalLabel(hand.cards), up: upLabel(up), chose: MOVE_LABEL[m], right: MOVE_LABEL[advice.move], why: advice.reason }, ...ms].slice(0, 20));
    }
    if (coach) {
      if (ok) flash('ok', `✓ ${MOVE_LABEL[m]} is right.`);
      else flash('no', `✗ Basic strategy says ${MOVE_LABEL[advice.move]}. ${advice.reason}`);
    }
    setS(act(s, m, rules));
  };

  const insurance = (take: boolean) => {
    recordAnswer('bj-play', null, !take, take ? 1 : 4);
    setStats((st) => ({ ...st, decisions: st.decisions + 1, correct: st.correct + (take ? 0 : 1) }));
    if (take) {
      setMistakes((ms) => [{ hand: totalLabel(s.hands[0].cards), up: 'A', chose: 'Insurance', right: 'No insurance', why: INSURANCE_TIP }, ...ms].slice(0, 20));
      if (coach) flash('no', `✗ ${INSURANCE_TIP}`);
    } else if (coach) flash('ok', '✓ Right: never take insurance.');
    setS(resolveInsurance(s, take));
  };

  // Keyboard: H S D P R, Enter to deal.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const key = e.key.toLowerCase();
      if (s.phase === 'player') {
        const map: Record<string, Move> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };
        const m = map[key];
        if (!m) return;
        const allowed = { hit: opts.canHit, stand: opts.canStand, double: opts.canDouble, split: opts.canSplit, surrender: opts.canSurrender }[m];
        if (allowed) doMove(m);
      } else if ((s.phase === 'betting' || s.phase === 'done') && (key === 'enter' || key === ' ')) {
        if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
        e.preventDefault();
        startRound();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const betting = s.phase === 'betting' || s.phase === 'done';
  const broke = betting && s.bankroll < 5;
  const net = s.phase === 'done' ? roundNet(s) : 0;

  const moveBtn = (m: Move, allowed: boolean, keyHint: string) =>
    allowed || m !== 'surrender' ? (
      <button key={m} className={`btn ${hints && advice?.move === m ? 'hint' : ''}`} disabled={!allowed} onClick={() => doMove(m)}>
        {MOVE_LABEL[m]} <span className="key">{keyHint}</span>
      </button>
    ) : null;

  return (
    <Page title="Blackjack table" back="/blackjack" cheat="blackjack">
      <div className="row between mb">
        <span className="pill" style={{ fontSize: '0.95rem' }}>
          💵 {money(s.bankroll)}
        </span>
        <div className="row" style={{ gap: 6 }}>
          <label className="pill" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={coach} onChange={(e) => updateSettings({ coach: e.target.checked })} /> Coach
          </label>
          <label className="pill" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} /> Hints
          </label>
          <label className="pill" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={showCount} onChange={(e) => setShowCount(e.target.checked)} /> Count
          </label>
        </div>
      </div>

      <div className="felt">
        <div className="label">
          Dealer {s.dealer.length > 0 && <span className="total" style={{ marginTop: 0, marginLeft: 6 }}>{s.holeRevealed ? totalLabel(s.dealer) : `Shows ${upLabel(up)}`}</span>}
        </div>
        <div style={{ minHeight: 100 }}>
          {s.dealer.length ? (
            <CardRow cards={s.holeRevealed ? s.dealer : [s.dealer[0], s.dealer[1]]} hideIndex={s.holeRevealed ? undefined : 1} center size="md" deal />
          ) : (
            <div className="center muted small" style={{ paddingTop: 30 }}>
              Dealer {rules.h17 ? 'hits' : 'stands on'} soft 17 · Blackjack pays 3 to 2
            </div>
          )}
        </div>
        <div className="divider" />
        <div className="row center" style={{ gap: 18, alignItems: 'flex-start', minHeight: 130 }}>
          {s.hands.length === 0 && <div className="muted small" style={{ paddingTop: 40 }}>Place a bet to deal.</div>}
          {s.hands.map((h, i) => {
            const activeHand = s.phase === 'player' && i === s.active && s.hands.length > 1;
            return (
              <div key={i} className="center" style={{ padding: 6, borderRadius: 12, outline: activeHand ? '2px solid var(--gold)' : undefined }}>
                <CardRow cards={h.cards} center size="lg" deal />
                <div>
                  <span className="total">{totalLabel(h.cards)}</span>{' '}
                  <span className="total" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    {money(h.bet)}
                    {h.doubled ? ' ×2' : ''}
                  </span>
                </div>
                {h.result && (
                  <div style={{ marginTop: 6, fontWeight: 800 }} className={(h.net ?? 0) > 0 ? 'good' : (h.net ?? 0) < 0 ? 'bad' : ''}>
                    {RESULT_TEXT[h.result]} {h.net ? `${h.net > 0 ? '+' : ''}${money(h.net)}` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {showCount && (
          <div className="center small" style={{ marginTop: 10 }}>
            Running count <strong>{s.runningCount > 0 ? `+${s.runningCount}` : s.runningCount}</strong> · True count{' '}
            <strong>{trueCount(s).toFixed(1)}</strong> · {Math.round(s.shoe.length / 52 * 10) / 10} decks left
            {s.justShuffled && <span className="faint"> (new shoe)</span>}
          </div>
        )}
      </div>

      <div className="mt">
        {s.phase === 'insurance' && (
          <div className="panel stack">
            <strong>The dealer shows an Ace. Insurance?</strong>
            <div className="small muted">Insurance costs half your bet ({money(s.hands[0].bet / 2)}) and pays 2 to 1 if the dealer has blackjack.</div>
            <div className="grid-2">
              <button className={`btn ${hints ? 'hint' : ''}`} onClick={() => insurance(false)}>
                No insurance
              </button>
              <button className="btn" onClick={() => insurance(true)} disabled={s.bankroll < s.hands[0].bet / 2}>
                Take insurance
              </button>
            </div>
          </div>
        )}

        {s.phase === 'player' && (
          <div className="stack">
            <div className="choices">
              {moveBtn('hit', opts.canHit, 'H')}
              {moveBtn('stand', opts.canStand, 'S')}
              {moveBtn('double', opts.canDouble, 'D')}
              {moveBtn('split', opts.canSplit, 'P')}
              {moveBtn('surrender', opts.canSurrender, 'R')}
            </div>
            {hints && advice && (
              <div className="coach small">
                <div className="ch">
                  🧑‍🏫 Coach: <span className="rec">{MOVE_LABEL[advice.move]}</span>
                </div>
                {advice.reason}
              </div>
            )}
          </div>
        )}

        {s.phase === 'dealer' && <div className="center muted">Dealer is playing…</div>}

        {betting && (
          <div className="panel stack">
            {s.phase === 'done' && (
              <div className={`center ${net > 0 ? 'good' : net < 0 ? 'bad' : ''}`} style={{ fontWeight: 900, fontSize: '1.3rem' }}>
                {net > 0 ? `You won ${money(net)}!` : net < 0 ? `You lost ${money(-net)}` : 'Push: bet returned'}
                {s.insuranceNet !== 0 && <div className="small muted">(includes insurance {s.insuranceNet > 0 ? '+' : ''}{money(s.insuranceNet)})</div>}
              </div>
            )}
            {broke ? (
              <div className="center stack">
                <div>You're out of chips. That's what a bad run looks like, and why a budget matters.</div>
                <button
                  className="btn primary"
                  onClick={() => {
                    setS(newGame(1000));
                    setBankroll(1000);
                  }}
                >
                  Reset to $1,000
                </button>
              </div>
            ) : (
              <>
                <div className="row between">
                  <span>
                    Bet: <strong className="gold-text">{money(Math.min(bet, s.bankroll))}</strong>
                  </span>
                  <button className="btn small ghost" onClick={() => setBet(0)}>
                    Clear
                  </button>
                </div>
                <div className="chip-stack">
                  {CHIPS.map((c) => (
                    <button key={c.v} className="chip" style={{ background: c.color }} onClick={() => setBet((b) => Math.min(s.bankroll, 500, b + c.v))} disabled={c.v > s.bankroll}>
                      ${c.v}
                    </button>
                  ))}
                </div>
                <button className="btn primary block" onClick={startRound} disabled={Math.min(bet, s.bankroll) < 1}>
                  Deal {money(Math.min(bet, s.bankroll))} <span className="key">Enter</span>
                </button>
                <div className="small faint center">Tip: bet the same amount every hand while you learn. Changing bets based on "feel" doesn't change the odds.</div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="section-title">This session</div>
      <div className="panel">
        <div className="row between">
          <span>Hands: <strong>{stats.hands}</strong></span>
          <span>
            Correct decisions: <strong>{stats.decisions ? Math.round((stats.correct / stats.decisions) * 100) : 0}%</strong> ({stats.correct}/{stats.decisions})
          </span>
          <span>
            Result: <strong className={stats.net >= 0 ? 'good' : 'bad'}>{stats.net >= 0 ? '+' : ''}{money(stats.net)}</strong>
          </span>
        </div>
        {stats.hands >= 5 && stats.decisions > 0 && stats.correct === stats.decisions && (
          <div className="small good mt">Perfect basic strategy so far. Short-term results still swing; that's normal.</div>
        )}
      </div>
      {mistakes.length > 0 && (
        <>
          <div className="section-title">Your mistakes to review</div>
          <div className="stack">
            {mistakes.map((m, i) => (
              <div key={i} className="panel tight small">
                <strong>
                  {m.hand} vs {m.up}:
                </strong>{' '}
                you chose <span className="bad">{m.chose}</span>, best is <span className="good">{m.right}</span>.<div className="muted">{m.why}</div>
              </div>
            ))}
            <Link to="/blackjack/practice" className="btn">
              Drill your mistakes in Practice →
            </Link>
          </div>
        </>
      )}
      {toast && <Toast tone={toast.tone}>{toast.text}</Toast>}
    </Page>
  );
}
