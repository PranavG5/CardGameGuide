import { type Card, type Rank, deckWithout, makeDeck, pick, randInt, sameCard, shuffle, SUITS, RANKS } from '../lib/cards';
import { Category, evaluate, explainComparison } from '../lib/poker/evaluator';
import { findDraws, describeMadeHand } from '../lib/poker/draws';
import { hitChance, ruleOf24 } from '../lib/poker/equity';
import {
  cardsForCode, POSITION_INFO, preflopAdvice, randomTrainingCode, tierOfCode, TIER_INFO,
  type Position, type Scenario, type Tier,
} from '../lib/poker/preflop';
import { weakSpots } from '../lib/progress';
import { CardRow } from '../components/PlayingCard';
import { RANKINGS } from '../components/RankingsList';
import type { Question } from './types';

const pctTxt = (x: number) => `${Math.round(x * 100)}%`;

function fromWeak(prefix: string, focus: boolean): string | null {
  const weak = weakSpots(prefix);
  if (!weak.length) return null;
  if (focus || Math.random() < 0.25) return pick(weak);
  return null;
}

/* ---------------- Preflop ---------------- */

const SCENARIO_TEXT: Record<Scenario, string> = {
  unopened: 'Everyone before you folded.',
  raised: 'A player before you raised to 3 big blinds.',
};

export function preflopQuestion(focus: boolean): Question {
  let code = randomTrainingCode();
  let pos: Position = pick(['early', 'middle', 'late', 'late', 'sb'] as Position[]);
  let scen: Scenario = Math.random() < 0.7 ? 'unopened' : 'raised';
  if (scen === 'raised' && Math.random() < 0.3) pos = 'bb';
  const w = fromWeak('pf:', focus);
  if (w) {
    const [, c, p, s] = w.split(':');
    code = c;
    pos = p as Position;
    scen = s as Scenario;
  }
  const cards = cardsForCode(code);
  const adv = preflopAdvice(code, pos, scen);
  const tier = tierOfCode(code);
  return {
    key: `pf:${code}:${pos}:${scen}`,
    prompt: `You're in ${POSITION_INFO[pos].name.toLowerCase()} with ${code}. ${SCENARIO_TEXT[scen]} What do you do?`,
    visual: (
      <div className="felt">
        <div className="row center" style={{ gap: 8, marginBottom: 10 }}>
          <span className="pill">📍 {POSITION_INFO[pos].name} ({POSITION_INFO[pos].seats})</span>
          <span className="pill">{scen === 'unopened' ? '🟢 Folded to you' : '🔴 Facing a raise'}</span>
        </div>
        <CardRow cards={cards} center size="lg" deal />
      </div>
    ),
    choices: [
      { value: 'fold', label: 'Fold' },
      { value: 'call', label: 'Call' },
      { value: 'raise', label: scen === 'unopened' ? 'Raise' : 'Re-raise' },
    ],
    answer: adv.action,
    explain: (
      <span>
        <TierBadge tier={tier} /> {adv.reason}
        {scen === 'unopened' && adv.action !== 'call' && <span className="faint"> Tip: when everyone folds to you, calling ("limping") is almost never right. Raise or fold.</span>}
      </span>
    ),
  };
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="pill" style={{ background: TIER_INFO[tier].color, borderColor: TIER_INFO[tier].color, color: '#fff' }}>
      {TIER_INFO[tier].name}
    </span>
  );
}

export function tierQuestion(focus: boolean): Question {
  let code = randomTrainingCode();
  const w = fromWeak('tier:', focus);
  if (w) code = w.split(':')[1];
  const tier = tierOfCode(code);
  return {
    key: `tier:${code}`,
    prompt: `Which group does ${code} belong to?`,
    visual: (
      <div className="felt">
        <CardRow cards={cardsForCode(code)} center size="lg" deal />
        <div className="center small" style={{ marginTop: 8, color: '#cde7da' }}>
          {code.length === 2 ? 'Pocket pair' : code.endsWith('s') ? 'Suited (same suit)' : 'Offsuit (different suits)'}
        </div>
      </div>
    ),
    choices: ([1, 2, 3, 4, 5, 6] as Tier[]).map((t) => ({ value: String(t), label: TIER_INFO[t].name })),
    columns: 3,
    answer: String(tier),
    explain: <span>{code} is <strong>{TIER_INFO[tier].name}</strong>. {TIER_INFO[tier].blurb}</span>,
  };
}

/* ---------------- Rankings ---------------- */

