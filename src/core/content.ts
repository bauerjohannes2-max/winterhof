// ============================================================================
// Winterhof Core – Inhalte (einzige Quelle: src/content/winterhof.json)
// ============================================================================
import raw from '../content/winterhof.json';
import type {
  AnimalDef, DecoDef, DriftRules, Footprint, GoalDef, ItemDef, LandRules, LevelDef,
  MapObject, MaterialRules, ObstacleDef, OrderRules, StationDef, StorageDef, StorageKind, ToolRules
} from './types';

export interface ContentPack {
  items: Record<string, ItemDef>;
  cropIds: string[];
  animals: Record<string, AnimalDef>;
  stations: Record<string, StationDef>;
  decorations: Record<string, DecoDef>;
  land: LandRules;
  obstacles: Record<string, ObstacleDef>;
  tools: ToolRules;
  drifts: DriftRules;
  levels: LevelDef[];
  npcs: { id: string; name: string }[];
  achievements: GoalDef[];
  chapters: GoalDef[];
  storage: Record<StorageKind, StorageDef>;
  materials: MaterialRules;
  orders: OrderRules;
  /** Jedes weitere Tier derselben Art kostet cost * (1 + animalCostStep * Anzahl) */
  animalCostStep: number;
  stand: { slots: number; sellSeconds: number; maxPriceFactor: number };
  villagerOffers: { intervalSeconds: number; lifetimeSeconds: number; priceFactor: number };
  mastery: { at: number; stars: number; speedMult: number }[];
  footprints: Record<string, Footprint>;
  field: { cost: number; costStep: number; maxCount: number; unlockLevel: number };
  market: { sellFactor: number };
  daily: { baseCoins: number; streakCoins: number; maxStreakBonus: number };
  map: {
    origin: { gx: number; gy: number };
    legend: { terrain: Record<string, string>; surface: Record<string, string> };
    /** Tal aus gleich großen Landstücken; IDs "Spalte,Reihe" */
    plots: {
      origin: { gx: number; gy: number };
      size: number;
      cols: number;
      rows: number;
      start: string[];
      /** Mindeststufe für einzelne Stücke (sonst land.fromLevel) */
      levels: Record<string, number>;
    };
    /** Prop-Typen am Hofplatz, die sich nicht verschieben lassen */
    fixed: string[];
    terrain: string[];
    surface: string[];
    /** Objekt-Ebene: Hindernisse beim Spielbeginn */
    obstacles: { type: string; gx: number; gy: number }[];
    /** Besondere Orte mit Namen (nur diese tragen Namen, KARTEN_KONZEPT); gx/gy = Platz für das Namensschild */
    places: { id: string; name: string; gx: number; gy: number }[];
  };
  start: {
    coins: number;
    inventory: Record<string, number>;
    objects: Array<{ kind: MapObject['kind']; type: string; id: string; gx: number; gy: number; crop?: string; ripe?: boolean; nick?: string; ready?: boolean }>;
  };
}

export const CONTENT = raw as unknown as ContentPack;

