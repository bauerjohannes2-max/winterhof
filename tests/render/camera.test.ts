// Baustein 4: Raster ↔ Welt und Kamera (Wischen, Nachlauf, Gummirand, Zwei-Finger-Zoom, Mausrad, Start-Ansicht).
import { terrainMap } from '../../src/core';
import { describe, expect, test } from 'vitest';
import { Camera, MAX_ZOOM_TILES, rubber, TOUCH_SLOP, unrubber } from '../../src/render/camera/camera';
import { cameraConfig, plazaCenter, startLand, startView } from '../../src/render/camera/mapView';
import { gridAreaBounds, gridToWorld, TILE_W, tileAtWorld, worldToGrid } from '../../src/render/scene/iso';

const map = terrainMap();
const cfg = cameraConfig(map);
const HANDY = { w: 844, h: 390 };
const close = (a: number, b: number, eps = 1e-6): void => expect(Math.abs(a - b)).toBeLessThan(eps);

function cam(vw = HANDY.w, vh = HANDY.h): Camera {
  const c = new Camera(cfg);
  c.resize(vw, vh);
  const s = startView(map, vw, vh);
  c.setView(s.cx, s.cy, s.zoom);
  return c;
}
/** Bilder mit fester Rate laufen lassen; gibt die Zahl der Bilder bis zum Stillstand zurück */
function run(c: Camera, seconds: number, fps = 60): number {
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) { c.update(1 / fps); if (c.idle) return i + 1; }
  return n;
}
/** Ziehen mit einem Finger in Schritten (60 Bewegungen/s) */
function drag(c: Camera, from: { x: number; y: number }, by: { x: number; y: number }, ms: number, t0 = 0, id = 1): number {
  c.pointerDown(id, from.x, from.y, t0);
  const steps = Math.max(1, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    c.pointerMove(id, from.x + (by.x * i) / steps, from.y + (by.y * i) / steps, t0 + (i * ms) / steps / 1000);
  }
  return t0 + ms / 1000;
}

describe('Raster ↔ Welt (iso.ts)', () => {
  test('Kachel 128 × 64, Umrechnung wie GRAFIK_TECHNIK §2', () => {
    expect(gridToWorld(0, 0)).toEqual({ x: 0, y: 0 });
    expect(gridToWorld(1, 0)).toEqual({ x: 64, y: 32 });
    expect(gridToWorld(0, 1)).toEqual({ x: -64, y: 32 });
    expect(gridToWorld(3, 5)).toEqual({ x: -128, y: 256 });
  });
  test('Hin und zurück ist exakt, auch mit Bruchteilen', () => {
    for (const [gx, gy] of [[0, 0], [7.25, -3.5], [-13, 16], [32, 21], [0.125, 0.875]] as const) {
      const w = gridToWorld(gx, gy), g = worldToGrid(w.x, w.y);
      close(g.gx, gx); close(g.gy, gy);
    }
  });
  test('Kachel unter einem Punkt: Mitte und knapp innerhalb der Ecken', () => {
    const m = gridToWorld(4.5, -2.5);
    expect(tileAtWorld(m.x, m.y)).toEqual({ gx: 4, gy: -3 });
    const top = gridToWorld(4, -3);
    expect(tileAtWorld(top.x, top.y + 1)).toEqual({ gx: 4, gy: -3 });
    expect(tileAtWorld(top.x, top.y - 1)).toEqual({ gx: 3, gy: -4 });
  });
  test('Umrahmung des Tals 30 × 30', () => {
    expect(gridAreaBounds(-13, -13, 16, 16)).toEqual({ x0: -1920, y0: -832, x1: 1920, y1: 1088 });
  });
});

