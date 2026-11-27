// ============================================================================
// Winterhof Core – Spielstand anlegen & abgeleitete Werte (Selektoren)
// ============================================================================
import { CONTENT } from './content';
import {
  STAT_KEYS, type FieldObject, type GameState, type GoalDef, type Condition, type PenObject,
  type Inventory, type ItemDef, type ItemId, type MapObject, type StationObject, type Stats, type StorageKind
} from './types';

/** v10 (Baustein 5b): Größenkatalog, Landstücke 6×6, Felder 2×2, Tiere in Gehegen */
export const SCHEMA_VERSION = 10;

export function emptyStats(): Stats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Stats;
}

/** Hindernisse der Karte als Objekte (feste IDs aus der Lage, damit Migration und Spielstand übereinstimmen). */
export function mapObstacles(): MapObject[] {
  return CONTENT.map.obstacles.map((o): MapObject => ({ id: obstacleId(o.gx, o.gy), kind: 'obstacle', type: o.type, gx: o.gx, gy: o.gy }));
}

export function obstacleId(gx: number, gy: number): string {
  return `ob_${gx}_${gy}`;
}

export function createNewGame(nowMs: number, seed = 0x5eed1234): GameState {
  const s = CONTENT.start;
  const objects: MapObject[] = s.objects.map((o): MapObject => {
    const pos = { id: o.id, type: o.type, gx: o.gx, gy: o.gy };
    switch (o.kind) {
      case 'field': {
        const crop = o.crop ?? null;
        const grow = crop ? CONTENT.items[crop]?.growTime ?? 0 : 0;
        return { ...pos, kind: 'field', crop, plantedAt: o.ripe ? nowMs - grow * 1000 : nowMs };
      }
      case 'pen':
        return {
          ...pos, kind: 'pen',
          animals: (o.animals ?? []).map((a) => ({ id: a.id, nick: a.nick, state: a.ready ? 'ready' : 'hungry', readyAt: nowMs, lastPet: 0 }))
        };
      case 'station':
        return { ...pos, kind: 'station', wrapped: false, queue: [], ready: [], craftedCount: 0 };
      case 'deco':
        return { ...pos, kind: 'deco' };
      case 'obstacle':
        return { ...pos, kind: 'obstacle' };
      default:
        return { ...pos, kind: 'prop' };
    }
  });
  objects.push(...mapObstacles());
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowMs,
    clockMaxMs: nowMs,
    rngState: seed | 0,
    nextId: 100,
    villageName: 'Winterhof',
    playerName: 'Winterhof-Gast',
    coins: s.coins,
    xp: 0,
    level: 1,
    inventory: { ...s.inventory },
    storage: { silo: CONTENT.storage.silo.baseCapacity, barn: CONTENT.storage.barn.baseCapacity },
    objects,
    storedDecos: {},
    ownedPlots: [...CONTENT.map.plots.start],
    nextDriftAt: nowMs + CONTENT.drifts.everySeconds * 1000,
    orders: [],
    stand: Array.from({ length: CONTENT.stand.slots }, () => null),
    villagerOffer: null,
    nextOfferAt: nowMs + CONTENT.villagerOffers.intervalSeconds * 1000,
    daily: { lastDay: null, streak: 0 },
    discovered: Object.keys(s.inventory),
    stats: emptyStats(),
    claimedGoals: [],
    claimedGifts: [],
    lastTipAt: 0,
    settings: { sfx: true, music: false, lighting: 'day' }
  };
}

// ---------------------------------------------------------------- Selektoren
export function levelForXp(xp: number): number {
  let lvl = 1;
  for (const l of CONTENT.levels) if (xp >= l.xpNeeded) lvl = l.level;
  return lvl;
}

export function levelProgress(xp: number): { level: number; progress: number; nextXp: number | null } {
  const level = levelForXp(xp);
  const cur = CONTENT.levels.find((l) => l.level === level)!;
  const next = CONTENT.levels.find((l) => l.level === level + 1) ?? null;
  return {
    level,
    progress: next ? Math.min(1, (xp - cur.xpNeeded) / (next.xpNeeded - cur.xpNeeded)) : 1,
    nextXp: next ? next.xpNeeded : null
  };
}

export function storageOf(item: ItemId): StorageKind {
  return CONTENT.items[item]?.storage ?? 'barn';
}

export function storageUsed(state: GameState, kind: StorageKind): number {
  let n = 0;
  for (const [id, q] of Object.entries(state.inventory)) if (q > 0 && storageOf(id) === kind) n += q;
  return n;
}

export function storageFree(state: GameState, kind: StorageKind): number {
  return Math.max(0, state.storage[kind] - storageUsed(state, kind));
}

export function storageUpgradeCost(state: GameState, kind: StorageKind): number | null {
  const d = CONTENT.storage[kind];
  const cap = state.storage[kind];
  if (cap >= d.maxCapacity) return null;
  const tier = Math.floor((cap - d.baseCapacity) / d.stepCapacity);
  return d.baseCost + tier * d.costStep;
}

/** Baumaterial für den nächsten Ausbau (leer, solange die Stufe darunter liegt oder maximal ausgebaut). */
export function storageUpgradeMaterials(state: GameState, kind: StorageKind): Inventory {
  const d = CONTENT.storage[kind];
  const m = CONTENT.materials;
  if (state.level < (d.materialsFromLevel ?? Infinity) || state.storage[kind] >= d.maxCapacity) return {};
  const tier = Math.floor((state.storage[kind] - d.baseCapacity) / d.stepCapacity);
  const qty = 1 + Math.floor(tier / m.storageQtyEvery);
  return Object.fromEntries(m.storage.map((id) => [id, qty]));
}

