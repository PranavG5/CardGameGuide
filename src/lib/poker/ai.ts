import { describeMadeHand, findDraws } from './draws';
import { equity, potOddsNeeded } from './equity';
import { handCode, OPEN_UP_TO, preflopAdvice, tierOfCode, TIER_INFO, type Tier } from './preflop';
import { type Action, type TableState, legal, pot, positionOf } from './table';

const opponentsOf = (t: TableState, i: number) => t.seats.filter((o, j) => j !== i && !o.folded && o.hole.length > 0);
const rangeOf = (o: TableState['seats'][number]): Tier => (o.pfr ? 3 : o.vpip ? 5 : 6);

const clampTo = (t: TableState, i: number, to: number) => {
  const L = legal(t, i);
  return Math.round(Math.max(L.minTo, Math.min(L.maxTo, to)));
};

/** Raise size: 3x the big blind (+1 per limper) to open, 3x the bet to re-raise. */
function preflopRaiseTo(t: TableState): number {
  if (t.raises <= 1) {
    const limpers = t.seats.filter((s) => s.vpip && !s.pfr && s.bet === t.bb).length;
    return t.bb * (3 + limpers);
  }
  return t.currentBet * 3;
}

const potBetTo = (t: TableState, frac: number) => {
  const p = pot(t);
  if (t.currentBet === 0) return Math.max(t.bb, Math.round(p * frac));
  // raise: call first, then add frac of the new pot
  return t.currentBet + Math.round((p + t.currentBet) * frac);
};

export function botAction(t: TableState, i: number): Action {
  const s = t.seats[i];
  const L = legal(t, i);
  const r = Math.random();
  const aggression = { tight: 0.5, loose: 0.55, aggressive: 0.85, passive: 0.2 }[s.style];
  const passiveFallback: Action = L.canCheck ? { type: 'check' } : { type: 'fold' };

  if (t.street === 'preflop') {
    const tier = tierOfCode(handCode(s.hole[0], s.hole[1]));
    const loose = s.style === 'loose' || s.style === 'aggressive' ? 1 : 0;
    const eff = Math.max(1, tier - loose) as Tier;
    const pos = positionOf(t, i).group;
    const bigCall = L.toCall > (s.stack + s.bet) * 0.3;
    if (bigCall) {
      if (tier === 1 || (tier === 2 && r < 0.4)) return { type: 'call' };
      return passiveFallback;
    }
    if (t.raises <= 1) {
      if (eff <= OPEN_UP_TO[pos]) {
        if (s.style === 'passive' && tier > 1 && r < 0.6) return L.canCheck ? { type: 'check' } : { type: 'call' };
        return L.canRaise ? { type: 'raise', to: clampTo(t, i, preflopRaiseTo(t)) } : { type: 'call' };
      }
      if (L.canCheck) return { type: 'check' };
      if (s.style === 'loose' && r < 0.2 && L.toCall <= t.bb) return { type: 'call' };
      return { type: 'fold' };
    }
    if (t.raises === 2) {
      if (eff === 1) return L.canRaise && r < 0.5 + aggression / 2 ? { type: 'raise', to: clampTo(t, i, preflopRaiseTo(t)) } : { type: 'call' };
      if (eff <= 2) return { type: 'call' };
      if (eff === 3 && (pos === 'bb' || pos === 'late')) return { type: 'call' };
      if (s.style === 'aggressive' && r < 0.06 && L.canRaise) return { type: 'raise', to: clampTo(t, i, preflopRaiseTo(t)) };
      return passiveFallback;
    }
    // Facing a re-raise.
    const code = handCode(s.hole[0], s.hole[1]);
    if (code === 'AA' || code === 'KK') return L.canRaise ? { type: 'raise', to: clampTo(t, i, preflopRaiseTo(t)) } : { type: 'call' };
    if (tier === 1 || (tier === 2 && L.toCall <= s.stack * 0.15)) return { type: 'call' };
    return passiveFallback;
  }

  const opps = opponentsOf(t, i);
  const eq = equity(s.hole, t.board, opps.map(rangeOf), 250).equity;
  const fair = 1 / (opps.length + 1);
  if (L.canCheck) {
    if (L.canRaise && eq > fair + 0.3 && r < 0.6 + aggression * 0.4) return { type: 'raise', to: clampTo(t, i, potBetTo(t, 0.66)) };
    if (L.canRaise && eq > fair + 0.15 && r < aggression) return { type: 'raise', to: clampTo(t, i, potBetTo(t, 0.5)) };
    if (L.canRaise && r < aggression * 0.12) return { type: 'raise', to: clampTo(t, i, potBetTo(t, 0.5)) };
    return { type: 'check' };
  }
  const needed = potOddsNeeded(pot(t), L.toCall);
  if (L.canRaise && eq > fair + 0.38 && r < aggression) return { type: 'raise', to: clampTo(t, i, potBetTo(t, 0.75)) };
  if (eq >= needed + (s.style === 'tight' ? 0.05 : 0)) return { type: 'call' };
  if (s.style === 'loose' && eq >= needed - 0.08 && r < 0.35) return { type: 'call' };
  return { type: 'fold' };
}

