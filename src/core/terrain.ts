// ============================================================================
// Winterhof Core – Gelände und Landstücke (Baustein 2 + 2b, docs/KARTEN_KONZEPT.md)
// Einzige Quelle: winterhof.json → map (Ebenen terrain/surface, plots, obstacles).
// Statisch: wird einmal gelesen, nie pro Frame neu berechnet. Kein DOM, keine Grafik.
// ============================================================================
import { CONTENT, footprintOf, type ContentPack } from './content';
import { validateMeadow } from './meadow';

export type TerrainKind = 'snow' | 'forest' | 'mountain' | 'ice';
export type SurfaceKind = 'none' | 'road' | 'plaza';
/** Zone außerhalb des Tals (Kulisse: Berge, Wald, See) */
export const ZONE_BORDER = 'border';

export interface Tile {
  readonly gx: number;
  readonly gy: number;
  readonly terrain: TerrainKind;
  readonly surface: SurfaceKind;
  /** Landstück "Spalte,Reihe" oder 'border' (Kulisse) */
  readonly zone: string;
}

export interface Plot {
  readonly id: string;
  readonly col: number;
  readonly row: number;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Ab dieser Spielerstufe kaufbar */
  readonly minLevel: number;
  readonly isStart: boolean;
}

export interface TerrainMap {
  readonly minGx: number;
  readonly minGy: number;
  readonly maxGx: number;
  readonly maxGy: number;
  tileAt(gx: number, gy: number): Tile | null;
  /** Alle Kacheln, Reihe für Reihe (gy, dann gx). */
  readonly tiles: readonly Tile[];
  readonly plots: readonly Plot[];
  plotById(id: string): Plot | null;
  /** Landstücke, die eine Kante mit diesem teilen (keine Ecken) */
  neighbors(id: string): readonly Plot[];
}

const TERRAIN_KINDS: readonly string[] = ['snow', 'forest', 'mountain', 'ice'];
const SURFACE_KINDS: readonly string[] = ['none', 'road', 'plaza'];

export const plotId = (col: number, row: number) => `${col},${row}`;

/** Landstück-ID an einer Kachel, oder null außerhalb des Tals. */
export function plotIdAt(gx: number, gy: number, c: ContentPack = CONTENT): string | null {
  const p = c.map.plots;
  const col = Math.floor((gx - p.origin.gx) / p.size), row = Math.floor((gy - p.origin.gy) / p.size);
  if (col < 0 || row < 0 || col >= p.cols || row >= p.rows) return null;
  return plotId(col, row);
}

function listPlots(c: ContentPack): Plot[] {
  const p = c.map.plots;
  const out: Plot[] = [];
  for (let row = 0; row < p.rows; row++) {
    for (let col = 0; col < p.cols; col++) {
      const id = plotId(col, row);
      const x0 = p.origin.gx + col * p.size, y0 = p.origin.gy + row * p.size;
      out.push({
        id, col, row, x0, y0, x1: x0 + p.size - 1, y1: y0 + p.size - 1,
        minLevel: p.levels[id] ?? c.land.fromLevel, isStart: p.start.includes(id)
      });
    }
  }
  return out;
}

