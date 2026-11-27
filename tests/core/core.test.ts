import { describe, expect, it } from 'vitest';
import {
  CONTENT, GameSession, advanceTime, animalCount, applyCommand, canPlace, createNewGame, deserialize, fieldGrowth, getObject,
  terrainMap, isFieldReady, serialize, storageUsed, storageUpgradeMaterials, unlockedCrops, validateContent, validateLayout,
  type Command, type GameState
} from '../../src/core';

const T0 = Date.UTC(2026, 10, 23, 9, 0, 0);
const MIN = 60_000;

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

describe('Inhalte & Startzustand', () => {
  it('Inhalte sind widerspruchsfrei', () => {
    expect(validateContent()).toEqual([]);
  });
  it('Start-Hof hat keine Platzierungsfehler', () => {
    expect(validateLayout(createNewGame(T0))).toEqual([]);
  });
  it('Befehle verändern den alten Stand nie', () => {
    const s = createNewGame(T0);
    const before = serialize(s);
    ok(s, { type: 'harvest', fieldId: 'f_1' });
    expect(serialize(s)).toBe(before);
  });
});

describe('Felder', () => {
  it('Ernte gibt 2, Saatgut kommt aus dem Silo, sonst Münzen', () => {
    let s = createNewGame(T0);
    const wheat0 = s.inventory.wheat ?? 0;
    s = ok(s, { type: 'harvest', fieldId: 'f_1' });
    expect(s.inventory.wheat).toBe(wheat0 + 2);
    s = ok(s, { type: 'plant', fieldId: 'f_1', crop: 'wheat' });
    expect(s.inventory.wheat).toBe(wheat0 + 1);
    // ohne Matcha im Silo kostet das Pflanzen Münzen (ab Level 2)
    s = { ...s, level: 2, xp: 95 };
    s = ok(s, { type: 'harvest', fieldId: 'f_2' });
    const coins = s.coins;
    s = ok(s, { type: 'plant', fieldId: 'f_2', crop: 'matcha' });
    expect(s.coins).toBe(coins - CONTENT.items.matcha!.seedCost!);
  });
  it('Nicht reif = Fehler, nach Wachstumszeit reif', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'harvest', fieldId: 'f_1' });
    s = ok(s, { type: 'plant', fieldId: 'f_1', crop: 'wheat' });
    expect(err(s, { type: 'harvest', fieldId: 'f_1' }, T0 + 30_000)).toBe('not_ready');
    expect(isFieldReady(getObject(s, 'f_1', 'field')!, T0 + 60_000)).toBe(true);
    ok(s, { type: 'harvest', fieldId: 'f_1' }, T0 + 60_000);
  });
  it('Gesperrte Pflanze ist gesperrt', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'harvest', fieldId: 'f_1' });
    expect(err(s, { type: 'plant', fieldId: 'f_1', crop: 'candycane' })).toBe('locked');
  });
  it('fieldGrowth liefert alle 4 Wachstumsstufen mit exakten Grenzen und Restzeit', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'harvest', fieldId: 'f_1' });
    expect(fieldGrowth(getObject(s, 'f_1', 'field')!, T0)).toBeNull();
    s = ok(s, { type: 'plant', fieldId: 'f_1', crop: 'wheat' }); // growTime = 60 s
    const f = getObject(s, 'f_1', 'field')!;
    expect(fieldGrowth(f, T0)).toEqual({ crop: 'wheat', progress: 0, stage: 0, remainingMs: 60_000, ready: false });
    expect(fieldGrowth(f, T0 + 14_999)?.stage).toBe(0);
    expect(fieldGrowth(f, T0 + 15_000)?.stage).toBe(1);           // 25 %
    expect(fieldGrowth(f, T0 + 38_999)?.stage).toBe(1);
    expect(fieldGrowth(f, T0 + 39_000)?.stage).toBe(2);           // 65 %
    expect(fieldGrowth(f, T0 + 59_999)).toMatchObject({ stage: 2, remainingMs: 1, ready: false });
    expect(fieldGrowth(f, T0 + 60_000)).toEqual({ crop: 'wheat', progress: 1, stage: 3, remainingMs: 0, ready: true });
    expect(fieldGrowth(f, T0 + 95_000)).toEqual({ crop: 'wheat', progress: 1, stage: 3, remainingMs: 0, ready: true });
  });
  it('unlockedCrops gibt nur für die Stufe freigeschaltete Feldfrüchte zurück', () => {
    const s1 = createNewGame(T0);
    expect(unlockedCrops(s1).map((c) => c.id)).toEqual(['wheat', 'berries']);
    const s3 = { ...s1, level: 3 };
    expect(unlockedCrops(s3).map((c) => c.id)).toEqual(['wheat', 'berries', 'matcha', 'cocoa', 'cinnamon']);
  });
});

