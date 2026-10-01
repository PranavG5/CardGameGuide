import { type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { levelInfo, useProgress } from '../lib/progress';
import { Modal } from './ui';
import { RankingsList } from './RankingsList';
import { StrategyChart } from './StrategyChart';

interface PageProps {
  title?: string;
  back?: string;
  wide?: boolean;
  children: ReactNode;
  /** Which quick reference the cheat-sheet button opens. */
  cheat?: 'poker' | 'blackjack';
}

export function Page({ title, back, wide, children, cheat }: PageProps) {
  const p = useProgress();
  const nav = useNavigate();
  const lvl = levelInfo(p.xp);
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    document.title = title ? `${title} · Card Game Guide` : 'Card Game Guide: Learn Blackjack & Poker';
  }, [title]);
  return (
    <div className={`app ${p.settings.fourColor ? 'four-color' : ''}`}>
      <header className="topbar">
        {back !== undefined ? (
          <button className="back" onClick={() => (window.history.length > 1 ? nav(-1) : nav(back))} aria-label="Back">
            ←
          </button>
        ) : null}
        {title ? (
          <div className="title">{title}</div>
        ) : (
          <Link to="/" className="brand title">
            <span className="logo">🂡</span> Card Game Guide
          </Link>
        )}
        <div className="right">
          {cheat && (
            <button className="icon-btn" onClick={() => setSheet(true)} title="Cheat sheet">
              📋 <span className="hide-xs">Cheat sheet</span>
            </button>
          )}
          <Link to="/progress" className="pill" title={`Level ${lvl.level} ${lvl.title}`}>
            {p.streak > 0 ? `🔥 ${p.streak}` : '⭐'} · Lv {lvl.level}
          </Link>
        </div>
      </header>
      <main className={`page ${wide ? 'wide' : ''}`}>{children}</main>
      <footer className="footer">
        For learning only. No real money is used. Even perfect play can't beat the house edge in the long run.
        <br />
        If gambling stops being fun, help is available at{' '}
        <a href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noreferrer">
          ncpgambling.org
        </a>{' '}
        or 1-800-GAMBLER.
      </footer>
      {sheet && cheat === 'poker' && (
        <Modal title="Poker hand rankings" onClose={() => setSheet(false)}>
          <RankingsList compact />
        </Modal>
      )}
      {sheet && cheat === 'blackjack' && (
        <Modal title="Blackjack basic strategy" onClose={() => setSheet(false)}>
          <StrategyChart />
        </Modal>
      )}
    </div>
  );
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}
