// ============================================================================
// Winterhof Core – Migration auf Spielstand v9 (Baustein 2b: Alpental, Landstücke, Hindernisse)
// Regel: Nichts geht verloren. Eigenes Land wird nie kleiner, kein Objekt verschwindet.
// docs/KARTEN_KONZEPT.md → „Migration“.
// ============================================================================
import { CONTENT, footprintOf } from './content';
import { buildOccupancy, canPlace } from './map';
import { SCHEMA_VERSION, mapObstacles } from './state';
import { plotIdAt, terrainMap, type Plot } from './terrain';
import type { GameState, Inventory, MapObject } from './types';

interface Rect { x0: number; y0: number; x1: number; y1: number }

/** Grundstücke bis Spielstand v8 (eingefroren, nur für die Migration). */
export const ZONES_V8: Readonly<Record<string, Rect>> = {
  starter: { x0: 2, y0: 2, x1: 11, y1: 11 },
  west_forest: { x0: 0, y0: 2, x1: 1, y1: 11 },
  south_meadow: { x0: 0, y0: 12, x1: 13, y1: 13 },
  east_glade: { x0: 12, y0: 2, x1: 13, y1: 11 },
  north_ridge: { x0: 0, y0: 0, x1: 13, y1: 1 },
  bachwiese: { x0: 14, y0: 0, x1: 16, y1: 13 },
  tannenruecken: { x0: 0, y0: -4, x1: 7, y1: -1 },
  nordlichtwiese: { x0: 8, y0: -4, x1: 16, y1: -1 },
  glockenhang: { x0: -4, y0: 0, x1: -1, y1: 6 },
  schlittenhang: { x0: -4, y0: 7, x1: -1, y1: 13 },
  plaetzchenwiese: { x0: 0, y0: 14, x1: 7, y1: 17 },
  sternenfeld: { x0: 8, y0: 14, x1: 16, y1: 17 },
  wichtelhain: { x0: 17, y0: 0, x1: 20, y1: 6 },
  rentierweide: { x0: 17, y0: 7, x1: 20, y1: 13 },
  eiszapfenecke: { x0: -4, y0: -4, x1: -1, y1: -1 },
  mistelwinkel: { x0: 17, y0: -4, x1: 20, y1: -1 },
  kerzenwinkel: { x0: -4, y0: 14, x1: -1, y1: 17 },
  zimtsternecke: { x0: 17, y0: 14, x1: 20, y1: 17 }
};

/** Land-Material bis v8 → ab v9 (Entscheidung 15). */
export const ITEM_RENAMES_V9: Readonly<Record<string, string>> = { snow_shovel: 'mallet', survey_map: 'land_deed' };

export function renameItemsV9(inv: Inventory): Inventory {
  const out: Inventory = {};
  for (const [id, q] of Object.entries(inv)) {
    const nid = ITEM_RENAMES_V9[id] ?? id;
    out[nid] = (out[nid] ?? 0) + q;
  }
  return out;
}

/** Landstücke, die ein altes Grundstück berührt (das Land wird dadurch nie kleiner). */
export function plotsForOldZones(oldZones: readonly string[]): string[] {
  const out = new Set<string>(CONTENT.map.plots.start);
  for (const z of ['starter', ...oldZones]) {
    const r = ZONES_V8[z];
    if (!r) continue;
    for (let gy = r.y0; gy <= r.y1; gy++) for (let gx = r.x0; gx <= r.x1; gx++) {
      const id = plotIdAt(gx, gy);
      if (id) out.add(id);
    }
  }
  return [...out];
}

const dist = (a: { gx: number; gy: number }, gx: number, gy: number) => Math.abs(a.gx - gx) + Math.abs(a.gy - gy);

/** Nächstes freies Feld auf eigenem Land (deterministisch: Abstand, dann gy, dann gx). */
function nearestFree(o: MapObject, objects: MapObject[], ownedPlots: string[]): { gx: number; gy: number } | null {
  const fp = footprintOf(o);
  const occ = buildOccupancy(objects);
  const view = { objects, ownedPlots };
  let best: { gx: number; gy: number; d: number } | null = null;
  for (const id of ownedPlots) {
    const p = terrainMap().plotById(id);
    if (!p) continue;
    for (let gy = p.y0; gy <= p.y1; gy++) {
      for (let gx = p.x0; gx <= p.x1; gx++) {
        const d = dist(o, gx, gy);
        if (best && (d > best.d || (d === best.d && (gy > best.gy || (gy === best.gy && gx > best.gx))))) continue;
        if (canPlace(view, gx, gy, fp.w, fp.h, null, occ).ok) best = { gx, gy, d };
      }
    }
  }
  return best ? { gx: best.gx, gy: best.gy } : null;
}