describe('Lager', () => {
  it('Volles Silo blockiert die Ernte, nichts geht verloren', () => {
    let s = createNewGame(T0);
    s = { ...s, inventory: { ...s.inventory, wheat: s.storage.silo - (s.inventory.berries ?? 0) - 1 } };
    expect(storageUsed(s, 'silo')).toBe(s.storage.silo - 1);
    expect(err(s, { type: 'harvest', fieldId: 'f_1' })).toBe('storage_full');
  });
  it('Silo und Scheune sind getrennt', () => {
    let s = createNewGame(T0);
    s = { ...s, inventory: { wheat: s.storage.silo } };
    // Ei geht in die Scheune, obwohl das Silo voll ist
    s = ok(s, { type: 'collectPen', penId: 'pen_1' });
    expect(s.inventory.egg).toBe(1);
  });
  it('Ausbau kostet Münzen und erhöht Kapazität', () => {
    let s = createNewGame(T0);
    s = { ...s, coins: 1000 };
    const cap = s.storage.barn;
    s = ok(s, { type: 'upgradeStorage', storage: 'barn' });
    expect(s.storage.barn).toBe(cap + CONTENT.storage.barn.stepCapacity);
  });
});

describe('Tiere im Gehege (Entsch. 44, 45, 48)', () => {
  const pen = (s: GameState, id = 'pen_1') => getObject(s, id, 'pen')!;
  /** erster freier Platz w×h auf eigenem Land (Hindernisse vorher entfernt) */
  const spot = (s: GameState, w: number, h: number) => {
    for (const id of s.ownedPlots) {
      const p = terrainMap().plotById(id)!;
      for (let gy = p.y0; gy <= p.y1; gy++) for (let gx = p.x0; gx <= p.x1; gx++) if (canPlace(s, gx, gy, w, h).ok) return { gx, gy };
    }
    return null;
  };
  it('Start: Hühnerhof mit 1 Huhn; Abholen -> hungrig -> füttern -> arbeitet -> fertig', () => {
    let s = createNewGame(T0);
    expect(pen(s).type).toBe('chicken_pen');
    expect(pen(s).animals.map((a) => a.nick)).toEqual(['Flöckchen']);
    s = ok(s, { type: 'collectPen', penId: 'pen_1' });
    expect(err(s, { type: 'collectPen', penId: 'pen_1' })).toBe('not_ready');
    s = ok(s, { type: 'feedPen', penId: 'pen_1' });
    expect(pen(s).animals[0]!.state).toBe('producing');
    const later = advanceTime(s, T0 + CONTENT.animals.chicken!.produceTime * 1000).state;
    expect(pen(later).animals[0]!.state).toBe('ready');
  });
  it('Füttern ohne Futter scheitert', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'collectPen', penId: 'pen_1' });
    s = { ...s, inventory: {} };
    expect(err(s, { type: 'feedPen', penId: 'pen_1' })).toBe('missing_items');
  });
  it('ein Tippen füttert alle hungrigen Tiere, so weit das Futter reicht', () => {
    let s = createNewGame(T0);
    s = { ...s, coins: 10_000 };
    for (let i = 0; i < 3; i++) s = ok(s, { type: 'buyAnimal', penId: 'pen_1' });
    expect(pen(s).animals.length).toBe(4);
    s = ok(s, { type: 'collectPen', penId: 'pen_1' });   // Start-Huhn ist fertig
    s = { ...s, inventory: { wheat: 3 * CONTENT.animals.chicken!.feedQty } };
    s = ok(s, { type: 'feedPen', penId: 'pen_1' });
    expect(pen(s).animals.filter((a) => a.state === 'producing').length).toBe(3);
    expect(s.inventory.wheat ?? 0).toBe(0);
    expect(s.stats.fed).toBe(3);
  });
  it('ein Tippen holt alle fertigen Produkte, so weit das Lager reicht', () => {
    let s = createNewGame(T0);
    s = { ...s, coins: 10_000 };
    for (let i = 0; i < 2; i++) s = ok(s, { type: 'buyAnimal', penId: 'pen_1' });
    s = { ...s, inventory: { wheat: 10 } };
    s = ok(s, { type: 'collectPen', penId: 'pen_1' });
    s = ok(s, { type: 'feedPen', penId: 'pen_1' });
    s = advanceTime(s, T0 + CONTENT.animals.chicken!.produceTime * 1000).state;
    expect(pen(s).animals.every((a) => a.state === 'ready')).toBe(true);
    // Scheune hat nur noch Platz für 1 Ei: 1 wird abgeholt, 2 warten (nichts geht verloren)
    s = { ...s, inventory: { ...s.inventory, egg: 0, wool: s.storage.barn - 1 } };
    s = ok(s, { type: 'collectPen', penId: 'pen_1' });
    expect(s.inventory.egg).toBe(1);
    expect(pen(s).animals.filter((a) => a.state === 'ready').length).toBe(2);
    expect(err(s, { type: 'collectPen', penId: 'pen_1' })).toBe('storage_full');
  });
  it('Gehege fasst 6 Tiere; jedes weitere Tier kostet mehr', () => {
    let s = createNewGame(T0);
    s = { ...s, coins: 100_000 };
    let last = 0;
    for (let i = 1; i < CONTENT.pens.chicken_pen!.capacity; i++) {
      const before = s.coins;
      s = ok(s, { type: 'buyAnimal', penId: 'pen_1' });
      expect(before - s.coins).toBeGreaterThan(last);
      last = before - s.coins;
    }
    expect(pen(s).animals.length).toBe(6);
    expect(err(s, { type: 'buyAnimal', penId: 'pen_1' })).toBe('limit');
  });
  it('weiteres Gehege erst ab Stufe, Preis aus den Daten, Platz wird geprüft', () => {
    let s = createNewGame(T0);
    s = { ...s, coins: 100_000, objects: s.objects.filter((o) => o.kind !== 'obstacle') };
    const def = CONTENT.pens.chicken_pen!;
    const at = spot(s, 3, 3)!;
    expect(at).not.toBeNull();
    expect(err(s, { type: 'buyPen', penType: 'chicken_pen', ...at })).toBe('locked');
    s = { ...s, level: def.levels[1]! };
    const before = s.coins;
    s = ok(s, { type: 'buyPen', penType: 'chicken_pen', ...at });
    expect(before - s.coins).toBe(def.costs[1]);
    expect(s.objects.filter((o) => o.kind === 'pen' && o.type === 'chicken_pen').length).toBe(2);
    expect(err(s, { type: 'buyPen', penType: 'chicken_pen', ...at })).toBe('locked');   // 3. Gehege erst ab levels[2]
    s = { ...s, level: 30 };
    expect(err(s, { type: 'buyPen', penType: 'chicken_pen', ...at })).toBe('blocked');  // Platz belegt
    const third = spot(s, 3, 3)!;
    s = ok(s, { type: 'buyPen', penType: 'chicken_pen', ...third });
    expect(err(s, { type: 'buyPen', penType: 'chicken_pen', ...(spot(s, 3, 3) ?? third) })).toBe('limit');
  });
  it('Rentier: erst Koppel kaufen, dann Tier; Kapitel 3 zählt Tiere im Gehege', () => {
    let s = createNewGame(T0);
    s = { ...s, coins: 100_000, objects: s.objects.filter((o) => o.kind !== 'obstacle') };
    s = { ...s, ownedPlots: [...s.ownedPlots, '1,2', '1,3'] };
    const at = spot(s, 4, 4)!;
    s = ok(s, { type: 'buyPen', penType: 'reindeer_pen', ...at });
    const koppel = s.objects.find((o) => o.kind === 'pen' && o.type === 'reindeer_pen')!;
    const ch3 = CONTENT.chapters.find((c) => c.id === 'ch_3')!;
    const hasReindeer = (st: GameState) => ch3.conditions.filter((c) => c.kind === 'hasAnimal').every(() => animalCount(st, 'reindeer') > 0);
    expect(hasReindeer(s)).toBe(false);
    s = ok(s, { type: 'buyAnimal', penId: koppel.id });
    expect(hasReindeer(s)).toBe(true);
    expect(ch3.conditions.some((c) => c.kind === 'hasAnimal' && c.type === 'reindeer')).toBe(true);
  });
});

