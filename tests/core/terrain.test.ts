// Baustein 2 + 2b: Karte als Daten – Alpental, Landstücke, Zufahrt, Hindernis-Ebene aus winterhof.json.
import { describe, expect, it } from 'vitest';
import {
  CONTENT, ZONE_BORDER, buildTerrainMap, canPlace, createNewGame, plotIdAt, terrainMap, validateLayout, validateMap,
  type ContentPack
} from '../../src/core';

const T0 = Date.UTC(2026, 10, 24, 9, 0, 0);
const clone = (): ContentPack => JSON.parse(JSON.stringify(CONTENT)) as ContentPack;

describe('Karte als Daten (Alpental)', () => {
  it('Kartendaten sind gültig', () => {
    expect(validateMap()).toEqual([]);
  });

  it('Tal 30×30 aus 6×6 Landstücken à 5×5, Start 10×10 an der alten Stelle', () => {
    const m = terrainMap();
    expect(m.plots.length).toBe(36);
    const start = m.plots.filter((p) => p.isStart);
    expect(start.map((p) => p.id).sort()).toEqual(['3,3', '3,4', '4,3', '4,4']);
    expect([Math.min(...start.map((p) => p.x0)), Math.max(...start.map((p) => p.x1))]).toEqual([2, 11]);
    expect([Math.min(...start.map((p) => p.y0)), Math.max(...start.map((p) => p.y1))]).toEqual([2, 11]);
    expect(plotIdAt(-13, -13)).toBe('0,0');
    expect(plotIdAt(16, 16)).toBe('5,5');
    expect(plotIdAt(17, 0)).toBeNull();
  });

  it('Landschaft: Berge hinten, Wald, See rechts, Kulisse ist nie bebaubar', () => {
    const m = terrainMap();
    const kinds = new Set(m.tiles.map((t) => t.terrain));
    expect([...kinds].sort()).toEqual(['forest', 'ice', 'mountain', 'snow']);
    expect(m.tileAt(m.minGx, m.minGy)).toMatchObject({ terrain: 'mountain', zone: ZONE_BORDER }); // hinten
    const ice = m.tiles.filter((t) => t.terrain === 'ice');
    expect(ice.every((t) => t.gx > 16 && t.gy < 8)).toBe(true);                                // rechts
    for (const t of m.tiles) if (t.zone !== ZONE_BORDER) expect(t.terrain, `${t.gx},${t.gy}`).toBe('snow');
  });

  it('Zufahrt: kurz, vom vorderen Kartenrand bis zum Hofplatz im Start-Hof, nicht quer durch', () => {
    const m = terrainMap();
    const road = m.tiles.filter((t) => t.surface === 'road');
    const plaza = m.tiles.filter((t) => t.surface === 'plaza');
    expect(road.some((t) => t.gy === m.maxGy)).toBe(true);                     // beginnt am Kartenrand
    expect(plaza.every((t) => t.zone === '3,4' || t.zone === '4,4')).toBe(true); // Hofplatz im Start-Hof
    expect(road.length + plaza.length).toBeLessThan(40);
    // ein zusammenhängendes Netz
    const all = [...road, ...plaza];
    const seen = new Set<string>();
    const todo = [all[0]!];
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
    expect(seen.size).toBe(all.length);
  });

  it('Ufer-Landstücke grenzen an den See und kommen ab Stufe 13', () => {
    const m = terrainMap();
    for (const id of ['5,0', '5,1', '5,2']) expect(m.plotById(id)!.minLevel).toBe(13);
    // nur Uferwiese (Schnee) zwischen Tal und Eis, kein Wald
    const nearIce = (gx: number, gy: number) => {
      for (let d = 1; d <= 5; d++) {
        const t = m.tileAt(gx + d, gy)?.terrain;
        if (t === 'ice') return true;
        if (t !== 'snow') return false;
      }
      return false;
    };
    expect(Array.from({ length: 15 }, (_, i) => -13 + i).some((gy) => nearIce(16, gy))).toBe(true);
    expect(m.plotById('5,3')!.minLevel).toBe(CONTENT.land.fromLevel);
  });

  it('Start-Hof passt auf die Karte', () => {
    expect(validateLayout(createNewGame(T0))).toEqual([]);
  });

  it('Platzieren: Hofplatz, Wald und fremdes Land sind verboten', () => {
    const s = createNewGame(T0);
    expect(canPlace(s, 7, 10, 1, 1)).toEqual({ ok: false, reason: 'terrain' }); // Hofplatz
    expect(canPlace(s, 0, 4, 1, 1)).toEqual({ ok: false, reason: 'locked' });
    expect(canPlace(s, m().minGx, m().minGy, 1, 1)).toEqual({ ok: false, reason: 'bounds' });
    expect(canPlace(s, 9, 6, 1, 1)).toEqual({ ok: true });
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
    it('Landstück im Wald', () => {
      const c = clone();
      const row = 2 - c.map.origin.gy, col = 2 - c.map.origin.gx;
      c.map.terrain[row] = c.map.terrain[row]!.slice(0, col) + 'F' + c.map.terrain[row]!.slice(col + 1);
      expect(validateMap(c).join()).toMatch(/Landstück 3,3: forest auf 2,2/);
    });
    it('Hindernis über zwei Landstücke, auf dem Weg oder überlappend', () => {
      const c = clone();
      c.map.obstacles = [{ type: 'rock_large', gx: 1, gy: 1 }, { type: 'rock_small', gx: 7, gy: 12 }, { type: 'rock_small', gx: -13, gy: -13 }, { type: 'rock_small', gx: -13, gy: -13 }];
      const e = validateMap(c).join('\n');
      expect(e).toMatch(/nicht in genau einem Landstück/);
      expect(e).toMatch(/kein freier Schnee/);
      expect(e).toMatch(/überlappen/);
    });
    it('Start-Land muss zusammenhängen', () => {
      const c = clone();
      c.map.plots.start = ['0,0', '5,5'];
      expect(validateMap(c).join()).toMatch(/hängt nicht zusammen/);
    });
  });
});

function m() { return terrainMap(); }
