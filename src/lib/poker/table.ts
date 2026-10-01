import { type Card, makeDeck, shuffle } from '../cards';
import { evaluate } from './evaluator';
import type { Position } from './preflop';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type BotStyle = 'tight' | 'loose' | 'aggressive' | 'passive';

export interface Seat {
  name: string;
  isHero: boolean;
  style: BotStyle;
  stack: number;
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  /** Chips put in on the current street. */
  bet: number;
  /** Chips put in this hand. */
  contributed: number;
  acted: boolean;
  /** Voluntarily put chips in preflop / raised preflop: used to guess ranges. */
  vpip: boolean;
  pfr: boolean;
  lastAction: string;
  showCards: boolean;
}

export interface Winner {
  seat: number;
  amount: number;
  hand: string;
  best: Card[];
}

export interface TableState {
  seats: Seat[];
  button: number;
  sb: number;
  bb: number;
  deck: Card[];
  board: Card[];
  street: Street;
  toAct: number;
  currentBet: number;
  minRaise: number;
  /** Number of bets/raises this street (1 = just the big blind preflop). */
  raises: number;
  handNo: number;
  over: boolean;
  winners: Winner[];
  log: string[];
  startingStack: number;
}

export type Action = { type: 'fold' } | { type: 'check' } | { type: 'call' } | { type: 'raise'; to: number };

const BOTS: { name: string; style: BotStyle }[] = [
  { name: 'Ava', style: 'tight' },
  { name: 'Ben', style: 'loose' },
  { name: 'Cleo', style: 'aggressive' },
  { name: 'Dev', style: 'passive' },
  { name: 'Eli', style: 'tight' },
];

export function createTable(stack = 200, sb = 1, bb = 2): TableState {
  const seats: Seat[] = [
    blankSeat('You', true, 'tight', stack),
    ...BOTS.map((b) => blankSeat(b.name, false, b.style, stack)),
  ];
  return {
    seats,
    button: Math.floor(Math.random() * seats.length),
    sb,
    bb,
    deck: [],
    board: [],
    street: 'preflop',
    toAct: 0,
    currentBet: 0,
    minRaise: bb,
    raises: 0,
    handNo: 0,
    over: true,
    winners: [],
    log: [],
    startingStack: stack,
  };
}

function blankSeat(name: string, isHero: boolean, style: BotStyle, stack: number): Seat {
  return { name, isHero, style, stack, hole: [], folded: false, allIn: false, bet: 0, contributed: 0, acted: false, vpip: false, pfr: false, lastAction: '', showCards: false };
}

const clone = (t: TableState): TableState => ({
  ...t,
  seats: t.seats.map((s) => ({ ...s, hole: s.hole.slice() })),
  deck: t.deck.slice(),
  board: t.board.slice(),
  winners: t.winners.slice(),
  log: t.log.slice(),
});

export const pot = (t: TableState) => t.seats.reduce((a, s) => a + s.contributed, 0);
const next = (t: TableState, i: number) => (i + 1) % t.seats.length;
export const heroIndex = (t: TableState) => t.seats.findIndex((s) => s.isHero);
const inHand = (s: Seat) => !s.folded && s.hole.length > 0;
const canAct = (s: Seat) => inHand(s) && !s.allIn;

function post(t: TableState, i: number, amount: number) {
  const s = t.seats[i];
  const a = Math.min(amount, s.stack);
  s.stack -= a;
  s.bet += a;
  s.contributed += a;
  if (s.stack === 0) s.allIn = true;
  return a;
}

export function startHand(prev: TableState): TableState {
  const t = clone(prev);
  // Bots who went broke reload so the table stays full.
  for (const s of t.seats) if (!s.isHero && s.stack < t.bb) s.stack = t.startingStack;
  for (const s of t.seats) Object.assign(s, { hole: [], folded: s.stack <= 0, allIn: false, bet: 0, contributed: 0, acted: false, vpip: false, pfr: false, lastAction: '', showCards: false });
  t.button = next(t, t.button);
  while (t.seats[t.button].stack <= 0) t.button = next(t, t.button);
  t.deck = shuffle(makeDeck());
  t.board = [];
  t.street = 'preflop';
  t.winners = [];
  t.over = false;
  t.handNo++;
  t.log = [`Hand #${t.handNo}. ${t.seats[t.button].name} ${t.seats[t.button].isHero ? 'have' : 'has'} the button.`];

  const order = activeOrderFrom(t, next(t, t.button));
  const sbSeat = order.length === 2 ? t.button : order[0];
  const bbSeat = order.length === 2 ? order[0] : order[1];
  post(t, sbSeat, t.sb);
  t.seats[sbSeat].lastAction = `SB $${t.seats[sbSeat].bet}`;
  post(t, bbSeat, t.bb);
  t.seats[bbSeat].lastAction = `BB $${t.seats[bbSeat].bet}`;
  for (let r = 0; r < 2; r++) for (const i of activeOrderFrom(t, next(t, t.button))) t.seats[i].hole.push(t.deck.pop()!);
  t.currentBet = t.bb;
  t.minRaise = t.bb;
  t.raises = 1;
  t.toAct = firstToAct(t, next(t, bbSeat));
  return t;
}

