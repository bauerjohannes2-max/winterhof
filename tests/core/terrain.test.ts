// Baustein 2: Karte als Daten – Gelände, Wege, Zonen kommen aus winterhof.json.
import { describe, expect, it } from 'vitest';
import {
  CONTENT, ZONE_BORDER, ZONE_STARTER, buildTerrainMap, canPlace, createNewGame, terrainMap, validateLayout, validateMap,
  type ContentPack
} from '../../src/core';

const T0 = Date.UTC(2026, 10, 24, 9, 0, 0);
const clone = (): ContentPack => JSON.parse(JSON.stringify(CONTENT)) as ContentPack;

describe('Karte als Daten', () => {
  it('Kartendaten sind gültig', () => {
    expect(validateMap()).toEqual([]);
  });

  it('Kartengröße und Ursprung wie bisher (-10 … 26)', () => {
    const m = terrainMap();
    expect([m.minGx, m.minGy, m.maxGx, m.maxGy]).toEqual([-10, -10, 26, 26]);
    expect(m.tiles.length).toBe(37 * 37);
  });

  it('bekannte Kacheln stimmen', () => {
    const m = terrainMap();
    expect(m.tileAt(-10, -10)).toMatchObject({ terrain: 'forest', zone: ZONE_BORDER });
    expect(m.tileAt(2, 2)).toMatchObject({ terrain: 'snow', surface: 'none', zone: ZONE_STARTER });
    expect(m.tileAt(0, 6)).toMatchObject({ surface: 'road', zone: 'west_forest' });
    expect(m.tileAt(5, 5)?.surface).toBe('road');   // Weg zum Chalet
    expect(m.tileAt(4, 7)?.surface).toBe('road');   // Weg zur Backstube
    expect(m.tileAt(8, 5)?.surface).toBe('plaza');  // Platz am Baum
    expect(m.tileAt(-10, 6)).toMatchObject({ terrain: 'snow', surface: 'road' }); // Dorfstraße bis zum Horizont
    expect(m.tileAt(27, 0)).toBeNull();
    expect(m.tileAt(1.5, 2)).toBeNull();
  });

  it('jede Kachel eines Grundstücks ist Schnee', () => {
    for (const t of terrainMap().tiles) if (t.zone !== ZONE_BORDER) expect(t.terrain, `${t.gx},${t.gy}`).toBe('snow');
  });

  it('alle Wege und Plätze hängen zusammen (ein Wegnetz)', () => {
    const m = terrainMap();
    const paths = m.tiles.filter((t) => t.surface !== 'none');
    const seen = new Set<string>();
    const todo = [paths[0]!];
    while (todo.length) {
      const t = todo.pop()!;
      const k = `${t.gx},${t.gy}`;
      if (seen.has(k)) continue;
      seen.add(k);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = m.tileAt(t.gx + dx, t.gy + dy);
        if (n && n.surface !== 'none') todo.push(n);
      }
    }
    expect(seen.size).toBe(paths.length);
  });

  it('Start-Hof passt auf die Karte', () => {
    expect(validateLayout(createNewGame(T0))).toEqual([]);
  });

  it('Platzieren: Weg, Wald und gesperrtes Land sind verboten', () => {
    const s = createNewGame(T0);
    expect(canPlace(s, 0, 6, 1, 1)).toEqual({ ok: false, reason: 'locked' });
    expect(canPlace({ ...s, unlockedZones: ['west_forest'] }, 0, 6, 1, 1)).toEqual({ ok: false, reason: 'terrain' });
    expect(canPlace(s, -10, -10, 1, 1)).toEqual({ ok: false, reason: 'bounds' });
    expect(canPlace(s, 10, 10, 1, 1)).toEqual({ ok: true });
  });

  describe('Fehler in den Daten werden erkannt', () => {
    it('falsche Reihenlänge', () => {
      const c = clone();
      c.map.surface[3] = c.map.surface[3]!.slice(1);
      expect(validateMap(c).join()).toMatch(/surface Reihe 3: Länge/);
      expect(() => buildTerrainMap(c)).toThrow(/Karte ungültig/);
    });
    it('unbekanntes Zeichen', () => {
      const c = clone();
      c.map.terrain[0] = 'X' + c.map.terrain[0]!.slice(1);
      expect(validateMap(c).join()).toMatch(/Zeichen "X" fehlt/);
    });
    it('überlappende Grundstücke', () => {
      const c = clone();
      c.landZones[0]!.bounds = { ...c.landZones[0]!.bounds, x1: 2 };
      expect(validateMap(c).join()).toMatch(/überlappen/);
    });
    it('Grundstück im Wald', () => {
      const c = clone();
      c.map.terrain[12] = c.map.terrain[12]!.slice(0, 12) + 'F' + c.map.terrain[12]!.slice(13);
      expect(validateMap(c).join()).toMatch(/Wald auf 2,2/);
    });
  });
});
