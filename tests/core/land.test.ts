// Baustein 2b: Landstücke kaufen, Hindernisse räumen, Werkzeuge, Schneewehen, Wegplatten, Migration v8 → v9.
import { describe, expect, it } from 'vitest';
import {
  BEFORE_V10_KEY, BEFORE_V9_KEY, CONTENT, footprintOf, GameSession, SAVE_KEY, advanceTime, applyCommand, canPlace, createNewGame, deserialize, getObject,
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
    expect(s.ownedPlots.sort()).toEqual(['2,2', '2,3', '3,2', '3,3']);
    expect(s.objects.filter((o) => o.kind === 'obstacle' && s.ownedPlots.includes(plotIdAt(o.gx, o.gy)!)).length).toBe(5);
    for (const p of terrainMap().plots) if (!p.isStart) expect(obstaclesOn(s, p.id).length, p.id).toBeGreaterThan(0);
    expect(validateLayout(s)).toEqual([]);
    expect(s.inventory).toMatchObject({ shovel: 1, pickaxe: 1 });
  });
});

describe('Landstücke kaufen', () => {
  it('ab Stufe 3, nur angrenzend, Preis steigt', () => {
    let s = { ...createNewGame(T0), coins: 5000 };
    expect(err(s, { type: 'unlockPlot', plotId: '1,3' })).toBe('locked');          // Stufe 1
    s = lvl(s, 3);
    expect(err(s, { type: 'unlockPlot', plotId: '0,0' })).toBe('locked');          // nicht angrenzend
    expect(err(s, { type: 'unlockPlot', plotId: '3,3' })).toBe('already_done');
    const p1 = nextPlotPrice(s);
    expect(p1).toEqual({ coins: CONTENT.land.baseCost, materials: {} });
    s = ok(s, { type: 'unlockPlot', plotId: '1,3' });
    expect(s.coins).toBe(5000 - p1.coins);
    expect(s.ownedPlots).toContain('1,3');
    expect(nextPlotPrice(s).coins).toBeGreaterThan(p1.coins);
    s = ok(s, { type: 'unlockPlot', plotId: '0,3' });                                 // grenzt jetzt an
    expect(s.stats.landsUnlocked).toBe(2);
  });
  it('ab dem 3. Kauf: Grundbrief, Holzhammer, Grenzpflock in gleicher Menge', () => {
    let s = lvl({ ...createNewGame(T0), coins: 9000 }, 6);
    s = ok(ok(s, { type: 'unlockPlot', plotId: '1,3' }), { type: 'unlockPlot', plotId: '1,2' });
    const need = nextPlotPrice(s).materials;
    expect(need).toEqual({ land_deed: 1, mallet: 1, boundary_stake: 1 });
    expect(err(s, { type: 'unlockPlot', plotId: '2,1' })).toBe('missing_items');
    s = ok({ ...s, inventory: { ...s.inventory, ...need } }, { type: 'unlockPlot', plotId: '2,1' });
    for (const id of Object.keys(need)) expect(s.inventory[id] ?? 0).toBe(0);
  });
  it('Ufer-Landstück erst ab Stufe 13', () => {
    let s = lvl({ ...createNewGame(T0), coins: 1e6, inventory: { land_deed: 99, mallet: 99, boundary_stake: 99 } }, 12);
    s = ok(s, { type: 'unlockPlot', plotId: '4,3' });
    expect(err(s, { type: 'unlockPlot', plotId: '4,2' })).toBe('locked');
    ok(lvl(s, 13), { type: 'unlockPlot', plotId: '4,2' });
  });
  it('Gekauftes Land ist erst nach dem Räumen frei', () => {
    let s = lvl({ ...createNewGame(T0), coins: 5000 }, 3);
    s = ok(s, { type: 'unlockPlot', plotId: '1,3' });
    const ob = obstaclesOn(s, '1,3')[0]!;
    expect(canPlace(s, ob.gx, ob.gy, 1, 1)).toEqual({ ok: false, reason: 'occupied' });
  });
});

