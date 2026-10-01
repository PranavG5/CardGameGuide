import { botAction, coachAdvice } from './ai';
import { apply, createTable, pot, positionOf, startHand, showdown, type TableState } from './table';
import { parseCards } from '../cards';

const chips = (t: TableState) => t.seats.reduce((a, s) => a + s.stack, 0) + pot(t);

describe('poker table', () => {
  it('runs many hands with bots and conserves chips', () => {
    let t = createTable(200);
    for (let h = 0; h < 150; h++) {
      // keep everyone funded so totals are comparable hand to hand
      for (const s of t.seats) if (s.stack < 2) s.stack = 200;
      t = startHand(t);
      const before = chips(t);
      let guard = 0;
      while (!t.over && guard++ < 200) {
        if (t.seats[t.toAct].isHero) coachAdvice(t, t.toAct);
        t = apply(t, botAction(t, t.toAct));
        if (!t.over) expect(chips(t)).toBe(before);
      }
      expect(t.over).toBe(true);
      const after = t.seats.reduce((a, s) => a + s.stack, 0);
      expect(after).toBe(before);
    }
  });

  it('builds side pots correctly', () => {
    let t = createTable(100);
    t = startHand(t);
    t.board = parseCards('2c 7d 9h Js Kd');
    // Seat 0 short all-in with the best hand, seat 1 and 2 bigger.
    t.seats.forEach((s, i) => {
      s.folded = i > 2;
      s.contributed = i === 0 ? 20 : i <= 2 ? 100 : 0;
      s.stack = 0;
      s.hole = i === 0 ? parseCards('Ks Kh') : i === 1 ? parseCards('Js Jh') : i === 2 ? parseCards('As Qc') : s.hole;
    });
    t = showdown(t);
    expect(t.seats[0].stack).toBe(60); // 20 x 3 main pot
    expect(t.seats[1].stack).toBe(160); // side pot 80 x 2
    expect(t.seats[2].stack).toBe(0);
  });
});

describe('positions', () => {
  it('stay fixed after players fold', () => {
    let t = startHand(createTable(200));
    const before = t.seats.map((_, i) => positionOf(t, i).label);
    // first player to act folds
    t = apply(t, { type: 'fold' });
    const after = t.seats.map((_, i) => positionOf(t, i).label);
    expect(after).toEqual(before);
    expect(new Set(before)).toEqual(new Set(['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN']));
  });
});
