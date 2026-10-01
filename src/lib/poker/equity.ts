import { type Card, makeDeck, sameCard } from '../cards';
import { scoreHand } from './evaluator';
import { type Tier, tierOf } from './preflop';

export interface EquityResult {
  win: number;
  tie: number;
  /** Win plus share of ties, 0..1. */
  equity: number;
  iterations: number;
}

/** Opponent range: only hands at this tier or better (6 = any two cards). */
export type RangeLimit = Tier;

/**
 * Monte Carlo equity for hero against opponents with random hands from their ranges.
 * `known` lets you pin specific opponent hole cards (for a calculator).
 */
export function equity(
  hero: Card[],
  board: Card[],
  opponents: RangeLimit[] | number,
  iterations = 1500,
  known: (Card[] | null)[] = [],
): EquityResult {
  const ranges: RangeLimit[] = typeof opponents === 'number' ? new Array(opponents).fill(6) : opponents;
  const dead = [...hero, ...board, ...known.flatMap((k) => k ?? [])];
  const base = makeDeck().filter((c) => !dead.some((d) => sameCard(d, c)));
  const needBoard = 5 - board.length;
  let win = 0;
  let tie = 0;
  const deck = base.slice();

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
    for (let o = 0; o < ranges.length; o++) {
      const k = known[o];
      if (k) {
        opps.push(k);
        continue;
      }
      const limit = ranges[o];
      let a = draw();
      let b = draw();
      if (limit < 6) {
        for (let tries = 0; tries < 25 && tierOf(a, b) > limit; tries++) {
          // put both back and redraw
          top += 2;
          a = draw();
          b = draw();
        }
      }
      opps.push([a, b]);
    }
    const runout = [...board];
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
  return { win: win / iterations, tie: tie / iterations, equity: (win + tie) / iterations, iterations };
}

/** Exact chance to hit at least one of `outs` cards with `cardsToCome` cards from `unseen`. */
export function hitChance(outs: number, unseen: number, cardsToCome: 1 | 2): number {
  if (cardsToCome === 1) return outs / unseen;
  const miss = ((unseen - outs) / unseen) * ((unseen - 1 - outs) / (unseen - 1));
  return 1 - miss;
}

/** The rule of 2 and 4 estimate, as a fraction. */
export const ruleOf24 = (outs: number, cardsToCome: 1 | 2) => Math.min(1, (outs * (cardsToCome === 2 ? 4 : 2)) / 100);

/** Equity needed to break even on a call. */
export const potOddsNeeded = (pot: number, toCall: number) => toCall / (pot + toCall);