describe('Hindernisse räumen', () => {
  it('Schneewehe mit Schaufel: weg, Werkzeug verbraucht, Erfahrung', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'clearObstacle', obstacleId: 'ob_-1_4' });
    expect(getObject(s, 'ob_-1_4', 'obstacle')).toBeNull();
    expect(s.inventory.shovel ?? 0).toBe(0);
    expect(s.xp).toBe(CONTENT.obstacles.drift_small!.xp);
    expect(s.stats.obstaclesCleared).toBe(1);
    expect(canPlace(s, -1, 4, 1, 1).ok).toBe(true);
  });
  it('Fehlt Werkzeug: Fehler mit Preis; mit Sofortkauf bezahlt und sofort benutzt', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'clearObstacle', obstacleId: 'ob_-1_4' });                      // Schaufel weg
    const r = applyCommand(s, { type: 'clearObstacle', obstacleId: 'ob_10_2' }, T0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatchObject({ code: 'missing_items', detail: { missing: { shovel: 1 }, coins: toolPrice(1) } });
    const coins = s.coins;
    const r2 = applyCommand(s, { type: 'clearObstacle', obstacleId: 'ob_10_2', buyMissing: true }, T0);
    if (!r2.ok) throw new Error(r2.error.message);
    expect(r2.state.coins).toBe(coins - toolPrice(1));
    expect(r2.state.inventory.shovel).toBeUndefined();                                // nie ins Lager
    expect(r2.events).toContainEqual({ type: 'toolsBought', items: { shovel: 1 }, coins: toolPrice(1) });
    expect(err({ ...s, coins: 0 }, { type: 'clearObstacle', obstacleId: 'ob_10_2', buyMissing: true })).toBe('no_coins');
  });
  it('Werkzeugpreis steigt mit der Stufe', () => {
    expect(toolPrice(1)).toBeLessThan(toolPrice(6));
    expect(toolPrice(6)).toBeLessThan(toolPrice(30));
  });
  it('Tanne wird ausgegraben und kann woanders eingepflanzt werden', () => {
    let s: GameState = { ...createNewGame(T0), inventory: { spade: 1 } };
    const r = applyCommand(s, { type: 'clearObstacle', obstacleId: 'ob_10_-1' }, T0);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'obstacleCleared', obstacleId: 'ob_10_-1', deco: 'pine' }));
    s = r.state;
    expect(s.storedDecos.pine).toBe(1);
    s = ok(s, { type: 'placeStoredDeco', decoType: 'pine', gx: 9, gy: 1 });
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
    expect(err(s, { type: 'moveObject', objectId: 'ob_-1_-1', gx: 9, gy: 1 })).toBe('locked');
  });
});

describe('Hofplatz', () => {
  it('Stationen am Hofplatz stehen fest, das Chalet ist frei', () => {
    const s = createNewGame(T0);
    for (const t of CONTENT.map.fixed) {
      const o = s.objects.find((x) => x.type === t)!;
      expect(err(s, { type: 'moveObject', objectId: o.id, gx: 9, gy: 1 })).toBe('locked');
      // jede Station berührt den Hofplatz oder steht direkt daneben
      const near = [-1, 0, 1, 2].some((dx) => [-1, 0, 1, 2].some((dy) => terrainMap().tileAt(o.gx + dx, o.gy + dy)?.surface === 'plaza'));
      expect(near, t).toBe(true);
    }
    ok(s, { type: 'moveObject', objectId: 'chalet', gx: 2, gy: 0 });
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
          const fp = footprintOf(o);
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
    s = ok(ok(s, { type: 'buyDeco', decoType: 'path_snow', gx: 9, gy: 1 }), { type: 'buyDeco', decoType: 'path_snow', gx: 9, gy: 2 });
    expect(c0 - s.coins).toBe(2 * CONTENT.decorations.path_snow!.cost);
    const c1 = s.coins;
    s = ok(ok(s, { type: 'buyDeco', decoType: 'path_cobble', gx: 0, gy: 4 }), { type: 'buyDeco', decoType: 'path_cobble', gx: 1, gy: 4 });
    const d = CONTENT.decorations.path_cobble!;
    expect(c1 - s.coins).toBe(d.cost + d.cost + d.costStep!);
    expect(s.xp).toBe(CONTENT.levels[7]!.xpNeeded);                                            // Wege geben keine Erfahrung
    expect(err(lvl(s, 7), { type: 'buyDeco', decoType: 'path_cobble', gx: 2, gy: 4 })).toBe('locked');
  });
});