export function compareCategoryQuestion(focus: boolean): Question {
  let a = randInt(0, 9);
  let b = randInt(0, 9);
  while (b === a) b = randInt(0, 9);
  const w = fromWeak('rk:', focus);
  if (w) [a, b] = w.split(':')[1].split('-').map(Number);
  if (Math.random() < 0.5) [a, b] = [b, a];
  const ra = RANKINGS[a];
  const rb = RANKINGS[b];
  const winner = a < b ? 'a' : 'b';
  const key = `rk:${Math.min(a, b)}-${Math.max(a, b)}`;
  return {
    key,
    prompt: 'Which hand wins?',
    visual: (
      <div className="grid-2">
        <div className="felt center">
          <div className="label">Hand A</div>
          <CardRow cards={parseList(ra.cards)} center size="sm" />
        </div>
        <div className="felt center">
          <div className="label">Hand B</div>
          <CardRow cards={parseList(rb.cards)} center size="sm" />
        </div>
      </div>
    ),
    choices: [
      { value: 'a', label: 'Hand A', sub: ra.name },
      { value: 'b', label: 'Hand B', sub: rb.name },
    ],
    answer: winner,
    explain: (
      <span>
        {(winner === 'a' ? ra : rb).name} (#{Math.min(a, b) + 1}) beats {(winner === 'a' ? rb : ra).name} (#{Math.max(a, b) + 1}). The rarer the hand, the higher it ranks.
      </span>
    ),
  };
}

const parseList = (s: string): Card[] =>
  s.split(' ').map((x) => {
    const map: Record<string, Rank> = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
    const r = map[x[0]] ?? (Number(x[0]) as Rank);
    return { rank: r, suit: x[1] as Card['suit'] };
  });

/** Build a random 5-card hand of a target category. */
function buildHand(cat: Category, royal = false): Card[] {
  for (let tries = 0; tries < 200; tries++) {
    const suit = pick(SUITS);
    const ranks = shuffle(RANKS);
    let cards: Card[] = [];
    const mixed = (rs: number[]) => {
      const used: Card[] = [];
      for (const r of rs) {
        const options = SUITS.filter((s) => !used.some((u) => u.rank === r && u.suit === s));
        used.push({ rank: r as Rank, suit: pick(options) });
      }
      return used;
    };
    switch (cat) {
      case Category.StraightFlush: {
        const hi = royal ? 14 : randInt(5, 13);
        const rs = hi === 5 ? [5, 4, 3, 2, 14] : [hi, hi - 1, hi - 2, hi - 3, hi - 4];
        cards = rs.map((r) => ({ rank: r as Rank, suit }));
        break;
      }
      case Category.Quads: cards = mixed([ranks[0], ranks[0], ranks[0], ranks[0], ranks[1]]); break;
      case Category.FullHouse: cards = mixed([ranks[0], ranks[0], ranks[0], ranks[1], ranks[1]]); break;
      case Category.Flush: cards = ranks.slice(0, 5).map((r) => ({ rank: r, suit })); break;
      case Category.Straight: {
        const hi = randInt(5, 14);
        const rs = hi === 5 ? [5, 4, 3, 2, 14] : [hi, hi - 1, hi - 2, hi - 3, hi - 4];
        cards = mixed(rs);
        break;
      }
      case Category.Trips: cards = mixed([ranks[0], ranks[0], ranks[0], ranks[1], ranks[2]]); break;
      case Category.TwoPair: cards = mixed([ranks[0], ranks[0], ranks[1], ranks[1], ranks[2]]); break;
      case Category.Pair: cards = mixed([ranks[0], ranks[0], ranks[1], ranks[2], ranks[3]]); break;
      default: cards = mixed(ranks.slice(0, 5));
    }
    const res = evaluate(cards);
    if (res.category === cat && (cat !== Category.StraightFlush || (res.name === 'Royal Flush') === royal)) return cards;
  }
  throw new Error('could not build hand');
}

const NAME_CHOICES = [
  'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card',
];

/** Target: index into NAME_CHOICES. */
function targetCategory(idx: number): { cat: Category; royal: boolean } {
  const cats = [Category.StraightFlush, Category.StraightFlush, Category.Quads, Category.FullHouse, Category.Flush, Category.Straight, Category.Trips, Category.TwoPair, Category.Pair, Category.HighCard];
  return { cat: cats[idx], royal: idx === 0 };
}

export function nameHandQuestion(focus: boolean, seven: boolean): Question {
  let idx = randInt(0, 9);
  // royal and straight flushes are rare; show them less
  if (idx <= 1 && Math.random() < 0.6) idx = randInt(2, 9);
  const w = fromWeak(seven ? 'nh7:' : 'nh5:', focus);
  if (w) idx = NAME_CHOICES.indexOf(w.split(':')[1]);
  const { cat, royal } = targetCategory(idx);
  let hole: Card[] = [];
  let board: Card[] = [];
  let five = buildHand(cat, royal);
  if (seven) {
    for (let tries = 0; tries < 300; tries++) {
      const base = buildHand(cat, royal);
      const extra = deckWithout(base).slice(0, 2);
      const all = shuffle([...base, ...extra]);
      const res = evaluate(all);
      if (res.category === cat && (cat !== Category.StraightFlush || (res.name === 'Royal Flush') === royal)) {
        hole = all.slice(0, 2);
        board = all.slice(2);
        five = res.best;
        break;
      }
    }
    if (!hole.length) {
      hole = five.slice(0, 2);
      board = [...five.slice(2), ...deckWithout(five).slice(0, 2)];
    }
  }
  const res = evaluate(seven ? [...hole, ...board] : five);
  const name = res.name;
  return {
    key: `${seven ? 'nh7' : 'nh5'}:${name}`,
    prompt: seven ? 'What is your best five-card hand?' : 'Name this hand.',
    visual: seven ? (
      <div className="felt">
        <div className="label">Board</div>
        <CardRow cards={board} center size="md" deal />
        <div className="divider" />
        <div className="label">Your cards</div>
        <CardRow cards={hole} center size="md" deal />
      </div>
    ) : (
      <div className="felt">
        <CardRow cards={shuffle(five)} center size="md" deal />
      </div>
    ),
    choices: NAME_CHOICES.map((n) => ({ value: n, label: n })),
    columns: 2,
    answer: name,
    explain: (
      <span>
        {res.description}.{' '}
        {seven && (
          <>
            Best five cards: <CardRow cards={res.best} size="sm" />{' '}
            {res.best.every((c) => board.some((b) => sameCard(b, c))) ? 'All five are on the board, so everyone shares this hand.' : ''}
          </>
        )}
      </span>
    ),
  };
}

/* ---------------- Showdown ---------------- */

export function showdownQuestion(focus: boolean): Question {
  const wantType = focus ? pick(['same', 'tie'] as const) : pick(['diff', 'same', 'same', 'same', 'tie'] as const);
  let board: Card[] = [];
  let a: Card[] = [];
  let b: Card[] = [];
  for (let tries = 0; tries < 3000; tries++) {
    const deck = shuffle(makeDeck());
    a = deck.slice(0, 2);
    b = deck.slice(2, 4);
    board = deck.slice(4, 9);
    const ra = evaluate([...a, ...board]);
    const rb = evaluate([...b, ...board]);
    const type = ra.score === rb.score ? 'tie' : ra.category === rb.category ? 'same' : 'diff';
    if (type === wantType && (type !== 'same' || ra.category <= Category.FullHouse)) break;
  }
  const ra = evaluate([...a, ...board]);
  const rb = evaluate([...b, ...board]);
  const answer = ra.score > rb.score ? 'a' : rb.score > ra.score ? 'b' : 'tie';
  return {
    key: `sd:${answer === 'tie' ? 'tie' : ra.category === rb.category ? `same-${ra.category}` : 'diff'}`,
    prompt: 'Who wins this pot?',
    visual: (
      <div className="felt">
        <div className="label">Board</div>
        <CardRow cards={board} center size="md" deal />
        <div className="divider" />
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="center">
            <div className="label">Player A</div>
            <CardRow cards={a} center size="md" />
          </div>
          <div className="center">
            <div className="label">Player B</div>
            <CardRow cards={b} center size="md" />
          </div>
        </div>
      </div>
    ),
    choices: [
      { value: 'a', label: 'Player A' },
      { value: 'tie', label: 'Split pot' },
      { value: 'b', label: 'Player B' },
    ],
    columns: 3,
    answer,
    explain: (
      <div className="stack" style={{ gap: 8 }}>
        <div>
          <strong>A:</strong> {ra.description} <CardRow cards={ra.best} size="sm" />
        </div>
        <div>
          <strong>B:</strong> {rb.description} <CardRow cards={rb.best} size="sm" />
        </div>
        <div>{explainComparison(ra, rb)}</div>
      </div>
    ),
  };
}

/* ---------------- Draws and outs ---------------- */

interface DrawSpot {
  hole: Card[];
  board: Card[];
  info: ReturnType<typeof findDraws>;
}

function drawSpot(allowNone: boolean): DrawSpot {
  for (let tries = 0; tries < 4000; tries++) {
    const deck = shuffle(makeDeck());
    const hole = deck.slice(0, 2);
    const board = deck.slice(2, 5);
    if (hole[0].rank === hole[1].rank) continue;
    if (new Set(board.map((c) => c.rank)).size < 3) continue;
    const cat = evaluate([...hole, ...board]).category;
    if (cat > Category.Pair) continue;
    const info = findDraws(hole, board);
    const n = info.outs.length;
    if (n === 0) {
      if (allowNone && Math.random() < 0.15) return { hole, board, info };
      continue;
    }
    if (![4, 8, 9, 12, 15].includes(n)) continue;
    // Prefer showing combo draws and open-enders a bit more often than their natural rate.
    if (n === 9 && Math.random() < 0.3) continue;
    return { hole, board, info };
  }
  const hole = parseList('9h 8h');
  const board = parseList('7h 6c 2h');
  return { hole, board, info: findDraws(hole, board) };
}

const DRAW_CHOICES = [
  { value: 'Flush draw', label: 'Flush draw' },
  { value: 'Open-ended straight draw', label: 'Open-ended straight' },
  { value: 'Gutshot straight draw', label: 'Gutshot straight' },
  { value: 'combo', label: 'Flush + straight draw' },
  { value: 'none', label: 'No draw' },
];

function drawAnswer(info: DrawSpot['info']): string {
  if (info.flushDraw && info.straightDraw) return 'combo';
  if (info.flushDraw) return 'Flush draw';
  if (info.straightDraw === 'open-ended' || info.straightDraw === 'double-gutshot') return 'Open-ended straight draw';
  if (info.straightDraw === 'gutshot') return 'Gutshot straight draw';
  return 'none';
}

function outsExplain(spot: DrawSpot) {
  const { info } = spot;
  const n = info.outs.length;
  const parts: string[] = [];
  if (info.flushDraw) parts.push('Flush draw: 13 cards per suit minus the 4 you can see = 9 outs.');
  if (info.straightDraw === 'open-ended') parts.push('Open-ended straight draw: 4 cards on either end = 8 outs.');
  if (info.straightDraw === 'double-gutshot') parts.push('Double gutshot: two different "inside" cards complete it = 8 outs (it plays like an open-ender).');
  if (info.straightDraw === 'gutshot') parts.push('Gutshot: only one rank fills the gap = 4 outs.');
  if (info.flushDraw && info.straightDraw) parts.push(`Some cards complete both, so don't count them twice: ${n} outs total.`);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div>
        <strong>{info.label}</strong>. {parts.join(' ')}
      </div>
      {n > 0 && (
        <>
          <div className="small">Your outs:</div>
          <CardRow cards={info.outs} size="sm" />
          <div className="small">
            Rule of 4 (two cards to come): {n} × 4 ≈ <strong>{pctTxt(ruleOf24(n, 2))}</strong> (exact {pctTxt(hitChance(n, 47, 2))}). Rule of 2 (one card): {n} × 2 ≈{' '}
            <strong>{pctTxt(ruleOf24(n, 1))}</strong> (exact {pctTxt(hitChance(n, 47, 1))}).
          </div>
        </>
      )}
      <div className="small faint">You have: {describeMadeHand(spot.hole, spot.board).label}.</div>
    </div>
  );
}

