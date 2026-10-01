import { useState } from 'react';
import { type Card, type Rank } from '../lib/cards';
import { advise, hardCode, MOVE_LABEL, pairCode, type Rules, softCode, startOptions, UPCARDS, type Code } from '../lib/blackjack/strategy';
import { upLabel } from '../lib/blackjack/hand';
import { useProgress } from '../lib/progress';

export type ChartTable = 'hard' | 'soft' | 'pair';

/** Letter and color class for a chart code under the current rules. */
export function display(code: Code, rules: Rules): { letter: string; cls: string } {
  switch (code) {
    case 'H': return { letter: 'H', cls: 'c-H' };
    case 'S': return { letter: 'S', cls: 'c-S' };
    case 'Dh': return { letter: 'D', cls: 'c-D' };
    case 'Ds': return { letter: 'Ds', cls: 'c-D' };
    case 'P': return { letter: 'P', cls: 'c-P' };
    case 'Ph': return rules.das ? { letter: 'P', cls: 'c-P' } : { letter: 'H', cls: 'c-H' };
    case 'Rh': return rules.surrender ? { letter: 'R', cls: 'c-R' } : { letter: 'H', cls: 'c-H' };
    case 'Rs': return rules.surrender ? { letter: 'R', cls: 'c-R' } : { letter: 'S', cls: 'c-S' };
    case 'Rp': return rules.surrender ? { letter: 'R', cls: 'c-R' } : { letter: 'P', cls: 'c-P' };
  }
}

export const HARD_ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
export const SOFT_ROWS = [13, 14, 15, 16, 17, 18, 19, 20];
export const PAIR_ROWS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const rowLabel = (table: ChartTable, r: number) =>
  table === 'hard' ? (r === 8 ? '5-8' : r === 17 ? '17+' : String(r)) : table === 'soft' ? `A,${r - 11}` : r === 11 ? 'A,A' : r === 10 ? '10,10' : `${r},${r}`;

export const codeFor = (table: ChartTable, r: number, up: number, rules: Rules) =>
  table === 'hard' ? hardCode(r, up, rules) : table === 'soft' ? softCode(r, up, rules) : pairCode(r, up, rules);

const c = (v: number, suit: Card['suit'] = 's'): Card => ({ rank: (v === 11 ? 14 : v) as Rank, suit });

/** Representative two-card hand for a chart cell. */
export function sampleCards(table: ChartTable, r: number): Card[] {
  if (table === 'pair') return [c(r, 's'), c(r, 'h')];
  if (table === 'soft') return [c(11, 's'), c(r - 11, 'd')];
  const pairs: Record<number, [number, number]> = { 8: [5, 3], 9: [6, 3], 10: [6, 4], 11: [7, 4], 12: [10, 2], 13: [10, 3], 14: [10, 4], 15: [10, 5], 16: [10, 6], 17: [10, 7] };
  const [a, b] = pairs[r];
  return [c(a, 'c'), c(b, 'd')];
}

const TITLES: Record<ChartTable, string> = { hard: 'Hard totals (no Ace, or Ace counted as 1)', soft: 'Soft totals (Ace counted as 11)', pair: 'Pairs' };

export function StrategyChart({ only, focus }: { only?: ChartTable; focus?: { table: ChartTable; row: number; up: number } }) {
  const { settings } = useProgress();
  const rules: Rules = { h17: settings.h17, surrender: settings.surrender, das: settings.das };
  const [sel, setSel] = useState<{ table: ChartTable; row: number; up: number } | null>(focus ?? null);
  const tables: ChartTable[] = only ? [only] : ['hard', 'soft', 'pair'];
  const selAdvice = sel ? advise(sampleCards(sel.table, sel.row), sel.up, rules, startOptions(rules)) : null;

  return (
    <div>
      <p className="small muted center" style={{ marginBottom: 6 }}>
        Rules: 6 decks, dealer {rules.h17 ? 'hits' : 'stands on'} soft 17, double after split {rules.das ? 'allowed' : 'not allowed'}, surrender {rules.surrender ? 'allowed' : 'not offered'}. Change in Settings.
      </p>
      <Legend />
      {tables.map((table) => (
        <div key={table} className="mt">
          <h3 className="center">{TITLES[table]}</h3>
          <div className="chart-wrap">
            <table className="chart">
              <thead>
                <tr>
                  <th />
                  {UPCARDS.map((u) => (
                    <th key={u}>{upLabel(u)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(table === 'hard' ? HARD_ROWS : table === 'soft' ? SOFT_ROWS : PAIR_ROWS).map((r) => (
                  <tr key={r}>
                    <th style={{ textAlign: 'right' }}>{rowLabel(table, r)}</th>
                    {UPCARDS.map((u) => {
                      const d = display(codeFor(table, r, u, rules), rules);
                      const isSel = sel && sel.table === table && sel.row === r && sel.up === u;
                      return (
                        <td key={u} className={`${d.cls} ${isSel ? 'sel' : ''}`} onClick={() => setSel({ table, row: r, up: u })} title={`${rowLabel(table, r)} vs ${upLabel(u)}`}>
                          {d.letter}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sel && sel.table === table && selAdvice && (
            <div className="callout mt" style={{ textAlign: 'left' }}>
              <strong>
                {rowLabel(table, sel.row)} vs dealer {upLabel(sel.up)}: {MOVE_LABEL[selAdvice.move]}
              </strong>
              <div className="small">{selAdvice.reason}</div>
            </div>
          )}
        </div>
      ))}
      <p className="small faint center mt">Tap any square to see why. Dealer's upcard runs across the top.</p>
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend">
      <span><i className="c-H" /> H Hit</span>
      <span><i className="c-S" /> S Stand</span>
      <span><i className="c-D" /> D Double (else hit)</span>
      <span><i className="c-D" /> Ds Double (else stand)</span>
      <span><i className="c-P" /> P Split</span>
      <span><i className="c-R" /> R Surrender</span>
    </div>
  );
}

/** One chart row with a highlighted column, used in feedback. */
export function ChartRow({ table, row, up, rules }: { table: ChartTable; row: number; up: number; rules: Rules }) {
  return (
    <div className="chart-wrap">
      <table className="chart">
        <thead>
          <tr>
            <th />
            {UPCARDS.map((u) => (
              <th key={u}>{upLabel(u)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={{ textAlign: 'right' }}>{rowLabel(table, row)}</th>
            {UPCARDS.map((u) => {
              const d = display(codeFor(table, row, u, rules), rules);
              return (
                <td key={u} className={`${d.cls} ${u === up ? 'sel' : 'dimmed'}`}>
                  {d.letter}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
