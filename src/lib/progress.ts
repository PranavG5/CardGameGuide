import { useSyncExternalStore } from 'react';

export interface Settings {
  fourColor: boolean;
  h17: boolean;
  surrender: boolean;
  das: boolean;
  coach: boolean;
}

export interface Stat {
  a: number;
  c: number;
}

export interface Spot extends Stat {
  /** Last time seen (ms). */
  t: number;
  /** Consecutive correct answers, used to retire a weak spot. */
  run: number;
}

export interface Progress {
  version: 1;
  xp: number;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
  lessons: Record<string, boolean>;
  modules: Record<string, Stat>;
  spots: Record<string, Spot>;
  best: Record<string, number>;
  daily: Record<string, number>;
  bjBankroll: number;
  hands: { bj: number; poker: number };
  settings: Settings;
}

const KEY = 'cardgameguide:v1';

const fresh = (): Progress => ({
  version: 1,
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  lessons: {},
  modules: {},
  spots: {},
  best: {},
  daily: {},
  bjBankroll: 1000,
  hands: { bj: 0, poker: 0 },
  settings: { fourColor: false, h17: true, surrender: false, das: true, coach: true },
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<Progress>;
    const base = fresh();
    return { ...base, ...p, settings: { ...base.settings, ...p.settings }, hands: { ...base.hands, ...p.hands } } as Progress;
  } catch {
    return fresh();
  }
}

let state: Progress = typeof window === 'undefined' ? fresh() : load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode); progress just won't persist */
  }
}

function set(fn: (p: Progress) => Progress) {
  state = fn(state);
  save();
  listeners.forEach((l) => l());
}

export const getProgress = () => state;

export function useProgress(): Progress {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function withStreak(p: Progress): Progress {
  const t = today();
  if (p.lastDay === t) return p;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const streak = p.lastDay === yesterday ? p.streak + 1 : 1;
  return { ...p, lastDay: t, streak, bestStreak: Math.max(p.bestStreak, streak) };
}

/** Record one answer. `spot` is a key that identifies the exact situation for spaced repetition. */
export function recordAnswer(module: string, spot: string | null, correct: boolean, xp = correct ? 10 : 2) {
  set((p) => {
    const m = p.modules[module] ?? { a: 0, c: 0 };
    const spots = { ...p.spots };
    if (spot) {
      const s = spots[spot] ?? { a: 0, c: 0, t: 0, run: 0 };
      spots[spot] = { a: s.a + 1, c: s.c + (correct ? 1 : 0), t: Date.now(), run: correct ? s.run + 1 : 0 };
    }
    return withStreak({ ...p, xp: p.xp + xp, modules: { ...p.modules, [module]: { a: m.a + 1, c: m.c + (correct ? 1 : 0) } }, spots });
  });
}

export function completeLesson(id: string) {
  set((p) => withStreak({ ...p, xp: p.xp + (p.lessons[id] ? 0 : 25), lessons: { ...p.lessons, [id]: true } }));
}

export function setBest(id: string, score: number): boolean {
  const prev = state.best[id] ?? 0;
  if (score > prev) {
    set((p) => ({ ...p, best: { ...p.best, [id]: score } }));
    return true;
  }
  return false;
}

export function setDaily(score: number) {
  set((p) => withStreak({ ...p, daily: { ...p.daily, [today()]: score } }));
}

export function addHands(game: 'bj' | 'poker', n = 1, xp = 3) {
  set((p) => withStreak({ ...p, xp: p.xp + xp * n, hands: { ...p.hands, [game]: p.hands[game] + n } }));
}

export function setBankroll(n: number) {
  set((p) => ({ ...p, bjBankroll: n }));
}

export function updateSettings(patch: Partial<Settings>) {
  set((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
}

export function resetProgress() {
  const settings = state.settings;
  set(() => ({ ...fresh(), settings }));
}

/** Spots answered wrong recently that have not been fixed yet (fewer than 2 right in a row). */
export function weakSpots(prefix: string): string[] {
  return Object.entries(state.spots)
    .filter(([k, s]) => k.startsWith(prefix) && s.a > s.c && s.run < 2)
    .sort((a, b) => a[1].c / a[1].a - b[1].c / b[1].a)
    .map(([k]) => k);
}

export const accuracy = (s?: Stat) => (s && s.a ? s.c / s.a : 0);

const LEVELS = [
  { at: 1, title: 'Rookie' },
  { at: 2, title: 'Learner' },
  { at: 4, title: 'Regular' },
  { at: 6, title: 'Sharp' },
  { at: 9, title: 'Shark' },
  { at: 13, title: 'Pro' },
  { at: 18, title: 'Legend' },
];

export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 40)) + 1;
  const cur = 40 * (level - 1) ** 2;
  const nxt = 40 * level ** 2;
  const title = [...LEVELS].reverse().find((l) => level >= l.at)!.title;
  return { level, title, into: xp - cur, need: nxt - cur, frac: (xp - cur) / (nxt - cur) };
}
