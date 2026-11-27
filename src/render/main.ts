// ============================================================================
// Winterhof – neue Darstellung (Neustart, docs/NEUSTART_PLAN.md), Einstieg
// Baustein 3: Technik-Gerüst · Baustein 4: Kamera · Baustein 5/6: Boden & Wege ·
// Baustein 7/7b: Kontaktschatten & Boden-Deko · Baustein 9: Felder + GameSession.
// Liest den Kern nur über ../core, ändert den Spielstand nur über Befehle.
// ============================================================================
import { Application, Assets, type Container, type Texture, type WebGLRenderer } from 'pixi.js';
import {
  buildPathField, CONTENT, GameSession, meadow, pathTiles, terrainMap, type FieldObject, type MapObject
} from '../core';
import { Camera, maxZoomForWidth } from './camera/camera';
import { attachCameraInput } from './camera/input';
import { cameraConfig, startView } from './camera/mapView';
import { FieldEffects } from './scene/fieldEffects';
import { fieldAtWorld, FieldView } from './scene/fields';
import { GridOverlay } from './scene/grid';
import { Ground } from './scene/ground';
import { GroundDecoView } from './scene/groundDeco';
import { ObjectView } from './scene/objects';

import { loadStartAssets } from './boot/assets';
import { ATLAS_MAX, chooseQuality, renderResolution, SLOW_FPS, type Quality } from './boot/quality';
import { createWorld, layerOrder } from './scene/layers';
import { FieldTool } from './ui/fieldTool';
import { openLoadingScreen } from './ui/loading';
import { watchOrientation } from './ui/orientation';

const SLOW_KEY = 'winterhof_grafik_leicht';
/** Hintergrund der leeren Welt (Schnee, STIL_REGELN) */
const SNOW = '#dfe9f3';

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(key: string): void {
  try { localStorage.setItem(key, '1'); } catch { /* privates Fenster: nächster Start misst neu */ }
}

/** Speicheranbindung für GameSession (localStorage mit stillem Speicher-Fallback). */
function browserStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  const fallback = new Map<string, string>();
  return {
    getItem(k: string): string | null {
      try { return localStorage.getItem(k); } catch { return fallback.get(k) ?? null; }
    },
    setItem(k: string, v: string): void {
      try { localStorage.setItem(k, v); } catch { fallback.set(k, v); }
    }
  };
}

/** Größte Textur der Grafikkarte direkt aus Pixis WebGL-Kontext (kein zweiter Wegwerf-Kontext beim Start). */
function maxTextureSize(app: Application): number {
  const gl = (app.renderer as Partial<WebGLRenderer>).gl;
  return gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 0;
}

/** Misst die ersten Sekunden; ist das Gerät für @2x zu langsam, startet es beim nächsten Mal leicht. */
function watchFirstSeconds(app: Application, q: Quality): void {
  if (q === 1) return;
  const samples: number[] = [];
  const sample = (): void => {
    if (!app.ticker.started) return;            // hochkant pausiert: nicht mitzählen
    samples.push(app.ticker.FPS);
    if (samples.length < 10) return;
    app.ticker.remove(sample);
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)] ?? SLOW_FPS;
    if (median < SLOW_FPS) writeFlag(SLOW_KEY);
  };
  window.setTimeout(() => app.ticker.add(sample), 2000);  // Startlast abwarten
}

/** Kamera = Verschiebung + Zoom des einen Welt-Containers; steht sie still, auf ganze Bildpunkte gerundet (scharf). */
function applyCamera(worldRoot: Container, camera: Camera, resolution: number, vw: number, vh: number): void {
  const { cx, cy, zoom } = camera.view;
  let x = vw / 2 - cx * zoom, y = vh / 2 - cy * zoom;
  if (camera.idle) { x = Math.round(x * resolution) / resolution; y = Math.round(y * resolution) / resolution; }
  worldRoot.scale.set(zoom);
  worldRoot.position.set(x, y);
}