const flopVisual = (s: DrawSpot) => (
  <div className="felt">
    <div className="label">Flop</div>
    <CardRow cards={[...s.board, null, null]} center size="md" deal />
    <div className="divider" />
    <div className="label">Your cards</div>
    <CardRow cards={s.hole} center size="lg" deal />
  </div>
);

export function drawQuestion(): Question {
  const spot = drawSpot(true);
  const answer = drawAnswer(spot.info);
  return {
    key: `dr:${answer}`,
    prompt: 'What are you drawing to?',
    visual: flopVisual(spot),
    choices: DRAW_CHOICES,
    columns: 2,
    answer,
    explain: outsExplain(spot),
  };
}

export function outsQuestion(): Question {
  const spot = drawSpot(false);
  const n = spot.info.outs.length;
  return {
    key: `outs:${n}`,
    prompt: 'How many outs do you have to make a straight or flush?',
    visual: flopVisual(spot),
    choices: [4, 8, 9, 12, 15].map((x) => ({ value: String(x), label: String(x) })),
    columns: 5,
    answer: String(n),
    explain: outsExplain(spot),
  };
}

/* ---------------- Pot odds ---------------- */

const BET_SIZES = [
  { frac: 1 / 4, label: 'a quarter of the pot' },
  { frac: 1 / 3, label: 'a third of the pot' },
  { frac: 1 / 2, label: 'half the pot' },
  { frac: 3 / 4, label: 'three-quarters of the pot' },
  { frac: 1, label: 'the size of the pot' },
  { frac: 2, label: 'twice the pot' },
];

