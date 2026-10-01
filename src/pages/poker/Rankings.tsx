import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { RankingsList } from '../../components/RankingsList';
import { Seg } from '../../components/ui';
import { QuizRunner } from '../../quiz/QuizRunner';
import { compareCategoryQuestion, nameHandQuestion } from '../../quiz/poker';

type Tab = 'learn' | 'compare' | 'name' | 'seven' | 'race';

export default function Rankings() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'learn';
  const compare = useCallback((f: boolean) => compareCategoryQuestion(f), []);
  const name5 = useCallback((f: boolean) => nameHandQuestion(f, false), []);
  const name7 = useCallback((f: boolean) => nameHandQuestion(f, true), []);
  return (
    <Page title="Hand rankings" back="/poker" cheat="poker">
      <div className="row center mb">
        <Seg
          value={tab}
          onChange={(t) => setParams({ tab: t }, { replace: true })}
          options={[
            { value: 'learn', label: 'Learn' },
            { value: 'compare', label: 'Which wins?' },
            { value: 'name', label: 'Name it' },
            { value: 'seven', label: 'Best hand' },
            { value: 'race', label: '⚡ Race' },
          ]}
        />
      </div>
      {tab === 'learn' && (
        <div className="stack">
          <div className="panel">
            <RankingsList />
          </div>
          <button className="btn primary" onClick={() => setParams({ tab: 'compare' }, { replace: true })}>
            Quiz me →
          </button>
        </div>
      )}
      {tab === 'compare' && <QuizRunner key="c" module="pk-rank" next={compare} focusPrefix="rk:" />}
      {tab === 'name' && <QuizRunner key="n" module="pk-rank" next={name5} focusPrefix="nh5:" />}
      {tab === 'seven' && (
        <>
          <p className="muted small">Real games give you 7 cards (2 yours + 5 on the board). Find the best 5.</p>
          <QuizRunner key="s" module="pk-rank" next={name7} focusPrefix="nh7:" />
        </>
      )}
      {tab === 'race' && (
        <QuizRunner
          key="r"
          module="pk-rank"
          mode="timed"
          seconds={45}
          bestKey="pk-rank-race"
          next={compare}
          intro={
            <>
              <div style={{ fontSize: '2.5rem' }}>🏁</div>
              <h2>Rankings race</h2>
              <p className="muted">Two hands appear. Pick the winner. How many can you get in 45 seconds? Keys 1 and 2.</p>
            </>
          }
        />
      )}
    </Page>
  );
}
