// ============================================================================
// Winterhof Core – Land: Landstücke kaufen, Hindernisse räumen, Werkzeuge (docs/KARTEN_KONZEPT.md)
// Nur Regeln und abgeleitete Werte; die Befehle stehen in commands.ts.
// ============================================================================
import { CONTENT } from './content';
import { terrainMap, type Plot } from './terrain';
import type { GameState, Inventory, MapObject, ObstacleDef } from './types';

/** Wie viele Stücke wurden schon gekauft (Start zählt nicht). */
export function plotsBought(state: Pick<GameState, 'ownedPlots'>): number {
  return state.ownedPlots.filter((id) => !terrainMap().plotById(id)?.isStart).length;
}

/** Preis des nächsten Landstücks: Münzen + Land-Material (steigt mit jedem Kauf). */
export function nextPlotPrice(state: Pick<GameState, 'ownedPlots'>): { coins: number; materials: Inventory } {
  const r = CONTENT.land;
  const k = plotsBought(state);
  const coins = Math.round((r.baseCost * Math.pow(r.costGrowth, k)) / 10) * 10;
  const materials: Inventory = {};
  if (k >= r.materialsFromPlot) {
    const qty = 1 + Math.floor((k - r.materialsFromPlot) / r.materialStep);
    for (const id of r.materials) materials[id] = qty;
  }
  return { coins, materials };
}

export type PlotStatus = 'owned' | 'buyable' | 'not_adjacent' | 'level';

/** Status eines Landstücks für diesen Spieler. */
export function plotStatus(state: Pick<GameState, 'ownedPlots' | 'level'>, plot: Plot): PlotStatus {
  if (state.ownedPlots.includes(plot.id)) return 'owned';
  if (!terrainMap().neighbors(plot.id).some((n) => state.ownedPlots.includes(n.id))) return 'not_adjacent';
  if (state.level < plot.minLevel) return 'level';
  return 'buyable';
}

/** Preis je Werkzeug beim Sofortkauf (nach Spielerstufe). */
export function toolPrice(level: number): number {
  let price = CONTENT.tools.prices[0]!.coins;
  for (const p of CONTENT.tools.prices) if (level >= p.fromLevel) price = p.coins;
  return price;
}

export function obstacleDef(o: Pick<MapObject, 'type'>): ObstacleDef | null {
  return CONTENT.obstacles[o.type] ?? null;
}

/** Was kostet das Räumen: nötige Werkzeuge, davon fehlend, Münzen für den Sofortkauf der fehlenden. */
export function clearCost(state: Pick<GameState, 'inventory' | 'level'>, def: ObstacleDef): { tools: Inventory; missing: Inventory; coins: number } {
  const have = state.inventory[def.tool] ?? 0;
  const lack = Math.max(0, def.toolQty - have);
  return {
    tools: { [def.tool]: def.toolQty },
    missing: lack > 0 ? { [def.tool]: lack } : {},
    coins: lack * toolPrice(state.level)
  };
}

/** Preis der nächsten Deko dieser Art (Wegplatten werden mit jedem Stück teurer). */
export function decoPrice(state: Pick<GameState, 'objects' | 'storedDecos'>, decoType: string): number {
  const def = CONTENT.decorations[decoType];
  if (!def) return 0;
  const owned = state.objects.filter((o) => o.kind === 'deco' && o.type === decoType).length + (state.storedDecos[decoType] ?? 0);
  return def.cost + (def.costStep ?? 0) * owned;
}
