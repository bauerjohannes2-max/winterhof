// Wirtschafts-Bot (gemeinsam für economy.*.test.ts, aufgeteilt, damit die Verläufe parallel laufen).
// Wirtschafts-Simulation: ein Vielspieler-Bot spielt 7 Tage je 3 Sitzungen à 20 Minuten, tippt jede Minute.
// Baustein 2c (Entscheidung 18): mehrere Zufallsverläufe statt einem, damit Glück den Fortschritt nicht bestimmt.
// Prüft Leitplanken (kein Festhängen, Tempo etwa Stufe 15 in Woche 1, Verläufe nah beieinander), keine exakten Werte.
import { expect } from 'vitest';
import {
  CONTENT, advanceTime, applyCommand, buildOccupancy, canPlace, clearCost, createNewGame, decoPrice, footprintOf, isFieldReady, isPlotOwned,
  nextPlotPrice, obstacleDef, plotStatus, storageFree, terrainMap, type Command, type GameState
} from '../../../src/core';

const tally = { toolCoins: 0, cleared: 0, earned: 0, decoCoins: 0 };

function tryCmd(s: GameState, cmd: Command, now: number): GameState {
  const r = applyCommand(s, cmd, now);
  if (!r.ok) return s;
  for (const e of r.events) if (e.type === 'coinsChanged' && e.delta > 0) tally.earned += e.delta;
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
  if (!freeSpot(s, 2, 2) || s.coins > price.coins + 600) {
    const next = terrainMap().plots.filter((p) => plotStatus(s, p) === 'buyable').sort((a, b) => Math.abs(a.col - 3.5) + Math.abs(a.row - 3.5) - Math.abs(b.col - 3.5) - Math.abs(b.row - 3.5))[0];
    if (next) s = tryCmd(s, { type: 'unlockPlot', plotId: next.id }, now);
  }
  return s;
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
  // 2. Aufträge erfüllen; zu Sitzungsbeginn den Auftrag ablehnen, dem am meisten fehlt (wie ein echter Spieler)
  for (const o of [...s.orders]) s = tryCmd(s, { type: 'fulfillOrder', orderId: o.id }, now);
  if (sessionStart && s.orders.length > 0) {
    const lack = (o: GameState['orders'][number]) => o.lines.reduce((a, l) => a + Math.max(0, l.qty - (s.inventory[l.item] ?? 0)) * CONTENT.items[l.item]!.sellPrice, 0);
    const worst = [...s.orders].sort((a, b) => lack(b) - lack(a))[0]!;
    if (lack(worst) > 0) s = tryCmd(s, { type: 'skipOrder', orderId: worst.id }, now);
  }
  // 3. Tiere füttern, pflanzen (Weizen + was Aufträge brauchen)
  for (const o of s.objects) if (o.kind === 'animal' && o.state === 'hungry') s = tryCmd(s, { type: 'feedAnimal', animalId: o.id }, now);
  const wanted = s.orders.flatMap((o) => o.lines.map((l) => l.item)).filter((i) => CONTENT.items[i]?.category === 'crop' && CONTENT.items[i]!.unlockLevel <= s.level);
  const crops = ['wheat', 'wheat', 'berries', ...wanted];
  let k = 0;
  for (const o of s.objects) if (o.kind === 'field' && !o.crop) s = tryCmd(s, { type: 'plant', fieldId: o.id, crop: crops[k++ % crops.length]! }, now);
  // 4. produzieren, was Aufträge brauchen, sonst Butterplätzchen
  for (const st of s.objects.filter((o) => o.kind === 'station')) {
    const recipes = CONTENT.stations[st.type]!.recipes;
    const want = s.orders.flatMap((o) => o.lines.map((l) => l.item)).filter((i) => recipes.includes(i));
    for (const item of [...want, ...recipes]) s = tryCmd(s, { type: 'startProduction', stationId: st.id, item }, now);
  }
  // 5. bei vollem Lager verkaufen
  for (const kind of ['silo', 'barn'] as const) {
    if (storageFree(s, kind) < 5) {
      const top = Object.entries(s.inventory).filter(([i]) => CONTENT.items[i]!.storage === kind).sort((a, b) => b[1] - a[1])[0];
      if (top) s = tryCmd(s, { type: 'sellItem', item: top[0], qty: Math.ceil(top[1] / 2) }, now);
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
  // 7. Überschuss für Weihnachtsdeko (die größte freiwillige Ausgabe, wie in Hay Day); Polster für Land bleibt
  const reserve = nextPlotPrice(s).coins + 800;
  const decos = Object.values(CONTENT.decorations).filter((d) => d.group !== 'path' && d.unlockLevel <= s.level).sort((a, b) => b.cost - a.cost);
  for (let i = 0; i < 3 && decos.length; i++) {
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

export interface Run { seed: number; levelByDay: number[]; coins: number; earned: number; orders: number; land: number; cleared: number; deco: number }

export function runBot(seed: number): Run {
  Object.assign(tally, { toolCoins: 0, cleared: 0, earned: 0, decoCoins: 0 });
  const T0 = Date.UTC(2026, 10, 23, 7, 0, 0);
  let s = createNewGame(T0, seed);
  const levelByDay: number[] = [];
  for (let day = 0; day < 7; day++) {
    for (const startHour of [7, 13, 19]) {
      for (let m = 0; m <= 20; m += 1) {
        s = botStep(s, T0 + day * 86_400_000 + (startHour - 7) * 3600_000 + m * 60_000, m === 0);
      }
    }
    levelByDay.push(s.level);
  }
  expect(s.coins).toBeGreaterThanOrEqual(0);
  expect(s.ownedPlots.length).toBeLessThan(terrainMap().plots.length);             // nicht alles Land in einer Woche
  return { seed, levelByDay, coins: s.coins, earned: tally.earned, orders: s.stats.ordersDone, land: s.ownedPlots.length, cleared: tally.cleared, deco: tally.decoCoins };
}

/** Leitplanken je Verlauf (Entscheidung 18). Absolute Bänder, damit Glück den Fortschritt nicht bestimmt:
 * Stufe 14–16 nach Woche 1 heißt höchstens 2 Stufen Unterschied zwischen beliebigen Verläufen. */
export function checkRun(r: Run): void {
  console.log(`Verlauf ${r.seed}: Stufe je Tag ${r.levelByDay.join(',')} | eingenommen ${r.earned} | Deko ${r.deco} | Münzen ${r.coins} | Aufträge ${r.orders} | Land ${r.land} | geräumt ${r.cleared}`);
  const at = `Verlauf ${r.seed}`;
  expect(r.levelByDay[0], at).toBeGreaterThanOrEqual(3);        // Tag 1: spürbarer Fortschritt
  expect(r.levelByDay[0], at).toBeLessThanOrEqual(8);           // ...aber nicht durchgespielt
  expect(r.levelByDay[6], at).toBeGreaterThanOrEqual(14);       // Woche 1 etwa Stufe 15
  expect(r.levelByDay[6], at).toBeLessThanOrEqual(16);
  expect(r.orders, at).toBeGreaterThan(30);                      // Aufträge tragen das Spiel
  expect(r.land, at).toBeGreaterThan(CONTENT.map.plots.start.length + 2); // Land wächst spürbar
  expect(r.cleared, at).toBeGreaterThan(10);                     // Räumen ist Teil des Spiels
  expect(r.coins, at).toBeLessThan(15_000);                      // Münzen haben ein Ziel, kein Horten
  expect(r.earned, at).toBeGreaterThan(EARNED_BAND[0]);         // Einnahmen: Leitplanke, siehe EARNED_BAND
  expect(r.earned, at).toBeLessThan(EARNED_BAND[1]);
}

/** Einnahmen in Woche 1 (Münzen). Gemessen 24.11.: 55.000–104.000 (Faktor 1,9). Ziel ist Faktor 1,5; die Streuung
 * kommt zum großen Teil aus der einfachen Bot-Strategie (welchen Auftrag er ablehnt), offen in NEUSTART_PLAN 2c. */
export const EARNED_BAND = [45_000, 120_000] as const;
