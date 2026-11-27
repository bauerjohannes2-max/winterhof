// ============================================================================
// Boden-Deko-Ebene (Baustein 7b, Entscheidungen 39, 51, 52)
// Rein darstellungsseitig (nicht im Spielstand): 6 Winter-Weihnachts-Elemente liegen frei in Weltkoordinaten
// (deterministische Poisson-Scheibe, fester Seed), weichen belegten Kacheln und Wegen aus und kehren beim Umbau
// an exakt derselben Stelle zurück. Ebene: bodenzeichnung (unter Schatten und Objekten → 1 gebatchter Draw Call).
// ============================================================================
import { Container, Sprite, Texture } from 'pixi.js';
import {
  CONTENT, footprintOf, sdAt,
  type MapObject, type MeadowShape, type PathField
} from '../../core';
import { gridToWorld, TILE_W } from './iso';

export const DECO_KINDS = [
  'deko_buschel',
  'deko_stein',
  'deko_christrose',
  'deko_stechpalme',
  'deko_zapfen',
  'deko_pilz'
] as const;

export type DecoKind = (typeof DECO_KINDS)[number];

/** Breite je Art als Anteil einer Kachel (Maßstab: Person = 0,8 Kachel, STIL_REGELN §3) */
const SIZE_TILES: Record<DecoKind, number> = {
  deko_buschel: 0.36,
  deko_stein: 0.28,
  deko_christrose: 0.28,
  deko_stechpalme: 0.28,
  deko_zapfen: 0.25,
  deko_pilz: 0.28
};

/** Bodenpunkt aller 6 Platzhalter-Sprites (scripts/deko_platzhalter.mjs) */
const ANCHOR_Y = 0.80;
/** Fester Zufallsstart: auf jedem Gerät und nach jedem Neustart dieselbe Wiese */
export const DECO_SEED = 42;
/** Mindestabstand zwischen Kandidaten in Kacheln (Variante A „wie Hay Day“, Entsch. 51) */
const POISSON_R = 0.85;
/** Mindestabstand zu belegten Objekten / Wegen in Kacheln */
export const DECO_OBJ_CLEARANCE = 0.24;
export const DECO_PATH_CLEARANCE = 0.28;
/** Abstand zum Schneerand: Deko steht nur auf grüner Wiese, nie im Schnee */
const MEADOW_MARGIN = 0.40;

export interface DecoCandidate {
  readonly gx: number;
  readonly gy: number;
  readonly meadowDist: number;
  readonly wolke: number;
  readonly roll: number;
  readonly kindRoll: number;
  readonly scale: number;
  readonly flipX: boolean;
  readonly pairDx: number;
  readonly pairDy: number;
  readonly pairRoll: number;
}

export interface PlacedDeco {
  readonly kind: DecoKind;
  readonly gx: number;
  readonly gy: number;
  readonly scale: number;
  readonly flipX: boolean;
}

/** Schneller, deterministischer PRNG (Mulberry32) ohne Math.random */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wolkeAt(gx: number, gy: number): number {
  return Math.max(0.1, 0.6 + 0.4 * Math.sin(gx * 0.7 + 1.3) * Math.cos(gy * 0.55 - 0.4) + 0.2 * Math.sin((gx + gy) * 0.33));
}

/**
 * Erzeugt einmalig die festen Kandidatenpunkte auf der Wiese (Poisson-Scheibe in Weltkoordinaten).
 * Reine Funktion ohne Grafik – im Test prüfbar.
 */
export function generateDecoCandidates(shape: MeadowShape, seed = DECO_SEED): DecoCandidate[] {
  const rng = mulberry32(seed);
  const pad = 5.5;
  const x0 = shape.lo.gx - pad, x1 = shape.hi.gx + pad;
  const y0 = shape.lo.gy - pad, y1 = shape.hi.gy + pad;
  const cell = POISSON_R / Math.SQRT2;
  const cols = Math.ceil((x1 - x0) / cell) + 1;
  const rows = Math.ceil((y1 - y0) / cell) + 1;
  const grid = new Int32Array(cols * rows).fill(-1);
  const ptsX: number[] = [];
  const ptsY: number[] = [];
  const out: DecoCandidate[] = [];
  const r2 = POISSON_R * POISSON_R;
  const tries = Math.round((x1 - x0) * (y1 - y0) * 14);

  for (let n = 0; n < tries; n++) {
    const gx = x0 + rng() * (x1 - x0);
    const gy = y0 + rng() * (y1 - y0);
    const md = shape.field(gx, gy);
    if (md < MEADOW_MARGIN) continue;
    const ci = Math.floor((gx - x0) / cell);
    const cj = Math.floor((gy - y0) / cell);
    let ok = true;
    for (let j = Math.max(0, cj - 2); j <= Math.min(rows - 1, cj + 2) && ok; j++) {
      const row = j * cols;
      for (let i = Math.max(0, ci - 2); i <= Math.min(cols - 1, ci + 2); i++) {
        const idx = grid[row + i] ?? -1;
        if (idx >= 0) {
          const dx = (ptsX[idx] ?? 0) - gx, dy = (ptsY[idx] ?? 0) - gy;
          if (dx * dx + dy * dy < r2) { ok = false; break; }
        }
      }
    }
    if (!ok) continue;
    const idx = ptsX.length;
    ptsX.push(gx);
    ptsY.push(gy);
    grid[cj * cols + ci] = idx;
    out.push({
      gx, gy,
      meadowDist: md,
      wolke: wolkeAt(gx, gy),
      roll: rng(),
      kindRoll: rng(),
      scale: 0.85 + rng() * 0.30,
      flipX: rng() < 0.5,
      pairDx: (rng() - 0.5) * 0.48,
      pairDy: (rng() - 0.5) * 0.48,
      pairRoll: rng()
    });
  }
  return out;
}