describe('Produktion', () => {
  it('Schlange läuft nacheinander, auch offline', () => {
    let s = createNewGame(T0);
    s = { ...s, inventory: { wheat: 10, egg: 5, berries: 5 } };
    s = ok(s, { type: 'startProduction', stationId: 'st_bakery', item: 'butterplaetzchen' });
    s = ok(s, { type: 'startProduction', stationId: 'st_bakery', item: 'butterplaetzchen' });
    expect(s.inventory.wheat).toBe(6);
    const t = CONTENT.items.butterplaetzchen!.craftTime! * 1000;
    expect(advanceTime(s, T0 + t - 1).state.objects.find((o) => o.id === 'st_bakery')).toMatchObject({ ready: [] });
    const after = advanceTime(s, T0 + 8 * 3600_000).state; // 8 h offline
    const st = getObject(after, 'st_bakery', 'station')!;
    expect(st.ready).toEqual(['butterplaetzchen', 'butterplaetzchen']);
    expect(st.queue).toEqual([]);
  });
  it('Plätze sind begrenzt, Zutaten werden geprüft', () => {
    let s = createNewGame(T0);
    s = { ...s, inventory: { wheat: 40, egg: 20 } };
    const slots = CONTENT.stations.bakery!.queueSlots;
    for (let i = 0; i < slots; i++) s = ok(s, { type: 'startProduction', stationId: 'st_bakery', item: 'butterplaetzchen' });
    expect(err(s, { type: 'startProduction', stationId: 'st_bakery', item: 'butterplaetzchen' })).toBe('limit');
    expect(err({ ...createNewGame(T0), inventory: {} }, { type: 'startProduction', stationId: 'st_bakery', item: 'waffles' })).toBe('missing_items');
  });
  it('Abholen gibt XP, zählt Meisterschaft', () => {
    let s = createNewGame(T0);
    s = { ...s, inventory: { wheat: 4, egg: 2 } };
    s = ok(s, { type: 'startProduction', stationId: 'st_bakery', item: 'butterplaetzchen' });
    const t = T0 + 10 * MIN;
    const xp = s.xp;
    s = ok(s, { type: 'collectProduct', stationId: 'st_bakery' }, t);
    expect(s.inventory.butterplaetzchen).toBe(1);
    expect(s.xp).toBeGreaterThan(xp);
    expect(getObject(s, 'st_bakery', 'station')!.craftedCount).toBe(1);
  });
});

