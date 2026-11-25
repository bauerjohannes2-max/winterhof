// ============================================================================
// Winterhof Core – Befehle & Zeitfortschritt
// Jede Spieleraktion: applyCommand(state, cmd, now) -> neuer Stand + Ereignisse
// oder Fehler. Der alte Stand wird nie verändert.
// ============================================================================
import { CONTENT, footprintOf } from './content';
import { clearCost, decoPrice, nextPlotPrice, obstacleDef, plotStatus } from './land';
import { buildOccupancy, canPlace, isPlotOwned, tileKey } from './map';
import { composeOrder, makeableItems } from './orders';
import { nextRandom, pick, randInt } from './rng';
import { terrainMap } from './terrain';
import {
  allGoals, animalPrice, craftSeconds, dayKey, getObject, goalReady, isFieldReady, levelForXp, nextPen,
  storageFree, storageOf, storageUpgradeCost, storageUpgradeMaterials, countObjects
} from './state';
import type {
  AnimalDef, Command, CommandError, CommandResult, ErrorCode, GameEvent, GameState, Inventory,
  ItemId, Order, StatKey, StationObject
} from './types';

// ---------------------------------------------------------------- Hilfen
class Fail extends Error {
  constructor(public code: ErrorCode, message: string, public detail?: unknown) { super(message); }
}
const fail = (code: ErrorCode, message: string, detail?: unknown): never => { throw new Fail(code, message, detail); };

interface Ctx { s: GameState; now: number; ev: GameEvent[] }

function clone(s: GameState): GameState {
  return structuredClone(s);
}

function newId(s: GameState, prefix: string): string {
  return `${prefix}_${s.nextId++}`;
}

function stat(c: Ctx, k: StatKey, d = 1) { c.s.stats[k] = (c.s.stats[k] ?? 0) + d; }

function hasItems(s: GameState, need: Inventory): boolean {
  return Object.entries(need).every(([id, q]) => (s.inventory[id] ?? 0) >= q);
}

function missing(s: GameState, need: Inventory): Inventory {
  const m: Inventory = {};
  for (const [id, q] of Object.entries(need)) { const have = s.inventory[id] ?? 0; if (have < q) m[id] = q - have; }
  return m;
}

function spend(c: Ctx, need: Inventory) {
  if (!hasItems(c.s, need)) fail('missing_items', 'Es fehlen Waren.', missing(c.s, need));
  for (const [id, q] of Object.entries(need)) {
    const left = (c.s.inventory[id] ?? 0) - q;
    if (left > 0) c.s.inventory[id] = left; else delete c.s.inventory[id];
  }
  c.ev.push({ type: 'itemsSpent', items: { ...need } });
}

/** Prüft Lagerplatz je Silo/Scheune für die Summe aller Zugänge. */
function ensureSpace(s: GameState, items: Inventory) {
  const add = { silo: 0, barn: 0 };
  for (const [id, q] of Object.entries(items)) add[storageOf(id)] += q;
  for (const k of ['silo', 'barn'] as const) {
    if (add[k] > storageFree(s, k)) fail('storage_full', k === 'silo' ? 'Silo ist voll.' : 'Scheune ist voll.', { storage: k });
  }
}

function gain(c: Ctx, items: Inventory, at?: string) {
  ensureSpace(c.s, items);
  for (const [id, q] of Object.entries(items)) {
    c.s.inventory[id] = (c.s.inventory[id] ?? 0) + q;
    if (!c.s.discovered.includes(id)) { c.s.discovered.push(id); c.ev.push({ type: 'discovered', item: id }); }
  }
  c.ev.push({ type: 'itemsGained', items: { ...items }, at });
}

function payCoins(c: Ctx, amount: number) {
  if (c.s.coins < amount) fail('no_coins', `Nicht genug Münzen (${amount} benötigt).`, { need: amount });
  c.s.coins -= amount;
  c.ev.push({ type: 'coinsChanged', delta: -amount });
}

function addCoins(c: Ctx, amount: number, at?: string) {
  if (amount <= 0) return;
  c.s.coins += amount;
  c.ev.push({ type: 'coinsChanged', delta: amount, at });
}

function addXp(c: Ctx, amount: number, at?: string) {
  if (amount <= 0) return;
  c.s.xp += amount;
  c.ev.push({ type: 'xpGained', amount, at });
  const lvl = levelForXp(c.s.xp);
  while (c.s.level < lvl) {
    c.s.level++;
    const def = CONTENT.levels.find((l) => l.level === c.s.level);
    const bonus = def?.coinBonus ?? 0;
    c.s.coins += bonus;
    c.ev.push({ type: 'levelUp', level: c.s.level, coinBonus: bonus });
  }
}

function requireLevel(s: GameState, lvl: number, what: string) {
  if (s.level < lvl) fail('locked', `${what} ab Stufe ${lvl}.`, { level: lvl });
}

