import { type Card, makeDeck, sameCard, rankName, rankPlural, SUIT_NAME, SUITS, RANKS } from '../cards';
import { Category, categoryOf, evaluate, scoreHand } from './evaluator';

export type StraightDraw = 'open-ended' | 'double-gutshot' | 'gutshot' | null;

export interface DrawInfo {
  outs: Card[];
  flushDraw: boolean;
  straightDraw: StraightDraw;
  /** Short label like "Flush draw + open-ended straight draw". */
  label: string;
}

const unseenCards = (known: Card[]) => makeDeck().filter((c) => !known.some((k) => sameCard(k, c)));

/** Cards that turn hero's hand into a straight or better using at least one hole card. */
export function findDraws(hole: Card[], board: Card[]): DrawInfo {
  const known = [...hole, ...board];
  const current = categoryOf(scoreHand(known));
  const outs: Card[] = [];
  const straightRanks: number[] = [];
  let flushDraw = false;
  if (current < Category.Straight && board.length < 5) {
    const unseen = unseenCards(known);
    for (const c of unseen) {
      const s = scoreHand([...known, c]);
      const cat = categoryOf(s);
      if (cat < Category.Straight) continue;
      if (s <= scoreHand([...board, c])) continue; // the board makes it, not you
      if (cat === Category.Flush || cat === Category.StraightFlush) flushDraw = true;
      outs.push(c);
    }
    // Straight ranks are found with suits scrambled so flushes can't interfere.
    const neutral = (cards: Card[]) => cards.map((c, i) => ({ rank: c.rank, suit: SUITS[i % 4] }));
    for (const r of RANKS) {
      if (!unseen.some((c) => c.rank === r)) continue;
      const probe: Card = { rank: r, suit: 's' };
      const s = scoreHand(neutral([...known, probe]));
      if (categoryOf(s) !== Category.Straight) continue;
      if (s <= scoreHand(neutral([...board, probe]))) continue;
      straightRanks.push(r);
    }
  }

  let straightDraw: StraightDraw = null;
  if (straightRanks.length >= 2) {
    const [a, b] = straightRanks;
    // 2-3-4-5 is open-ended too: it needs an Ace (low) or a Six.
    const openEnded = b - a === 5 || (b === 14 && a === 6);
    straightDraw = openEnded ? 'open-ended' : 'double-gutshot';
  } else if (straightRanks.length === 1) straightDraw = 'gutshot';

  const parts: string[] = [];
  if (flushDraw) parts.push('Flush draw');
  if (straightDraw === 'open-ended') parts.push('Open-ended straight draw');
  if (straightDraw === 'double-gutshot') parts.push('Double gutshot straight draw');
  if (straightDraw === 'gutshot') parts.push('Gutshot straight draw');
  return { outs, flushDraw, straightDraw, label: parts.length ? parts.join(' + ') : 'No straight or flush draw' };
}

export interface MadeHand {
  label: string;
  detail: string;
  category: Category;
  /** Rough strength bucket for coaching: 0 nothing, 1 weak, 2 medium, 3 strong, 4 monster. */
  strength: 0 | 1 | 2 | 3 | 4;
}

