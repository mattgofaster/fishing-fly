# Rename the game to Hook, Line & Sinker
**Date:** 2026-11-19  |  **Project:** fishing-fly

## Goal
Pick a new name for the game, which was called "Fishing Fly", and apply it everywhere it shows: the title screen, the browser tab, the Home Screen install and the iPhone launch screens. Then ship it to the live site.

## What we did
- Went through several rounds of name ideas: general names, familiar fishing phrases, fishing puns, bass puns, and more hook/line phrases. Favourites along the way were "Hook, Line & Sinker" and "Off the Hook". The final pick was **Hook, Line & Sinker**.
- Redrew the title-screen logo in `src/brand.ts`. It's now "HOOK, LINE &" in white on top and a big yellow "SINKER" below, keeping the wobble. Added shrink-to-fit so long lines never run too wide.
- Updated the page title, the Apple web-app title, the manifest name and short name, and the `play.bat` window title and message.
- Escaped `&` as `^&` in `play.bat`, because a bare `&` splits a line into two commands in Windows batch files.
- Renamed the service-worker cache from `fishing-fly-v1` to `fishing-fly-v2` so installed copies pick up the change.
- Regenerated all 10 iOS launch-screen PNGs. A temporary page rendered `drawSplash` and headless Chrome took screenshots at each size. The temporary page was deleted afterwards. I checked the largest and smallest sizes by eye.
- Type check passed. Playtested in Chrome: the title screen, tab title, starting a game, casting and the bite warning all worked, with no console errors. I didn't land a catch because the tap has to be timed.
- Committed as `db2b524` and pushed to main. The GitHub Pages deploy succeeded.
- The user saw the old "Fishing Fly" launch screen flash on their phone. Cause: iOS saves the launch image when you add a web app to the Home Screen and doesn't update it. Fix: delete the icon and add it again from Safari. Walked the user through finding Add to Home Screen in their Safari layout (address bar at the bottom: hamburger page menu, then Share, then Add to Home Screen). It worked.

## Files changed
- `src/brand.ts`: new two-line "HOOK, LINE & / SINKER" logo with shrink-to-fit width.
- `index.html`: `<title>` and `apple-mobile-web-app-title` set to "Hook, Line &amp; Sinker".
- `public/manifest.webmanifest`: name is "Hook, Line & Sinker", short_name is "Hook Line Sinker".
- `play.bat`: window title and start-up message use the new name, with `&` escaped as `^&`.
- `public/sw.js`: cache name bumped to `fishing-fly-v2`.
- `public/splash/splash-*.png` (10 files): regenerated with the new logo.

## Key decisions & rationale
- **Name: Hook, Line & Sinker.** The user's top pick across all rounds. Off the Hook was the runner-up.
- **Repo, folder and URL stay "fishing-fly".** Renaming the GitHub repo would change the live game's address. The npm package name is also unchanged.
- **Manifest short_name is "Hook Line Sinker".** A shorter, punctuation-free label for places with little space. iOS uses the Apple web-app title, which may be cut short under the icon.
- **App icons left as they are.** They have no text in them, so they didn't need regenerating.

## Open items / next steps
- **[ME]** Optional: if iOS cuts the Home Screen label short ("Hook, Line &…"), decide whether to use a shorter label just for the icon, such as "Hook & Sinker".
- **[ME]** Optional: decide whether to rename the GitHub repo or folder to match. This changes the live URL.

## How to resume
The game in `fishing-fly` was renamed to "Hook, Line & Sinker" (commit `db2b524`) and is live at https://mattgofaster.github.io/fishing-fly/. The repo, folder and URL still use "fishing-fly". The logo is drawn in `src/brand.ts`, and the iOS launch PNGs in `public/splash/` were rendered from `drawSplash` using headless Chrome, so redo that if the logo changes again. Pushing to main deploys automatically.