/** Ein Stand mit alten Größen (Feld 1×1, Chalet/Tafel/Schlitten wie früher), Tieren als eigene Objekte, alten Plätzen. */
function oldObjects(): Record<string, unknown>[] {
  return [
    { id: 'chalet', kind: 'prop', type: 'chalet', gx: 4, gy: 3 },
    { id: 'christmasTree', kind: 'prop', type: 'christmasTree', gx: 8, gy: 3 },
    { id: 'wishlistBoard', kind: 'prop', type: 'wishlistBoard', gx: 10, gy: 10 },
    { id: 'sleigh', kind: 'prop', type: 'sleigh', gx: 10, gy: 11 },
    { id: 'mailbox', kind: 'prop', type: 'mailbox', gx: 9, gy: 9 },
    { id: 'dailyChest', kind: 'prop', type: 'dailyChest', gx: 8, gy: 9 },
    { id: 'st_bakery', kind: 'station', type: 'bakery', gx: 3, gy: 8, wrapped: false, queue: [], ready: ['butterplaetzchen'], craftedCount: 7 },
    { id: 'f_1', kind: 'field', type: 'field', gx: 6, gy: 8, crop: 'wheat', plantedAt: T0 - 30_000 },
    { id: 'f_2', kind: 'field', type: 'field', gx: 7, gy: 8, crop: 'berries', plantedAt: T0 - 10_000 },
    { id: 'f_3', kind: 'field', type: 'field', gx: 6, gy: 9, crop: null, plantedAt: T0 },
    { id: 'f_4', kind: 'field', type: 'field', gx: 7, gy: 9, crop: 'wheat', plantedAt: T0 - 5_000 },
    { id: 'a_1', kind: 'animal', type: 'chicken', gx: 9, gy: 8, nick: 'Flöckchen', state: 'producing', readyAt: T0 + 60_000, lastPet: T0 - 1 },
    { id: 'a_2', kind: 'animal', type: 'chicken', gx: 9, gy: 7, nick: 'Gacki', state: 'ready', readyAt: T0, lastPet: 0 },
    { id: 'a_3', kind: 'animal', type: 'reindeer', gx: 3, gy: 4, nick: 'Rudi', state: 'hungry', readyAt: T0, lastPet: 0 },
    { id: 'd_1', kind: 'deco', type: 'lantern', gx: 3, gy: 7 },
    { id: 'd_2', kind: 'deco', type: 'lantern', gx: 10, gy: 7 },
    { id: 'd_3', kind: 'deco', type: 'snowman', gx: 7, gy: 5 }
  ];
}

/** Alles Alte findet sich wieder: jedes Objekt (Tiere im Gehege) mit seinem Fortschritt. */
function expectNothingLost(s: GameState, old: Record<string, unknown>[]) {
  const animals = s.objects.flatMap((o) => (o.kind === 'pen' ? o.animals.map((a) => ({ ...a, pen: o })) : []));
  for (const o of old) {
    if (o.kind === 'animal') {
      const a = animals.find((x) => x.id === o.id);
      expect(a, String(o.id)).toMatchObject({ nick: o.nick, state: o.state, readyAt: o.readyAt, lastPet: o.lastPet });
      expect(CONTENT.pens[a!.pen.type]!.animal).toBe(o.type);
    } else if (o.kind !== 'obstacle') {
      const x = s.objects.find((y) => y.id === o.id);
      expect(x, String(o.id)).toBeDefined();
      if (o.kind === 'field') expect(x).toMatchObject({ crop: o.crop, plantedAt: o.plantedAt });   // Saat und Wachstum bleiben
    }
  }
}

