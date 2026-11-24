// Baustein 2b: Landstücke kaufen, Hindernisse räumen, Werkzeuge, Schneewehen, Wegplatten, Migration v8 → v9.
import { describe, expect, it } from 'vitest';
import {
  BEFORE_V9_KEY, CONTENT, GameSession, SAVE_KEY, advanceTime, applyCommand, canPlace, createNewGame, deserialize, getObject,
  nextPlotPrice, plotIdAt, serialize, terrainMap, toolPrice, validateLayout, type Command, type GameState, type MapObject
} from '../../src/core';

const T0 = Date.UTC(2026, 10, 24, 9, 0, 0);
const H = 3600_000;

function ok(s: GameState, cmd: Command, now = T0): GameState {
  const r = applyCommand(s, cmd, now);
  if (!r.ok) throw new Error(`${cmd.type}: ${r.error.code} ${r.error.message}`);
  return r.state;
}
function err(s: GameState, cmd: Command, now = T0): string {
  const r = applyCommand(s, cmd, now);
  if (r.ok) throw new Error(`${cmd.type} hätte fehlschlagen müssen`);
  return r.error.code;
}
const lvl = (s: GameState, level: number): GameState => ({ ...s, level, xp: CONTENT.levels[level - 1]!.xpNeeded });
const obstaclesOn = (s: GameState, plot: string) => s.objects.filter((o) => o.kind === 'obstacle' && plotIdAt(o.gx, o.gy) === plot);

describe('Start', () => {
  it('Eigenes Land = Start-Hof, Hindernisse liegen überall, auch im Start-Hof', () => {
    const s = createNewGame(T0);
    expect(s.ownedPlots.sort()).toEqual(['3,3', '3,4', '4,3', '4,4']);
    expect(s.objects.filter((o) => o.kind === 'obstacle' && s.ownedPlots.includes(plotIdAt(o.gx, o.gy)!)).length).toBe(5);
    for (const p of terrainMap().plots) if (!p.isStart) expect(obstaclesOn(s, p.id).length, p.id).toBeGreaterThan(0);
    expect(validateLayout(s)).toEqual([]);
    expect(s.inventory).toMatchObject({ shovel: 1, pickaxe: 1 });
  });
});

describe('Landstücke kaufen', () => {
  it('ab Stufe 3, nur angrenzend, Preis steigt', () => {
    let s = { ...createNewGame(T0), coins: 5000 };
    expect(err(s, { type: 'unlockPlot', plotId: '2,3' })).toBe('locked');          // Stufe 1
    s = lvl(s, 3);
    expect(err(s, { type: 'unlockPlot', plotId: '0,0' })).toBe('locked');          // nicht angrenzend
    expect(err(s, { type: 'unlockPlot', plotId: '3,3' })).toBe('already_done');
    const p1 = nextPlotPrice(s);
    expect(p1).toEqual({ coins: CONTENT.land.baseCost, materials: {} });
    s = ok(s, { type: 'unlockPlot', plotId: '2,3' });
    expect(s.coins).toBe(5000 - p1.coins);
    expect(s.ownedPlots).toContain('2,3');
    expect(nextPlotPrice(s).coins).toBeGreaterThan(p1.coins);
    s = ok(s, { type: 'unlockPlot', plotId: '1,3' });                                 // grenzt jetzt an
    expect(s.stats.landsUnlocked).toBe(2);
  });
  it('ab dem 3. Kauf: Grundbrief, Holzhammer, Grenzpflock in gleicher Menge', () => {
    let s = lvl({ ...createNewGame(T0), coins: 9000 }, 6);
    s = ok(ok(s, { type: 'unlockPlot', plotId: '2,3' }), { type: 'unlockPlot', plotId: '2,4' });
    const need = nextPlotPrice(s).materials;
    expect(need).toEqual({ land_deed: 1, mallet: 1, boundary_stake: 1 });
    expect(err(s, { type: 'unlockPlot', plotId: '2,2' })).toBe('missing_items');
    s = ok({ ...s, inventory: { ...s.inventory, ...need } }, { type: 'unlockPlot', plotId: '2,2' });
    for (const id of Object.keys(need)) expect(s.inventory[id] ?? 0).toBe(0);
  });
  it('Ufer-Landstück erst ab Stufe 13', () => {
    let s = lvl({ ...createNewGame(T0), coins: 1e6, inventory: { land_deed: 99, mallet: 99, boundary_stake: 99 } }, 12);
    for (const id of ['5,3', '5,4']) s = ok(s, { type: 'unlockPlot', plotId: id });
    s = ok(s, { type: 'unlockPlot', plotId: '4,2' });
    expect(err(s, { type: 'unlockPlot', plotId: '5,2' })).toBe('locked');
    ok(lvl(s, 13), { type: 'unlockPlot', plotId: '5,2' });
  });
  it('Gekauftes Land ist erst nach dem Räumen frei', () => {
    let s = lvl({ ...createNewGame(T0), coins: 5000 }, 3);
    s = ok(s, { type: 'unlockPlot', plotId: '2,3' });
    const ob = obstaclesOn(s, '2,3')[0]!;
    expect(canPlace(s, ob.gx, ob.gy, 1, 1)).toEqual({ ok: false, reason: 'occupied' });
  });
});