/** Seats still holding chips/cards in clockwise order starting at `from`. */
function activeOrderFrom(t: TableState, from: number): number[] {
  const out: number[] = [];
  for (let k = 0, i = from; k < t.seats.length; k++, i = next(t, i)) if (!t.seats[i].folded) out.push(i);
  return out;
}

function firstToAct(t: TableState, from: number): number {
  for (let k = 0, i = from; k < t.seats.length; k++, i = next(t, i)) if (canAct(t.seats[i])) return i;
  return -1;
}

export interface Legal {
  canCheck: boolean;
  toCall: number;
  canRaise: boolean;
  minTo: number;
  maxTo: number;
}

export function legal(t: TableState, i = t.toAct): Legal {
  const s = t.seats[i];
  const toCall = Math.min(t.currentBet - s.bet, s.stack);
  const othersCanAct = t.seats.some((o, j) => j !== i && canAct(o));
  const maxTo = s.bet + s.stack;
  const minTo = Math.min(maxTo, t.currentBet + t.minRaise);
  return { canCheck: t.currentBet === s.bet, toCall, canRaise: othersCanAct && maxTo > t.currentBet, minTo, maxTo };
}

/** Seats dealt into this hand (folded or not), clockwise from `from`. */
function dealtOrderFrom(t: TableState, from: number): number[] {
  const out: number[] = [];
  for (let k = 0, i = from; k < t.seats.length; k++, i = next(t, i)) if (t.seats[i].hole.length > 0) out.push(i);
  return out;
}

/** Position is fixed for the whole hand, so it ignores who has folded since the deal. */
export function positionOf(t: TableState, i: number): { label: string; group: Position } {
  const order = dealtOrderFrom(t, next(t, t.button)); // SB first, button last
  const n = order.length;
  const idx = order.indexOf(i);
  if (i === t.button) return { label: 'BTN', group: 'late' };
  if (idx === 0) return { label: 'SB', group: 'sb' };
  if (idx === 1) return { label: 'BB', group: 'bb' };
  const fromButton = n - 1 - idx; // 1 = cutoff
  if (fromButton === 1) return { label: 'CO', group: 'late' };
  if (fromButton === 2) return { label: 'HJ', group: 'middle' };
  return { label: idx === 2 ? 'UTG' : 'MP', group: 'early' };
}

export function apply(prev: TableState, action: Action): TableState {
  const t = clone(prev);
  const i = t.toAct;
  const s = t.seats[i];
  const L = legal(t, i);
  // Guard against illegal actions so a betting round can never stall.
  let a = action;
  if (a.type === 'check' && !L.canCheck) a = { type: 'call' };
  if (a.type === 'raise' && !L.canRaise) a = L.canCheck ? { type: 'check' } : { type: 'call' };
  const say = (msg: string) => t.log.push(`${s.name} ${msg}`);
  switch (a.type) {
    case 'fold':
      s.folded = true;
      s.lastAction = 'Fold';
      say('folds');
      break;
    case 'check':
      s.lastAction = 'Check';
      say(s.isHero ? 'check' : 'checks');
      break;
    case 'call': {
      const amt = post(t, i, L.toCall);
      s.lastAction = s.allIn ? `All-in $${s.bet}` : `Call $${s.bet}`;
      say(`${s.isHero ? 'call' : 'calls'} $${amt}${s.allIn ? ' (all-in)' : ''}`);
      if (t.street === 'preflop') s.vpip = true;
      break;
    }
    case 'raise': {
      const to = Math.max(L.minTo, Math.min(a.to, L.maxTo));
      const inc = to - t.currentBet;
      post(t, i, to - s.bet);
      if (inc >= t.minRaise) t.minRaise = inc;
      const wasBet = t.currentBet === 0;
      t.currentBet = Math.max(t.currentBet, s.bet);
      t.raises++;
      for (const o of t.seats) if (o !== s) o.acted = false;
      const verb = wasBet ? (s.isHero ? 'bet' : 'bets') : s.isHero ? 'raise to' : 'raises to';
      s.lastAction = s.allIn ? `All-in $${s.bet}` : `${wasBet ? 'Bet' : 'Raise'} $${s.bet}`;
      say(`${verb} $${s.bet}${s.allIn ? ' (all-in)' : ''}`);
      if (t.street === 'preflop') {
        s.vpip = true;
        s.pfr = true;
      }
      break;
    }
  }
  s.acted = true;
  return advance(t);
}

