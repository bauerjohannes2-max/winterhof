// Wirtschafts-Bot (gemeinsam für economy.*.test.ts, aufgeteilt, damit die Verläufe parallel laufen).
// Wirtschafts-Simulation: ein Vielspieler-Bot spielt 7 Tage je 3 Sitzungen à 20 Minuten, tippt jede Minute.
// Baustein 2c (Entscheidung 18): mehrere Zufallsverläufe statt einem, damit Glück den Fortschritt nicht bestimmt.
// Prüft Leitplanken (kein Festhängen, Tempo etwa Stufe 15 in Woche 1, Verläufe nah beieinander), keine exakten Werte.
import { expect } from 'vitest';
import {
  CONTENT, advanceTime, applyCommand, buildOccupancy, canPlace, clearCost, createNewGame, decoPrice, footprintOf, isFieldReady, isPlotOwned,
  nextPlotPrice, obstacleDef, plotStatus, storageFree, terrainMap, type Command, type GameState
} from '../../../src/core';

const tally = { toolCoins: 0, cleared: 0, earned: 0, decoCoins: 0, bySource: {} as Record<string, number> };

function tryCmd(s: GameState, cmd: Command, now: number): GameState {
  const r = applyCommand(s, cmd, now);
  if (!r.ok) return s;
  for (const e of r.events) if (e.type === 'coinsChanged' && e.delta > 0) { tally.earned += e.delta; tally.bySource[cmd.type] = (tally.bySource[cmd.type] ?? 0) + e.delta; }
  return r.state;
}

/** Erstes freies Feld auf eigenem Land (Start-Hof zuerst). */
function freeSpot(s: GameState, w: number, h: number): { gx: number; gy: number } | null {
  const plots = [...s.ownedPlots].map((id) => terrainMap().plotById(id)!);
  const occ = buildOccupancy(s.objects);   // einmal je Suche, nicht je Feld
  for (const p of plots) for (let gy = p.y0; gy <= p.y1; gy++) for (let gx = p.x0; gx <= p.x1; gx++) {
    if (canPlace(s, gx, gy, w, h, null, occ).ok) return { gx, gy };
  }
  return null;
}


/** Land: Hindernisse auf eigenem Land räumen (fehlendes Werkzeug nur mit Polster kaufen), bei Platznot Land kaufen. */
function botLand(s0: GameState, now: number): GameState {
  let s = s0;
  for (const o of s.objects) {
    if (o.kind !== 'obstacle' || !isPlotOwned(terrainMap().tileAt(o.gx, o.gy)!.zone, s)) continue;
    const cost = clearCost(s, obstacleDef(o)!);
    const r = applyCommand(s, { type: 'clearObstacle', obstacleId: o.id, buyMissing: s.coins > cost.coins + 500 }, now);
    if (r.ok) { s = r.state; tally.cleared++; tally.toolCoins += cost.coins; }
  }
  const price = nextPlotPrice(s);
  // Ein neues Gebäude (neue Rezepte) geht vor: dafür spart der Spieler, Land kauft er dann nur bei Platznot
  const savingForStation = Object.values(CONTENT.stations).some((d) => d.unlockLevel <= s.level && !s.objects.some((o) => o.type === d.id));
  if (!freeSpot(s, 2, 2) || (!savingForStation && s.coins > price.coins + 600)) {
    const next = terrainMap().plots.filter((p) => plotStatus(s, p) === 'buyable').sort((a, b) => Math.abs(a.col - 3.5) + Math.abs(a.row - 3.5) - Math.abs(b.col - 3.5) - Math.abs(b.row - 3.5))[0];
    if (next) s = tryCmd(s, { type: 'unlockPlot', plotId: next.id }, now);
  }
  return s;
}