describe('Platzierung', () => {
  it('Nicht auf Hofplatz, Zufahrt, fremdem Land, Hindernis oder anderem Objekt', () => {
    const s = createNewGame(T0);
    expect(canPlace(s, 7, 10, 1, 1).ok).toBe(false);  // Hofplatz
    expect(canPlace(s, 7, 12, 1, 1).ok).toBe(false);  // Zufahrt (fremdes Land)
    expect(canPlace(s, -2, 4, 1, 1).ok).toBe(false);  // fremdes Land
    expect(canPlace(s, 3, 6, 1, 1).ok).toBe(false);   // Feld (2×2 ab 2,5)
    expect(canPlace(s, 9, 6, 1, 1).ok).toBe(false);   // Gehege (3×3 ab 7,4)
    expect(canPlace(s, -1, 4, 1, 1).ok).toBe(false);  // Schneewehe
    expect(canPlace(s, 9, 1, 1, 1).ok).toBe(true);
  });
  it('Kaufen + Bewegen + Einlagern', () => {
    let s = { ...createNewGame(T0), coins: 1000 };
    s = ok(s, { type: 'buyDeco', decoType: 'pine', gx: 9, gy: 1 });
    const id = s.objects[s.objects.length - 1]!.id;
    expect(err(s, { type: 'moveObject', objectId: id, gx: 7, gy: 10 })).toBe('blocked');
    s = ok(s, { type: 'moveObject', objectId: id, gx: 0, gy: 0 });
    s = ok(s, { type: 'storeDeco', decoId: id });
    expect(s.storedDecos.pine).toBe(1);
    s = ok(s, { type: 'placeStoredDeco', decoType: 'pine', gx: 9, gy: 1 });
    expect(s.storedDecos.pine).toBeUndefined();
    expect(validateLayout(s)).toEqual([]);
  });
  it('Neues Gebäude kommt verpackt und muss ausgepackt werden', () => {
    let s = { ...createNewGame(T0), coins: 1000 };
    expect(err(s, { type: 'buyStation', stationType: 'teahouse', gx: 10, gy: 1 })).toBe('blocked'); // 2×2 ragt aus dem Land
    s = ok(s, { type: 'buyStation', stationType: 'teahouse', gx: 8, gy: 0 });
    const st = s.objects.find((o) => o.kind === 'station' && o.type === 'teahouse')!;
    expect(err(s, { type: 'startProduction', stationId: st.id, item: 'winter_punch' })).toBe('locked');
    s = ok(s, { type: 'unwrapStation', stationId: st.id });
    expect(err(s, { type: 'buyStation', stationType: 'teahouse', gx: 2, gy: 10 })).toBe('limit');
  });
});