describe('Hindernisse räumen', () => {
  it('Schneewehe mit Schaufel: weg, Werkzeug verbraucht, Erfahrung', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'clearObstacle', obstacleId: 'ob_2_6' });
    expect(getObject(s, 'ob_2_6', 'obstacle')).toBeNull();
    expect(s.inventory.shovel ?? 0).toBe(0);
    expect(s.xp).toBe(CONTENT.obstacles.drift_small!.xp);
    expect(s.stats.obstaclesCleared).toBe(1);
    expect(canPlace(s, 2, 6, 1, 1).ok).toBe(true);
  });
  it('Fehlt Werkzeug: Fehler mit Preis; mit Sofortkauf bezahlt und sofort benutzt', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'clearObstacle', obstacleId: 'ob_2_6' });                       // Schaufel weg
    const r = applyCommand(s, { type: 'clearObstacle', obstacleId: 'ob_11_6' }, T0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatchObject({ code: 'missing_items', detail: { missing: { shovel: 1 }, coins: toolPrice(1) } });
    const coins = s.coins;
    const r2 = applyCommand(s, { type: 'clearObstacle', obstacleId: 'ob_11_6', buyMissing: true }, T0);
    if (!r2.ok) throw new Error(r2.error.message);
    expect(r2.state.coins).toBe(coins - toolPrice(1));
    expect(r2.state.inventory.shovel).toBeUndefined();                                // nie ins Lager
    expect(r2.events).toContainEqual({ type: 'toolsBought', items: { shovel: 1 }, coins: toolPrice(1) });
    expect(err({ ...s, coins: 0 }, { type: 'clearObstacle', obstacleId: 'ob_11_6', buyMissing: true })).toBe('no_coins');
  });
  it('Werkzeugpreis steigt mit der Stufe', () => {
    expect(toolPrice(1)).toBeLessThan(toolPrice(6));
    expect(toolPrice(6)).toBeLessThan(toolPrice(30));
  });
  it('Tanne wird ausgegraben und kann woanders eingepflanzt werden', () => {
    let s: GameState = { ...createNewGame(T0), inventory: { spade: 1 } };
    const r = applyCommand(s, { type: 'clearObstacle', obstacleId: 'ob_11_2' }, T0);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'obstacleCleared', obstacleId: 'ob_11_2', deco: 'pine' }));
    s = r.state;
    expect(s.storedDecos.pine).toBe(1);
    s = ok(s, { type: 'placeStoredDeco', decoType: 'pine', gx: 9, gy: 6 });
    expect(validateLayout(s)).toEqual([]);
  });
  it('Große Hindernisse brauchen 2 Werkzeuge, große Tanne wird große Deko', () => {
    let s = lvl({ ...createNewGame(T0), coins: 1e6, inventory: { land_deed: 99, mallet: 99, boundary_stake: 99 } }, 10);
    const big = s.objects.find((o) => o.kind === 'obstacle' && o.type === 'pine_large')!;
    const plot = plotIdAt(big.gx, big.gy)!;
    // Land bis dorthin kaufen (kürzester Weg über Nachbarn)
    const path = (target: string): string[] => {
      const prev = new Map<string, string | null>(s.ownedPlots.map((id) => [id, null]));
      const q = [...s.ownedPlots];
      while (q.length) {
        const id = q.shift()!;
        if (id === target) break;
        for (const n of terrainMap().neighbors(id)) if (!prev.has(n.id) && n.minLevel <= 10) { prev.set(n.id, id); q.push(n.id); }
      }
      const out: string[] = [];
      for (let id: string | null | undefined = target; id && !s.ownedPlots.includes(id); id = prev.get(id)) out.unshift(id);
      return out;
    };
    for (const id of path(plot)) s = ok(s, { type: 'unlockPlot', plotId: id });
    s = { ...s, inventory: { ...s.inventory, spade: 1 } };
    expect(err(s, { type: 'clearObstacle', obstacleId: big.id })).toBe('missing_items');
    s = ok({ ...s, inventory: { ...s.inventory, spade: 2 } }, { type: 'clearObstacle', obstacleId: big.id });
    expect(s.storedDecos.pine_large).toBe(1);
  });
  it('Auf fremdem Land nicht räumbar, Hindernisse nicht verschiebbar', () => {
    const s = { ...createNewGame(T0), inventory: { pickaxe: 9, shovel: 9, spade: 9, icepick: 9 } };
    const foreign = obstaclesOn(s, '0,0')[0]!;
    expect(err(s, { type: 'clearObstacle', obstacleId: foreign.id })).toBe('locked');
    expect(err(s, { type: 'moveObject', objectId: 'ob_2_2', gx: 9, gy: 6 })).toBe('locked');
  });
});