function requirePlace(c: Ctx, type: string, gx: number, gy: number, ignore: string | null = null) {
  const fp = footprintOf({ type });
  const r = canPlace(c.s, gx, gy, fp.w, fp.h, ignore);
  if (!r.ok) fail('blocked', 'Dort ist kein Platz.', { reason: r.reason });
}

function itemValue(item: ItemId): number { return CONTENT.items[item]?.sellPrice ?? 0; }

/** Tierart eines Gehege-Typs (Daten sind geprüft, validateContent) */
function animalOfPen(penType: string): AnimalDef {
  return CONTENT.animals[CONTENT.pens[penType]?.animal ?? ''] ?? fail('invalid', 'Unbekanntes Gehege.');
}

// ---------------------------------------------------------------- Aufträge (Regeln in orders.ts)
export function generateOrder(s: GameState, now: number, availableAt = now): Order {
  const o = composeOrder(s);
  return { id: newId(s, 'o'), npc: pick(s, CONTENT.npcs).id, lines: o.lines, coins: o.coins, xp: o.xp, tier: o.tier, reward: o.reward, availableAt };
}

function fillOrders(c: Ctx) {
  while (c.s.orders.length < CONTENT.orders.slots) c.s.orders.push(generateOrder(c.s, c.now));
}

// ---------------------------------------------------------------- Zeitfortschritt
/**
 * Bringt den Stand auf den Zeitpunkt `now` (Offline-Fortschritt inklusive).
 * Idempotent: zweimal mit gleichem now aufrufen ändert nichts mehr.
 */
export function advanceTime(state: GameState, nowRaw: number): { state: GameState; events: GameEvent[] } {
  const s = clone(state);
  const now = Math.max(nowRaw, s.clockMaxMs); // Uhr-Rücksprung abfangen
  s.clockMaxMs = now;
  const c: Ctx = { s, now, ev: [] };

  for (const o of s.objects) {
    if (o.kind === 'station' && !o.wrapped) tickStation(c, o);
    if (o.kind !== 'pen') continue;
    for (const a of o.animals) {
      if (a.state === 'producing' && now >= a.readyAt) {
        a.state = 'ready';
        c.ev.push({ type: 'animalReady', penId: o.id, animalId: a.id });
      }
    }
  }

  s.stand.forEach((slot, i) => {
    if (slot && !slot.sold && now >= slot.sellAt) {
      slot.sold = true;
      slot.buyer = pick(s, CONTENT.npcs).name;
      c.ev.push({ type: 'standSold', slot: i, buyer: slot.buyer });
    }
  });

  if (s.villagerOffer && now >= s.villagerOffer.expiresAt) {
    s.villagerOffer = null;
    c.ev.push({ type: 'offerClosed', accepted: false });
  }
  if (!s.villagerOffer && now >= s.nextOfferAt) {
    const offerable = Object.entries(s.inventory).filter(([id, q]) => q >= 2 && CONTENT.items[id] && !['material', 'tool'].includes(CONTENT.items[id]!.category));
    if (offerable.length > 0) {
      const [item, have] = pick(s, offerable);
      const qty = Math.max(1, Math.min(have - 1, randInt(s, 1, 3)));
      const npc = pick(s, CONTENT.npcs);
      const cfg = CONTENT.villagerOffers;
      s.villagerOffer = {
        npc: npc.id, item, qty,
        coins: Math.round(itemValue(item) * qty * cfg.priceFactor),
        xp: Math.round((CONTENT.items[item]?.xp ?? 0) * qty * 0.5),
        expiresAt: now + cfg.lifetimeSeconds * 1000
      };
      c.ev.push({ type: 'offerArrived', npc: npc.name });
    }
    s.nextOfferAt = now + CONTENT.villagerOffers.intervalSeconds * 1000;
  }

  fillOrders(c);
  growDrifts(c);

  for (const g of allGoals()) if (goalReady(s, g) && !state.claimedGoals.includes(g.id) && !goalReady(state, g)) {
    c.ev.push({ type: 'goalReady', goalId: g.id });
  }
  return { state: s, events: c.ev };
}

/**
 * Schneewehen wachsen nach (Clash-Prinzip, nur Schnee): je Takt eine kleine Wehe auf freiem eigenem Land,
 * mit 1 Feld Abstand zu allem, höchstens drifts.max gleichzeitig. Lange Abwesenheit: nur die letzten Takte zählen.
 */