/** Spieler-Modell (Baustein 2c, Entscheidung 19): plant nach Bedarf statt nach fester Liste. */
const plan = { session: 0, filler: 0, seen: new Map<string, number>() };
/** Ein Auftrag, der so viele Sitzungen offen bleibt, wird abgelehnt (echte Spieler werfen hängende Zettel weg). */
const SKIP_AFTER_SESSIONS = 3;
/** Ohne Bedarf: Futter-Pflanzen auf Vorrat. */
const FILLER_CROPS = ['wheat', 'wheat', 'berries'];
/** Deko je eigenem Landstück, die ein Vielspieler in Woche 1 aufstellt (Hannes: maßvoll, rund 40 insgesamt). */
const DECO_PER_PLOT = 2.5;

/** Bedarf wie ein aufmerksamer Spieler: offene Aufträge bis zu den Rohwaren aufgelöst, dazu Futter für jedes Tier.
 * Was im Lager liegt, wächst, in Arbeit ist oder im Tier entsteht, wird angerechnet.
 * missing = was noch fehlt, reserved = was vom Lager für Aufträge und Futter schon verplant ist. */
function demand(s: GameState): { missing: Map<string, number>; reserved: Map<string, number> } {
  const supply = new Map<string, number>(Object.entries(s.inventory));
  const add = (m: Map<string, number>, i: string, q: number) => m.set(i, (m.get(i) ?? 0) + q);
  const producer = (item: string) => Object.values(CONTENT.animals).find((a) => a.produceItem === item);
  for (const o of s.objects) {
    if (o.kind === 'station') for (const q of [...o.queue.map((x) => x.item), ...o.ready]) add(supply, q, 1);
    if (o.kind === 'field' && o.crop) add(supply, o.crop, CONTENT.items[o.crop]!.harvestYield ?? 2);
    if (o.kind === 'animal' && o.state !== 'hungry') add(supply, CONTENT.animals[o.type]!.produceItem, 1);
  }
  const missing = new Map<string, number>(), reserved = new Map<string, number>();
  const expand = (item: string, qty: number, depth: number): void => {
    const have = supply.get(item) ?? 0, take = Math.min(have, qty);
    supply.set(item, have - take);
    add(reserved, item, take);
    const lack = qty - take;
    if (lack <= 0 || depth > 6) return;
    add(missing, item, lack);
    const it = CONTENT.items[item]!;
    if (it.category === 'crafted') for (const [i, n] of Object.entries(it.ingredients ?? {})) expand(i, n * lack, depth + 1);
    const a = it.category === 'animal' ? producer(item) : undefined;
    if (a) expand(a.feedItem, a.feedQty * lack, depth + 1);
  };
  for (const o of s.orders) for (const l of o.lines) expand(l.item, l.qty, 0);
  for (const o of s.objects) if (o.kind === 'animal') { const a = CONTENT.animals[o.type]!; expand(a.feedItem, a.feedQty, 0); }
  return { missing, reserved };
}