interface ObjRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly group: string;
  readonly type: string;
}

const SIZES = CONTENT.sizes as unknown as Record<string, { group: string; w?: number; h?: number }>;

function isRoadDeco(obj: MapObject): boolean {
  return obj.kind === 'deco' && Boolean(CONTENT.decorations[obj.type]?.surface);
}

function buildRects(objects: readonly MapObject[]): ObjRect[] {
  const rects: ObjRect[] = [];
  for (const obj of objects) {
    if (isRoadDeco(obj)) continue;   // Wegplatten erfasst das geglättete Wegfeld exakt
    const fp = footprintOf(obj);
    const group = obj.kind === 'obstacle' ? 'obstacle' : (SIZES[obj.type]?.group ?? obj.kind);
    rects.push({ x: obj.gx, y: obj.gy, w: fp.w, h: fp.h, group, type: obj.type });
  }
  return rects;
}

function distRectSq(gx: number, gy: number, r: ObjRect): number {
  const dx = gx < r.x ? r.x - gx : gx > r.x + r.w ? gx - (r.x + r.w) : 0;
  const dy = gy < r.y ? r.y - gy : gy > r.y + r.h ? gy - (r.y + r.h) : 0;
  return dx * dx + dy * dy;
}

function isPathFree(paths: PathField, gx: number, gy: number): boolean {
  const b = paths.box;
  if (gx < b.gx0 || gy < b.gy0 || gx >= b.gx0 + b.w || gy >= b.gy0 + b.h) return true;
  return sdAt(paths, gx, gy) <= -DECO_PATH_CLEARANCE;
}

function pickFrom<T>(pool: readonly T[], r: number): T {
  return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))] as T;
}

const POOL_ROCK: readonly DecoKind[] = ['deko_stein', 'deko_buschel', 'deko_stein', 'deko_buschel'];
const POOL_PINE: readonly DecoKind[] = ['deko_zapfen', 'deko_buschel', 'deko_stechpalme', 'deko_pilz'];
const POOL_BUILDING: readonly DecoKind[] = ['deko_buschel', 'deko_stein'];
const POOL_OPEN: readonly DecoKind[] = [
  'deko_buschel', 'deko_buschel', 'deko_buschel', 'deko_buschel',
  'deko_stein', 'deko_stein', 'deko_zapfen', 'deko_christrose', 'deko_stechpalme', 'deko_pilz'
];

/**
 * Filtert die festen Kandidaten gegen aktuelle Objekte und Wege (Variante A „wie Hay Day“, Entsch. 51).
 * Nutzt ein einfaches 4×4-Zellraster für Objekte (statt N×M-Suche) → < 3 ms auch unter Last.
 */
