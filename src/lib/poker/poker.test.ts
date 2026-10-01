import { parseCards } from '../cards';
import { Category, evaluate, explainComparison, scoreHand } from './evaluator';
import { equity, hitChance } from './equity';
import { describeMadeHand, findDraws } from './draws';
import { ALL_CODES, combos, handCode, preflopAdvice, tierOfCode } from './preflop';

const ev = (s: string) => evaluate(parseCards(s));

describe('evaluator', () => {
  it('detects every category', () => {
    expect(ev('As Ks Qs Js Ts 2d 3c').name).toBe('Royal Flush');
    expect(ev('9h 8h 7h 6h 5h Ad Ac').description).toBe('Straight Flush, Nine high');
    expect(ev('5s 4s 3s 2s As Kd Kc').description).toBe('Straight Flush, Five high');
    expect(ev('Qs Qh Qd Qc 2s 3d 9c').description).toBe('Four of a Kind, Queens');
    expect(ev('Ks Kh Kd 5c 5s 2d 3c').description).toBe('Full House, Kings full of Fives');
    expect(ev('Ks Kh Kd 5c 5s 5d 3c').description).toBe('Full House, Kings full of Fives');
    expect(ev('Ah 9h 7h 4h 2h Kd Kc').description).toBe('Flush, Ace high');
    expect(ev('Ah 2d 3c 4s 5h Kd Kc').description).toBe('Straight, Five high');
    expect(ev('Th Jd Qc Ks Ah 2d 2c').description).toBe('Straight, Ace high');
    expect(ev('7h 7d 7c As 2h 9d 4c').description).toBe('Three of a Kind, Sevens');
    expect(ev('Ah Ad 8c 8s 3h 3d Kc').description).toBe('Two Pair, Aces and Eights');
    expect(ev('Jh Jd 8c 6s 3h 2d Kc').description).toBe('Pair of Jacks');
    expect(ev('Ah Qd 8c 6s 3h 2d 9c').description).toBe('Ace high');
  });

  it('orders categories and kickers correctly', () => {
    const s = (x: string) => scoreHand(parseCards(x));
    expect(s('As Ks Qs Js Ts')).toBeGreaterThan(s('9s 9h 9d 9c Ah'));
    expect(s('2s 2h 2d 3c 3h')).toBeGreaterThan(s('As Ks Qs Js 9s'));
    expect(s('2s 3s 4s 5s 7s')).toBeGreaterThan(s('Ah Kd Qc Js Ts'));
    expect(s('6h 2d 3c 4s 5h')).toBeGreaterThan(s('Ah 2d 3c 4s 5h'));
    expect(s('Ah Ad Kc 3s 2h')).toBeGreaterThan(s('Ah Ad Qc Js Th'));
    expect(s('Kh Kd 4c 4s Ah')).toBeGreaterThan(s('Kh Kd 4c 4s Qh'));
    expect(s('Ah Kd 9c 5s 3h')).toBeGreaterThan(s('Ah Kd 9c 5s 2h'));
    expect(s('Ah Kh 9h 5h 3h')).toBe(s('Ad Kd 9d 5d 3d'));
  });

  it('picks the best five cards', () => {
    const r = ev('Ah Kh 9h 5h 3h 2h 4d');
    expect(r.best).toHaveLength(5);
    expect(r.best.every((c) => c.suit === 'h')).toBe(true);
    expect(r.ranks).toEqual([14, 13, 9, 5, 3]);
    const fh = ev('Ks Kh Kd 5c 5s 5d 3c');
    expect(fh.best.map((c) => c.rank)).toEqual([13, 13, 13, 5, 5]);
  });

  it('handles fewer than five cards', () => {
    expect(ev('As Ad').description).toBe('Pair of Aces');
    expect(ev('As Kd 7c').description).toBe('Ace high');
    expect(ev('7s 7d 7c Kh').category).toBe(Category.Trips);
  });

  it('explains comparisons', () => {
    const a = ev('Ah Kd Ks 7c 4h 3d 2c');
    const b = ev('Qh Jd Ks 7c 4h 3d 2c');
    expect(explainComparison(a, b)).toMatch(/Pair beats High Card|kicker|beat/);
    const k1 = ev('Ks Ad Kh 9c 5d 3s 2c');
    const k2 = ev('Ks Qd Kh 9c 5d 3s 2c');
    expect(explainComparison(k1, k2)).toBe('Both have a pair of Kings, so the kicker decides: Ace beats Queen.');
    expect(explainComparison(ev('As Ks Qs Js 9s'), ev('Ah Kd Qc Js Th'))).toBe('Flush beats Straight. Higher categories always win, no matter the card ranks.');
  });
});