function botStep(s0: GameState, now: number, sessionStart = false): GameState {
  let s = advanceTime(s0, now).state;
  // 0. Lager zuerst ausbauen (mit Material), Land freischalten
  for (const kind of ['barn', 'silo'] as const) if (storageFree(s, kind) < 15) s = tryCmd(s, { type: 'upgradeStorage', storage: kind }, now);
  s = botLand(s, now);
  // 1. ernten, abholen
  for (const o of s.objects) {
    if (o.kind === 'field' && isFieldReady(o, now)) s = tryCmd(s, { type: 'harvest', fieldId: o.id }, now);
    if (o.kind === 'animal' && o.state === 'ready') s = tryCmd(s, { type: 'collectAnimal', animalId: o.id }, now);
    if (o.kind === 'station') for (let i = 0; i < 6; i++) s = tryCmd(s, { type: 'collectProduct', stationId: o.id }, now);
    if (o.kind === 'station' && o.wrapped) s = tryCmd(s, { type: 'unwrapStation', stationId: o.id }, now);
  }
  // 2. Aufträge erfüllen; zu Sitzungsbeginn höchstens einen Auftrag ablehnen, der schon lange hängt (wie ein echter Spieler)
  for (const o of [...s.orders]) s = tryCmd(s, { type: 'fulfillOrder', orderId: o.id }, now);
  if (sessionStart) {
    plan.session++;
    for (const o of s.orders) if (!plan.seen.has(o.id)) plan.seen.set(o.id, plan.session);
    const stuck = s.orders.filter((o) => plan.session - plan.seen.get(o.id)! >= SKIP_AFTER_SESSIONS).sort((a, b) => plan.seen.get(a.id)! - plan.seen.get(b.id)!)[0];
    if (stuck) s = tryCmd(s, { type: 'skipOrder', orderId: stuck.id }, now);
  }
  // 3. Tiere füttern, dann nach Bedarf pflanzen: was den offenen Aufträgen und dem Futter fehlt, zuerst
  for (const o of s.objects) if (o.kind === 'animal' && o.state === 'hungry') s = tryCmd(s, { type: 'feedAnimal', animalId: o.id }, now);
  let d = demand(s);
  const cropNeed = [...d.missing].filter(([i]) => CONTENT.items[i]!.category === 'crop' && CONTENT.items[i]!.unlockLevel <= s.level);
  for (const o of s.objects) {
    if (o.kind !== 'field' || o.crop) continue;
    cropNeed.sort((a, b) => b[1] - a[1]);
    const top = cropNeed[0];
    const crop = top && top[1] > 0 ? top[0] : FILLER_CROPS[plan.filler++ % FILLER_CROPS.length]!;
    if (top && top[1] > 0) top[1] -= CONTENT.items[crop]!.harvestYield ?? 2;
    s = tryCmd(s, { type: 'plant', fieldId: o.id, crop }, now);
  }
  // 4. produzieren: zuerst, was Aufträgen fehlt; freie Plätze nur mit Waren, deren Zutaten übrig sind
  d = demand(s);
  for (const st of s.objects.filter((o) => o.kind === 'station')) {
    const recipes = CONTENT.stations[st.type]!.recipes;
    const wanted = recipes.filter((i) => (d.missing.get(i) ?? 0) > 0).sort((a, b) => d.missing.get(b)! - d.missing.get(a)!);
    for (const item of wanted) {
      for (let n = d.missing.get(item)!; n > 0; n--) {
        const before = s;
        s = tryCmd(s, { type: 'startProduction', stationId: st.id, item }, now);
        if (s === before) break;
      }
    }
    const spare = (item: string) => Object.entries(CONTENT.items[item]!.ingredients ?? {}).every(([i, n]) => (s.inventory[i] ?? 0) - (d.reserved.get(i) ?? 0) >= n * 2);
    const extra = recipes.filter((i) => CONTENT.items[i]!.unlockLevel <= s.level && spare(i)).sort((a, b) => CONTENT.items[b]!.sellPrice - CONTENT.items[a]!.sellPrice)[0];
    if (extra) s = tryCmd(s, { type: 'startProduction', stationId: st.id, item: extra }, now);
  }
  // 5. bei vollem Lager das verkaufen, was am meisten übrig ist (nichts, was ein Auftrag braucht)
  d = demand(s);
  for (const kind of ['silo', 'barn'] as const) {
    if (storageFree(s, kind) < 5) {
      const surplus = Object.entries(s.inventory).filter(([i]) => CONTENT.items[i]!.storage === kind)
        .map(([i, q]) => [i, q - (d.reserved.get(i) ?? 0) - 2] as const).filter(([, q]) => q > 0).sort((a, b) => b[1] - a[1])[0];
      if (surplus) s = tryCmd(s, { type: 'sellItem', item: surplus[0], qty: Math.ceil(surplus[1] / 2) }, now);
    }
  }
  // 6. investieren: Gebäude, Tiere, Felder, Lager
  for (const [id, def] of Object.entries(CONTENT.stations)) {
    if (s.level >= def.unlockLevel && !s.objects.some((o) => o.type === id) && s.coins >= def.cost) {
      const at = freeSpot(s, 2, 2);
      if (at) s = tryCmd(s, { type: 'buyStation', stationType: id, ...at }, now);
    }
  }
  for (const id of Object.keys(CONTENT.animals)) {
    for (let i = 0; i < 10 && s.coins > 300; i++) {
      const at = freeSpot(s, 1, 1);
      const before = s;
      if (at) s = tryCmd(s, { type: 'buyAnimal', animalType: id, ...at }, now);
      if (s === before) break;
    }
  }
  for (let i = 0; i < 40 && s.coins > 200; i++) {
    const at = freeSpot(s, 1, 1);
    const before = s;
    if (at) s = tryCmd(s, { type: 'buyField', ...at }, now);
    if (s === before) break;
  }
  for (const kind of ['silo', 'barn'] as const) if (storageFree(s, kind) < 10 && s.coins > 400) s = tryCmd(s, { type: 'upgradeStorage', storage: kind }, now);
  // 7. Weihnachtsdeko maßvoll (Entscheidung 19: etwa 2–3 Teile je Landstück); Polster für Land bleibt
  const reserve = nextPlotPrice(s).coins + 800;
  const decoRoom = Math.floor(s.ownedPlots.length * DECO_PER_PLOT) - s.objects.filter((o) => o.kind === 'deco').length;
  const decos = Object.values(CONTENT.decorations).filter((d) => d.group !== 'path' && d.unlockLevel <= s.level).sort((a, b) => b.cost - a.cost);
  for (let i = 0; i < Math.min(3, decoRoom) && decos.length; i++) {
    const d = decos.find((x) => decoPrice(s, x.id) <= s.coins - reserve);
    if (!d) break;
    const fp = footprintOf({ kind: 'deco', type: d.id });
    const at = freeSpot(s, fp.w, fp.h);
    if (!at) break;
    const price = decoPrice(s, d.id);
    const before = s;
    s = tryCmd(s, { type: 'buyDeco', decoType: d.id, ...at }, now);
    if (s === before) break;
    tally.decoCoins += price;
  }
  s = tryCmd(s, { type: 'claimDaily' }, now);
  for (const g of [...CONTENT.chapters, ...CONTENT.achievements]) s = tryCmd(s, { type: 'claimGoal', goalId: g.id }, now);
  return s;
}

