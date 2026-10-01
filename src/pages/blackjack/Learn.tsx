import { Page } from '../../components/Layout';
import { LessonBook, type Lesson } from '../../components/LessonPlayer';
import { CardRow } from '../../components/PlayingCard';
import { parseCards } from '../../lib/cards';
import { dealerBust } from '../../lib/blackjack/ev';
import { upLabel } from '../../lib/blackjack/hand';
import { UPCARDS } from '../../lib/blackjack/strategy';
import { useProgress } from '../../lib/progress';

const Table = ({ dealer, player, hide = true }: { dealer: string; player: string; hide?: boolean }) => (
  <div className="felt" style={{ width: '100%' }}>
    <div className="label">Dealer</div>
    <CardRow cards={parseCards(dealer)} hideIndex={hide ? 1 : undefined} center size="sm" />
    <div className="divider" />
    <div className="label">You</div>
    <CardRow cards={parseCards(player)} center size="md" />
  </div>
);

function BustBars({ h17 }: { h17: boolean }) {
  return (
    <div style={{ width: '100%' }}>
      {UPCARDS.map((u) => {
        const b = dealerBust(u, h17);
        const weak = u <= 6;
        return (
          <div key={u} className="ev-row" style={{ gridTemplateColumns: '40px 1fr 44px' }}>
            <strong>{upLabel(u)}</strong>
            <div className="ev-bar">
              <div style={{ left: 0, width: `${b * 200}%`, background: weak ? 'var(--good)' : 'var(--bad)' }} />
            </div>
            <span className="small">{Math.round(b * 100)}%</span>
          </div>
        );
      })}
      <div className="small faint center" style={{ marginTop: 4 }}>
        How often the dealer busts, by upcard
      </div>
    </div>
  );
}