describe('Aufträge, Laden, Angebote', () => {
  it('Auftragstafel füllt sich, Erfüllen zahlt aus und ersetzt', () => {
    let s = advanceTime(createNewGame(T0), T0).state;
    expect(s.orders.length).toBe(CONTENT.orders.slots);
    const o = s.orders[0]!;
    s = { ...s, inventory: Object.fromEntries(o.lines.map((l) => [l.item, l.qty])) };
    const r = applyCommand(s, { type: 'fulfillOrder', orderId: o.id }, T0);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.events).toContainEqual({ type: 'coinsChanged', delta: o.coins, at: 'sleigh' });
    s = r.state;
    expect(s.orders.length).toBe(CONTENT.orders.slots);
    expect(s.orders.find((x) => x.id === o.id)).toBeUndefined();
  });
  it('Abgelehnter Auftrag kommt erst nach Wartezeit', () => {
    let s = advanceTime(createNewGame(T0), T0).state;
    s = ok(s, { type: 'skipOrder', orderId: s.orders[0]!.id });
    const fresh = s.orders[s.orders.length - 1]!;
    expect(fresh.availableAt).toBe(T0 + CONTENT.orders.refillSeconds * 1000);
  });
  it('Hofladen: einstellen, verkaufen, abholen', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'listOnStand', slot: 0, item: 'wheat', qty: 2, price: 25 });
    expect(err(s, { type: 'collectStand', slot: 0 })).toBe('not_ready');
    const later = T0 + CONTENT.stand.sellSeconds * 1000;
    const coins = s.coins;
    s = ok(s, { type: 'collectStand', slot: 0 }, later);
    expect(s.coins).toBe(coins + 25);
    expect(s.stats.standSales).toBe(1);
  });
  it('Zu hoher Ladenpreis wird abgelehnt', () => {
    expect(err(createNewGame(T0), { type: 'listOnStand', slot: 0, item: 'wheat', qty: 1, price: 9999 })).toBe('invalid');
  });
});

describe('Zeit, Level, Ziele, Truhe', () => {
  it('Uhr zurückstellen bringt nichts', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'harvest', fieldId: 'f_1' });
    s = ok(s, { type: 'plant', fieldId: 'f_1', crop: 'wheat' }, T0 + 10 * MIN);
    // Uhr springt zurück: Pflanzzeit bleibt beim höchsten gesehenen Zeitpunkt
    const back = applyCommand(s, { type: 'harvest', fieldId: 'f_1' }, T0);
    expect(back.ok).toBe(false);
    expect(s.clockMaxMs).toBe(T0 + 10 * MIN);
  });
  it('Level-up gibt Bonus genau einmal', () => {
    let s = { ...createNewGame(T0), xp: 59 };
    const coins = s.coins;
    s = ok(s, { type: 'harvest', fieldId: 'f_1' }); // +5 XP -> Level 2
    expect(s.level).toBe(2);
    expect(s.coins).toBe(coins + CONTENT.levels[1]!.coinBonus);
  });
  it('Kapitel 1: erst nach Bedingung abholbar, dann nie wieder', () => {
    let s = createNewGame(T0);
    expect(err(s, { type: 'claimGoal', goalId: 'ch_1' })).toBe('not_ready');
    s = { ...s, stats: { ...s.stats, harvests: 4, crafted: 1 } };
    s = ok(s, { type: 'claimGoal', goalId: 'ch_1' });
    expect(err(s, { type: 'claimGoal', goalId: 'ch_1' })).toBe('already_done');
  });
  it('Tagestruhe: einmal pro Tag, Serie zählt', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'claimDaily' });
    expect(err(s, { type: 'claimDaily' }, T0 + 60 * MIN)).toBe('already_done');
    s = ok(s, { type: 'claimDaily' }, T0 + 24 * 60 * MIN);
    expect(s.daily.streak).toBe(2);
  });
  it('Gleicher Seed = gleiche Aufträge (reproduzierbar)', () => {
    const a = advanceTime(createNewGame(T0, 42), T0).state.orders.map((o) => o.lines);
    const b = advanceTime(createNewGame(T0, 42), T0).state.orders.map((o) => o.lines);
    expect(a).toEqual(b);
  });
});

