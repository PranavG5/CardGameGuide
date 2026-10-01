import { useEffect, useMemo, useState } from 'react';
import { Page } from '../../components/Layout';
import { PlayingCard } from '../../components/PlayingCard';
import { Seg } from '../../components/ui';
import { type Card, rankFace, sameCard, SUIT_SYMBOL, SUITS, RANKS, deckWithout } from '../../lib/cards';
import { describeMadeHand, findDraws } from '../../lib/poker/draws';
import { equity, type EquityResult } from '../../lib/poker/equity';
import { handCode, tierOfCode, TIER_INFO } from '../../lib/poker/preflop';

type Slot = { group: 'hero' | 'board' | 'opp'; i: number };
const SLOTS: Slot[] = [
  { group: 'hero', i: 0 }, { group: 'hero', i: 1 },
  { group: 'board', i: 0 }, { group: 'board', i: 1 }, { group: 'board', i: 2 }, { group: 'board', i: 3 }, { group: 'board', i: 4 },
  { group: 'opp', i: 0 }, { group: 'opp', i: 1 },
];
const slotKey = (s: Slot) => `${s.group}${s.i}`;

export default function Calculator() {
  const [cards, setCards] = useState<Record<string, Card | null>>({});
  const [active, setActive] = useState<string>('hero0');
  const [opps, setOpps] = useState('1');
  const [res, setRes] = useState<EquityResult | null>(null);

  const used = Object.values(cards).filter(Boolean) as Card[];
  const hero = [cards.hero0, cards.hero1].filter(Boolean) as Card[];
  const boardSlots = [0, 1, 2, 3, 4].map((i) => cards[`board${i}`] ?? null);
  const board = boardSlots.filter(Boolean) as Card[];
  const opp = [cards.opp0, cards.opp1].filter(Boolean) as Card[];
  const boardValid = board.length === 0 || board.length >= 3;
  const oppKnown = opps === '1' && opp.length === 2;

  const place = (c: Card) => {
    if (used.some((u) => sameCard(u, c))) {
      // tapping a used card removes it
      const k = Object.keys(cards).find((key) => cards[key] && sameCard(cards[key]!, c));
      if (k) {
        setCards({ ...cards, [k]: null });
        setActive(k);
      }
      return;
    }
    const next = { ...cards, [active]: c };
    setCards(next);
    const order = SLOTS.map(slotKey).filter((k) => !(opps !== '1' && k.startsWith('opp')));
    const after = order.slice(order.indexOf(active) + 1).concat(order).find((k) => !next[k]);
    if (after) setActive(after);
  };

  const key = useMemo(() => JSON.stringify([hero, board, opps, oppKnown ? opp : null]), [hero, board, opps, oppKnown, opp]);
  useEffect(() => {
    if (hero.length !== 2 || !boardValid) {
      setRes(null);
      return;
    }
    const id = window.setTimeout(() => {
      setRes(equity(hero, board, Number(opps), 5000, oppKnown ? [opp] : []));
    }, 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const randomHand = () => {
    const d = deckWithout([]);
    setCards({ hero0: d[0], hero1: d[1] });
    setActive('board0');
  };

  const made = hero.length === 2 ? describeMadeHand(hero, board) : null;
  const draw = hero.length === 2 && board.length >= 3 && board.length < 5 ? findDraws(hero, board) : null;

  const SlotView = ({ k, label }: { k: string; label?: string }) => (
    <button
      onClick={() => {
        if (cards[k]) setCards({ ...cards, [k]: null });
        setActive(k);
      }}
      style={{ background: 'none', border: 0, padding: 2, borderRadius: 10, outline: active === k ? '3px solid var(--gold)' : undefined, cursor: 'pointer' }}
      aria-label={label ?? k}
    >
      <PlayingCard card={cards[k] ?? null} size="sm" />
    </button>
  );

  return (
    <Page title="Odds calculator" back="/poker" cheat="poker">
      <p className="muted small">Tap a slot, then pick a card. Tap a placed card to remove it. Results update automatically.</p>
      <div className="felt stack" style={{ gap: 10 }}>
        <div className="row between">
          <div>
            <div className="label" style={{ textAlign: 'left' }}>Your hand</div>
            <div className="row" style={{ gap: 4 }}>
              <SlotView k="hero0" label="Your first card" />
              <SlotView k="hero1" label="Your second card" />
            </div>
          </div>
          {opps === '1' && (
            <div>
              <div className="label" style={{ textAlign: 'right' }}>Opponent (optional)</div>
              <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                <SlotView k="opp0" label="Opponent first card" />
                <SlotView k="opp1" label="Opponent second card" />
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="label" style={{ textAlign: 'left' }}>Board (flop, turn, river)</div>
          <div className="row" style={{ gap: 4 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <SlotView key={i} k={`board${i}`} label={`Board card ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="row between mt">
        <div className="row" style={{ gap: 6 }}>
          <span className="small muted">Opponents:</span>
          <Seg value={opps} onChange={setOpps} options={['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }))} />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn small" onClick={randomHand}>🎲 Random</button>
          <button className="btn small ghost" onClick={() => { setCards({}); setActive('hero0'); }}>Clear</button>
        </div>
      </div>

      <div className="panel mt">
        {hero.length < 2 ? (
          <div className="muted center">Pick your two cards to see your odds.</div>
        ) : !boardValid ? (
          <div className="muted center">The board needs 3, 4 or 5 cards (or none for preflop).</div>
        ) : res ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between">
              <div>
                <div className="big-number gold-text">{Math.round(res.equity * 100)}%</div>
                <div className="small muted">
                  chance to win vs {oppKnown ? 'that exact hand' : `${opps} random hand${opps === '1' ? '' : 's'}`}
                </div>
              </div>
              <div className="small" style={{ textAlign: 'right' }}>
                Win {(res.win * 100).toFixed(1)}%<br />
                Split {(res.tie * 100).toFixed(1)}%
              </div>
            </div>
            <div className="meter">
              <div style={{ width: `${res.equity * 100}%` }} />
            </div>
            {board.length === 0 && (
              <div className="small">
                Starting hand: <strong>{handCode(hero[0], hero[1])}</strong> ({TIER_INFO[tierOfCode(handCode(hero[0], hero[1]))].name}). A "fair share" against{' '}
                {opps} opponent{opps === '1' ? '' : 's'} is {Math.round(100 / (Number(opps) + 1))}%.
              </div>
            )}
            {made && board.length > 0 && (
              <div className="small">
                You have <strong>{made.label}</strong>. {made.detail}
              </div>
            )}
            {draw && draw.outs.length > 0 && (
              <div className="small">
                Draw: <strong>{draw.label}</strong>, {draw.outs.length} outs.
              </div>
            )}
          </div>
        ) : (
          <div className="muted center">Calculating…</div>
        )}
      </div>

      <div className="section-title">Pick a card {active ? `for ${active.replace(/\d/, ' ').replace('hero', 'your hand').replace('board', 'the board').replace('opp', 'opponent')}` : ''}</div>
      <div className="stack" style={{ gap: 6 }}>
        {SUITS.map((s) => (
          <div key={s} style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 3 }}>
            {[...RANKS].reverse().map((r) => {
              const c = { rank: r, suit: s };
              const isUsed = used.some((u) => sameCard(u, c));
              const red = s === 'h' || s === 'd';
              return (
                <button
                  key={r}
                  onClick={() => place(c)}
                  style={{
                    aspectRatio: '0.75',
                    borderRadius: 6,
                    border: 0,
                    background: isUsed ? 'rgba(255,255,255,0.15)' : '#fff',
                    color: isUsed ? 'var(--faint)' : red ? 'var(--card-red)' : 'var(--card-black)',
                    fontWeight: 800,
                    fontSize: 'clamp(0.6rem, 2.6vw, 0.85rem)',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1.05,
                  }}
                  aria-label={`${rankFace(r)} of ${s}`}
                >
                  {rankFace(r)}
                  <br />
                  {SUIT_SYMBOL[s]}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="small faint mt">Odds are estimated by dealing out 5,000 random run-outs. Real opponents don't play random hands, so treat this as a guide.</p>
    </Page>
  );
}
