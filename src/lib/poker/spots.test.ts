import { describe, expect, it } from 'vitest';
import { parseCards, sameCard } from '../cards';
import { connectLevel, hasStrongDraw, leakOf, makeSpot, solvePostflop, type PostflopSpot } from './spots';

const post = (hero: string, board: string, pot: number, bet: number, opponents = 1): PostflopSpot => {
  const b = parseCards(board);
  return { kind: 'post', street: b.length === 3 ? 'flop' : b.length === 4 ? 'turn' : 'river', hero: parseCards(hero), board: b, opponents, pot, bet, betLabel: '' };
};

describe('spot solver', () => {
  it('raises the nuts facing a bet', () => {
    const s = solvePostflop(post('As Ks', 'Qs Js Ts 4d 2c', 100, 50));
    expect(s.equity).toBe(1);
    expect(s.answer).toBe('raise');
  });

  it('folds nothing on the river facing a pot-sized bet', () => {
    const s = solvePostflop(post('3c 2d', 'Ah Kd Qs 9c 8h', 100, 100));
    expect(s.answer).toBe('fold');
    expect(s.evCall).toBeLessThan(0);
  });

  it('never folds when nobody has bet', () => {
    const s = solvePostflop(post('3c 2d', 'Ah Kd Qs 9c 8h', 100, 0));
    expect(s.answer).toBe('call');
    expect(s.need).toBe(0);
  });

  it('bets a set when checked to', () => {
    const s = solvePostflop(post('9h 9d', '9s 5c 2h', 20, 0));
    expect(s.answer).toBe('raise');
  });

  it('calls a small bet with a flush draw on the flop', () => {
    const s = solvePostflop(post('Ah 5h', 'Kh 9h 2c', 30, 10));
    expect(s.need).toBeCloseTo(10 / 50);
    expect(s.answer).toBe('call');
  });

  it('computes the price with extra callers', () => {
    const s = solvePostflop(post('Ah 5h', 'Kh 9h 2c', 30, 10, 2));
    // pot 30 + bet 10 + caller 10 + your 10
    expect(s.total).toBe(60);
    expect(s.need).toBeCloseTo(10 / 60);
  });
});

describe('range helpers', () => {
  it('rates board connection', () => {
    const board = parseCards('Kd 8s 3c');
    expect(connectLevel(parseCards('2h 4h'), board)).toBe(0);
    expect(connectLevel(parseCards('8h 4h'), board)).toBe(1);
    expect(connectLevel(parseCards('Kh 4h'), board)).toBe(2);
    expect(connectLevel(parseCards('Ah Ac'), board)).toBe(2);
    expect(connectLevel(parseCards('Kh 8h'), board)).toBe(3);
  });

  it('finds strong draws', () => {
    expect(hasStrongDraw(parseCards('Ah 5h'), parseCards('Kh 9h 2c'))).toBe(true);
    expect(hasStrongDraw(parseCards('9c 8d'), parseCards('Th 7s 2c'))).toBe(true);
    expect(hasStrongDraw(parseCards('9c 4d'), parseCards('Th 7s 2c'))).toBe(false);
    expect(hasStrongDraw(parseCards('Ah 5h'), parseCards('Kh 9h 2c 3d 7s'))).toBe(false);
  });
});

describe('makeSpot', () => {
  it('deals valid, clear spots', () => {
    for (let i = 0; i < 25; i++) {
      const s = makeSpot('mixed');
      const cards = s.kind === 'pre' ? s.hero : [...s.hero, ...s.board];
      for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) expect(sameCard(cards[a], cards[b])).toBe(false);
      if (s.kind === 'post') {
        expect(s.board.length).toBe(s.street === 'flop' ? 3 : s.street === 'turn' ? 4 : 5);
        if (s.bet === 0) expect(s.sol.answer).not.toBe('fold');
      }
    }
  });
});

describe('leakOf', () => {
  it('names the mistake', () => {
    expect(leakOf('fold', 'call', true)).toBe('foldFree');
    expect(leakOf('fold', 'call', false)).toBe('tooTight');
    expect(leakOf('call', 'fold', false)).toBe('tooLoose');
    expect(leakOf('call', 'raise', false)).toBe('tooPassive');
    expect(leakOf('raise', 'call', false)).toBe('tooAggressive');
    expect(leakOf('raise', 'raise', false)).toBeNull();
  });
});