function lessons(h17: boolean): Lesson[] {
  return [
    {
      id: 'bj-goal',
      title: 'The goal & card values',
      icon: '🎯',
      blurb: 'Beat the dealer without going over 21',
      slides: [
        {
          title: 'Beat the dealer',
          visual: <Table dealer="Kc 7d" player="Th 9s" hide={false} />,
          body: (
            <>
              <p>You play against the <strong>dealer</strong>, not the other players. Get a total closer to 21 than the dealer without going over.</p>
              <p>Going over 21 is a <strong>bust</strong>: you lose right away, even if the dealer busts later. That's the house's built-in advantage.</p>
              <p className="muted small">Above: your 19 beats the dealer's 17. You win.</p>
            </>
          ),
        },
        {
          title: 'Card values',
          visual: <CardRow cards={parseCards('7h Kc Ad')} center size="lg" />,
          body: (
            <ul>
              <li><strong>2 to 10</strong> count as their number.</li>
              <li><strong>J, Q, K</strong> all count as 10.</li>
              <li><strong>Ace</strong> counts as 1 or 11, whichever helps you more.</li>
              <li>Suits don't matter at all.</li>
            </ul>
          ),
          check: {
            q: 'What is K + 7?',
            options: [
              { label: '17', correct: true, why: 'King counts as 10, so 10 + 7 = 17.' },
              { label: '20', why: 'King counts as 10, not 13. 10 + 7 = 17.' },
              { label: '7', why: 'Face cards are worth 10. 10 + 7 = 17.' },
            ],
          },
        },
        {
          title: 'Aces are flexible',
          visual: <CardRow cards={parseCards('As 6d 9c')} center size="md" />,
          body: (
            <>
              <p>A + 6 is 7 <em>or</em> 17. If you take another card and it's a 9, the Ace simply becomes 1: A + 6 + 9 = <strong>16</strong>, not a bust.</p>
              <p>The Ace always counts in the way that keeps you at 21 or under.</p>
            </>
          ),
          check: {
            q: 'What is A + 5 + 9?',
            options: [
              { label: '15', correct: true, why: 'Counting the Ace as 11 would make 25 (bust), so it counts as 1: 1 + 5 + 9 = 15.' },
              { label: '25, bust', why: "The Ace switches to 1 when 11 would bust you. It's 15." },
              { label: '16', why: 'Close! 1 + 5 + 9 = 15.' },
            ],
          },
        },
        {
          title: 'Blackjack!',
          visual: <CardRow cards={parseCards('Ah Kd')} center size="lg" />,
          body: (
            <>
              <p>An Ace plus any 10-value card as your <strong>first two cards</strong> is a <strong>blackjack</strong>. It usually wins immediately and pays <strong>3 to 2</strong>: bet $10, win $15.</p>
              <p>If the dealer also has blackjack, it's a tie (a "push") and you get your bet back.</p>
            </>
          ),
          check: {
            q: 'Which of these is a blackjack?',
            options: [
              { label: 'A + K', correct: true, why: 'Ace + a 10-value card on the first two cards.' },
              { label: '7 + 7 + 7', why: "That's 21, but a blackjack must be your first two cards." },
              { label: '10 + 5 + 6', why: "That's 21 with three cards. Nice, but not a blackjack." },
            ],
          },
        },
      ],
    },
    {
      id: 'bj-round',
      title: 'How a round works',
      icon: '🔄',
      blurb: 'Bet, deal, your turn, dealer turn, payout',
      slides: [
        {
          title: '1. Bet and deal',
          visual: <Table dealer="9s 4d" player="8h 3c" />,
          body: (
            <p>Place your bet. Everyone gets two cards face up. The dealer gets one card face up (the <strong>upcard</strong>) and one face down (the <strong>hole card</strong>).</p>
          ),
        },
        {
          title: '2. Your turn',
          body: (
            <p>You decide whether to take more cards (<strong>hit</strong>) or keep what you have (<strong>stand</strong>). You can hit as many times as you like until you stand or bust. Then the next player goes.</p>
          ),
        },
        {
          title: "3. The dealer's turn",
          body: (
            <>
              <p>The dealer flips the hole card and plays by <strong>fixed rules</strong>: keep hitting until reaching <strong>17 or more</strong>, then stop. The dealer never makes choices.</p>
              <p className="muted">Many casinos also make the dealer hit a "soft 17" (like A + 6). Your table's felt will say so.</p>
            </>
          ),
        },
        {
          title: '4. Payouts',
          body: (
            <ul>
              <li><strong>Win:</strong> paid 1 to 1. Bet $10, win $10.</li>
              <li><strong>Blackjack:</strong> paid 3 to 2. Bet $10, win $15.</li>
              <li><strong>Tie ("push"):</strong> you get your bet back.</li>
              <li><strong>Lose or bust:</strong> the dealer takes your bet.</li>
            </ul>
          ),
          check: {
            q: 'You have 19 and the dealer ends with 19. What happens?',
            options: [
              { label: 'Push (you get your bet back)', correct: true, why: 'Ties are a push. Nobody wins.' },
              { label: 'The dealer wins ties', why: 'Not in blackjack. A tie is a push and you keep your bet.' },
              { label: 'You win', why: 'A tie is a push: your bet comes back, no win.' },
            ],
          },
        },
      ],
    },
    {
      id: 'bj-moves',
      title: 'Your options',
      icon: '🕹️',
      blurb: 'Hit, stand, double, split, surrender',
      slides: [
        {
          title: 'Hit and stand',
          body: (
            <ul>
              <li><strong>Hit:</strong> take another card. At a real table, tap the felt.</li>
              <li><strong>Stand:</strong> keep your hand. Wave your hand flat over your cards.</li>
            </ul>
          ),
        },
        {
          title: 'Double down',
          visual: <Table dealer="6d 9c" player="6s 5h" />,
          body: (
            <>
              <p>Double your bet and take <strong>exactly one more card</strong>. Use it when one card will often give you a strong hand, like 11 against the dealer's weak 6.</p>
              <p className="muted small">Table signal: put matching chips beside your bet and hold up one finger.</p>
            </>
          ),
          check: {
            q: 'What does doubling down do?',
            options: [
              { label: 'Doubles your bet, you get exactly one card', correct: true, why: "That's it. More money in, but only one card." },
              { label: 'Doubles your bet, you can keep hitting', why: 'After doubling you get exactly one card, no more.' },
              { label: 'Doubles the payout if you win', why: "You double the bet itself, then get one card. The payout is still 1 to 1 on the bigger bet." },
            ],
          },
        },
        {
          title: 'Split',
          visual: <CardRow cards={parseCards('8s 8h')} center size="lg" />,
          body: (
            <p>If your first two cards are the same rank, you can <strong>split</strong> them into two separate hands. You add a second bet equal to the first, and each hand gets a new second card.</p>
          ),
        },
        {
          title: 'Surrender and insurance',
          body: (
            <>
              <p><strong>Surrender</strong> (some tables): give up half your bet and end the hand right away. Only as your first decision. Useful for a few very bad hands.</p>
              <p><strong>Insurance</strong>: offered when the dealer shows an Ace. It's a side bet that the dealer has blackjack. <strong>Never take it.</strong> It pays 2 to 1, but the dealer has blackjack less than 1 time in 3, so it loses money over time.</p>
            </>
          ),
          check: {
            q: 'The dealer shows an Ace and offers insurance. You should:',
            options: [
              { label: 'Decline', correct: true, why: 'Insurance is a losing side bet. Always decline.' },
              { label: 'Take it with a good hand', why: "Even with a good hand, insurance loses money long-term. Decline. (Same for 'even money' with a blackjack.)" },
            ],
          },
        },
      ],
    },
    {
      id: 'bj-soft',
      title: 'Hard vs soft hands',
      icon: '🧈',
      blurb: 'The Ace changes everything',
      slides: [
        {
          title: 'Soft hands',
          visual: <CardRow cards={parseCards('Ad 6c')} center size="lg" />,
          body: (
            <>
              <p>A <strong>soft</strong> hand has an Ace counted as 11. A + 6 is <strong>soft 17</strong>.</p>
              <p>The big deal: you <strong>can't bust</strong> a soft hand by taking one card. If the card is big, the Ace drops to 1.</p>
            </>
          ),
        },
        {
          title: 'Hard hands',
          visual: <CardRow cards={parseCards('Ad 6c Tc')} center size="md" />,
          body: (
            <p>A <strong>hard</strong> hand has no Ace, or an Ace that has to count as 1. A + 6 + 10 is <strong>hard 17</strong>: another big card would bust you.</p>
          ),
          check: {
            q: 'What is A + 7?',
            options: [
              { label: 'Soft 18', correct: true, why: 'The Ace counts as 11 without busting, so it is soft 18.' },
              { label: 'Hard 18', why: 'It contains an Ace counted as 11, so it is soft.' },
              { label: 'Hard 8', why: 'The Ace counts as 11 when it can, so this is soft 18.' },
            ],
          },
        },
        {
          title: 'Why it matters',
          body: (
            <p>Since soft hands can't bust with one card, you hit and double them more often. A common beginner mistake is standing on soft 17. The strategy chart has a separate section just for soft hands.</p>
          ),
        },
      ],
    },
    {
      id: 'bj-dealer',
      title: "The dealer's upcard is the key",
      icon: '🔑',
      blurb: 'Bust cards and the "assume a 10" trick',
      slides: [
        {
          title: 'The dealer has no choices',
          body: (
            <p>Because the dealer must hit to 17, the upcard tells you a lot about how the dealer's hand will end. Almost every decision you make depends on it.</p>
          ),
        },
        {
          title: 'Weak cards vs strong cards',
          visual: <BustBars h17={h17} />,
          body: (
            <>
              <p><strong>2 to 6 are "bust cards"</strong>: the dealer busts often with them. <strong>7 to Ace are strong</strong>: the dealer usually ends with 17 or more.</p>
            </>
          ),
        },
        {
          title: 'Assume a 10 underneath',
          body: (
            <>
              <p>About one card in three is worth 10 (10, J, Q, K). So picture the hole card as a 10.</p>
              <ul>
                <li>Dealer shows 6 → probably 16 → must hit → often busts.</li>
                <li>Dealer shows 10 → probably 20 → your 15 is likely beaten.</li>
              </ul>
            </>
          ),
          check: {
            q: 'You have 14 and the dealer shows 6. What usually works best?',
            options: [
              { label: 'Stand', correct: true, why: "Let the dealer take the risk: with a 6 showing they'll bust over 40% of the time." },
              { label: 'Hit', why: 'Hitting 14 busts you often. Against a weak 6, stand and let the dealer bust.' },
            ],
          },
        },
      ],
    },
    {
      id: 'bj-rules',
      title: 'Basic strategy in 6 rules',
      icon: '📏',
      blurb: 'The short version that covers most hands',
      slides: [
        {
          title: 'What is basic strategy?',
          body: (
            <p>Computers have played billions of hands to find the best play for every situation. That's <strong>basic strategy</strong>. These 6 rules cover the vast majority of hands; the full chart covers the rest.</p>
          ),
        },
        {
          title: 'Rules 1 and 2',
          body: (
            <ol>
              <li><strong>Always split Aces and 8s. Never split 10s or 5s.</strong></li>
              <li><strong>Always stand on hard 17 or more.</strong></li>
            </ol>
          ),
          check: {
            q: 'You have 8, 8 and the dealer shows 10.',
            options: [
              { label: 'Split', correct: true, why: 'Always split 8s. 16 is the worst hand in blackjack.' },
              { label: 'Hit', why: "Always split 8s, even against a 10. Two hands starting at 8 lose less than one 16." },
              { label: 'Stand', why: 'Standing on 16 against a 10 loses most of the time. Split 8s.' },
            ],
          },
        },
        {
          title: 'Rule 3: hard 12 to 16',
          body: (
            <>
              <p><strong>Stand if the dealer shows 2 to 6. Hit if the dealer shows 7 to Ace.</strong></p>
              <p className="muted">One exception: hit 12 against a 2 or 3.</p>
            </>
          ),
          check: {
            q: 'You have 15 and the dealer shows 9.',
            options: [
              { label: 'Hit', correct: true, why: '9 is a strong upcard. Standing on 15 only wins if the dealer busts, about 1 in 4 times.' },
              { label: 'Stand', why: 'Against 7 through Ace, hit your 12 to 16. The dealer will usually make 17+.' },
            ],
          },
        },
        {
          title: 'Rule 4: doubling',
          body: (
            <ul>
              <li>Double <strong>11</strong> against everything{h17 ? '' : ' except an Ace'}.</li>
              <li>Double <strong>10</strong> against 2 to 9.</li>
              <li>Double <strong>9</strong> against 3 to 6.</li>
            </ul>
          ),
        },
        {
          title: 'Rule 5: soft hands',
          body: (
            <ul>
              <li><strong>Soft 17 or less: never stand.</strong> Hit, or double against weak dealer cards (roughly 4 to 6).</li>
              <li>
                <strong>Soft 18:</strong> {h17 ? 'double against 2 to 6; stand against 7 and 8' : 'stand against 2, 7 and 8; double against 3 to 6'}; hit against 9, 10 and Ace.
              </li>
              <li>
                <strong>Soft 19 and 20:</strong> stand{h17 ? ' (one exception: double soft 19 against a 6)' : ''}.
              </li>
            </ul>
          ),
        },
        {
          title: 'Rule 6: never take insurance',
          body: <p>That's it. Now practice until these feel automatic. The trainer will catch your mistakes and bring them back until you get them right.</p>,
          check: {
            q: 'You have A + 7 (soft 18) and the dealer shows 10.',
            options: [
              { label: 'Hit', correct: true, why: "Soft 18 can't bust with one card and the dealer's 10 will often make 20. Hit." },
              { label: 'Stand', why: 'Against 9, 10 or Ace, soft 18 is an underdog. Hit; you cannot bust with one card.' },
              { label: 'Double', why: 'Only double soft 18 against weak cards (3 to 6).' },
            ],
          },
        },
      ],
    },
    {
      id: 'bj-money',
      title: 'House edge & smart money',
      icon: '💰',
      blurb: 'Pick good tables and protect your bankroll',
      slides: [
        {
          title: 'The house edge',
          body: (
            <>
              <p>Even with perfect basic strategy, the casino keeps about <strong>0.5%</strong> of what you bet over the long run. Players who guess give up 2% or more.</p>
              <p>Basic strategy doesn't guarantee wins. It makes your money last as long as possible and gives you the best chance at a winning session.</p>
            </>
          ),
        },
        {
          title: 'Pick the right table',
          body: (
            <ul>
              <li><strong>Blackjack must pay 3 to 2.</strong> Tables that pay 6 to 5 cost you about 1.4% extra. Walk away.</li>
              <li>"Dealer stands on soft 17" is slightly better for you than "hits soft 17".</li>
              <li>Double after split and surrender are bonuses.</li>
              <li>Skip side bets like Perfect Pairs or 21+3. Their house edge is much higher.</li>
            </ul>
          ),
          check: {
            q: 'Which table should you pick?',
            options: [
              { label: 'Blackjack pays 3 to 2', correct: true, why: 'A $10 blackjack pays $15 here, but only $12 at a 6:5 table.' },
              { label: 'Blackjack pays 6 to 5', why: 'This rule quietly costs you about 1.4% of every bet. Pick 3 to 2.' },
            ],
          },
        },
        {
          title: 'Protect your bankroll',
          body: (
            <ul>
              <li>Decide your budget before you sit down, and only bring money you can afford to lose.</li>
              <li>Bring at least 20 to 30 times your bet size so a bad streak doesn't end your night early.</li>
              <li>Don't raise your bets to chase losses. Past hands don't make a win "due".</li>
              <li>Set a time limit and take breaks.</li>
            </ul>
          ),
        },
      ],
    },
  ];
}

export default function BlackjackLearn() {
  const { settings } = useProgress();
  return (
    <Page title="Blackjack lessons" back="/blackjack" cheat="blackjack">
      <LessonBook lessons={lessons(settings.h17)} afterAll={{ to: '/blackjack/chart', label: 'Next: see the strategy chart' }} />
    </Page>
  );
}
