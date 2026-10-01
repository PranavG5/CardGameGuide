import { type Card, makeDeck, shuffle } from '../cards';
import { bjValue, handTotal, hiLo, isBlackjack } from './hand';
import type { Move, Options, Rules } from './strategy';

export type Result = 'win' | 'lose' | 'push' | 'blackjack' | 'surrender' | 'bust';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  done: boolean;
  doubled: boolean;
  surrendered: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  result?: Result;
  /** Net chips won or lost on this hand. */
  net?: number;
}

export type Phase = 'betting' | 'insurance' | 'player' | 'dealer' | 'done';

export interface BJState {
  decks: number;
  shoe: Card[];
  cutAt: number;
  dealer: Card[];
  holeRevealed: boolean;
  hands: PlayerHand[];
  active: number;
  phase: Phase;
  bankroll: number;
  insuranceBet: number;
  insuranceNet: number;
  runningCount: number;
  justShuffled: boolean;
  lastBet: number;
}

const newShoe = (decks: number) => shuffle(makeDeck(decks));

export function newGame(bankroll: number, decks = 6): BJState {
  const shoe = newShoe(decks);
  return {
    decks,
    shoe,
    cutAt: Math.floor(shoe.length * 0.25),
    dealer: [],
    holeRevealed: false,
    hands: [],
    active: 0,
    phase: 'betting',
    bankroll,
    insuranceBet: 0,
    insuranceNet: 0,
    runningCount: 0,
    justShuffled: true,
    lastBet: 10,
  };
}

function draw(s: BJState, visible = true): Card {
  const c = s.shoe.pop()!;
  if (visible) s.runningCount += hiLo(c.rank);
  return c;
}

const clone = (s: BJState): BJState => ({
  ...s,
  shoe: s.shoe.slice(),
  dealer: s.dealer.slice(),
  hands: s.hands.map((h) => ({ ...h, cards: h.cards.slice() })),
});

export const decksRemaining = (s: BJState) => Math.max(0.5, s.shoe.length / 52);
export const trueCount = (s: BJState) => s.runningCount / decksRemaining(s);

export function deal(prev: BJState, bet: number): BJState {
  const s = clone(prev);
  s.justShuffled = false;
  if (s.shoe.length <= s.cutAt) {
    s.shoe = newShoe(s.decks);
    s.runningCount = 0;
    s.justShuffled = true;
  }
  s.bankroll -= bet;
  s.lastBet = bet;
  s.insuranceBet = 0;
  s.insuranceNet = 0;
  s.holeRevealed = false;
  const p1 = draw(s);
  const d1 = draw(s);
  const p2 = draw(s);
  const d2 = draw(s, false);
  s.dealer = [d1, d2];
  s.hands = [{ cards: [p1, p2], bet, done: false, doubled: false, surrendered: false, fromSplit: false, splitAces: false }];
  s.active = 0;
  if (bjValue(d1.rank) === 11) {
    s.phase = 'insurance';
    return s;
  }
  return afterPeek(s);
}

function revealHole(s: BJState) {
  if (!s.holeRevealed) {
    s.holeRevealed = true;
    s.runningCount += hiLo(s.dealer[1].rank);
  }
}

function afterPeek(s: BJState): BJState {
  const up = bjValue(s.dealer[0].rank);
  const dealerBJ = (up === 10 || up === 11) && isBlackjack(s.dealer);
  const playerBJ = isBlackjack(s.hands[0].cards);
  if (dealerBJ || playerBJ) {
    revealHole(s);
    s.hands[0].done = true;
    return settle(s);
  }
  s.phase = 'player';
  return s;
}

export function resolveInsurance(prev: BJState, take: boolean): BJState {
  const s = clone(prev);
  if (take) {
    s.insuranceBet = s.hands[0].bet / 2;
    s.bankroll -= s.insuranceBet;
  }
  const dealerBJ = isBlackjack(s.dealer);
  if (s.insuranceBet) {
    s.insuranceNet = dealerBJ ? s.insuranceBet * 2 : -s.insuranceBet;
    if (dealerBJ) s.bankroll += s.insuranceBet * 3;
  }
  return afterPeek(s);
}

