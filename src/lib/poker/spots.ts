import { type Card, makeDeck, pick, sameCard, deckWithout, shuffle } from '../cards';
import { Category, categoryOf, scoreHand } from './evaluator';
import { describeMadeHand, findDraws, type DrawInfo, type MadeHand } from './draws';
import {
  cardsForCode, handCode, preflopAdvice, randomTrainingCode, tierOfCode,
  type Position, type PreflopAdvice, type Scenario, type Tier,
} from './preflop';

/*
 * Random decision spots for the "Fold, check or raise" trainer.
 *
 * Postflop answers are pure math: we simulate thousands of run-outs against
 * the hands opponents realistically hold in that spot, then compare your win
 * chance (equity) with the price of calling and with a value-betting line.
 * Preflop answers come from the starting-hand chart.
 */

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type PostStreet = Exclude<Street, 'preflop'>;
/** 'call' doubles as check when nobody has bet. 'raise' doubles as bet. */
export type SpotAction = 'fold' | 'call' | 'raise';
export type HandClass = 'monster' | 'strong' | 'medium' | 'weak' | 'draw' | 'air';

export const CLASS_INFO: Record<HandClass, { name: string; example: string }> = {
  monster: { name: 'Monster', example: 'sets, straights, flushes, full houses' },
  strong: { name: 'Strong hand', example: 'top pair good kicker, overpairs, two pair' },
  medium: { name: 'Medium hand', example: 'top pair weak kicker, board-paired two pair' },
  weak: { name: 'Weak pair', example: 'middle pair, bottom pair, underpairs' },
  draw: { name: 'Draw', example: 'flush draws, open-ended straight draws' },
  air: { name: 'Nothing', example: 'no pair and no real draw' },
};

export const CLASS_ORDER: HandClass[] = ['monster', 'strong', 'medium', 'weak', 'draw', 'air'];

/** Equity you need to raise a bet, by number of opponents (index). */
export const RAISE_AT = [0, 0.62, 0.5, 0.42];
/** Equity you need to bet when nobody has bet yet, by number of opponents. */
export const BET_AT = [0, 0.55, 0.43, 0.36];
/** On the river only better hands call a bet, so value bets need a little more. */
export const BET_AT_RIVER = [0, 0.6, 0.47, 0.4];

export const BET_SIZES = [
  { frac: 1 / 3, label: '⅓ pot' },
  { frac: 1 / 2, label: '½ pot' },
  { frac: 2 / 3, label: '⅔ pot' },
  { frac: 3 / 4, label: '¾ pot' },
  { frac: 1, label: 'pot' },
  { frac: 1.5, label: '1.5× pot' },
];

const POTS: Record<PostStreet, number[]> = {
  flop: [12, 14, 18, 20, 24, 30, 36],
  turn: [30, 40, 48, 60, 72, 90],
  river: [50, 64, 80, 100, 120, 160],
};

/* ---------------- Hand classes ---------------- */

export function classify(hero: Card[], board: Card[], made = describeMadeHand(hero, board), draws = findDraws(hero, board)): HandClass {
  if (made.strength >= 4) return 'monster';
  if (made.strength === 3) return 'strong';
  if (made.strength === 2) return 'medium';
  const realDraw = board.length < 5 && (draws.flushDraw || draws.straightDraw === 'open-ended' || draws.straightDraw === 'double-gutshot');
  if (realDraw) return 'draw';
  return made.strength === 1 ? 'weak' : 'air';
}

/* ---------------- Opponent ranges ---------------- */

// Fast starting-hand tier lookup for the simulation loop.
const TIER_FAST = new Uint8Array(15 * 15 * 2);
for (let a = 2; a <= 14; a++)
  for (let b = 2; b <= 14; b++)
    for (const s of [0, 1]) {
      const code = handCode({ rank: a as Card['rank'], suit: 's' }, { rank: b as Card['rank'], suit: s ? 's' : 'h' });
      TIER_FAST[(a * 15 + b) * 2 + s] = tierOfCode(code);
    }
