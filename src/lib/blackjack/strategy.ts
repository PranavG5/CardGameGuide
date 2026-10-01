import type { Card } from '../cards';
import { bjValue, handTotal, upLabel } from './hand';
import { dealerBust } from './ev';

export interface Rules {
  /** Dealer hits soft 17 (most common in US casinos today). */
  h17: boolean;
  /** Late surrender offered. */
  surrender: boolean;
  /** Double after split allowed. */
  das: boolean;
}

export const DEFAULT_RULES: Rules = { h17: true, surrender: false, das: true };

export type Move = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
/** Chart codes. Dh: double else hit. Ds: double else stand. Ph: split if DAS else hit. Rh/Rs/Rp: surrender else hit/stand/split. */
export type Code = 'H' | 'S' | 'Dh' | 'Ds' | 'P' | 'Ph' | 'Rh' | 'Rs' | 'Rp';

export const MOVE_LABEL: Record<Move, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
};

/** Dealer upcards in chart column order. 11 is the Ace. */
export const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const row = (s: string) => s.split(' ') as Code[];

// Multi-deck basic strategy, dealer stands on soft 17, double after split allowed.
const HARD_S17: Record<number, Code[]> = {
  8: row('H H H H H H H H H H'),
  9: row('H Dh Dh Dh Dh H H H H H'),
  10: row('Dh Dh Dh Dh Dh Dh Dh Dh H H'),
  11: row('Dh Dh Dh Dh Dh Dh Dh Dh Dh H'),
  12: row('H H S S S H H H H H'),
  13: row('S S S S S H H H H H'),
  14: row('S S S S S H H H H H'),
  15: row('S S S S S H H H Rh H'),
  16: row('S S S S S H H Rh Rh Rh'),
  17: row('S S S S S S S S S S'),
};

const SOFT_S17: Record<number, Code[]> = {
  12: row('H H H H H H H H H H'),
  13: row('H H H Dh Dh H H H H H'),
  14: row('H H H Dh Dh H H H H H'),
  15: row('H H Dh Dh Dh H H H H H'),
  16: row('H H Dh Dh Dh H H H H H'),
  17: row('H Dh Dh Dh Dh H H H H H'),
  18: row('S Ds Ds Ds Ds S S H H H'),
  19: row('S S S S S S S S S S'),
  20: row('S S S S S S S S S S'),
};

const PAIRS_S17: Record<number, Code[]> = {
  2: row('Ph Ph P P P P H H H H'),
  3: row('Ph Ph P P P P H H H H'),
  4: row('H H H Ph Ph H H H H H'),
  5: row('Dh Dh Dh Dh Dh Dh Dh Dh H H'),
  6: row('Ph P P P P H H H H H'),
  7: row('P P P P P P H H H H'),
  8: row('P P P P P P P P P P'),
  9: row('P P P P P S P P S S'),
  10: row('S S S S S S S S S S'),
  11: row('P P P P P P P P P P'),
};

const col = (up: number) => UPCARDS.indexOf(up);

export function hardCode(total: number, up: number, rules: Rules): Code {
  const t = Math.max(8, Math.min(17, total));
  let c = HARD_S17[t][col(up)];
  if (rules.h17 && up === 11) {
    if (total === 11) c = 'Dh';
    if (total === 15) c = 'Rh';
    if (total === 17) c = 'Rs';
  }
  return c;
}

export function softCode(total: number, up: number, rules: Rules): Code {
  const t = Math.min(20, total);
  let c = SOFT_S17[t][col(up)];
  if (rules.h17) {
    if (total === 18 && up === 2) c = 'Ds';
    if (total === 19 && up === 6) c = 'Ds';
  }
  return c;
}

/** Pair code by card value (2-11). */
export function pairCode(v: number, up: number, rules: Rules): Code {
  let c = PAIRS_S17[v][col(up)];
  if (rules.h17 && v === 8 && up === 11) c = 'Rp';
  return c;
}

