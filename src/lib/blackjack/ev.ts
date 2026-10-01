/**
 * Infinite-deck expected values for blackjack decisions, computed after the dealer
 * has peeked for blackjack (so the dealer is known not to have one).
 * Values are per 1 unit bet: +1 win, -1 loss.
 */
import type { Rules } from './strategy';

const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const prob = (v: number) => (v === 10 ? 4 / 13 : 1 / 13);

export type DealerOutcome = 17 | 18 | 19 | 20 | 21 | 'bust';
export type DealerDist = Record<DealerOutcome, number>;

const empty = (): DealerDist => ({ 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0 });

interface State {
  hard: number;
  ace: boolean;
}
const total = (s: State) => (s.ace && s.hard + 10 <= 21 ? s.hard + 10 : s.hard);
const isSoft = (s: State) => s.ace && s.hard + 10 <= 21;
const add = (s: State, v: number): State => ({ hard: s.hard + (v === 11 ? 1 : v), ace: s.ace || v === 11 });
const single = (v: number): State => ({ hard: v === 11 ? 1 : v, ace: v === 11 });

const dealerCache = new Map<string, DealerDist>();

function dealerFrom(s: State, h17: boolean, memo: Map<string, DealerDist>): DealerDist {
  const key = `${s.hard}${s.ace}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const t = total(s);
  let out = empty();
  if (t > 21) out.bust = 1;
  else if (t >= 18 || (t === 17 && !(h17 && isSoft(s)))) out[t as DealerOutcome] = 1;
  else {
    out = empty();
    for (const v of VALUES) {
      const sub = dealerFrom(add(s, v), h17, memo);
      for (const k of Object.keys(out) as unknown as DealerOutcome[]) out[k] += prob(v) * sub[k];
    }
  }
  memo.set(key, out);
  return out;
}

/** Dealer final-total distribution for an upcard (2-11), given no dealer blackjack. */
export function dealerDist(up: number, h17: boolean): DealerDist {
  const ck = `${up}-${h17}`;
  const cached = dealerCache.get(ck);
  if (cached) return cached;
  const memo = new Map<string, DealerDist>();
  const out = empty();
  let norm = 0;
  for (const v of VALUES) {
    if ((up === 11 && v === 10) || (up === 10 && v === 11)) continue;
    norm += prob(v);
  }
  for (const v of VALUES) {
    if ((up === 11 && v === 10) || (up === 10 && v === 11)) continue;
    const sub = dealerFrom(add(single(up), v), h17, memo);
    for (const k of Object.keys(out) as unknown as DealerOutcome[]) out[k] += (prob(v) / norm) * sub[k];
  }
  dealerCache.set(ck, out);
  return out;
}

/** Probability the dealer busts with this upcard (after checking for blackjack). */
export const dealerBust = (up: number, h17: boolean) => dealerDist(up, h17).bust;

function standEV(t: number, d: DealerDist): number {
  if (t > 21) return -1;
  let ev = d.bust;
  for (const k of [17, 18, 19, 20, 21] as const) {
    if (k < t) ev += d[k];
    else if (k > t) ev -= d[k];
  }
  return ev;
}

function hitEV(s: State, d: DealerDist, memo: Map<string, number>): number {
  const key = `${s.hard}${s.ace}`;
  const m = memo.get(key);
  if (m !== undefined) return m;
  let ev = 0;
  for (const v of VALUES) {
    const n = add(s, v);
    const t = total(n);
    ev += prob(v) * (t > 21 ? -1 : Math.max(standEV(t, d), hitEV(n, d, memo)));
  }
  memo.set(key, ev);
  return ev;
}

function doubleEV(s: State, d: DealerDist): number {
  let ev = 0;
  for (const v of VALUES) ev += prob(v) * standEV(total(add(s, v)), d);
  return 2 * ev;
}

export interface MoveEVs {
  hit: number;
  stand: number;
  double?: number;
  split?: number;
  surrender?: number;
}

/** EVs for a two-card starting hand given as card values (2-11). */
export function startingEVs(v1: number, v2: number, up: number, rules: Rules): MoveEVs {
  const d = dealerDist(up, rules.h17);
  const s = add(single(v1), v2);
  const memo = new Map<string, number>();
  const out: MoveEVs = {
    hit: hitEV(s, d, memo),
    stand: standEV(total(s), d),
    double: doubleEV(s, d),
  };
  if (rules.surrender) out.surrender = -0.5;
  if (v1 === v2) {
    if (v1 === 11) {
      // Split aces get one card each and a two-card 21 is not a blackjack.
      let one = 0;
      for (const v of VALUES) one += prob(v) * standEV(total(add(single(11), v)), d);
      out.split = 2 * one;
    } else {
      let one = 0;
      for (const v of VALUES) {
        const n = add(single(v1), v);
        const options = [standEV(total(n), d), hitEV(n, d, memo)];
        if (rules.das) options.push(doubleEV(n, d));
        one += prob(v) * Math.max(...options);
      }
      out.split = 2 * one;
    }
  }
  return out;
}

/** EVs for any hand mid-play (hit or stand only, plus double if allowed). */
export function midHandEVs(hard: number, ace: boolean, up: number, rules: Rules, canDouble: boolean): MoveEVs {
  const d = dealerDist(up, rules.h17);
  const s = { hard, ace };
  const out: MoveEVs = { hit: hitEV(s, d, new Map()), stand: standEV(total(s), d) };
  if (canDouble) out.double = doubleEV(s, d);
  return out;
}
