// ============================================================================
// Winterhof – Ansicht aus dem Logik-Kern
// Rechnet den Kern-Spielstand (GameState v8) in die Form um, die die Grafik
// (world.js) und die Fenster lesen. Nur lesen, nie zurückschreiben.
// Wird nur neu gebaut, wenn sich der Kern-Stand ändert (nicht pro Frame).
// Übergang: Wird in Schritt 2 (datengetriebene Darstellung) überflüssig.
// ============================================================================
import { CONTENT } from '../core';

const PROP_KEYS = {
  chalet: 'chalet',
  christmasTree: 'christmasTree',
  wishlistBoard: 'wishlistBoard',
  sleigh: 'sleighPos',
  mailbox: 'mailbox'
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function quoteFor(order) {
  const npc = CONTENT.npcs.find((n) => n.id === order.npc) || CONTENT.npcs[0];
  const quotes = npc.quotes || [];
  return quotes.length ? quotes[hash(order.id) % quotes.length] : '';
}

export function buildView(s, nowMs = Date.now()) {
  const v = {
    villageName: s.villageName,
    playerName: s.playerName,
    coins: s.coins,
    xp: s.xp,
    level: s.level,
    inventory: s.inventory,
    storedDecos: s.storedDecos,
    unlockedLands: s.unlockedZones,
    discoveredItems: s.discovered,
    claimedAchievements: s.claimedGoals,
    claimedChapters: s.claimedGoals,
    claimedGifts: s.claimedGifts,
    stats: { ...s.stats, barnUpgrades: s.stats.storageUpgrades },
    settings: s.settings,
    dailyStreak: s.daily.streak,
    stations: [],
    fields: [],
    animals: [],
    decorations: [],
    orders: [],
    standSlots: []
  };

  for (const o of s.objects) {
    if (o.kind === 'prop') {
      const key = PROP_KEYS[o.type];
      if (key) v[key] = { gx: o.gx, gy: o.gy };
    } else if (o.kind === 'station') {
      v.stations.push({
        id: o.id, type: o.type, gx: o.gx, gy: o.gy, built: true, wrapped: o.wrapped,
        craftedCount: o.craftedCount, ready: o.ready,
        queue: o.queue.map((j) => ({ itemId: j.item, startedAt: j.startAt, doneAt: j.endAt, finishAt: j.endAt }))
      });
    } else if (o.kind === 'field') {
      v.fields.push({ id: o.id, gx: o.gx, gy: o.gy, cropId: o.crop, plantedAt: o.plantedAt });
    } else if (o.kind === 'animal') {
      v.animals.push({ id: o.id, type: o.type, nick: o.nick, gx: o.gx, gy: o.gy, state: o.state, readyAt: o.readyAt, lastPet: o.lastPet });
    } else if (o.kind === 'deco') {
      v.decorations.push({ id: o.id, type: o.type, gx: o.gx, gy: o.gy });
    }
  }

  for (const ord of s.orders) {
    if (ord.availableAt > nowMs) continue;
    v.orders.push({
      id: ord.id, npcId: ord.npc, quote: quoteFor(ord), coins: ord.coins, xp: ord.xp,
      req: Object.fromEntries(ord.lines.map((l) => [l.item, l.qty]))
    });
  }

  v.standSlots = s.stand.map((sl) => sl && ({
    itemId: sl.item, qty: sl.qty, price: sl.price, sellAt: sl.sellAt, sold: sl.sold, buyerName: sl.buyer
  }));

  return v;
}