/** Nächstes großes Sparziel: Landstück oder ein noch fehlendes Gebäude bis 2 Stufen voraus (Entscheidung 19). */
function nextGoal(s: GameState): number {
  const stations = Object.values(CONTENT.stations).filter((d) => d.unlockLevel <= s.level + 2 && !s.objects.some((o) => o.type === d.id)).map((d) => d.cost);
  return Math.max(nextPlotPrice(s).coins, ...stations);
}

/** Höchste Stufe, für die es schon Münz-Ziele gibt (Gebäude, Tiere). Darüber fehlen Inhalte (INHALTSPLAN), dort prüft der Test das Horten noch nicht. */
export const CONTENT_MAX_LEVEL = Math.max(...Object.values(CONTENT.stations).map((d) => d.unlockLevel), ...Object.values(CONTENT.animals).map((a) => a.unlockLevel));

export interface Run { coinsByDay: number[]; goalByDay: number[]; bySource: Record<string, number>; seed: number; levelByDay: number[]; coins: number; earned: number; orders: number; land: number; cleared: number; deco: number }

export function runBot(seed: number): Run {
  Object.assign(tally, { toolCoins: 0, cleared: 0, earned: 0, decoCoins: 0, bySource: {} });
  Object.assign(plan, { session: 0, filler: 0, seen: new Map() });
  const T0 = Date.UTC(2026, 10, 23, 7, 0, 0);
  let s = createNewGame(T0, seed);
  const levelByDay: number[] = [];
  const coinsByDay: number[] = [];
  const goalByDay: number[] = [];
  for (let day = 0; day < 7; day++) {
    for (const startHour of [7, 13, 19]) {
      for (let m = 0; m <= 20; m += 1) {
        s = botStep(s, T0 + day * 86_400_000 + (startHour - 7) * 3600_000 + m * 60_000, m === 0);
      }
    }
    levelByDay.push(s.level);
    coinsByDay.push(s.coins);
    goalByDay.push(nextGoal(s));
  }
  expect(s.coins).toBeGreaterThanOrEqual(0);
  expect(s.ownedPlots.length).toBeLessThan(terrainMap().plots.length);             // nicht alles Land in einer Woche
  return { coinsByDay, goalByDay, bySource: { ...tally.bySource }, seed, levelByDay, coins: s.coins, earned: tally.earned, orders: s.stats.ordersDone, land: s.ownedPlots.length, cleared: tally.cleared, deco: tally.decoCoins };
}