describe('Hofplatz', () => {
  it('Stationen am Hofplatz stehen fest, das Chalet ist frei', () => {
    const s = createNewGame(T0);
    for (const t of CONTENT.map.fixed) {
      const o = s.objects.find((x) => x.type === t)!;
      expect(err(s, { type: 'moveObject', objectId: o.id, gx: 9, gy: 6 })).toBe('locked');
      // jede Station berührt den Hofplatz oder steht direkt daneben
      const near = [-1, 0, 1, 2].some((dx) => [-1, 0, 1, 2].some((dy) => terrainMap().tileAt(o.gx + dx, o.gy + dy)?.surface === 'plaza'));
      expect(near, t).toBe(true);
    }
    ok(s, { type: 'moveObject', objectId: 'chalet', gx: 2, gy: 4 });
  });
});

describe('Schneewehen wachsen nach', () => {
  it('alle 8 h eine, höchstens 5, mit Abstand, nur auf eigenem Land, reproduzierbar', () => {
    const s0 = createNewGame(T0, 11);
    const ownDrifts = (s: GameState) => s.objects.filter((o) => o.kind === 'obstacle' && o.type === 'drift_small' && s.ownedPlots.includes(plotIdAt(o.gx, o.gy)!));
    const base = ownDrifts(s0).length;
    const a = advanceTime(s0, T0 + 8 * H);
    expect(ownDrifts(a.state).length).toBe(base + 1);
    expect(a.events.filter((e) => e.type === 'obstacleSpawned').length).toBe(1);
    expect(validateLayout(a.state)).toEqual([]);
    expect(advanceTime(a.state, T0 + 8 * H).events.length).toBe(0);                         // idempotent
    expect(advanceTime(s0, T0 + 8 * H).state).toEqual(a.state);                                // reproduzierbar
    expect(ownDrifts(advanceTime(s0, T0 + 30 * 24 * H).state).length).toBeLessThanOrEqual(CONTENT.drifts.max);
    // viel freies Land: nach einem Monat genau so viele wie erlaubt, nicht mehr
    const wide: GameState = { ...s0, objects: [], ownedPlots: terrainMap().plots.map((p) => p.id) };
    expect(ownDrifts(advanceTime(wide, T0 + 30 * 24 * H).state).length).toBe(CONTENT.drifts.max);
  });
  it('neue Wehe hat 1 Feld Abstand zu jedem Objekt und zum Weg', () => {
    let s = createNewGame(T0, 3);
    for (let i = 1; i <= 3; i++) {
      const before = new Set(s.objects.map((o) => o.id));
      s = advanceTime(s, T0 + i * 8 * H).state;
      const fresh = s.objects.filter((o) => !before.has(o.id));
      for (const f of fresh) {
        for (const o of s.objects.filter((x) => x.id !== f.id) as MapObject[]) {
          const fp = CONTENT.footprints[o.type] ?? { w: 1, h: 1 };
          const gapX = Math.max(o.gx - f.gx, f.gx - (o.gx + fp.w - 1)), gapY = Math.max(o.gy - f.gy, f.gy - (o.gy + fp.h - 1));
          expect(Math.max(gapX, gapY), `${f.id} zu ${o.id}`).toBeGreaterThan(1);
        }
      }
    }
  });
});

describe('Wegplatten', () => {
  it('einfache Wege fester Preis, edle werden mit jedem Stück teurer', () => {
    let s = lvl({ ...createNewGame(T0), coins: 5000 }, 8);
    const c0 = s.coins;
    s = ok(ok(s, { type: 'buyDeco', decoType: 'path_snow', gx: 9, gy: 6 }), { type: 'buyDeco', decoType: 'path_snow', gx: 9, gy: 7 });
    expect(c0 - s.coins).toBe(2 * CONTENT.decorations.path_snow!.cost);
    const c1 = s.coins;
    s = ok(ok(s, { type: 'buyDeco', decoType: 'path_cobble', gx: 3, gy: 6 }), { type: 'buyDeco', decoType: 'path_cobble', gx: 4, gy: 6 });
    const d = CONTENT.decorations.path_cobble!;
    expect(c1 - s.coins).toBe(d.cost + d.cost + d.costStep!);
    expect(s.xp).toBe(CONTENT.levels[7]!.xpNeeded);                                            // Wege geben keine Erfahrung
    expect(err(lvl(s, 7), { type: 'buyDeco', decoType: 'path_cobble', gx: 5, gy: 6 })).toBe('locked');
  });
});

