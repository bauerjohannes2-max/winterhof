// ============================================================================
// Winterhof Core – Migration auf Spielstand v10 (Baustein 5b: Größenkatalog, Landstücke 6×6,
// Felder 2×2, Tiere in Gehegen). Gilt für jeden alten Stand (v2–v9), ein gemeinsamer Weg.
// Regel: Nichts geht verloren. Eigenes Land wird nie kleiner, jedes gekaufte Stück bleibt ein
// gekauftes Stück, kein Objekt verschwindet, Felder behalten Saat und Wachstum, Tiere ziehen
// ohne Verlust ins Gehege. docs/KARTEN_KONZEPT.md → „Migration“, Entscheidung 44.
// ============================================================================
import { CONTENT, footprintOf, penTypeFor } from './content';
import { buildOccupancy, canPlace } from './map';
import { SCHEMA_VERSION, mapObstacles } from './state';
import { plotIdAt, terrainMap, type Plot } from './terrain';
import type { GameState, Inventory, MapObject, PenAnimal, PenObject } from './types';

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

/** Landstück-Raster v9 (eingefroren): Tal 30×30 aus 6×6 Stücken à 5×5, Start „3,3“ bis „4,4“. */
export const PLOTS_V9 = { origin: { gx: -13, gy: -13 }, size: 5, cols: 6, rows: 6, start: ['3,3', '4,3', '3,4', '4,4'] } as const;

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

/** Ein altes Stück Land: welche Kacheln gehörten dem Spieler, wie viele Stücke hatte er gekauft. */
export interface OldLand { tiles: Set<string>; bought: number }

const key = (gx: number, gy: number) => `${gx},${gy}`;

function addRect(tiles: Set<string>, r: Rect) {
  for (let gy = r.y0; gy <= r.y1; gy++) for (let gx = r.x0; gx <= r.x1; gx++) tiles.add(key(gx, gy));
}

/** Eigenes Land bis v8 (Grundstücke). Jedes Grundstück außer dem Start war ein Kauf. */
export function oldLandV8(oldZones: readonly string[]): OldLand {
  const tiles = new Set<string>();
  const zones = new Set(['starter', ...oldZones.filter((z) => z in ZONES_V8)]);
  for (const z of zones) addRect(tiles, ZONES_V8[z]!);
  return { tiles, bought: zones.size - 1 };
}

/** Eigenes Land in v9 (Landstücke 5×5). */
export function oldLandV9(ownedPlots: readonly string[]): OldLand {
  const tiles = new Set<string>();
  const p = PLOTS_V9;
  let bought = 0;
  for (const id of new Set(ownedPlots)) {
    const [col, row] = id.split(',').map(Number) as [number, number];
    if (!(col >= 0 && row >= 0 && col < p.cols && row < p.rows)) continue;
    const x0 = p.origin.gx + col * p.size, y0 = p.origin.gy + row * p.size;
    addRect(tiles, { x0, y0, x1: x0 + p.size - 1, y1: y0 + p.size - 1 });
    if (!(p.start as readonly string[]).includes(id)) bought++;
  }
  return { tiles, bought };
}

/**
 * Neue Landstücke für altes Land: Start-Land, dann angrenzende Stücke mit der größten Überdeckung,
 * bis (1) die Fläche nie kleiner ist und (2) mindestens so viele Stücke gekauft sind wie vorher.
 * Deterministisch (Überdeckung, dann ID).
 */
export function plotsForOldLand(old: OldLand): string[] {
  const map = terrainMap();
  const owned = new Set<string>(CONTENT.map.plots.start);
  const inTal = [...old.tiles].filter((k) => { const [x, y] = k.split(',').map(Number) as [number, number]; return plotIdAt(x, y) !== null; });
  const overlap = new Map<string, number>();
  for (const k of inTal) {
    const [x, y] = k.split(',').map(Number) as [number, number];
    const id = plotIdAt(x, y)!;
    overlap.set(id, (overlap.get(id) ?? 0) + 1);
  }
  const area = () => owned.size * CONTENT.map.plots.size ** 2;
  const bought = () => [...owned].filter((id) => !map.plotById(id)?.isStart).length;
  const cx = inTal.length ? inTal.reduce((s, k) => s + Number(k.split(',')[0]), 0) / inTal.length : 0;
  const cy = inTal.length ? inTal.reduce((s, k) => s + Number(k.split(',')[1]), 0) / inTal.length : 0;
  while (area() < inTal.length || bought() < old.bought) {
    const cands = map.plots.filter((p) => !owned.has(p.id) && map.neighbors(p.id).some((n) => owned.has(n.id)));
    if (cands.length === 0) break;
    const dist = (p: Plot) => Math.hypot((p.x0 + p.x1) / 2 - cx, (p.y0 + p.y1) / 2 - cy);
    cands.sort((a, b) => (overlap.get(b.id) ?? 0) - (overlap.get(a.id) ?? 0) || dist(a) - dist(b) || a.id.localeCompare(b.id));
    owned.add(cands[0]!.id);
  }
  return [...owned];
}

const dist = (a: { gx: number; gy: number }, gx: number, gy: number) => Math.abs(a.gx - gx) + Math.abs(a.gy - gy);