async function start(): Promise<void> {
  const t0 = performance.now();
  const root = document.getElementById('neu-root');
  if (!root) throw new Error('#neu-root fehlt');
  const loading = openLoadingScreen();
  // Balken nach echten Etappen (grob nach Datenmenge): Motiv da 10 % (index.html), Spiel-Skript geladen 35 %,
  // Grafik gestartet 45 %, Bilder 45–100 %. Nie geschätzt oder nach Zeit vorgerückt.
  loading.progress(0.35);

  const dpr = window.devicePixelRatio || 1;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceBase = {
    dpr, cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory, slowBefore: readFlag(SLOW_KEY),
    maxZoom: maxZoomForWidth(Math.max(root.clientWidth, root.clientHeight))
  };
  const prelimQ = chooseQuality({ ...deviceBase, maxTextureSize: ATLAS_MAX * 2 });

  const app = new Application();
  await app.init({
    resizeTo: root,
    background: SNOW,
    antialias: false,
    autoDensity: true,
    resolution: renderResolution(prelimQ, dpr),
    preference: 'webgl',
    powerPreference: 'high-performance'
  });
  const q = chooseQuality({ ...deviceBase, maxTextureSize: maxTextureSize(app) });
  if (q !== prelimQ) app.renderer.resize(app.screen.width, app.screen.height, renderResolution(q, dpr));
  root.appendChild(app.canvas);
  loading.progress(0.45);

  // Bilder laden und Kartendaten + Spielstand vorbereiten laufen parallel
  const assetsReady = loadStartAssets(q, (p) => loading.progress(0.45 + p * 0.55));
  const session = new GameSession({ store: browserStore() });
  const map = terrainMap();
  const pathBox = { gx0: map.minGx, gy0: map.minGy, w: map.maxGx - map.minGx + 1, h: map.maxGy - map.minGy + 1 };
  const pathsFor = (objects: readonly MapObject[]) => buildPathField(pathTiles(objects), CONTENT.paths.surfaces, pathBox);
  const startObjects = session.state.objects;
  const startPaths = pathsFor(startObjects);
  const startMeadow = meadow();
  await assetsReady;

  const world = createWorld();
  app.stage.addChild(world.root);

  const camera = new Camera({ ...cameraConfig(map), maxSharpZoom: q / app.renderer.resolution });
  camera.resize(app.screen.width, app.screen.height);
  const sv = startView(map, app.screen.width, app.screen.height);
  camera.setView(sv.cx, sv.cy, sv.zoom);

  const params = new URLSearchParams(location.search);
  const ground = new Ground(startMeadow, Assets.get<Texture>('wiese'), Assets.get<Texture>('erde'), Assets.get<Texture>('steine'), startPaths);
  world.layer.grund.addChild(ground.view);

  const groundDeco = new GroundDecoView(startMeadow, startObjects, startPaths);
  world.layer.bodenzeichnung.addChild(groundDeco.view);

  // Objekte + Felder teilen sich `objekte` für exakte Vorn/Hinten-Tiefensortierung; Erdwülste liegen in `bodenzeichnung`.
  new ObjectView(startObjects, { objects: world.layer.objekte, shadows: world.layer.kontaktschatten });
  const fieldView = new FieldView(world.layer.bodenzeichnung, world.layer.objekte, startObjects, Date.now());
  const fieldEffects = new FieldEffects();
  world.layer.effekte.addChild(fieldEffects.view);

  const coverView = (): void => {
    const a = camera.screenToWorld(0, 0), e = camera.screenToWorld(app.screen.width, app.screen.height);
    ground.cover({ x0: a.x, y0: a.y, x1: e.x, y1: e.y });
  };
  const grid = new GridOverlay(map, params.get('raster') !== '0');
  world.layer.auswahl.addChild(grid.view);

  const fieldTool = new FieldTool(app.canvas, camera, {
    getState: () => session.state,
    getNow: () => Date.now(),
    onHarvest(field: FieldObject): boolean {
      const res = session.dispatch({ type: 'harvest', fieldId: field.id });
      if (!res.ok) {
        fieldView.triggerShake(field.id);
        fieldEffects.spawnWarning(field, res.error.message);
        return false;
      }
      fieldView.triggerPop(field.id);
      const hv = res.events.find((ev) => ev.type === 'harvested');
      const xpEv = res.events.find((ev) => ev.type === 'xpGained');
      if (hv && hv.type === 'harvested') {
        fieldEffects.spawnHarvest(field, hv.crop, hv.qty, xpEv && xpEv.type === 'xpGained' ? xpEv.amount : 0);
      }
      return true;
    },
    onPlant(field: FieldObject, cropId: string): boolean {
      const res = session.dispatch({ type: 'plant', fieldId: field.id, crop: cropId });
      if (!res.ok) {
        fieldView.triggerShake(field.id);
        fieldEffects.spawnWarning(field, res.error.message);
        return false;
      }
      fieldView.triggerPop(field.id);
      fieldEffects.spawnPlant(field);
      return true;
    }
  });

  session.subscribe((_, state) => {
    fieldView.sync(state.objects, Date.now());
    fieldTool.refresh();
  });

  app.renderer.on('resize', (w: number, h: number) => camera.resize(w, h));
  attachCameraInput(app.canvas, camera, {
    toggleGrid: () => { grid.setShown(!grid.shown); root.dataset['raster'] = grid.shown ? '1' : '0'; },
    onPanStart: () => fieldTool.close(),
    onTap: (sx: number, sy: number) => {
      const w = camera.screenToWorld(sx, sy);
      const f = fieldAtWorld(session.state.objects, w.x, w.y);
      if (f) fieldTool.open(f); else fieldTool.close();
    }
  });
  root.dataset['raster'] = grid.shown ? '1' : '0';

  const trace: { t: number; cx: number; cy: number; z: number }[] | null = import.meta.env.DEV ? [] : null;
  if (trace) (window as unknown as { __kameraSpur: typeof trace }).__kameraSpur = trace;
  if (import.meta.env.DEV) {
    (window as unknown as { __wege: (l: [number, number, string][]) => void }).__wege = (list) => {
      const extra: MapObject[] = list.map(([gx, gy, type], i) => ({ id: `weg_${i}`, kind: 'deco', type, gx, gy }));
      const nextPaths = pathsFor(extra);
      ground.setPaths(nextPaths);
      groundDeco.update([...session.state.objects, ...extra], nextPaths);
    };
  }

  let paused = false;
  window.setInterval(() => { if (!paused) session.tick(); }, 1000);
  window.addEventListener('pagehide', () => session.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') session.flush(); });

  app.ticker.add((t) => {
    const dt = t.deltaMS / 1000;
    const now = Date.now();
    camera.update(dt);
    grid.update(dt);
    fieldView.sync(session.state.objects, now);
    fieldView.update(dt);
    fieldEffects.update(dt);
    fieldTool.tick(now);
    applyCamera(world.root, camera, app.renderer.resolution, app.screen.width, app.screen.height);
    coverView();
    if (root.dataset['kamera'] !== camera.state) root.dataset['kamera'] = camera.state;
    if (trace) { const v = camera.view; trace.push({ t: performance.now(), cx: v.cx, cy: v.cy, z: v.zoom }); if (trace.length > 20000) trace.splice(0, 10000); }
  });
  applyCamera(world.root, camera, app.renderer.resolution, app.screen.width, app.screen.height);
  coverView();

  watchOrientation((portrait) => {
    paused = portrait;
    if (portrait) app.ticker.stop(); else app.ticker.start();
    root.dataset['pausiert'] = portrait ? '1' : '0';
  });
  watchFirstSeconds(app, q);

  app.render();

  root.dataset['ebenen'] = layerOrder(world).join(',');
  root.dataset['aufloesung'] = String(q);
  root.dataset['inhalte'] = String(Object.keys(CONTENT.items).length);
  root.dataset['startms'] = String(Math.round(performance.now() - t0));
  loading.progress(1);
  await loading.close();
  fieldView.enableAmbient();
  root.dataset['bereit'] = '1';
}

start().catch((e: unknown) => {
  console.error('Winterhof konnte nicht starten', e);
  const tip = document.getElementById('laden-tipp');
  if (tip) tip.textContent = 'Das Spiel konnte nicht starten. Bitte lade die Seite neu.';
  document.getElementById('laden')?.classList.add('bereit');   // Meldung sichtbar machen, auch wenn das Motiv fehlt
});