export interface Options {
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

export interface Advice {
  move: Move;
  code: Code;
  table: 'hard' | 'soft' | 'pair';
  /** Short reason in plain English. */
  reason: string;
}

function resolve(code: Code, o: Options, rules: Rules): Move | null {
  switch (code) {
    case 'H': return 'hit';
    case 'S': return 'stand';
    case 'Dh': return o.canDouble ? 'double' : 'hit';
    case 'Ds': return o.canDouble ? 'double' : 'stand';
    case 'P': return o.canSplit ? 'split' : null;
    case 'Ph': return o.canSplit && rules.das ? 'split' : null;
    case 'Rh': return o.canSurrender ? 'surrender' : 'hit';
    case 'Rs': return o.canSurrender ? 'surrender' : 'stand';
    case 'Rp': return o.canSurrender ? 'surrender' : o.canSplit ? 'split' : null;
  }
}

/** Basic strategy decision for any hand. */
export function advise(cards: Card[], up: number, rules: Rules, o: Options): Advice {
  const { total, soft } = handTotal(cards);
  const pairV = cards.length === 2 && bjValue(cards[0].rank) === bjValue(cards[1].rank) ? bjValue(cards[0].rank) : 0;
  if (pairV) {
    const code = pairCode(pairV, up, rules);
    const move = resolve(code, o, rules);
    if (move && (move === 'split' || move === 'surrender' || pairV === 5 || pairV === 10)) {
      return { move, code, table: 'pair', reason: explainPair(pairV, up, move, rules) };
    }
    const keep = move === 'stand' ? explainKeepPair(pairV, up) : null;
    if (move && keep) return { move, code, table: 'pair', reason: keep };
  }
  if (soft) {
    const code = softCode(total, up, rules);
    const move = resolve(code, o, rules)!;
    return { move, code, table: 'soft', reason: explainSoft(total, up, move, code, rules) };
  }
  const code = hardCode(total, up, rules);
  const move = resolve(code, o, rules)!;
  return { move, code, table: 'hard', reason: explainHard(total, up, move, code, rules, pairV) };
}

export const startOptions = (rules: Rules): Options => ({ canDouble: true, canSplit: true, canSurrender: rules.surrender });

const pct = (x: number) => `${Math.round(x * 100)}%`;
const weak = (up: number) => up >= 2 && up <= 6;
const upName = (up: number) => (up === 11 ? 'an Ace' : up === 8 ? 'an 8' : `a ${up}`);

/** Chance to bust if you take one card on a hard total. */
export function hitBustChance(total: number): number {
  let n = 0;
  for (let v = 2; v <= 11; v++) {
    const val = v === 11 ? 1 : v;
    if (total + val > 21) n += v === 10 ? 4 : 1;
  }
  return n / 13;
}

function explainHard(total: number, up: number, move: Move, code: Code, rules: Rules, pairV: number): string {
  const bust = pct(dealerBust(up, rules.h17));
  const u = upName(up);
  const pre = pairV ? `Don't split ${pairV === 10 ? '10s' : pairV + 's'}; play this as a hard ${total}. ` : '';
  if (move === 'surrender') {
    if (total === 17) return `${pre}Surrender. When the dealer hits soft 17, hard 17 against an Ace loses so often that giving up half your bet is cheaper.`;
    return `${pre}Surrender. Hard ${total} against ${u} is one of the worst spots in blackjack. You'll lose this hand most of the time, so getting half your bet back loses less money in the long run.`;
  }
  if (total >= 17) return `${pre}Stand. Taking a card from ${total} would bust you ${pct(hitBustChance(total))} of the time. ${total} is a solid total, so stop here.`;
  if (total <= 8) return `${pre}Hit. You can't bust with one card, and ${total} is too low to win. Always hit.`;
  if (total === 9) {
    if (move === 'double') return `${pre}Double down. 9 against the dealer's weak ${upLabel(up)} is a good chance to get more money on the table: one card often makes 19.`;
    return `${pre}Hit. 9 is only worth doubling against the dealer's weakest cards (3 through 6).`;
  }
  if (total === 10 || total === 11) {
    if (move === 'double') return `${pre}Double down. Almost a third of the deck is 10-value cards, so one card often gives you ${total + 10}. Your ${total} is stronger than the dealer's ${upLabel(up)}, so bet more while you have the edge.`;
    if (code === 'Dh' || code === 'Ds') return `${pre}Hit. Doubling would be best, but you can only double on your first two cards.`;
    return `${pre}Hit. The dealer's ${upLabel(up)} is too strong to double into${total === 11 ? ' when the dealer stands on soft 17' : ''}. Just take a card.`;
  }
  // 12 to 16
  if (total === 12 && (up === 2 || up === 3)) {
    return `${pre}Hit. Only a 10-value card can bust a 12, and the dealer's ${up} doesn't bust often enough (${bust}) to just wait.`;
  }
  if (weak(up)) {
    return `${pre}Stand. The dealer shows a "bust card" (${upLabel(up)}) and must keep hitting until 17. Let the dealer take the risk: they'll bust about ${bust} of the time.`;
  }
  if (total === 16 && up === 10 && code === 'Rh') {
    return `${pre}Hit. 16 vs 10 is the toughest hand in blackjack: both choices lose money, but hitting loses slightly less. (Surrender is best if your table allows it.)`;
  }
  return `${pre}Hit. Assume the dealer has a 10 underneath: with ${u} showing they'll usually finish with 17 or more. Standing on ${total} only wins if the dealer busts, which happens just ${bust} of the time.`;
}

function explainSoft(total: number, up: number, move: Move, code: Code, rules: Rules): string {
  const u = upLabel(up);
  if (total >= 20 || (total === 19 && move === 'stand')) return `Stand. Soft ${total} is already a strong total. Don't mess with a winner.`;
  if (move === 'double') {
    return `Double down. A soft hand can't bust with one card, so it's a free shot to improve. The dealer's ${u} is weak, so this is the moment to get more money on the table.`;
  }
  if (total === 19) return `Stand. Soft 19 is a strong hand.`;
  if (total === 18) {
    if (move === 'stand') {
      if (code === 'Ds') return `Stand. Doubling would be best, but you can only double on your first two cards. Soft 18 is fine to stand on here.`;
      return `Stand. Soft 18 beats or ties the dealer's most likely results against ${upName(up)}.`;
    }
    return `Hit. Soft 18 looks good, but the dealer's ${u} will often make 19 or 20. You can't bust with one card, so try to improve.`;
  }
  if (code === 'Dh') return `Hit. Doubling would be best, but you can only double on your first two cards. A soft hand can't bust with one card.`;
  if (total === 17) return `Hit. Soft 17 is a weak total (the dealer wouldn't even stand on it in many casinos). You can't bust with one card, so always improve it.`;
  return `Hit. Soft ${total} can't bust with one more card, and it's too low to stand on. ${rules.h17 ? '' : ''}`.trim();
}

function explainPair(v: number, up: number, move: Move, rules: Rules): string {
  const u = upLabel(up);
  const name = v === 11 ? 'Aces' : `${v}s`;
  if (move === 'surrender') return `Surrender. When the dealer hits soft 17, a pair of 8s against an Ace loses so much that surrendering beats splitting.`;
  if (v === 11) return `Always split Aces. Each Ace starts a new hand at 11, so any 10-value card gives you 21. Kept together they're just a clumsy soft 12.`;
  if (v === 8) return `Always split 8s. 16 is the worst total in blackjack, but two hands starting from 8 each have a real chance to win.`;
  if (v === 10) return `Never split 10s. 20 is a winner most of the time. Don't break up a great hand.`;
  if (v === 5) return move === 'double'
    ? `Never split 5s. Treat them as a hard 10 and double down against the dealer's ${u}.`
    : `Never split 5s. Treat them as a hard 10 and hit${move === 'hit' && (up === 10 || up === 11) ? ` (the dealer's ${u} is too strong to double into)` : ''}.`;
  if (v === 9) return `Split 9s. Against the dealer's ${u}, two hands starting at 9 earn more than one 18. (Exceptions: stand against 7, 10 or Ace.)`;
  if (v === 4) return `Split 4s only against a 5 or 6, and only when you can double after splitting. The dealer is at their weakest.`;
  if (v === 6) return `Split 6s against 2 through 6. A hard 12 is weak, but the dealer's ${u} is a bust card, so two hands starting from 6 come out ahead.`;
  return `Split ${name} against 2 through 7${rules.das ? '' : ' (3 through 7 without double after split)'}. The dealer's ${u} is beatable, and two hands starting from ${v} do better than one hard ${v * 2}.`;
}

/** Explanation shown when someone splits a pair the chart says to keep, used for 9s vs 7/10/A. */
export function explainKeepPair(v: number, up: number): string | null {
  if (v === 9 && up === 7) return `Stand on 9s against a 7. Your 18 already beats the dealer's most likely 17.`;
  if (v === 9 && (up === 10 || up === 11)) return `Stand on 9s against ${upName(up)}. Splitting creates two hands against a strong dealer card; 18 is your best shot.`;
  return null;
}

export const INSURANCE_TIP =
  'Never take insurance. It is a side bet that the dealer has blackjack, and it pays 2 to 1 when the real odds are about 9 to 4 against. It loses money in the long run (about a 7% house edge).';