describe('Speicherstand', () => {
  it('v10 speichern und laden ist verlustfrei', () => {
    const s = advanceTime(ok({ ...createNewGame(T0), coins: 500 }, { type: 'buyDeco', decoType: 'pine', gx: 9, gy: 1 }), T0).state;
    const r = deserialize(serialize(s), T0);
    expect(r.source).toBe('current');
    expect(r.state).toEqual(s);
    expect(r.warnings).toEqual([]);
  });
  it('Altstand v6 wird ohne Fortschrittsverlust übernommen', () => {
    const legacy = {
      version: 7, coins: 777, xp: 300, villageName: 'Testhof', barnCapacity: 75,
      unlockedLands: ['west_forest'],
      inventory: { wheat: 12, egg: 3, butterplaetzchen: 2, alterKram: 4, snow_shovel: 2 },
      chalet: { gx: 4, gy: 3 }, christmasTree: { gx: 8, gy: 3 }, wishlistBoard: { gx: 10, gy: 5 }, sleighPos: { gx: 11, gy: 5 }, mailbox: { gx: 3, gy: 5 },
      stations: [
        { id: 'st_bakery', type: 'bakery', gx: 3, gy: 8, built: true, wrapped: false, craftedCount: 7,
          queue: [{ itemId: 'waffles', started: true, finishAt: T0 + 5000 }, { itemId: 'butterplaetzchen', started: false, finishAt: 0 }], ready: ['lebkuchen'] },
        { id: 'st_teahouse', type: 'teahouse', gx: 10, gy: 9, built: false }
      ],
      fields: [{ id: 'f_1', gx: 6, gy: 8, cropId: 'berries', plantedAt: T0 - 1000 }, { id: 'f_9', gx: 0, gy: 4, cropId: null, plantedAt: 0 }],
      animals: [{ id: 'a_1', type: 'chicken', nick: 'Flöckchen', gx: 9, gy: 8, state: 'producing', readyAt: T0 + 9000, lastPet: 0 }],
      decorations: [{ id: 'd_7', type: 'pine', gx: 2, gy: 11 }, { id: 'd_8', type: 'snowman', gx: 4, gy: 6 }],
      standSlots: [{ itemId: 'egg', qty: 1, price: 30, sellAt: T0, sold: true, buyerName: 'Oma Hilde' }],
      stats: { harvests: 20, barnUpgrades: 1 }, claimedAchievements: ['ach_harvest'], claimedChapters: ['ch_1'],
      lastDailyChestDate: '2026-11-22', dailyStreak: 3
    };
    const r = deserialize(JSON.stringify(legacy), T0);
    const s = r.state;
    expect(r.source).toBe('legacy');
    expect(s.coins).toBe(777);
    expect(s.xp).toBe(300);
    expect(s.level).toBe(3);
    expect(s.inventory).toEqual({ wheat: 12, egg: 3, butterplaetzchen: 2, mallet: 2, shovel: 1, pickaxe: 1 }); // Material umbenannt, Startpaket
    expect(s.ownedPlots).toEqual(expect.arrayContaining(CONTENT.map.plots.start));         // Start-Land
    expect(s.ownedPlots.length).toBeGreaterThan(CONTENT.map.plots.start.length);              // gekaufte Westzone bleibt ein gekauftes Stück
    expect(r.warnings.some((w) => w.includes('alterKram'))).toBe(true);
    expect(getObject(s, 'f_1', 'field')!.crop).toBe('berries');          // Feld bleibt bepflanzt
    expect(getObject(s, 'f_9', 'field')).not.toBeNull();                  // Feld in Westzone bleibt
    const bakery = getObject(s, 'st_bakery', 'station')!;
    expect(bakery.craftedCount).toBe(7);
    expect(bakery.ready).toEqual(['lebkuchen']);
    expect(bakery.queue.map((j) => j.item)).toEqual(['waffles', 'butterplaetzchen']);
    expect(s.objects.some((o) => o.type === 'teahouse')).toBe(false);    // nie gebaut
    expect(getObject(s, 'd_7', 'deco')).not.toBeNull();
    expect(getObject(s, 'd_8', 'deco')).toMatchObject({ gx: 4, gy: 6 });   // alte Straße ist jetzt Schnee: bleibt stehen
    const home = CONTENT.start.objects.find((o) => o.type === 'wishlistBoard')!;
    expect(getObject(s, 'wishlistBoard', 'prop')).toMatchObject({ gx: home.gx, gy: home.gy }); // feste Station am Hofplatz
    expect(getObject(s, 'a_1', 'pen')).toBeNull();
    const pen = s.objects.find((o) => o.kind === 'pen')!;
    expect(pen.kind === 'pen' && pen.animals).toEqual([{ id: 'a_1', nick: 'Flöckchen', state: 'producing', readyAt: T0 + 9000, lastPet: 0 }]);
    expect(s.stand[0]).toMatchObject({ item: 'egg', sold: true });
    expect(s.stats.storageUpgrades).toBe(1);
    expect(s.claimedGoals).toEqual(['ach_harvest', 'ch_1']);
    expect(s.daily).toEqual({ lastDay: '2026-11-22', streak: 3 });
    expect(validateLayout(s)).toEqual([]);
  });
  it('Neuerer Spielstand wird nicht überschrieben', () => {
    expect(() => deserialize(JSON.stringify({ schemaVersion: 99 }), T0)).toThrow();
  });
  it('Session: defekter Hauptstand -> Sicherung wird geladen', () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const s1 = new GameSession({ store, now: () => T0 });
    s1.dispatch({ type: 'harvest', fieldId: 'f_1' });
    s1.saveNow();
    s1.dispatch({ type: 'harvest', fieldId: 'f_2' });
    s1.saveNow();
    mem.set('winterhof_save_v8', '{kaputt');
    const s2 = new GameSession({ store, now: () => T0 });
    expect(s2.loadReport.warnings[0]).toContain('Sicherung');
    expect(s2.state.stats.harvests).toBe(1);
  });
});