/** Prüft die Kartendaten. Leere Liste = in Ordnung. */
export function validateMap(c: ContentPack = CONTENT): string[] {
  const errs: string[] = [];
  const m = c.map;
  const height = m.terrain.length;
  const width = m.terrain[0]?.length ?? 0;
  if (height === 0 || width === 0) return ['Karte ist leer'];
  if (m.surface.length !== height) errs.push(`surface hat ${m.surface.length} Reihen, terrain ${height}`);
  for (const [name, layer, legend, kinds] of [
    ['terrain', m.terrain, m.legend.terrain, TERRAIN_KINDS],
    ['surface', m.surface, m.legend.surface, SURFACE_KINDS]
  ] as const) {
    for (const [ch, kind] of Object.entries(legend)) {
      if (ch.length !== 1) errs.push(`Legende ${name}: "${ch}" ist kein einzelnes Zeichen`);
      if (!kinds.includes(kind)) errs.push(`Legende ${name}: "${kind}" unbekannt`);
    }
    layer.forEach((row, i) => {
      if (row.length !== width) errs.push(`${name} Reihe ${i}: Länge ${row.length} statt ${width}`);
      for (const ch of row) if (!(ch in legend)) { errs.push(`${name} Reihe ${i}: Zeichen "${ch}" fehlt in der Legende`); break; }
    });
  }
  errs.push(...validateMeadow(c));
  if (errs.length) return errs;

  const minGx = m.origin.gx, minGy = m.origin.gy;
  const maxGx = minGx + width - 1, maxGy = minGy + height - 1;
  const terrainAt = (gx: number, gy: number) => m.legend.terrain[m.terrain[gy - minGy]?.[gx - minGx] ?? ''];
  const surfaceAt = (gx: number, gy: number) => m.legend.surface[m.surface[gy - minGy]?.[gx - minGx] ?? ''];

  // Landstücke: im Kartenrand, ganz Schnee, Start und Stufen gültig
  const p = m.plots;
  if (!(p.size >= 1 && p.cols >= 1 && p.rows >= 1)) return [...errs, 'plots: Maße ungültig'];
  const tx1 = p.origin.gx + p.cols * p.size - 1, ty1 = p.origin.gy + p.rows * p.size - 1;
  if (p.origin.gx < minGx || p.origin.gy < minGy || tx1 > maxGx || ty1 > maxGy) errs.push('Tal liegt außerhalb der Karte');
  const plots = listPlots(c);
  const ids = new Set(plots.map((x) => x.id));
  if (p.start.length === 0) errs.push('plots.start ist leer');
  for (const id of p.start) if (!ids.has(id)) errs.push(`plots.start: ${id} gibt es nicht`);
  for (const [id, lvl] of Object.entries(p.levels)) {
    if (!ids.has(id)) errs.push(`plots.levels: ${id} gibt es nicht`);
    if (lvl < c.land.fromLevel) errs.push(`plots.levels: ${id} unter land.fromLevel`);
  }
  for (const pl of plots) {
    let bad = false;
    for (let gy = pl.y0; gy <= pl.y1 && !bad; gy++) {
      for (let gx = pl.x0; gx <= pl.x1 && !bad; gx++) {
        const t = terrainAt(gx, gy);
        if (t !== undefined && t !== 'snow') { errs.push(`Landstück ${pl.id}: ${t} auf ${gx},${gy}`); bad = true; }
      }
    }
  }
  // Start-Land hängt zusammen
  const startSet = new Set(p.start);
  const reach = new Set<string>();
  const todo = p.start.slice(0, 1);
  while (todo.length) {
    const id = todo.pop()!;
    if (reach.has(id)) continue;
    reach.add(id);
    const [cs, rs] = id.split(',').map(Number) as [number, number];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = plotId(cs + dc, rs + dr);
      if (startSet.has(n)) todo.push(n);
    }
  }
  if (reach.size !== startSet.size) errs.push('plots.start hängt nicht zusammen');

  // Besondere Orte: Name gesetzt, IDs eindeutig, Schild liegt in der Kulisse (nicht auf Bauland)
  const placeIds = new Set<string>();
  for (const pl of m.places) {
    if (!pl.name.trim()) errs.push(`Ort ${pl.id}: Name fehlt`);
    if (placeIds.has(pl.id)) errs.push(`Ort ${pl.id}: doppelt`);
    placeIds.add(pl.id);
    if (terrainAt(pl.gx, pl.gy) === undefined) errs.push(`Ort ${pl.id}: außerhalb der Karte`);
    else if (plotIdAt(pl.gx, pl.gy, c)) errs.push(`Ort ${pl.id}: liegt auf einem Landstück`);
  }

  // Hindernisse: im Tal, auf freiem Schnee, ganz in einem Landstück, keine Überlappung
  const used = new Map<string, number>();
  m.obstacles.forEach((o, i) => {
    if (!c.obstacles[o.type]) { errs.push(`Hindernis ${i}: Art ${o.type} unbekannt`); return; }
    const fp = footprintOf({ type: o.type }, c);
    const home = plotIdAt(o.gx, o.gy, c);
    for (let dy = 0; dy < fp.h; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const x = o.gx + dx, y = o.gy + dy, k = `${x},${y}`;
        if (!home || plotIdAt(x, y, c) !== home) { errs.push(`Hindernis ${o.type} auf ${o.gx},${o.gy}: nicht in genau einem Landstück`); return; }
        if (terrainAt(x, y) !== 'snow' || surfaceAt(x, y) !== 'none') { errs.push(`Hindernis ${o.type} auf ${o.gx},${o.gy}: kein freier Schnee`); return; }
        const prev = used.get(k);
        if (prev !== undefined) { errs.push(`Hindernisse ${prev} und ${i} überlappen auf ${k}`); return; }
        used.set(k, i);
      }
    }
  });
  return errs;
}

/** Baut die Karte aus den Inhalten. Wirft bei ungültigen Daten (Fehler gehören in die Daten, nicht in den Code). */
export function buildTerrainMap(c: ContentPack = CONTENT): TerrainMap {
  const errs = validateMap(c);
  if (errs.length) throw new Error(`Karte ungültig: ${errs.join('; ')}`);
  const m = c.map;
  const width = m.terrain[0]!.length, height = m.terrain.length;
  const minGx = m.origin.gx, minGy = m.origin.gy;
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = minGx + x, gy = minGy + y;
      tiles.push({
        gx, gy,
        terrain: m.legend.terrain[m.terrain[y]![x]!] as TerrainKind,
        surface: m.legend.surface[m.surface[y]![x]!] as SurfaceKind,
        zone: plotIdAt(gx, gy, c) ?? ZONE_BORDER
      });
    }
  }
  const plots = listPlots(c);
  const byId = new Map(plots.map((p) => [p.id, p]));
  return {
    minGx, minGy, maxGx: minGx + width - 1, maxGy: minGy + height - 1, tiles, plots,
    tileAt(gx, gy) {
      if (!Number.isInteger(gx) || !Number.isInteger(gy)) return null;
      const x = gx - minGx, y = gy - minGy;
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return tiles[y * width + x] ?? null;
    },
    plotById: (id) => byId.get(id) ?? null,
    neighbors(id) {
      const p = byId.get(id);
      if (!p) return [];
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => byId.get(plotId(p.col + dc!, p.row + dr!))).filter((x): x is Plot => !!x);
    }
  };
}

let cached: TerrainMap | null = null;
/** Die Karte des Spiels (einmal gebaut, danach aus dem Speicher). */
export function terrainMap(): TerrainMap {
  if (!cached) cached = buildTerrainMap();
  return cached;
}