export interface Coach {
  action: 'fold' | 'check' | 'call' | 'raise';
  /** Suggested raise target, if raising. */
  to?: number;
  headline: string;
  reasons: string[];
  equity?: number;
  needed?: number;
  madeHand?: string;
  draw?: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function coachAdvice(t: TableState, i: number): Coach {
  const s = t.seats[i];
  const L = legal(t, i);
  if (t.street === 'preflop') {
    const code = handCode(s.hole[0], s.hole[1]);
    const tier = tierOfCode(code);
    const pos = positionOf(t, i);
    const tierLine = `${code} is a ${TIER_INFO[tier].name} hand. You're in ${pos.label} (${pos.group === 'sb' ? 'small blind' : pos.group === 'bb' ? 'big blind' : pos.group + ' position'}).`;
    if (t.raises <= 1) {
      if (L.canCheck) {
        if (tier <= 2 && L.canRaise) return { action: 'raise', to: clampTo(t, i, preflopRaiseTo(t)), headline: 'Raise', reasons: [tierLine, 'Nobody raised, and your hand is strong. Raise to build a pot you are likely to win.'] };
        return { action: 'check', headline: 'Check', reasons: [tierLine, "You're in the big blind and nobody raised, so you can see the flop for free."] };
      }
      const adv = preflopAdvice(code, pos.group, 'unopened');
      if (adv.action === 'raise' && L.canRaise) {
        const limpers = t.seats.filter((o) => o.vpip && !o.pfr).length;
        return {
          action: 'raise',
          to: clampTo(t, i, preflopRaiseTo(t)),
          headline: `Raise to $${clampTo(t, i, preflopRaiseTo(t))}`,
          reasons: [tierLine, adv.reason, ...(limpers ? [`${limpers} player${limpers > 1 ? 's' : ''} just called. Add one big blind to your raise for each caller.`] : [])],
        };
      }
      return { action: 'fold', headline: 'Fold', reasons: [tierLine, adv.reason] };
    }
    if (L.toCall > (s.stack + s.bet) * 0.3 && tier > 1) {
      return { action: 'fold', headline: 'Fold', reasons: [tierLine, 'Calling would risk a big part of your stack. Save big pots for Premium hands.'] };
    }
    if (t.raises === 2) {
      const adv = preflopAdvice(code, pos.group, 'raised');
      if (adv.action === 'raise' && L.canRaise) return { action: 'raise', to: clampTo(t, i, preflopRaiseTo(t)), headline: `Re-raise to $${clampTo(t, i, preflopRaiseTo(t))}`, reasons: [tierLine, adv.reason] };
      if (adv.action !== 'fold') return { action: 'call', headline: `Call $${L.toCall}`, reasons: [tierLine, adv.reason] };
      return { action: 'fold', headline: 'Fold', reasons: [tierLine, adv.reason] };
    }
    if (code === 'AA' || code === 'KK') {
      return { action: L.canRaise ? 'raise' : 'call', to: clampTo(t, i, preflopRaiseTo(t)), headline: L.canRaise ? 'Re-raise' : 'Call', reasons: [tierLine, 'There has been a re-raise, but you hold one of the two best hands. Keep putting money in.'] };
    }
    if (tier === 1) return { action: 'call', headline: `Call $${L.toCall}`, reasons: [tierLine, 'There has been a re-raise. Your hand is good enough to call, but be careful: they often have AA or KK.'] };
    return { action: 'fold', headline: 'Fold', reasons: [tierLine, 'There has been a raise and a re-raise. That means big strength; only Premium hands continue.'] };
  }

  const opps = opponentsOf(t, i);
  const made = describeMadeHand(s.hole, t.board);
  const draw = t.board.length < 5 ? findDraws(s.hole, t.board) : null;
  const hasDraw = !!draw && draw.outs.length >= 4;
  const eq = equity(s.hole, t.board, opps.map(rangeOf), 1200).equity;
  const fair = 1 / (opps.length + 1);
  const base = {
    equity: eq,
    madeHand: made.label,
    draw: hasDraw ? `${draw!.label} (${draw!.outs.length} outs)` : undefined,
  };
  const eqLine = `Estimated win chance: about ${pct(eq)} against ${opps.length} opponent${opps.length > 1 ? 's' : ''}' likely hands.`;
  if (L.canCheck) {
    if (L.canRaise && eq >= Math.max(0.5, fair + 0.25)) {
      const to = clampTo(t, i, potBetTo(t, 0.66));
      return { ...base, action: 'raise', to, headline: `Bet $${to}`, reasons: [`You have ${made.label.toLowerCase()}.`, eqLine, "You're probably ahead. Bet about two-thirds of the pot so worse hands pay you."] };
    }
    if (hasDraw) {
      return { ...base, action: 'check', headline: 'Check', reasons: [`You have ${made.label.toLowerCase()} and a ${draw!.label.toLowerCase()}.`, eqLine, 'Checking lets you see the next card for free. (Betting as a "semi-bluff" is also fine with a strong draw.)'] };
    }
    return { ...base, action: 'check', headline: 'Check', reasons: [`You have ${made.label.toLowerCase()}.`, eqLine, "Your hand isn't strong enough to bet for value. Take the free check."] };
  }
  const p = pot(t);
  const needed = potOddsNeeded(p, L.toCall);
  const oddsLine = `Pot odds: you call $${L.toCall} to win $${p}, so you need to win at least ${pct(needed)} of the time.`;
  if (L.canRaise && eq >= Math.max(0.65, fair + 0.35)) {
    const to = clampTo(t, i, potBetTo(t, 0.75));
    return { ...base, needed, action: 'raise', to, headline: `Raise to $${to}`, reasons: [`You have ${made.label.toLowerCase()}.`, eqLine, "You're a big favorite. Raise to get more money in while you're ahead."] };
  }
  if (eq >= needed) {
    return { ...base, needed, action: 'call', headline: `Call $${L.toCall}`, reasons: [`You have ${made.label.toLowerCase()}${hasDraw ? ` and a ${draw!.label.toLowerCase()}` : ''}.`, oddsLine, `${eqLine} That's more than you need, so calling makes money over time.`] };
  }
  return { ...base, needed, action: 'fold', headline: 'Fold', reasons: [`You have ${made.label.toLowerCase()}${hasDraw ? ` and a ${draw!.label.toLowerCase()}` : ''}.`, oddsLine, `${eqLine} That's less than you need, so calling loses money over time.`] };
}
