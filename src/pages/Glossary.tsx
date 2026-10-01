import { useState } from 'react';
import { Page } from '../components/Layout';
import { Seg } from '../components/ui';

type Game = 'bj' | 'pk';
const TERMS: { term: string; game: Game; def: string }[] = [
  { term: 'Basic strategy', game: 'bj', def: 'The mathematically best play for every blackjack hand against every dealer upcard.' },
  { term: 'Bust', game: 'bj', def: 'Going over 21. You lose immediately, even if the dealer busts afterwards.' },
  { term: 'Bust card', game: 'bj', def: 'A dealer upcard of 2 to 6. The dealer busts often with these showing.' },
  { term: 'Double down', game: 'bj', def: 'Double your bet and receive exactly one more card. Only allowed on your first two cards.' },
  { term: 'Hard hand', game: 'bj', def: 'A hand with no Ace, or where every Ace has to count as 1. Example: 10 + 6.' },
  { term: 'Soft hand', game: 'bj', def: "A hand with an Ace counted as 11, like A + 6 (soft 17). One more card can't bust it." },
  { term: 'Stiff hand', game: 'bj', def: 'A hard 12 to 16. One big card would bust it.' },
  { term: 'Hit', game: 'bj', def: 'Take another card.' },
  { term: 'Stand', game: 'bj', def: 'Keep your current total and end your turn.' },
  { term: 'Split', game: 'bj', def: 'Turn a pair into two separate hands by adding a second, equal bet.' },
  { term: 'Surrender', game: 'bj', def: 'Give up half your bet and end the hand right away. Only offered at some tables, only as your first decision.' },
  { term: 'Upcard', game: 'bj', def: "The dealer's face-up card. Most of your decisions depend on it." },
  { term: 'Hole card', game: 'bj', def: "The dealer's face-down card. (In poker, your private cards are also called hole cards.)" },
  { term: 'Insurance', game: 'bj', def: 'A side bet offered when the dealer shows an Ace. It loses money over time. Always decline.' },
  { term: 'Even money', game: 'bj', def: 'Insurance offered when you have blackjack. Same bad bet in disguise. Decline.' },
  { term: 'Push', game: 'bj', def: 'A tie. Your bet is returned.' },
  { term: 'Blackjack (natural)', game: 'bj', def: 'An Ace plus a 10-value card as your first two cards. Pays 3 to 2 at good tables.' },
  { term: '3:2 vs 6:5', game: 'bj', def: 'How much a blackjack pays. 3:2 pays $15 on $10; 6:5 pays only $12. Always choose 3:2 tables.' },
  { term: 'H17 / S17', game: 'bj', def: 'Whether the dealer Hits or Stands on soft 17. S17 is slightly better for players.' },
  { term: 'DAS', game: 'bj', def: 'Double After Split: you may double down on a hand created by splitting. Good for players.' },
  { term: 'Shoe', game: 'bj', def: 'The box that holds several shuffled decks (often 6 or 8).' },
  { term: 'House edge', game: 'bj', def: 'The percentage of each bet the casino expects to keep long-term. About 0.5% with perfect basic strategy.' },
  { term: 'Running count', game: 'bj', def: 'In card counting, the sum of Hi-Lo values of all cards seen since the shuffle.' },
  { term: 'True count', game: 'bj', def: 'Running count divided by decks remaining. Used to size bets in card counting.' },
  { term: 'All-in', game: 'pk', def: 'Betting every chip you have in front of you.' },
  { term: 'Blinds', game: 'pk', def: 'Forced bets posted by the two players left of the button before cards are dealt: small blind and big blind.' },
  { term: 'Button', game: 'pk', def: 'The dealer marker. The button acts last after the flop, which makes it the best seat.' },
  { term: 'Board', game: 'pk', def: 'The five community cards everyone shares.' },
  { term: 'Check', game: 'pk', def: 'Pass without betting. Only possible if no one has bet yet this round.' },
  { term: 'Call', game: 'pk', def: 'Match the current bet.' },
  { term: 'Raise', game: 'pk', def: 'Increase the current bet. Others must match it to stay in.' },
  { term: '3-bet', game: 'pk', def: 'A re-raise before the flop (the big blind counts as the first bet, the first raise as the second).' },
  { term: 'Limp', game: 'pk', def: 'Just calling the big blind before the flop instead of raising. Usually a beginner mistake.' },
  { term: 'Fold', game: 'pk', def: 'Throw your hand away and give up any claim to the pot.' },
  { term: 'Preflop', game: 'pk', def: 'The first betting round, after hole cards are dealt and before the flop.' },
  { term: 'Flop', game: 'pk', def: 'The first three community cards, dealt together.' },
  { term: 'Turn', game: 'pk', def: 'The fourth community card.' },
  { term: 'River', game: 'pk', def: 'The fifth and final community card.' },
  { term: 'Showdown', game: 'pk', def: 'When remaining players reveal their hands after the last betting round. Best hand wins.' },
  { term: 'Hole cards', game: 'pk', def: 'Your two private cards.' },
  { term: 'Kicker', game: 'pk', def: 'A side card that breaks ties. With A-K on a K-high board, the Ace is your kicker.' },
  { term: 'Nuts', game: 'pk', def: 'The best possible hand given the board.' },
  { term: 'Outs', game: 'pk', def: 'Unseen cards that improve your hand to a likely winner.' },
  { term: 'Rule of 2 and 4', game: 'pk', def: 'Outs × 4 ≈ your % to hit by the river from the flop. Outs × 2 ≈ your % with one card to come.' },
  { term: 'Pot odds', game: 'pk', def: 'The price of a call compared with the size of the pot. Call when your win chance beats the price.' },
  { term: 'Equity', game: 'pk', def: 'Your share of the pot based on how often you would win if all cards were dealt out.' },
  { term: 'Position', game: 'pk', def: 'Where you sit relative to the button. Acting later is an advantage.' },
  { term: 'UTG', game: 'pk', def: '"Under the gun": the first player to act before the flop, left of the big blind.' },
  { term: 'Cutoff', game: 'pk', def: 'The seat right before the button. A strong, late position.' },
  { term: 'Suited', game: 'pk', def: 'Both hole cards share a suit, like A♠K♠ ("AKs"). Adds flush chances.' },
  { term: 'Offsuit', game: 'pk', def: 'Hole cards of different suits, like A♠K♦ ("AKo").' },
  { term: 'Connectors', game: 'pk', def: 'Hole cards next to each other in rank, like 8-7. Good for making straights.' },
  { term: 'Pocket pair', game: 'pk', def: 'Two hole cards of the same rank, like 7-7.' },
  { term: 'Set', game: 'pk', def: 'Three of a kind using a pocket pair plus one board card. Very strong and well hidden.' },
  { term: 'Trips', game: 'pk', def: 'Three of a kind using one hole card plus a pair on the board.' },
  { term: 'Overpair', game: 'pk', def: 'A pocket pair higher than every card on the board.' },
  { term: 'Top pair', game: 'pk', def: 'Pairing the highest card on the board with one of your hole cards.' },
  { term: 'Draw', game: 'pk', def: 'A hand that needs one more card to become strong, like four to a flush.' },
  { term: 'Open-ended straight draw', game: 'pk', def: 'Four cards in a row, completed by a card at either end (8 outs).' },
  { term: 'Gutshot', game: 'pk', def: 'A straight draw missing one inside card (4 outs).' },
  { term: 'Bluff', game: 'pk', def: 'Betting with a weak hand to make better hands fold.' },
  { term: 'Semi-bluff', game: 'pk', def: 'Betting with a draw: you can win now if they fold, or later if you hit.' },
  { term: 'Value bet', game: 'pk', def: 'Betting a strong hand hoping worse hands call.' },
  { term: 'C-bet', game: 'pk', def: 'Continuation bet: the preflop raiser bets again on the flop.' },
  { term: 'Range', game: 'pk', def: 'All the hands a player could have in a spot, based on their actions.' },
  { term: 'Tilt', game: 'pk', def: 'Playing badly because you are upset. The cure is a break.' },
  { term: 'Bad beat', game: 'pk', def: 'Losing a hand you were a big favorite to win.' },
  { term: 'Muck', game: 'pk', def: 'The pile of folded cards, or to fold your hand without showing it.' },
  { term: 'Rake', game: 'pk', def: 'The small cut the casino or site takes from each pot.' },
  { term: 'Buy-in', game: 'pk', def: 'The amount of chips you sit down with. A common buy-in is 100 big blinds.' },
  { term: 'Bankroll', game: 'pk', def: 'Money set aside only for playing. Keeping 20+ buy-ins protects you from normal swings.' },
];

export default function Glossary() {
  const [q, setQ] = useState('');
  const [game, setGame] = useState<'all' | Game>('all');
  const list = TERMS.filter((t) => (game === 'all' || t.game === game) && (t.term + ' ' + t.def).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.term.localeCompare(b.term));
  return (
    <Page title="Glossary" back="/">
      <div className="stack">
        <input type="search" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row center">
          <Seg value={game} onChange={setGame} options={[{ value: 'all', label: 'All' }, { value: 'bj', label: 'Blackjack' }, { value: 'pk', label: 'Poker' }]} />
        </div>
        <div className="panel">
          {list.length === 0 && <div className="muted center">No matching terms.</div>}
          {list.map((t) => (
            <div key={t.term + t.game} className="rank-row" style={{ alignItems: 'flex-start' }}>
              <div className="info">
                <div style={{ fontWeight: 800 }}>
                  {t.term} <span className="pill" style={{ fontSize: '0.65rem', padding: '0 6px', marginLeft: 4 }}>{t.game === 'bj' ? 'Blackjack' : 'Poker'}</span>
                </div>
                <div className="small muted">{t.def}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