/** Leitplanken je Verlauf (Entscheidung 18). Absolute Bänder, damit Glück den Fortschritt nicht bestimmt:
 * Stufe 14–16 nach Woche 1 heißt höchstens 2 Stufen Unterschied zwischen beliebigen Verläufen. */
export function checkRun(r: Run): void {
  console.log(`Verlauf ${r.seed}: Stufe je Tag ${r.levelByDay.join(',')} | eingenommen ${r.earned} | Deko ${r.deco} | Münzen je Tag ${r.coinsByDay.join(',')} (Ziel ${r.goalByDay.join(',')}) | Aufträge ${r.orders} | Land ${r.land} | geräumt ${r.cleared}`);
  const at = `Verlauf ${r.seed}`;
  expect(r.levelByDay[0], at).toBeGreaterThanOrEqual(3);        // Tag 1: spürbarer Fortschritt
  expect(r.levelByDay[0], at).toBeLessThanOrEqual(8);           // ...aber nicht durchgespielt
  expect(r.levelByDay[6], at).toBeGreaterThanOrEqual(14);       // Woche 1 etwa Stufe 15
  expect(r.levelByDay[6], at).toBeLessThanOrEqual(16);
  expect(r.orders, at).toBeGreaterThan(30);                      // Aufträge tragen das Spiel
  expect(r.land, at).toBeGreaterThan(CONTENT.map.plots.start.length + 2); // Land wächst spürbar
  expect(r.cleared, at).toBeGreaterThan(10);                     // Räumen ist Teil des Spiels
  // Münzen haben ein Ziel: Sparen ja, Horten nein (Entscheidung 19) – an jedem Tag, solange es für die Stufe Inhalte gibt
  for (let d = 0; d < 7 && r.levelByDay[d]! <= CONTENT_MAX_LEVEL; d++) expect(r.coinsByDay[d], `${at} Tag ${d + 1}`).toBeLessThanOrEqual(r.goalByDay[d]! + SAVE_BUFFER);
  expect(r.earned, at).toBeGreaterThan(EARNED_BAND[0]);         // Einnahmen: Leitplanke, siehe EARNED_BAND
  expect(r.earned, at).toBeLessThan(EARNED_BAND[1]);
}

/** Sparen ist erlaubt (Hannes, Entscheidung 19): höchstens das nächste große Ziel (Landstück oder Gebäude bis 2 Stufen voraus)
 * plus etwa eine Sitzung Einnahmen. Alles darüber ist Horten, dann fehlen Münz-Ausgaben. */
export const SAVE_BUFFER = 1_000;

/** Einnahmen in Woche 1 (Münzen), Band mit Faktor 1,5 (Ziel Entscheidung 18). Gemessen 24.11. Nacht mit Bedarfs-Bot,
 * 12 Zufallsverläufe: 108.000–131.000 (Faktor 1,2). Vorher mit fester Pflanzliste 55.000–104.000 (Faktor 1,9). */
export const EARNED_BAND = [90_000, 135_000] as const;
