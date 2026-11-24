// Baustein 2 + 2b: Karte als Daten – Alpental, Landstücke, Zufahrt, Hindernis-Ebene aus winterhof.json.
import { describe, expect, it } from 'vitest';
import {
  CONTENT, ZONE_BORDER, buildTerrainMap, canPlace, createNewGame, footprintOf, plotIdAt, terrainMap, validateLayout, validateMap,
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

  it('See heißt Sternsee (nur besondere Orte tragen Namen), Schild liegt auf dem Eis', () => {
    expect(CONTENT.map.places.map((p) => p.name)).toEqual(['Sternsee']);
    const lake = CONTENT.map.places[0]!;
    expect(terrainMap().tileAt(lake.gx, lake.gy)).toMatchObject({ terrain: 'ice', zone: ZONE_BORDER });
  });

  it('Berge: tiefe Kulisse hinten, Baumgrenze unregelmäßig (Waldzungen, Felsrippen)', () => {
    const t = terrainMap();
    // hinter dem Tal mindestens 8 Reihen Berg
    expect(t.tileAt(1, t.minGy + 7)?.terrain).toBe('mountain');
    expect(t.tileAt(t.minGx + 7, 1)?.terrain).toBe('mountain');
    // Waldtiefe entlang der hinteren rechten Talkante schwankt
    const depth = Array.from({ length: 30 }, (_, i) => {
      let d = 0;
      while (t.tileAt(-13 + i, -14 - d)?.terrain === 'forest') d++;
      return d;
    });
    expect(new Set(depth).size).toBeGreaterThanOrEqual(3);
    expect(Math.max(...depth) - Math.min(...depth)).toBeGreaterThanOrEqual(3);
  });

  it('Hindernisse liegen in Gruppen nach Gegend, nicht gleichmäßig gestreut', () => {
    const obs = CONTENT.map.obstacles;
    const kind = (type: string) => type.split('_')[0]!;
    const cellsOf = (o: (typeof obs)[number]) => {
      const fp = footprintOf({ kind: 'obstacle', type: o.type });
      const out: [number, number][] = [];
      for (let dy = 0; dy < fp.h; dy++) for (let dx = 0; dx < fp.w; dx++) out.push([o.gx + dx, o.gy + dy]);
      return out;
    };
    const occ = new Map<string, number>();
    obs.forEach((o, i) => cellsOf(o).forEach(([x, y]) => occ.set(`${x},${y}`, i)));
    // Fels, Tanne, Eis: fast jedes hat einen Nachbarn derselben Art (zufällig verteilt wären es rund 40 %)
    const grouped = obs.map((o, i) => ({ o, i })).filter(({ o }) => kind(o.type) !== 'drift');
    const withNeighbour = grouped.filter(({ o, i }) => cellsOf(o).some(([x, y]) =>
      [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => {
        const j = occ.get(`${x + dx},${y + dy}`);
        return j !== undefined && j !== i && kind(obs[j]!.type) === kind(o.type);
      }))));
    expect(withNeighbour.length / grouped.length).toBeGreaterThan(0.75);
    // Gegend: Felsen eher hinten (zu den Bergen), Tannen eher vorn, Eis nur am Ufer
    const mean = (k: string) => { const l = obs.filter((o) => kind(o.type) === k); return l.reduce((a, o) => a + o.gx + o.gy, 0) / l.length; };
    expect(mean('rock')).toBeLessThan(mean('pine'));
    const ice = obs.filter((o) => kind(o.type) === 'ice');
    expect(ice.length).toBeGreaterThan(0);
    expect(ice.every((o) => ['5,0', '5,1', '5,2'].includes(plotIdAt(o.gx, o.gy)!))).toBe(true);
    // jedes kaufbare Landstück lohnt sich und ist nicht überladen
    for (const p of terrainMap().plots.filter((x) => !x.isStart)) {
      const n = obs.filter((o) => plotIdAt(o.gx, o.gy) === p.id).length;
      expect(n, p.id).toBeGreaterThanOrEqual(5);
      expect(n, p.id).toBeLessThanOrEqual(9);
    }
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
    it('Ort ohne Namen oder auf Bauland', () => {
      const c = clone();
      c.map.places = [{ id: 'a', name: ' ', gx: 25, gy: -6 }, { id: 'b', name: 'X', gx: 0, gy: 0 }];
      const e = validateMap(c).join('\n');
      expect(e).toMatch(/Ort a: Name fehlt/);
      expect(e).toMatch(/Ort b: liegt auf einem Landstück/);
    });
    it('Start-Land muss zusammenhängen', () => {
      const c = clone();
      c.map.plots.start = ['0,0', '5,5'];
      expect(validateMap(c).join()).toMatch(/hängt nicht zusammen/);
    });
  });
});

function m() { return terrainMap(); }