const tierFast = (a: Card, b: Card) => TIER_FAST[(a.rank * 15 + b.rank) * 2 + (a.suit === b.suit ? 1 : 0)];

/**
 * How well a hand connects with the board:
 * 0 nothing, 1 a pair, 2 top pair or an overpair, 3 two pair or better.
 */
export function connectLevel(hole: Card[], board: Card[], boardScore = scoreHand(board), topBoard = Math.max(...board.map((c) => c.rank))): number {
  const cat = categoryOf(scoreHand([...hole, ...board]));
  const bcat = categoryOf(boardScore);
  if (cat <= bcat) return 0;
  if (cat >= Category.Trips || (cat === Category.TwoPair && bcat === Category.HighCard)) return 3;
  const pocket = hole[0].rank === hole[1].rank;
  const top = pocket ? hole[0].rank > topBoard : hole[0].rank === topBoard || hole[1].rank === topBoard;
  return top ? 2 : 1;
}

/** Flush draw or open-ended straight draw that uses a hole card. */
export function hasStrongDraw(hole: Card[], board: Card[]): boolean {
  if (board.length >= 5) return false;
  const all = [...hole, ...board];
  for (const h of hole) {
    let n = 0;
    for (const c of all) if (c.suit === h.suit) n++;
    if (n === 4) return true;
  }
  let mask = 0;
  let holeMask = 0;
  for (const c of all) mask |= 1 << c.rank;
  for (const c of hole) holeMask |= 1 << c.rank;
  if (mask & (1 << 14)) mask |= 1 << 1;
  if (holeMask & (1 << 14)) holeMask |= 1 << 1;
  // four in a row with a free card on both ends (A-2-3-4 and J-Q-K-A are one-ended)
  for (let lo = 3; lo <= 10; lo++) {
    const w = 0b1111 << lo;
    if ((mask & w) === w && holeMask & w) return true;
  }
  return false;
}

interface OppModel {
  /** Minimum connect level when the hand is not a bluff. */
  minLevel: number;
  /** A strong draw counts as this connect level. */
  drawLevel: number;
  /** Chance this player has any hand at all (a bluff or a loose call). */
  free: number;
}

/** What each opponent is likely to hold, given the action so far. */
function opponentModels(opponents: number, bet: number, pot: number): OppModel[] {
  if (bet <= 0) return new Array(opponents).fill({ minLevel: 0, drawLevel: 0, free: 1 });
  const frac = bet / pot;
  // Bigger bets show stronger hands, but also carry more bluffs:
  // a balanced player bluffs about bet / (pot + 2 × bet) of the time.
  const bettor: OppModel = { minLevel: frac <= 0.5 ? 1 : frac <= 1 ? 2 : 3, drawLevel: 2, free: frac / (1 + 2 * frac) };
  const caller: OppModel = { minLevel: 1, drawLevel: 1, free: 0.4 };
  return [bettor, ...new Array(opponents - 1).fill(caller)];
}

export interface EquityResult {
  win: number;
  tie: number;
  equity: number;
}

