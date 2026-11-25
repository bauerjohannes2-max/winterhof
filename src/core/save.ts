// ============================================================================
// Winterhof Core – Speicherstand: Serialisieren, Prüfen, Migrieren
// Regel: Eine Migration darf NIE Fortschritt löschen. Unbekanntes wird
// gemeldet, nicht still verworfen.
// ============================================================================
import { CONTENT } from './content';
import { validateLayout } from './map';
import { ITEM_RENAMES_V9, ZONES_V8, oldLandV9, upgradeFromV8, upgradeLayout, type LegacyAnimalObject } from './migrate';
import { SCHEMA_VERSION, createNewGame, emptyStats, levelForXp } from './state';
import type { GameState, MapObject, StatKey } from './types';

export const SAVE_KEY = 'winterhof_save_v8';
export const BACKUP_KEY = 'winterhof_save_v8_backup';
/** Unveränderte Kopie des letzten v8-Stands vor der Umstellung auf v9 (wird nie überschrieben). */
export const BEFORE_V9_KEY = 'winterhof_save_v8_before_v9';
/** Unveränderte Kopie des letzten v9-Stands vor der Umstellung auf v10 (Baustein 5b, wird nie überschrieben). */
export const BEFORE_V10_KEY = 'winterhof_save_v9_before_v10';
export const LEGACY_KEYS = ['winterhof_save_v6_grid', 'winterhof_save_v6', 'winterhof_save_v5', 'winterhof_save_v2'];