export function placeGroundDeco(
  candidates: readonly DecoCandidate[],
  objects: readonly MapObject[],
  paths: PathField,
  shape: MeadowShape
): PlacedDeco[] {
  const rects = buildRects(objects);
  // Spatial Grid (4-Kachel-Zellen): jedes Objekt in alle Zellen bis 4,5 Kacheln Abstand eintragen
  const CELL = 4;
  const REACH = 4.5;
  const gx0 = Math.floor(shape.lo.gx - 8), gy0 = Math.floor(shape.lo.gy - 8);
  const cols = Math.ceil((shape.hi.gx + 8 - gx0) / CELL) + 1;
  const rows = Math.ceil((shape.hi.gy + 8 - gy0) / CELL) + 1;
  const buckets: ObjRect[][] = Array.from({ length: cols * rows }, () => []);
  for (const r of rects) {
    const cx0 = Math.max(0, Math.floor((r.x - REACH - gx0) / CELL));
    const cx1 = Math.min(cols - 1, Math.floor((r.x + r.w + REACH - gx0) / CELL));
    const cy0 = Math.max(0, Math.floor((r.y - REACH - gy0) / CELL));
    const cy1 = Math.min(rows - 1, Math.floor((r.y + r.h + REACH - gy0) / CELL));
    for (let cy = cy0; cy <= cy1; cy++) {
      const row = cy * cols;
      for (let cx = cx0; cx <= cx1; cx++) buckets[row + cx]?.push(r);
    }
  }
  const nearAt = (gx: number, gy: number): readonly ObjRect[] => {
    const cx = Math.floor((gx - gx0) / CELL), cy = Math.floor((gy - gy0) / CELL);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return [];
    return buckets[cy * cols + cx] ?? [];
  };

  const items: PlacedDeco[] = [];
  const clearSq = DECO_OBJ_CLEARANCE * DECO_OBJ_CLEARANCE;

  for (const c of candidates) {
    if (!isPathFree(paths, c.gx, c.gy)) continue;
    let dAllSq = 9999, dObsSq = 9999, dBldSq = 9999;
    let nearType = '', nearGroup = '';
    for (const r of nearAt(c.gx, c.gy)) {
      const d2 = distRectSq(c.gx, c.gy, r);
      if (d2 < dAllSq) {
        dAllSq = d2;
        nearType = r.type;
        nearGroup = r.group;
        if (dAllSq < clearSq) break;
      }
      if ((r.group === 'obstacle' || r.group === 'landmark') && d2 < dObsSq) dObsSq = d2;
      if ((r.group === 'building' || r.group === 'station' || r.group === 'landmark') && d2 < dBldSq) dBldSq = d2;
    }
    if (dAllSq < clearSq) continue;

    // Variante A: Hofmitte ruhig, dichter an Hindernissen, Gebäudeecken und Wiesenrand
    const p = 0.065 * c.wolke
      + 0.42 * Math.exp(-dObsSq / 2.5)
      + 0.34 * Math.exp(-dBldSq / 0.24)
      + 0.24 * Math.exp(-(c.meadowDist * c.meadowDist) / 5.0);
    if (c.roll >= p) continue;

    let kind: DecoKind;
    if (dAllSq < 2.56 && nearType.startsWith('rock')) kind = pickFrom(POOL_ROCK, c.kindRoll);
    else if (dAllSq < 2.56 && (nearType.startsWith('pine') || nearType === 'christmasTree')) kind = pickFrom(POOL_PINE, c.kindRoll);
    else if (dBldSq < 0.64 || (dAllSq < 0.72 && nearGroup === 'building')) kind = pickFrom(POOL_BUILDING, c.kindRoll);
    else kind = pickFrom(POOL_OPEN, c.kindRoll);

    items.push({ kind, gx: c.gx, gy: c.gy, scale: c.scale, flipX: c.flipX });

    // Kleine 2er-Gruppe bei Grasbüscheln und Steinen (Entsch. 51: Gruppen à 1–3)
    if ((kind === 'deko_buschel' || kind === 'deko_stein') && c.pairRoll < 0.50) {
      const qx = c.gx + c.pairDx, qy = c.gy + c.pairDy;
      if (shape.field(qx, qy) >= MEADOW_MARGIN && isPathFree(paths, qx, qy)) {
        let free = true;
        for (const r of nearAt(qx, qy)) { if (distRectSq(qx, qy, r) < clearSq) { free = false; break; } }
        if (free) items.push({ kind, gx: qx, gy: qy, scale: c.scale * 0.82, flipX: !c.flipX });
      }
    }
  }

  items.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  return items;
}

/** Darstellung der Boden-Deko in Ebene `bodenzeichnung` (1 Atlas = 1 Draw Call). */
export class GroundDecoView {
  readonly view = new Container({ label: 'boden-deko' });
  private readonly candidates: readonly DecoCandidate[];
  private readonly shape: MeadowShape;

  constructor(shape: MeadowShape, objects: readonly MapObject[], paths: PathField, seed = DECO_SEED) {
    this.shape = shape;
    this.candidates = generateDecoCandidates(shape, seed);
    this.update(objects, paths);
  }

  update(objects: readonly MapObject[], paths: PathField): void {
    this.view.removeChildren().forEach((c) => c.destroy());
    const items = placeGroundDeco(this.candidates, objects, paths, this.shape);
    for (const item of items) {
      const tex = Texture.from(item.kind);
      const pos = gridToWorld(item.gx, item.gy);
      const sizePx = SIZE_TILES[item.kind] * TILE_W * item.scale;
      const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: ANCHOR_Y } });
      s.width = sizePx;
      s.height = (tex.orig.height / tex.orig.width) * sizePx;
      if (item.flipX) s.scale.x = -Math.abs(s.scale.x);
      s.position.set(pos.x, pos.y);
      this.view.addChild(s);
    }
  }
}
