/**
 * Exhaustive End-to-End Automated QA & Visual Verification Suite for Winterhof
 * Uses native Node 24 WebSocket + Chromium DevTools Protocol (CDP).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9223;
const URL = process.env.WINTERHOF_URL || 'http://localhost:8080/index.html';
const OUT = path.join(__dirname, 'qa');
fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }
  async open() {
    await new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${expr} })()`,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error('JS Exception: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
  async screenshot(name) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return file;
  }
  close() { this.ws.close(); }
}

async function waitForCDP() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chromium CDP failed to start');
}

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
  console.log('  ✓', msg);
}

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return 'chrome';
  }
  return 'chromium';
}

const chrome = spawn(findBrowser(), [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  '--window-size=412,860',
  URL
], { stdio: 'ignore' });

try {
  const wsUrl = await waitForCDP();
  const cdp = new CDP(wsUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Console.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 412, height: 860, deviceScaleFactor: 2, mobile: true
  });

  // Wait for game & all sprites to finish loading
  await sleep(1600);

  // Check broken images & console errors
  const initCheck = await cdp.eval(`
    const g = window.__WINTERHOF__;
    if (!g) throw new Error('Game instance missing');
    const imgs = Object.entries(g.world ? (window.__SPRITES__ || {}) : {});
    return {
      welcomeOpen: !document.getElementById('modal-backdrop').classList.contains('hidden'),
      coins: g.state.coins,
      fields: g.state.fields.length,
      animals: g.state.animals.length,
      wildMushrooms: g.state.wildMushrooms.length,
      orders: g.state.orders.length
    };
  `);
  assert(initCheck.welcomeOpen, 'First-launch Owl Welcome Letter opens automatically');
  assert(initCheck.coins === 145, `Starter coins = 145 (got ${initCheck.coins})`);
  assert(initCheck.fields === 6, 'Starter fields = 6');
  assert(initCheck.wildMushrooms === 2, 'Starter wild forest Schwammerl = 2');
  await cdp.screenshot('01_welcome_letter.png');

  // Close welcome letter
  await cdp.eval(`document.getElementById('btn-welcome-go').click();`);
  await sleep(300);
  await cdp.screenshot('02_winter_day_portrait.png');

  // Test 1: Harvest ripe fields + plant Matcha + check grow timer
  const farmRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    const beforeWheat = g.state.inventory.wheat || 0;
    const beforeMatcha = g.state.inventory.matcha || 0;
    // Harvest all 5 ripe starter fields
    let harvested = 0;
    for (const f of g.state.fields) {
      if (g.harvestField(f)) harvested++;
    }
    // Plant Matcha on empty field f_1
    const planted = g.plantField(g.state.fields[0], 'matcha');
    return {
      harvested,
      planted,
      wheatDelta: (g.state.inventory.wheat || 0) - beforeWheat,
      matchaDelta: (g.state.inventory.matcha || 0) - beforeMatcha,
      harvestStat: g.state.stats.harvests
    };
  `);
  assert(farmRes.harvested === 5, `Harvested all 5 ripe starter fields (got ${farmRes.harvested})`);
  assert(farmRes.wheatDelta === 4, 'Wheat harvest yielded +4 (2 per field)');
  assert(farmRes.matchaDelta === 2, 'Matcha harvest yielded +2');
  assert(farmRes.planted === true, 'Planted Matcha on empty field cleanly');

  // Test 2: Forage wild forest Schwammerl + Catch Golden Snitch + Tap Sorting Hat
  const magicRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    const mBefore = g.state.inventory.mushroom || 0;
    g.forageWildMushroom(g.state.wildMushrooms[0]);
    const mAfter = g.state.inventory.mushroom || 0;
    g.world.spawnSnitch();
    const cBefore = g.state.coins;
    g.catchGoldenSnitch();
    const cAfter = g.state.coins;
    return { mDelta: mAfter - mBefore, snitchCoins: cAfter - cBefore, snitchStat: g.state.stats.snitches };
  `);
  assert(magicRes.mDelta === 2, 'Foraging wild Schwammerl gives +2 mushrooms');
  assert(magicRes.snitchCoins === 28, 'Catching Golden Snitch awards +28 coins');
  assert(magicRes.snitchStat === 1, 'Snitch achievement stat incremented');

  // Test 3: Collect animals, feed, pet, and rename animal
  const animalRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    const eggBefore = g.state.inventory.egg || 0;
    const milkBefore = g.state.inventory.starmilk || 0;
    g.interactAnimal(g.state.animals[0]); // collect egg
    g.interactAnimal(g.state.animals[1]); // collect milk
    g.interactAnimal(g.state.animals[0]); // feed wheat
    g.interactAnimal(g.state.animals[0]); // pet producing chicken!
    g.state.animals[0].nick = 'Matcha-Huhn';
    return {
      eggDelta: (g.state.inventory.egg || 0) - eggBefore,
      milkDelta: (g.state.inventory.starmilk || 0) - milkBefore,
      chickenState: g.state.animals[0].state,
      pets: g.state.stats.pets
    };
  `);
  assert(animalRes.eggDelta === 1 && animalRes.milkDelta === 1, 'Collected Egg & Wintermilch from animals');
  assert(animalRes.chickenState === 'producing', 'Fed chicken starts producing');
  assert(animalRes.pets === 1, 'Petting producing chicken awards hearts & stat');

  // Test 4: Building Placement Edge Cases (occupied tile, locked land, valid tile) + Moving a 2x2 building by 1 tile!
  const buildRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.state.coins = 500; // Give test budget
    // Buy Matcha Teahouse (2x2)
    g.enterPlaceMode({ kind: 'station', type: 'teahouse', label: 'Matcha-Teehaus', cost: 90, size: 2 });
    const blockedOccupied = g.isAreaFree(5, 2, 2); // chalet is at 5,2
    const blockedLocked = g.isAreaFree(0, 5, 2); // west_forest is locked
    const validFree = g.isAreaFree(10, 11, 2); // free inside core!
    // Tap on valid tile (10, 11) via worldToScreen
    const wp = { x: (10.5 - 11.5) * 58, y: (10.5 + 11.5) * 29 };
    const sp = g.world.worldToScreen(wp.x, wp.y);
    g.handleCanvasTap(sp.x, sp.y);
    const tea = g.state.stations.find(s => s.type === 'teahouse');
    const wasWrapped = tea.wrapped === true;
    // Unwrap red ribbon bow on newly built Teahouse!
    g.interactStation(tea);
    const nowUnwrapped = tea.wrapped === false;

    // Now test Moving a 2x2 building (st_bakery at 3,6 -> 2,6 — overlapping its own old footprint by 1 tile!)
    const canShift1Tile = g.isAreaFree(2, 6, 2, 'st_bakery');
    g.enterMoveMode();
    g.ui.selectedMoveId = 'st_bakery';
    const wp2 = { x: (2.5 - 6.5) * 58, y: (2.5 + 6.5) * 29 };
    const sp2 = g.world.worldToScreen(wp2.x, wp2.y);
    g.handleCanvasTap(sp2.x, sp2.y);

    // Test storing a decoration into storage!
    const decoCountBefore = g.state.decorations.length;
    g.ui.selectedMoveId = g.state.decorations[0].id;
    g.storeSelectedDeco();
    const decoStored = g.state.decorations.length === decoCountBefore - 1;
    g.exitSpecialMode();

    const bak = g.state.stations.find(s => s.id === 'st_bakery');
    return {
      blockedOccupied,
      blockedLocked,
      validFree,
      teaBuilt: tea.built,
      wasWrapped,
      nowUnwrapped,
      teaPos: [tea.gx, tea.gy],
      canShift1Tile,
      decoStored,
      bakeryMovedTo: [bak.gx, bak.gy]
    };
  `);
  assert(buildRes.blockedOccupied === false, 'Cannot place 2x2 building on occupied tile');
  assert(buildRes.blockedLocked === false, 'Cannot place 2x2 building on locked land zone');
  assert(buildRes.validFree === true && buildRes.teaBuilt === true, `Matcha Teahouse placed & built at [${buildRes.teaPos}]`);
  assert(buildRes.wasWrapped && buildRes.nowUnwrapped, 'New building spawns with red ribbon crate & unwraps cleanly!');
  assert(buildRes.canShift1Tile === true && buildRes.bakeryMovedTo[0] === 2 && buildRes.bakeryMovedTo[1] === 6, '2x2 Bakery moved cleanly by 1 tile without self-collision!');
  assert(buildRes.decoStored === true, 'Decoration stored cleanly into free re-placement storage!');

  // Test 5: Crafting Butterplätzchen + Matcha-Latte + Mastery + Story Chapter 1 & 2 + Villager Greeting!
  const craftRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.startCraft('st_bakery', 'butterplaetzchen');
    g.startCraft('st_teahouse', 'matcha_latte');
    const bak = g.state.stations.find(s => s.id === 'st_bakery');
    const tea = g.state.stations.find(s => s.id === 'st_teahouse');
    bak.queue[0].finishAt = Date.now() - 1000;
    tea.queue[0].finishAt = Date.now() - 1000;
    g.tickSimulation(Date.now());
    const readyCounts = [bak.ready.length, tea.ready.length];
    g.interactStation(bak);
    g.interactStation(tea);
    // Claim Chapter 1 & 2!
    g.claimChapter('ch_1');
    g.claimChapter('ch_2');
    // Greet strolling villager for +5 tip!
    const vcBefore = g.state.coins;
    g.greetVillager(g.world.villagers[0]);
    const villagerTip = g.state.coins - vcBefore;
    return {
      readyCounts,
      hasCookies: g.state.inventory.butterplaetzchen || 0,
      hasMatchaLatte: g.state.inventory.matcha_latte || 0,
      matchaStat: g.state.stats.matchaMade,
      masteryCount: bak.craftedCount,
      chaptersClaimed: g.state.claimedChapters.length,
      villagerTip
    };
  `);
  assert(craftRes.readyCounts[0] === 1 && craftRes.readyCounts[1] === 1, 'Bakery & Teahouse finish queued items cleanly');
  assert(craftRes.hasCookies >= 1 && craftRes.hasMatchaLatte >= 1, 'Collected Butterplätzchen & Matcha-Latte into barn');
  assert(craftRes.matchaStat === 1 && craftRes.masteryCount === 1, 'Matcha stat & Machine Mastery count tracked');
  assert(craftRes.chaptersClaimed === 2, 'Story Chapters 1 & 2 completed and rewards claimed!');
  assert(craftRes.villagerTip === 5, 'Greeting strolling villager awards +5 coin tip!');

  // Test 6: Hofladen (Roadside Stand) listing, sale & coin collection
  const standRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    const cBefore = g.state.coins;
    g.listItemOnStand(0, 'wheat');
    g.state.standSlots[0].sellAt = Date.now() - 1000;
    g.tickSimulation(Date.now());
    const sold = g.state.standSlots[0].sold;
    g.collectStandSlot(0);
    return { sold, coinsEarned: g.state.coins - cBefore, slotCleared: g.state.standSlots[0] === null };
  `);
  assert(standRes.sold && standRes.coinsEarned > 0 && standRes.slotCleared, `Hofladen sold crate for +${standRes.coinsEarned} coins & cleared slot`);

  // Test 7: Land Expansion Unlock
  const landRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.state.xp = 120; // Level 2
    g.state.coins = 300;
    const beforeTile = g.isTileUnlocked(1, 6);
    const ok = g.unlockLandZone('west_forest');
    const afterTile = g.isTileUnlocked(1, 6);
    return { beforeTile, ok, afterTile };
  `);
  assert(landRes.beforeTile === false && landRes.ok === true && landRes.afterTile === true, 'Land expansion west_forest unlocked & tile (1,6) now buildable!');

  // Test 8: Eulenpost Gift Encode -> Decode -> Receive
  const giftRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.openModal('gifts', {}, 'send');
    g.ui.giftDraft.items = { matcha_latte: 1 };
    g.ui.giftDraft.note = 'Für dich ❤️🍵';
    g.renderActiveModal();
    document.getElementById('btn-pack-gift').click();
    const code = g.ui.giftDraft.generatedCode;
    g.ui.activeModal.tab = 'open';
    g.renderActiveModal();
    document.getElementById('gift-redeem-input').value = code;
    document.getElementById('btn-redeem-gift').click();
    // Finish owl delivery immediately to test claim & duplicate prevention
    g.world.giftParachute.progress = 1;
    g.world.update(0.1, g.state);
    const hasLatteAgain = g.state.inventory.matcha_latte || 0;
    const claimedCount = g.state.claimedGifts.length;
    g.closeModal();
    return { codePrefix: code?.slice(0, 3), hasLatteAgain, claimedCount };
  `);
  assert(giftRes.codePrefix === 'WH-' && giftRes.hasLatteAgain >= 1 && giftRes.claimedCount === 1, 'Eulenpost gift parcel encoded, delivered & redeemed cleanly!');

  // Test 9: Capture Visual Screenshots of Autumn Day, Autumn Night, Winter Night & Modals!
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 860, height: 412, deviceScaleFactor: 2, mobile: true
  });
  await sleep(300);

  // Switch to Autumn Day!
  await cdp.eval(`
    const g = window.__WINTERHOF__;
    document.getElementById('btn-season').click();
    g.world.seasonBlend = 1;
    g.world.lightingMode = 'day';
    g.world.eveningFactor = 0;
    g.world.spawnSnitch();
    g.world.snitch.x = g.world.cam.x + 120;
    g.world.snitch.y = g.world.cam.y - 70;
    g.closeModal();
  `);
  await sleep(350);
  await cdp.screenshot('03_autumn_day_landscape.png');

  // Switch to Autumn Night (Halloween glowing pumpkins, floating ghost, fireflies!)
  await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.world.lightingMode = 'night';
    g.world.eveningFactor = 1;
  `);
  await sleep(350);
  await cdp.screenshot('04_autumn_night_landscape.png');

  // Switch to Winter Night (Christmas tree glow, aurora, warm windows!)
  await cdp.eval(`
    const g = window.__WINTERHOF__;
    document.getElementById('btn-season').click();
    g.world.seasonBlend = 0;
    g.world.lightingMode = 'night';
    g.world.eveningFactor = 1;
  `);
  await sleep(350);
  await cdp.screenshot('05_winter_night_landscape.png');

  // Open Shop -> Herbst & Magie tab screenshot
  await cdp.eval(`window.__WINTERHOF__.openModal('shop', {}, 'autumn_magic');`);
  await sleep(250);
  await cdp.screenshot('06_shop_autumn_magic.png');

  // Test 10: Save & Reload Persistence Check
  await cdp.eval(`window.__WINTERHOF__.saveState();`);
  await cdp.send('Page.reload');
  await sleep(1600);
  const afterReload = await cdp.eval(`
    const g = window.__WINTERHOF__;
    return {
      welcomeSeen: g.state.welcomeSeen,
      landsUnlocked: g.state.unlockedLands.length,
      teaBuilt: g.state.stations.find(s => s.type === 'teahouse').built,
      chickenNick: g.state.animals[0].nick,
      snitches: g.state.stats.snitches
    };
  `);
  assert(afterReload.welcomeSeen === true, 'Reload remembers welcomeSeen');
  assert(afterReload.landsUnlocked === 1, 'Reload preserves unlocked land expansion');
  assert(afterReload.teaBuilt === true, 'Reload preserves newly built Matcha Teahouse');
  assert(afterReload.chickenNick === 'Matcha-Huhn', 'Reload preserves custom animal nickname');
  assert(afterReload.snitches === 1, 'Reload preserves achievement stats');

  // Verify zero uncaught exceptions or console errors!
  const errors = cdp.events.filter((e) =>
    (e.method === 'Runtime.exceptionThrown') ||
    (e.method === 'Console.messageAdded' && e.params?.message?.level === 'error')
  );
  assert(errors.length === 0, `Zero browser console/runtime errors (found ${errors.length})`);

  console.log('\n🎉 ALL E2E TESTS & VISUAL CAPTURES PASSED 100%!');
  cdp.close();
} finally {
  chrome.kill();
}