export interface LoadReport {
  state: GameState;
  /** current = aktuelles Format; v9 / v8 / legacy = migriert; new = neues Spiel */
  source: 'new' | 'current' | 'v9' | 'v8' | 'legacy';
  warnings: string[];
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

/** Lädt Rohdaten (v10, v9, v8 oder Altformat). Wirft nur bei völlig unlesbaren Daten. */
export function deserialize(raw: string, nowMs: number): LoadReport {
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (!data || typeof data !== 'object') throw new Error('Spielstand ist kein Objekt');
  if (data.schemaVersion === SCHEMA_VERSION) {
    const warnings = checkState(data as unknown as GameState);
    return { state: repair(data as unknown as GameState, nowMs), source: 'current', warnings };
  }
  if (data.schemaVersion === 9) {
    const owned = Array.isArray(data.ownedPlots) ? (data.ownedPlots as unknown[]).filter((z): z is string => typeof z === 'string') : [];
    const warnings: string[] = [];
    const s = upgradeLayout(repair(data as unknown as GameState, nowMs), oldLandV9(owned), nowMs, warnings);
    warnings.push(...checkState(s));
    return { state: s, source: 'v9', warnings };
  }
  if (data.schemaVersion === 8) {
    const oldZones = Array.isArray(data.unlockedZones) ? (data.unlockedZones as unknown[]).filter((z): z is string => typeof z === 'string') : [];
    const warnings: string[] = [];
    const s = upgradeFromV8(repair({ ...(data as unknown as GameState), ownedPlots: [] }, nowMs), oldZones, nowMs, warnings);
    warnings.push(...checkState(s));
    return { state: s, source: 'v8', warnings };
  }
  if (typeof data.schemaVersion === 'number' && data.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Spielstand ist neuer (v${data.schemaVersion}) als dieses Spiel (v${SCHEMA_VERSION})`);
  }
  return migrateLegacy(data, nowMs);
}

/** Strukturelle Prüfung – liefert Warnungen statt Abbruch. */
export function checkState(s: GameState): string[] {
  const w: string[] = [];
  if (!Number.isFinite(s.coins) || s.coins < 0) w.push('Münzen ungültig');
  if (!Number.isFinite(s.xp) || s.xp < 0) w.push('XP ungültig');
  for (const [id, q] of Object.entries(s.inventory ?? {})) {
    if (!CONTENT.items[id]) w.push(`Unbekannte Ware im Lager: ${id}`);
    if (!Number.isInteger(q) || q < 0) w.push(`Menge ungültig: ${id}=${q}`);
  }
  for (const o of s.objects ?? []) {
    if (o.kind === 'station' && !CONTENT.stations[o.type]) w.push(`Unbekanntes Gebäude: ${o.type}`);
    if (o.kind === 'pen') {
      const def = CONTENT.pens[o.type];
      if (!def) w.push(`Unbekanntes Gehege: ${o.type}`);
      else if (o.animals.length > def.capacity) w.push(`Gehege ${o.id}: ${o.animals.length} Tiere, Platz für ${def.capacity}`);
    }
  }
  w.push(...validateLayout(s));
  return w;
}

/** Fehlende Felder ergänzen, Zahlen klemmen – ohne Fortschritt zu verlieren. */
function repair(s: GameState, nowMs: number): GameState {
  const base = createNewGame(nowMs);
  const out: GameState = {
    ...base,
    ...s,
    stats: { ...emptyStats(), ...(s.stats ?? {}) },
    settings: { ...base.settings, ...(s.settings ?? {}) },
    daily: { ...base.daily, ...(s.daily ?? {}) },
    storage: { ...base.storage, ...(s.storage ?? {}) },
    stand: Array.from({ length: CONTENT.stand.slots }, (_, i) => s.stand?.[i] ?? null)
  };
  out.coins = Math.max(0, Math.floor(Number(out.coins) || 0));
  out.xp = Math.max(0, Math.floor(Number(out.xp) || 0));
  out.level = Math.max(out.level || 1, levelForXp(out.xp));
  out.clockMaxMs = Math.max(out.clockMaxMs || 0, 0);
  return out;
}

// ---------------------------------------------------------------- Altformat (v2–v7)
type Legacy = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function migrateLegacy(d: Legacy, nowMs: number): LoadReport {
  const warnings: string[] = [];
  const s = createNewGame(nowMs);
  s.villageName = typeof d.villageName === 'string' ? d.villageName : s.villageName;
  s.playerName = typeof d.playerName === 'string' ? d.playerName : s.playerName;
  s.coins = Math.max(0, Math.floor(Number(d.coins ?? s.coins)));
  s.xp = Math.max(0, Math.floor(Number(d.xp ?? 0)));
  s.level = levelForXp(s.xp);
  const oldZones: string[] = Array.isArray(d.unlockedLands) ? d.unlockedLands.filter((z: unknown) => typeof z === 'string' && z in ZONES_V8) : [];

  // Lager: alles übernehmen; unbekannte Waren melden (nicht still löschen)
  s.inventory = {};
  for (const [oldId, q] of Object.entries((d.inventory ?? {}) as Record<string, number>)) {
    const id = ITEM_RENAMES_V9[oldId] ?? oldId;
    const n = Math.floor(Number(q));
    if (!(n > 0)) continue;
    if (CONTENT.items[id]) s.inventory[id] = (s.inventory[id] ?? 0) + n;
    else warnings.push(`Ware ${id} (${n}×) gibt es nicht mehr – nicht übernommen`);
  }
  // Kapazität so wählen, dass nichts verloren geht
  const oldCap = Number(d.barnCapacity) || CONTENT.storage.barn.baseCapacity;
  for (const k of ['silo', 'barn'] as const) {
    const def = CONTENT.storage[k];
    const used = Object.entries(s.inventory).filter(([id]) => CONTENT.items[id]!.storage === k).reduce((a, [, q]) => a + q, 0);
    const need = Math.max(oldCap, used);
    s.storage[k] = Math.min(Math.max(def.baseCapacity, Math.ceil(need / def.stepCapacity) * def.stepCapacity), Math.max(def.maxCapacity, need));
  }

  // Objekte: feste Gebäude an alten Positionen übernehmen
  const objects: MapObject[] = [];
  const prop = (id: string, type: string, pos: unknown, fallback: MapObject) => {
    const p = pos as { gx?: unknown; gy?: unknown } | null | undefined;
    if (p && Number.isInteger(p.gx) && Number.isInteger(p.gy)) objects.push({ id, kind: 'prop', type, gx: p.gx as number, gy: p.gy as number });
    else objects.push(fallback);
  };
  const startObj = (id: string) => s.objects.find((o) => o.id === id)!;
  prop('chalet', 'chalet', d.chalet, startObj('chalet'));
  prop('christmasTree', 'christmasTree', d.christmasTree, startObj('christmasTree'));
  prop('wishlistBoard', 'wishlistBoard', d.wishlistBoard, startObj('wishlistBoard'));
  prop('sleigh', 'sleigh', d.sleighPos, startObj('sleigh'));
  prop('mailbox', 'mailbox', d.mailbox, startObj('mailbox'));
  objects.push(startObj('dailyChest'));

  for (const st of (d.stations ?? []) as Legacy[]) {
    if (!CONTENT.stations[st.type]) { warnings.push(`Gebäude ${st.type} gibt es nicht mehr`); continue; }
    if (st.built === false) continue; // nie gebaut = kein Fortschritt
    const queue: { item: string; startAt: number | null; endAt: number | null }[] = [];
    let prevEnd: number | null = null;
    for (const j of (st.queue ?? []) as Legacy[]) {
      if (!CONTENT.items[j.itemId]) continue;
      if (j.started && j.finishAt) { queue.push({ item: j.itemId, startAt: j.finishAt - (CONTENT.items[j.itemId]!.craftTime ?? 0) * 1000, endAt: j.finishAt }); prevEnd = j.finishAt; }
      else {
        const start: number = prevEnd ?? nowMs;
        const end: number = start + (CONTENT.items[j.itemId]!.craftTime ?? 0) * 1000;
        queue.push({ item: j.itemId, startAt: start, endAt: end });
        prevEnd = end;
      }
    }
    objects.push({
      id: String(st.id), kind: 'station', type: st.type, gx: st.gx, gy: st.gy,
      wrapped: !!st.wrapped, queue, ready: ((st.ready ?? []) as string[]).filter((i) => CONTENT.items[i]),
      craftedCount: Number(st.craftedCount) || 0
    });
  }
  for (const f of (d.fields ?? []) as Legacy[]) {
    objects.push({ id: String(f.id), kind: 'field', type: 'field', gx: f.gx, gy: f.gy, crop: CONTENT.items[f.cropId] ? f.cropId : null, plantedAt: Number(f.plantedAt) || nowMs });
  }
  for (const a of (d.animals ?? []) as Legacy[]) {
    if (!CONTENT.animals[a.type]) { warnings.push(`Tier ${a.type} gibt es nicht mehr`); continue; }
    const st = a.state === 'ready' || a.state === 'producing' ? a.state : 'hungry';
    const animal: LegacyAnimalObject = { id: String(a.id), kind: 'animal', type: a.type, gx: a.gx, gy: a.gy, nick: String(a.nick ?? ''), state: st, readyAt: Number(a.readyAt) || nowMs, lastPet: Number(a.lastPet) || 0 };
    (objects as unknown[]).push(animal); // wird in upgradeLayout zum Gehege
  }
  for (const dc of (d.decorations ?? []) as Legacy[]) {
    if (!CONTENT.decorations[dc.type]) { warnings.push(`Deko ${dc.type} gibt es nicht mehr`); continue; }
    objects.push({ id: String(dc.id), kind: 'deco', type: dc.type, gx: dc.gx, gy: dc.gy });
  }
  s.objects = objects;
  s.storedDecos = { ...(d.storedDecos ?? {}) };

  s.stand = Array.from({ length: CONTENT.stand.slots }, (_, i) => {
    const o = d.standSlots?.[i];
    if (!o || !CONTENT.items[o.itemId]) return null;
    return { item: o.itemId, qty: Number(o.qty) || 1, price: Number(o.price) || 1, sellAt: Number(o.sellAt) || nowMs, sold: !!o.sold, buyer: o.buyerName ?? null };
  });

  s.orders = []; // Aufträge sind kein Fortschritt; werden neu erzeugt
  s.daily = { lastDay: d.lastDailyChestDate ?? null, streak: Number(d.dailyStreak) || 0 };
  s.discovered = Array.from(new Set([...(d.discoveredItems ?? []), ...Object.keys(s.inventory)])).filter((i) => CONTENT.items[i]);
  const oldStats = (d.stats ?? {}) as Record<string, number>;
  for (const k of Object.keys(s.stats) as StatKey[]) s.stats[k] = Number(oldStats[k === 'storageUpgrades' ? 'barnUpgrades' : k]) || 0;
  s.claimedGoals = [...(d.claimedAchievements ?? []), ...(d.claimedChapters ?? [])].filter((x: unknown) => typeof x === 'string');
  s.claimedGifts = Array.isArray(d.claimedGifts) ? d.claimedGifts.filter((x: unknown) => typeof x === 'string') : [];
  s.settings = { ...s.settings, ...(typeof d.settings === 'object' ? d.settings : {}) };
  s.clockMaxMs = nowMs;
  upgradeFromV8(s, oldZones, nowMs, warnings);
  warnings.push(...validateLayout(s));
  return { state: s, source: 'legacy', warnings };
}

// ---------------------------------------------------------------- Speicher-Schnittstelle
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Lädt aus dem Speicher; vor jeder Migration wird eine Sicherung angelegt. */
export function loadFromStore(store: KeyValueStore, nowMs: number): LoadReport {
  const raw = store.getItem(SAVE_KEY);
  if (raw) {
    try {
      const r = deserialize(raw, nowMs);
      if (r.source === 'v8' && store.getItem(BEFORE_V9_KEY) === null) store.setItem(BEFORE_V9_KEY, raw);
      if (r.source === 'v9' && store.getItem(BEFORE_V10_KEY) === null) store.setItem(BEFORE_V10_KEY, raw);
      return r;
    }
    catch (e) {
      const bak = store.getItem(BACKUP_KEY);
      if (bak) {
        const r = deserialize(bak, nowMs);
        r.warnings.unshift(`Hauptspielstand defekt (${(e as Error).message}) – Sicherung geladen`);
        return r;
      }
      throw e;
    }
  }
  for (const k of LEGACY_KEYS) {
    const old = store.getItem(k);
    if (!old) continue;
    store.setItem(`${k}_backup_before_v8`, old);
    return deserialize(old, nowMs);
  }
  return { state: createNewGame(nowMs, (nowMs ^ 0x9e3779b9) | 0), source: 'new', warnings: [] };
}

export function saveToStore(store: KeyValueStore, s: GameState): void {
  const prev = store.getItem(SAVE_KEY);
  if (prev) store.setItem(BACKUP_KEY, prev);
  store.setItem(SAVE_KEY, serialize(s));
}
