import { useCallback, useState } from 'react';
import { Page } from '../../components/Layout';
import { Seg } from '../../components/ui';
import { QuizRunner } from '../../quiz/QuizRunner';
import { callFoldQuestion, priceQuestion } from '../../quiz/poker';

const SIZES = [
  { label: '¼ pot', frac: 0.25 },
  { label: '⅓ pot', frac: 1 / 3 },
  { label: '½ pot', frac: 0.5 },
  { label: '¾ pot', frac: 0.75 },
  { label: 'Pot', frac: 1 },
  { label: '2× pot', frac: 2 },
];

export default function PotOdds() {
  const [tab, setTab] = useState<'learn' | 'price' | 'decide'>('learn');
  const price = useCallback(() => priceQuestion(), []);
  const decide = useCallback(() => callFoldQuestion(), []);
  return (
    <Page title="Pot odds" back="/poker" cheat="poker">
      <div className="row center mb">
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'learn', label: 'How it works' },
            { value: 'price', label: 'Find the price' },
            { value: 'decide', label: 'Call or fold?' },
          ]}
        />
      </div>
      {tab === 'learn' && (
        <div className="stack">
          <div className="panel">
            <h2>The one-line rule</h2>
            <p>
              <strong>Call when your chance of winning is bigger than the price.</strong>
            </p>
            <p className="callout">Price = amount to call ÷ (pot + their bet + your call)</p>
            <p>
              Example: the pot is $100 and your opponent bets $50. You call $50 to make a $200 pot. Price = 50 ÷ 200 = <strong>25%</strong>. With a flush draw on
              the turn (about 20%), that's a fold. Against a $20 bet (price 14%), it's a call.
            </p>
          </div>
          <div className="panel">
            <h3>Memorize these prices</h3>
            <table className="simple">
              <thead>
                <tr>
                  <th>Their bet</th>
                  <th>You need to win</th>
                </tr>
              </thead>
              <tbody>
                {SIZES.map((s) => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td><strong>{Math.round((s.frac / (1 + 2 * s.frac)) * 100)}%</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="callout info small">
            Bigger bets need a stronger hand to call. That's why a big bet with a draw usually means fold, and a small bet usually means call.
          </div>
          <button className="btn primary" onClick={() => setTab('price')}>
            Practice →
          </button>
        </div>
      )}
      {tab === 'price' && <QuizRunner key="p" module="pk-potodds" next={price} />}
      {tab === 'decide' && <QuizRunner key="d" module="pk-potodds" next={decide} />}
    </Page>
  );
}