function growDrifts(c: Ctx) {
  const r = CONTENT.drifts;
  const step = r.everySeconds * 1000;
  if (c.s.nextDriftAt > c.now) return;
  const behind = Math.floor((c.now - c.s.nextDriftAt) / step) + 1;
  if (behind > r.max) c.s.nextDriftAt += (behind - r.max) * step;
  while (c.s.nextDriftAt <= c.now) {
    c.s.nextDriftAt += step;
    const drifts = c.s.objects.filter((o) => o.kind === 'obstacle' && o.type === r.type && isPlotOwned(terrainMap().tileAt(o.gx, o.gy)?.zone ?? '', c.s)).length;
    if (drifts >= r.max) continue;
    const occ = buildOccupancy(c.s.objects);
    const spots: { gx: number; gy: number }[] = [];
    for (const id of c.s.ownedPlots) {
      const p = terrainMap().plotById(id);
      if (!p) continue;
      for (let gy = p.y0; gy <= p.y1; gy++) {
        for (let gx = p.x0; gx <= p.x1; gx++) {
          let free = true;
          for (let dy = -1; dy <= 1 && free; dy++) {
            for (let dx = -1; dx <= 1 && free; dx++) {
              const t = terrainMap().tileAt(gx + dx, gy + dy);
              if (occ.has(tileKey(gx + dx, gy + dy)) || (t && t.surface !== 'none')) free = false;
            }
          }
          if (free && canPlace(c.s, gx, gy, 1, 1, null, occ).ok) spots.push({ gx, gy });
        }
      }
    }
    if (spots.length === 0) continue;
    const at = pick(c.s, spots);
    const id = newId(c.s, 'ob');
    c.s.objects.push({ id, kind: 'obstacle', type: r.type, gx: at.gx, gy: at.gy });
    c.ev.push({ type: 'obstacleSpawned', obstacleId: id });
  }
}

function tickStation(c: Ctx, st: StationObject) {
  const def = CONTENT.stations[st.type]!;
  // Schlange abarbeiten; ein Job läuft immer erst, wenn der vorige fertig ist.
  while (st.queue.length > 0) {
    const job = st.queue[0]!;
    if (job.startAt === null || job.endAt === null) {
      // sollte nach startProduction nicht vorkommen, robust behandeln
      job.startAt = c.now;
      job.endAt = c.now + craftSeconds(st, job.item) * 1000;
    }
    if (c.now < job.endAt) break;
    if (st.ready.length >= def.readySlots) break; // Ausgabe voll -> Produktion pausiert
    st.queue.shift();
    st.ready.push(job.item);
    c.ev.push({ type: 'productionFinished', stationId: st.id, item: job.item });
    const next = st.queue[0];
    if (next) {
      next.startAt = job.endAt;
      next.endAt = job.endAt + craftSeconds(st, next.item) * 1000;
    }
  }
}

// ---------------------------------------------------------------- Befehle
export function applyCommand(state: GameState, cmd: Command, nowRaw: number): CommandResult {
  const adv = advanceTime(state, nowRaw);
  const c: Ctx = { s: adv.state, now: adv.state.clockMaxMs, ev: [...adv.events] };
  try {
    run(c, cmd);
    return { ok: true, state: c.s, events: c.ev };
  } catch (e) {
    if (e instanceof Fail) {
      const error: CommandError = { code: e.code, message: e.message, detail: e.detail };
      return { ok: false, error };
    }
    throw e;
  }
}

