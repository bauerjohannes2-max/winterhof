// ============================================================================
// Winterhof Core – Typen
// Reiner Logik-Kern: kein DOM, kein Pixi, kein Audio, keine globale Zeit/Zufall.
// ============================================================================

export type ItemId = string;
export type ObjectId = string;
export type Inventory = Record<ItemId, number>;

export type StorageKind = 'silo' | 'barn';
export type ItemCategory = 'crop' | 'animal' | 'crafted' | 'material' | 'tool';
export type MaterialGroup = 'storage' | 'land';

// ---------------------------------------------------------------- Inhalte
export interface ItemDef {
  id: ItemId;
  name: string;
  category: ItemCategory;
  storage: StorageKind;
  sellPrice: number;
  xp: number;
  unlockLevel: number;
  // Feldfrüchte
  growTime?: number;      // Sekunden
  seedCost?: number;      // Münzen, falls kein Saatgut im Silo
  harvestYield?: number;  // Ernte pro Feld (Saatgut kommt zurück)
  // Produkte
  station?: string;
  craftTime?: number;     // Sekunden
  ingredients?: Inventory;
  // Baumaterial
  materialGroup?: MaterialGroup;
}

export interface AnimalDef {
  id: string;
  name: string;
  feedItem: ItemId;
  feedQty: number;
  produceItem: ItemId;
  produceTime: number;
  cost: number;
  unlockLevel: number;
  maxCount: number;
}

export interface StationDef {
  id: string;
  name: string;
  cost: number;
  unlockLevel: number;
  recipes: ItemId[];
  queueSlots: number;
  readySlots: number;
}

export interface DecoDef {
  id: string;
  name: string;
  cost: number;
  /** Preis steigt je Stück, das man schon besitzt (Wegplatten, Hay Day) */
  costStep?: number;
  /** 'path' = Wegplatte des Spielers */
  group?: 'path';
  xp: number;
  unlockLevel: number;
}

/** Landstücke kaufen (KARTEN_KONZEPT.md) */
export interface LandRules {
  fromLevel: number;
  /** Preis des k-ten gekauften Stücks: baseCost * costGrowth^k, auf 10 gerundet */
  baseCost: number;
  costGrowth: number;
  /** Ab dem so vielten gekauften Stück (k, ab 0) zusätzlich Land-Material */
  materialsFromPlot: number;
  /** Menge je Material: 1 + floor((k - materialsFromPlot) / materialStep) */
  materialStep: number;
  materials: ItemId[];
}

/** Hindernis auf dem Land: braucht Werkzeug × toolQty zum Räumen */
export interface ObstacleDef {
  id: string;
  name: string;
  tool: ItemId;
  toolQty: number;
  xp: number;
  /** Tanne: wird ausgegraben und landet als diese Deko im Lager */
  yieldsDeco?: string;
}

export interface ToolRules {
  items: ItemId[];
  /** Sofortkauf beim Räumen, Preis je Stück nach Spielerstufe (aufsteigend nach fromLevel) */
  prices: { fromLevel: number; coins: number }[];
  /** Chance auf einen Fund beim Räumen */
  clearFindChance: number;
}

/** Schneewehen wachsen nach (nur auf freiem eigenem Land) */
export interface DriftRules {
  type: string;
  everySeconds: number;
  max: number;
}

export interface LevelDef {
  level: number;
  xpNeeded: number;
  coinBonus: number;
}

export type Condition =
  | { kind: 'stat'; stat: StatKey; goal: number }
  | { kind: 'hasObject'; objectKind: MapObject['kind']; type: string; ready?: boolean };

export interface GoalDef {
  id: string;
  title: string;
  conditions: Condition[];
  coins: number;
  xp: number;
}

export interface StorageDef {
  baseCapacity: number;
  stepCapacity: number;
  maxCapacity: number;
  baseCost: number;
  costStep: number;
  /** Ab dieser Spielerstufe braucht jeder Ausbau Baumaterial */
  materialsFromLevel?: number;
}

export interface MaterialRules {
  fromLevel: number;
  /** Chance je Ernte/Abholen auf 1 Baumaterial */
  dropChance: number;
  storage: ItemId[];
  land: ItemId[];
  /** Lagerausbau: je Material 1 + floor(Ausbaustufe / storageQtyEvery) */
  storageQtyEvery: number;
}

export type OrderTier = 'easy' | 'medium' | 'hard';
export type OrderReward = 'coins' | 'xp';
export interface OrderRules {
  slots: number;
  coinFactor: number;   // Belohnung = Warenwert * Faktor * Lohn-Art
  xpFactor: number;
  refillSeconds: number; // Wartezeit nach Ablehnen
  /** Zielwert (Warenwert) eines Auftrags = valueBase * Stufe^valueExp * tiers[t].mult */
  valueBase: number;
  valueExp: number;
  maxQtyRaw: number;
  maxQtyCrafted: number;
  /** Mischung: leicht (Rohware), mittel (einfach verarbeitet), anspruchsvoll (mehrstufig) */
  tiers: Record<OrderTier, { weight: number; mult: number; minLines: number; maxLines: number }>;
  /** Lohn-Art: Münz- oder Erfahrungs-Auftrag (Hay Day) */
  rewards: Record<OrderReward, { weight: number; coinMult: number; xpMult: number }>;
}