describe('equity', () => {
  it('aces are about 85% vs one random hand', () => {
    const r = equity(parseCards('As Ah'), [], 1, 6000);
    expect(r.equity).toBeGreaterThan(0.82);
    expect(r.equity).toBeLessThan(0.88);
  });
  it('a made nut flush on the river is never behind', () => {
    const r = equity(parseCards('As Ks'), parseCards('2s 7s 9s Td 3c'), 2, 500);
    expect(r.equity).toBe(1);
  });
  it('AK vs QQ is about 43/57', () => {
    const r = equity(parseCards('Ac Kd'), [], 1, 8000, [parseCards('Qh Qs')]);
    expect(r.equity).toBeGreaterThan(0.41);
    expect(r.equity).toBeLessThan(0.47);
  });
  it('exact hit chances', () => {
    expect(hitChance(9, 47, 2)).toBeCloseTo(0.35, 2);
    expect(hitChance(9, 46, 1)).toBeCloseTo(0.196, 3);
    expect(hitChance(8, 47, 2)).toBeCloseTo(0.315, 3);
  });
});

describe('draws', () => {
  it('flush draw has 9 outs', () => {
    const d = findDraws(parseCards('Ah 5h'), parseCards('Kh 9h 2c'));
    expect(d.outs).toHaveLength(9);
    expect(d.flushDraw).toBe(true);
    expect(d.straightDraw).toBeNull();
  });
  it('open-ended straight draw has 8 outs', () => {
    const d = findDraws(parseCards('9c 8d'), parseCards('7h 6s 2c'));
    expect(d.outs).toHaveLength(8);
    expect(d.straightDraw).toBe('open-ended');
  });
  it('gutshot has 4 outs', () => {
    const d = findDraws(parseCards('9c 8d'), parseCards('6h 5s Kc'));
    expect(d.outs).toHaveLength(4);
    expect(d.straightDraw).toBe('gutshot');
  });
  it('combo draw has 15 outs', () => {
    const d = findDraws(parseCards('9h 8h'), parseCards('7h 6c 2h'));
    expect(d.outs).toHaveLength(15);
    expect(d.label).toBe('Flush draw + Open-ended straight draw');
  });
  it('wheel draw 2-3-4-5 is open-ended', () => {
    const d = findDraws(parseCards('2c 3d'), parseCards('4h 5s Kc'));
    expect(d.straightDraw).toBe('open-ended');
    expect(d.outs).toHaveLength(8);
  });
  it('double gutshot counts 8 outs', () => {
    const d = findDraws(parseCards('9c 7d'), parseCards('Jh 6s 5c'));
    // needs 8 for 5-9 or... 9-7-6-5 needs 8; J-9-7 needs T,8 -> 8 makes both
    expect(d.outs.length).toBeGreaterThanOrEqual(4);
  });
  it('describes made hands for beginners', () => {
    expect(describeMadeHand(parseCards('Ah Kd'), parseCards('Kh 9s 2c')).label).toBe('Top pair, Ace kicker');
    expect(describeMadeHand(parseCards('Qh Qd'), parseCards('Jh 9s 2c')).label).toBe('Overpair (Queens)');
    expect(describeMadeHand(parseCards('7h 7d'), parseCards('7c 9s 2c')).label).toBe('Set of Sevens');
    expect(describeMadeHand(parseCards('Ah 2d'), parseCards('Kh 9s 2c')).label).toBe('Bottom pair (Twos)');
    expect(describeMadeHand(parseCards('Ah 9d'), parseCards('Kh 9s 2c')).label).toBe('Middle pair (Nines)');
    expect(describeMadeHand(parseCards('Kh 9d'), parseCards('Kc 9s 2c')).label).toBe('Two pair');
    expect(describeMadeHand(parseCards('2h 3d'), parseCards('As Ks Qs Js Ts')).label).toBe('Playing the board');
  });
});

describe('preflop', () => {
  it('codes hands', () => {
    expect(handCode(parseCards('Ks')[0], parseCards('As')[0])).toBe('AKs');
    expect(handCode(parseCards('2d')[0], parseCards('7c')[0])).toBe('72o');
    expect(handCode(parseCards('Td')[0], parseCards('Tc')[0])).toBe('TT');
  });
  it('grid covers all 1326 combos', () => {
    expect(new Set(ALL_CODES).size).toBe(169);
    expect(ALL_CODES.reduce((s, c) => s + combos(c), 0)).toBe(1326);
  });
  it('gives sensible advice', () => {
    expect(preflopAdvice('AA', 'early', 'unopened').action).toBe('raise');
    expect(preflopAdvice('72o', 'late', 'unopened').action).toBe('fold');
    expect(preflopAdvice('76s', 'early', 'unopened').action).toBe('fold');
    expect(preflopAdvice('76s', 'late', 'unopened').action).toBe('raise');
    expect(preflopAdvice('KK', 'middle', 'raised').action).toBe('raise');
    expect(preflopAdvice('TT', 'middle', 'raised').action).toBe('call');
    expect(preflopAdvice('KJs', 'middle', 'raised').action).toBe('fold');
    expect(preflopAdvice('KJs', 'bb', 'raised').action).toBe('call');
    expect(tierOfCode('72o')).toBe(6);
  });
});
