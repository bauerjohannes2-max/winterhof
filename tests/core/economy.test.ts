// Wirtschafts-Simulation: ein Vielspieler-Bot spielt 7 Tage je 3 Sitzungen à 20 Minuten, tippt jede Minute.
// Prüft Leitplanken (kein Festhängen, sinnvolles Tempo), keine exakten Werte.
import { describe, expect, it } from 'vitest';
import {
  CONTENT, advanceTime, applyCommand, canPlace, clearCost, createNewGame, isFieldReady, isPlotOwned, nextPlotPrice,
  obstacleDef, plotStatus, storageFree, terrainMap, type Command, type GameState
} from '../../src/core';

function tryCmd(s: GameState, cmd: Command, now: number): GameState {
  const r = applyCommand(s, cmd, now);
  return r.ok ? r.state : s;
}

/** Erstes freies Feld auf eigenem Land (Start-Hof zuerst). */
function freeSpot(s: GameState, w: number, h: number): { gx: number; gy: number } | null {
  const plots = [...s.ownedPlots].map((id) => terrainMap().plotById(id)!);
  for (const p of plots) for (let gy = p.y0; gy <= p.y1; gy++) for (let gx = p.x0; gx <= p.x1; gx++) {
    if (canPlace(s, gx, gy, w, h).ok) return { gx, gy };
  }
  return null;
}

const tally = { toolCoins: 0, cleared: 0 };

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
  // 2. Aufträge erfüllen; zu Sitzungsbeginn einen unerfüllbaren ablehnen (wie ein echter Spieler)
  for (const o of [...s.orders]) s = tryCmd(s, { type: 'fulfillOrder', orderId: o.id }, now);
  if (sessionStart && s.orders.length > 0) s = tryCmd(s, { type: 'skipOrder', orderId: s.orders[0]!.id }, now);
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
  s = tryCmd(s, { type: 'claimDaily' }, now);
  for (const g of [...CONTENT.chapters, ...CONTENT.achievements]) s = tryCmd(s, { type: 'claimGoal', goalId: g.id }, now);
  return s;
}

describe('Wirtschaft (7-Tage-Bot)', () => {
  it('kommt voran, hängt nicht fest, Tempo im Rahmen', () => {
    const T0 = Date.UTC(2026, 10, 23, 7, 0, 0);
    let s = createNewGame(T0, 7);
    const levelByDay: number[] = [];
    for (let day = 0; day < 7; day++) {
      for (const startHour of [7, 13, 19]) {
        for (let m = 0; m <= 20; m += 1) {
          s = botStep(s, T0 + day * 86_400_000 + (startHour - 7) * 3600_000 + m * 60_000, m === 0);
        }
      }
      levelByDay.push(s.level);
    }
    console.log('Level je Tag', levelByDay.join(','), '| Münzen', s.coins, '| Aufträge', s.stats.ordersDone, '| Land', s.ownedPlots.length,
      '| geräumt', tally.cleared, '| Werkzeug-Kauf', tally.toolCoins, '| Werkzeuge', CONTENT.tools.items.map((t) => s.inventory[t] ?? 0).join('/'));
    expect(levelByDay[0]).toBeGreaterThanOrEqual(3);       // Tag 1: spürbarer Fortschritt
    expect(levelByDay[0]).toBeLessThanOrEqual(8);          // ...aber nicht durchgespielt
    expect(levelByDay[6]).toBeGreaterThanOrEqual(10);      // Vielspieler nach 1 Woche
    expect(levelByDay[6]).toBeLessThanOrEqual(20);
    expect(s.coins).toBeLessThan(50_000);                  // keine Gelddruckmaschine
    expect(s.stats.ordersDone).toBeGreaterThan(3);
    expect(s.ownedPlots.length).toBeGreaterThan(CONTENT.map.plots.start.length + 2); // Land wächst spürbar
    expect(s.ownedPlots.length).toBeLessThan(terrainMap().plots.length);             // ...aber nicht alles in einer Woche
    expect(tally.cleared).toBeGreaterThan(10);                                         // Räumen ist Teil des Spiels
    expect(s.coins).toBeGreaterThanOrEqual(0);
  });
});
