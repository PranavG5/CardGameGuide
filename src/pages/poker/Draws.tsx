import { useCallback, useState } from 'react';
import { Page } from '../../components/Layout';
import { Seg } from '../../components/ui';
import { QuizRunner } from '../../quiz/QuizRunner';
import { drawQuestion, outsQuestion } from '../../quiz/poker';
import { hitChance } from '../../lib/poker/equity';

const COMMON = [
  { name: 'Gutshot straight draw', outs: 4 },
  { name: 'Open-ended straight draw', outs: 8 },
  { name: 'Flush draw', outs: 9 },
  { name: 'Flush draw + gutshot', outs: 12 },
  { name: 'Flush draw + open-ended', outs: 15 },
];

export default function Draws() {
  const [tab, setTab] = useState<'what' | 'outs' | 'table'>('what');
  const what = useCallback(() => drawQuestion(), []);
  const outs = useCallback(() => outsQuestion(), []);
  return (
    <Page title="Draws & outs" back="/poker" cheat="poker">
      <div className="row center mb">
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { value: 'what', label: 'What draw?' },
            { value: 'outs', label: 'Count outs' },
            { value: 'table', label: 'Cheat table' },
          ]}
        />
      </div>
      {tab === 'what' && <QuizRunner key="w" module="pk-outs" next={what} />}
      {tab === 'outs' && <QuizRunner key="o" module="pk-outs" next={outs} />}
      {tab === 'table' && (
        <div className="panel">
          <table className="simple">
            <thead>
              <tr>
                <th>Draw</th>
                <th>Outs</th>
                <th>Turn + river</th>
                <th>One card</th>
              </tr>
            </thead>
            <tbody>
              {COMMON.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td><strong>{c.outs}</strong></td>
                  <td>{Math.round(hitChance(c.outs, 47, 2) * 100)}%</td>
                  <td>{Math.round(hitChance(c.outs, 46, 1) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted mt" style={{ marginBottom: 0 }}>
            "Turn + river" is your chance from the flop if you see both cards. "One card" is from the turn to the river. Rule of 2 and 4 gets you close: outs × 4 or
            outs × 2.
          </p>
        </div>
      )}
    </Page>
  );
}