/** Nächster freier Platz auf eigenem Land (deterministisch: Abstand, dann gy, dann gx). */
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

/** Nächstes angrenzende Landstück zu einem Punkt – wird bei Platznot geschenkt. */
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

/** Ein Tier als eigenes Kartenobjekt (bis v9). */
export interface LegacyAnimalObject {
  id: string; kind: 'animal'; type: string; gx: number; gy: number;
  nick: string; state: PenAnimal['state']; readyAt: number; lastPet: number;
}

/** Tiere bis v9 → Gehege je Art (höchstens capacity Tiere je Gehege), Gehege steht in der Mitte seiner Tiere. */
function animalsToPens(s: GameState, animals: LegacyAnimalObject[], warnings: string[]): PenObject[] {
  const byType = new Map<string, LegacyAnimalObject[]>();
  for (const a of animals) byType.set(a.type, [...(byType.get(a.type) ?? []), a]);
  const pens: PenObject[] = [];
  for (const [type, list] of [...byType].sort(([a], [b]) => a.localeCompare(b))) {
    const penType = penTypeFor(type);
    if (!penType) { warnings.push(`Tier ${type} hat kein Gehege – nicht übernommen`); continue; }
    const cap = CONTENT.pens[penType]!.capacity;
    for (let i = 0; i < list.length; i += cap) {
      const group = list.slice(i, i + cap);
      pens.push({
        id: `pen_${s.nextId++}`, kind: 'pen', type: penType,
        gx: Math.round(group.reduce((n, a) => n + a.gx, 0) / group.length),
        gy: Math.round(group.reduce((n, a) => n + a.gy, 0) / group.length),
        animals: group.map((a) => ({ id: a.id, nick: a.nick, state: a.state, readyAt: a.readyAt, lastPet: a.lastPet }))
      });
      warnings.push(`${group.length} × ${type} ins Gehege ${penType} gezogen`);
    }
  }
  return pens;
}

/**
 * Bringt einen alten Stand (Objekte auf alten Plätzen, alte Größen) auf v10:
 * neues Land, feste Stationen an den Hofplatz, Tiere in Gehege, alles andere bleibt am Platz
 * oder zieht auf den nächsten freien Platz (große Objekte zuerst). Schreibt Hinweise in `warnings`.
 */
export function upgradeLayout(s: GameState, old: OldLand, nowMs: number, warnings: string[]): GameState {
  const owned = plotsForOldLand(old);
  const all = s.objects as (MapObject | LegacyAnimalObject)[];

  // Feste Stationen an den Hofplatz (fehlende kommen dazu)
  const fixedObjs: MapObject[] = [];
  const rest: MapObject[] = [];
  const animals: LegacyAnimalObject[] = [];
  for (const o of all) {
    if (o.kind === 'obstacle') continue;
    if (o.kind === 'animal') { animals.push(o); continue; }
    if (o.kind === 'prop' && CONTENT.map.fixed.includes(o.type) && !fixedObjs.some((f) => f.type === o.type)) fixedObjs.push(o);
    else rest.push(o);
  }
  for (const type of CONTENT.map.fixed) {
    const home = CONTENT.start.objects.find((x) => x.kind === 'prop' && x.type === type)!;
    const have = fixedObjs.find((f) => f.type === type);
    if (have) { have.gx = home.gx; have.gy = home.gy; }
    else fixedObjs.push({ id: home.id, kind: 'prop', type, gx: home.gx, gy: home.gy });
  }
  rest.push(...animalsToPens(s, animals, warnings));

  // Was am alten Platz gültig steht, bleibt; der Rest zieht um – große Objekte zuerst, damit sie Platz finden
  const placed: MapObject[] = [...fixedObjs];
  const pending: MapObject[] = [];
  for (const o of rest) {
    const fp = footprintOf(o);
    if (canPlace({ objects: placed, ownedPlots: owned }, o.gx, o.gy, fp.w, fp.h).ok) placed.push(o);
    else pending.push(o);
  }
  const areaOf = (o: MapObject) => { const fp = footprintOf(o); return fp.w * fp.h; };
  pending.sort((a, b) => areaOf(b) - areaOf(a));
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

  s.objects = [...placed, ...obstacles];
  s.ownedPlots = owned;
  s.nextDriftAt = nowMs + CONTENT.drifts.everySeconds * 1000;
  delete (s as Partial<GameState> & { unlockedZones?: unknown }).unlockedZones;
  s.schemaVersion = SCHEMA_VERSION;
  return s;
}

/** v8 und älter: Waren umbenennen, Startpaket-Werkzeuge auch für bestehende Höfe (Entscheidung 15), dann neues Land. */
export function upgradeFromV8(s: GameState, oldZones: readonly string[], nowMs: number, warnings: string[]): GameState {
  s.inventory = renameItemsV9(s.inventory);
  for (const [id, q] of Object.entries(CONTENT.start.inventory)) {
    if (CONTENT.items[id]?.category === 'tool') s.inventory[id] = (s.inventory[id] ?? 0) + q;
  }
  return upgradeLayout(s, oldLandV8(oldZones), nowMs, warnings);
}
