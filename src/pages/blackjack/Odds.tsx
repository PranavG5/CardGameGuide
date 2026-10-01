import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { dealerDist, startingEVs } from '../../lib/blackjack/ev';
import { upLabel } from '../../lib/blackjack/hand';
import { UPCARDS, type Rules } from '../../lib/blackjack/strategy';
import { useProgress } from '../../lib/progress';

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

export default function BlackjackOdds() {
  const { settings } = useProgress();
  const rules: Rules = { h17: settings.h17, surrender: settings.surrender, das: settings.das };
  const mistakes: { name: string; good: string; bad: string; cost: number }[] = [
    { name: 'Standing on 16 vs 10', good: 'Hit', bad: 'Stand', cost: (() => { const e = startingEVs(10, 6, 10, rules); return e.hit - e.stand; })() },
    { name: 'Not splitting 8s vs 10', good: 'Split', bad: 'Hit', cost: (() => { const e = startingEVs(8, 8, 10, rules); return e.split! - e.hit; })() },
    { name: 'Standing on soft 17 vs 6', good: 'Double', bad: 'Stand', cost: (() => { const e = startingEVs(11, 6, 6, rules); return e.double! - e.stand; })() },
    { name: 'Hitting 12 vs 6', good: 'Stand', bad: 'Hit', cost: (() => { const e = startingEVs(10, 2, 6, rules); return e.stand - e.hit; })() },
    { name: 'Not doubling 11 vs 6', good: 'Double', bad: 'Hit', cost: (() => { const e = startingEVs(6, 5, 6, rules); return e.double! - e.hit; })() },
    { name: 'Splitting 10s vs 6', good: 'Stand', bad: 'Split', cost: (() => { const e = startingEVs(10, 10, 6, rules); return e.stand - e.split!; })() },
    { name: 'Standing on soft 18 vs 10', good: 'Hit', bad: 'Stand', cost: (() => { const e = startingEVs(11, 7, 10, rules); return e.hit - e.stand; })() },
  ];
  return (
    <Page title="Why the chart works" back="/blackjack" cheat="blackjack">
      <p className="muted">
        The dealer has no choices: hit until 17. So each upcard leads to a predictable spread of final totals. Here's where the dealer ends up (after
        checking for blackjack), under your current rules.
      </p>
      <div className="panel">
        <div className="chart-wrap">
          <table className="simple">
            <thead>
              <tr>
                <th>Up</th>
                <th>17</th>
                <th>18</th>
                <th>19</th>
                <th>20</th>
                <th>21</th>
                <th>Bust</th>
              </tr>
            </thead>
            <tbody>
              {UPCARDS.map((u) => {
                const d = dealerDist(u, rules.h17);
                return (
                  <tr key={u}>
                    <td><strong>{upLabel(u)}</strong></td>
                    <td>{pct(d[17])}</td>
                    <td>{pct(d[18])}</td>
                    <td>{pct(d[19])}</td>
                    <td>{pct(d[20])}</td>
                    <td>{pct(d[21])}</td>
                    <td style={{ color: u <= 6 ? 'var(--good)' : 'var(--bad)', fontWeight: 800 }}>{pct(d.bust)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="callout mt">
        Notice the cliff between 6 and 7. With 2 to 6 showing the dealer busts 35 to 44% of the time, so you stand on stiff hands and double more. With 7 or
        higher the dealer usually makes a real hand, so you need to improve yours.
      </div>

      <h2 className="mt">What common mistakes cost</h2>
      <p className="muted small">Money lost per $100 bet each time you make the mistake instead of the right play.</p>
      <div className="panel">
        <table className="simple">
          <thead>
            <tr>
              <th>Mistake</th>
              <th>Right play</th>
              <th style={{ textAlign: 'right' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {mistakes
              .sort((a, b) => b.cost - a.cost)
              .map((m) => (
                <tr key={m.name}>
                  <td>{m.name}</td>
                  <td>{m.good}</td>
                  <td className="bad" style={{ textAlign: 'right', fontWeight: 800 }}>
                    ${(m.cost * 100).toFixed(0)}
                  </td>
                </tr>
              ))}
            <tr>
              <td>Taking insurance</td>
              <td>Decline</td>
              <td className="bad" style={{ textAlign: 'right', fontWeight: 800 }}>
                ~$4
              </td>
            </tr>
          </tbody>
        </table>
        <p className="small faint mt" style={{ marginBottom: 0 }}>Insurance cost is per $100 of original bet ($50 insurance bet with a ~7.7% house edge, 6 decks).</p>
      </div>
      <Link to="/blackjack/practice" className="btn primary block mt">
        Practice these spots →
      </Link>
    </Page>
  );
}
