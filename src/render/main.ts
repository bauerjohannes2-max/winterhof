// ============================================================================
// Winterhof – neue Darstellung (Neustart, docs/NEUSTART_PLAN.md), Einstieg
// Baustein 3: Technik-Gerüst – Pixi starten, Bilder über das Manifest laden, Ebenen anlegen,
// Ladebild, Hochkant-Pause, Bildschärfe automatisch. Regeln: docs/GRAFIK_TECHNIK.md.
// Liest den Kern nur über ../core, ändert den Spielstand nur über Befehle.
// ============================================================================
import { Application } from 'pixi.js';
import { CONTENT } from '../core';
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

async function start(): Promise<void> {
  const t0 = performance.now();
  const root = document.getElementById('neu-root');
  if (!root) throw new Error('#neu-root fehlt');
  const loading = openLoadingScreen();

  const dpr = window.devicePixelRatio || 1;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const q = chooseQuality({ dpr, cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory, maxTextureSize: maxTextureSize(), slowBefore: readFlag(SLOW_KEY) });

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
  loading.progress(0.1);

  await loadStartAssets(q, (p) => loading.progress(0.1 + p * 0.9));

  const world = createWorld();
  app.stage.addChild(world.root);

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
});
