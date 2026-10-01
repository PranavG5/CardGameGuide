import { type Card, type Suit, rankName, rankPlural } from '../cards';

export enum Category {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
}

export const CATEGORY_NAME: Record<Category, string> = {
  [Category.HighCard]: 'High Card',
  [Category.Pair]: 'One Pair',
  [Category.TwoPair]: 'Two Pair',
  [Category.Trips]: 'Three of a Kind',
  [Category.Straight]: 'Straight',
  [Category.Flush]: 'Flush',
  [Category.FullHouse]: 'Full House',
  [Category.Quads]: 'Four of a Kind',
  [Category.StraightFlush]: 'Straight Flush',
};

export interface HandResult {
  /** Higher is better. Comparable across any two results. */
  score: number;
  category: Category;
  /** Ranks that define the hand, most important first (e.g. [13,13,13,5,5]). */
  ranks: number[];
  /** The five (or fewer) cards that make the hand. */
  best: Card[];
  /** Short name like "Flush" or "Royal Flush". */
  name: string;
  /** Full description like "Full House, Kings full of Fives". */
  description: string;
}

const pack = (cat: number, ks: number[]) => {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * 16 + (ks[i] ?? 0);
  return s;
};

/** Highest straight in a rank bitmask (bit r set for rank r, ace also at bit 1). Returns top rank or 0. */
function straightHigh(mask: number): number {
  for (let hi = 14; hi >= 5; hi--) {
    const need = 0b11111 << (hi - 4);
    if ((mask & need) === need) return hi;
  }
  return 0;
}

const straightRanks = (hi: number) => (hi === 5 ? [5, 4, 3, 2, 14] : [hi, hi - 1, hi - 2, hi - 3, hi - 4]);

/** Fast numeric score for 1-7 cards. Used in Monte Carlo loops. */
export function scoreHand(cards: Card[]): number {
  const counts = new Array<number>(15).fill(0);
  const suitMask: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  const suitCount: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  let mask = 0;
  for (const c of cards) {
    counts[c.rank]++;
    const bit = (1 << c.rank) | (c.rank === 14 ? 2 : 0);
    mask |= bit;
    suitMask[c.suit] |= bit;
    suitCount[c.suit]++;
  }

  let flushSuit: Suit | null = null;
  for (const s of ['s', 'h', 'd', 'c'] as Suit[]) if (suitCount[s] >= 5) flushSuit = s;

  if (flushSuit) {
    const sf = straightHigh(suitMask[flushSuit]);
    if (sf) return pack(Category.StraightFlush, [sf]);
  }

  let quad = 0;
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let r = 14; r >= 2; r--) {
    const n = counts[r];
    if (n === 4) quad = r;
    else if (n === 3) trips.push(r);
    else if (n === 2) pairs.push(r);
    else if (n === 1) singles.push(r);
  }

  if (quad) {
    let kicker = 0;
    for (let r = 14; r >= 2; r--) if (r !== quad && counts[r] > 0) { kicker = r; break; }
    return pack(Category.Quads, [quad, kicker]);
  }
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const t = trips[0];
    const p = Math.max(trips[1] ?? 0, pairs[0] ?? 0);
    return pack(Category.FullHouse, [t, p]);
  }
  if (flushSuit) {
    const ks: number[] = [];
    for (let r = 14; r >= 2 && ks.length < 5; r--) if (suitMask[flushSuit] & (1 << r)) ks.push(r);
    return pack(Category.Flush, ks);
  }
  const st = straightHigh(mask);
  if (st) return pack(Category.Straight, [st]);
  if (trips.length) {
    const ks = [...pairs, ...singles].sort((a, b) => b - a).slice(0, 2);
    return pack(Category.Trips, [trips[0], ...ks]);
  }
  if (pairs.length >= 2) {
    const [p1, p2] = pairs;
    let kicker = 0;
    for (let r = 14; r >= 2; r--) if (r !== p1 && r !== p2 && counts[r] > 0) { kicker = r; break; }
    return pack(Category.TwoPair, [p1, p2, kicker]);
  }
  if (pairs.length === 1) {
    return pack(Category.Pair, [pairs[0], ...singles.slice(0, 3)]);
  }
  return pack(Category.HighCard, singles.slice(0, 5));
}

export const categoryOf = (score: number) => Math.floor(score / 16 ** 5) as Category;

function unpack(score: number): number[] {
  const out: number[] = [];
  let s = score;
  for (let i = 0; i < 5; i++) {
    out.unshift(s % 16);
    s = Math.floor(s / 16);
  }
  return out;
}

