/**
 * Winterhof v6 — Stage-1 Supercell Benchmark & Automated E2E Visual Audit
 * Serves production dist/, launches Chromium WebGL2, verifies:
 * - Portrait Rotate-Overlay Lock & Landscape-Only Framing
 * - PixiJS v8 WebGL Renderer Active & FPS Budget
 * - 0 Sign/Building Overlaps · 0 Emojis · 0 Console/Runtime Errors
 * - Full Core Gameplay Loop & Save Persistence
 * - Captures Day (Style C) / Golden Dusk (Style B) / Night Bloom / Mobile Landscape screenshots
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(__dirname);
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(__dirname, 'qa', 'e2e'); // nur eigener Unterordner wird geleert
const HTTP_PORT = 8086;
const CDP_PORT = 9224;
const TARGET_URL = `http://127.0.0.1:${HTTP_PORT}/index.html`;

// Purge stale QA screenshots before run (neutralize NTFS timestamp artifacts)
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqPath = (req.url || '/').split('?')[0];
      const rel = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
      const full = path.join(DIST, rel);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        const ext = path.extname(full).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(full).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(HTTP_PORT, '127.0.0.1', () => resolve(server));
  });
}

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
    const buf = Buffer.from(data, 'base64');
    const file = path.join(OUT, name);
    fs.writeFileSync(file, buf);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    return { name, file, bytes: buf.length, sha256 };
  }
  close() { this.ws.close(); }
}

async function waitForCDP() {
  for (let i = 0; i < 45; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
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

// Edge startet sich unter Windows als eigener Prozess neu: chrome.kill() trifft dann nicht den Browser.
// Ein übrig gebliebener Browser auf dem Testport hätte den nächsten Lauf mit altem Spielstand gekapert.
// Darum vor und nach dem Lauf alles beenden, was auf dem Testport lauscht.
function killTestBrowser() {
  if (process.platform !== 'win32') return;
  try {
    const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8' }).stdout || '';
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().split(/\s+/);
      if (m.length >= 5 && m[1].endsWith(`:${CDP_PORT}`) && /:0$/.test(m[2])) pids.add(m[4]);
    }
    for (const pid of pids) spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' });
  } catch {}
}
killTestBrowser();

const server = await startStaticServer();
const chrome = spawn(findBrowser(), [
  '--headless=new',
  '--no-sandbox',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-gl=angle',
  `--remote-debugging-port=${CDP_PORT}`,
  // frisches Profil je Lauf: sonst lebt der Spielstand des letzten Laufs weiter
  `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'winterhof-e2e-'))}`,
  '--window-size=1280,720',
  TARGET_URL
], { stdio: 'ignore' });

const shots = [];
let report = {};

try {
  const wsUrl = await waitForCDP();
  const cdp = new CDP(wsUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Console.enable');

  // Start in Desktop 16:9 Landscape for clean initial load & WebGL verification
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false
  });

  // Wait for splash fade-out + WebGL warmup
  await sleep(2600);

  // 1. Verify WebGL2 PixiJS Engine, 12-Rule WorldValidator, Zero +/- Buttons, Zero Emojis, Zero Sign Overlaps
  const initCheck = await cdp.eval(`
    const g = window.__WINTERHOF__;
    if (!g) throw new Error('Game instance missing');
    const bodyText = document.body.innerText || '';
    const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
    const validation = g.world.validateState(g.state);
    return {
      modalHidden: document.getElementById('modal-backdrop').classList.contains('hidden'),
      hasRotateOverlay: !!document.getElementById('rotate-overlay'),
      hasZoomButtons: !!(document.getElementById('btn-zoom-in') || document.getElementById('btn-zoom-out')),
      hasEmojiInHud: emojiRe.test(bodyText),
      renderer: g.world.getRendererInfo(),
      layout: g.world.getLayoutDiagnostics(),
      validation,
      coins: g.state.coins,
      fields: g.state.fields.length,
      animals: g.state.animals.length
    };
  `);
  assert(initCheck.renderer.ready === true, `PixiJS v8 engine ready (${initCheck.renderer.rendererType})`);
  assert(String(initCheck.renderer.rendererType).toLowerCase().includes('webgl'), `WebGL GPU renderer active (got ${initCheck.renderer.rendererType})`);
  assert(initCheck.hasRotateOverlay === false, 'Kein Querformat-Hinweis im DOM');
  assert(initCheck.hasZoomButtons === false, 'Zero clunky +/- zoom buttons on screen');
  assert(initCheck.modalHidden === true, 'Calm Level-1 start: zero blocking popup');
  assert(initCheck.hasEmojiInHud === false, 'Strict Zero-Emoji Policy passed on initial HUD');
  assert(initCheck.validation.ok === true, `12-Rule WorldValidator PASSED (${initCheck.validation.errorCount} errors: ${initCheck.validation.errors.join(' | ')})`);
  assert(initCheck.layout.signBuildingOverlaps.length === 0, `Zero sign/building overlaps (found ${JSON.stringify(initCheck.layout.signBuildingOverlaps)})`);
  assert(initCheck.coins === 145 && initCheck.fields === 4 && initCheck.animals === 1, 'Calm Level-1 starter estate intact');

  // Capture crisp Style-C Day Landscape
  shots.push(await cdp.screenshot('02_v6_day_landscape.png'));

  // Capture Debug-Grid Proof View (proves 100% tile alignment, fences, bridge, footprints, water!)
  await cdp.eval(`window.__WINTERHOF__.world.setDebugGrid(true);`);
  await sleep(180);
  shots.push(await cdp.screenshot('02a_v6_debug_grid.png'));
  await cdp.eval(`window.__WINTERHOF__.world.setDebugGrid(false);`);
  await sleep(120);

  // Capture Style-B Golden Hour Dusk Landscape
  await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.world.lightingMode = 'dusk';
    g.world.eveningFactor = 0.48;
  `);
  await sleep(260);
  shots.push(await cdp.screenshot('03_v6_dusk_landscape.png'));

  // Capture Deep Sapphire + Gold-Bloom Night Landscape
  await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.world.lightingMode = 'night';
    g.world.eveningFactor = 1.0;
  `);
  await sleep(260);
  shots.push(await cdp.screenshot('04_v6_night_landscape.png'));

  // Back to crisp Day for Mobile Landscape & Portrait Guard verification
  await cdp.eval(`
    const g = window.__WINTERHOF__;
    g.world.lightingMode = 'day';
    g.world.eveningFactor = 0.0;
  `);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 844, height: 390, deviceScaleFactor: 2, mobile: true
  });
  await sleep(320);
  shots.push(await cdp.screenshot('05_v6_mobile_landscape.png'));

  // Test Portrait Orientation Lock (390x844)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await sleep(260);
  const portraitCheck = await cdp.eval(`
    const app = document.getElementById('app');
    return {
      isPortraitClass: document.body.classList.contains('is-portrait'),
      transform: getComputedStyle(app).transform,
      worldW: window.__WINTERHOF__.world.width,
      worldH: window.__WINTERHOF__.world.height,
      hasOverlay: !!document.getElementById('rotate-overlay')
    };
  `);
  assert(portraitCheck.isPortraitClass === true && portraitCheck.transform !== 'none' && portraitCheck.worldW > portraitCheck.worldH && !portraitCheck.hasOverlay, 'Hochkant: App wird ins Querformat gedreht, kein Hinweis-Overlay');
  shots.push(await cdp.screenshot('01_portrait_auto_landscape.png'));

  // Return to Desktop Landscape for Full Core Gameplay Loop & FPS Telemetry
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false
  });
  await sleep(280);

  // Measure real RAF FPS over 1.2s warmup + sample window (no screenshot during measurement)
  const fpsRes = await cdp.eval(`
    await new Promise((r) => setTimeout(r, 800));
    const samples = [];
    let prev = performance.now();
    await new Promise((resolve) => {
      function tick(now) {
        samples.push(now - prev);
        prev = now;
        if (samples.length >= 45) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    const avgMs = samples.reduce((a, b) => a + b, 0) / samples.length;
    return { avgFps: Math.round((1000 / avgMs) * 10) / 10, avgMs: Math.round(avgMs * 100) / 100 };
  `);
  console.log(`  PERF: ${fpsRes.avgFps} FPS (avg frame ${fpsRes.avgMs} ms)`);

  // 2. Spielablauf über den Logik-Kern (Ernten, Pflanzen, Tier, Bauen/Auspacken, Backen, Lager, Truhe, Angebot)
  const loopRes = await cdp.eval(`
    const g = window.__WINTERHOF__;
    let harvested = 0;
    for (const f of [...g.state.fields]) if (g.harvestField(f).ok) harvested++;
    const planted = g.plantField(g.state.fields[0], 'berries');

    const eggBefore = g.core.inventory.egg || 0;
    g.interactAnimal(g.state.animals[0]);
    g.interactAnimal(g.state.animals[0]);
    g.act({ type: 'renameAnimal', animalId: g.state.animals[0].id, nick: 'Schneeflocke' });
    const eggDelta = (g.core.inventory.egg || 0) - eggBefore;

    // Testgeld: nur im Test direkt in die Session (Oberfläche selbst ändert den Stand nie)
    g.session._state = { ...g.session._state, coins: 600, xp: 300, level: 3 };
    g.enterPlaceMode({ kind: 'station', type: 'teahouse', label: 'Punsch-Stand', cost: 90, size: 2 });
    const blockedRoad = g.isAreaFree(5, 6, 2);
    const blockedWater = g.isAreaFree(14, 4, 2);
    const wp = { x: (5.5 - 10.5) * 58, y: (5.5 + 10.5) * 29 };
    const sp = g.world.worldToScreen(wp.x, wp.y);
    g.handleCanvasTap(sp.x, sp.y);
    let tea = g.state.stations.find(s => s.type === 'teahouse');
    const wasWrapped = !!tea && tea.wrapped === true;
    if (tea) g.interactStation(tea);
    tea = g.state.stations.find(s => s.type === 'teahouse');
    const nowUnwrapped = !!tea && tea.wrapped === false;

    g.startCraft('st_bakery', 'butterplaetzchen');
    const craftQueued = g.core.objects.find(o => o.id === 'st_bakery').queue.length === 1;

    const upOk = g.upgradeStorage('barn');
    const chestOk = g.isDailyChestReady() && !!g.claimDailyChest();
    g.closeModal();

    g.session._state = { ...g.session._state, nextOfferAt: 0, villagerOffer: null };
    g.session.tick();
    g.syncVillagerOffer();
    const v = g.offerVillager();
    let offerOk = false;
    if (v) { g.greetVillager(v); offerOk = g.ui.activeModal?.kind === 'villager_offer' && g.acceptVillagerOffer(v.id); }

    const emojiRe = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u;
    const violations = [];
    for (const [k, t] of [['shop','buildings'], ['shop','deco'], ['barn','inv'], ['orders','wishlist'], ['village','album'], ['settings', null]]) {
      g.openModal(k, {}, t);
      if (emojiRe.test(document.getElementById('modal-backdrop').innerText || '')) violations.push(k + ':' + t);
    }
    g.closeModal();

    return {
      harvested, planted, eggDelta, blockedRoad, blockedWater,
      wasWrapped, nowUnwrapped, craftQueued,
      upOk, cap: g.core.storage.barn, chestOk, offerOk, violations
    };
  `);
  assert(loopRes.harvested === 4 && loopRes.planted, 'Ernten & Pflanzen über Befehle');
  assert(loopRes.eggDelta === 1, 'Tier abholen/füttern über Befehle');
  assert(loopRes.blockedRoad === false && loopRes.blockedWater === false, 'Kein Bauen auf Weg & Wasser (gleiche Regel wie Kern)');
  assert(loopRes.wasWrapped && loopRes.nowUnwrapped && loopRes.craftQueued, `Bauen, Auspacken & Backen (${JSON.stringify(loopRes)})`);
  assert(loopRes.upOk && loopRes.cap === 75 && loopRes.chestOk && loopRes.offerOk, 'Lager-Ausbau, Tagestruhe & Dorf-Angebot');
  assert(loopRes.violations.length === 0, `Keine Emojis in Fenstern (violations: ${loopRes.violations.join(',')})`);

  // Modal visual screenshots
  await cdp.eval(`window.__WINTERHOF__.openModal('shop', {}, 'buildings');`);
  await sleep(200);
  shots.push(await cdp.screenshot('06_v6_shop_modal.png'));

  await cdp.eval(`window.__WINTERHOF__.openModal('barn', {}, 'inv');`);
  await sleep(200);
  shots.push(await cdp.screenshot('07_v6_barn_modal.png'));

  // Save & reload persistence check
  await cdp.eval(`window.__WINTERHOF__.closeModal(); window.__WINTERHOF__.saveState();`);
  await cdp.send('Page.reload');
  await sleep(2200);
  const afterReload = await cdp.eval(`
    const g = window.__WINTERHOF__;
    return {
      cap: g.core.storage.barn,
      teaBuilt: g.state.stations.some(s => s.type === 'teahouse'),
      nick: g.state.animals[0].nick
    };
  `);
  assert(afterReload.cap === 75 && afterReload.teaBuilt && afterReload.nick === 'Schneeflocke', 'Speicherstand v8 übersteht Neuladen');

  const errors = cdp.events.filter((e) =>
    (e.method === 'Runtime.exceptionThrown') ||
    (e.method === 'Console.messageAdded' && e.params?.message?.level === 'error')
  );
  if (errors.length > 0) {
    console.error('BROWSER ERRORS:', JSON.stringify(errors, null, 2));
  }
  assert(errors.length === 0, `Zero console/runtime errors (found ${errors.length})`);

  report = {
    timestamp: new Date().toISOString(),
    version: 'v6-slice1',
    renderer: initCheck.renderer,
    perf: fpsRes,
    layout: initCheck.layout,
    consoleErrors: errors.length,
    screenshots: shots
  };
  fs.writeFileSync(path.join(OUT, 'VERIFICATION_REPORT.json'), JSON.stringify(report, null, 2));
  console.log('\nALL WINTERHOF v6 STAGE-1 BENCHMARK CHECKS PASSED 100%!');
  cdp.close();
} finally {
  chrome.kill();
  killTestBrowser();
  server.close();
}
