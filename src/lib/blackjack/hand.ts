import type { Card, Rank } from '../cards';

/** Blackjack value of a rank: face cards are 10, Ace is 11 here (soft handling in handTotal). */
export const bjValue = (r: Rank | number) => (r === 14 ? 11 : r >= 10 ? 10 : r);

export interface HandTotal {
  total: number;
  soft: boolean;
}

export function handTotal(cards: Card[]): HandTotal {
  let hard = 0;
  let hasAce = false;
  for (const c of cards) {
    const v = bjValue(c.rank);
    if (v === 11) {
      hasAce = true;
      hard += 1;
    } else hard += v;
  }
  if (hasAce && hard + 10 <= 21) return { total: hard + 10, soft: true };
  return { total: hard, soft: false };
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && handTotal(cards).total === 21;
export const isBust = (cards: Card[]) => handTotal(cards).total > 21;
export const isPair = (cards: Card[]) => cards.length === 2 && bjValue(cards[0].rank) === bjValue(cards[1].rank);

/** Upcard label for UI: 2-10 or A. */
export const upLabel = (up: number) => (up === 11 ? 'A' : String(up));

export function totalLabel(cards: Card[]): string {
  const { total, soft } = handTotal(cards);
  if (isBlackjack(cards)) return 'Blackjack!';
  if (total > 21) return `${total} Bust`;
  return soft ? `Soft ${total}` : String(total);
}

/** Hi-Lo card counting value. */
export const hiLo = (r: Rank | number) => {
  const v = bjValue(r);
  if (v >= 2 && v <= 6) return 1;
  if (v >= 10) return -1;
  return 0;
};
