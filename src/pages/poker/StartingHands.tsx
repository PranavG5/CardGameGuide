import { useCallback, useState } from 'react';
import { Page } from '../../components/Layout';
import { CardRow } from '../../components/PlayingCard';
import { Seg } from '../../components/ui';
import { ALL_CODES, cardsForCode, combos, OPEN_UP_TO, POSITION_INFO, tierOfCode, TIER_INFO, type Position, type Tier } from '../../lib/poker/preflop';
import { QuizRunner } from '../../quiz/QuizRunner';
import { tierQuestion } from '../../quiz/poker';

export function HandGrid({ position, onPick, selected }: { position: Position | 'all'; onPick: (code: string) => void; selected: string | null }) {
  return (
    <div className="hgrid">
      {ALL_CODES.map((code) => {
        const tier = tierOfCode(code);
        const playable = position === 'all' ? tier < 6 : tier <= OPEN_UP_TO[position];
        return (
          <button
            key={code}
            className={`${playable ? '' : 'off'} ${selected === code ? 'sel' : ''}`}
            style={{ background: TIER_INFO[tier].color }}
            onClick={() => onPick(code)}
            title={`${code}: ${TIER_INFO[tier].name}`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}

export default function StartingHands() {
  const [tab, setTab] = useState<'chart' | 'quiz'>('chart');
  const [pos, setPos] = useState<Position | 'all'>('all');
  const [sel, setSel] = useState<string | null>('AKs');
  const next = useCallback((f: boolean) => tierQuestion(f), []);
  const playableCombos = ALL_CODES.filter((c) => (pos === 'all' ? tierOfCode(c) < 6 : tierOfCode(c) <= OPEN_UP_TO[pos])).reduce((a, c) => a + combos(c), 0);
  const selTier = sel ? tierOfCode(sel) : 6;

  return (
    <Page title="Starting hands" back="/poker" cheat="poker">
      <div className="row center mb">
        <Seg value={tab} onChange={setTab} options={[{ value: 'chart', label: 'Chart' }, { value: 'quiz', label: 'Memory quiz' }]} />
      </div>
      {tab === 'chart' ? (
        <div className="stack">
          <p className="muted small" style={{ margin: 0 }}>
            Suited hands (same suit) are above the diagonal, offsuit below, pairs on the diagonal. Pick a seat to see which hands to raise when everyone folds to
            you.
          </p>
          <div className="row center">
            <Seg
              value={pos}
              onChange={setPos}
              options={[
                { value: 'all', label: 'All groups' },
                { value: 'early', label: 'Early' },
                { value: 'middle', label: 'Middle' },
                { value: 'late', label: 'Late' },
                { value: 'sb', label: 'Small blind' },
              ]}
            />
          </div>
          <HandGrid position={pos} onPick={setSel} selected={sel} />
          <div className="center small muted">
            {pos === 'all' ? 'Hands worth playing' : `Raise from ${POSITION_INFO[pos].name.toLowerCase()}`}: {((playableCombos / 1326) * 100).toFixed(0)}% of all hands
          </div>
          <div className="legend">
            {([1, 2, 3, 4, 5, 6] as Tier[]).map((t) => (
              <span key={t}>
                <i style={{ background: TIER_INFO[t].color }} /> {TIER_INFO[t].name}
              </span>
            ))}
          </div>
          {sel && (
            <div className="panel row" style={{ alignItems: 'center' }}>
              <CardRow cards={cardsForCode(sel)} size="md" />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 800 }}>
                  {sel} · <span style={{ color: TIER_INFO[selTier].color === '#6b7280' ? 'var(--muted)' : TIER_INFO[selTier].color, filter: 'brightness(1.4)' }}>{TIER_INFO[selTier].name}</span>
                </div>
                <div className="small muted">{TIER_INFO[selTier].blurb}</div>
              </div>
            </div>
          )}
          <div className="callout small">
            <strong>Why suited and connected hands matter:</strong> suited cards can make flushes and connected cards can make straights. That's why 7♥6♥ is
            playable from late position but 7♣2♦ never is.
          </div>
          <button className="btn primary" onClick={() => setTab('quiz')}>
            Test my memory →
          </button>
        </div>
      ) : (
        <QuizRunner module="pk-tier" next={next} focusPrefix="tier:" />
      )}
    </Page>
  );
}
