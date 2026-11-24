// ============================================================================
// Hilfsraster (Baustein 4, Entscheidung 22)
// Wie Hay Day/Clash: normal unsichtbar, beim Platzieren/Verschieben weich eingeblendet (ab Baustein 12 rund ums Objekt).
// Bis dahin zum Prüfen: Taste G (PC) bzw. Drei-Finger-Tipp (Handy), siehe camera/input.ts.
// Linien immer 1 Bildpunkt breit (pixelLine), egal wie weit gezoomt.
// ============================================================================
import { Graphics } from 'pixi.js';
import type { TerrainMap } from '../../core';
import { gridToWorld } from './iso';

const FADE_S = 0.2;

export class GridOverlay {
  readonly view = new Graphics({ label: 'hilfsraster' });
  private target = 0;

  constructor(map: TerrainMap, visible: boolean) {
    const g = this.view;
    const line = (ax: number, ay: number, bx: number, by: number): void => {
      const a = gridToWorld(ax, ay), b = gridToWorld(bx, by);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y);
    };
    // Ganze Karte fein (Kulisse), Tal kräftiger, Landstück-Grenzen am kräftigsten
    for (let x = map.minGx; x <= map.maxGx + 1; x++) line(x, map.minGy, x, map.maxGy + 1);
    for (let y = map.minGy; y <= map.maxGy + 1; y++) line(map.minGx, y, map.maxGx + 1, y);
    g.stroke({ color: 0x5a7390, alpha: 0.2, width: 1, pixelLine: true });
    const p0 = map.plots[0], pN = map.plots[map.plots.length - 1];
    if (p0 && pN) {
      for (let x = p0.x0; x <= pN.x1 + 1; x++) line(x, p0.y0, x, pN.y1 + 1);
      for (let y = p0.y0; y <= pN.y1 + 1; y++) line(p0.x0, y, pN.x1 + 1, y);
      g.stroke({ color: 0x3d5a7a, alpha: 0.4, width: 1, pixelLine: true });
      const size = p0.x1 - p0.x0 + 1;
      for (let x = p0.x0; x <= pN.x1 + 1; x += size) line(x, p0.y0, x, pN.y1 + 1);
      for (let y = p0.y0; y <= pN.y1 + 1; y += size) line(p0.x0, y, pN.x1 + 1, y);
      g.stroke({ color: 0x2c4866, alpha: 0.75, width: 1, pixelLine: true });
    }
    this.target = visible ? 1 : 0;
    g.alpha = this.target;
    g.visible = visible;
  }

  get shown(): boolean { return this.target === 1; }

  setShown(on: boolean): void {
    this.target = on ? 1 : 0;
    if (on) this.view.visible = true;
  }

  /** Weiches Ein-/Ausblenden */
  update(dt: number): void {
    const g = this.view;
    if (g.alpha === this.target) return;
    const step = dt / FADE_S;
    g.alpha = this.target > g.alpha ? Math.min(1, g.alpha + step) : Math.max(0, g.alpha - step);
    if (g.alpha === 0) g.visible = false;
  }
}
