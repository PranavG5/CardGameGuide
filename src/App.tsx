import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ScrollToTop } from './components/Layout';
import Home from './pages/Home';

const BjHub = lazy(() => import('./pages/blackjack/Hub'));
const BjLearn = lazy(() => import('./pages/blackjack/Learn'));
const BjChart = lazy(() => import('./pages/blackjack/Chart'));
const BjPractice = lazy(() => import('./pages/blackjack/Practice'));
const BjDrill = lazy(() => import('./pages/blackjack/Drill'));
const BjPlay = lazy(() => import('./pages/blackjack/Play'));
const BjCounting = lazy(() => import('./pages/blackjack/Counting'));
const BjOdds = lazy(() => import('./pages/blackjack/Odds'));
const PkHub = lazy(() => import('./pages/poker/Hub'));
const PkLearn = lazy(() => import('./pages/poker/Learn'));
const PkRankings = lazy(() => import('./pages/poker/Rankings'));
const PkStarting = lazy(() => import('./pages/poker/StartingHands'));
const PkPreflop = lazy(() => import('./pages/poker/Preflop'));
const PkShowdown = lazy(() => import('./pages/poker/Showdown'));
const PkDraws = lazy(() => import('./pages/poker/Draws'));
const PkPotOdds = lazy(() => import('./pages/poker/PotOdds'));
const PkPlay = lazy(() => import('./pages/poker/Play'));
const PkCalc = lazy(() => import('./pages/poker/Calculator'));
const Daily = lazy(() => import('./pages/Daily'));
const Glossary = lazy(() => import('./pages/Glossary'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="center muted" style={{ padding: 60 }}>Shuffling…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blackjack" element={<BjHub />} />
          <Route path="/blackjack/learn" element={<BjLearn />} />
          <Route path="/blackjack/chart" element={<BjChart />} />
          <Route path="/blackjack/practice" element={<BjPractice />} />
          <Route path="/blackjack/drill" element={<BjDrill />} />
          <Route path="/blackjack/play" element={<BjPlay />} />
          <Route path="/blackjack/counting" element={<BjCounting />} />
          <Route path="/blackjack/odds" element={<BjOdds />} />
          <Route path="/poker" element={<PkHub />} />
          <Route path="/poker/learn" element={<PkLearn />} />
          <Route path="/poker/rankings" element={<PkRankings />} />
          <Route path="/poker/starting-hands" element={<PkStarting />} />
          <Route path="/poker/preflop" element={<PkPreflop />} />
          <Route path="/poker/showdown" element={<PkShowdown />} />
          <Route path="/poker/draws" element={<PkDraws />} />
          <Route path="/poker/pot-odds" element={<PkPotOdds />} />
          <Route path="/poker/play" element={<PkPlay />} />
          <Route path="/poker/calculator" element={<PkCalc />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