describe('Migration Spielstand v9 → v10 (Baustein 5b, Entsch. 44)', () => {
  function v9State(owned = ['3,3', '4,3', '3,4', '4,4', '2,3']): Record<string, unknown> {
    const s = createNewGame(T0) as unknown as Record<string, unknown>;
    return { ...s, schemaVersion: 9, ownedPlots: owned, objects: oldObjects(), coins: 777 };
  }

  it('Felder 2×2 mit Saat, Tiere ins Gehege, nichts geht verloren, alles gültig', () => {
    const r = deserialize(JSON.stringify(v9State()), T0);
    const s = r.state;
    expect(r.source).toBe('v9');
    expect(s.schemaVersion).toBe(10);
    expect(s.coins).toBe(777);
    expectNothingLost(s, oldObjects());
    expect(validateLayout(s)).toEqual([]);
    for (const f of s.objects.filter((o) => o.kind === 'field')) expect(footprintOf(f)).toEqual({ w: 2, h: 2 });
    // je Tierart ein Gehege
    const pens = s.objects.filter((o) => o.kind === 'pen');
    expect(pens.map((p) => p.type).sort()).toEqual(['chicken_pen', 'reindeer_pen']);
    expect(getObject(s, 'st_bakery', 'station')).toMatchObject({ ready: ['butterplaetzchen'], craftedCount: 7 });
    expect(r.warnings.filter((w) => !/verschoben|geschenkt|Gehege/.test(w))).toEqual([]);
    for (const t of CONTENT.map.fixed) {
      const home = CONTENT.start.objects.find((o) => o.type === t)!;
      expect(s.objects.find((o) => o.type === t)).toMatchObject({ gx: home.gx, gy: home.gy });
    }
  });

  it('Land wird nie kleiner, jedes gekaufte Stück bleibt ein gekauftes Stück', () => {
    for (const owned of [['3,3', '4,3', '3,4', '4,4'], ['3,3', '4,3', '3,4', '4,4', '2,3'], ['3,3', '4,3', '3,4', '4,4', '2,3', '2,4', '5,3', '5,4', '4,2']]) {
      const s = deserialize(JSON.stringify(v9State(owned)), T0).state;
      const bought = owned.length - 4;
      expect(s.ownedPlots.length * CONTENT.map.plots.size ** 2, owned.join(' ')).toBeGreaterThanOrEqual(owned.length * 25);
      expect(s.ownedPlots.filter((id) => !terrainMap().plotById(id)!.isStart).length, owned.join(' ')).toBeGreaterThanOrEqual(bought);
      for (const id of s.ownedPlots) expect(obstaclesOn(s, id), id).toEqual([]);
      expect(validateLayout(s)).toEqual([]);
    }
  });

  it('danach ist der Stand stabil (Laden = gleicher Stand)', () => {
    const s = deserialize(JSON.stringify(v9State()), T0).state;
    const again = deserialize(serialize(s), T0);
    expect(again.source).toBe('current');
    expect(again.state).toEqual(s);
  });

  it('Session sichert den v9-Stand einmal unverändert, bevor sie v10 speichert', () => {
    const raw = JSON.stringify(v9State());
    const mem = new Map<string, string>([[SAVE_KEY, raw]]);
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s1 = new GameSession({ store, now: () => T0 });
    expect(s1.loadReport.source).toBe('v9');
    expect(mem.get(BEFORE_V10_KEY)).toBe(raw);
    expect(JSON.parse(mem.get(SAVE_KEY)!).schemaVersion).toBe(10);
    new GameSession({ store, now: () => T0 + 1000 });
    expect(mem.get(BEFORE_V10_KEY)).toBe(raw);
  });

  it('volles Gehege: mehr Tiere einer Art als Platz → weiteres Gehege, keins geht verloren', () => {
    const objs = oldObjects().filter((o) => o.kind !== 'animal');
    for (let i = 0; i < 8; i++) objs.push({ id: `h_${i}`, kind: 'animal', type: 'chicken', gx: 2 + i, gy: 2, nick: `H${i}`, state: 'hungry', readyAt: T0, lastPet: 0 });
    const r = deserialize(JSON.stringify({ ...v9State(), objects: objs }), T0);
    const pens = r.state.objects.filter((o) => o.kind === 'pen');
    expect(pens.map((p) => p.kind === 'pen' && p.animals.length)).toEqual([6, 2]);
    expectNothingLost(r.state, objs);
    expect(validateLayout(r.state)).toEqual([]);
  });
});

