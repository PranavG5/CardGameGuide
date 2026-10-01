import { type Card, type Rank, rankChar, pick, RANKS, SUITS, shuffle } from '../cards';

/** Starting hand code like "AKs", "AKo" or "QQ". */
export function handCode(a: Card, b: Card): string {
  const [hi, lo] = a.rank >= b.rank ? [a, b] : [b, a];
  if (hi.rank === lo.rank) return rankChar(hi.rank) + rankChar(lo.rank);
  return rankChar(hi.rank) + rankChar(lo.rank) + (hi.suit === lo.suit ? 's' : 'o');
}

export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

export const TIER_INFO: Record<Tier, { name: string; short: string; color: string; blurb: string }> = {
  1: { name: 'Premium', short: 'Premium', color: '#7c3aed', blurb: 'The best hands in poker. Always raise, and re-raise if someone raised before you.' },
  2: { name: 'Strong', short: 'Strong', color: '#2563eb', blurb: 'Raise from any position. Call if someone raised before you.' },
  3: { name: 'Good', short: 'Good', color: '#0891b2', blurb: 'Raise from any position when nobody has raised yet. Usually fold to a raise.' },
  4: { name: 'Playable', short: 'Playable', color: '#059669', blurb: 'Raise from middle or late position when nobody has raised yet.' },
  5: { name: 'Speculative', short: 'Spec.', color: '#ca8a04', blurb: 'Only raise from late position (cutoff or button) when everyone folded to you.' },
  6: { name: 'Fold', short: 'Fold', color: '#6b7280', blurb: 'Not worth playing. Folding these saves you a lot of money.' },
};

const TIERS: Record<Exclude<Tier, 6>, string[]> = {
  1: ['AA', 'KK', 'QQ', 'AKs', 'AKo'],
  2: ['JJ', 'TT', 'AQs', 'AQo', 'AJs', 'KQs'],
  3: ['99', '88', 'ATs', 'KJs', 'KTs', 'QJs', 'JTs', 'AJo', 'KQo'],
  4: ['77', '66', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'QTs', 'J9s', 'T9s', '98s', 'ATo', 'KJo', 'QJo'],
  5: ['55', '44', '33', '22', 'K9s', 'Q9s', 'T8s', '87s', '76s', '65s', '54s', 'A9o', 'KTo', 'QTo', 'JTo'],
};

const TIER_OF = new Map<string, Tier>();
for (const t of [1, 2, 3, 4, 5] as const) for (const code of TIERS[t]) TIER_OF.set(code, t);

export const tierOfCode = (code: string): Tier => TIER_OF.get(code) ?? 6;
export const tierOf = (a: Card, b: Card): Tier => tierOfCode(handCode(a, b));

export type Position = 'early' | 'middle' | 'late' | 'sb' | 'bb';

export const POSITION_INFO: Record<Position, { name: string; seats: string; blurb: string }> = {
  early: { name: 'Early position', seats: 'UTG, UTG+1', blurb: 'First to act with many players behind you. Play only your best hands.' },
  middle: { name: 'Middle position', seats: 'Lojack, Hijack', blurb: 'Some players already folded. You can open a few more hands.' },
  late: { name: 'Late position', seats: 'Cutoff, Button', blurb: 'The best seats. You act last after the flop, so you can play the most hands.' },
  sb: { name: 'Small blind', seats: 'SB', blurb: 'You already have half a bet in, but you act first after the flop. Play fairly tight.' },
  bb: { name: 'Big blind', seats: 'BB', blurb: 'You already have a full bet in, so calling a raise is cheaper here.' },
};

/** Worst tier you should open-raise with when everyone folds to you. */
export const OPEN_UP_TO: Record<Position, Tier> = { early: 3, middle: 4, late: 5, sb: 4, bb: 5 };

export type PreflopAction = 'fold' | 'call' | 'raise';
export type Scenario = 'unopened' | 'raised';

