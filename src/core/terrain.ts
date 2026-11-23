// ============================================================================
// Winterhof Core – Gelände (Baustein 2: Karte als Daten)
// Einzige Quelle: winterhof.json → map (Ebenen terrain/surface) + landZones.
// Statisch: wird einmal gelesen, nie pro Frame neu berechnet. Kein DOM, keine Grafik.
// ============================================================================
import { CONTENT, type ContentPack } from './content';

export type TerrainKind = 'snow' | 'forest';
export type SurfaceKind = 'none' | 'road' | 'plaza';
export const ZONE_STARTER = 'starter';
export const ZONE_BORDER = 'border';

export interface Tile {
  readonly gx: number;
  readonly gy: number;
  readonly terrain: TerrainKind;
  readonly surface: SurfaceKind;
  /** Grundstück: 'starter', eine landZones-ID oder 'border' (außerhalb des Hofs) */
  readonly zone: string;
}

export interface TerrainMap {
  readonly minGx: number;
  readonly minGy: number;
  readonly maxGx: number;
  readonly maxGy: number;
  tileAt(gx: number, gy: number): Tile | null;
  /** Alle Kacheln, Reihe für Reihe (gy, dann gx). */
  readonly tiles: readonly Tile[];
}

const TERRAIN_KINDS: readonly string[] = ['snow', 'forest'];
const SURFACE_KINDS: readonly string[] = ['none', 'road', 'plaza'];

interface Rect { x0: number; y0: number; x1: number; y1: number }
const inRect = (r: Rect, gx: number, gy: number) => gx >= r.x0 && gx <= r.x1 && gy >= r.y0 && gy <= r.y1;

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
  if (errs.length) return errs;

  const minGx = m.origin.gx, minGy = m.origin.gy;
  const maxGx = minGx + width - 1, maxGy = minGy + height - 1;
  const zones: { id: string; r: Rect }[] = [{ id: ZONE_STARTER, r: m.starterBounds }, ...c.landZones.map((z) => ({ id: z.id, r: z.bounds }))];
  for (let i = 0; i < zones.length; i++) {
    const a = zones[i]!;
    if (a.r.x0 > a.r.x1 || a.r.y0 > a.r.y1) errs.push(`Zone ${a.id}: Rechteck verdreht`);
    if (a.r.x0 < minGx || a.r.y0 < minGy || a.r.x1 > maxGx || a.r.y1 > maxGy) errs.push(`Zone ${a.id}: liegt außerhalb der Karte`);
    for (let j = i + 1; j < zones.length; j++) {
      const b = zones[j]!;
      if (a.r.x0 <= b.r.x1 && b.r.x0 <= a.r.x1 && a.r.y0 <= b.r.y1 && b.r.y0 <= a.r.y1) errs.push(`Zonen ${a.id} und ${b.id} überlappen`);
    }
    for (let gy = a.r.y0; gy <= a.r.y1; gy++) {
      for (let gx = a.r.x0; gx <= a.r.x1; gx++) {
        const ch = m.terrain[gy - minGy]?.[gx - minGx];
        if (ch !== undefined && m.legend.terrain[ch] !== 'snow') { errs.push(`Zone ${a.id}: Wald auf ${gx},${gy}`); gy = a.r.y1; break; }
      }
    }
  }
  return errs;
}

/** Baut die Karte aus den Inhalten. Wirft bei ungültigen Daten (Fehler gehören in die Daten, nicht in den Code). */
export function buildTerrainMap(c: ContentPack = CONTENT): TerrainMap {
  const errs = validateMap(c);
  if (errs.length) throw new Error(`Karte ungültig: ${errs.join('; ')}`);
  const m = c.map;
  const width = m.terrain[0]!.length, height = m.terrain.length;
  const minGx = m.origin.gx, minGy = m.origin.gy;
  const zoneRects: { id: string; r: Rect }[] = [{ id: ZONE_STARTER, r: m.starterBounds }, ...c.landZones.map((z) => ({ id: z.id, r: z.bounds }))];
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = minGx + x, gy = minGy + y;
      tiles.push({
        gx, gy,
        terrain: m.legend.terrain[m.terrain[y]![x]!] as TerrainKind,
        surface: m.legend.surface[m.surface[y]![x]!] as SurfaceKind,
        zone: zoneRects.find((z) => inRect(z.r, gx, gy))?.id ?? ZONE_BORDER
      });
    }
  }
  return {
    minGx, minGy, maxGx: minGx + width - 1, maxGy: minGy + height - 1, tiles,
    tileAt(gx, gy) {
      if (!Number.isInteger(gx) || !Number.isInteger(gy)) return null;
      const x = gx - minGx, y = gy - minGy;
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return tiles[y * width + x] ?? null;
    }
  };
}

let cached: TerrainMap | null = null;
/** Die Karte des Spiels (einmal gebaut, danach aus dem Speicher). */
export function terrainMap(): TerrainMap {
  if (!cached) cached = buildTerrainMap();
  return cached;
}