describe('Winterpost, Dorfbewohner, Tiernamen', () => {
  it('Päckchen packen: max. 3 Waren, Waren werden abgezogen', () => {
    const s = createNewGame(T0);
    expect(err(s, { type: 'packGift', items: { wheat: 4 } })).toBe('limit');
    expect(err(s, { type: 'packGift', items: {} })).toBe('invalid');
    const s2 = ok(s, { type: 'packGift', items: { wheat: 2, egg: 1 } });
    expect(s2.inventory.wheat).toBe((s.inventory.wheat ?? 0) - 2);
    expect(s2.inventory.egg).toBe((s.inventory.egg ?? 0) - 1);
  });
  it('Päckchen empfangen: nur einmal, unbekannte Waren ignoriert', () => {
    const s = createNewGame(T0);
    const s2 = ok(s, { type: 'receiveGift', parcelId: 'p1', items: { wheat: 2, gibtsnicht: 5 } });
    expect(s2.inventory.wheat).toBe((s.inventory.wheat ?? 0) + 2);
    expect(s2.inventory.gibtsnicht).toBeUndefined();
    expect(err(s2, { type: 'receiveGift', parcelId: 'p1', items: { wheat: 2 } })).toBe('already_done');
    expect(err(s, { type: 'receiveGift', parcelId: 'p2', items: { wheat: 99 } })).toBe('invalid');
  });
  it('Trinkgeld höchstens alle 45 Sekunden', () => {
    const s = ok(createNewGame(T0), { type: 'greetVillager' });
    expect(s.coins).toBe(createNewGame(T0).coins + 5);
    expect(err(s, { type: 'greetVillager' }, T0 + 10_000)).toBe('busy');
    ok(s, { type: 'greetVillager' }, T0 + 46_000);
  });
  it('Tier umbenennen', () => {
    const s = ok(createNewGame(T0), { type: 'renameAnimal', penId: 'pen_1', animalId: 'a_1', nick: '  Gacki<b>  ' });
    expect(getObject(s, 'pen_1', 'pen')!.animals[0]!.nick).toBe('Gackib');
    expect(err(s, { type: 'renameAnimal', penId: 'pen_1', animalId: 'a_1', nick: '   ' })).toBe('invalid');
  });
});