export function priceQuestion(): Question {
  const size = pick(BET_SIZES);
  // Pots divisible by 12 keep every bet size a whole number.
  const potBefore = pick([36, 48, 60, 120, 180, 240, 300]);
  const bet = potBefore * size.frac;
  const options = BET_SIZES.map((b) => Math.round((b.frac / (1 + 2 * b.frac)) * 100));
  const answer = String(Math.round((size.frac / (1 + 2 * size.frac)) * 100));
  return {
    key: `price:${size.frac.toFixed(2)}`,
    prompt: `The pot is $${potBefore}. Your opponent bets $${bet} (${size.label}). How often do you need to win to make calling worth it?`,
    visual: <PotVisual pot={potBefore} bet={bet} />,
    choices: options.map((o) => ({ value: String(o), label: `${o}%` })),
    columns: 4,
    answer,
    explain: (
      <span>
        You call ${bet} to win ${potBefore + bet} (the pot plus their bet). Your share of the final pot is ${bet} ÷ ${potBefore + 2 * bet} = <strong>{answer}%</strong>. If you win more often than that, calling makes money.
        <br />
        <span className="faint">Shortcut: half-pot bet → 25%, pot-size bet → 33%.</span>
      </span>
    ),
  };
}

export function callFoldQuestion(): Question {
  const draws = [
    { name: 'a flush draw', outs: 9 },
    { name: 'an open-ended straight draw', outs: 8 },
    { name: 'a gutshot straight draw', outs: 4 },
    { name: 'a flush draw plus a straight draw', outs: 15 },
    { name: 'a flush draw plus a gutshot', outs: 12 },
  ];
  for (let tries = 0; tries < 200; tries++) {
    const d = pick(draws);
    const size = pick(BET_SIZES);
    const potBefore = pick([48, 60, 96, 120, 180, 240]);
    const bet = potBefore * size.frac;
    const need = bet / (potBefore + 2 * bet);
    const eq = hitChance(d.outs, 46, 1);
    if (Math.abs(eq - need) < 0.04) continue;
    const answer = eq > need ? 'call' : 'fold';
    return {
      key: `cf:${d.outs}:${size.frac.toFixed(2)}`,
      prompt: `Turn card is out. You have ${d.name} (${d.outs} outs). The pot is $${potBefore} and your opponent bets $${bet}. Call or fold?`,
      visual: <PotVisual pot={potBefore} bet={bet} outs={d.outs} />,
      choices: [
        { value: 'fold', label: 'Fold' },
        { value: 'call', label: 'Call' },
      ],
      answer,
      explain: (
        <span>
          One card to come: {d.outs} outs × 2 ≈ {d.outs * 2}% (exact {pctTxt(eq)}). You need {pctTxt(need)} to call ${bet} into a ${potBefore + bet} pot.{' '}
          {answer === 'call' ? 'Your chance is higher than the price, so call.' : "Your chance is lower than the price, so fold. Chasing draws without the right price is a classic leak."}
        </span>
      ),
    };
  }
  return priceQuestion();
}

function PotVisual({ pot, bet, outs }: { pot: number; bet: number; outs?: number }) {
  return (
    <div className="felt center">
      <div className="row center" style={{ gap: 10 }}>
        <span className="pill" style={{ fontSize: '1rem' }}>💰 Pot ${pot}</span>
        <span className="pill" style={{ fontSize: '1rem' }}>➡️ Bet ${bet}</span>
        {outs && <span className="pill" style={{ fontSize: '1rem' }}>🎯 {outs} outs</span>}
      </div>
    </div>
  );
}

/* ---------------- Daily mix ---------------- */

export function randomPokerQuestion(): Question {
  const roll = Math.random();
  if (roll < 0.3) return preflopQuestion(false);
  if (roll < 0.45) return nameHandQuestion(false, true);
  if (roll < 0.6) return showdownQuestion(false);
  if (roll < 0.75) return outsQuestion();
  if (roll < 0.87) return callFoldQuestion();
  return compareCategoryQuestion(false);
}
