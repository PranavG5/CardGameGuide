export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME: Record<Suit, string> = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };

const RANK_CHAR: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};
const RANK_NAME: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten',
  11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
};
const RANK_PLURAL: Record<number, string> = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens', 8: 'Eights', 9: 'Nines', 10: 'Tens',
  11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
};

/** Compact rank used in poker notation: T for ten. */
export const rankChar = (r: number) => RANK_CHAR[r];
/** Rank as printed on a card face: 10 for ten. */
export const rankFace = (r: number) => (r === 10 ? '10' : RANK_CHAR[r]);
export const rankName = (r: number) => RANK_NAME[r];
export const rankPlural = (r: number) => RANK_PLURAL[r];

export const cardId = (c: Card) => `${RANK_CHAR[c.rank]}${c.suit}`;
export const cardLabel = (c: Card) => `${rankFace(c.rank)}${SUIT_SYMBOL[c.suit]}`;
export const sameCard = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;

export function parseCard(s: string): Card {
  const r = s.slice(0, -1).toUpperCase();
  const suit = s.slice(-1).toLowerCase() as Suit;
  const map: Record<string, Rank> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, '10': 10, J: 11, Q: 12, K: 13, A: 14,
  };
  const rank = map[r];
  if (!rank || !SUITS.includes(suit)) throw new Error(`Bad card: ${s}`);
  return { rank, suit };
}

export const parseCards = (s: string) => s.trim().split(/\s+/).filter(Boolean).map(parseCard);

export function makeDeck(decks = 1): Card[] {
  const out: Card[] = [];
  for (let d = 0; d < decks; d++) for (const suit of SUITS) for (const rank of RANKS) out.push({ rank, suit });
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** A 52-card deck with the given cards removed, shuffled. */
export function deckWithout(exclude: Card[]): Card[] {
  return shuffle(makeDeck().filter((c) => !exclude.some((e) => sameCard(e, c))));
}

export const randomSuit = () => pick(SUITS);
