import type { ReactNode } from 'react';

export interface Choice {
  value: string;
  label: string;
  sub?: string;
}

export interface Question {
  /** Identifies the exact situation, for tracking mistakes. */
  key: string;
  prompt: ReactNode;
  visual: ReactNode;
  choices: Choice[];
  answer: string;
  /** Explanation shown after answering. */
  explain: ReactNode;
  /** Optional extra feedback that depends on the chosen answer. */
  extra?: (chosen: string) => ReactNode;
  /** Visual layout for the choices. */
  columns?: number;
}

/** Build the next question. `focus` asks for one of the player's weak spots when possible. */
export type NextQuestion = (focus: boolean) => Question;