export function options(s: BJState, rules: Rules): Options & { canHit: boolean; canStand: boolean } {
  const h = s.hands[s.active];
  if (s.phase !== 'player' || !h || h.done) {
    return { canHit: false, canStand: false, canDouble: false, canSplit: false, canSurrender: false };
  }
  const two = h.cards.length === 2;
  const pair = two && bjValue(h.cards[0].rank) === bjValue(h.cards[1].rank);
  return {
    canHit: !h.splitAces,
    canStand: true,
    canDouble: two && !h.splitAces && s.bankroll >= h.bet && (!h.fromSplit || rules.das),
    canSplit: pair && s.hands.length < 4 && s.bankroll >= h.bet && !h.splitAces,
    canSurrender: rules.surrender && two && s.hands.length === 1 && !h.fromSplit,
  };
}

function nextHand(s: BJState, rules: Rules): BJState {
  while (s.active < s.hands.length && s.hands[s.active].done) s.active++;
  if (s.active < s.hands.length) {
    const h = s.hands[s.active];
    // A split hand gets its second card when it becomes active.
    if (h.cards.length === 1) {
      h.cards.push(draw(s));
      if (h.splitAces || handTotal(h.cards).total === 21) h.done = true;
      return nextHand(s, rules);
    }
    return s;
  }
  s.active = s.hands.length - 1;
  const live = s.hands.some((h) => !h.surrendered && handTotal(h.cards).total <= 21);
  revealHole(s);
  if (!live) return settle(s);
  s.phase = 'dealer';
  return s;
}

export function act(prev: BJState, move: Move, rules: Rules): BJState {
  const s = clone(prev);
  const h = s.hands[s.active];
  switch (move) {
    case 'hit': {
      h.cards.push(draw(s));
      if (handTotal(h.cards).total >= 21) h.done = true;
      break;
    }
    case 'stand':
      h.done = true;
      break;
    case 'double': {
      s.bankroll -= h.bet;
      h.bet *= 2;
      h.doubled = true;
      h.cards.push(draw(s));
      h.done = true;
      break;
    }
    case 'split': {
      s.bankroll -= h.bet;
      const aces = bjValue(h.cards[0].rank) === 11;
      const second = h.cards.pop()!;
      h.fromSplit = true;
      h.splitAces = aces;
      const twin: PlayerHand = { cards: [second], bet: h.bet, done: false, doubled: false, surrendered: false, fromSplit: true, splitAces: aces };
      s.hands.splice(s.active + 1, 0, twin);
      h.cards.push(draw(s));
      if (aces || handTotal(h.cards).total === 21) h.done = true;
      break;
    }
    case 'surrender':
      h.surrendered = true;
      h.done = true;
      break;
  }
  return h.done ? nextHand(s, rules) : s;
}

export function dealerShouldHit(dealer: Card[], rules: Rules): boolean {
  const { total, soft } = handTotal(dealer);
  return total < 17 || (total === 17 && soft && rules.h17);
}

/** Dealer draws one card, or settles the round when finished. */
export function dealerStep(prev: BJState, rules: Rules): BJState {
  const s = clone(prev);
  if (dealerShouldHit(s.dealer, rules)) {
    s.dealer.push(draw(s));
    return s;
  }
  return settle(s);
}

function settle(s: BJState): BJState {
  const d = handTotal(s.dealer).total;
  const dealerBJ = isBlackjack(s.dealer);
  for (const h of s.hands) {
    const t = handTotal(h.cards).total;
    const playerBJ = isBlackjack(h.cards) && !h.fromSplit;
    let result: Result;
    let net: number;
    if (h.surrendered) {
      result = 'surrender';
      net = -h.bet / 2;
    } else if (t > 21) {
      result = 'bust';
      net = -h.bet;
    } else if (playerBJ && !dealerBJ) {
      result = 'blackjack';
      net = h.bet * 1.5;
    } else if (dealerBJ && !playerBJ) {
      result = 'lose';
      net = -h.bet;
    } else if (playerBJ && dealerBJ) {
      result = 'push';
      net = 0;
    } else if (d > 21 || t > d) {
      result = 'win';
      net = h.bet;
    } else if (t === d) {
      result = 'push';
      net = 0;
    } else {
      result = 'lose';
      net = -h.bet;
    }
    h.result = result;
    h.net = net;
    h.done = true;
    s.bankroll += h.bet + net;
  }
  s.phase = 'done';
  return s;
}

export const roundNet = (s: BJState) => s.hands.reduce((a, h) => a + (h.net ?? 0), 0) + s.insuranceNet;