/** Monte Carlo equity against opponents drawn from realistic ranges. */
export function spotEquity(hero: Card[], board: Card[], opponents: number, bet: number, pot: number, iterations = 2000): EquityResult {
  const models = opponentModels(opponents, bet, pot);
  const dead = [...hero, ...board];
  const deck = makeDeck().filter((c) => !dead.some((d) => sameCard(d, c)));
  const boardScore = scoreHand(board);
  const topBoard = Math.max(...board.map((c) => c.rank));
  const needBoard = 5 - board.length;
  let win = 0;
  let tie = 0;

  for (let it = 0; it < iterations; it++) {
    let top = deck.length;
    const draw = () => {
      const j = Math.floor(Math.random() * top);
      top--;
      const tmp = deck[j];
      deck[j] = deck[top];
      deck[top] = tmp;
      return tmp;
    };
    const opps: Card[][] = [];
    for (const m of models) {
      // most players only see a flop with a playable hand; some play anything
      const loose = Math.random() < 0.2;
      const free = Math.random() < m.free;
      let a = draw();
      let b = draw();
      for (let tries = 0; tries < 40; tries++) {
        let ok = loose || tierFast(a, b) <= 5;
        if (ok && !free) {
          let lvl = connectLevel([a, b], board, boardScore, topBoard);
          if (lvl < m.minLevel && m.drawLevel > lvl && hasStrongDraw([a, b], board)) lvl = m.drawLevel;
          ok = lvl >= m.minLevel;
        }
        if (ok) break;
        top += 2; // put both back and redraw
        a = draw();
        b = draw();
      }
      opps.push([a, b]);
    }
    const runout = board.slice();
    for (let i = 0; i < needBoard; i++) runout.push(draw());
    const heroScore = scoreHand([...hero, ...runout]);
    let best = 0;
    let bestCount = 0;
    for (const o of opps) {
      const s = scoreHand([...o, ...runout]);
      if (s > best) {
        best = s;
        bestCount = 1;
      } else if (s === best) bestCount++;
    }
    if (heroScore > best) win++;
    else if (heroScore === best) tie += 1 / (bestCount + 1);
  }
  return { win: win / iterations, tie: tie / iterations, equity: (win + tie) / iterations };
}

/* ---------------- Spots ---------------- */

export interface PostflopSpot {
  kind: 'post';
  street: PostStreet;
  hero: Card[];
  board: Card[];
  /** Opponents still in the hand. All of them have acted; you close the action. */
  opponents: number;
  /** Pot before this street's bet. */
  pot: number;
  /** Bet you face (0 means everyone checked to you). Every other opponent called it. */
  bet: number;
  betLabel: string;
}

export interface PostflopSolution {
  answer: SpotAction;
  equity: number;
  win: number;
  tie: number;
  /** Equity needed to call (0 when nobody bet). */
  need: number;
  /** Equity needed to raise or bet. */
  line: number;
  /** Pot after you call. */
  total: number;
  /** Average profit of calling, in dollars (0 when nobody bet). */
  evCall: number;
  /** How far equity is from the nearest decision line. Small means a close spot. */
  margin: number;
  made: MadeHand;
  draws: DrawInfo;
  cls: HandClass;
}

export interface PreflopSpot {
  kind: 'pre';
  street: 'preflop';
  hero: Card[];
  code: string;
  tier: Tier;
  position: Position;
  scenario: Scenario;
  advice: PreflopAdvice;
}

export type Spot = (PostflopSpot & { sol: PostflopSolution }) | PreflopSpot;

export function solvePostflop(spot: PostflopSpot, iterations = 2000): PostflopSolution {
  const { hero, board, opponents: n, pot, bet } = spot;
  const r = spotEquity(hero, board, n, bet, pot, iterations);
  const made = describeMadeHand(hero, board);
  const draws = findDraws(hero, board);
  const cls = classify(hero, board, made, draws);
  const eq = r.equity;
  let answer: SpotAction;
  let need = 0;
  let line: number;
  let total = pot;
  let evCall = 0;
  let margin: number;
  if (bet > 0) {
    total = pot + bet * n + bet;
    need = bet / total;
    evCall = eq * total - bet;
    line = Math.max(RAISE_AT[n], need + 0.08);
    answer = eq < need ? 'fold' : eq >= line ? 'raise' : 'call';
    margin = Math.min(Math.abs(eq - need), Math.abs(eq - line));
  } else {
    line = (spot.street === 'river' ? BET_AT_RIVER : BET_AT)[n];
    answer = eq >= line ? 'raise' : 'call';
    margin = Math.abs(eq - line);
  }
  return { answer, equity: eq, win: r.win, tie: r.tie, need, line, total, evCall, margin, made, draws, cls };
}

const CLASS_MIX: HandClass[] = ['monster', 'strong', 'strong', 'medium', 'medium', 'weak', 'weak', 'draw', 'draw', 'air', 'air'];

