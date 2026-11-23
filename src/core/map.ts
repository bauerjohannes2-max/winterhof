// ============================================================================
// Winterhof Core – Karte & Platzierung
// Gelände (statisch) kommt aus der WorldGrid-Basiskarte, Belegung wird aus
// state.objects berechnet. Keine Kopie im Spielstand, keine Neuberechnung pro Frame.
// ============================================================================
// Bekannte Ausnahme bis Baustein 2 (Karte als Daten): danach kein Import aus engine/ mehr.
// eslint-disable-next-line no-restricted-imports
import { WorldGrid, TERRAIN, SURFACE, ZONE } from '../engine/worldGrid.js';
import { footprintOf } from './content';
import type { GameState, MapObject, ObjectId } from './types';

interface Tile { terrain: string; surface: string; zone: string }
interface GridLike { getTile(gx: number, gy: number): Tile | null }

let baseGrid: GridLike | null = null;
function base(): GridLike {
  if (!baseGrid) baseGrid = new WorldGrid() as unknown as GridLike;
  return baseGrid;
}

export function tileKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

/** Belegung: Kachel -> Objekt-ID. */
export function buildOccupancy(objects: readonly MapObject[]): Map<string, ObjectId> {
  const occ = new Map<string, ObjectId>();
  for (const o of objects) {
    const fp = footprintOf(o);
    for (let dy = 0; dy < fp.h; dy++) for (let dx = 0; dx < fp.w; dx++) occ.set(tileKey(o.gx + dx, o.gy + dy), o.id);
  }
  return occ;
}

export function isZoneUnlocked(zone: string, state: GameState): boolean {
  return zone === ZONE.STARTER || state.unlockedZones.includes(zone);
}

export type PlaceCheck = { ok: true } | { ok: false; reason: 'terrain' | 'locked' | 'occupied' | 'bounds' };

/** Darf ein Objekt mit Footprint w×h an (gx,gy)? */
export function canPlace(
  state: GameState, gx: number, gy: number, w: number, h: number, ignoreId: ObjectId | null = null
): PlaceCheck {
  if (!Number.isInteger(gx) || !Number.isInteger(gy)) return { ok: false, reason: 'bounds' };
  const occ = buildOccupancy(state.objects);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const x = gx + dx, y = gy + dy;
      const t = base().getTile(x, y);
      if (!t || t.zone === ZONE.BORDER) return { ok: false, reason: 'bounds' };
      if (!isZoneUnlocked(t.zone, state)) return { ok: false, reason: 'locked' };
      if (t.terrain !== TERRAIN.SNOW || t.surface !== SURFACE.NONE) return { ok: false, reason: 'terrain' };
      const k = tileKey(x, y);
      const who = occ.get(k);
      if (who && who !== ignoreId) return { ok: false, reason: 'occupied' };
    }
  }
  return { ok: true };
}

/** Prüft den ganzen Spielstand: keine Überlappung, nichts auf Weg/Wasser/gesperrtem Land. */
export function validateLayout(state: GameState): string[] {
  const errs: string[] = [];
  const seen = new Map<string, ObjectId>();
  for (const o of state.objects) {
    const fp = footprintOf(o);
    for (let dy = 0; dy < fp.h; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        const x = o.gx + dx, y = o.gy + dy;
        const k = tileKey(x, y);
        const prev = seen.get(k);
        if (prev) errs.push(`Überlappung ${prev} / ${o.id} auf ${k}`);
        seen.set(k, o.id);
        const t = base().getTile(x, y);
        if (!t || t.zone === ZONE.BORDER) errs.push(`${o.id} außerhalb des Hofs auf ${k}`);
        else {
          if (!isZoneUnlocked(t.zone, state)) errs.push(`${o.id} auf gesperrtem Land ${k}`);
          if (t.terrain !== TERRAIN.SNOW || t.surface !== SURFACE.NONE) errs.push(`${o.id} auf ${t.terrain}/${t.surface} ${k}`);
        }
      }
    }
  }
  return errs;
}