/** Prüft die Inhalte auf Widersprüche (läuft in Tests und beim Start im Dev-Modus). */
export function validateContent(c: ContentPack = CONTENT): string[] {
  const errs: string[] = [];
  for (const [id, it] of Object.entries(c.items)) {
    if (it.id !== id) errs.push(`Item-ID passt nicht: ${id}`);
    if (it.category === 'crop' && !(it.growTime && it.growTime > 0)) errs.push(`${id}: growTime fehlt`);
    if (it.category === 'crafted') {
      if (!it.station || !c.stations[it.station]) errs.push(`${id}: Station fehlt`);
      for (const ing of Object.keys(it.ingredients ?? {})) if (!c.items[ing]) errs.push(`${id}: Zutat ${ing} unbekannt`);
    }
  }
  for (const [id, a] of Object.entries(c.animals)) {
    if (!c.items[a.feedItem]) errs.push(`Tier ${id}: Futter ${a.feedItem} unbekannt`);
    if (!c.items[a.produceItem]) errs.push(`Tier ${id}: Produkt ${a.produceItem} unbekannt`);
  }
  for (const [id, s] of Object.entries(c.stations)) {
    for (const r of s.recipes) if (c.items[r]?.station !== id) errs.push(`Station ${id}: Rezept ${r} gehört nicht dazu`);
  }
  for (const id of [...c.materials.storage, ...c.materials.land]) {
    if (c.items[id]?.category !== 'material') errs.push(`Baumaterial ${id} fehlt oder ist kein Material`);
  }
  for (const id of c.land.materials) if (c.items[id]?.category !== 'material') errs.push(`Land-Material ${id} fehlt oder ist kein Material`);
  for (const id of c.tools.items) if (c.items[id]?.category !== 'tool') errs.push(`Werkzeug ${id} fehlt oder ist kein Werkzeug`);
  for (const it of Object.values(c.items)) if (it.category === 'tool' && !c.tools.items.includes(it.id)) errs.push(`Werkzeug ${it.id} fehlt in tools.items`);
  for (let i = 1; i < c.tools.prices.length; i++) {
    if (c.tools.prices[i]!.fromLevel <= c.tools.prices[i - 1]!.fromLevel) errs.push('tools.prices: Stufen nicht aufsteigend');
  }
  if (c.tools.prices[0]?.fromLevel !== 1) errs.push('tools.prices: erster Preis muss ab Stufe 1 gelten');
  for (const [id, o] of Object.entries(c.obstacles)) {
    if (o.id !== id) errs.push(`Hindernis-ID passt nicht: ${id}`);
    if (!c.tools.items.includes(o.tool)) errs.push(`Hindernis ${id}: Werkzeug ${o.tool} unbekannt`);
    if (!(o.toolQty >= 1)) errs.push(`Hindernis ${id}: toolQty fehlt`);
    if (o.yieldsDeco) {
      if (!c.decorations[o.yieldsDeco]) errs.push(`Hindernis ${id}: Deko ${o.yieldsDeco} unbekannt`);
      const a = footprintOf({ kind: 'obstacle', type: id }, c), b = footprintOf({ kind: 'deco', type: o.yieldsDeco }, c);
      if (a.w !== b.w || a.h !== b.h) errs.push(`Hindernis ${id}: Deko ${o.yieldsDeco} hat andere Grundfläche`);
    }
  }
  if (!c.obstacles[c.drifts.type]) errs.push(`drifts.type ${c.drifts.type} ist kein Hindernis`);
  for (const t of c.map.fixed) if (!c.start.objects.some((o) => o.kind === 'prop' && o.type === t)) errs.push(`Feste Station ${t} fehlt im Start-Hof`);
  for (const d of Object.values(c.decorations)) {
    if (d.group === 'path' && (footprintOf({ kind: 'deco', type: d.id }, c).w !== 1 || footprintOf({ kind: 'deco', type: d.id }, c).h !== 1)) errs.push(`Wegplatte ${d.id} muss 1×1 sein`);
    if ((d.costStep ?? 0) < 0) errs.push(`Deko ${d.id}: costStep negativ`);
  }
  for (let i = 1; i < c.levels.length; i++) {
    if (c.levels[i]!.xpNeeded <= c.levels[i - 1]!.xpNeeded) errs.push(`Level ${i + 1}: XP nicht steigend`);
  }
  // Produkt darf nicht mehr wert sein als sein Rohwert * 3 und nicht weniger als Rohwert (Wirtschafts-Leitplanke)
  for (const it of Object.values(c.items)) {
    if (it.category !== 'crafted' || !it.ingredients) continue;
    const rawValue = Object.entries(it.ingredients).reduce((s, [ing, q]) => s + (c.items[ing]?.sellPrice ?? 0) * q, 0);
    if (it.sellPrice < rawValue) errs.push(`${it.id}: Verkaufspreis ${it.sellPrice} < Zutatenwert ${rawValue}`);
  }
  return errs;
}

export function footprintOf(obj: { kind: MapObject['kind']; type: string }, c: ContentPack = CONTENT): Footprint {
  return c.footprints[obj.type] ?? c.footprints[obj.kind] ?? { w: 1, h: 1 };
}
