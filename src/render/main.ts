// ============================================================================
// Winterhof – neue Darstellung (Neustart, docs/NEUSTART_PLAN.md), Einstieg
// Baustein 3: Technik-Gerüst – Pixi starten, Bilder über das Manifest laden, Ebenen anlegen,
// Ladebild, Hochkant-Pause, Bildschärfe automatisch. Regeln: docs/GRAFIK_TECHNIK.md.
// Liest den Kern nur über ../core, ändert den Spielstand nur über Befehle.
// ============================================================================
import { Application, Assets, type Container, type Texture } from 'pixi.js';
import { buildPathField, CONTENT, createNewGame, meadow, pathTiles, terrainMap, type MapObject } from '../core';
import { Camera, maxZoomForWidth } from './camera/camera';
import { attachCameraInput } from './camera/input';
import { cameraConfig, startView } from './camera/mapView';
import { GridOverlay } from './scene/grid';
import { Ground } from './scene/ground';

import { loadStartAssets } from './boot/assets';
import { chooseQuality, renderResolution, SLOW_FPS, type Quality } from './boot/quality';
import { createWorld, layerOrder } from './scene/layers';
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

/** Größte Textur der Grafikkarte, bevor Pixi startet (kurzer Probe-Kontext, danach freigegeben). */
function maxTextureSize(): number {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return 0;
  const size = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return size;
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
  const q = chooseQuality({
    dpr, cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory, maxTextureSize: maxTextureSize(), slowBefore: readFlag(SLOW_KEY),
    maxZoom: maxZoomForWidth(Math.max(root.clientWidth, root.clientHeight))
  });

  const app = new Application();
  await app.init({
    resizeTo: root,
    background: SNOW,
    antialias: false,
    autoDensity: true,
    resolution: renderResolution(q, dpr),
    preference: 'webgl',
    powerPreference: 'high-performance'
  });
  root.appendChild(app.canvas);
  loading.progress(0.45);

  await loadStartAssets(q, (p) => loading.progress(0.45 + p * 0.55));

  const world = createWorld();
  app.stage.addChild(world.root);

  // Kamera (Baustein 4): Start immer am Hofplatz, Hilfsraster bis Baustein 12 zum Prüfen sichtbar
  const map = terrainMap();
  // Schärfe-Grenze: nie weiter rein, als die geladenen Bilder scharf hergeben (Bildstufe q / Zeichenauflösung)
  const camera = new Camera({ ...cameraConfig(map), maxSharpZoom: q / app.renderer.resolution });
  camera.resize(app.screen.width, app.screen.height);
  const sv = startView(map, app.screen.width, app.screen.height);
  camera.setView(sv.cx, sv.cy, sv.zoom);
  // Grundboden (Baustein 5): ganzes Tal Wiese, außen Schnee (Entscheidung 40)
  const params = new URLSearchParams(location.search);
  // Wege (Baustein 6): Zufahrt + Hofplatz + Wegplatten als eine Fläche im Grundboden (Entscheidungen 53/54).
  // Bis die Spielwelt an den Spielstand angebunden ist (Objekte, Baustein 8), zeigt sie den Start-Hof.
  const pathBox = { gx0: map.minGx, gy0: map.minGy, w: map.maxGx - map.minGx + 1, h: map.maxGy - map.minGy + 1 };
  const pathsFor = (objects: readonly MapObject[]) => buildPathField(pathTiles(objects), CONTENT.paths.surfaces, pathBox);
  const ground = new Ground(meadow(), Assets.get<Texture>('wiese'), Assets.get<Texture>('bueschel'), pathsFor(createNewGame(Date.now()).objects));
  world.layer.grund.addChild(ground.view);
  const coverView = (): void => {
    const a = camera.screenToWorld(0, 0), e = camera.screenToWorld(app.screen.width, app.screen.height);
    ground.cover({ x0: a.x, y0: a.y, x1: e.x, y1: e.y });
  };
  const grid = new GridOverlay(map, params.get('raster') !== '0');
  world.layer.auswahl.addChild(grid.view);
  app.renderer.on('resize', (w: number, h: number) => camera.resize(w, h));
  attachCameraInput(app.canvas, camera, {
    toggleGrid: () => { grid.setShown(!grid.shown); root.dataset['raster'] = grid.shown ? '1' : '0'; }
  });
  root.dataset['raster'] = grid.shown ? '1' : '0';
  // Nur im Entwicklungsmodus: Kamera je Bild mitschreiben, damit Abläufe Bild für Bild geprüft werden können (QUALITAETS_LEITFADEN §3)
  const trace: { t: number; cx: number; cy: number; z: number }[] | null = import.meta.env.DEV ? [] : null;
  if (trace) (window as unknown as { __kameraSpur: typeof trace }).__kameraSpur = trace;
  // Nur im Entwicklungsmodus: Wegplatten für Prüfbilder und Browser-Tests setzen ([gx, gy, Deko-Typ])
  if (import.meta.env.DEV) {
    (window as unknown as { __wege: (l: [number, number, string][]) => void }).__wege = (list) => {
      ground.setPaths(pathsFor(list.map(([gx, gy, type], i): MapObject => ({ id: `weg_${i}`, kind: 'deco', type, gx, gy }))));
    };
  }
  app.ticker.add((t) => {
    const dt = t.deltaMS / 1000;
    camera.update(dt);
    grid.update(dt);
    applyCamera(world.root, camera, app.renderer.resolution, app.screen.width, app.screen.height);
    coverView();
    if (root.dataset['kamera'] !== camera.state) root.dataset['kamera'] = camera.state;
    if (trace) { const v = camera.view; trace.push({ t: performance.now(), cx: v.cx, cy: v.cy, z: v.zoom }); if (trace.length > 20000) trace.splice(0, 10000); }
  });
  applyCamera(world.root, camera, app.renderer.resolution, app.screen.width, app.screen.height);
  coverView();

  watchOrientation((portrait) => {
    if (portrait) app.ticker.stop(); else app.ticker.start();
    root.dataset['pausiert'] = portrait ? '1' : '0';
  });
  watchFirstSeconds(app, q);

  root.dataset['ebenen'] = layerOrder(world).join(',');
  root.dataset['aufloesung'] = String(q);
  root.dataset['inhalte'] = String(Object.keys(CONTENT.items).length);
  root.dataset['startms'] = String(Math.round(performance.now() - t0));
  loading.progress(1);
  await loading.close();
  root.dataset['bereit'] = '1';
}

start().catch((e: unknown) => {
  console.error('Winterhof konnte nicht starten', e);
  const tip = document.getElementById('laden-tipp');
  if (tip) tip.textContent = 'Das Spiel konnte nicht starten. Bitte lade die Seite neu.';
  document.getElementById('laden')?.classList.add('bereit');   // Meldung sichtbar machen, auch wenn das Motiv fehlt
});