describe('Kamera: Grenzen und Start (Entscheidung 22)', () => {
  test('Gummirand-Formel: wächst, bleibt unter der Ausdehnung, Umkehrung stimmt', () => {
    expect(rubber(0, 400)).toBe(0);
    expect(rubber(100, 400)).toBeLessThan(100);
    expect(rubber(100000, 400)).toBeLessThan(400);
    close(unrubber(rubber(250, 400), 400), 250, 1e-6);
  });
  for (const [name, vw, vh] of [['Handy quer', 844, 390], ['Desktop', 1280, 720], ['Tablet quer', 1180, 820]] as const) {
    test(`${name}: ganz raus = ganzes Tal, ganz rein = ${MAX_ZOOM_TILES} Kacheln breit`, () => {
      const c = cam(vw, vh);
      const { min, max } = c.zoomLimits();
      const f = cfg.fit;
      expect((f.x1 - f.x0) * min).toBeLessThanOrEqual(vw + 1e-6);
      expect((f.y1 - f.y0) * min).toBeLessThanOrEqual(vh + 1e-6);
      close(vw / max, MAX_ZOOM_TILES * TILE_W, 1e-6);
      // Ganz raus: Tal passt ganz drauf. Je Achse: passt der Bildschirm in Tal + Kulissenstreifen, bleibt er drin;
      // ist er größer (Tablet hat ein höheres Format als das Tal), steht er mittig darüber (Kulisse füllt das in Baustein 5)
      c.setView(-99999, -99999, 0.001);
      const tl = c.screenToWorld(0, 0), br = c.screenToWorld(vw, vh), b = cfg.bounds;
      for (const [lo, hi, b0, b1] of [[tl.x, br.x, b.x0, b.x1], [tl.y, br.y, b.y0, b.y1]] as const) {
        if (hi - lo <= b1 - b0) { expect(lo).toBeGreaterThanOrEqual(b0 - 1e-6); expect(hi).toBeLessThanOrEqual(b1 + 1e-6); }
        else close((lo + hi) / 2, (b0 + b1) / 2, 1e-6);
      }
      // In die Mitte des Tals geschoben, ist das ganze Tal zu sehen
      c.setView((cfg.fit.x0 + cfg.fit.x1) / 2, (cfg.fit.y0 + cfg.fit.y1) / 2, 0.001);
      const a = c.screenToWorld(0, 0), e = c.screenToWorld(vw, vh);
      expect(a.x).toBeLessThanOrEqual(cfg.fit.x0 + 1e-6); expect(e.x).toBeGreaterThanOrEqual(cfg.fit.x1 - 1e-6);
      expect(a.y).toBeLessThanOrEqual(cfg.fit.y0 + 1e-6); expect(e.y).toBeGreaterThanOrEqual(cfg.fit.y1 - 1e-6);
    });
    test(`${name}: Start zeigt den Start-Hof mittig und ganz, Hofplatz sichtbar`, () => {
      const c = cam(vw, vh);
      const land = startLand(map), r = c.centerRange(c.view.zoom);
      close(c.view.cx, Math.min(r.maxX, Math.max(r.minX, (land.x0 + land.x1) / 2)), 1e-6);
      close(c.view.cy, Math.min(r.maxY, Math.max(r.minY, (land.y0 + land.y1) / 2)), 1e-6);
      const p = plazaCenter(map), s = c.worldToScreen(p.x, p.y);
      expect(s.x).toBeGreaterThan(0); expect(s.x).toBeLessThan(vw);
      expect(s.y).toBeGreaterThan(vh / 2); expect(s.y).toBeLessThan(vh);   // vorn im Bild
      for (const plot of map.plots.filter((q) => q.isStart)) {
        for (const [gx, gy] of [[plot.x0, plot.y0], [plot.x1 + 1, plot.y0], [plot.x1 + 1, plot.y1 + 1], [plot.x0, plot.y1 + 1]] as const) {
          const w = gridToWorld(gx, gy), q = c.worldToScreen(w.x, w.y);
          expect(q.x).toBeGreaterThanOrEqual(0); expect(q.x).toBeLessThanOrEqual(vw);
          expect(q.y).toBeGreaterThanOrEqual(0); expect(q.y).toBeLessThanOrEqual(vh);
        }
      }
      const { min, max } = c.zoomLimits();
      expect(c.view.zoom).toBeGreaterThan(min);
      expect(c.view.zoom).toBeLessThan(max);
    });
  }
  test('Schärfe-Grenze: schwaches Gerät (@1x, Zeichenauflösung 1,5) zoomt nur bis 1 : 1 je Bildpunkt', () => {
    const c = new Camera({ ...cfg, maxSharpZoom: 1 / 1.5 });
    c.resize(HANDY.w, HANDY.h);
    close(c.zoomLimits().max, 1 / 1.5, 1e-9);
    const big = new Camera({ ...cfg, maxSharpZoom: 0.01 });     // nie unter ganz raus
    big.resize(HANDY.w, HANDY.h);
    expect(big.zoomLimits().max).toBe(big.zoomLimits().min);
  });
  test('Größenänderung (Drehen, Fenster) hält die Kamera in den Grenzen', () => {
    const c = cam();
    c.resize(400, 300);
    const r = c.centerRange(c.view.zoom), { min, max } = c.zoomLimits();
    expect(c.view.zoom).toBeGreaterThanOrEqual(min); expect(c.view.zoom).toBeLessThanOrEqual(max);
    expect(c.view.cx).toBeGreaterThanOrEqual(r.minX); expect(c.view.cx).toBeLessThanOrEqual(r.maxX);
  });
});