describe('Migration Spielstand v8 → v9', () => {
  /** Ein typischer v8-Stand: alte Grundstücke, Objekte auf heute ungültigen Plätzen, altes Land-Material. */
  function v8State(): Record<string, unknown> {
    const s = createNewGame(T0) as unknown as Record<string, unknown>;
    const objects = (s.objects as MapObject[]).filter((o) => o.kind !== 'obstacle' && o.type !== 'farmStand').map((o) => {
      const old: Record<string, [number, number]> = { mailbox: [3, 5], wishlistBoard: [10, 5], sleigh: [11, 5], dailyChest: [6, 3] };
      const p = old[o.type];
      return p ? { ...o, gx: p[0], gy: p[1] } : o;
    });
    objects.push(
      { id: 'f_wich', kind: 'field', type: 'field', gx: 18, gy: 3, crop: 'wheat', plantedAt: T0 },  // Wichtelhain: heute außerhalb des Tals
      { id: 'd_platz', kind: 'deco', type: 'snowman', gx: 7, gy: 10 },                             // heute Hofplatz
      { id: 'st_tea', kind: 'station', type: 'teahouse', gx: 10, gy: 9, wrapped: false, queue: [], ready: ['winter_punch'], craftedCount: 4 }, // überlappt feste Stationen
      { id: 'd_west', kind: 'deco', type: 'lantern', gx: 0, gy: 4 }                               // Westzone
    );
    const rest = { ...s };
    delete rest.ownedPlots;                                                                  // v8 kannte beides nicht
    delete rest.nextDriftAt;
    return { ...rest, schemaVersion: 8, objects, unlockedZones: ['west_forest', 'bachwiese', 'wichtelhain'], inventory: { wheat: 3, snow_shovel: 2, survey_map: 1, boundary_stake: 1 }, coins: 1234 };
  }

  it('nichts geht verloren, alles steht gültig, Land wird nie kleiner', () => {
    const old = v8State();
    const r = deserialize(JSON.stringify(old), T0);
    const s = r.state;
    expect(r.source).toBe('v8');
    expect(s.schemaVersion).toBe(9);
    expect(s.coins).toBe(1234);
    expect(s.inventory).toEqual({ wheat: 3, mallet: 2, land_deed: 1, boundary_stake: 1, shovel: 1, pickaxe: 1 });
    for (const o of old.objects as MapObject[]) expect(s.objects.some((x) => x.id === o.id), o.id).toBe(true);
    expect(s.objects.some((o) => o.type === 'farmStand')).toBe(true);
    expect(getObject(s, 'st_tea', 'station')).toMatchObject({ ready: ['winter_punch'], craftedCount: 4 });
    expect(getObject(s, 'd_west', 'deco')).toMatchObject({ gx: 0, gy: 4 });                     // gültig: bleibt stehen
    expect(getObject(s, 'd_platz', 'deco')).not.toMatchObject({ gx: 7, gy: 10 });              // vom Hofplatz verschoben
    expect(validateLayout(s)).toEqual([]);
    expect(r.warnings.filter((w) => !w.includes('verschoben') && !w.includes('geschenkt'))).toEqual([]);
    // alte Westzone, Bachwiese -> Landstücke; keine Hindernisse auf eigenem Land
    expect(s.ownedPlots).toEqual(expect.arrayContaining(['2,3', '2,4', '5,2', '5,3', '5,4']));
    for (const id of s.ownedPlots) expect(obstaclesOn(s, id), id).toEqual([]);
    for (const t of CONTENT.map.fixed) {
      const home = CONTENT.start.objects.find((o) => o.type === t)!;
      expect(s.objects.find((o) => o.type === t)).toMatchObject({ gx: home.gx, gy: home.gy });
    }
  });

  it('danach ist der Stand stabil (Laden = gleicher Stand)', () => {
    const s = deserialize(JSON.stringify(v8State()), T0).state;
    const again = deserialize(serialize(s), T0);
    expect(again.source).toBe('current');
    expect(again.state).toEqual(s);
  });

  it('Session sichert den v8-Stand einmal unverändert, bevor sie v9 speichert', () => {
    const raw = JSON.stringify(v8State());
    const mem = new Map<string, string>([[SAVE_KEY, raw]]);
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s1 = new GameSession({ store, now: () => T0 });
    expect(s1.loadReport.source).toBe('v8');
    expect(mem.get(BEFORE_V9_KEY)).toBe(raw);
    expect(JSON.parse(mem.get(SAVE_KEY)!).schemaVersion).toBe(9);
    new GameSession({ store, now: () => T0 + 1000 });
    expect(mem.get(BEFORE_V9_KEY)).toBe(raw);
  });
});