export function fieldReadyAt(f: FieldObject): number | null {
  if (!f.crop) return null;
  const grow = CONTENT.items[f.crop]?.growTime ?? 0;
  return f.plantedAt + grow * 1000;
}

export function isFieldReady(f: FieldObject, now: number): boolean {
  const r = fieldReadyAt(f);
  return r !== null && now >= r;
}

export type CropStage = 0 | 1 | 2 | 3;

export interface FieldGrowth {
  readonly crop: ItemId;
  readonly progress: number;
  readonly stage: CropStage;
  readonly remainingMs: number;
  readonly ready: boolean;
}

/** Reiner Wachstumsstand eines Felds für Darstellung und Werkzeug-Anzeige (4 Stufen: 0..3). */
export function fieldGrowth(f: FieldObject, now: number): FieldGrowth | null {
  if (!f.crop) return null;
  const growMs = Math.max(0, (CONTENT.items[f.crop]?.growTime ?? 0) * 1000);
  const elapsed = Math.max(0, now - f.plantedAt);
  const progress = growMs <= 0 ? 1 : Math.min(1, elapsed / growMs);
  const remainingMs = Math.max(0, f.plantedAt + growMs - now);
  const ready = remainingMs === 0;
  const stage: CropStage = ready ? 3 : progress >= 0.65 ? 2 : progress >= 0.25 ? 1 : 0;
  return { crop: f.crop, progress, stage, remainingMs, ready };
}

/** Alle bereits freigeschalteten Feldfrüchte in fester Katalog-Reihenfolge. */
export function unlockedCrops(state: Readonly<GameState>): ItemDef[] {
  return CONTENT.cropIds
    .map((id) => CONTENT.items[id])
    .filter((it): it is ItemDef => Boolean(it && it.category === 'crop' && it.unlockLevel <= state.level));
}

export function masteryOf(craftedCount: number): { stars: number; speedMult: number; nextAt: number | null } {
  let cur = CONTENT.mastery[0]!;
  let nextAt: number | null = null;
  for (const m of CONTENT.mastery) {
    if (craftedCount >= m.at) cur = m;
    else { nextAt = m.at; break; }
  }
  return { stars: cur.stars, speedMult: cur.speedMult, nextAt };
}

export function craftSeconds(st: StationObject, item: ItemId): number {
  const base = CONTENT.items[item]?.craftTime ?? 0;
  return Math.max(1, Math.round(base * masteryOf(st.craftedCount).speedMult));
}

export function getObject<K extends MapObject['kind']>(state: GameState, id: string, kind: K): Extract<MapObject, { kind: K }> | null {
  const o = state.objects.find((x) => x.id === id);
  return o && o.kind === kind ? (o as Extract<MapObject, { kind: K }>) : null;
}

export function countObjects(state: GameState, kind: MapObject['kind'], type?: string): number {
  return state.objects.filter((o) => o.kind === kind && (type === undefined || o.type === type)).length;
}

export function conditionMet(state: GameState, c: Condition): boolean {
  if (c.kind === 'stat') return (state.stats[c.stat] ?? 0) >= c.goal;
  if (c.kind === 'hasAnimal') return animalCount(state, c.type) > 0;
  return state.objects.some((o) => {
    if (o.kind !== c.objectKind || o.type !== c.type) return false;
    if (c.ready && o.kind === 'station') return !(o as StationObject).wrapped;
    return true;
  });
}

export function allGoals(): GoalDef[] {
  return [...CONTENT.chapters, ...CONTENT.achievements];
}

export function goalReady(state: GameState, g: GoalDef): boolean {
  return !state.claimedGoals.includes(g.id) && g.conditions.every((c) => conditionMet(state, c));
}

/** Aktives Kapitel = erstes nicht abgeholtes. */
export function activeChapter(state: GameState): GoalDef | null {
  return CONTENT.chapters.find((c) => !state.claimedGoals.includes(c.id)) ?? null;
}

/** Gehege einer Tierart auf dem Hof */
export function pensOf(state: GameState, animal: string): PenObject[] {
  return state.objects.filter((o): o is PenObject => o.kind === 'pen' && CONTENT.pens[o.type]?.animal === animal);
}

/** Wie viele Tiere dieser Art leben auf dem Hof (über alle Gehege) */
export function animalCount(state: GameState, animal: string): number {
  return pensOf(state, animal).reduce((n, p) => n + p.animals.length, 0);
}

/**
 * Das nächste Gehege dieser Art: Preis und Mindeststufe, oder null, wenn alle Gehege gebaut sind.
 * Hay Day: weitere Gehege derselben Art kommen erst mit höherer Stufe.
 */
export function nextPen(state: GameState, penType: string): { cost: number; level: number } | null {
  const def = CONTENT.pens[penType];
  if (!def) return null;
  const k = state.objects.filter((o) => o.kind === 'pen' && o.type === penType).length;
  if (k >= def.levels.length) return null;
  return { cost: def.costs[k]!, level: def.levels[k]! };
}

/** Lokaler Kalendertag als Schlüssel (für Tagestruhe). Zeitzone über Offset in Minuten steuerbar (Tests). */
export function dayKey(nowMs: number, tzOffsetMin = new Date(nowMs).getTimezoneOffset()): string {
  const d = new Date(nowMs - tzOffsetMin * 60000);
  return d.toISOString().slice(0, 10);
}

/** Preis des nächsten Tiers dieser Art: steigt mit jedem weiteren Tier (Hay Day). */
export function animalPrice(state: GameState, animalType: string): number {
  const def = CONTENT.animals[animalType];
  if (!def) return 0;
  return Math.round(def.cost * (1 + CONTENT.animalCostStep * animalCount(state, animalType)) / 5) * 5;
}