// ---------------------------------------------------------------- Karte
export type Footprint = { w: number; h: number };

interface MapObjectBase {
  id: ObjectId;
  type: string;
  gx: number;
  gy: number;
}

export interface FieldObject extends MapObjectBase {
  kind: 'field';
  crop: ItemId | null;
  plantedAt: number;
}

export interface AnimalObject extends MapObjectBase {
  kind: 'animal';
  nick: string;
  /** hungry = muss gefüttert werden, producing = arbeitet bis readyAt, ready = Produkt abholbar */
  state: 'hungry' | 'producing' | 'ready';
  readyAt: number;
  lastPet: number;
}

export interface ProductionJob {
  item: ItemId;
  /** null = wartet in der Schlange */
  startAt: number | null;
  endAt: number | null;
}

export interface StationObject extends MapObjectBase {
  kind: 'station';
  wrapped: boolean;
  queue: ProductionJob[];
  ready: ItemId[];
  craftedCount: number;
}

export interface DecoObject extends MapObjectBase {
  kind: 'deco';
}

/** Hof-Gebäude ohne eigene Produktion (Chalet, Baum, Auftragstafel, Schlitten, Hofladen, Briefkasten, Truhe) */
export interface PropObject extends MapObjectBase {
  kind: 'prop';
}

/** Hindernis (Schneewehe, Fels, Eis, Tanne): belegt Felder, nicht verschiebbar, darf auf fremdem Land liegen */
export interface ObstacleObject extends MapObjectBase {
  kind: 'obstacle';
}

export type MapObject = FieldObject | AnimalObject | StationObject | DecoObject | PropObject | ObstacleObject;

// ---------------------------------------------------------------- Spielstand
export interface OrderLine { item: ItemId; qty: number }
export interface Order {
  id: string;
  npc: string;
  lines: OrderLine[];
  coins: number;
  xp: number;
  /** Schwierigkeit und Lohn-Art (fehlt bei Aufträgen aus älteren Spielständen) */
  tier?: OrderTier;
  reward?: OrderReward;
  /** Auftrag erst ab diesem Zeitpunkt sichtbar (nach Ablehnen) */
  availableAt: number;
}

export interface StandSlot {
  item: ItemId;
  qty: number;
  price: number;
  sellAt: number;
  sold: boolean;
  buyer: string | null;
}

export interface VillagerOffer {
  npc: string;
  item: ItemId;
  qty: number;
  coins: number;
  xp: number;
  expiresAt: number;
}

