import { act, deal, dealerStep, newGame, options, resolveInsurance, roundNet, type BJState } from './engine';
import { advise, type Rules } from './strategy';
import { parseCards } from '../cards';
import { handTotal } from './hand';

const rules: Rules = { h17: true, surrender: true, das: true };

function playRound(s: BJState): BJState {
  s = deal(s, 10);
  if (s.phase === 'insurance') s = resolveInsurance(s, false);
  let guard = 0;
  while (s.phase === 'player' && guard++ < 50) {
    const o = options(s, rules);
    const h = s.hands[s.active];
    const adv = advise(h.cards, Math.min(11, h.cards.length ? (s.dealer[0].rank === 14 ? 11 : Math.min(10, s.dealer[0].rank)) : 0), rules, o);
    s = act(s, adv.move, rules);
  }
  while (s.phase === 'dealer' && guard++ < 80) s = dealerStep(s, rules);
  return s;
}

describe('blackjack engine', () => {
  it('plays thousands of rounds with consistent accounting', () => {
    let s = newGame(1_000_000);
    let total = 0;
    const rounds = 20000;
    for (let i = 0; i < rounds; i++) {
      const before = s.bankroll;
      s = playRound(s);
      expect(s.phase).toBe('done');
      expect(s.bankroll - before).toBeCloseTo(roundNet(s), 6);
      total += roundNet(s);
    }
    const edge = total / (rounds * 10);
    // Basic strategy loses roughly half a percent; allow for sampling noise.
    expect(edge).toBeGreaterThan(-0.04);
    expect(edge).toBeLessThan(0.03);
  });

  it('dealer stands on hard 17 and hits soft 17 under H17', () => {
    let s = newGame(1000);
    s = { ...s, phase: 'dealer', dealer: parseCards('As 6d'), holeRevealed: true, hands: [{ cards: parseCards('Ts 9d'), bet: 10, done: true, doubled: false, surrendered: false, fromSplit: false, splitAces: false }] };
    s.shoe = [...s.shoe, ...parseCards('5c')];
    const next = dealerStep(s, rules);
    expect(next.dealer).toHaveLength(3);
    const s17 = dealerStep(s, { ...rules, h17: false });
    expect(s17.phase).toBe('done');
    expect(handTotal(s17.dealer).total).toBe(17);
  });

  it('splitting gives each hand a second card', () => {
    let s = newGame(1000);
    s = { ...s, phase: 'player', dealer: parseCards('6s Td'), hands: [{ cards: parseCards('8s 8d'), bet: 10, done: false, doubled: false, surrendered: false, fromSplit: false, splitAces: false }], active: 0 };
    s.shoe = [...s.shoe, ...parseCards('2c 3c')];
    s = act(s, 'split', rules);
    expect(s.hands).toHaveLength(2);
    expect(s.hands[0].cards.map((c) => c.rank)).toEqual([8, 3]);
    expect(s.hands[1].cards).toHaveLength(1);
    s = act(s, 'stand', rules);
    expect(s.hands[1].cards.map((c) => c.rank)).toEqual([8, 2]);
    expect(s.active).toBe(1);
    expect(s.bankroll).toBe(990);
  });
});
