# Card Game Guide

A fast, low-friction trainer for new **Blackjack** and **Texas Hold'em** players. No sign-up, no real money. Progress is saved in the browser.

## What's inside

**Blackjack**
- 7 bite-size lessons with a quick check on each idea
- Interactive basic strategy chart (tap any square to see why), adjustable for dealer hits/stands soft 17, surrender, and double after split
- Practice hands with instant feedback: the reason, the chart cell, and the long-run result of every option in dollars per $100 bet
- 60-second speed drill (memory game) with mistake review
- Full blackjack table with a coach that flags mistakes, optional hints, splits/doubles/insurance/surrender, and a 6-deck shoe
- "Why the chart works": dealer outcome odds by upcard and what common mistakes cost
- Card counting intro with Hi-Lo value drill and running-count drill

**Texas Hold'em**
- 8 lessons: rules, betting rounds, actions, position, starting hands, reading the flop, outs and pot odds, beginner mistakes
- Hand rankings: cheat sheet, "which wins?", name-that-hand (5 and 7 cards), timed rankings race
- Starting hand chart (13×13) filtered by position, plus a hand-group memory quiz
- Preflop practice by seat and action, plus a 60-second play-or-fold sprint
- "Who wins?" showdown reading with kicker explanations
- Draws and outs trainer with the rule of 2 and 4
- Pot odds trainer (find the price, call or fold)
- 6-player table vs. bots with different styles and a live coach (hand strength, win chance, pot odds, suggested action)
- Odds calculator

**Everywhere**
- Guided learning path per game, XP/levels, daily streak, daily 10-question challenge
- Spaced repetition: missed spots come back until you get them right twice in a row ("Practice my mistakes")
- Progress page with weak spots and accuracy by skill
- Glossary, cheat-sheet button on every game page, four-color deck option, keyboard shortcuts, mobile-first layout

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # logic tests (hand evaluator, strategy vs. EV math, engines)
npm run build    # typecheck + production build to dist/
```

Built with Vite, React and TypeScript. Deployed on Vercel as a static single-page app (`vercel.json` rewrites all routes to `index.html`).

## How the advice is checked

- The blackjack chart is verified in tests against an independent infinite-deck expected-value calculation for every starting hand. The only disagreements are three near-ties (under 1% EV), the known 6-deck vs. infinite-deck differences.
- A 20,000-hand blackjack simulation and a 150-hand poker bot simulation check engine accounting (chips are conserved, side pots split correctly).
- Poker win chances are Monte Carlo estimates; opponents' ranges are narrowed based on whether they raised or called before the flop.

For learning only. Even perfect play can't overcome the house edge in the long run.
