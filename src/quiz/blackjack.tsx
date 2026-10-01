import type { Card, Rank } from '../lib/cards';
import { pick, randInt, SUITS } from '../lib/cards';
import { advise, MOVE_LABEL, type Move, type Rules, startOptions, UPCARDS } from '../lib/blackjack/strategy';
import { startingEVs } from '../lib/blackjack/ev';
import { handTotal, totalLabel, upLabel } from '../lib/blackjack/hand';
import { weakSpots } from '../lib/progress';
import { CardRow } from '../components/PlayingCard';
import { ChartRow, type ChartTable } from '../components/StrategyChart';
import type { Question } from './types';

const TEN_RANKS: Rank[] = [10, 11, 12, 13];
const cardOf = (v: number): Card => ({
  rank: (v === 11 ? 14 : v === 10 ? pick(TEN_RANKS) : v) as Rank,
  suit: pick(SUITS),
});

/** Situations beginners get wrong most often. */
const TRICKY: [ChartTable, number, number][] = [
  ['hard', 12, 2], ['hard', 12, 3], ['hard', 12, 4], ['hard', 16, 7], ['hard', 16, 10], ['hard', 15, 10], ['hard', 13, 2],
  ['hard', 11, 10], ['hard', 11, 11], ['hard', 10, 9], ['hard', 10, 10], ['hard', 9, 2], ['hard', 9, 3], ['hard', 9, 7],
  ['soft', 18, 2], ['soft', 18, 3], ['soft', 18, 9], ['soft', 18, 10], ['soft', 18, 11], ['soft', 17, 2], ['soft', 17, 7],
  ['soft', 19, 6], ['soft', 13, 5], ['soft', 15, 4], ['soft', 16, 6],
  ['pair', 9, 7], ['pair', 9, 9], ['pair', 9, 11], ['pair', 8, 10], ['pair', 8, 11], ['pair', 4, 5], ['pair', 2, 7],
  ['pair', 6, 2], ['pair', 6, 7], ['pair', 5, 9], ['pair', 10, 6], ['pair', 11, 11], ['pair', 7, 8],
];

function cardsFor(table: ChartTable, row: number): Card[] {
  if (table === 'pair') {
    const a = cardOf(row);
    return [a, { rank: a.rank, suit: pick(SUITS.filter((s) => s !== a.suit)) }];
  }
  if (table === 'soft') return [cardOf(11), cardOf(row - 11)];
  // hard: two different non-ace values that add up to row
  const options: [number, number][] = [];
  for (let a = 2; a <= 10; a++) {
    const b = row - a;
    if (b >= 2 && b <= 10 && a !== b) options.push([a, b]);
  }
  const [a, b] = pick(options);
  return [cardOf(a), cardOf(b)];
}

function randomSpot(): [ChartTable, number, number] {
  const roll = Math.random();
  const up = pick(UPCARDS);
  if (roll < 0.25) return pick(TRICKY);
  if (roll < 0.6) return ['hard', randInt(5, 19), up];
  if (roll < 0.8) return ['soft', randInt(13, 20), up];
  return ['pair', randInt(2, 11), up];
}

export function bjQuestion(rules: Rules, focus: boolean): Question {
  let spot = randomSpot();
  if (focus) {
    const weak = weakSpots('bj:');
    if (weak.length) {
      const [, t, r, u] = pick(weak).split(':');
      spot = [t as ChartTable, Number(r), Number(u)];
    }
  } else if (Math.random() < 0.25) {
    // spaced repetition: bring back a past mistake now and then
    const weak = weakSpots('bj:');
    if (weak.length) {
      const [, t, r, u] = pick(weak).split(':');
      spot = [t as ChartTable, Number(r), Number(u)];
    }
  }
  const [table, row, up] = spot;
  const cards = cardsFor(table, row);
  const dealerUp = cardOf(up);
  const adv = advise(cards, up, rules, startOptions(rules));
  const isPairHand = table === 'pair';
  const moves: Move[] = ['hit', 'stand', 'double'];
  if (isPairHand) moves.push('split');
  if (rules.surrender) moves.push('surrender');
  const { total, soft } = handTotal(cards);
  const chartRow = table === 'hard' ? Math.max(8, Math.min(17, total)) : row;
  const v = (c: Card) => (c.rank === 14 ? 11 : Math.min(10, c.rank));
  const evs = startingEVs(v(cards[0]), v(cards[1]), up, rules);

  return {
    key: `bj:${table}:${row}:${up}`,
    prompt: `You have ${soft ? 'soft ' : ''}${total}${isPairHand ? ` (a pair of ${row === 11 ? 'Aces' : row + 's'})` : ''}. Dealer shows ${upLabel(up)}. What's the best play?`,
    visual: (
      <div className="felt">
        <div className="label">Dealer</div>
        <CardRow cards={[dealerUp, null]} hideIndex={1} center size="md" deal />
        <div className="divider" />
        <div className="label">You</div>
        <CardRow cards={cards} center size="lg" deal />
        <div className="center">
          <span className="total">{totalLabel(cards)}</span>
        </div>
      </div>
    ),
    choices: moves.map((m) => ({ value: m, label: MOVE_LABEL[m] })),
    answer: adv.move,
    explain: <span>{adv.reason}</span>,
    extra: () => (
      <div className="mt">
        <div className="small muted" style={{ marginBottom: 4 }}>
          On the strategy chart ({table === 'pair' ? 'pairs' : table} table):
        </div>
        <ChartRow table={table} row={chartRow} up={up} rules={rules} />
        <EvList evs={evs} chart={adv.move} moves={moves} />
      </div>
    ),
  };
}

export function EvList({ evs, chart, moves }: { evs: Partial<Record<Move, number>>; chart: Move; moves: Move[] }) {
  const rows = moves.filter((m) => evs[m] !== undefined).map((m) => ({ m, ev: evs[m]! })).sort((a, b) => b.ev - a.ev);
  const max = Math.max(...rows.map((r) => Math.abs(r.ev)), 0.01);
  const top = rows[0];
  const close = top.m !== chart && top.ev - (evs[chart] ?? 0) < 0.02;
  return (
    <div className="mt">
      <div className="small muted">Average result per $100 bet if you made this play every time:</div>
      <div className="ev-list">
        {rows.map((r) => {
          const w = (Math.abs(r.ev) / max) * 50;
          const dollars = Math.round(r.ev * 100);
          return (
            <div key={r.m} className={`ev-row ${r.m === chart ? 'best' : ''}`}>
              <span>
                {MOVE_LABEL[r.m]} {r.m === chart ? '✓' : ''}
              </span>
              <div className="ev-bar">
                <div style={{ left: r.ev >= 0 ? '50%' : `${50 - w}%`, width: `${w}%`, background: r.ev >= 0 ? 'var(--good)' : 'var(--bad)' }} />
              </div>
              <span className={dollars >= 0 ? 'good' : 'bad'} style={{ textAlign: 'right' }}>
                {dollars >= 0 ? '+' : '−'}${Math.abs(dollars)}
              </span>
            </div>
          );
        })}
      </div>
      {close && <div className="small faint mt">Close call: these plays are nearly identical in the long run. The chart (built for 6 decks) picks {MOVE_LABEL[chart]}.</div>}
      {rows.every((r) => r.ev < 0) && <div className="small faint mt">Every option loses money here. Basic strategy picks the one that loses the least.</div>}
    </div>
  );
}