export interface PreflopAdvice {
  action: PreflopAction;
  reason: string;
}

/** Beginner preflop strategy. Simple, tight and aggressive. */
export function preflopAdvice(code: string, position: Position, scenario: Scenario): PreflopAdvice {
  const tier = tierOfCode(code);
  const tname = TIER_INFO[tier].name;
  if (scenario === 'unopened') {
    const limit = OPEN_UP_TO[position];
    if (tier <= limit) {
      return {
        action: 'raise',
        reason: `${code} is a ${tname} hand. From ${POSITION_INFO[position].name.toLowerCase()} you open-raise with ${limitText(limit)}. When you play a hand, come in with a raise, not a call: it builds the pot when you're ahead and can win the blinds right away.`,
      };
    }
    return {
      action: 'fold',
      reason:
        tier === 6
          ? `${code} is too weak to play from any seat. Folding hands like this is the fastest way new players stop losing money.`
          : `${code} is a ${tname} hand. From ${POSITION_INFO[position].name.toLowerCase()} you only open with ${limitText(limit)}. ${tier === 5 ? 'Save these for the cutoff or button.' : 'It becomes a raise in later position.'}`,
    };
  }
  // Someone raised before you.
  if (tier === 1) {
    return { action: 'raise', reason: `${code} is Premium. Re-raise (3-bet) to build a big pot while you're very likely ahead.` };
  }
  if (tier === 2) {
    return { action: 'call', reason: `${code} is Strong enough to call a raise and see a flop, but not strong enough to re-raise comfortably.` };
  }
  if (tier === 3 && position === 'bb') {
    return { action: 'call', reason: `${code} is a Good hand and you already have a big blind invested, so calling a single raise is a fair price here.` };
  }
  return {
    action: 'fold',
    reason: `When someone raises, they usually have a real hand. ${code} (${tname}) is often dominated by a raiser's range, so fold. ${tier === 3 ? 'In the big blind you could call with it.' : ''}`.trim(),
  };
}

function limitText(limit: Tier) {
  const names = ([1, 2, 3, 4, 5] as Tier[]).filter((t) => t <= limit).map((t) => TIER_INFO[t].name);
  return names.length === 1 ? `${names[0]} hands` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} hands`;
}

/** 13x13 grid labels, pairs on the diagonal, suited above it, offsuit below. */
export function gridCode(row: number, col: number): string {
  const order: Rank[] = [...RANKS].reverse() as Rank[];
  const r1 = order[row];
  const r2 = order[col];
  if (row === col) return rankChar(r1) + rankChar(r2);
  if (row < col) return rankChar(r1) + rankChar(r2) + 's';
  return rankChar(r2) + rankChar(r1) + 'o';
}

/** Concrete cards for a hand code, with random suits. */
export function cardsForCode(code: string): [Card, Card] {
  const map: Record<string, Rank> = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
  const r1 = map[code[0]];
  const r2 = map[code[1]];
  const suits = shuffle(SUITS);
  if (code.length === 2 || code[2] === 'o') return [{ rank: r1, suit: suits[0] }, { rank: r2, suit: suits[1] }];
  return [{ rank: r1, suit: suits[0] }, { rank: r2, suit: suits[0] }];
}

export const ALL_CODES: string[] = (() => {
  const out: string[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(gridCode(r, c));
  return out;
})();

/** Number of card combinations for a code: pairs 6, suited 4, offsuit 12. */
export const combos = (code: string) => (code.length === 2 ? 6 : code[2] === 's' ? 4 : 12);

/** Random hand code, biased so playable and borderline hands come up more often than in real deals. */
export function randomTrainingCode(): string {
  const roll = Math.random();
  if (roll < 0.65) {
    const t = pick([1, 2, 3, 4, 5, 5] as const);
    return pick(TIERS[t]);
  }
  return pick(ALL_CODES);
}
