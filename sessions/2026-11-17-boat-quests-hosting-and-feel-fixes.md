# Boat, quests, hosting, then thumb-friendly fixes and a tutorial
**Date:** 2026-11-17  |  **Project:** fishing-fly

## Goal
Finish the original 6-step plan for Fishing Fly (an iPhone-only cartoon fishing web game): the boat (step 4), quests, tournaments and music (step 5), and install polish and hosting (step 6). Then fix iPhone playtest problems: music not starting, losing fish to slow taps and tapping-while-reeling, and add a quick tutorial.

## What we did
- **Step 4, the boat:** added the "Knot Working" boat (600 coins), a map screen and three new boat-only spots: Lily Pad Cove, The Drop-Off and Stump Field. Each spot has its own scenery and boosted fish. Added four new catches: gar, sturgeon, muskie, and a message-in-a-bottle as junk. Travelling between spots plays a boat-ride transition.
- **Step 5, quests:** Earl hands out 10 story quests followed by random ones, shown on a quest banner and quest card with SKIP. Simulations showed two quests were far too slow, so I replaced them ("Fish out some junk" and "Catch Sir Whiskers") and gave the quest target fish a ×2 bite boost.
- **Step 5, tournaments:** "Bass-ish Masters" is a 3-minute tournament against three rivals (Kevin, Grandma Pearl, Big Randy), with a leaderboard and prizes.
- **Step 5, music:** synthesized music, chill at 86 bpm and faster during tournaments, plus a music on/off button.
- **Step 6, install polish:**
  - an app icon and splash screens drawn in code;
  - a manifest, so the game installs to the Home Screen;
  - a service worker, so it plays offline (verified on localhost and on the live site);
  - a title screen with an "Add to Home Screen" tip.
- **Step 6, hosting:** compared GitHub Pages with Netlify, and I chose GitHub Pages. Set up auto-deploy with GitHub Actions.
- **Title screen:** added a speaker icon on "TAP TO START" and an intro jingle. Music can't play before the first tap; iOS blocks it in every browser.
- **Music bug fix:** on iPhone the music only started after toggling mute. Fixed with:
  - a wall-clock wait for the jingle instead of the audio clock;
  - a guard against stuck schedules;
  - a silent-buffer unlock on each tap.
  I confirmed on my phone that it works.
- **Asked why we can't use Chrome:** on iPhone, every browser uses Safari's engine and has the same autoplay rule. A native app (via Capacitor) would be the only way around it, and it isn't worth the cost.
- **Bite timing fix:** bite windows are now 1.5–1.9 s (were 0.7–1.3 s). A miss gets a second-chance re-bite, repeated misses slow the bites further, a countdown ring shows the time left, and the prompt says "TAP ANYWHERE!".
- **Reeling fix:** the real problem was tapping during fights, because reeling was hold-only. Changes:
  - the reel keeps winding 0.35 s after each tap (never while the fish runs);
  - a slack line takes 2.4 s to lose the fish (was 1.6 s);
  - a live prompt shows HOLD TO REEL, REELING... KEEP HOLDING, or IT RUNS! LET GO!;
  - Earl coaches holding.

  In simulation, tappers went from 0% to 100% landed.
- **Tutorial:** added HOW TO PLAY on the title screen and a ? button in play. It's a guided practice catch (Cast, Wait, Tap, Reel) with Earl coaching, a fish that can't escape, and a "You're ready!" summary card. Nothing counts toward progress. I confirmed the tutorial works and that fights feel much better.

## Files changed
**Created**
- `src/spots.ts`: the boat and the four fishing spots.
- `src/quests.ts`: the story quest list, random quests and quest text.
- `src/tourney.ts`: tournament timing, rivals, par weights, prizes and lines.
- `src/hud.ts`: the HUD overlay:
  - trophy and ? buttons;
  - quest banner and toast;
  - tournament clock and countdown;
  - music button;
  - practice banner and swipe hint.
- `src/brand.ts`: logo, app icon and splash drawing.
- `src/vite-env.d.ts`: Vite type reference for `import.meta.env`.
- `public/sw.js`: offline service worker.
- `public/manifest.webmanifest`, `public/icons/*.png` and `public/splash/*.png`: install assets.
- `.github/workflows/deploy.yml`: deploys to GitHub Pages on every push to main.
- `sessions/2026-11-17-boat-quests-hosting-and-feel-fixes.md`: this summary.

**Edited**
- `src/game.ts`:
  - spots, travel, quests and tournaments;
  - title-screen flow;
  - bite windows and second chance;
  - tap-grace reeling and slack limit;
  - training mode.
- `src/catalog.ts`: new catches, a spot filter and boost, and the quest favor boost in `pickCatch`.
- `src/fishart.ts`: the bottle drawing.
- `src/save.ts`: saves the boat, spot, quest state, tournament records and wins.
- `src/buddy.ts`: new Earl lines: map, boat, travel, quests and tournaments; rebite and miss tips; hold coaching; tutorial lines.
- `src/ui.ts`: map, quest card, tournament panels, MAP nav pill, journal with 4 columns, and the "You're ready!" card.
- `src/render.ts`:
  - scenery per spot, the boat and the travel animation;
  - title screen (start button, HOW TO PLAY, install tip);
  - bite countdown ring;
  - live fight prompts.
- `src/audio.ts`: music scheduler, new sound effects, intro jingle, and the iOS unlock and music-start fixes.
- `src/main.ts`: music button taps and service worker registration.
- `index.html`: manifest, icon and splash links; theme colour.

## Key decisions & rationale
- **GitHub Pages over Netlify:** free, auto-deploys on push, and the repo already lives on GitHub.
- **No music before the first tap:** iOS blocks it in every browser and in installed web apps. Going native (Capacitor, plus a Mac, $99/yr and App Store review) isn't worth it for title music.
- **Forgiving bite timing:** the original windows were tuned for a mouse, not thumbs. Losing fish to reaction time felt bad.
- **Tapping reels too:** players naturally tap. Letting go during a run still stops the reel instantly.
- **Accepted trade-off:** fights are now very forgiving for tappers, and tapping through runs doesn't snap the line. Fun first; challenge can come back later.
- **Tutorial is a hands-on practice catch, not instruction pages.** Practice catches don't touch coins, records, streaks or quests.

## Open items / next steps
- **[ME]** Is Big Randy too easy or too hard in tournaments?
- **[ME]** Does the starter rod's limited casting reach feel bad?
- Parked: add challenge back to fights, for example tapping during a run builds tension faster, so the red LET GO! prompt matters again.
- Parked: "TOO EARLY!" (tapping during nibbles) is unchanged. Soften it if it turns out to frustrate players too.
- **[ME]** Check the Home Screen icon and splash screen on the phone. They haven't been confirmed on a device yet.

## How to resume
Fishing Fly is a TypeScript, Vite and Canvas 2D iPhone web game in `C:\Users\leddy\Desktop\Web App Games\fishing-fly`. It's live at https://mattgofaster.github.io/fishing-fly/, and every push to main auto-deploys via GitHub Actions. All 6 plan steps are done, plus thumb-friendly bite and reel fixes and a HOW TO PLAY practice lesson. Next, decide whether to add some challenge back to fights, and tune tournament difficulty after more playtesting.
