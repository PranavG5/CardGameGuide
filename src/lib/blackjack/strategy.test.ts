import { parseCards, type Card } from '../cards';
import { advise, startOptions, UPCARDS, type Rules, type Move } from './strategy';
import { dealerBust, startingEVs } from './ev';
import { handTotal, isBlackjack, totalLabel } from './hand';

const H17: Rules = { h17: true, surrender: true, das: true };
const S17: Rules = { h17: false, surrender: true, das: true };

const card = (v: number): Card => ({ rank: (v === 11 ? 14 : v) as Card['rank'], suit: 's' });

describe('hand totals', () => {
  it('counts aces as 1 or 11', () => {
    expect(handTotal(parseCards('Ah 6d'))).toEqual({ total: 17, soft: true });
    expect(handTotal(parseCards('Ah 6d Kc'))).toEqual({ total: 17, soft: false });
    expect(handTotal(parseCards('Ah Ad'))).toEqual({ total: 12, soft: true });
    expect(handTotal(parseCards('Ah Ad 9c'))).toEqual({ total: 21, soft: true });
    expect(isBlackjack(parseCards('Ah Kd'))).toBe(true);
    expect(totalLabel(parseCards('Th 6d 9c'))).toBe('25 Bust');
  });
});

describe('dealer odds', () => {
  it('bust rates look right', () => {
    expect(dealerBust(6, false)).toBeGreaterThan(0.41);
    expect(dealerBust(6, false)).toBeLessThan(0.43);
    expect(dealerBust(10, false)).toBeGreaterThan(0.2);
    expect(dealerBust(10, false)).toBeLessThan(0.24);
    expect(dealerBust(6, true)).toBeGreaterThan(dealerBust(6, false));
  });
});

describe('basic strategy', () => {
  const two = (a: string, b: string, up: number, rules = H17, surrender = false) =>
    advise(parseCards(`${a} ${b}`), up, rules, { ...startOptions(rules), canSurrender: surrender }).move;

  it('matches well-known plays', () => {
    expect(two('Ts', '6d', 10)).toBe('hit');
    expect(two('Ts', '6d', 10, H17, true)).toBe('surrender');
    expect(two('Ts', '6d', 6)).toBe('stand');
    expect(two('Ts', '2d', 3)).toBe('hit');
    expect(two('Ts', '2d', 4)).toBe('stand');
    expect(two('6s', '5d', 11, H17)).toBe('double');
    expect(two('6s', '5d', 11, S17)).toBe('hit');
    expect(two('As', '7d', 9)).toBe('hit');
    expect(two('As', '7d', 2, H17)).toBe('double');
    expect(two('As', '7d', 2, S17)).toBe('stand');
    expect(two('As', 'Ad', 10)).toBe('split');
    expect(two('8s', '8d', 10)).toBe('split');
    expect(two('8s', '8d', 11, H17, true)).toBe('surrender');
    expect(two('Ts', 'Kd', 6)).toBe('stand');
    expect(two('5s', '5d', 9)).toBe('double');
    expect(two('9s', '9d', 7)).toBe('stand');
    expect(two('9s', '9d', 8)).toBe('split');
    expect(two('4s', '4d', 5)).toBe('split');
    expect(two('4s', '4d', 5, { ...H17, das: false })).toBe('hit');
  });

  it('falls back when doubling is not allowed', () => {
    const r = advise(parseCards('2s 3d 6c'), 6, H17, { canDouble: false, canSplit: false, canSurrender: false });
    expect(r.move).toBe('hit');
    const s = advise(parseCards('As 2d 5c'), 4, H17, { canDouble: false, canSplit: false, canSurrender: false });
    expect(s.move).toBe('stand');
  });

  it('every explanation is non-empty', () => {
    for (const rules of [H17, S17]) {
      for (const up of UPCARDS) {
        for (let a = 2; a <= 11; a++) {
          for (let b = a; b <= 11; b++) {
            const cards = [card(a), card(b)];
            if (isBlackjack(cards)) continue;
            const adv = advise(cards, up, rules, startOptions(rules));
            expect(adv.reason.length).toBeGreaterThan(20);
          }
        }
      }
    }
  });

  /**
   * The chart is for 6 decks; EVs are infinite-deck. They should agree almost everywhere,
   * and where they don't the EV gap must be tiny.
   */
  it('agrees with expected-value math', () => {
    const disagreements: string[] = [];
    for (const rules of [H17, S17]) {
      for (const up of UPCARDS) {
        for (let a = 2; a <= 11; a++) {
          for (let b = a; b <= 11; b++) {
            const cards = [card(a), card(b)];
            if (isBlackjack(cards)) continue;
            const adv = advise(cards, up, rules, startOptions(rules));
            const evs = startingEVs(a, b, up, rules);
            const entries = Object.entries(evs) as [Move, number][];
            const best = entries.reduce((m, e) => (e[1] > m[1] ? e : m));
            const chosen = evs[adv.move]!;
            if (best[0] !== adv.move) {
              disagreements.push(`${rules.h17 ? 'H17' : 'S17'} ${a},${b} v ${up}: chart ${adv.move} (${chosen.toFixed(4)}) vs EV ${best[0]} (${best[1].toFixed(4)})`);
              expect(best[1] - chosen).toBeLessThan(0.02);
            }
          }
        }
      }
    }
    console.log(disagreements.join('\n'));
  });
});
