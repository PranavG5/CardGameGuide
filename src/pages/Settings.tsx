import { useState } from 'react';
import { Page } from '../components/Layout';
import { CardRow } from '../components/PlayingCard';
import { parseCards } from '../lib/cards';
import { resetProgress, setBankroll, updateSettings, useProgress } from '../lib/progress';

export default function Settings() {
  const p = useProgress();
  const s = p.settings;
  const [confirm, setConfirm] = useState(false);
  return (
    <Page title="Settings" back="/">
      <div className="section-title">Cards</div>
      <div className="panel">
        <label className="switch">
          <div>
            <div style={{ fontWeight: 700 }}>Four-color deck</div>
            <div className="small muted">Diamonds blue, clubs green. Makes flushes easier to spot.</div>
          </div>
          <input type="checkbox" checked={s.fourColor} onChange={(e) => updateSettings({ fourColor: e.target.checked })} />
        </label>
        <div className="row center" style={{ paddingTop: 10 }}>
          <CardRow cards={parseCards('As Kh Qd Jc')} size="sm" />
        </div>
      </div>

      <div className="section-title">Blackjack table rules</div>
      <div className="panel">
        <p className="small muted" style={{ marginBottom: 4 }}>Match the rules printed on the felt where you play. The chart, trainer and table all update.</p>
        <label className="switch">
          <div>
            <div style={{ fontWeight: 700 }}>Dealer hits soft 17 (H17)</div>
            <div className="small muted">Most common in US casinos today. Off means the dealer stands on all 17s.</div>
          </div>
          <input type="checkbox" checked={s.h17} onChange={(e) => updateSettings({ h17: e.target.checked })} />
        </label>
        <label className="switch">
          <div>
            <div style={{ fontWeight: 700 }}>Late surrender allowed</div>
            <div className="small muted">Give up half your bet on your first decision.</div>
          </div>
          <input type="checkbox" checked={s.surrender} onChange={(e) => updateSettings({ surrender: e.target.checked })} />
        </label>
        <label className="switch">
          <div>
            <div style={{ fontWeight: 700 }}>Double after split (DAS)</div>
            <div className="small muted">Allowed at most tables.</div>
          </div>
          <input type="checkbox" checked={s.das} onChange={(e) => updateSettings({ das: e.target.checked })} />
        </label>
      </div>

      <div className="section-title">Coaching</div>
      <div className="panel">
        <label className="switch">
          <div>
            <div style={{ fontWeight: 700 }}>Coach during games</div>
            <div className="small muted">Instant feedback on each decision at the blackjack and poker tables.</div>
          </div>
          <input type="checkbox" checked={s.coach} onChange={(e) => updateSettings({ coach: e.target.checked })} />
        </label>
      </div>

      <div className="section-title">Data</div>
      <div className="panel stack">
        <div className="small muted">Your progress is saved in this browser only. Nothing is sent anywhere.</div>
        <button className="btn" onClick={() => setBankroll(1000)}>
          Reset blackjack chips to $1,000
        </button>
        {confirm ? (
          <div className="row">
            <button
              className="btn bad"
              onClick={() => {
                resetProgress();
                setConfirm(false);
              }}
            >
              Yes, erase my progress
            </button>
            <button className="btn ghost" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn bad" onClick={() => setConfirm(true)}>
            Reset all progress
          </button>
        )}
      </div>
    </Page>
  );
}
