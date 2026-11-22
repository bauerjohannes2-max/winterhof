# Winterhof & Zauberherbst — Fast Codebase & Architecture Index

Use this index in future sessions so you NEVER need to re-scan the entire codebase.

## 1. Persistent Backup & Workspace Paths
- **Persistent backup (survives VM restarts):** `/home/antigravity/.gemini/winterhof-project/`
- **Active workspace:** `/home/antigravity/winterhof/`
- **Dist bundles:**
  - `dist/winterhof-pwa.zip` (PWA deploy package for GitHub Pages / Netlify Drop)
  - `dist/winterhof-standalone.html` (single-file offline bundle with all WebP sprites base64-inlined)

## 2. File Map & Responsibilities
- `index.html` — PWA shell, illustrated splash screen (`#loading-screen`), top HUD (`#btn-village`, `#btn-coins`, `#btn-season`, `#btn-light`, `#btn-settings`), collapsible Story Chapter bar (`#chapter-bar`), zoom controls, seed tray (`#seed-tray`), mode banner (`#mode-banner`), bottom medallion dock (`#dock-shop`, `#dock-barn`, `#dock-orders`, `#dock-gifts`, `#dock-move`), reusable modal (`#modal-backdrop`).
- `styles.css` — Season-reactive Artisan Wood & Gold UI (`body.season-winter` frosty snow caps vs `body.season-autumn` golden autumn leaf rim), medallion dock buttons, splash progress bar, storybook parchment modals, HUD pulse animations, portrait & landscape responsive rules.
- `src/gameData.js` — All game constants:
  - `GRID_SIZE = 16`, `LAND_ZONES` (4 expandable land zones outside core `2..13`)
  - `ITEMS` (8 crops, 4 animal products, 16 crafted items across 4 stations)
  - `ANIMALS` (`chicken`, `reindeer`, `sheep`, `owl`)
  - `STATIONS` (`bakery`, `teahouse`, `patisserie`, `gift_workshop`)
  - `DECORATIONS` (15 items across Herbst, Halloween, Magie, Winter)
  - `CHAPTERS` (4 guided story chapters with tasks & rewards)
  - `ACHIEVEMENTS` (10 milestones), `LEVELS` (10 levels), `NPCS` (6 villagers), `SORTING_HAT_QUOTES`
- `src/sprites.js` — `SpriteManager` (`sprites`):
  - Loads all **28 transparent 3D WebP sprites** (`assets/sprites/*.webp`) + `assets/splash_art.webp` with real progress callback `loadAll(onProgress)`.
  - Provides glossy SVG fallback/product icons (`iconUrls`, `getIconImg(id)`, `getIconUrl(id)`).
- `src/audio.js` — `CozyAudio` (`audio`):
  - Zero-dependency Web Audio SFX (`playTap`, `playPlant`, `playHarvest` pentatonic combo, `playCoin`, `playBakeStart`, `playCollect`, `playPet`, `playSleighBells`, `playUnwrap`, `playLevelUp`, `playGiftOpen`).
  - Dual-season music box (`winter` waltz vs `autumn` magical celesta melody!) + optional soft fireplace/wind ambience.
- `src/world.js` — `WinterWorld`:
  - 60 FPS Retina Isometric Canvas (`TILE_W=116, TILE_H=58`).
  - Smooth `seasonBlend` (0=winter, 1=autumn) & `eveningFactor` (0=day, 0.5=dusk, 1=night).
  - Living terrain: cobblestone walkways + central plaza, pond with wooden dock + swimming autumn ducks / winter skate swirls, 3D pine/maple border forest, locked land zones + signs.
  - **4-stage crop growth** (seeds → sprouts → crop-specific budding mid-stage → full swaying 3D crop).
  - **Live production animations on buildings** (glowing oven + whisk sparks on bakery, rotating wooden stirring spoon + colored Matcha/Butterbier steam on teahouse, display shimmer on patisserie, wrapping confetti on workshop, rotating wand on cauldron).
  - **Construction crate with giant red ribbon bow** (`st.wrapped === true`) waiting for player unwrap tap!
  - **Autonomous walking animals** (`an.offsetX`, `an.offsetY`, hop arc, facing flip, night `Zzz` sleeping bubbles, cozy pen corner posts).
  - **Strolling NPC villagers** walking along cobblestone walkways with occasional cozy speech bubbles & tap-to-wave/tip!
  - **Flying HUD item & coin arcs** (`flyingItems` Bezier arcs landing into HUD counters with pulse bounce).
  - Flying Reindeer Sleigh, Golden Snitch, Wild Schwammerl, Owl Gift Delivery, Ghosted Placement Preview.
- `src/giftExchange.js` — Serverless `WH-...` Base64URL parcel encoder/decoder + `?gift=...` link support.
- `src/main.js` — `WinterhofGame` (`window.__WINTERHOF__`), `SAVE_KEY = 'winterhof_save_v2'`:
  - Touch Pan/Pinch/Swipe-Harvest/Swipe-Plant, Hit Testing, Place/Move/Store-Deco modes, Mastery Stars (`st.craftedCount`), Story Chapters, Hofladen, Achievements, Save Export/Import, Auto-save.
- `scripts/extract_sprites_v2.py` — Magenta `#FF00FF` chroma-key + despill WebP sprite extractor.
- `scripts/build_bundle.py` — Bundles `dist/winterhof-standalone.html` & `dist/winterhof-pwa.zip`.
- `scripts/e2e_test.mjs` — Automated Chromium CDP E2E QA test suite + visual screenshot capture.

## 3. State Schema (`winterhof_save_v2`)
`{ version, welcomeSeen, villageName, playerName, season, coins, xp, lastLevel, unlockedLands[], inventory{}, storedDecos{}, chalet, christmasTree, wishlistBoard, sleighPos, mailbox, stations[{id,type,gx,gy,built,wrapped,craftedCount,queue[],ready[]}], fields[], animals[{id,type,nick,gx,gy,state,readyAt,lastPet}], decorations[], wildMushrooms[], standSlots[6], orders[4], stats{}, claimedAchievements[], claimedChapters[], claimedGifts[], settings{sfx,music,lighting} }`

## 4. Quick Commands
- Rebuild dist bundles: `python3 /home/antigravity/winterhof/scripts/build_bundle.py`
- Run full E2E QA + screenshots: `node /home/antigravity/winterhof/scripts/e2e_test.mjs`
- Sync backup to persistent `~/.gemini`: `cp -r /home/antigravity/winterhof/* /home/antigravity/.gemini/winterhof-project/`