/** Nächstes kaufbares (angrenzendes) Landstück zu einem Punkt – wird bei Platznot geschenkt. */
function nearestAdjacentPlot(o: { gx: number; gy: number }, ownedPlots: string[]): Plot | null {
  const owned = new Set(ownedPlots);
  let best: { p: Plot; d: number } | null = null;
  for (const p of terrainMap().plots) {
    if (owned.has(p.id) || !terrainMap().neighbors(p.id).some((n) => owned.has(n.id))) continue;
    const d = dist(o, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2);
    if (!best || d < best.d) best = { p, d };
  }
  return best?.p ?? null;
}

/**
 * Bringt einen Stand (Objekte noch auf alten Koordinaten, ohne Hindernisse) auf v9.
 * `oldZones`: Grundstück-IDs bis v8. Schreibt Hinweise in `warnings`.
 */
export function upgradeToV9(s: GameState, oldZones: readonly string[], nowMs: number, warnings: string[]): GameState {
  s.inventory = renameItemsV9(s.inventory);
  const owned = plotsForOldZones(oldZones);

  // Feste Stationen an den Hofplatz (fehlende, z. B. der neue Hofladen, kommen dazu)
  const fixedObjs: MapObject[] = [];
  const rest: MapObject[] = [];
  for (const o of s.objects) {
    if (o.kind === 'obstacle') continue;
    if (o.kind === 'prop' && CONTENT.map.fixed.includes(o.type) && !fixedObjs.some((f) => f.type === o.type)) fixedObjs.push(o);
    else rest.push(o);
  }
  for (const type of CONTENT.map.fixed) {
    const home = CONTENT.start.objects.find((x) => x.kind === 'prop' && x.type === type)!;
    const have = fixedObjs.find((f) => f.type === type);
    if (have) { have.gx = home.gx; have.gy = home.gy; }
    else fixedObjs.push({ id: home.id, kind: 'prop', type, gx: home.gx, gy: home.gy });
  }

  // Alles, was am alten Platz gültig steht, bleibt; der Rest zieht auf das nächste freie eigene Feld
  const placed: MapObject[] = [...fixedObjs];
  const pending: MapObject[] = [];
  for (const o of rest) {
    const fp = footprintOf(o);
    if (canPlace({ objects: placed, ownedPlots: owned }, o.gx, o.gy, fp.w, fp.h).ok) placed.push(o);
    else pending.push(o);
  }
  for (const o of pending) {
    let spot = nearestFree(o, placed, owned);
    while (!spot) {
      const gift = nearestAdjacentPlot(o, owned);
      if (!gift) break;
      owned.push(gift.id);
      warnings.push(`Landstück ${gift.id} geschenkt (Platz für ${o.id})`);
      spot = nearestFree(o, placed, owned);
    }
    if (spot) {
      warnings.push(`${o.id} von ${o.gx},${o.gy} nach ${spot.gx},${spot.gy} verschoben`);
      o.gx = spot.gx;
      o.gy = spot.gy;
      placed.push(o);
    } else if (o.kind === 'deco') {
      s.storedDecos[o.type] = (s.storedDecos[o.type] ?? 0) + 1;
      warnings.push(`Deko ${o.id} ins Lager gelegt (kein Platz)`);
    } else {
      placed.push(o); // praktisch unmöglich (ganzes Tal voll); lieber falsch stehen als verlieren
      warnings.push(`${o.id} findet keinen Platz`);
    }
  }

  // Hindernisse nur auf Land, das der Spieler noch nicht besitzt
  const ownedSet = new Set(owned);
  const obstacles = mapObstacles().filter((o) => !ownedSet.has(plotIdAt(o.gx, o.gy) ?? ''));

  // Startpaket-Werkzeuge auch für bestehende Höfe
  for (const [id, q] of Object.entries(CONTENT.start.inventory)) {
    if (CONTENT.items[id]?.category === 'tool') s.inventory[id] = (s.inventory[id] ?? 0) + q;
  }

  s.objects = [...placed, ...obstacles];
  s.ownedPlots = owned;
  s.nextDriftAt = nowMs + CONTENT.drifts.everySeconds * 1000;
  delete (s as Partial<GameState> & { unlockedZones?: unknown }).unlockedZones;
  s.schemaVersion = SCHEMA_VERSION;
  return s;
}
