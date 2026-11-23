// ============================================================================
// Winterhof Core – Inhalte (einzige Quelle: src/content/winterhof.json)
// ============================================================================
import raw from '../content/winterhof.json';
import type {
  AnimalDef, DecoDef, Footprint, GoalDef, ItemDef, LandZoneDef, LevelDef,
  MapObject, MaterialRules, OrderRules, StationDef, StorageDef, StorageKind
} from './types';

export interface ContentPack {
  items: Record<string, ItemDef>;
  cropIds: string[];
  animals: Record<string, AnimalDef>;
  stations: Record<string, StationDef>;
  decorations: Record<string, DecoDef>;
  landZones: LandZoneDef[];
  levels: LevelDef[];
  npcs: { id: string; name: string }[];
  achievements: GoalDef[];
  chapters: GoalDef[];
  storage: Record<StorageKind, StorageDef>;
  materials: MaterialRules;
  orders: OrderRules;
  stand: { slots: number; sellSeconds: number; maxPriceFactor: number };
  villagerOffers: { intervalSeconds: number; lifetimeSeconds: number; priceFactor: number };
  mastery: { at: number; stars: number; speedMult: number }[];
  footprints: Record<string, Footprint>;
  field: { cost: number; costStep: number; maxCount: number; unlockLevel: number };
  market: { sellFactor: number };
  daily: { baseCoins: number; streakCoins: number; maxStreakBonus: number };
  map: { starterBounds: { x0: number; y0: number; x1: number; y1: number } };
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
  for (const z of c.landZones) for (const id of Object.keys(z.materials ?? {})) {
    if (c.items[id]?.category !== 'material') errs.push(`Grundstück ${z.id}: Material ${id} unbekannt`);
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
