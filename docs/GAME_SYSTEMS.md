# Winterhof — GAME_SYSTEMS.md (v6 Slice 1 · PixiJS v8 WebGL 2.5D)

Live technical specification synchronized with v6 code (`src/engine/`, `src/world.js`, `src/main.js`, `src/gameData.js`, `src/sprites.js`).

## 1. Core Loop, WebGL2 & Hardening
- **Build & Renderer:** Vite 6 ESM bundle + **PixiJS v8 WebGL2** (`preference: 'webgl'`, `resolution: min(dpr, 2)`, `antialias: true`).
- **Frame Loop (`src/main.js`):** Clamped `dt = Math.min(0.033, Math.max(0, (now - lastFrame) / 1000))`; PixiJS internal ticker disabled so simulation + rendering execute in one deterministic RAF tick.
- **Zero-GC Runtime:** Retained display node pools (`entityNodes`, `signNodes`, `bubbleNodes`, `penNodes`, `cropGfxPool`) + pre-allocated ring-buffer GPU particle pools (`96` layered snow flakes, `48` chimney smoke puffs, `72` harvest/heart bursts, `24` floaters, `28` flying HUD rewards).
- **Camera Guards (`src/world.js`):** `clampCamera()` guards `Number.isFinite` on `x, y, zoom, vx, vy`; responsive landscape initial zoom scales cleanly across desktop (`1280x720`) and mobile landscape (`844x390`).
- **Landscape-Only Lock:** `manifest.json` `"orientation": "landscape"`, CSS `@media (orientation: portrait)` + JS `body.is-portrait` displays zero-emoji `#rotate-overlay` and blocks canvas pointer input in portrait.
- **Persistence:** `SAVE_KEY = 'winterhof_save_v6'` with automatic backward-compatible migration from `winterhof_save_v5`, debounced saves during swipe-harvesting, synchronous flush on rewards/upgrades/`pagehide`, Service Worker cache `winterhof-v6-slice1`.
- **Zero-Emoji Policy:** Enforced across HTML, CSS, JS, Canvas/WebGL and verified automatically by `scripts/e2e_test.mjs`.

## 2. World Architecture (`src/engine/` + `src/world.js`)
- **Painted Terrain (`src/engine/terrainLayer.js`):** Seamless high-pass alpine snow `TilingSprite` (`assets/terrain/snow_ground.webp`), masked chunky cobblestone road & central Christmas plaza (`assets/terrain/cobble_road.webp`), beveled snow-capped 3D timber perimeter fences adapting dynamically to unlocked land zones.
- **GLSL Water (`src/engine/waterShader.js`):** Curved ribbon `MeshGeometry` + custom GLSL fragment shader for glacial alpine brook & pond (animated current ripples, crystalline frosted ice banks, sunlit glints, warm bridge lantern reflection at dusk/night).
- **Lighting & Atmosphere (`src/engine/lightingLayer.js`):** Day (`ev = 0`, Style C crisp clarity) -> Golden Hour (`ev = 0.48`, Style B peach-gold sunlight + lavender-blue shadows) -> Night (`ev = 1.0`, deep sapphire `multiply` + `add` golden lantern/window/oven/tree/bridge bloom + subtle aurora & twinkling stars).
- **Scenery & Characters:** Style-C sculpted snowy alpine granite cliffs (`alpine_cliff.webp`), multi-scale varied alpine pine rim (`deco_pine.webp`), 3D arched snowy timber bridge (`timber_bridge.webp`) at `(13.82, 5.52)`, 3D Supercell alpine villagers (`alpine_villager.webp`, `_green`, `_navy`), straw-and-timber animal pens, unobstructed carved wooden land-expansion signposts.

## 3. Progression & Stations (`src/gameData.js`)
- **Calm Starter Estate (Lv.1):** Chalet `(5,2)`, Christmas Tree `(8,2)`, Backstube `(3,7)`, 4 wheat plots (`2x2`), 1 Schneehuhn (`Flöckchen`), Wishlist Board, Reindeer Sleigh, Mailbox, 2 road lanterns, 1 snowman.
- **4 True-3D Production Stations:** `bakery` (Lv.1), `teahouse` / Punsch- & Café-Stand (Lv.1, 90), `patisserie` (Lv.2, 165), `gift_workshop` (Lv.3, 240).
- **6 Crops:** `wheat`, `berries`, `matcha`, `cocoa`, `cinnamon`, `candycane`.
- **3 Animals:** `chicken`, `reindeer`, `sheep`.
- **Barn Capacity (`BARN_CONFIG`):** `50 -> 300` in `+25` steps (`80 + tier * 65`).
- **Living Systems:** Doorstep villager offers (`1.22x` price + XP), Lakeside Daily Treasure Chest (`(11.4, 12.6)` with streak), Level-3 Harvest-All Scythe, `Sammelbuch`, 4 Story Chapters, 8 Achievements, Winterpost (`WH-...`).