export const STAT_KEYS = [
  'harvests', 'planted', 'crafted', 'collected', 'pets', 'fed', 'ordersDone',
  'standSales', 'landsUnlocked', 'chestsOpened', 'villagerDeals', 'storageUpgrades', 'obstaclesCleared'
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export interface GameState {
  schemaVersion: number;
  createdAt: number;
  /** Höchster je gesehener Zeitpunkt – Uhr-Rücksprünge werden darauf geklemmt */
  clockMaxMs: number;
  rngState: number;
  nextId: number;

  villageName: string;
  playerName: string;
  coins: number;
  xp: number;
  level: number;

  inventory: Inventory;
  storage: Record<StorageKind, number>; // Kapazität
  objects: MapObject[];
  storedDecos: Record<string, number>;
  /** Kartenstapel für die Auftragsmischung (Shuffle Bag): gleicht Glücks- und Pechsträhnen aus. Fehlt in älteren Ständen. */
  orderBag?: { tiers: OrderTier[]; rewards: OrderReward[] };
  /** Eigene Landstücke (IDs "Spalte,Reihe", inkl. Start) */
  ownedPlots: string[];
  /** Nächster Zeitpunkt, an dem eine Schneewehe nachwachsen darf */
  nextDriftAt: number;

  orders: Order[];
  stand: (StandSlot | null)[];
  villagerOffer: VillagerOffer | null;
  nextOfferAt: number;

  daily: { lastDay: string | null; streak: number };
  discovered: ItemId[];
  stats: Stats;
  claimedGoals: string[];
  /** Bereits ausgepackte Winterpost-Päckchen (Schutz vor doppeltem Einlösen) */
  claimedGifts: string[];
  /** Letztes Trinkgeld eines Dorfbewohners */
  lastTipAt: number;

  settings: { sfx: boolean; music: boolean; lighting: 'day' | 'dusk' | 'night' | 'auto' };
}

// ---------------------------------------------------------------- Befehle & Ereignisse
export type Command =
  | { type: 'plant'; fieldId: ObjectId; crop: ItemId }
  | { type: 'harvest'; fieldId: ObjectId }
  | { type: 'harvestAll' }
  | { type: 'feedAnimal'; animalId: ObjectId }
  | { type: 'collectAnimal'; animalId: ObjectId }
  | { type: 'petAnimal'; animalId: ObjectId }
  | { type: 'startProduction'; stationId: ObjectId; item: ItemId }
  | { type: 'collectProduct'; stationId: ObjectId }
  | { type: 'unwrapStation'; stationId: ObjectId }
  | { type: 'buyStation'; stationType: string; gx: number; gy: number }
  | { type: 'buyAnimal'; animalType: string; gx: number; gy: number }
  | { type: 'buyField'; gx: number; gy: number }
  | { type: 'buyDeco'; decoType: string; gx: number; gy: number }
  | { type: 'placeStoredDeco'; decoType: string; gx: number; gy: number }
  | { type: 'storeDeco'; decoId: ObjectId }
  | { type: 'moveObject'; objectId: ObjectId; gx: number; gy: number }
  | { type: 'sellItem'; item: ItemId; qty: number }
  | { type: 'fulfillOrder'; orderId: string }
  | { type: 'skipOrder'; orderId: string }
  | { type: 'listOnStand'; slot: number; item: ItemId; qty: number; price: number }
  | { type: 'collectStand'; slot: number }
  | { type: 'acceptOffer' }
  | { type: 'declineOffer' }
  | { type: 'upgradeStorage'; storage: StorageKind }
  | { type: 'unlockPlot'; plotId: string }
  | { type: 'clearObstacle'; obstacleId: ObjectId; buyMissing?: boolean }
  | { type: 'claimDaily' }
  | { type: 'claimGoal'; goalId: string }
  | { type: 'setSetting'; key: keyof GameState['settings']; value: unknown }
  | { type: 'rename'; villageName?: string; playerName?: string }
  | { type: 'renameAnimal'; animalId: ObjectId; nick: string }
  | { type: 'greetVillager' }
  | { type: 'packGift'; items: Inventory }
  | { type: 'receiveGift'; parcelId: string; items: Inventory };

export type GameEvent =
  | { type: 'itemsGained'; items: Inventory; at?: ObjectId }
  | { type: 'itemsSpent'; items: Inventory }
  | { type: 'coinsChanged'; delta: number; at?: ObjectId }
  | { type: 'xpGained'; amount: number; at?: ObjectId }
  | { type: 'levelUp'; level: number; coinBonus: number }
  | { type: 'planted'; fieldId: ObjectId; crop: ItemId }
  | { type: 'harvested'; fieldId: ObjectId; crop: ItemId; qty: number }
  | { type: 'animalFed'; animalId: ObjectId }
  | { type: 'animalCollected'; animalId: ObjectId; item: ItemId }
  | { type: 'animalPetted'; animalId: ObjectId }
  | { type: 'productionStarted'; stationId: ObjectId; item: ItemId }
  | { type: 'productionFinished'; stationId: ObjectId; item: ItemId }
  | { type: 'productCollected'; stationId: ObjectId; item: ItemId }
  | { type: 'animalReady'; animalId: ObjectId }
  | { type: 'objectPlaced'; objectId: ObjectId }
  | { type: 'objectMoved'; objectId: ObjectId }
  | { type: 'objectStored'; objectId: ObjectId }
  | { type: 'stationUnwrapped'; stationId: ObjectId }
  | { type: 'orderFulfilled'; orderId: string }
  | { type: 'orderSkipped'; orderId: string }
  | { type: 'standSold'; slot: number; buyer: string }
  | { type: 'standCollected'; slot: number; coins: number }
  | { type: 'offerArrived'; npc: string }
  | { type: 'offerClosed'; accepted: boolean }
  | { type: 'storageUpgraded'; storage: StorageKind; capacity: number }
  | { type: 'plotUnlocked'; plotId: string }
  | { type: 'obstacleCleared'; obstacleId: ObjectId; obstacleType: string; gx: number; gy: number; deco?: string }
  | { type: 'obstacleSpawned'; obstacleId: ObjectId }
  | { type: 'toolsBought'; items: Inventory; coins: number }
  | { type: 'dailyClaimed'; streak: number; coins: number; items: Inventory }
  | { type: 'goalClaimed'; goalId: string }
  | { type: 'goalReady'; goalId: string }
  | { type: 'discovered'; item: ItemId }
  | { type: 'itemFound'; item: ItemId; at?: ObjectId }
  | { type: 'villagerTipped'; coins: number }
  | { type: 'giftPacked'; items: Inventory }
  | { type: 'giftReceived'; parcelId: string; items: Inventory };

export type ErrorCode =
  | 'not_found' | 'invalid' | 'locked' | 'no_coins' | 'missing_items' | 'storage_full'
  | 'not_ready' | 'busy' | 'blocked' | 'limit' | 'already_done';

export interface CommandError { code: ErrorCode; message: string; detail?: unknown }

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: CommandError };
