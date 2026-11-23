import { describe, expect, it } from 'vitest';
import {
  CONTENT, GameSession, advanceTime, applyCommand, canPlace, createNewGame, deserialize, getObject,
  isFieldReady, serialize, storageUsed, validateContent, validateLayout, type Command, type GameState
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
    s = ok(s, { type: 'collectAnimal', animalId: 'a_1' });
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

describe('Tiere', () => {
  it('Abholen -> hungrig -> füttern -> arbeitet -> fertig', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'collectAnimal', animalId: 'a_1' });
    expect(err(s, { type: 'collectAnimal', animalId: 'a_1' })).toBe('not_ready');
    s = ok(s, { type: 'feedAnimal', animalId: 'a_1' });
    expect(getObject(s, 'a_1', 'animal')!.state).toBe('producing');
    const later = advanceTime(s, T0 + CONTENT.animals.chicken!.produceTime * 1000).state;
    expect(getObject(later, 'a_1', 'animal')!.state).toBe('ready');
  });
  it('Füttern ohne Futter scheitert', () => {
    let s = createNewGame(T0);
    s = ok(s, { type: 'collectAnimal', animalId: 'a_1' });
    s = { ...s, inventory: {} };
    expect(err(s, { type: 'feedAnimal', animalId: 'a_1' })).toBe('missing_items');
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
  it('Nicht auf Weg, Wasser, gesperrtem Land oder anderem Objekt', () => {
    const s = createNewGame(T0);
    expect(canPlace(s, 4, 6, 1, 1).ok).toBe(false);   // Dorfstraße
    expect(canPlace(s, 14, 4, 1, 1).ok).toBe(false);  // Bach
    expect(canPlace(s, 0, 4, 1, 1).ok).toBe(false);   // gesperrte Zone
    expect(canPlace(s, 6, 8, 1, 1).ok).toBe(false);   // Feld
    expect(canPlace(s, 9, 10, 1, 1).ok).toBe(true);
  });
  it('Kaufen + Bewegen + Einlagern', () => {
    let s = { ...createNewGame(T0), coins: 1000 };
    s = ok(s, { type: 'buyDeco', decoType: 'pine', gx: 9, gy: 10 });
    const id = s.objects[s.objects.length - 1]!.id;
    expect(err(s, { type: 'moveObject', objectId: id, gx: 4, gy: 6 })).toBe('blocked');
    s = ok(s, { type: 'moveObject', objectId: id, gx: 2, gy: 11 });
    s = ok(s, { type: 'storeDeco', decoId: id });
    expect(s.storedDecos.pine).toBe(1);
    s = ok(s, { type: 'placeStoredDeco', decoType: 'pine', gx: 9, gy: 10 });
    expect(s.storedDecos.pine).toBeUndefined();
    expect(validateLayout(s)).toEqual([]);
  });
  it('Neues Gebäude kommt verpackt und muss ausgepackt werden', () => {
    let s = { ...createNewGame(T0), coins: 1000 };
    s = ok(s, { type: 'buyStation', stationType: 'teahouse', gx: 10, gy: 9 });
    const st = s.objects.find((o) => o.kind === 'station' && o.type === 'teahouse')!;
    expect(err(s, { type: 'startProduction', stationId: st.id, item: 'winter_punch' })).toBe('locked');
    s = ok(s, { type: 'unwrapStation', stationId: st.id });
    expect(err(s, { type: 'buyStation', stationType: 'teahouse', gx: 2, gy: 10 })).toBe('limit');
  });
  it('Zone freischalten macht Land bebaubar', () => {
    let s = { ...createNewGame(T0), coins: 1000, xp: 95, level: 2 };
    expect(canPlace(s, 0, 4, 1, 1).ok).toBe(false);
    s = ok(s, { type: 'unlockZone', zoneId: 'west_forest' });
    expect(canPlace(s, 0, 4, 1, 1).ok).toBe(true);
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
  it('v8 speichern und laden ist verlustfrei', () => {
    const s = advanceTime(ok({ ...createNewGame(T0), coins: 500 }, { type: 'buyDeco', decoType: 'pine', gx: 9, gy: 10 }), T0).state;
    const r = deserialize(serialize(s), T0);
    expect(r.source).toBe('v8');
    expect(r.state).toEqual(s);
    expect(r.warnings).toEqual([]);
  });
  it('Altstand v6 wird ohne Fortschrittsverlust übernommen', () => {
    const legacy = {
      version: 7, coins: 777, xp: 300, villageName: 'Testhof', barnCapacity: 75,
      unlockedLands: ['west_forest'],
      inventory: { wheat: 12, egg: 3, butterplaetzchen: 2, alterKram: 4 },
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
    expect(s.inventory).toEqual({ wheat: 12, egg: 3, butterplaetzchen: 2 });
    expect(r.warnings.some((w) => w.includes('alterKram'))).toBe(true);
    expect(getObject(s, 'f_1', 'field')!.crop).toBe('berries');          // Feld bleibt bepflanzt
    expect(getObject(s, 'f_9', 'field')).not.toBeNull();                  // Feld in Westzone bleibt
    const bakery = getObject(s, 'st_bakery', 'station')!;
    expect(bakery.craftedCount).toBe(7);
    expect(bakery.ready).toEqual(['lebkuchen']);
    expect(bakery.queue.map((j) => j.item)).toEqual(['waffles', 'butterplaetzchen']);
    expect(s.objects.some((o) => o.type === 'teahouse')).toBe(false);    // nie gebaut
    expect(getObject(s, 'd_7', 'deco')).not.toBeNull();
    expect(s.storedDecos.snowman).toBe(1);                                // stand auf der Straße -> ins Lager
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