/** A random postflop spot. Hand types are mixed so you see every kind of decision. */
export function randomPostflopSpot(street?: PostStreet): PostflopSpot {
  const st: PostStreet = street ?? pick(['flop', 'flop', 'turn', 'turn', 'river'] as PostStreet[]);
  const boardLen = st === 'flop' ? 3 : st === 'turn' ? 4 : 5;
  const mix = st === 'river' ? CLASS_MIX.filter((c) => c !== 'draw') : CLASS_MIX;
  const target = pick(mix);
  let hero: Card[] = [];
  let board: Card[] = [];
  for (let tries = 0; tries < 300; tries++) {
    hero = Math.random() < 0.75 ? cardsForCode(randomTrainingCode()) : shuffle(makeDeck()).slice(0, 2);
    board = deckWithout(hero).slice(0, boardLen);
    if (classify(hero, board) === target) break;
  }
  const opponents = pick([1, 1, 1, 1, 1, 2, 2, 2, 3]);
  const pot = pick(POTS[st]);
  const facing = Math.random() < 0.55;
  const size = pick(BET_SIZES);
  const bet = facing ? Math.max(2, Math.round(pot * size.frac)) : 0;
  return { kind: 'post', street: st, hero, board, opponents, pot, bet, betLabel: facing ? size.label : '' };
}

export function randomPreflopSpot(): PreflopSpot {
  const code = randomTrainingCode();
  let position: Position = pick(['early', 'middle', 'late', 'late', 'sb'] as Position[]);
  const scenario: Scenario = Math.random() < 0.65 ? 'unopened' : 'raised';
  if (scenario === 'raised' && Math.random() < 0.3) position = 'bb';
  return {
    kind: 'pre',
    street: 'preflop',
    hero: cardsForCode(code),
    code,
    tier: tierOfCode(code),
    position,
    scenario,
    advice: preflopAdvice(code, position, scenario),
  };
}

export type StreetFilter = Street | 'mixed';

/** Make a spot with a clear right answer (close spots within a few percent are skipped). */
export function makeSpot(filter: StreetFilter = 'mixed', minMargin = 0.035): Spot {
  const preflop = filter === 'preflop' || (filter === 'mixed' && Math.random() < 0.2);
  if (preflop) return randomPreflopSpot();
  const street = filter === 'mixed' ? undefined : (filter as PostStreet);
  let last: (PostflopSpot & { sol: PostflopSolution }) | null = null;
  for (let tries = 0; tries < 10; tries++) {
    const spot = randomPostflopSpot(street);
    const sol = solvePostflop(spot, 1500);
    last = { ...spot, sol };
    if (sol.margin >= minMargin) break;
  }
  return last!;
}

/* ---------------- Mistake types ---------------- */

export type Leak = 'tooLoose' | 'tooTight' | 'tooPassive' | 'tooAggressive' | 'foldFree';

export const LEAK_INFO: Record<Leak, { name: string; tip: string }> = {
  tooLoose: { name: 'Called or raised when you should fold', tip: 'Compare your win chance with the price. If it is lower, let the hand go.' },
  tooTight: { name: 'Folded when you should play', tip: 'Small bets give you a great price. You do not need the best hand to call, only enough equity.' },
  tooPassive: { name: 'Checked or called with a hand worth raising', tip: 'When you are well ahead, bet or raise so worse hands pay you.' },
  tooAggressive: { name: 'Bet or raised a hand that should check or call', tip: 'Medium hands and draws usually win more by keeping the pot small.' },
  foldFree: { name: 'Folded when you could check for free', tip: 'Never fold when checking costs nothing. You keep your chance to win.' },
};

export function leakOf(chosen: SpotAction, answer: SpotAction, canCheck: boolean): Leak | null {
  if (chosen === answer) return null;
  if (chosen === 'fold') return canCheck ? 'foldFree' : 'tooTight';
  if (answer === 'fold') return 'tooLoose';
  if (answer === 'raise') return 'tooPassive';
  return 'tooAggressive';
}

/** Stats key for a spot, used to track accuracy by hand type. */
export const spotKey = (s: Spot) =>
  s.kind === 'pre' ? `sp:preflop:t${s.tier}:${s.scenario}` : `sp:${s.street}:${s.sol.cls}:${s.bet > 0 ? 'bet' : 'check'}`;