describe('Migration Spielstand v8 → v10', () => {
  /** Ein typischer v8-Stand: alte Grundstücke, Objekte auf heute ungültigen Plätzen, altes Land-Material. */
  function v8State(): Record<string, unknown> {
    const s = createNewGame(T0) as unknown as Record<string, unknown>;
    const objects = oldObjects().filter((o) => o.type !== 'farmStand');
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
    expect(s.schemaVersion).toBe(10);
    expect(s.coins).toBe(1234);
    expect(s.inventory).toEqual({ wheat: 3, mallet: 2, land_deed: 1, boundary_stake: 1, shovel: 1, pickaxe: 1 });
    expectNothingLost(s, old.objects as Record<string, unknown>[]);
    expect(s.objects.some((o) => o.type === 'farmStand')).toBe(true);
    expect(getObject(s, 'st_tea', 'station')).toMatchObject({ ready: ['winter_punch'], craftedCount: 4 });
    expect(getObject(s, 'd_west', 'deco')).toMatchObject({ gx: 0, gy: 4 });                     // gültig: bleibt stehen
    expect(getObject(s, 'd_platz', 'deco')).not.toMatchObject({ gx: 7, gy: 10 });              // vom Hofplatz verschoben
    expect(validateLayout(s)).toEqual([]);
    expect(r.warnings.filter((w) => !/verschoben|geschenkt|Gehege/.test(w))).toEqual([]);
    // alte Bachwiese (rechts) -> Landstücke rechts; 3 Grundstücke gekauft -> mindestens 3 gekaufte Stücke
    expect(s.ownedPlots).toEqual(expect.arrayContaining(['4,2', '4,3']));
    expect(s.ownedPlots.filter((id) => !terrainMap().plotById(id)!.isStart).length).toBeGreaterThanOrEqual(3);
    for (const id of s.ownedPlots) expect(obstaclesOn(s, id), id).toEqual([]);
  });

  it('danach ist der Stand stabil (Laden = gleicher Stand)', () => {
    const s = deserialize(JSON.stringify(v8State()), T0).state;
    const again = deserialize(serialize(s), T0);
    expect(again.source).toBe('current');
    expect(again.state).toEqual(s);
  });

  it('Session sichert den v8-Stand einmal unverändert, bevor sie v10 speichert', () => {
    const raw = JSON.stringify(v8State());
    const mem = new Map<string, string>([[SAVE_KEY, raw]]);
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s1 = new GameSession({ store, now: () => T0 });
    expect(s1.loadReport.source).toBe('v8');
    expect(mem.get(BEFORE_V9_KEY)).toBe(raw);
    expect(JSON.parse(mem.get(SAVE_KEY)!).schemaVersion).toBe(10);
    new GameSession({ store, now: () => T0 + 1000 });
    expect(mem.get(BEFORE_V9_KEY)).toBe(raw);
  });
});
