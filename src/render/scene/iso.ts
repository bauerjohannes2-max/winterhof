// ============================================================================
// Raster ↔ Welt (Baustein 4, docs/GRAFIK_TECHNIK.md §2)
// Isometrisch 2:1, eine Kachel = 128 × 64 Weltpunkte. Die EINZIGE Umrechnung im ganzen Code.
// Kachel (gx, gy) liegt mit ihrer oberen Ecke bei gridToWorld(gx, gy), ihre Mitte bei gridToWorld(gx + 0,5, gy + 0,5).
// ============================================================================

export const TILE_W = 128;
export const TILE_H = 64;
const HW = TILE_W / 2;
const HH = TILE_H / 2;

export interface Point { readonly x: number; readonly y: number }

/** Rasterpunkt (auch Bruchteile) → Weltpunkt. */
export function gridToWorld(gx: number, gy: number): Point {
  return { x: (gx - gy) * HW, y: (gx + gy) * HH };
}

/** Weltpunkt → Rasterpunkt (Bruchteile, exakte Umkehrung von gridToWorld). */
export function worldToGrid(x: number, y: number): { gx: number; gy: number } {
  return { gx: (y / HH + x / HW) / 2, gy: (y / HH - x / HW) / 2 };
}

/** Kachel unter einem Weltpunkt (ganze Zahlen). */
export function tileAtWorld(x: number, y: number): { gx: number; gy: number } {
  const g = worldToGrid(x, y);
  return { gx: Math.floor(g.gx), gy: Math.floor(g.gy) };
}

export interface Rect { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

/** Umschließendes Rechteck (Welt) einer Rasterfläche gx0…gx1, gy0…gy1 (Kacheln einschließlich). */
export function gridAreaBounds(gx0: number, gy0: number, gx1: number, gy1: number): Rect {
  const top = gridToWorld(gx0, gy0), right = gridToWorld(gx1 + 1, gy0);
  const bottom = gridToWorld(gx1 + 1, gy1 + 1), left = gridToWorld(gx0, gy1 + 1);
  return { x0: left.x, y0: top.y, x1: right.x, y1: bottom.y };
}
