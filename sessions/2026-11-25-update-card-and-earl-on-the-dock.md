# "New Updates" card and Earl on the dock
**Date:** 2026-11-25  |  **Project:** fishing-fly

## Goal
Show players a "New Updates" pop-up with a short summary of what changed whenever I push an update. Then put Earl (the trash-talking buddy) on the dock, casting his own line, instead of showing only his face at the top of the screen, and keep his speech bubble from covering the player.

## What we did
- Added a "NEW UPDATES" card. It shows once, after the player taps past the title screen, on the first launch after an update. It's styled like the quest and lesson-complete cards: orange badge, headline, bullet notes and a green **NICE!** button. Brand-new players (no catches and the card never seen) skip it, and so do players who go straight to HOW TO PLAY. Tested in the browser, then committed and pushed (`6e30fd9`).
- Saved a memory so future sessions add an update entry whenever we push something players will notice.
- Put Earl in the scene. He sits on the left edge of the pier with his legs dangling over the side and casts every ~17 seconds (wind up, cast, a lazy jig, reel in). His bobber is small and orange so it isn't mistaken for the player's red one. On the boat he sits on his "EARL" cooler. He also shows on the title screen. Removed the round face portrait. His speech bubble now comes from him, with a red "EARL" name tag. First try cast too close (the bobber looked like it was hanging off the rod), so the cast went farther out and Earl got slightly bigger. Added an update entry "Earl Pulled Up a Seat". Pushed as `a783e46`.
- Asked to move the player farther up the dock so the bubble wouldn't cover him. I pointed out that this would push the player further into the bubble and offered options; I chose **raise the bubble**. Long bubbles that reach the angler now float above his hat, with a longer tail down to Earl; short ones stay low next to Earl. Checked with the tallest hat (traffic cone). No update note, since it's a small tweak. Pushed as `ab6c610`.
- Bug report: after casting, the bubble jumped back to the top. Cause: it only stayed in the scene while idle, casting, waiting or on a bite; during fights and lost fish it went to the top. Fixed so it stays with Earl in every phase, except over the catch card, menus and the boat ride. Mid-fight, if the fish swims where the raised bubble would be, the bubble drops down beside Earl. Tested with a real cast, fight, lost fish and catch. Pushed as `112ec91`.
- Every push was followed by a successful GitHub Pages deploy.

## Files changed
- `src/updates.ts` (new): the `UPDATES` list (newest first), plus helpers that remember in localStorage (`fishingfly.seenUpdate`) which update the player has seen. Two entries: `2026-11-25` (rename, tunes, Gary's Rolex, the card itself) and `2026-11-25b` (Earl on the dock).
- `src/game.ts`: new `'updates'` screen. `leaveTitle()` opens the card when there's an unseen update and silently marks it seen for brand-new players. New `closeUpdates()`.
- `src/ui.ts`: `drawUpdates()` draws the card; it grows to fit the notes.
- `src/earl.ts` (new): `drawEarl()` draws Earl sitting and fishing on the pier or boat, with his cast cycle driven by the clock. `earlHead()` gives the bubble's anchor point.
- `src/render.ts`: draws Earl between the pier/boat and the angler. `drawBuddy()` no longer draws the face. It places the bubble in the scene (raised above the angler's hat, dropped low if the fish is under it) or at the top (catch card, menus, boat ride), with the "EARL" name tag.
- `sessions/2026-11-25-update-card-and-earl-on-the-dock.md` (new): this summary.

## Key decisions & rationale
- **Update notes live in code (`src/updates.ts`)**: the newest entry is shown, and a new `id` is what triggers the card again. It's simple and needs no server. Several changes on the same day can share one entry; use a suffix like `-b` if one date already shipped.
- **New players skip the card**: nothing is "new" to them.
- **Small tweaks don't get an update note**: avoids popping the card for trivial changes.
- **Earl's fishing is cosmetic and runs off the clock**: it never affects the player's fishing or game state.
- **Raise the bubble rather than move the player**: moving the angler up the dock would have put him further into the bubble.
- **Bubble goes up top over the catch card**: the card runs down past Earl's head, so there's no room near him.
- **Mid-fight, the fish beats the hat**: the bubble drops low rather than cover a fish reeled in close.
- Used the project's `roundRect` helper instead of the canvas's built-in `roundRect`, so it works on older iPhones.

## Open items / next steps
- **[ME]** Check the update card, Earl, and the bubble placement on a real iPhone, including notch and safe-area spacing. So far only tested in a desktop browser.
- **[ME]** Reword the update notes in `src/updates.ts` if you want different wording.
- When the bubble drops low mid-fight it can briefly cover the angler's head. This was accepted as a trade-off.
- With Earl's face gone, the quest banner may have spare room above it at top-left. Left unchanged.

## How to resume
Hook, Line & Sinker (project folder `fishing-fly`) now has a "NEW UPDATES" card driven by `src/updates.ts`. Earl is drawn on the dock by `src/earl.ts`, and his speech bubble is placed by `drawBuddy()` in `src/render.ts`. Everything is committed and deployed (latest commit `112ec91`). For the next player-facing change, add a new entry at the top of `UPDATES` with a fresh `id` before pushing.