/** Beginner-friendly description of what hero has, relative to the board. */
export function describeMadeHand(hole: Card[], board: Card[]): MadeHand {
  const res = evaluate([...hole, ...board]);
  const cat = res.category;
  const boardRes = board.length ? evaluate(board) : null;
  const boardRanks = board.map((c) => c.rank).sort((a, b) => b - a);
  const topBoard = boardRanks[0] ?? 0;
  const pocketPair = hole[0].rank === hole[1].rank;
  const usesHole = res.best.some((c) => hole.some((h) => sameCard(h, c)));

  if (board.length === 5 && boardRes && boardRes.score === res.score) {
    return {
      label: 'Playing the board',
      detail: `The best five cards are all on the board (${res.description}). Everyone still in the hand has at least this.`,
      category: cat,
      strength: 1,
    };
  }

  if (cat >= Category.Straight) {
    const boardHelps = boardRes && boardRes.category === cat;
    const strength = cat >= Category.FullHouse ? 4 : 3;
    let detail = `${res.description}. A very strong hand most of the time.`;
    if (cat === Category.Flush && hole.filter((h) => res.best.some((b) => sameCard(b, h))).length === 1) {
      detail = `${res.description}, using one of your cards. Watch out: anyone with a higher ${SUIT_NAME[res.best[0].suit].slice(0, -1).toLowerCase()} beats you.`;
    }
    if (cat === Category.FullHouse && boardRes && boardRes.category === Category.Trips) {
      detail = `${res.description}. The board has three of a kind, so your pair matters.`;
    }
    return { label: res.name, detail: boardHelps ? `${detail} Note: the board itself shows a ${boardRes!.name.toLowerCase()}.` : detail, category: cat, strength: boardHelps && cat < Category.FullHouse ? 2 : strength };
  }

  if (cat === Category.Trips) {
    const r = res.ranks[0];
    if (pocketPair && hole[0].rank === r) {
      return { label: `Set of ${rankPlural(r)}`, detail: `Your pocket ${rankPlural(r).toLowerCase()} matched a card on the board. Sets are well hidden and very strong.`, category: cat, strength: 4 };
    }
    if (!hole.some((h) => h.rank === r)) {
      return { label: `Trips on the board`, detail: `The board has three ${rankPlural(r).toLowerCase()}, so everyone shares them. Your kicker decides.`, category: cat, strength: 1 };
    }
    return { label: `Trips (${rankPlural(r)})`, detail: `One of your cards matched a pair on the board. Strong, but your kicker matters.`, category: cat, strength: 3 };
  }

  if (cat === Category.TwoPair) {
    const [p1, p2] = res.ranks.filter((_, i) => i === 0 || i === 2);
    const holeRanks: number[] = hole.map((h) => h.rank);
    const usesBoth = holeRanks.includes(p1) && holeRanks.includes(p2) && !pocketPair;
    if (usesBoth) return { label: 'Two pair', detail: `Both of your cards paired the board (${rankPlural(p1)} and ${rankPlural(p2)}). A strong hand.`, category: cat, strength: 3 };
    if (!usesHole || (!holeRanks.includes(p1) && !holeRanks.includes(p2))) {
      return { label: 'Two pair on the board', detail: `Both pairs are on the board, so everyone has them. You only have your kicker.`, category: cat, strength: 1 };
    }
    return { label: `Two pair (${rankPlural(p1)} and ${rankPlural(p2)})`, detail: `One pair is on the board and shared by everyone, so it's weaker than it looks. Treat it like one pair of ${rankPlural(holeRanks.includes(p1) ? p1 : p2).toLowerCase()}.`, category: cat, strength: 2 };
  }

  if (cat === Category.Pair) {
    const r = res.ranks[0];
    if (pocketPair) {
      if (r > topBoard || board.length === 0) {
        return { label: board.length ? `Overpair (${rankPlural(r)})` : `Pocket ${rankPlural(r)}`, detail: board.length ? 'Your pocket pair is higher than every card on the board. A strong one-pair hand.' : 'A pocket pair before the flop.', category: cat, strength: board.length ? 3 : 2 };
      }
      return { label: `Underpair (${rankPlural(r)})`, detail: `Your pocket pair is lower than at least one board card, so anyone holding that card beats you.`, category: cat, strength: 1 };
    }
    const holeHit = hole.find((h) => h.rank === r);
    if (!holeHit) {
      return { label: 'Pair on the board', detail: `The pair is on the board and everyone shares it. You have ${rankName(Math.max(hole[0].rank, hole[1].rank))} high.`, category: cat, strength: 0 };
    }
    const kicker = hole.find((h) => h !== holeHit)!.rank;
    const uniq = [...new Set(boardRanks)];
    if (r === uniq[0]) {
      const good = kicker >= 11;
      return { label: `Top pair, ${rankName(kicker)} kicker`, detail: `You paired the highest card on the board. ${good ? 'With a good kicker this is a solid hand.' : 'Your kicker is weak, so be careful against big bets.'}`, category: cat, strength: good ? 3 : 2 };
    }
    if (r === uniq[uniq.length - 1]) return { label: `Bottom pair (${rankPlural(r)})`, detail: 'You paired the lowest card on the board. Weak: easily beaten.', category: cat, strength: 1 };
    return { label: `Middle pair (${rankPlural(r)})`, detail: 'You paired a middle board card. Okay against one player, weak against several.', category: cat, strength: 1 };
  }

  const hi = Math.max(hole[0].rank, hole[1].rank);
  return { label: `No pair (${rankName(hi)} high)`, detail: 'You have no pair yet. Unless you have a draw, this hand rarely wins at showdown.', category: cat, strength: 0 };
}

/** Number of unseen cards from hero's perspective. */
export const unseenCount = (board: Card[]) => 52 - 2 - board.length;
