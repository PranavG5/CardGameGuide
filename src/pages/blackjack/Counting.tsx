import { useCallback, useEffect, useState } from 'react';
import { Page } from '../../components/Layout';
import { CardRow, PlayingCard } from '../../components/PlayingCard';
import { Seg } from '../../components/ui';
import { type Card, makeDeck, parseCards, pick, shuffle } from '../../lib/cards';
import { hiLo } from '../../lib/blackjack/hand';
import { recordAnswer, setBest, useProgress } from '../../lib/progress';
import { QuizRunner } from '../../quiz/QuizRunner';
import type { Question } from '../../quiz/types';

function valueQuestion(): Question {
  const c = pick(makeDeck());
  const v = hiLo(c.rank);
  return {
    key: `hilo:${v}`,
    prompt: 'Hi-Lo value?',
    visual: (
      <div className="felt">
        <div className="row center">
          <PlayingCard card={c} size="lg" deal />
        </div>
      </div>
    ),
    choices: [
      { value: '1', label: '+1', sub: '2 to 6' },
      { value: '0', label: '0', sub: '7 to 9' },
      { value: '-1', label: '−1', sub: '10 to A' },
    ],
    columns: 3,
    answer: String(v),
    explain: <span>Low cards (2-6) are +1, middle cards (7-9) are 0, high cards (10, J, Q, K, A) are −1.</span>,
  };
}

const SPEEDS = [
  { value: '1200', label: 'Slow' },
  { value: '800', label: 'Medium' },
  { value: '500', label: 'Fast' },
];
const LENGTHS = [
  { value: '10', label: '10 cards' },
  { value: '20', label: '20 cards' },
  { value: '30', label: '30 cards' },
];

function RunningCountDrill() {
  const p = useProgress();
  const [speed, setSpeed] = useState('1200');
  const [len, setLen] = useState('10');
  const [phase, setPhase] = useState<'setup' | 'showing' | 'answer' | 'result'>('setup');
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState('');
  const count = cards.reduce((a, c) => a + hiLo(c.rank), 0);

  useEffect(() => {
    if (phase !== 'showing') return;
    if (i >= cards.length) {
      setPhase('answer');
      return;
    }
    const id = window.setTimeout(() => setI((x) => x + 1), Number(speed));
    return () => window.clearTimeout(id);
  }, [phase, i, cards.length, speed]);

  const start = useCallback(() => {
    setCards(shuffle(makeDeck()).slice(0, Number(len)));
    setI(0);
    setGuess('');
    setPhase('showing');
  }, [len]);

  const submit = () => {
    const ok = Number(guess) === count;
    recordAnswer('bj-count', `count:${len}`, ok, ok ? 15 : 3);
    if (ok) setBest(`count-${len}-${speed}`, 1);
    setPhase('result');
  };

  const bestKey = `count-${len}-${speed}`;

  return (
    <div className="stack">
      {phase === 'setup' && (
        <div className="panel stack center">
          <p className="muted" style={{ margin: 0 }}>Cards flash one at a time. Keep the running count in your head, then enter it.</p>
          <div className="row center">
            <Seg value={speed} onChange={setSpeed} options={SPEEDS} />
            <Seg value={len} onChange={setLen} options={LENGTHS} />
          </div>
          {p.best[bestKey] ? <div className="small good">✓ You've nailed this level before.</div> : null}
          <button className="btn primary block" onClick={start}>
            Start
          </button>
        </div>
      )}
      {phase === 'showing' && (
        <div className="felt center" style={{ minHeight: 190 }}>
          <div className="label">
            Card {Math.min(i + 1, cards.length)} of {cards.length}
          </div>
          <div className="row center">{cards[i] && <PlayingCard key={i} card={cards[i]} size="lg" deal />}</div>
        </div>
      )}
      {phase === 'answer' && (
        <div className="panel stack center">
          <strong>What's the running count?</strong>
          <input
            type="number"
            inputMode="numeric"
            value={guess}
            autoFocus
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guess !== '' && submit()}
            placeholder="e.g. 3 or -2"
            style={{ maxWidth: 200, margin: '0 auto', textAlign: 'center', fontSize: '1.3rem' }}
          />
          <button className="btn primary block" onClick={submit} disabled={guess === '' || guess === '-'}>
            Check
          </button>
        </div>
      )}
      {phase === 'result' && (
        <div className={`feedback ${Number(guess) === count ? 'ok' : 'no'}`}>
          <div className="head">{Number(guess) === count ? `✅ Correct! The count is ${count}.` : `❌ The count was ${count > 0 ? '+' : ''}${count}. You said ${guess}.`}</div>
          <div className="small">Here are the cards with their values:</div>
          <div className="cards mt" style={{ gap: 8 }}>
            {cards.map((c, k) => (
              <div key={k} className="center">
                <PlayingCard card={c} size="sm" />
                <div className="small" style={{ fontWeight: 800, color: hiLo(c.rank) > 0 ? 'var(--good)' : hiLo(c.rank) < 0 ? 'var(--bad)' : 'var(--muted)' }}>
                  {hiLo(c.rank) > 0 ? '+1' : hiLo(c.rank) < 0 ? '−1' : '0'}
                </div>
              </div>
            ))}
          </div>
          <div className="small mt muted">Tip: cancel pairs. A low card and a high card together add up to 0, so you can skip past them.</div>
          <button className="btn primary block mt" onClick={start}>
            Go again
          </button>
          <button className="btn ghost block" onClick={() => setPhase('setup')}>
            Change speed or length
          </button>
        </div>
      )}
    </div>
  );
}