function advance(t: TableState): TableState {
  const live = t.seats.filter(inHand);
  if (live.length === 1) return awardUncontested(t, t.seats.indexOf(live[0]));

  const pending = t.seats.findIndex((s) => canAct(s) && (!s.acted || s.bet < t.currentBet));
  if (pending >= 0) {
    // next seat clockwise that still needs to act
    for (let k = 1, i = next(t, t.toAct); k <= t.seats.length; k++, i = next(t, i)) {
      const s = t.seats[i];
      if (canAct(s) && (!s.acted || s.bet < t.currentBet)) {
        t.toAct = i;
        return t;
      }
    }
  }
  return nextStreet(t);
}

function nextStreet(t: TableState): TableState {
  for (const s of t.seats) {
    s.bet = 0;
    s.acted = false;
    if (inHand(s) && !s.allIn) s.lastAction = '';
  }
  t.currentBet = 0;
  t.minRaise = t.bb;
  t.raises = 0;
  if (t.street === 'river') return showdown(t);
  const dealBoard = () => {
    if (t.street === 'preflop') {
      t.deck.pop(); // burn
      t.board.push(t.deck.pop()!, t.deck.pop()!, t.deck.pop()!);
      t.street = 'flop';
    } else {
      t.deck.pop();
      t.board.push(t.deck.pop()!);
      t.street = t.street === 'flop' ? 'turn' : 'river';
    }
  };
  dealBoard();
  t.log.push(`${t.street[0].toUpperCase()}${t.street.slice(1)} dealt.`);
  const actors = t.seats.filter(canAct);
  if (actors.length <= 1) {
    // Everyone else is all-in: run out the board.
    for (const s of t.seats) if (inHand(s)) s.showCards = true;
    while (t.board.length < 5) dealBoard();
    return showdown(t);
  }
  t.toAct = firstToAct(t, next(t, t.button));
  return t;
}

function awardUncontested(t: TableState, i: number): TableState {
  const amount = pot(t);
  t.seats[i].stack += amount;
  t.winners = [{ seat: i, amount, hand: 'Everyone else folded', best: [] }];
  t.log.push(`${t.seats[i].name} ${t.seats[i].isHero ? 'win' : 'wins'} $${amount}.`);
  return finish(t);
}

function finish(t: TableState): TableState {
  t.over = true;
  t.street = 'showdown';
  t.toAct = -1;
  return t;
}

/** Splits the pot into main and side pots and awards each one. */
export function showdown(t: TableState): TableState {
  const contenders = t.seats.map((s, i) => ({ s, i })).filter(({ s }) => inHand(s));
  const results = new Map<number, ReturnType<typeof evaluate>>();
  for (const { s, i } of contenders) {
    results.set(i, evaluate([...s.hole, ...t.board]));
    s.showCards = true;
  }
  const levels = [...new Set(t.seats.map((s) => s.contributed).filter((c) => c > 0))].sort((a, b) => a - b);
  let prevLevel = 0;
  const won = new Map<number, number>();
  for (const level of levels) {
    let amount = 0;
    for (const s of t.seats) amount += Math.max(0, Math.min(s.contributed, level) - prevLevel);
    const eligible = contenders.filter(({ s }) => s.contributed >= level).map(({ i }) => i);
    prevLevel = level;
    if (!amount) continue;
    if (!eligible.length) {
      // Only folded players reached this level (uncalled chips): return to the top contributor.
      const top = t.seats.reduce((m, s, i) => (s.contributed > t.seats[m].contributed ? i : m), 0);
      won.set(top, (won.get(top) ?? 0) + amount);
      continue;
    }
    const best = Math.max(...eligible.map((i) => results.get(i)!.score));
    const winners = eligible.filter((i) => results.get(i)!.score === best);
    const share = Math.floor(amount / winners.length);
    let odd = amount - share * winners.length;
    for (const w of winners) {
      won.set(w, (won.get(w) ?? 0) + share + (odd > 0 ? 1 : 0));
      if (odd > 0) odd--;
    }
  }
  t.winners = [];
  for (const [i, amount] of won) {
    t.seats[i].stack += amount;
    const r = results.get(i);
    t.winners.push({ seat: i, amount, hand: r ? r.description : 'Uncalled bet returned', best: r ? r.best : [] });
    t.log.push(`${t.seats[i].name} ${t.seats[i].isHero ? 'win' : 'wins'} $${amount}${r ? ` with ${r.description}` : ''}.`);
  }
  return finish(t);
}

export const isHeroTurn = (t: TableState) => !t.over && t.toAct >= 0 && t.seats[t.toAct].isHero;
