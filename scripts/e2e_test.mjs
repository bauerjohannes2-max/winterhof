/**
 * Exhaustive End-to-End Automated QA & Visual Verification Suite for Winterhof AAA (v5)
 * Verifies: Zero-Emoji Policy, Calm Level-1 Start, Core Loop, Barn Capacity,
 * Daily Chest, Villager Offers, Album, Level-3 Scythe, Save Persistence, 0 Console Errors.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9223;
const URL = process.env.WINTERHOF_URL || 'http://127.0.0.1:8085/index.html';
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
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
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
  console.log('  OK:', msg);
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

  // Wait for splash fade-out to complete cleanly
  await sleep(2400);

  // 1. Calm Level-1 Start (NO cringy welcome popup, NO emoji in DOM!)
  const initCheck = await cdp.eval(`
    const g = window.__WINTERHOF__;
    if (!g) throw new Error('Game instance missing');
    const bodyText = document.body.innerText || '';
    const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
    return {
      modalHidden: document.getElementById('modal-backdrop').classList.contains('hidden'),
      hasEmojiInHud: emojiRe.test(bodyText),
      coins: g.state.coins,
      fields: g.state.fields.length,
      animals: g.state.animals.length,
      decos: g.state.decorations.length,
      orders: g.state.orders.length
    };
  `);
  assert(initCheck.modalHidden === true, 'Calm Level-1 start: zero blocking welcome letter modal');
  assert(initCheck.hasEmojiInHud === false, 'Strict Zero-Emoji Policy passed on initial HUD');
  assert(initCheck.coins === 145, `Starter coins = 145 (got ${initCheck.coins})`);
  assert(initCheck.fields === 4, `Clean 2x2 starter fields = 4 (got ${initCheck.fields})`);
  assert(initCheck.animals === 1, `Calm starter animal count = 1 (got ${initCheck.animals})`);
  await cdp.screenshot('01_winter_day_portrait.png');

  // Capture serene Landscape Day view BEFORE triggering any toast clutter
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 920, height: 480, deviceScaleFactor: 2, mobile: true
  });
  await sleep(300);
  await cdp.screenshot('02_winter_day_landscape.png');

  // Switch back to mobile portrait for gameplay & modal tests
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 412, height: 860, deviceScaleFactor: 2, mobile: true
  });
  await sleep(200);

  // 2. Harvest 4 wheat fields + plant Winterbeeren
  const farmRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    const beforeWheat = g.state.inventory.wheat || 0;
    let harvested = 0;
    for (const f of g.state.fields) {
      if (g.harvestField(f)) harvested++;
    }
    const planted = g.plantField(g.state.fields[0], 'berries');
    return { harvested, planted, wheatDelta: (g.state.inventory.wheat || 0) - beforeWheat };
  `);
  assert(farmRes.harvested === 4, `Harvested all 4 starter wheat plots (got ${farmRes.harvested})`);
  assert(farmRes.wheatDelta === 8, 'Wheat harvest yielded +8 (2 per plot)');
  assert(farmRes.planted === true, 'Planted Winterbeeren cleanly');

  // 3. Collect egg, feed chicken, pet chicken
  const animalRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    const eggBefore = g.state.inventory.egg || 0;
    g.interactAnimal(g.state.animals[0]);
    g.interactAnimal(g.state.animals[0]);
    g.interactAnimal(g.state.animals[0]);
    g.state.animals[0].nick = 'Schneeflocke';
    return {
      eggDelta: (g.state.inventory.egg || 0) - eggBefore,
      state: g.state.animals[0].state,
      pets: g.state.stats.pets
    };
  `);
  assert(animalRes.eggDelta === 1, 'Collected Egg from starter chicken');
  assert(animalRes.state === 'producing', 'Fed chicken starts producing');
  assert(animalRes.pets === 1, 'Petting chicken increments pet stat');

  // 4. Build Punsch-Stand + unwrap red ribbon + move 2x2 bakery + store deco
  const buildRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.state.coins = 500;
    g.enterPlaceMode({ kind: 'station', type: 'teahouse', label: 'Punsch-Stand', cost: 90, size: 2 });
    const blockedOccupied = g.isAreaFree(5, 2, 2);
    const blockedLocked = g.isAreaFree(0, 5, 2);
    const validFree = g.isAreaFree(10, 10, 2);
    const wp = { x: (10.5 - 10.5) * 58, y: (10.5 + 10.5) * 29 };
    const sp = g.world.worldToScreen(wp.x, wp.y);
    g.handleCanvasTap(sp.x, sp.y);
    const tea = g.state.stations.find(s => s.type === 'teahouse');
    const wasWrapped = tea.wrapped === true;
    g.interactStation(tea);
    const nowUnwrapped = tea.wrapped === false;

    const canShift1Tile = g.isAreaFree(2, 7, 2, 'st_bakery');
    g.enterMoveMode();
    g.ui.selectedMoveId = 'st_bakery';
    const wp2 = { x: (2.5 - 7.5) * 58, y: (2.5 + 7.5) * 29 };
    const sp2 = g.world.worldToScreen(wp2.x, wp2.y);
    g.handleCanvasTap(sp2.x, sp2.y);

    const decoBefore = g.state.decorations.length;
    g.ui.selectedMoveId = g.state.decorations[0].id;
    g.storeSelectedDeco();
    const decoStored = g.state.decorations.length === decoBefore - 1;
    g.exitSpecialMode();

    const bak = g.state.stations.find(s => s.id === 'st_bakery');
    return { blockedOccupied, blockedLocked, validFree, teaBuilt: tea.built, wasWrapped, nowUnwrapped, canShift1Tile, decoStored, bakeryPos: [bak.gx, bak.gy] };
  `);
  assert(buildRes.blockedOccupied === false && buildRes.blockedLocked === false, 'Placement blocks occupied & locked tiles');
  assert(buildRes.teaBuilt && buildRes.wasWrapped && buildRes.nowUnwrapped, 'Punsch-Stand placed, wrapped & unwrapped cleanly');
  assert(buildRes.canShift1Tile && buildRes.bakeryPos[0] === 2 && buildRes.bakeryPos[1] === 7, '2x2 Bakery shifted 1 tile cleanly');
  assert(buildRes.decoStored === true, 'Decoration stored cleanly');

  // 5. Craft Butterplätzchen + Winterpunsch + Chapters 1 & 2
  const craftRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.startCraft('st_bakery', 'butterplaetzchen');
    g.startCraft('st_teahouse', 'winter_punch');
    const bak = g.state.stations.find(s => s.id === 'st_bakery');
    const tea = g.state.stations.find(s => s.id === 'st_teahouse');
    bak.queue[0].finishAt = Date.now() - 1000;
    tea.queue[0].finishAt = Date.now() - 1000;
    g.tickSimulation(Date.now());
    g.interactStation(bak);
    g.interactStation(tea);
    g.claimChapter('ch_1');
    g.claimChapter('ch_2');
    return {
      cookies: g.state.inventory.butterplaetzchen || 0,
      punch: g.state.inventory.winter_punch || 0,
      mastery: bak.craftedCount,
      chapters: g.state.claimedChapters.length
    };
  `);
  assert(craftRes.cookies >= 1 && craftRes.punch >= 1, 'Crafted & collected Butterplätzchen and Winterpunsch');
  assert(craftRes.mastery === 1 && craftRes.chapters === 2, 'Mastery tracked & Chapters 1-2 claimed');

  // 6. Barn Upgrade + Daily Chest + Villager Offer + Level-3 Scythe + Zero-Emoji Modal Audit
  const v5Res = await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.state.coins = 600;
    const capBefore = g.getBarnCapacity();
    const upOk = g.upgradeBarn();
    const capAfter = g.getBarnCapacity();

    const chestOk = g.isDailyChestReady() && !!g.claimDailyChest();
    g.closeModal();

    const v = g.world.villagers[0];
    g.generateVillagerOffer(v);
    g.greetVillager(v);
    const offerModal = g.ui.activeModal?.kind === 'villager_offer';
    const dealOk = g.acceptVillagerOffer(v.id);

    g.state.xp = 260;
    const now = Date.now();
    g.state.fields[0].cropId = 'wheat'; g.state.fields[0].plantedAt = now - 300000;
    g.state.fields[1].cropId = 'berries'; g.state.fields[1].plantedAt = now - 300000;
    g.updateHUD();
    const scytheVisible = !document.getElementById('btn-scythe').classList.contains('hidden');
    const scytheHarvested = g.harvestAllReadyFields();

    // Audit every modal for zero emojis
    const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
    const modalChecks = [];
    for (const [k, t] of [['shop','buildings'], ['shop','deco'], ['barn','inv'], ['orders','wishlist'], ['village','album'], ['settings', null]]) {
      g.openModal(k, {}, t);
      const txt = document.getElementById('modal-backdrop').innerText || '';
      if (emojiRe.test(txt)) modalChecks.push(k + ':' + t);
    }
    g.closeModal();

    return { capBefore, upOk, capAfter, chestOk, offerModal, dealOk, scytheVisible, scytheHarvested, emojiViolations: modalChecks };
  `);
  assert(v5Res.capBefore === 50 && v5Res.upOk && v5Res.capAfter === 75, 'Barn capacity upgraded 50 -> 75');
  assert(v5Res.chestOk === true, 'Daily lakeside treasure chest claimed');
  assert(v5Res.offerModal && v5Res.dealOk, 'Villager doorstep offer modal & sale work');
  assert(v5Res.scytheVisible && v5Res.scytheHarvested === 2, 'Level-3 Harvest-All Scythe works');
  assert(v5Res.emojiViolations.length === 0, `Zero emojis across all modals (violations: ${v5Res.emojiViolations.join(',')})`);

  // 7. Capture Crisp Screenshots of Modals & Starry Winter Night!
  await cdp.eval(`window.__WINTERHOF__.openModal('shop', {}, 'buildings');`);
  await sleep(220);
  await cdp.screenshot('03_shop_modal.png');

  await cdp.eval(`window.__WINTERHOF__.openModal('barn', {}, 'inv');`);
  await sleep(220);
  await cdp.screenshot('04_barn_modal.png');

  await cdp.eval(`window.__WINTERHOF__.openModal('village', {}, 'album');`);
  await sleep(220);
  await cdp.screenshot('05_album_modal.png');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 920, height: 480, deviceScaleFactor: 2, mobile: true
  });
  await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.closeModal();
    g.world.lightingMode = 'night';
    g.world.eveningFactor = 1;
  `);
  await sleep(320);
  await cdp.screenshot('06_winter_night_landscape.png');

  // 8. Save & Reload Persistence
  await cdp.eval(`window.__WINTERHOF__.saveState();`);
  await cdp.send('Page.reload');
  await sleep(1600);
  const afterReload = await cdp.eval(`
    const g = window.__WINTERHOF__;
    return {
      cap: g.getBarnCapacity(),
      teaBuilt: g.state.stations.find(s => s.type === 'teahouse').built,
      nick: g.state.animals[0].nick
    };
  `);
  assert(afterReload.cap === 75 && afterReload.teaBuilt === true && afterReload.nick === 'Schneeflocke', 'Reload preserves barn upgrade, built Punsch-Stand & animal nick');

  // 9. Zero Console / Runtime Errors
  const errors = cdp.events.filter((e) =>
    (e.method === 'Runtime.exceptionThrown') ||
    (e.method === 'Console.messageAdded' && e.params?.message?.level === 'error')
  );
  assert(errors.length === 0, `Zero browser console/runtime errors (found ${errors.length})`);

  console.log('\nALL AAA WINTERHOF E2E TESTS PASSED 100%!');
  cdp.close();
} finally {
  chrome.kill();
}