describe('Baumaterial (ab Stufe 6)', () => {
  const lvl6 = (s: GameState): GameState => ({ ...s, level: 6, xp: CONTENT.levels[5]!.xpNeeded, coins: 5000 });

  it('Unter Stufe 6: Lagerausbau nur mit Münzen, Funde nur Werkzeuge', () => {
    let s = { ...createNewGame(T0), coins: 5000 };
    expect(storageUpgradeMaterials(s, 'silo')).toEqual({});
    ok(s, { type: 'upgradeStorage', storage: 'silo' });
    let t = T0;
    for (let i = 0; i < 200; i++) {
      const r = applyCommand(s, { type: 'harvest', fieldId: 'f_1' }, t);
      if (!r.ok) throw new Error(r.error.message);
      for (const e of r.events) if (e.type === 'itemFound') expect(CONTENT.items[e.item]!.category).toBe('tool');
      s = { ...ok(r.state, { type: 'plant', fieldId: 'f_1', crop: 'wheat' }, t), xp: 0, level: 1 };
      s = { ...s, inventory: { ...s.inventory, wheat: 5 } };
      t += 61_000;
    }
  });

  it('Ab Stufe 6 braucht der Lagerausbau Material und verbraucht es', () => {
    let s = lvl6(createNewGame(T0));
    const need = storageUpgradeMaterials(s, 'barn');
    expect(Object.keys(need).sort()).toEqual([...CONTENT.materials.storage].sort());
    expect(err(s, { type: 'upgradeStorage', storage: 'barn' })).toBe('missing_items');
    s = { ...s, inventory: { ...s.inventory, ...need } };
    const cap = s.storage.barn;
    s = ok(s, { type: 'upgradeStorage', storage: 'barn' });
    expect(s.storage.barn).toBe(cap + CONTENT.storage.barn.stepCapacity);
    for (const id of Object.keys(need)) expect(s.inventory[id] ?? 0).toBe(0);
  });

  it('Menge je Material steigt mit der Ausbaustufe', () => {
    const s = lvl6(createNewGame(T0));
    const every = CONTENT.materials.storageQtyEvery;
    const big = { ...s, storage: { ...s.storage, silo: CONTENT.storage.silo.baseCapacity + every * CONTENT.storage.silo.stepCapacity } };
    expect(Object.values(storageUpgradeMaterials(big, 'silo'))[0]).toBe(2);
  });

  it('Zufallsfund beim Ernten (Werkzeug oder Material), nie in Aufträgen oder Angeboten', () => {
    let s = lvl6(createNewGame(T0));
    const start = (x: GameState) => Object.entries(x.inventory).filter(([id]) => ['material', 'tool'].includes(CONTENT.items[id]?.category ?? '')).reduce((n, [, q]) => n + q, 0);
    const before = start(s);
    let t = T0;
    let found = 0;
    for (let i = 0; i < 300; i++) {
      const r = applyCommand(s, { type: 'harvest', fieldId: 'f_1' }, t);
      if (!r.ok) throw new Error(r.error.message);
      found += r.events.filter((e) => e.type === 'itemFound').length;
      s = ok(r.state, { type: 'plant', fieldId: 'f_1', crop: 'wheat' }, t);
      s = { ...s, inventory: { ...s.inventory, wheat: 5 } }; // Silo nie voll
      t += 61_000;
    }
    expect(found).toBeGreaterThan(5);
    expect(found).toBeLessThan(45);
    expect(start(s) - before).toBe(found);
    for (const o of s.orders) for (const l of o.lines) expect(['material', 'tool']).not.toContain(CONTENT.items[l.item]!.category);
    if (s.villagerOffer) expect(['material', 'tool']).not.toContain(CONTENT.items[s.villagerOffer.item]!.category);
  });
});

describe('Inhaltsplan', () => {
  it('Jede Stufe 2–12 bringt mindestens 1 Neuheit', () => {
    const unlocks = [
      ...Object.values(CONTENT.items), ...Object.values(CONTENT.animals), ...Object.values(CONTENT.stations),
      ...Object.values(CONTENT.decorations)
    ].map((x) => x.unlockLevel).concat(CONTENT.land.fromLevel, ...Object.values(CONTENT.map.plots.levels));
    for (let l = 2; l <= 12; l++) expect(unlocks.includes(l), `Stufe ${l} ohne Neuheit`).toBe(true);
  });
});