function run(c: Ctx, cmd: Command): void {
  const s = c.s;
  switch (cmd.type) {
    case 'plant': {
      const f = getObject(s, cmd.fieldId, 'field') ?? fail('not_found', 'Feld nicht gefunden.');
      if (f.crop) fail('busy', 'Auf dem Feld wächst schon etwas.');
      const it = CONTENT.items[cmd.crop];
      if (!it || it.category !== 'crop') fail('invalid', 'Keine Feldfrucht.');
      requireLevel(s, it!.unlockLevel, it!.name);
      if ((s.inventory[cmd.crop] ?? 0) > 0) spend(c, { [cmd.crop]: 1 });
      else payCoins(c, it!.seedCost ?? 0);
      f.crop = cmd.crop;
      f.plantedAt = c.now;
      stat(c, 'planted');
      c.ev.push({ type: 'planted', fieldId: f.id, crop: cmd.crop });
      return;
    }
    case 'harvest': {
      const f = getObject(s, cmd.fieldId, 'field') ?? fail('not_found', 'Feld nicht gefunden.');
      harvestField(c, f.id);
      return;
    }
    case 'harvestAll': {
      requireLevel(s, 3, 'Alles ernten');
      const ready = s.objects.filter((o) => o.kind === 'field' && isFieldReady(o, c.now));
      if (ready.length === 0) fail('not_ready', 'Kein Feld ist reif.');
      let done = 0;
      for (const f of ready) {
        try { harvestField(c, f.id); done++; } catch (e) { if (e instanceof Fail && e.code === 'storage_full') break; throw e; }
      }
      if (done === 0) fail('storage_full', 'Silo ist voll.', { storage: 'silo' });
      return;
    }
    case 'feedPen': {
      // Hay Day: ein Wisch füttert alle hungrigen Tiere, so weit das Futter reicht
      const pen = getObject(s, cmd.penId, 'pen') ?? fail('not_found', 'Gehege nicht gefunden.');
      const def = animalOfPen(pen.type);
      const hungry = pen.animals.filter((a) => a.state === 'hungry');
      if (hungry.length === 0) fail(pen.animals.length === 0 ? 'not_found' : 'busy', pen.animals.length === 0 ? 'Im Gehege lebt noch kein Tier.' : 'Alle Tiere sind satt.');
      const n = Math.min(hungry.length, Math.floor((s.inventory[def.feedItem] ?? 0) / def.feedQty));
      if (n === 0) fail('missing_items', 'Es fehlt Futter.', { [def.feedItem]: def.feedQty });
      spend(c, { [def.feedItem]: def.feedQty * n });
      const fed = hungry.slice(0, n);
      for (const a of fed) {
        a.state = 'producing';
        a.readyAt = c.now + def.produceTime * 1000;
      }
      stat(c, 'fed', n);
      c.ev.push({ type: 'animalsFed', penId: pen.id, animalIds: fed.map((a) => a.id) });
      return;
    }
    case 'collectPen': {
      // Ein Wisch holt alle fertigen Produkte ab, so weit das Lager reicht
      const pen = getObject(s, cmd.penId, 'pen') ?? fail('not_found', 'Gehege nicht gefunden.');
      const def = animalOfPen(pen.type);
      const ready = pen.animals.filter((a) => a.state === 'ready');
      if (ready.length === 0) fail('not_ready', 'Noch nichts fertig.');
      const n = Math.min(ready.length, storageFree(s, storageOf(def.produceItem)));
      if (n === 0) ensureSpace(s, { [def.produceItem]: 1 });
      const got = ready.slice(0, n);
      gain(c, { [def.produceItem]: n }, pen.id);
      for (const a of got) a.state = 'hungry';
      addXp(c, (CONTENT.items[def.produceItem]?.xp ?? 0) * n, pen.id);
      stat(c, 'collected', n);
      c.ev.push({ type: 'animalsCollected', penId: pen.id, animalIds: got.map((a) => a.id), item: def.produceItem, qty: n });
      for (let i = 0; i < n; i++) maybeFind(c, pen.id, CONTENT.materials.dropChance);
      return;
    }
    case 'petAnimal': {
      const pen = getObject(s, cmd.penId, 'pen') ?? fail('not_found', 'Gehege nicht gefunden.');
      const a = pen.animals.find((x) => x.id === cmd.animalId) ?? fail('not_found', 'Tier nicht gefunden.');
      if (c.now - a.lastPet < 60_000) fail('busy', 'Gerade erst gestreichelt.');
      a.lastPet = c.now;
      stat(c, 'pets');
      addXp(c, 1, pen.id);
      c.ev.push({ type: 'animalPetted', penId: pen.id, animalId: a.id });
      return;
    }
    case 'startProduction': {
      const st = getObject(s, cmd.stationId, 'station') ?? fail('not_found', 'Gebäude nicht gefunden.');
      if (st.wrapped) fail('locked', 'Erst auspacken.');
      const def = CONTENT.stations[st.type]!;
      if (!def.recipes.includes(cmd.item)) fail('invalid', 'Rezept gehört nicht zu diesem Gebäude.');
      const it = CONTENT.items[cmd.item]!;
      requireLevel(s, it.unlockLevel, it.name);
      if (st.queue.length >= def.queueSlots) fail('limit', `Alle ${def.queueSlots} Plätze belegt.`);
      spend(c, it.ingredients ?? {});
      const last = st.queue[st.queue.length - 1];
      const startAt = last?.endAt ?? c.now;
      st.queue.push({ item: cmd.item, startAt, endAt: startAt + craftSeconds(st, cmd.item) * 1000 });
      c.ev.push({ type: 'productionStarted', stationId: st.id, item: cmd.item });
      return;
    }
    case 'collectProduct': {
      const st = getObject(s, cmd.stationId, 'station') ?? fail('not_found', 'Gebäude nicht gefunden.');
      const item = st.ready[0] ?? fail('not_ready', 'Nichts fertig.');
      gain(c, { [item]: 1 }, st.id);
      st.ready.shift();
      st.craftedCount++;
      stat(c, 'crafted');
      addXp(c, CONTENT.items[item]?.xp ?? 0, st.id);
      c.ev.push({ type: 'productCollected', stationId: st.id, item });
      maybeFind(c, st.id, CONTENT.materials.dropChance);
      tickStation(c, st); // pausierte Produktion läuft weiter
      return;
    }
    case 'unwrapStation': {
      const st = getObject(s, cmd.stationId, 'station') ?? fail('not_found', 'Gebäude nicht gefunden.');
      if (!st.wrapped) fail('already_done', 'Schon ausgepackt.');
      st.wrapped = false;
      addXp(c, 20, st.id);
      c.ev.push({ type: 'stationUnwrapped', stationId: st.id });
      return;
    }
    case 'buyStation': {
      const def = CONTENT.stations[cmd.stationType] ?? fail('invalid', 'Unbekanntes Gebäude.');
      requireLevel(s, def.unlockLevel, def.name);
      if (countObjects(s, 'station', def.id) > 0) fail('limit', 'Dieses Gebäude hast du schon.');
      requirePlace(c, def.id, cmd.gx, cmd.gy);
      payCoins(c, def.cost);
      const id = newId(s, 'st');
      s.objects.push({ id, kind: 'station', type: def.id, gx: cmd.gx, gy: cmd.gy, wrapped: true, queue: [], ready: [], craftedCount: 0 });
      c.ev.push({ type: 'objectPlaced', objectId: id });
      return;
    }
    case 'buyPen': {
      const def = CONTENT.pens[cmd.penType] ?? fail('invalid', 'Unbekanntes Gehege.');
      const next = nextPen(s, def.id) ?? fail('limit', `Mehr ${def.name} gehen nicht.`);
      requireLevel(s, next.level, def.name);
      requirePlace(c, def.id, cmd.gx, cmd.gy);
      payCoins(c, next.cost);
      const id = newId(s, 'pen');
      s.objects.push({ id, kind: 'pen', type: def.id, gx: cmd.gx, gy: cmd.gy, animals: [] });
      c.ev.push({ type: 'objectPlaced', objectId: id });
      return;
    }
    case 'buyAnimal': {
      const pen = getObject(s, cmd.penId, 'pen') ?? fail('not_found', 'Gehege nicht gefunden.');
      const pdef = CONTENT.pens[pen.type]!;
      const def = animalOfPen(pen.type);
      requireLevel(s, def.unlockLevel, def.name);
      if (pen.animals.length >= pdef.capacity) fail('limit', `Das Gehege ist voll (${pdef.capacity} Tiere).`);
      payCoins(c, animalPrice(s, def.id));
      const id = newId(s, 'a');
      pen.animals.push({ id, nick: def.name, state: 'hungry', readyAt: c.now, lastPet: 0 });
      c.ev.push({ type: 'animalAdded', penId: pen.id, animalId: id });
      return;
    }
    case 'buyField': {
      const cfg = CONTENT.field;
      requireLevel(s, cfg.unlockLevel, 'Felder');
      if (countObjects(s, 'field') >= cfg.maxCount) fail('limit', `Maximal ${cfg.maxCount} Felder.`);
      requirePlace(c, 'field', cmd.gx, cmd.gy);
      payCoins(c, cfg.cost + cfg.costStep * countObjects(s, 'field'));
      const id = newId(s, 'f');
      s.objects.push({ id, kind: 'field', type: 'field', gx: cmd.gx, gy: cmd.gy, crop: null, plantedAt: c.now });
      c.ev.push({ type: 'objectPlaced', objectId: id });
      return;
    }
    case 'buyDeco': {
      const def = CONTENT.decorations[cmd.decoType] ?? fail('invalid', 'Unbekannte Deko.');
      requireLevel(s, def.unlockLevel, def.name);
      requirePlace(c, def.id, cmd.gx, cmd.gy);
      payCoins(c, decoPrice(s, def.id));
      const id = newId(s, 'd');
      s.objects.push({ id, kind: 'deco', type: def.id, gx: cmd.gx, gy: cmd.gy });
      addXp(c, def.xp, id);
      c.ev.push({ type: 'objectPlaced', objectId: id });
      return;
    }
    case 'placeStoredDeco': {
      if ((s.storedDecos[cmd.decoType] ?? 0) <= 0) fail('missing_items', 'Nicht im Lager.');
      requirePlace(c, cmd.decoType, cmd.gx, cmd.gy);
      s.storedDecos[cmd.decoType]! -= 1;
      if (s.storedDecos[cmd.decoType] === 0) delete s.storedDecos[cmd.decoType];
      const id = newId(s, 'd');
      s.objects.push({ id, kind: 'deco', type: cmd.decoType, gx: cmd.gx, gy: cmd.gy });
      c.ev.push({ type: 'objectPlaced', objectId: id });
      return;
    }
    case 'storeDeco': {
      const d = getObject(s, cmd.decoId, 'deco') ?? fail('not_found', 'Deko nicht gefunden.');
      s.objects = s.objects.filter((o) => o.id !== d.id);
      s.storedDecos[d.type] = (s.storedDecos[d.type] ?? 0) + 1;
      c.ev.push({ type: 'objectStored', objectId: d.id });
      return;
    }
    case 'moveObject': {
      const o = s.objects.find((x) => x.id === cmd.objectId) ?? fail('not_found', 'Objekt nicht gefunden.');
      if (o.kind === 'obstacle') fail('locked', 'Hindernisse lassen sich nicht verschieben, nur räumen.');
      if (o.kind === 'prop' && CONTENT.map.fixed.includes(o.type)) fail('locked', 'Steht fest am Hofplatz.');
      requirePlace(c, o.type, cmd.gx, cmd.gy, o.id);
      o.gx = cmd.gx;
      o.gy = cmd.gy;
      c.ev.push({ type: 'objectMoved', objectId: o.id });
      return;
    }
    case 'sellItem': {
      if (!Number.isInteger(cmd.qty) || cmd.qty <= 0) fail('invalid', 'Ungültige Menge.');
      const it = CONTENT.items[cmd.item] ?? fail('invalid', 'Unbekannte Ware.');
      spend(c, { [cmd.item]: cmd.qty });
      // Sofortverkauf an den Händler: bewusst schlechter als Aufträge/Hofladen
      addCoins(c, Math.max(1, Math.floor(it.sellPrice * CONTENT.market.sellFactor)) * cmd.qty);
      return;
    }
    case 'fulfillOrder': {
      const idx = s.orders.findIndex((o) => o.id === cmd.orderId);
      const ord = s.orders[idx] ?? fail('not_found', 'Auftrag nicht gefunden.');
      if (c.now < ord.availableAt) fail('not_ready', 'Auftrag ist noch unterwegs.');
      spend(c, Object.fromEntries(ord.lines.map((l) => [l.item, l.qty])));
      addCoins(c, ord.coins, 'sleigh');
      addXp(c, ord.xp, 'sleigh');
      stat(c, 'ordersDone');
      s.orders.splice(idx, 1);
      s.orders.push(generateOrder(s, c.now));
      c.ev.push({ type: 'orderFulfilled', orderId: ord.id });
      return;
    }
    case 'skipOrder': {
      const idx = s.orders.findIndex((o) => o.id === cmd.orderId);
      if (idx < 0) fail('not_found', 'Auftrag nicht gefunden.');
      s.orders.splice(idx, 1);
      s.orders.push(generateOrder(s, c.now, c.now + CONTENT.orders.refillSeconds * 1000));
      c.ev.push({ type: 'orderSkipped', orderId: cmd.orderId });
      return;
    }
    case 'listOnStand': {
      if (cmd.slot < 0 || cmd.slot >= s.stand.length) fail('invalid', 'Ungültiger Platz.');
      if (s.stand[cmd.slot]) fail('busy', 'Platz ist belegt.');
      if (!Number.isInteger(cmd.qty) || cmd.qty <= 0 || cmd.qty > 10) fail('invalid', 'Menge 1–10.');
      const it = CONTENT.items[cmd.item] ?? fail('invalid', 'Unbekannte Ware.');
      const maxPrice = Math.ceil(it.sellPrice * cmd.qty * CONTENT.stand.maxPriceFactor);
      if (!Number.isInteger(cmd.price) || cmd.price < 1 || cmd.price > maxPrice) fail('invalid', `Preis 1–${maxPrice}.`);
      spend(c, { [cmd.item]: cmd.qty });
      s.stand[cmd.slot] = { item: cmd.item, qty: cmd.qty, price: cmd.price, sellAt: c.now + CONTENT.stand.sellSeconds * 1000, sold: false, buyer: null };
      return;
    }
    case 'collectStand': {
      const slot = s.stand[cmd.slot] ?? fail('not_found', 'Platz ist leer.');
      if (!slot.sold) fail('not_ready', 'Noch nicht verkauft.');
      addCoins(c, slot.price);
      stat(c, 'standSales');
      s.stand[cmd.slot] = null;
      c.ev.push({ type: 'standCollected', slot: cmd.slot, coins: slot.price });
      return;
    }
    case 'acceptOffer': {
      const off = s.villagerOffer ?? fail('not_found', 'Kein Angebot.');
      spend(c, { [off.item]: off.qty });
      addCoins(c, off.coins);
      addXp(c, off.xp);
      stat(c, 'villagerDeals');
      s.villagerOffer = null;
      c.ev.push({ type: 'offerClosed', accepted: true });
      return;
    }
    case 'declineOffer': {
      if (!s.villagerOffer) fail('not_found', 'Kein Angebot.');
      s.villagerOffer = null;
      c.ev.push({ type: 'offerClosed', accepted: false });
      return;
    }
    case 'upgradeStorage': {
      const cost = storageUpgradeCost(s, cmd.storage) ?? fail('limit', 'Schon maximal ausgebaut.');
      const mats = storageUpgradeMaterials(s, cmd.storage);
      if (!hasItems(s, mats)) fail('missing_items', 'Es fehlt Baumaterial.', missing(s, mats));
      payCoins(c, cost);
      if (Object.keys(mats).length > 0) spend(c, mats);
      const d = CONTENT.storage[cmd.storage];
      s.storage[cmd.storage] = Math.min(d.maxCapacity, s.storage[cmd.storage] + d.stepCapacity);
      stat(c, 'storageUpgrades');
      addXp(c, 25);
      c.ev.push({ type: 'storageUpgraded', storage: cmd.storage, capacity: s.storage[cmd.storage] });
      return;
    }
    case 'unlockPlot': {
      const plot = terrainMap().plotById(cmd.plotId) ?? fail('not_found', 'Unbekanntes Landstück.');
      const status = plotStatus(s, plot);
      if (status === 'owned') fail('already_done', 'Das Land gehört dir schon.');
      if (status === 'not_adjacent') fail('locked', 'Nur Land, das an deinen Hof grenzt.', { reason: 'not_adjacent' });
      if (status === 'level') fail('locked', `Dieses Land ab Stufe ${plot.minLevel}.`, { level: plot.minLevel });
      const price = nextPlotPrice(s);
      if (!hasItems(s, price.materials)) fail('missing_items', 'Es fehlt Land-Material.', missing(s, price.materials));
      payCoins(c, price.coins);
      if (Object.keys(price.materials).length > 0) spend(c, price.materials);
      s.ownedPlots.push(plot.id);
      stat(c, 'landsUnlocked');
      addXp(c, 40);
      c.ev.push({ type: 'plotUnlocked', plotId: plot.id });
      return;
    }
    case 'clearObstacle': {
      const o = getObject(s, cmd.obstacleId, 'obstacle') ?? fail('not_found', 'Hindernis nicht gefunden.');
      const def = obstacleDef(o) ?? fail('invalid', 'Unbekanntes Hindernis.');
      if (!isPlotOwned(terrainMap().tileAt(o.gx, o.gy)?.zone ?? '', s)) fail('locked', 'Erst das Land kaufen.');
      const cost = clearCost(s, def);
      const lack = cost.missing[def.tool] ?? 0;
      if (lack > 0) {
        if (!cmd.buyMissing) fail('missing_items', 'Es fehlt Werkzeug.', { missing: cost.missing, coins: cost.coins });
        payCoins(c, cost.coins);
        // Sofortkauf: wird direkt benutzt, kommt nie ins Lager (kein Horten, kein Lagerplatz nötig)
        s.inventory[def.tool] = (s.inventory[def.tool] ?? 0) + lack;
        c.ev.push({ type: 'toolsBought', items: { ...cost.missing }, coins: cost.coins });
      }
      spend(c, cost.tools);
      s.objects = s.objects.filter((x) => x.id !== o.id);
      if (def.yieldsDeco) s.storedDecos[def.yieldsDeco] = (s.storedDecos[def.yieldsDeco] ?? 0) + 1;
      stat(c, 'obstaclesCleared');
      addXp(c, def.xp, o.id);
      c.ev.push({ type: 'obstacleCleared', obstacleId: o.id, obstacleType: o.type, gx: o.gx, gy: o.gy, ...(def.yieldsDeco ? { deco: def.yieldsDeco } : {}) });
      maybeFind(c, o.id, CONTENT.tools.clearFindChance);
      return;
    }
    case 'claimDaily': {
      const today = dayKey(c.now);
      if (s.daily.lastDay === today) fail('already_done', 'Heute schon geöffnet.');
      const yesterday = dayKey(c.now - 86_400_000);
      const streak = s.daily.lastDay === yesterday ? s.daily.streak + 1 : 1;
      const cfg = CONTENT.daily;
      const coins = cfg.baseCoins + Math.min(streak - 1, cfg.maxStreakBonus) * cfg.streakCoins;
      const pool = [...makeableItems(s)].filter((i) => ['crop', 'animal'].includes(CONTENT.items[i]!.category));
      const item = pick(s, pool);
      const items: Inventory = { [item]: CONTENT.items[item]!.category === 'material' ? 1 : randInt(s, 1, 3) };
      // Truhe verfällt nie: bei vollem Lager nur Münzen
      try { gain(c, items, 'dailyChest'); } catch (e) { if (!(e instanceof Fail)) throw e; for (const k of Object.keys(items)) delete items[k]; }
      addCoins(c, coins, 'dailyChest');
      addXp(c, 10, 'dailyChest');
      s.daily = { lastDay: today, streak };
      stat(c, 'chestsOpened');
      c.ev.push({ type: 'dailyClaimed', streak, coins, items });
      return;
    }
    case 'claimGoal': {
      const g = allGoals().find((x) => x.id === cmd.goalId) ?? fail('not_found', 'Unbekanntes Ziel.');
      if (s.claimedGoals.includes(g.id)) fail('already_done', 'Schon abgeholt.');
      if (!goalReady(s, g)) fail('not_ready', 'Ziel noch nicht erreicht.');
      s.claimedGoals.push(g.id);
      addCoins(c, g.coins);
      addXp(c, g.xp);
      c.ev.push({ type: 'goalClaimed', goalId: g.id });
      return;
    }
    case 'setSetting': {
      const allowed: Record<string, (v: unknown) => boolean> = {
        sfx: (v) => typeof v === 'boolean',
        music: (v) => typeof v === 'boolean',
        lighting: (v) => v === 'day' || v === 'dusk' || v === 'night' || v === 'auto'
      };
      if (!allowed[cmd.key]?.(cmd.value)) fail('invalid', 'Ungültige Einstellung.');
      (s.settings as Record<string, unknown>)[cmd.key] = cmd.value;
      return;
    }
    case 'rename': {
      const clean = (v: string) => v.replace(/[<>]/g, '').trim().slice(0, 24);
      if (cmd.villageName !== undefined) { const v = clean(cmd.villageName); if (!v) fail('invalid', 'Name leer.'); s.villageName = v; }
      if (cmd.playerName !== undefined) { const v = clean(cmd.playerName); if (!v) fail('invalid', 'Name leer.'); s.playerName = v; }
      return;
    }
    case 'renameAnimal': {
      const pen = getObject(s, cmd.penId, 'pen') ?? fail('not_found', 'Gehege nicht gefunden.');
      const a = pen.animals.find((x) => x.id === cmd.animalId) ?? fail('not_found', 'Tier nicht gefunden.');
      const v = cmd.nick.replace(/[<>]/g, '').trim().slice(0, 18);
      if (!v) fail('invalid', 'Name leer.');
      a.nick = v;
      return;
    }
    case 'greetVillager': {
      // Kleines Trinkgeld, höchstens alle 45 Sekunden
      if (c.now - s.lastTipAt < 45_000) fail('busy', 'Schönen Wintertag auf dem Hof.');
      s.lastTipAt = c.now;
      addCoins(c, 5);
      c.ev.push({ type: 'villagerTipped', coins: 5 });
      return;
    }
    case 'packGift': {
      const entries = Object.entries(cmd.items).filter(([, q]) => q > 0);
      const total = entries.reduce((a, [, q]) => a + q, 0);
      if (total === 0) fail('invalid', 'Päckchen ist leer.');
      if (total > 3) fail('limit', 'Höchstens 3 Waren pro Päckchen.');
      for (const [id, q] of entries) if (!CONTENT.items[id] || !Number.isInteger(q)) fail('invalid', 'Ungültige Ware.');
      const items = Object.fromEntries(entries);
      spend(c, items);
      addXp(c, 12);
      c.ev.push({ type: 'giftPacked', items });
      return;
    }
    case 'receiveGift': {
      if (!cmd.parcelId) fail('invalid', 'Päckchen ohne Kennung.');
      if (s.claimedGifts.includes(cmd.parcelId)) fail('already_done', 'Dieses Päckchen wurde bereits ausgepackt.');
      const items: Inventory = {};
      let total = 0;
      for (const [id, q] of Object.entries(cmd.items)) {
        const n = Math.floor(Number(q));
        if (!CONTENT.items[id] || !(n > 0)) continue;
        items[id] = n;
        total += n;
      }
      if (total === 0 || total > 3) fail('invalid', 'Päckchen ist ungültig.');
      gain(c, items, 'mailbox');
      s.claimedGifts.push(cmd.parcelId);
      addXp(c, 18);
      c.ev.push({ type: 'giftReceived', parcelId: cmd.parcelId, items });
      return;
    }
    default: {
      const never: never = cmd;
      fail('invalid', `Unbekannter Befehl ${(never as { type: string }).type}`);
    }
  }
}