export default function Counting() {
  const [tab, setTab] = useState<'learn' | 'values' | 'running'>('learn');
  const next = useCallback(() => valueQuestion(), []);
  return (
    <Page title="Card counting basics" back="/blackjack" cheat="blackjack">
      <div className="row center mb">
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'learn', label: 'How it works' },
            { value: 'values', label: 'Value drill' },
            { value: 'running', label: 'Running count' },
          ]}
        />
      </div>
      {tab === 'learn' && (
        <div className="stack">
          <div className="callout info small">
            Advanced topic. Master basic strategy first: counting is worthless if you still make playing mistakes.
          </div>
          <div className="panel">
            <h2>Why counting works</h2>
            <p>
              When lots of 10s and Aces are left in the shoe, blackjacks come more often (and they pay you 3 to 2) and the dealer busts more. That swings the edge
              toward you. Counting tracks whether the remaining cards are rich in high cards.
            </p>
          </div>
          <div className="panel">
            <h2>The Hi-Lo system</h2>
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="center">
                <CardRow cards={parseCards('2h 4s 6d')} size="sm" overlap center />
                <div className="good" style={{ fontWeight: 900, fontSize: '1.4rem' }}>+1</div>
                <div className="small muted">2 to 6</div>
              </div>
              <div className="center">
                <CardRow cards={parseCards('7c 8h 9s')} size="sm" overlap center />
                <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>0</div>
                <div className="small muted">7 to 9</div>
              </div>
              <div className="center">
                <CardRow cards={parseCards('Td Ks Ah')} size="sm" overlap center />
                <div className="bad" style={{ fontWeight: 900, fontSize: '1.4rem' }}>−1</div>
                <div className="small muted">10 to Ace</div>
              </div>
            </div>
            <ol className="mt">
              <li>Start at 0 after a shuffle.</li>
              <li>Add each card's value as it's dealt. That total is the <strong>running count</strong>.</li>
              <li>
                Divide by the decks left in the shoe to get the <strong>true count</strong>. Running count +6 with 3 decks left = true count +2.
              </li>
              <li>The higher the true count, the better for you. Counters raise bets when it's +2 or more and bet the minimum otherwise.</li>
            </ol>
          </div>
          <div className="panel small">
            <h3>Good to know</h3>
            <ul>
              <li>Counting in your head is legal, but casinos can ask you to stop playing blackjack.</li>
              <li>The edge is small (around 1%) and swings are big. It takes thousands of hands to show.</li>
              <li>You can practice live: turn on <strong>Count</strong> at the blackjack table to check yourself.</li>
            </ul>
          </div>
          <button className="btn primary" onClick={() => setTab('values')}>
            Start the value drill →
          </button>
        </div>
      )}
      {tab === 'values' && (
        <QuizRunner
          module="bj-count"
          mode="timed"
          seconds={30}
          bestKey="hilo-values"
          next={next}
          intro={
            <>
              <h2>30-second value drill</h2>
              <p className="muted">Tag each card +1, 0 or −1 as fast as you can. Keys 1, 2, 3.</p>
            </>
          }
        />
      )}
      {tab === 'running' && <RunningCountDrill />}
    </Page>
  );
}
