import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { LessonBook, type Lesson } from '../../components/LessonPlayer';
import { CardRow } from '../../components/PlayingCard';
import { parseCards } from '../../lib/cards';

const Board = ({ board, hole }: { board: string; hole: string }) => (
  <div className="felt" style={{ width: '100%' }}>
    <div className="label">Board (shared)</div>
    <CardRow cards={parseCards(board)} center size="sm" />
    <div className="divider" />
    <div className="label">Your hole cards</div>
    <CardRow cards={parseCards(hole)} center size="md" />
  </div>
);

const SEATS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const SEAT_GROUP: Record<string, string> = { UTG: '#ef4444', HJ: '#f59e0b', CO: '#22c55e', BTN: '#22c55e', SB: '#60a5fa', BB: '#60a5fa' };

const PositionMap = () => (
  <div className="felt" style={{ width: '100%' }}>
    <div className="row center" style={{ gap: 8 }}>
      {SEATS.map((s) => (
        <div key={s} className="center" style={{ background: 'rgba(0,0,0,0.35)', border: `2px solid ${SEAT_GROUP[s]}`, borderRadius: 12, padding: '6px 10px', minWidth: 54 }}>
          <div style={{ fontWeight: 800 }}>{s}</div>
          {s === 'BTN' && <span className="dealer-btn">D</span>}
        </div>
      ))}
    </div>
    <div className="small center" style={{ marginTop: 10 }}>
      <span style={{ color: '#ef4444' }}>■ Early</span> · <span style={{ color: '#f59e0b' }}>■ Middle</span> · <span style={{ color: '#22c55e' }}>■ Late</span> ·{' '}
      <span style={{ color: '#60a5fa' }}>■ Blinds</span>
    </div>
    <div className="small center faint">Preflop, action starts at UTG and goes around the table (left to right here). After the flop, the blinds act first and the button acts last.</div>
  </div>
);

