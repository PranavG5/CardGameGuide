import type { Progress } from './progress';

export interface Step {
  id: string;
  to: string;
  icon: string;
  name: string;
  desc: string;
  /** 0..1 completion. */
  done: (p: Progress) => number;
}

const correct = (p: Progress, m: string) => p.modules[m]?.c ?? 0;
const lessonsDone = (p: Progress, ids: string[]) => ids.filter((id) => p.lessons[id]).length / ids.length;

export const BJ_LESSONS = ['bj-goal', 'bj-round', 'bj-moves', 'bj-soft', 'bj-dealer', 'bj-rules', 'bj-money'];
export const PK_LESSONS = ['pk-goal', 'pk-rounds', 'pk-actions', 'pk-position', 'pk-starting', 'pk-postflop', 'pk-odds', 'pk-mistakes'];

export const BJ_PATH: Step[] = [
  { id: 'learn', to: '/blackjack/learn', icon: '📖', name: 'Learn the basics', desc: '7 short lessons, about 8 minutes total', done: (p) => lessonsDone(p, BJ_LESSONS) },
  { id: 'chart', to: '/blackjack/chart', icon: '🗺️', name: 'The strategy chart', desc: 'The math-perfect play for every hand', done: (p) => (p.lessons['bj-chart-seen'] ? 1 : 0) },
  { id: 'practice', to: '/blackjack/practice', icon: '🎯', name: 'Practice hands', desc: 'Make the call, get instant coaching', done: (p) => Math.min(1, correct(p, 'bj-practice') / 25) },
  { id: 'drill', to: '/blackjack/drill', icon: '⚡', name: 'Speed drill', desc: '60-second memory game', done: (p) => Math.min(1, (p.best['bj-drill'] ?? 0) / 15) },
  { id: 'play', to: '/blackjack/play', icon: '🃏', name: 'Play with a coach', desc: 'Real game, coach flags mistakes', done: (p) => Math.min(1, p.hands.bj / 20) },
];

export const PK_PATH: Step[] = [
  { id: 'learn', to: '/poker/learn', icon: '📖', name: 'Learn the basics', desc: '8 short lessons, about 10 minutes total', done: (p) => lessonsDone(p, PK_LESSONS) },
  { id: 'rankings', to: '/poker/rankings', icon: '🏆', name: 'Hand rankings', desc: 'Learn what beats what, then quiz yourself', done: (p) => Math.min(1, correct(p, 'pk-rank') / 20) },
  { id: 'starting', to: '/poker/starting-hands', icon: '✋', name: 'Starting hands', desc: 'Which two cards are worth playing', done: (p) => Math.min(1, correct(p, 'pk-tier') / 15) },
  { id: 'preflop', to: '/poker/preflop', icon: '🎯', name: 'Preflop practice', desc: 'Fold, call or raise in every seat', done: (p) => Math.min(1, correct(p, 'pk-preflop') / 25) },
  { id: 'showdown', to: '/poker/showdown', icon: '⚖️', name: 'Who wins?', desc: 'Read the board and kickers', done: (p) => Math.min(1, correct(p, 'pk-showdown') / 15) },
  { id: 'draws', to: '/poker/draws', icon: '🎲', name: 'Draws & outs', desc: 'Count your outs like a pro', done: (p) => Math.min(1, correct(p, 'pk-outs') / 15) },
  { id: 'potodds', to: '/poker/pot-odds', icon: '🧮', name: 'Pot odds', desc: 'Know when a call is worth it', done: (p) => Math.min(1, correct(p, 'pk-potodds') / 10) },
  { id: 'play', to: '/poker/play', icon: '🃏', name: 'Play with a coach', desc: '6-player table with live advice', done: (p) => Math.min(1, p.hands.poker / 20) },
];

export const pathProgress = (steps: Step[], p: Progress) => steps.reduce((a, s) => a + s.done(p), 0) / steps.length;
export const nextStep = (steps: Step[], p: Progress) => steps.find((s) => s.done(p) < 1) ?? null;