describe('Kamera: Wischen, Nachlauf, Gummirand', () => {
  test('Unter der Tipp-Schwelle bewegt sich nichts', () => {
    const c = cam(), before = c.view;
    c.pointerDown(1, 400, 200, 0);
    c.pointerMove(1, 400 + TOUCH_SLOP - 1, 200, 0.05);
    expect(c.view).toEqual(before);
    c.pointerUp(1, 0.1);
    expect(c.idle).toBe(true);
  });
  test('Nach der Schwelle folgt die Welt dem Finger 1 : 1, ohne Sprung', () => {
    const c = cam();
    c.pointerDown(1, 400, 200, 0);
    c.pointerMove(1, 420, 200, 0.016);                       // Schwelle überschritten, noch keine Bewegung
    const w = c.screenToWorld(420, 200);
    c.pointerMove(1, 380, 230, 0.032);
    const s = c.worldToScreen(w.x, w.y);
    close(s.x, 380, 1e-6); close(s.y, 230, 1e-6);
  });
  test('Schnell wischen → gleitet weich aus und kommt zur Ruhe', () => {
    const c = cam(), x0 = c.view.cx;
    const t = drag(c, { x: 600, y: 200 }, { x: -200, y: 0 }, 160);
    const afterDrag = c.view.cx;
    c.pointerUp(1, t + 0.008);
    expect(c.state).toBe('glide');
    const frames = run(c, 5);
    expect(c.idle).toBe(true);
    expect(c.view.cx).toBeGreaterThan(afterDrag);            // weitergeglitten
    expect(afterDrag).toBeGreaterThan(x0);
    expect(frames / 60).toBeGreaterThan(0.4);                // spürbarer Nachlauf …
    expect(frames / 60).toBeLessThan(3);                     // … aber nicht endlos
  });
  test('Auch seltene Fingermeldungen (langsames Handy, alle 65 ms) ergeben Nachlauf', () => {
    const c = cam();
    c.pointerDown(1, 650, 200, 0);
    for (let i = 1; i <= 4; i++) c.pointerMove(1, 650 - i * 60, 200, i * 0.065);
    c.pointerUp(1, 4 * 0.065 + 0.06);
    expect(c.state).toBe('glide');
  });
  test('Finger vor dem Loslassen still gehalten → kein Nachlauf', () => {
    const c = cam();
    const t = drag(c, { x: 600, y: 200 }, { x: -200, y: 0 }, 160);
    c.pointerUp(1, t + 0.2);
    expect(c.idle).toBe(true);
  });
  test('Nachlauf ist unabhängig von der Bildrate (60 und 120 Bilder/s)', () => {
    const a = cam(), b = cam();
    for (const c of [a, b]) { const t = drag(c, { x: 600, y: 200 }, { x: -150, y: -40 }, 120); c.pointerUp(1, t + 0.008); }
    run(a, 5, 60); run(b, 5, 120);
    close(a.view.cx, b.view.cx, 2); close(a.view.cy, b.view.cy, 2);
  });
  test('Über den Rand ziehen: gebremst (Gummi), beim Loslassen federt es genau an die Grenze zurück', () => {
    const c = cam();
    const r = c.centerRange(c.view.zoom);
    // weit nach links ziehen = Kamera nach rechts über die Grenze
    const t = drag(c, { x: 800, y: 200 }, { x: -6000, y: 0 }, 600);
    const over = c.view.cx - r.maxX;
    expect(over).toBeGreaterThan(0);
    expect(over).toBeLessThan(HANDY.w / c.view.zoom);         // nie weiter als eine Bildschirmbreite
    expect(over).toBeLessThan(6000 / c.view.zoom / 3);        // deutlich gebremst
    c.pointerUp(1, t + 0.3);
    run(c, 2);
    expect(c.idle).toBe(true);
    close(c.view.cx, r.maxX, 1e-9);
  });
  test('Mit Schwung gegen den Rand: schwingt kurz über und federt zurück', () => {
    const c = cam();
    const r = c.centerRange(c.view.zoom);
    c.setView(r.maxX - 20, c.view.cy, c.view.zoom);
    const t = drag(c, { x: 600, y: 200 }, { x: -60, y: 0 }, 50);
    c.pointerUp(1, t + 0.008);
    let maxOver = 0;
    for (let i = 0; i < 180 && !c.idle; i++) { c.update(1 / 60); maxOver = Math.max(maxOver, c.view.cx - r.maxX); }
    expect(maxOver).toBeGreaterThan(0);
    expect(c.idle).toBe(true);
    close(c.view.cx, r.maxX, 1e-9);
  });
  test('Aufsetzen während des Nachlaufs hält die Karte sofort an', () => {
    const c = cam();
    const t = drag(c, { x: 600, y: 200 }, { x: -200, y: 0 }, 160);
    c.pointerUp(1, t + 0.008);
    run(c, 0.1);
    const stop = c.view;
    c.pointerDown(2, 300, 200, t + 0.2);
    c.update(1 / 60);
    expect(c.view).toEqual(stop);
  });
});