/** Full evaluation with the best cards and a human readable description. */
export function evaluate(cards: Card[]): HandResult {
  const score = scoreHand(cards);
  const category = categoryOf(score);
  const k = unpack(score);
  let ranks: number[];
  let suit: Suit | null = null;

  switch (category) {
    case Category.StraightFlush:
    case Category.Straight:
      ranks = straightRanks(k[0]);
      break;
    case Category.Quads:
      ranks = [k[0], k[0], k[0], k[0], k[1]];
      break;
    case Category.FullHouse:
      ranks = [k[0], k[0], k[0], k[1], k[1]];
      break;
    case Category.Trips:
      ranks = [k[0], k[0], k[0], k[1], k[2]];
      break;
    case Category.TwoPair:
      ranks = [k[0], k[0], k[1], k[1], k[2]];
      break;
    case Category.Pair:
      ranks = [k[0], k[0], k[1], k[2], k[3]];
      break;
    default:
      ranks = k.slice();
  }
  ranks = ranks.filter((r) => r > 0).slice(0, Math.min(5, cards.length));

  if (category === Category.Flush || category === Category.StraightFlush) {
    const tally: Record<string, number> = {};
    for (const c of cards) tally[c.suit] = (tally[c.suit] ?? 0) + 1;
    suit = (Object.keys(tally) as Suit[]).find((s) => tally[s] >= 5) ?? null;
  }

  const used = new Set<number>();
  const best: Card[] = [];
  for (const r of ranks) {
    const idx = cards.findIndex((c, i) => !used.has(i) && c.rank === r && (!suit || c.suit === suit));
    if (idx >= 0) {
      used.add(idx);
      best.push(cards[idx]);
    }
  }

  return { score, category, ranks, best, ...describe(category, k) };
}

function describe(category: Category, k: number[]): { name: string; description: string } {
  const n = rankName;
  const p = rankPlural;
  switch (category) {
    case Category.StraightFlush:
      if (k[0] === 14) return { name: 'Royal Flush', description: 'Royal Flush (Ace-high straight flush)' };
      return { name: 'Straight Flush', description: `Straight Flush, ${n(k[0])} high` };
    case Category.Quads:
      return { name: 'Four of a Kind', description: `Four of a Kind, ${p(k[0])}` };
    case Category.FullHouse:
      return { name: 'Full House', description: `Full House, ${p(k[0])} full of ${p(k[1])}` };
    case Category.Flush:
      return { name: 'Flush', description: `Flush, ${n(k[0])} high` };
    case Category.Straight:
      return { name: 'Straight', description: `Straight, ${n(k[0])} high` };
    case Category.Trips:
      return { name: 'Three of a Kind', description: `Three of a Kind, ${p(k[0])}` };
    case Category.TwoPair:
      return { name: 'Two Pair', description: `Two Pair, ${p(k[0])} and ${p(k[1])}` };
    case Category.Pair:
      return { name: 'One Pair', description: `Pair of ${p(k[0])}` };
    default:
      return { name: 'High Card', description: `${n(k[0])} high` };
  }
}

/** Plain-English reason why hand a beats (or ties) hand b. */
export function explainComparison(a: HandResult, b: HandResult): string {
  if (a.score === b.score) {
    return `Both players make the exact same five-card hand (${a.description}), so the pot is split.`;
  }
  const [win, lose] = a.score > b.score ? [a, b] : [b, a];
  if (win.category !== lose.category) {
    return `${win.name} beats ${lose.name}. Higher categories always win, no matter the card ranks.`;
  }
  const wk = unpack(win.score);
  const lk = unpack(lose.score);
  const i = wk.findIndex((r, idx) => r !== lk[idx]);
  const wr = rankName(wk[i]);
  const lr = rankName(lk[i]);
  switch (win.category) {
    case Category.Pair:
      return i === 0
        ? `Both have one pair, but ${rankPlural(wk[0])} beat ${rankPlural(lk[0])}.`
        : `Both have a pair of ${rankPlural(wk[0])}, so the kicker decides: ${wr} beats ${lr}.`;
    case Category.TwoPair:
      if (i === 0) return `Both have two pair. Compare the top pair first: ${rankPlural(wk[0])} beat ${rankPlural(lk[0])}.`;
      if (i === 1) return `Both have ${rankPlural(wk[0])} as the top pair, so the second pair decides: ${rankPlural(wk[1])} beat ${rankPlural(lk[1])}.`;
      return `Same two pair, so the fifth card (kicker) decides: ${wr} beats ${lr}.`;
    case Category.Trips:
      return i === 0
        ? `Both have three of a kind, but ${rankPlural(wk[0])} beat ${rankPlural(lk[0])}.`
        : `Same three of a kind, so the kicker decides: ${wr} beats ${lr}.`;
    case Category.FullHouse:
      return i === 0
        ? `Both have a full house. The three-of-a-kind part is compared first: ${rankPlural(wk[0])} beat ${rankPlural(lk[0])}.`
        : `Same three-of-a-kind part, so the pair decides: ${rankPlural(wk[1])} beat ${rankPlural(lk[1])}.`;
    case Category.Quads:
      return i === 0
        ? `Both have four of a kind: ${rankPlural(wk[0])} beat ${rankPlural(lk[0])}.`
        : `Same four of a kind, so the kicker decides: ${wr} beats ${lr}.`;
    case Category.Straight:
    case Category.StraightFlush:
      return `Both have a ${win.name.toLowerCase()}, and the higher top card wins: ${wr}-high beats ${lr}-high.`;
    case Category.Flush:
      return i === 0
        ? `Both have a flush. Compare the highest card first: ${wr} beats ${lr}.`
        : `Both flushes share the top cards, so the next highest card decides: ${wr} beats ${lr}.`;
    default:
      return i === 0
        ? `Nobody has a pair, so the highest card wins: ${wr} beats ${lr}.`
        : `Same high card, so the next card decides: ${wr} beats ${lr}.`;
  }
}