/** Zufallsfund: Werkzeug (ab Start) oder Baumaterial (ab materials.fromLevel). Bei voller Scheune kein Fund, nie ein Fehler. */
function maybeFind(c: Ctx, at: string, chance: number) {
  const m = CONTENT.materials;
  if (nextRandom(c.s) >= chance) return;
  const pool = [...CONTENT.tools.items, ...(c.s.level >= m.fromLevel ? [...m.storage, ...m.land] : [])]
    .filter((id) => (CONTENT.items[id]?.unlockLevel ?? 99) <= c.s.level);
  if (pool.length === 0 || storageFree(c.s, 'barn') < 1) return;
  const item = pick(c.s, pool);
  gain(c, { [item]: 1 }, at);
  c.ev.push({ type: 'itemFound', item, at });
}

function harvestField(c: Ctx, fieldId: string) {
  const f = getObject(c.s, fieldId, 'field') ?? fail('not_found', 'Feld nicht gefunden.');
  if (!f.crop) fail('not_ready', 'Feld ist leer.');
  if (!isFieldReady(f, c.now)) fail('not_ready', 'Noch nicht reif.');
  const it = CONTENT.items[f.crop!]!;
  const qty = it.harvestYield ?? 2;
  gain(c, { [it.id]: qty }, f.id);
  addXp(c, it.xp, f.id);
  stat(c, 'harvests');
  c.ev.push({ type: 'harvested', fieldId: f.id, crop: it.id, qty });
  f.crop = null;
  f.plantedAt = c.now;
  maybeFind(c, f.id, CONTENT.materials.dropChance);
}

// nextRandom wird re-exportiert, damit Tests den Seed-Verlauf prüfen können
export { nextRandom };