describe('Kamera: Zwei Finger und Mausrad', () => {
  test('Zwei Finger: Punkt zwischen den Fingern bleibt darunter, Zoom = Abstandsverhältnis', () => {
    const c = cam(), z0 = c.view.zoom;
    c.pointerDown(1, 350, 200, 0); c.pointerDown(2, 450, 200, 0);
    const w = c.screenToWorld(400, 200);
    c.pointerMove(1, 340, 210, 0.016); c.pointerMove(2, 460, 210, 0.032);   // Abstand 100 → 120, Mitte 400/210
    close(c.view.zoom / z0, 1.2, 1e-9);
    const s = c.worldToScreen(w.x, w.y);
    close(s.x, 400, 1e-6); close(s.y, 210, 1e-6);
  });
  test('Zu weit hineingezoomt: Gummi, danach federt es genau auf die Grenze zurück', () => {
    const c = cam(), { max } = c.zoomLimits();
    c.pointerDown(1, 400, 200, 0); c.pointerDown(2, 420, 200, 0);
    c.pointerMove(2, 820, 200, 0.05);                         // Abstand ×21
    expect(c.view.zoom).toBeGreaterThan(max);
    expect(c.view.zoom).toBeLessThan(max * Math.exp(0.3));
    c.pointerUp(1, 0.1); c.pointerUp(2, 0.1);
    run(c, 2);
    expect(c.idle).toBe(true);
    close(c.view.zoom, max, 1e-9);
  });
  test('Ein Finger hebt ab: der andere wischt ohne Sprung weiter', () => {
    const c = cam();
    c.pointerDown(1, 350, 200, 0); c.pointerDown(2, 450, 200, 0);
    c.pointerMove(2, 470, 200, 0.02);
    c.pointerUp(2, 0.03);
    const w = c.screenToWorld(350, 200);
    c.pointerMove(1, 330, 190, 0.05);                         // unter der Schwelle, folgt trotzdem
    const s = c.worldToScreen(w.x, w.y);
    close(s.x, 330, 1e-6); close(s.y, 190, 1e-6);
  });
  test('Mausrad zoomt weich zum Mauszeiger, Punkt unter dem Zeiger bleibt', () => {
    const c = cam(1280, 720), z0 = c.view.zoom;
    const w = c.screenToWorld(700, 300);
    c.wheel(700, 300, -100, false);
    c.update(1 / 60);
    const mid = c.view.zoom;
    run(c, 2);
    expect(c.idle).toBe(true);
    expect(mid).toBeGreaterThan(z0);
    expect(c.view.zoom).toBeGreaterThan(mid);                 // weich, nicht in einem Bild
    const s = c.worldToScreen(w.x, w.y);
    close(s.x, 700, 0.5); close(s.y, 300, 0.5);
  });
  test('Mausrad hält die Zoom-Grenzen hart ein', () => {
    const c = cam(1280, 720), { min, max } = c.zoomLimits();
    for (let i = 0; i < 40; i++) c.wheel(640, 360, -300, false);
    run(c, 3);
    close(c.view.zoom, max, 1e-9);
    for (let i = 0; i < 60; i++) c.wheel(640, 360, 300, false);
    run(c, 3);
    close(c.view.zoom, min, 1e-9);
  });
});
