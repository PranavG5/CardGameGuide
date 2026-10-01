import { parseCards } from '../lib/cards';
import { CardRow } from './PlayingCard';

export const RANKINGS = [
  { name: 'Royal Flush', cards: 'As Ks Qs Js Ts', desc: 'A, K, Q, J, 10, all the same suit. The best possible hand.', odds: '0.003%' },
  { name: 'Straight Flush', cards: '9h 8h 7h 6h 5h', desc: 'Five cards in a row, all the same suit.', odds: '0.03%' },
  { name: 'Four of a Kind', cards: 'Qs Qh Qd Qc 7s', desc: 'Four cards of the same rank.', odds: '0.17%' },
  { name: 'Full House', cards: 'Ks Kh Kd 4c 4s', desc: 'Three of a kind plus a pair.', odds: '2.6%' },
  { name: 'Flush', cards: 'Ad Jd 8d 5d 2d', desc: 'Any five cards of the same suit, not in a row.', odds: '3.0%' },
  { name: 'Straight', cards: 'Tc 9d 8h 7s 6c', desc: 'Five cards in a row, mixed suits. Ace can be high (A-K-Q-J-10) or low (5-4-3-2-A).', odds: '4.6%' },
  { name: 'Three of a Kind', cards: '7h 7d 7c Ks 2d', desc: 'Three cards of the same rank.', odds: '4.8%' },
  { name: 'Two Pair', cards: 'Js Jd 4h 4c Ad', desc: 'Two different pairs.', odds: '23%' },
  { name: 'One Pair', cards: 'Th Tc As 8d 3h', desc: 'Two cards of the same rank.', odds: '44%' },
  { name: 'High Card', cards: 'Ah Js 9d 5c 2h', desc: 'Nothing else. Your highest card plays.', odds: '17%' },
];

export function RankingsList({ compact }: { compact?: boolean }) {
  return (
    <div>
      {RANKINGS.map((r, i) => (
        <div key={r.name} className="rank-row">
          <div className="num">{i + 1}</div>
          <div className="info">
            <div style={{ fontWeight: 800 }}>{r.name}</div>
            {!compact && <div className="small muted">{r.desc}</div>}
            <div className="odds">Chance with 7 cards: {r.odds}</div>
          </div>
          <CardRow cards={parseCards(r.cards)} size="sm" overlap />
        </div>
      ))}
      <div className="callout small mt">
        Memory trick: the rarer the hand, the higher it ranks. A <strong>flush beats a straight</strong>, and a <strong>full house beats a flush</strong>. Ties within a category go to the higher cards; suits never break ties.
      </div>
    </div>
  );
}