const LESSONS: Lesson[] = [
  {
    id: 'pk-goal',
    title: "The goal of Texas Hold'em",
    icon: '🎯',
    blurb: 'Win chips with the best hand, or by making others fold',
    slides: [
      {
        title: 'Two ways to win',
        body: (
          <>
            <p>Each hand, players bet into a <strong>pot</strong>. You win it by:</p>
            <ol>
              <li>Having the <strong>best five-card hand</strong> at the end (the <strong>showdown</strong>), or</li>
              <li>Making everyone else <strong>fold</strong> (give up) before then.</li>
            </ol>
            <p className="muted">That second way is why poker is a game of decisions, not just cards.</p>
          </>
        ),
      },
      {
        title: 'Your cards and the board',
        visual: <Board board="Kh 9s 4d 9c 2h" hole="Ks Qd" />,
        body: (
          <>
            <p>You get 2 private <strong>hole cards</strong>. Five <strong>community cards</strong> are dealt face up in the middle for everyone to share.</p>
            <p>Your hand is the <strong>best 5 cards out of the 7</strong>. Above you have K-K-9-9-Q: <strong>two pair</strong>, Kings and Nines with a Queen kicker.</p>
          </>
        ),
        check: {
          q: 'How many of your hole cards must you use?',
          options: [
            { label: 'Any number: 2, 1 or even 0', correct: true, why: 'Your best 5 of 7 can use both, one or none of your hole cards.' },
            { label: 'Exactly 2', why: "That's Omaha. In Hold'em you can use 2, 1 or 0 of your hole cards." },
            { label: 'At least 1', why: 'You can even "play the board" with zero hole cards.' },
          ],
        },
      },
      {
        title: 'Hand rankings',
        body: (
          <>
            <p>From best to worst: Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card.</p>
            <p>
              You'll drill these in the <Link to="/poker/rankings">Hand rankings</Link> step. The 📋 Cheat sheet button at the top of poker pages shows them any
              time.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'pk-rounds',
    title: 'How a hand plays out',
    icon: '🔄',
    blurb: 'Blinds, preflop, flop, turn, river, showdown',
    slides: [
      {
        title: 'The button and the blinds',
        body: (
          <>
            <p>A <strong>dealer button</strong> marks who acts last. It moves one seat left every hand.</p>
            <p>The two players left of the button post forced bets: the <strong>small blind</strong> and the <strong>big blind</strong> (twice as much). This puts money in the pot so there's something to play for.</p>
          </>
        ),
      },
      {
        title: 'Preflop',
        visual: <CardRow cards={parseCards('Ah Jh')} center size="md" />,
        body: <p>Everyone gets two cards. The first betting round starts with the player left of the big blind.</p>,
      },
      {
        title: 'Flop, turn, river',
        visual: <CardRow cards={parseCards('Kh 7h 2c Qd 5s')} center size="sm" />,
        body: (
          <ul>
            <li><strong>Flop:</strong> 3 community cards, then a betting round.</li>
            <li><strong>Turn:</strong> a 4th card, then betting.</li>
            <li><strong>River:</strong> the 5th and last card, then final betting.</li>
          </ul>
        ),
      },
      {
        title: 'Showdown',
        body: <p>If two or more players are left after the river betting, they show their cards. Best five-card hand wins the pot. Ties split it.</p>,
        check: {
          q: 'How many community cards are there in total?',
          options: [
            { label: '5', correct: true, why: 'Flop (3) + turn (1) + river (1) = 5.' },
            { label: '3', why: 'That is just the flop. The turn and river add two more: 5 total.' },
            { label: '7', why: 'Seven is how many cards you choose from (2 yours + 5 shared).' },
          ],
        },
      },
    ],
  },
  {
    id: 'pk-actions',
    title: 'Your options on your turn',
    icon: '🕹️',
    blurb: 'Fold, check, call, bet, raise',
    slides: [
      {
        title: 'The five actions',
        body: (
          <ul>
            <li><strong>Fold:</strong> throw your hand away and stop putting money in.</li>
            <li><strong>Check:</strong> pass without betting (only if nobody has bet yet this round).</li>
            <li><strong>Call:</strong> match the current bet.</li>
            <li><strong>Bet:</strong> be the first to put chips in this round.</li>
            <li><strong>Raise:</strong> increase someone else's bet.</li>
          </ul>
        ),
        check: {
          q: 'Someone bet $10 before you. Can you check?',
          options: [
            { label: 'No: call, raise or fold', correct: true, why: 'Once there is a bet, checking is no longer an option.' },
            { label: 'Yes', why: 'You can only check when nobody has bet. Facing a bet you call, raise or fold.' },
          ],
        },
      },
      {
        title: 'No-limit',
        body: (
          <>
            <p>In <strong>no-limit</strong> Hold'em you can bet any amount up to all your chips (<strong>all-in</strong>) at any time.</p>
            <p>A common bet size is between half the pot and the full pot.</p>
          </>
        ),
      },
    ],
  },
  {
    id: 'pk-position',
    title: 'Position: why your seat matters',
    icon: '📍',
    blurb: 'Acting last is a huge advantage',
    slides: [
      {
        title: 'Acting last is power',
        visual: <PositionMap />,
        body: <p>When you act last, you see what everyone else did before you decide. That information is worth a lot of money over time.</p>,
      },
      {
        title: 'Play more hands in late position',
        body: (
          <ul>
            <li><strong>Early</strong> (first to act): play only your best hands.</li>
            <li><strong>Middle:</strong> add a few more.</li>
            <li><strong>Late</strong> (cutoff and button): play the widest range.</li>
            <li><strong>Blinds:</strong> you're forced to bet but act first after the flop. Be careful.</li>
          </ul>
        ),
        check: {
          q: 'Which seat acts last after the flop?',
          options: [
            { label: 'The button', correct: true, why: 'The button acts last on every round after the flop. Best seat at the table.' },
            { label: 'The big blind', why: 'The big blind acts last only before the flop. After that, the button is last.' },
            { label: 'Under the gun (UTG)', why: 'UTG acts first preflop. The button is last after the flop.' },
          ],
        },
      },
    ],
  },
  {
    id: 'pk-starting',
    title: 'Which hands to play',
    icon: '✋',
    blurb: 'Fold most hands, raise the good ones',
    slides: [
      {
        title: 'Fold most of your hands',
        body: (
          <>
            <p>The #1 beginner leak is playing too many hands. Good players fold around <strong>75 to 80%</strong> of hands before the flop.</p>
            <p>Hands like K-7 or Q-5 look okay but lose money because they're often beaten by a better version (like K-Q).</p>
          </>
        ),
      },
      {
        title: 'Hand groups',
        visual: <CardRow cards={parseCards('As Ad Ks Kh Ac Kc')} center size="sm" />,
        body: (
          <ul>
            <li><strong>Premium:</strong> AA, KK, QQ, AK. Always raise.</li>
            <li><strong>Strong:</strong> JJ, TT, AQ, AJ suited, KQ suited.</li>
            <li><strong>Good / Playable:</strong> medium pairs, suited aces, suited broadways like QJs.</li>
            <li><strong>Speculative:</strong> small pairs and suited connectors like 76s. Late position only.</li>
          </ul>
        ),
      },
      {
        title: 'Raise, don’t limp',
        body: (
          <>
            <p>If everyone folds to you and you want to play, <strong>raise</strong> (about 3 big blinds). Just calling the big blind (a "limp") invites many players in and makes your good hands harder to win with.</p>
            <p>If someone has already raised, be pickier: re-raise Premium hands, call with Strong hands, fold the rest.</p>
          </>
        ),
        check: {
          q: "You're first to act with K-7 offsuit. What do you do?",
          options: [
            { label: 'Fold', correct: true, why: 'K7o is too weak to play from early position. It often loses to KQ, KJ, AK.' },
            { label: 'Call', why: 'Limping with a weak hand from early position is a classic leak. Fold.' },
            { label: 'Raise', why: "K7o isn't strong enough to open from early position. Fold." },
          ],
        },
      },
    ],
  },
  {
    id: 'pk-postflop',
    title: 'After the flop: what do you have?',
    icon: '🔍',
    blurb: 'Top pair, overpairs, sets and draws',
    slides: [
      {
        title: 'Made hands',
        visual: <Board board="Kc 9s 2h" hole="Ah Kd" />,
        body: (
          <ul>
            <li><strong>Top pair:</strong> you paired the highest board card. Above: top pair with an Ace kicker.</li>
            <li><strong>Overpair:</strong> a pocket pair higher than every board card (like QQ on J-8-3).</li>
            <li><strong>Set:</strong> a pocket pair that matched a board card. Very strong and well hidden.</li>
          </ul>
        ),
        check: {
          q: 'You hold A♥ K♦ and the flop is K♣ 9♠ 2♥. What do you have?',
          options: [
            { label: 'Top pair, Ace kicker', correct: true, why: 'Your King pairs the top board card and your Ace is the best possible kicker.' },
            { label: 'Two pair', why: 'Only the King paired. The Ace is your kicker.' },
            { label: 'Nothing', why: 'Your King matched the board King. That is top pair.' },
          ],
        },
      },
      {
        title: 'Draws',
        visual: <Board board="Qh 8h 3c" hole="Ah 5h" />,
        body: (
          <>
            <p>A <strong>draw</strong> needs one more card to become strong.</p>
            <ul>
              <li><strong>Flush draw:</strong> 4 cards of one suit (above). 9 cards complete it.</li>
              <li><strong>Open-ended straight draw:</strong> 4 in a row like 9-8-7-6. 8 cards complete it.</li>
              <li><strong>Gutshot:</strong> a gap in the middle like 9-8-_-6. Only 4 cards complete it.</li>
            </ul>
          </>
        ),
      },
      {
        title: 'Kickers',
        body: (
          <p>When two players have the same pair, the next highest card (the <strong>kicker</strong>) decides. A-K beats K-Q on a King-high board. That's why weak kickers get beginners in trouble.</p>
        ),
      },
    ],
  },
  {
    id: 'pk-odds',
    title: 'Outs and odds made simple',
    icon: '🧮',
    blurb: 'The rule of 2 and 4, and pot odds',
    slides: [
      {
        title: 'Outs',
        body: <p><strong>Outs</strong> are the unseen cards that improve your hand to a likely winner. A flush draw has 9 outs (13 of the suit minus the 4 you see).</p>,
      },
      {
        title: 'The rule of 2 and 4',
        body: (
          <>
            <p>Quick way to turn outs into a percentage:</p>
            <ul>
              <li>On the <strong>flop</strong> (two cards to come, if you'll see both): outs × <strong>4</strong>.</li>
              <li>On the <strong>turn</strong> (one card to come): outs × <strong>2</strong>.</li>
            </ul>
            <p>Flush draw on the turn: 9 × 2 = about 18%.</p>
          </>
        ),
        check: {
          q: 'You have 8 outs with one card to come. About what is your chance?',
          options: [
            { label: '16%', correct: true, why: '8 × 2 = 16%. (Exact: 17%.)' },
            { label: '32%', why: "That's the rule of 4, for two cards to come. With one card it's 8 × 2 = 16%." },
            { label: '8%', why: 'Multiply outs by 2 with one card to come: 16%.' },
          ],
        },
      },
      {
        title: 'Pot odds',
        body: (
          <>
            <p>Compare your chance of winning with the price of calling:</p>
            <p className="callout">Price = your call ÷ (pot after you call)</p>
            <p>If the pot is $100 and your opponent bets $50, you call $50 to make a $200 pot: 50 ÷ 200 = <strong>25%</strong>. You need to win at least 25% of the time.</p>
            <p>Shortcuts: half-pot bet → 25%. Pot-size bet → 33%.</p>
          </>
        ),
      },
    ],
  },
  {
    id: 'pk-mistakes',
    title: 'Beginner mistakes to avoid',
    icon: '🚫',
    blurb: 'The leaks that cost new players the most',
    slides: [
      {
        title: 'The big 7',
        body: (
          <ol>
            <li><strong>Playing too many hands.</strong> Fold more before the flop.</li>
            <li><strong>Limping.</strong> Raise or fold when it's folded to you.</li>
            <li><strong>Chasing draws</strong> without the right pot odds.</li>
            <li><strong>Bluffing too much</strong> at low stakes. People call a lot there; bet your good hands instead.</li>
            <li><strong>Ignoring position.</strong> Play tighter early, looser on the button.</li>
            <li><strong>Falling in love with one pair</strong> when someone shows big strength.</li>
            <li><strong>Tilt:</strong> playing angry after a bad beat. Take a break.</li>
          </ol>
        ),
        check: {
          q: 'You just lost a big pot to a lucky river card. Best move?',
          options: [
            { label: 'Take a short break and reset', correct: true, why: 'Bad beats happen to everyone. Playing upset leads to bad decisions.' },
            { label: 'Play the next hands extra aggressively to win it back', why: "That's tilt. Chasing losses is how a bad hand becomes a bad night." },
          ],
        },
      },
      {
        title: 'Table manners',
        body: (
          <ul>
            <li>Act only when it's your turn.</li>
            <li>Say "raise" out loud, then put the chips out in one motion.</li>
            <li>Don't talk about a hand while it's being played.</li>
            <li>Keep your cards on the table and protect them with a chip.</li>
          </ul>
        ),
      },
      {
        title: 'Money management',
        body: (
          <p>Only play with money you can afford to lose. A common guide: bring at least 20 buy-ins for the stakes you play so normal swings don't wipe you out.</p>
        ),
      },
    ],
  },
];

export default function PokerLearn() {
  return (
    <Page title="Hold'em lessons" back="/poker" cheat="poker">
      <LessonBook lessons={LESSONS} afterAll={{ to: '/poker/rankings', label: 'Next: hand rankings' }} />
    </Page>
  );
}
