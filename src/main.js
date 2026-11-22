// ============================================================================
// WINTERHOF & ZAUBERHERBST — Hay-Day Benchmark Main Controller
// ============================================================================

import {
  GRID_SIZE,
  LAND_ZONES,
  ITEMS,
  CROP_IDS,
  ANIMALS,
  STATIONS,
  DECORATIONS,
  ACHIEVEMENTS,
  CHAPTERS,
  NPCS,
  SORTING_HAT_QUOTES,
  BARN_CONFIG,
  ALBUM_SECRETS,
  getBarnUpgradeCost,
  getLevelInfo,
  getStationMastery
} from './gameData.js';
import { sprites } from './sprites.js';
import { audio } from './audio.js';
import { WinterWorld, gridToWorld, worldToGrid } from './world.js';
import {
  encodeGiftParcel,
  decodeGiftParcel,
  buildGiftShareUrl,
  getIncomingUrlGift,
  clearIncomingUrlGift
} from './giftExchange.js';

const SAVE_KEY = 'winterhof_save_v2';

const LOADING_TIPS = [
  '🦉 Tipp: Die Schnee-Eule trägt persönliche Päckchen per WhatsApp-Link!',
  '✨ Tipp: Halte Ausschau nach dem fliegenden Goldenen Schnatz!',
  '🍄 Tipp: Tippe wilde Wald-Schwammerl am Rand der Wiese an!',
  '🌾 Tipp: Wische mit einem Finger über alle reifen Felder zum Ernten!',
  '🍂 Tipp: Oben rechts kannst du jederzeit zwischen Winter & Herbst wechseln!'
];

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function createInitialState() {
  const now = Date.now();
  return {
    version: 4,
    welcomeSeen: false,
    villageName: 'Unser Winterhof',
    playerName: 'Weihnachtsfreund',
    season: 'winter',
    coins: 145,
    xp: 0,
    lastLevel: 1,
    barnCapacity: BARN_CONFIG.baseCapacity,
    lastDailyChestDate: null,
    dailyStreak: 0,
    discoveredItems: ['wheat', 'mushroom', 'pumpkin', 'matcha', 'egg', 'starmilk', 'flour', 'butter'],
    unlockedLands: [],
    storedDecos: {},
    inventory: {
      wheat: 4,
      mushroom: 2,
      pumpkin: 2,
      matcha: 2,
      egg: 1,
      starmilk: 1,
      flour: 2,
      butter: 1
    },
    chalet: { gx: 5, gy: 2 },
    christmasTree: { gx: 8, gy: 2 },
    wishlistBoard: { gx: 11, gy: 3 },
    sleighPos: { gx: 12, gy: 5 },
    mailbox: { gx: 4, gy: 4 },
    stations: [
      { id: 'st_mill_dairy', type: 'mill_dairy', gx: 2, gy: 2, built: true, wrapped: false, craftedCount: 0, queue: [], ready: [] },
      { id: 'st_bakery', type: 'bakery', gx: 3, gy: 6, built: true, wrapped: false, craftedCount: 0, queue: [], ready: [] },
      { id: 'st_teahouse', type: 'teahouse', gx: 10, gy: 6, built: false, wrapped: false, craftedCount: 0, queue: [], ready: [] },
      { id: 'st_patisserie', type: 'patisserie', gx: 3, gy: 10, built: false, wrapped: false, craftedCount: 0, queue: [], ready: [] },
      { id: 'st_workshop', type: 'gift_workshop', gx: 10, gy: 10, built: false, wrapped: false, craftedCount: 0, queue: [], ready: [] }
    ],
    fields: [
      { id: 'f_1', gx: 5, gy: 8, cropId: 'wheat', plantedAt: now - 300000 },
      { id: 'f_2', gx: 6, gy: 8, cropId: 'wheat', plantedAt: now - 300000 },
      { id: 'f_3', gx: 7, gy: 8, cropId: 'mushroom', plantedAt: now - 300000 },
      { id: 'f_4', gx: 5, gy: 9, cropId: 'pumpkin', plantedAt: now - 300000 },
      { id: 'f_5', gx: 6, gy: 9, cropId: 'matcha', plantedAt: now - 300000 },
      { id: 'f_6', gx: 7, gy: 9, cropId: null, plantedAt: 0 }
    ],
    animals: [
      { id: 'a_1', type: 'chicken', nick: 'Flöckchen', gx: 8, gy: 10, state: 'ready', readyAt: now - 1000, lastPet: 0 },
      { id: 'a_2', type: 'reindeer', nick: 'Rudi', gx: 10, gy: 10, state: 'ready', readyAt: now - 1000, lastPet: 0 }
    ],
    decorations: [
      { id: 'd_1', type: 'snowman', gx: 4, gy: 9 },
      { id: 'd_2', type: 'pumpkin_lantern', gx: 4, gy: 8 },
      { id: 'd_3', type: 'ghost', gx: 11, gy: 8 },
      { id: 'd_4', type: 'sorting_hat', gx: 8, gy: 4 },
      { id: 'd_5', type: 'lantern', gx: 6, gy: 5 },
      { id: 'd_6', type: 'lantern', gx: 9, gy: 6 },
      { id: 'd_7', type: 'giftpile', gx: 10, gy: 4 },
      { id: 'd_8', type: 'mushrooms', gx: 3, gy: 9 }
    ],
    wildMushrooms: [
      { id: 'wm_1', gx: 2, gy: 5 },
      { id: 'wm_2', gx: 12, gy: 11 }
    ],
    lastWildSpawn: now,
    standSlots: [null, null, null, null, null, null],
    orders: [],
    stats: {
      harvests: 0,
      wildMushrooms: 0,
      crafted: 0,
      matchaMade: 0,
      pets: 0,
      snitches: 0,
      ordersDone: 0,
      standSales: 0,
      seasonSwitches: 0,
      landsUnlocked: 0,
      hatTalks: 0,
      chestsOpened: 0,
      villagerDeals: 0,
      barnUpgrades: 0
    },
    claimedAchievements: [],
    claimedChapters: [],
    claimedGifts: [],
    settings: {
      sfx: true,
      music: false,
      lighting: 'auto'
    }
  };
}

class WinterhofGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.world = new WinterWorld(this.canvas);
    this.state = this.loadState();

    while (this.state.orders.length < 4) {
      this.state.orders.push(this.generateOrder());
    }

    audio.setSfx(this.state.settings.sfx);
    audio.setSeason(this.state.season);
    this.world.lightingMode = this.state.settings.lighting || 'auto';
    this.world.seasonBlend = this.state.season === 'autumn' ? 1 : 0;
    this.applySeasonBodyClass();

    this.ui = {
      mode: 'normal',
      selectedSeed: null,
      seedTrayOpen: false,
      selectedMoveId: null,
      pendingPurchase: null,
      previewTile: null,
      activeModal: null,
      dailyChestReady: false,
      giftDraft: { items: {}, note: '', generatedCode: null }
    };
    this._saveTimer = null;
    this._lastVillagerOfferCheck = 0;

    this.pointers = new Map();
    this.pinchStartDist = 0;
    this.pinchStartZoom = 1;
    this.dragStart = null;
    this.dragMode = null;
    this.lastPanPos = null;
    this.lastPanTime = 0;
    this.swipedFieldIds = new Set();

    this.toastTimer = null;
    this.lastFrame = performance.now();
    this.lastModalRefresh = 0;

    this.bindUI();
    this.bindCanvasEvents();
    this.updateHUD();
    window.__WINTERHOF__ = this;
  }

  applySeasonBodyClass() {
    document.body.classList.remove('season-winter', 'season-autumn');
    document.body.classList.add(this.state.season === 'autumn' ? 'season-autumn' : 'season-winter');
  }

  async start() {
    // Support embedded splash art in standalone HTML build
    const splashBg = document.getElementById('splash-bg');
    if (splashBg && window.__WINTERHOF_ASSETS__?.splash_art) {
      splashBg.style.backgroundImage = `url("${window.__WINTERHOF_ASSETS__.splash_art}")`;
    }
    const tipEl = document.getElementById('load-tip');
    const barEl = document.getElementById('load-bar-fill');
    if (tipEl) tipEl.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];

    await sprites.loadAll((pct) => {
      if (barEl) barEl.style.width = `${Math.max(14, Math.round(pct * 100))}%`;
    });

    if (barEl) barEl.style.width = '100%';
    await new Promise((r) => setTimeout(r, 260));

    const splash = document.getElementById('loading-screen');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 580);
    }

    const incoming = getIncomingUrlGift();
    if (incoming) {
      clearIncomingUrlGift();
      this.state.welcomeSeen = true;
      setTimeout(() => this.receiveGiftParcel(incoming), 650);
    } else if (!this.state.welcomeSeen) {
      this.state.welcomeSeen = true;
      this.saveState();
      setTimeout(() => this.openModal('welcome'), 420);
    } else {
      this.showToast('✨ Wische über reife Felder oder sammle Wald-Schwammerl!', 3800);
    }

    setInterval(() => this.saveState(), 8000);
    window.addEventListener('pagehide', () => this.saveState());

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.fields || !parsed.stations) return createInitialState();
      const base = createInitialState();
      const merged = {
        ...base,
        ...parsed,
        version: 4,
        storedDecos: parsed.storedDecos || {},
        claimedChapters: parsed.claimedChapters || [],
        lastDailyChestDate: parsed.lastDailyChestDate || null,
        dailyStreak: parsed.dailyStreak || 0,
        stats: { ...base.stats, ...(parsed.stats || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) }
      };
      // Ensure new fields exist on saved stations
      merged.stations = merged.stations.map((st) => ({
        wrapped: false,
        craftedCount: 0,
        ...st
      }));
      // Backward-compatible migration: inject Mühle & Molkerei for pre-v4 saves
      if (!merged.stations.some((s) => s.type === 'mill_dairy')) {
        merged.stations.unshift({
          id: 'st_mill_dairy',
          type: 'mill_dairy',
          gx: 2,
          gy: 2,
          built: true,
          wrapped: false,
          craftedCount: 0,
          queue: [],
          ready: []
        });
        if (!merged.inventory.flour) merged.inventory.flour = 2;
        if (!merged.inventory.butter) merged.inventory.butter = 1;
      }
      // Backward-compatible barn capacity: never lock out an existing large inventory
      const used = Object.values(merged.inventory || {}).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);
      merged.barnCapacity = Math.max(
        parsed.barnCapacity || BARN_CONFIG.baseCapacity,
        used > BARN_CONFIG.baseCapacity ? Math.min(BARN_CONFIG.maxCapacity, Math.ceil((used + 15) / 25) * 25) : BARN_CONFIG.baseCapacity
      );
      // Backfill discovered items album from current inventory
      const disc = new Set(parsed.discoveredItems || base.discoveredItems);
      for (const [id, q] of Object.entries(merged.inventory || {})) {
        if (q > 0 && ITEMS[id]) disc.add(id);
      }
      merged.discoveredItems = [...disc];
      return merged;
    } catch {
      return createInitialState();
    }
  }

  saveState() {
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch {}
  }

  scheduleSave(delayMs = 1500) {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.saveState();
    }, delayMs);
  }

  // ---- Main 60 FPS Loop ----
  loop(now) {
    const dt = Math.min(0.033, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    this.tickSimulation(Date.now());
    this.ui.dailyChestReady = this.isDailyChestReady();
    this.world.update(dt, this.state);
    this.world.render(this.state, this.ui);

    if (
      this.ui.activeModal &&
      (this.ui.activeModal.kind === 'station' || (this.ui.activeModal.kind === 'barn' && this.ui.activeModal.tab === 'stand')) &&
      now - this.lastModalRefresh > 600
    ) {
      this.lastModalRefresh = now;
      this.renderActiveModal();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  tickSimulation(nowMs) {
    let changed = false;

    for (const st of this.state.stations) {
      if (!st.built || st.wrapped || st.queue.length === 0) continue;
      const mastery = getStationMastery(st.craftedCount || 0);
      while (st.queue.length > 0 && nowMs >= st.queue[0].finishAt) {
        const done = st.queue.shift();
        st.ready.push(done.itemId);
        changed = true;
        if (st.queue.length > 0 && !st.queue[0].started) {
          const nextRecipe = ITEMS[st.queue[0].itemId];
          st.queue[0].started = true;
          st.queue[0].finishAt = done.finishAt + Math.round(nextRecipe.craftTime * mastery.speedMult) * 1000;
        }
      }
    }

    for (const an of this.state.animals) {
      if (an.state === 'producing' && nowMs >= an.readyAt) {
        an.state = 'ready';
        changed = true;
      }
    }

    for (let i = 0; i < this.state.standSlots.length; i++) {
      const slot = this.state.standSlots[i];
      if (slot && !slot.sold && nowMs >= slot.sellAt) {
        slot.sold = true;
        const buyer = NPCS[Math.floor(Math.random() * NPCS.length)];
        slot.buyerName = buyer.name;
        slot.buyerEmoji = buyer.emoji;
        changed = true;
        this.showToast(`🏪 ${buyer.name} hat am Hofladen eingekauft!`, 3200);
      }
    }

    if (!this.state.wildMushrooms) this.state.wildMushrooms = [];
    if (this.state.wildMushrooms.length < 3 && nowMs - (this.state.lastWildSpawn || 0) > 65000) {
      this.state.lastWildSpawn = nowMs;
      const spot = this._findFreeForestSpot();
      if (spot) {
        this.state.wildMushrooms.push({ id: 'wm_' + nowMs, gx: spot.gx, gy: spot.gy });
        changed = true;
      }
    }

    if (changed) {
      this.saveState();
      this.updateHUD();
    }

    // Periodic Doorstep Buy Offers from strolling villagers
    if (nowMs - this._lastVillagerOfferCheck > 22000) {
      this._lastVillagerOfferCheck = nowMs;
      for (const v of this.world.villagers) {
        if (v.offer && (this.state.inventory[v.offer.itemId] || 0) < v.offer.qty) {
          v.offer = null;
        }
      }
      const hasAnyOffer = this.world.villagers.some((v) => v.offer);
      if (!hasAnyOffer && this.world.villagers.length > 0) {
        const v = this.world.villagers[Math.floor(Math.random() * this.world.villagers.length)];
        this.generateVillagerOffer(v);
      }
    }
  }

  _findFreeForestSpot() {
    for (let tries = 0; tries < 25; tries++) {
      const gx = 2 + Math.floor(Math.random() * 12);
      const gy = 2 + Math.floor(Math.random() * 12);
      if (this.isAreaFree(gx, gy, 1) && !this.state.wildMushrooms.some((w) => w.gx === gx && w.gy === gy)) {
        return { gx, gy };
      }
    }
    return null;
  }

  // ---- Economy, Barn Capacity, Daily Chest, Offers, Chapters & Mastery ----
  getBarnUsed() {
    let total = 0;
    for (const q of Object.values(this.state.inventory || {})) {
      if (q > 0) total += q;
    }
    return total;
  }

  getBarnCapacity() {
    return this.state.barnCapacity || BARN_CONFIG.baseCapacity;
  }

  hasBarnSpace(qty = 1) {
    return this.getBarnUsed() + qty <= this.getBarnCapacity();
  }

  notifyBarnFull() {
    audio.playTap();
    this.showToast(`Scheune voll (${this.getBarnUsed()}/${this.getBarnCapacity()})! Im Vorrat erweitern oder verkaufen.`, 3400);
  }

  upgradeBarn() {
    const cap = this.getBarnCapacity();
    if (cap >= BARN_CONFIG.maxCapacity) {
      this.showToast('Dein Scheunen-Lager ist bereits maximal ausgebaut!');
      return false;
    }
    const cost = getBarnUpgradeCost(cap);
    if (this.state.coins < cost) {
      this.showToast(`Zu wenig Münzen! (${cost} ★ benötigt)`);
      return false;
    }
    this.state.coins -= cost;
    this.state.barnCapacity = Math.min(BARN_CONFIG.maxCapacity, cap + BARN_CONFIG.stepCapacity);
    this.incStat('barnUpgrades', 1);
    this.addXp(25);
    audio.playLevelUp();
    this.showToast(`Scheune erweitert auf ${this.state.barnCapacity} Plätze!`, 3000);
    this.saveState();
    this.updateHUD();
    this.renderActiveModal();
    return true;
  }

  addItem(itemId, qty = 1) {
    this.state.inventory[itemId] = (this.state.inventory[itemId] || 0) + qty;
    if (ITEMS[itemId]) {
      if (!this.state.discoveredItems) this.state.discoveredItems = [];
      if (!this.state.discoveredItems.includes(itemId)) {
        this.state.discoveredItems.push(itemId);
      }
    }
  }

  getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  isDailyChestReady() {
    return this.state.lastDailyChestDate !== this.getTodayKey();
  }

  claimDailyChest() {
    if (!this.isDailyChestReady()) {
      this.showToast('Die heutige Schatztruhe wurde bereits geöffnet!');
      return null;
    }
    const today = this.getTodayKey();
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayKey = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
    const streak = this.state.lastDailyChestDate === yesterdayKey ? (this.state.dailyStreak || 0) + 1 : 1;
    this.state.lastDailyChestDate = today;
    this.state.dailyStreak = streak;
    this.ui.dailyChestReady = false;

    const lvl = getLevelInfo(this.state.xp).level;
    const coins = 45 + Math.min(streak, 7) * 10;
    const xp = 20 + Math.min(streak, 7) * 4;
    const unlockedPool = Object.values(ITEMS).filter((it) => it.unlockLevel <= lvl);
    const rewardItems = {};
    for (let i = 0; i < 2 && unlockedPool.length > 0; i++) {
      const pick = unlockedPool[Math.floor(Math.random() * unlockedPool.length)];
      rewardItems[pick.id] = (rewardItems[pick.id] || 0) + (pick.category === 'crop' ? 2 : 1);
    }

    const pos = gridToWorld(6.5, 4.5);
    this.addCoins(coins, pos.x, pos.y - 38);
    for (const [id, q] of Object.entries(rewardItems)) this.addItem(id, q);
    this.incStat('chestsOpened', 1);
    this.addXp(xp);
    audio.playLevelUp();
    this.world.spawnBurst(pos.x, pos.y - 36, '#FDE047', 24, 'star');
    this.saveState();
    this.updateHUD();
    const reward = { streak, coins, xp, items: rewardItems };
    this.openModal('daily_chest', { reward });
    return reward;
  }

  generateVillagerOffer(villager) {
    if (!villager) return null;
    const entries = Object.entries(this.state.inventory || {}).filter(([id, q]) => q >= 1 && ITEMS[id]);
    if (entries.length === 0) return null;
    const [itemId, have] = entries[Math.floor(Math.random() * entries.length)];
    const qty = Math.min(have, ITEMS[itemId].category === 'crop' ? 2 : 1);
    const price = Math.round(ITEMS[itemId].sellPrice * qty * 1.22) + 4;
    const xp = Math.max(8, Math.round(ITEMS[itemId].xp * qty * 0.8));
    villager.offer = { itemId, qty, price, xp };
    return villager.offer;
  }

  acceptVillagerOffer(villagerId) {
    const v = this.world.villagers.find((x) => x.id === villagerId);
    if (!v || !v.offer) return false;
    const { itemId, qty, price, xp } = v.offer;
    if ((this.state.inventory[itemId] || 0) < qty) {
      this.showToast(`Es fehlen ${ITEMS[itemId]?.name || 'Waren'} im Vorrat!`);
      return false;
    }
    this.removeItem(itemId, qty);
    v.offer = null;
    v.quote = 'Vielen Dank, das duftet herrlich!';
    v.quoteTimer = 3.2;
    this.incStat('villagerDeals', 1);
    const p = gridToWorld(v.gx, v.gy);
    audio.playCoin();
    this.world.spawnBurst(p.x, p.y - 38, '#FF6B8B', 10, 'heart');
    this.addCoins(price, p.x, p.y - 46);
    this.addXp(xp);
    this.closeModal();
    this.saveState();
    this.updateHUD();
    return true;
  }

  declineVillagerOffer(villagerId) {
    const v = this.world.villagers.find((x) => x.id === villagerId);
    if (v) {
      v.offer = null;
      v.quote = 'Kein Problem, bis bald!';
      v.quoteTimer = 2.6;
    }
    audio.playTap();
    this.closeModal();
  }

  harvestAllReadyFields() {
    const lvl = getLevelInfo(this.state.xp).level;
    if (lvl < 3) {
      this.showToast('Die Alles-ernten-Sense wird ab Level 3 freigeschaltet!');
      return 0;
    }
    const readyFields = this.state.fields.filter((f) => this.isFieldReady(f));
    if (readyFields.length === 0) {
      this.showToast('Aktuell sind keine Felder erntereif.');
      return 0;
    }
    let count = 0;
    let stoppedByBarn = false;
    for (const f of readyFields) {
      if (!this.hasBarnSpace(2)) {
        stoppedByBarn = true;
        break;
      }
      if (this.harvestField(f, true)) count++;
    }
    this.saveState();
    this.updateHUD();
    if (stoppedByBarn) {
      this.showToast(`${count} Felder geerntet — Scheune ist jetzt voll (${this.getBarnUsed()}/${this.getBarnCapacity()})!`, 3400);
    } else if (count > 0) {
      this.showToast(`Alle ${count} reifen Felder mit der Sense geerntet!`, 2800);
    }
    return count;
  }

  removeItem(itemId, qty = 1) {
    const cur = this.state.inventory[itemId] || 0;
    if (cur < qty) return false;
    this.state.inventory[itemId] = cur - qty;
    if (this.state.inventory[itemId] <= 0) delete this.state.inventory[itemId];
    return true;
  }

  incStat(key, delta = 1) {
    this.state.stats[key] = (this.state.stats[key] || 0) + delta;
  }

  getActiveChapter() {
    for (const ch of CHAPTERS) {
      if (!this.state.claimedChapters.includes(ch.id)) return ch;
    }
    return null;
  }

  claimChapter(chId) {
    const ch = CHAPTERS.find((c) => c.id === chId);
    if (!ch || this.state.claimedChapters.includes(chId) || !ch.check(this.state)) return;
    this.state.claimedChapters.push(chId);
    audio.playLevelUp();
    this.addCoins(ch.coins);
    this.addXp(ch.xp);
    this.showToast(`📜 ${ch.title} abgeschlossen! +${ch.coins} ★`, 3400);
    this.saveState();
    this.updateHUD();
    this.renderActiveModal();
  }

  getClaimableAchievements() {
    return ACHIEVEMENTS.filter(
      (a) => !this.state.claimedAchievements.includes(a.id) && (this.state.stats[a.stat] || 0) >= a.goal
    );
  }

  claimAchievement(achId) {
    const ach = ACHIEVEMENTS.find((a) => a.id === achId);
    if (!ach || this.state.claimedAchievements.includes(achId)) return;
    if ((this.state.stats[ach.stat] || 0) < ach.goal) return;
    this.state.claimedAchievements.push(achId);
    audio.playLevelUp();
    this.addCoins(ach.coins);
    this.addXp(ach.xp);
    this.showToast(`🏆 Erfolg „${ach.title}“ abgeholt! +${ach.coins} ★`, 3000);
    this.saveState();
    this.updateHUD();
    this.renderActiveModal();
  }

  addXp(amount) {
    this.state.xp += amount;
    const lvlInfo = getLevelInfo(this.state.xp);
    if (lvlInfo.level > (this.state.lastLevel || 1)) {
      this.state.lastLevel = lvlInfo.level;
      if (lvlInfo.coinBonus > 0) this.state.coins += lvlInfo.coinBonus;
      audio.playLevelUp();
      const treePos = gridToWorld(this.state.christmasTree.gx + 1, this.state.christmasTree.gy + 1);
      this.world.spawnBurst(treePos.x, treePos.y - 110, '#FDE047', 26, 'star');
      this.openModal('levelup', { lvlInfo });
    }
    this.updateHUD();
  }

  addCoins(amount, wx = null, wy = null) {
    this.state.coins += amount;
    if (wx !== null && wy !== null) {
      this.world.spawnFloater(wx, wy, `+${amount} ★`, null, '#FDE047');
      this.world.spawnFlyingHudItem(wx, wy, 'coin', 'coins');
    }
    this.updateHUD();
  }

  // ---- Land Expansion & Grid Occupancy ----
  isTileUnlocked(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return false;
    if (gx >= 2 && gx <= 13 && gy >= 2 && gy <= 13) return true;
    const unlocked = new Set(this.state.unlockedLands || []);
    for (const z of LAND_ZONES) {
      if (unlocked.has(z.id)) {
        const b = z.bounds;
        if (gx >= b.x0 && gx <= b.x1 && gy >= b.y0 && gy <= b.y1) return true;
      }
    }
    return false;
  }

  getLockedZoneAt(gx, gy) {
    const unlocked = new Set(this.state.unlockedLands || []);
    for (const z of LAND_ZONES) {
      if (unlocked.has(z.id)) continue;
      const b = z.bounds;
      if (gx >= b.x0 && gx <= b.x1 && gy >= b.y0 && gy <= b.y1) return z;
    }
    return null;
  }

  unlockLandZone(zoneId) {
    const zone = LAND_ZONES.find((z) => z.id === zoneId);
    if (!zone || (this.state.unlockedLands || []).includes(zoneId)) return false;
    const lvl = getLevelInfo(this.state.xp).level;
    if (lvl < zone.unlockLevel) {
      this.showToast(`🔒 „${zone.name}“ wird ab Level ${zone.unlockLevel} freischaltbar!`);
      return false;
    }
    if (this.state.coins < zone.cost) {
      this.showToast(`Zu wenig Münzen! (${zone.cost} ★ benötigt)`);
      return false;
    }
    this.state.coins -= zone.cost;
    this.state.unlockedLands.push(zoneId);
    this.incStat('landsUnlocked', 1);
    this.addXp(45);
    audio.playLevelUp();
    const sp = gridToWorld(zone.signPos.gx + 0.5, zone.signPos.gy + 0.5);
    this.world.spawnBurst(sp.x, sp.y - 20, '#FDE047', 24, 'star');
    this.world.spawnFloater(sp.x, sp.y - 45, `🗺️ ${zone.name} frei!`, null, '#A7F3D0');
    this.saveState();
    this.updateHUD();
    return true;
  }

  isAreaFree(gx, gy, size = 1, ignoreId = null) {
    for (let dx = 0; dx < size; dx++) {
      for (let dy = 0; dy < size; dy++) {
        if (!this.isTileUnlocked(gx + dx, gy + dy)) return false;
      }
    }

    const rects = [
      { id: 'chalet', gx: this.state.chalet.gx, gy: this.state.chalet.gy, s: 2 },
      { id: 'christmasTree', gx: this.state.christmasTree.gx, gy: this.state.christmasTree.gy, s: 2 },
      { id: 'wishlistBoard', gx: this.state.wishlistBoard.gx, gy: this.state.wishlistBoard.gy, s: 1 },
      { id: 'sleighPos', gx: this.state.sleighPos.gx, gy: this.state.sleighPos.gy, s: 2 },
      { id: 'mailbox', gx: this.state.mailbox.gx, gy: this.state.mailbox.gy, s: 1 }
    ];
    for (const st of this.state.stations) {
      if (st.built) rects.push({ id: st.id, gx: st.gx, gy: st.gy, s: 2 });
    }
    for (const f of this.state.fields) rects.push({ id: f.id, gx: f.gx, gy: f.gy, s: 1 });
    for (const a of this.state.animals) rects.push({ id: a.id, gx: a.gx, gy: a.gy, s: 1 });
    for (const d of this.state.decorations) rects.push({ id: d.id, gx: d.gx, gy: d.gy, s: 1 });

    for (const r of rects) {
      if (r.id === ignoreId) continue;
      const overlap = !(gx + size <= r.gx || gx >= r.gx + r.s || gy + size <= r.gy || gy >= r.gy + r.s);
      if (overlap) return false;
    }
    return true;
  }

  // ---- Hit Testing ----
  hitTestWorld(wx, wy) {
    if (this.world.hitTestSnitch(wx, wy)) return { kind: 'snitch' };
    if (this.world.hitTestDailyChest(wx, wy, this.isDailyChestReady())) return { kind: 'daily_chest' };

    const candidates = [];

    // Strolling villagers
    const vil = this.world.hitTestVillager(wx, wy);
    if (vil) {
      candidates.push({
        kind: 'villager',
        entity: vil,
        depth: vil.gx + vil.gy + 0.5,
        hit: () => true
      });
    }

    const unlocked = new Set(this.state.unlockedLands || []);
    for (const z of LAND_ZONES) {
      if (unlocked.has(z.id)) continue;
      const p = gridToWorld(z.signPos.gx + 0.5, z.signPos.gy + 0.5);
      candidates.push({
        kind: 'land_sign', entity: z, depth: z.signPos.gx + z.signPos.gy + 0.8,
        hit: () => Math.abs(wx - p.x) < 62 && wy > p.y - 76 && wy < p.y + 18
      });
    }

    for (const wm of this.state.wildMushrooms || []) {
      const p = gridToWorld(wm.gx + 0.5, wm.gy + 0.5);
      candidates.push({
        kind: 'wild_mushroom', entity: wm, depth: wm.gx + wm.gy + 0.35,
        hit: () => Math.abs(wx - p.x) < 46 && wy > p.y - 72 && wy < p.y + 22
      });
    }

    for (const st of this.state.stations) {
      if (!st.built) continue;
      const p = gridToWorld(st.gx + 1, st.gy + 1);
      candidates.push({
        kind: 'station', entity: st, depth: st.gx + st.gy + 1.5,
        hit: () => Math.abs(wx - p.x) < 92 && wy > p.y - 195 && wy < p.y + 32
      });
    }

    {
      const p = gridToWorld(this.state.chalet.gx + 1, this.state.chalet.gy + 1);
      candidates.push({
        kind: 'chalet', entity: this.state.chalet, depth: this.state.chalet.gx + this.state.chalet.gy + 1.5,
        hit: () => Math.abs(wx - p.x) < 98 && wy > p.y - 200 && wy < p.y + 28
      });
    }
    {
      const p = gridToWorld(this.state.christmasTree.gx + 1, this.state.christmasTree.gy + 1);
      candidates.push({
        kind: 'tree', entity: this.state.christmasTree, depth: this.state.christmasTree.gx + this.state.christmasTree.gy + 1.5,
        hit: () => Math.abs(wx - p.x) < 82 && wy > p.y - 245 && wy < p.y + 26
      });
    }
    {
      const p = gridToWorld(this.state.wishlistBoard.gx + 0.5, this.state.wishlistBoard.gy + 0.5);
      candidates.push({
        kind: 'wishlist', entity: this.state.wishlistBoard, depth: this.state.wishlistBoard.gx + this.state.wishlistBoard.gy + 0.4,
        hit: () => Math.abs(wx - p.x) < 58 && wy > p.y - 135 && wy < p.y + 24
      });
    }
    {
      const p = gridToWorld(this.state.sleighPos.gx + 0.5, this.state.sleighPos.gy + 0.5);
      candidates.push({
        kind: 'sleigh', entity: this.state.sleighPos, depth: this.state.sleighPos.gx + this.state.sleighPos.gy + 0.6,
        hit: () => Math.abs(wx - p.x) < 96 && wy > p.y - 130 && wy < p.y + 36
      });
    }
    {
      const p = gridToWorld(this.state.mailbox.gx + 0.5, this.state.mailbox.gy + 0.5);
      candidates.push({
        kind: 'mailbox', entity: this.state.mailbox, depth: this.state.mailbox.gx + this.state.mailbox.gy + 0.4,
        hit: () => Math.abs(wx - p.x) < 42 && wy > p.y - 120 && wy < p.y + 20
      });
    }

    for (const an of this.state.animals) {
      const mot = this.world.getAnimalMotion(an);
      const p = gridToWorld(an.gx + 0.5 + mot.ox, an.gy + 0.5 + mot.oy);
      candidates.push({
        kind: 'animal', entity: an, depth: an.gx + mot.ox + an.gy + mot.oy + 0.35,
        hit: () => Math.abs(wx - p.x) < 52 && wy > p.y - 108 && wy < p.y + 22
      });
    }

    for (const d of this.state.decorations) {
      const p = gridToWorld(d.gx + 0.5, d.gy + 0.5);
      candidates.push({
        kind: 'deco', entity: d, depth: d.gx + d.gy + 0.3,
        hit: () => Math.abs(wx - p.x) < 44 && wy > p.y - 98 && wy < p.y + 20
      });
    }

    candidates.sort((a, b) => b.depth - a.depth);
    for (const c of candidates) if (c.hit()) return c;

    const { gx, gy } = worldToGrid(wx, wy);
    const tx = Math.floor(gx), ty = Math.floor(gy);
    const field = this.state.fields.find((f) => f.gx === tx && f.gy === ty);
    if (field) return { kind: 'field', entity: field };

    return { kind: 'ground', gx: tx, gy: ty };
  }

  getFieldAtWorld(wx, wy) {
    const { gx, gy } = worldToGrid(wx, wy);
    const tx = Math.floor(gx), ty = Math.floor(gy);
    return this.state.fields.find((f) => f.gx === tx && f.gy === ty) || null;
  }

  isFieldReady(f) {
    if (!f || !f.cropId) return false;
    return (Date.now() - f.plantedAt) / 1000 >= ITEMS[f.cropId].growTime;
  }

  // ---- Core Gameplay Actions ----
  harvestField(f, skipImmediateSave = false) {
    if (!this.isFieldReady(f)) return false;
    if (!this.hasBarnSpace(2)) {
      this.notifyBarnFull();
      return false;
    }
    const crop = ITEMS[f.cropId];
    const p = gridToWorld(f.gx + 0.5, f.gy + 0.5);
    f.cropId = null;
    f.plantedAt = 0;

    this.addItem(crop.id, 2);
    this.incStat('harvests', 1);
    this.addXp(crop.xp);
    audio.playHarvest();
    this.world.triggerBounce(f.id);
    this.world.spawnBurst(p.x, p.y - 16, crop.color, 10, 'star');
    this.world.spawnFloater(p.x, p.y - 30, `+2 ${crop.name}`, crop.id, '#FFFDF7');
    this.world.spawnFlyingHudItem(p.x, p.y - 20, crop.id, 'barn');
    if (skipImmediateSave) this.scheduleSave();
    else this.saveState();
    this.updateHUD();
    return true;
  }

  plantField(f, cropId) {
    if (!f || f.cropId) return false;
    const crop = ITEMS[cropId];
    if (!crop) return false;
    const lvl = getLevelInfo(this.state.xp).level;
    if (crop.unlockLevel > lvl) {
      this.showToast(`🔒 Ab Level ${crop.unlockLevel} freigeschaltet!`);
      return false;
    }
    if (this.state.coins < crop.seedCost) {
      this.showToast(`Zu wenig Münzen! (${crop.seedCost} ★ benötigt)`);
      return false;
    }
    this.state.coins -= crop.seedCost;
    f.cropId = cropId;
    f.plantedAt = Date.now();

    const p = gridToWorld(f.gx + 0.5, f.gy + 0.5);
    audio.playPlant();
    this.world.triggerBounce(f.id);
    this.world.spawnBurst(p.x, p.y - 6, '#86EFAC', 6, 'star');
    this.saveState();
    this.updateHUD();
    return true;
  }

  forageWildMushroom(wm) {
    const idx = this.state.wildMushrooms.findIndex((w) => w.id === wm.id);
    if (idx === -1) return;
    if (!this.hasBarnSpace(2)) {
      this.notifyBarnFull();
      return;
    }
    this.state.wildMushrooms.splice(idx, 1);
    const p = gridToWorld(wm.gx + 0.5, wm.gy + 0.5);
    this.addItem('mushroom', 2);
    this.incStat('wildMushrooms', 1);
    this.addXp(10);
    audio.playCollect();
    this.world.spawnBurst(p.x, p.y - 24, '#F97316', 14, 'star');
    this.world.spawnFloater(p.x, p.y - 42, `+2 Herbst-Schwammerl 🍄`, 'mushroom', '#FFFDF7');
    this.world.spawnFlyingHudItem(p.x, p.y - 26, 'mushroom', 'barn');
    this.saveState();
    this.updateHUD();
  }

  catchGoldenSnitch() {
    if (!this.world.snitch) return;
    const { x, y } = this.world.snitch;
    this.world.snitch = null;
    this.world.snitchCooldown = 50 + Math.random() * 30;
    this.incStat('snitches', 1);
    audio.playLevelUp();
    this.world.spawnBurst(x, y, '#FEF08A', 26, 'star');
    this.addCoins(28, x, y - 16);
    this.addXp(18);
    this.world.spawnFloater(x, y - 50, `✨ Schnatz gefangen! +18 XP`, null, '#FEF08A');
    this.saveState();
    this.updateHUD();
  }

  greetVillager(v) {
    if (v.offer) {
      audio.playTap();
      this.openModal('villager_offer', { villagerId: v.id });
      return;
    }
    const p = gridToWorld(v.gx, v.gy);
    audio.playPet(1.15);
    this.world.spawnBurst(p.x, p.y - 36, '#FF6B8B', 7, 'heart');
    const now = Date.now();
    if (now - (v.lastTipAt || 0) > 45000) {
      v.lastTipAt = now;
      v.quote = 'Hier, ein kleines Trinkgeld! ★';
      v.quoteTimer = 3.2;
      this.addCoins(5, p.x, p.y - 45);
      this.saveState();
    } else {
      v.quote = 'Hallo auf deinem Winterhof! ❤️';
      v.quoteTimer = 2.8;
    }
  }

  interactAnimal(an) {
    const def = ANIMALS[an.type];
    const nick = an.nick || def.defaultNick;
    const mot = this.world.getAnimalMotion(an);
    const p = gridToWorld(an.gx + 0.5 + mot.ox, an.gy + 0.5 + mot.oy);
    this.world.triggerBounce(an.id);

    if (an.state === 'ready') {
      if (!this.hasBarnSpace(1)) {
        this.notifyBarnFull();
        return;
      }
      const prod = ITEMS[def.produceItem];
      an.state = 'hungry';
      an.readyAt = 0;
      this.addItem(prod.id, 1);
      this.addXp(prod.xp);
      audio.playCollect();
      this.world.spawnBurst(p.x, p.y - 36, '#FDE047', 12, 'star');
      this.world.spawnFloater(p.x, p.y - 46, `+1 ${prod.name}`, prod.id, '#FFFDF7');
      this.world.spawnFlyingHudItem(p.x, p.y - 38, prod.id, 'barn');
      this.saveState();
      this.updateHUD();
      return;
    }

    if (an.state === 'hungry') {
      const feed = ITEMS[def.feedItem];
      if ((this.state.inventory[def.feedItem] || 0) >= def.feedQty) {
        this.removeItem(def.feedItem, def.feedQty);
        an.state = 'producing';
        an.readyAt = Date.now() + def.produceTime * 1000;
        audio.playPet(def.soundPitch);
        this.world.spawnBurst(p.x, p.y - 34, '#FF6B8B', 8, 'heart');
        this.world.spawnFloater(p.x, p.y - 48, `${nick} gefüttert! ❤️`, def.feedItem, '#FFD1DC');
        this.saveState();
        this.updateHUD();
      } else {
        audio.playTap();
        this.showToast(`${nick} (${def.name}) möchte 1× ${feed.name}!`);
      }
      return;
    }

    audio.playPet(def.soundPitch);
    this.world.spawnBurst(p.x, p.y - 36, '#FF6B8B', 8, 'heart');
    const now = Date.now();
    if (now - (an.lastPet || 0) > 12000) {
      an.lastPet = now;
      this.incStat('pets', 1);
      this.addXp(3);
      this.world.spawnFloater(p.x, p.y - 52, `${nick} freut sich! ❤️ +3 XP`, null, '#FFD1DC');
      this.saveState();
    } else {
      const left = Math.max(1, Math.ceil((an.readyAt - now) / 1000));
      this.showToast(`${nick} schnurrt vergnügt ❤️ (fertig in ${formatDuration(left)})`);
    }
  }

  unwrapStation(st) {
    if (!st.wrapped) return;
    st.wrapped = false;
    const def = STATIONS[st.type];
    const p = gridToWorld(st.gx + 1, st.gy + 1);
    audio.playUnwrap();
    this.world.triggerBounce(st.id);
    this.world.spawnBurst(p.x, p.y - 75, '#EF4444', 18, 'star');
    this.world.spawnBurst(p.x, p.y - 95, '#FDE047', 18, 'star');
    this.world.spawnFloater(p.x, p.y - 120, `🎉 ${def.name} eröffnet!`, null, '#FEF08A');
    this.addXp(35);
    this.saveState();
    this.updateHUD();
  }

  interactStation(st) {
    if (st.wrapped) {
      this.unwrapStation(st);
      return;
    }

    const p = gridToWorld(st.gx + 1, st.gy + 1);
    this.world.triggerBounce(st.id);

    if (st.ready.length > 0) {
      if (!this.hasBarnSpace(st.ready.length)) {
        this.notifyBarnFull();
        return;
      }
      const collected = [...st.ready];
      st.ready = [];
      let totalXp = 0;
      for (const id of collected) {
        this.addItem(id, 1);
        totalXp += ITEMS[id].xp;
        st.craftedCount = (st.craftedCount || 0) + 1;
        this.incStat('crafted', 1);
        if (id === 'matcha_latte' || id === 'matcha_tiramisu') this.incStat('matchaMade', 1);
      }
      this.addXp(totalXp);
      audio.playCollect();
      this.world.spawnBurst(p.x, p.y - 95, '#FDE047', 16, 'star');
      const first = ITEMS[collected[0]];
      const label = collected.length === 1 ? `+1 ${first.name}` : `+${collected.length} Leckereien!`;
      this.world.spawnFloater(p.x, p.y - 110, label, first.id, '#FFFDF7');
      this.world.spawnFlyingHudItem(p.x, p.y - 95, first.id, 'barn');
      this.saveState();
      this.updateHUD();
      return;
    }

    audio.playTap();
    this.openModal('station', { stationId: st.id });
  }

  startCraft(stationId, itemId) {
    const st = this.state.stations.find((s) => s.id === stationId);
    const recipe = ITEMS[itemId];
    if (!st || !recipe || st.wrapped) return;
    if (st.queue.length >= 4) {
      this.showToast('Alle 4 Plätze sind gerade belegt!');
      return;
    }
    for (const [ingId, qty] of Object.entries(recipe.ingredients)) {
      if ((this.state.inventory[ingId] || 0) < qty) {
        this.showToast(`Es fehlt: ${ITEMS[ingId].name}`);
        return;
      }
    }
    for (const [ingId, qty] of Object.entries(recipe.ingredients)) {
      this.removeItem(ingId, qty);
    }

    const mastery = getStationMastery(st.craftedCount || 0);
    const craftSec = Math.round(recipe.craftTime * mastery.speedMult);
    const now = Date.now();
    const isFirst = st.queue.length === 0;
    st.queue.push({
      itemId,
      started: isFirst,
      finishAt: isFirst ? now + craftSec * 1000 : 0
    });
    audio.playBakeStart();
    const p = gridToWorld(st.gx + 1, st.gy + 1);
    this.world.triggerBounce(st.id);
    this.world.spawnBurst(p.x, p.y - 90, '#FDBA74', 8, 'star');
    this.saveState();
    this.updateHUD();
    this.renderActiveModal();
  }

  // ---- Hofladen ----
  listItemOnStand(slotIdx, itemId) {
    if (this.state.standSlots[slotIdx]) return;
    const have = this.state.inventory[itemId] || 0;
    if (have <= 0) return;
    const qty = Math.min(have, 2);
    this.removeItem(itemId, qty);
    const price = Math.round(ITEMS[itemId].sellPrice * qty * 1.25);
    const waitMs = (28 + Math.floor(Math.random() * 28)) * 1000;
    this.state.standSlots[slotIdx] = {
      itemId, qty, price,
      sellAt: Date.now() + waitMs,
      sold: false, buyerName: null, buyerEmoji: null
    };
    audio.playBakeStart();
    this.saveState();
    this.renderActiveModal();
  }

  collectStandSlot(slotIdx) {
    const slot = this.state.standSlots[slotIdx];
    if (!slot || !slot.sold) return;
    this.state.standSlots[slotIdx] = null;
    this.incStat('standSales', 1);
    audio.playCoin();
    this.addCoins(slot.price);
    this.addXp(8);
    this.showToast(`🏪 +${slot.price} ★ von ${slot.buyerName} eingesammelt!`);
    this.saveState();
    this.updateHUD();
    this.renderActiveModal();
  }

  // ---- Wishlist Orders ----
  generateOrder() {
    const lvl = getLevelInfo(this.state.xp).level;
    const npc = NPCS[Math.floor(Math.random() * NPCS.length)];
    const quote = npc.quotes[Math.floor(Math.random() * npc.quotes.length)];
    const builtTypes = new Set(this.state.stations.filter((s) => s.built && !s.wrapped).map((s) => s.type));

    const pool = Object.values(ITEMS).filter((it) => {
      if (it.unlockLevel > lvl) return false;
      if (it.category === 'crafted' && !builtTypes.has(it.station)) return false;
      if (it.category === 'animal') {
        const hasAnimal = this.state.animals.some((a) => ANIMALS[a.type].produceItem === it.id);
        if (!hasAnimal) return false;
      }
      return true;
    });

    const craftedPool = pool.filter((i) => i.category === 'crafted');
    const req = {};
    const numTypes = Math.random() < 0.55 || pool.length < 3 ? 2 : 3;

    if (craftedPool.length > 0 && Math.random() < 0.78) {
      const c = craftedPool[Math.floor(Math.random() * craftedPool.length)];
      req[c.id] = 1;
    }

    let guard = 0;
    while (Object.keys(req).length < Math.min(numTypes, pool.length) && guard++ < 25) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (req[pick.id]) continue;
      req[pick.id] = pick.category === 'crop' ? 2 + Math.floor(Math.random() * 2) : 1;
    }

    let coinReward = 0, xpReward = 0;
    for (const [id, q] of Object.entries(req)) {
      coinReward += ITEMS[id].sellPrice * q;
      xpReward += ITEMS[id].xp * q;
    }

    return {
      id: 'ord_' + Math.random().toString(36).slice(2, 8),
      npcId: npc.id, quote, req,
      coins: Math.round(coinReward * 1.42) + 15,
      xp: Math.round(xpReward * 1.35) + 10
    };
  }

  fulfillOrder(orderId) {
    const idx = this.state.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;
    const ord = this.state.orders[idx];

    for (const [id, q] of Object.entries(ord.req)) {
      if ((this.state.inventory[id] || 0) < q) return;
    }
    for (const [id, q] of Object.entries(ord.req)) this.removeItem(id, q);

    this.closeModal();
    this.incStat('ordersDone', 1);
    audio.playSleighBells();
    this.world.launchSleigh(this.state);

    const sp = gridToWorld(this.state.sleighPos.gx + 0.5, this.state.sleighPos.gy + 0.5);
    this.world.spawnBurst(sp.x, sp.y - 60, '#FDE047', 22, 'star');
    this.addCoins(ord.coins, sp.x, sp.y - 80);
    this.addXp(ord.xp);
    this.world.spawnFloater(sp.x, sp.y - 115, `+${ord.xp} XP ✨`, null, '#A7F3D0');

    this.state.orders.splice(idx, 1);
    this.state.orders.push(this.generateOrder());
    this.saveState();
    this.updateHUD();
  }

  skipOrder(orderId) {
    const idx = this.state.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;
    audio.playTap();
    this.state.orders[idx] = this.generateOrder();
    this.saveState();
    this.renderActiveModal();
    this.updateHUD();
  }

  receiveGiftParcel(parcel) {
    if (this.state.claimedGifts.includes(parcel.id)) {
      this.showToast('Dieses Eulenpost-Päckchen hast du schon ausgepackt! 🦉');
      return;
    }
    this.closeModal();
    audio.playSleighBells();
    this.showToast(`🦉 Die Schnee-Eule bringt ein Päckchen von ${parcel.from}!`);
    this.world.launchGiftParachute(parcel.from, () => {
      this.state.claimedGifts.push(parcel.id);
      for (const [id, qty] of Object.entries(parcel.items)) this.addItem(id, qty);
      this.addXp(18);
      audio.playGiftOpen();
      this.saveState();
      this.updateHUD();
      this.openModal('gift_opened', { parcel });
    });
  }

  // ---- Place, Move & Store-Deco Modes ----
  enterPlaceMode(purchase) {
    this.closeModal();
    this.closeSeedTray();
    this.ui.mode = 'place';
    this.ui.pendingPurchase = purchase;
    this.ui.selectedMoveId = null;
    this.ui.previewTile = null;
    this.showModeBanner(`Tippe auf freien Platz für: ${purchase.label}`, 'Abbrechen', false);
  }

  enterMoveMode() {
    this.closeModal();
    this.closeSeedTray();
    if (this.ui.mode === 'move') {
      this.exitSpecialMode();
      return;
    }
    this.ui.mode = 'move';
    this.ui.selectedMoveId = null;
    this.ui.pendingPurchase = null;
    this.ui.previewTile = null;
    document.getElementById('dock-move').classList.add('active');
    this.showModeBanner('Tippe Feld, Tier, Gebäude oder Deko zum Verschieben an', 'Fertig', false);
  }

  storeSelectedDeco() {
    if (!this.ui.selectedMoveId) return;
    const idx = this.state.decorations.findIndex((d) => d.id === this.ui.selectedMoveId);
    if (idx === -1) return;
    const deco = this.state.decorations[idx];
    this.state.decorations.splice(idx, 1);
    this.state.storedDecos[deco.type] = (this.state.storedDecos[deco.type] || 0) + 1;
    audio.playTap();
    this.ui.selectedMoveId = null;
    this.ui.previewTile = null;
    this.showModeBanner(`${DECORATIONS[deco.type].name} eingelagert! (Im Shop gratis wieder platzierbar)`, 'Fertig', false);
    this.saveState();
  }

  exitSpecialMode() {
    this.ui.mode = 'normal';
    this.ui.selectedMoveId = null;
    this.ui.pendingPurchase = null;
    this.ui.previewTile = null;
    document.getElementById('dock-move').classList.remove('active');
    document.getElementById('mode-banner').classList.add('hidden');
  }

  showModeBanner(text, btnText = 'Fertig', showStore = false) {
    document.getElementById('mode-banner-text').textContent = text;
    document.getElementById('mode-banner-cancel').textContent = btnText;
    document.getElementById('mode-banner-store').classList.toggle('hidden', !showStore);
    document.getElementById('mode-banner').classList.remove('hidden');
  }

  openSeedTray() {
    this.ui.seedTrayOpen = true;
    const lvl = getLevelInfo(this.state.xp).level;
    if (!this.ui.selectedSeed || ITEMS[this.ui.selectedSeed].unlockLevel > lvl) {
      this.ui.selectedSeed = 'wheat';
    }
    this.renderSeedTray();
    document.getElementById('seed-tray').classList.remove('hidden');
  }

  closeSeedTray() {
    this.ui.seedTrayOpen = false;
    this.ui.selectedSeed = null;
    document.getElementById('seed-tray').classList.add('hidden');
  }

  renderSeedTray() {
    const tray = document.getElementById('seed-tray');
    const lvl = getLevelInfo(this.state.xp).level;
    tray.innerHTML = CROP_IDS.map((id) => {
      const c = ITEMS[id];
      const locked = c.unlockLevel > lvl;
      const active = this.ui.selectedSeed === id;
      return `
        <button class="seed-chip ${active ? 'active' : ''} ${locked ? 'locked' : ''}" data-seed="${id}">
          <img src="${sprites.getIconUrl(id)}" alt="${c.name}" />
          <span class="s-name">${c.name}</span>
          <span class="s-meta">${locked ? `🔒 Lv.${c.unlockLevel}` : `${c.seedCost}★ · ${formatDuration(c.growTime)}`}</span>
        </button>`;
    }).join('');

    tray.querySelectorAll('.seed-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.seed;
        if (ITEMS[id].unlockLevel > lvl) {
          this.showToast(`🔒 ${ITEMS[id].name} wird ab Level ${ITEMS[id].unlockLevel} freigeschaltet!`);
          return;
        }
        audio.playTap();
        this.ui.selectedSeed = id;
        this.renderSeedTray();
        this.showToast(`🌱 Wische über leere Felder, um ${ITEMS[id].name} zu säen!`, 2400);
      });
    });
  }

  showToast(msg, duration = 2700) {
    const el = document.getElementById('toast-tip');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  updateHUD() {
    const info = getLevelInfo(this.state.xp);
    document.getElementById('hud-level').textContent = info.level;
    document.getElementById('hud-village-name').textContent = this.state.villageName;
    document.getElementById('hud-xp-fill').style.width = `${Math.round(info.progress * 100)}%`;
    document.getElementById('hud-coins').textContent = this.state.coins;

    document.getElementById('btn-season').textContent = this.state.season === 'autumn' ? '🍂' : '❄️';
    const lightIcons = { auto: '✨', day: '☀️', dusk: '🌅', night: '🌙' };
    document.getElementById('btn-light').textContent = lightIcons[this.world.lightingMode] || '✨';

    // Story Chapter compact scroll pill
    const ch = this.getActiveChapter();
    const chPill = document.getElementById('chapter-pill');
    if (ch) {
      const done = ch.check(this.state);
      chPill.classList.remove('hidden');
      chPill.classList.toggle('ready', done);
      document.getElementById('chapter-pill-text').textContent = done ? `Kapitel ${ch.num} fertig! 🎁` : `Kapitel ${ch.num}`;
      document.getElementById('chapter-pill-dot').classList.toggle('hidden', !done);
    } else {
      chPill.classList.add('hidden');
    }

    const readyOrders = this.state.orders.filter((o) =>
      Object.entries(o.req).every(([id, q]) => (this.state.inventory[id] || 0) >= q)
    ).length;
    const claimableAch = this.getClaimableAchievements().length;
    const totalOrderBadge = readyOrders + claimableAch;
    const badgeOrd = document.getElementById('badge-orders');
    if (totalOrderBadge > 0) {
      badgeOrd.textContent = totalOrderBadge;
      badgeOrd.classList.remove('hidden');
    } else {
      badgeOrd.classList.add('hidden');
    }

    const soldStand = this.state.standSlots.filter((s) => s && s.sold).length;
    const badgeBarn = document.getElementById('badge-barn');
    if (soldStand > 0) {
      badgeBarn.textContent = soldStand;
      badgeBarn.classList.remove('hidden');
    } else {
      badgeBarn.classList.add('hidden');
    }

    // Level-3 Harvest-All Scythe button visibility
    const scytheBtn = document.getElementById('btn-scythe');
    const scytheCountEl = document.getElementById('scythe-count');
    if (scytheBtn && scytheCountEl) {
      const readyFieldsCount = this.state.fields.filter((f) => this.isFieldReady(f)).length;
      const showScythe = info.level >= 3 && readyFieldsCount > 0;
      scytheBtn.classList.toggle('hidden', !showScythe);
      scytheCountEl.textContent = String(readyFieldsCount);
    }
    this.ui.dailyChestReady = this.isDailyChestReady();
  }

  bindUI() {
    window.addEventListener('resize', () => this.world.resize());

    document.getElementById('btn-village').addEventListener('click', () => {
      audio.playTap();
      this.openModal('village', {}, 'overview');
    });

    document.getElementById('chapter-pill').addEventListener('click', () => {
      audio.playTap();
      this.openModal('chapters');
    });

    document.getElementById('btn-coins').addEventListener('click', () => {
      audio.playTap();
      this.openModal('barn', {}, 'stand');
    });

    document.getElementById('btn-season').addEventListener('click', () => {
      audio.playSleighBells();
      this.state.season = this.state.season === 'winter' ? 'autumn' : 'winter';
      audio.setSeason(this.state.season);
      this.applySeasonBodyClass();
      this.incStat('seasonSwitches', 1);
      this.saveState();
      this.updateHUD();
      this.showToast(
        this.state.season === 'autumn'
          ? '🍂 Goldener Halloween-Herbst! Kürbisse, Laub & Schwammerl!'
          : '❄️ Verschneiter Weihnachtshof! Schneefall & Nordlichter!'
      );
    });

    document.getElementById('btn-light').addEventListener('click', () => {
      audio.playTap();
      const cycle = ['auto', 'day', 'dusk', 'night'];
      const labels = {
        auto: '✨ Tageszeit: Automatischer Wechsel',
        day: '☀️ Tageszeit: Sonniger Tag',
        dusk: '🌅 Tageszeit: Goldene Dämmerung',
        night: '🌙 Tageszeit: Magischer Lichterabend'
      };
      const next = cycle[(cycle.indexOf(this.world.lightingMode) + 1) % cycle.length];
      this.world.lightingMode = next;
      this.state.settings.lighting = next;
      this.saveState();
      this.updateHUD();
      this.showToast(labels[next]);
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      audio.playTap();
      this.openModal('settings');
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      this.world.cam.targetZoom = null;
      this.world.cam.zoom = Math.min(1.65, this.world.cam.zoom * 1.18);
      this.world.clampCamera();
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      this.world.cam.targetZoom = null;
      this.world.cam.zoom = Math.max(0.42, this.world.cam.zoom / 1.18);
      this.world.clampCamera();
    });
    document.getElementById('btn-scythe')?.addEventListener('click', () => {
      this.harvestAllReadyFields();
    });

    document.getElementById('mode-banner-store').addEventListener('click', () => this.storeSelectedDeco());
    document.getElementById('mode-banner-cancel').addEventListener('click', () => {
      audio.playTap();
      this.exitSpecialMode();
    });

    document.getElementById('dock-shop').addEventListener('click', () => {
      audio.playTap();
      this.exitSpecialMode();
      this.closeSeedTray();
      this.openModal('shop', {}, 'buildings');
    });
    document.getElementById('dock-barn').addEventListener('click', () => {
      audio.playTap();
      const hasSold = this.state.standSlots.some((s) => s && s.sold);
      this.openModal('barn', {}, hasSold ? 'stand' : 'inv');
    });
    document.getElementById('dock-orders').addEventListener('click', () => {
      audio.playTap();
      const hasAch = this.getClaimableAchievements().length > 0;
      const hasOrd = this.state.orders.some((o) =>
        Object.entries(o.req).every(([id, q]) => (this.state.inventory[id] || 0) >= q)
      );
      this.openModal('orders', {}, !hasOrd && hasAch ? 'achievements' : 'wishlist');
    });
    document.getElementById('dock-gifts').addEventListener('click', () => {
      audio.playTap();
      this.openModal('gifts', {}, 'send');
    });
    document.getElementById('dock-move').addEventListener('click', () => {
      audio.playTap();
      this.enterMoveMode();
    });

    document.getElementById('modal-close').addEventListener('click', () => {
      audio.playTap();
      this.closeModal();
    });
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') {
        audio.playTap();
        this.closeModal();
      }
    });
  }

  // ---- Canvas Pointer / Touch Gestures ----
  bindCanvasEvents() {
    const c = this.canvas;

    c.addEventListener('pointerdown', (e) => {
      audio.unlock();
      this.world.cam.targetZoom = null;
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        this.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        this.pinchStartZoom = this.world.cam.zoom;
        this.dragMode = 'pinch';
        return;
      }

      this.world.cam.vx = 0;
      this.world.cam.vy = 0;
      this.dragStart = { x: e.clientX, y: e.clientY, time: performance.now() };
      this.lastPanPos = { x: e.clientX, y: e.clientY };
      this.lastPanTime = performance.now();
      this.swipedFieldIds.clear();
      this.dragMode = null;

      if (this.ui.mode === 'place' || (this.ui.mode === 'move' && this.ui.selectedMoveId)) {
        this._updatePlacementPreview(e.clientX, e.clientY);
      }

      if (this.ui.mode === 'normal') {
        const wp = this.world.screenToWorld(e.clientX, e.clientY);
        if (this.world.hitTestSnitch(wp.x, wp.y)) return;
        const f = this.getFieldAtWorld(wp.x, wp.y);
        if (f && this.isFieldReady(f)) {
          this.dragMode = 'swipe-harvest';
          this.harvestField(f);
          this.swipedFieldIds.add(f.id);
          this.world.addSwipePoint(e.clientX, e.clientY, 'harvest');
        } else if (f && !f.cropId && this.ui.seedTrayOpen && this.ui.selectedSeed) {
          this.dragMode = 'swipe-plant';
          this.plantField(f, this.ui.selectedSeed);
          this.swipedFieldIds.add(f.id);
          this.world.addSwipePoint(e.clientX, e.clientY, 'plant');
        }
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) {
        if (this.ui.mode === 'place' || (this.ui.mode === 'move' && this.ui.selectedMoveId)) {
          this._updatePlacementPreview(e.clientX, e.clientY);
        }
        return;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 2 && this.pinchStartDist > 0) {
        const pts = [...this.pointers.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        this.world.cam.zoom = Math.max(0.42, Math.min(1.65, this.pinchStartZoom * (dist / this.pinchStartDist)));
        this.world.clampCamera();
        return;
      }

      if (this.dragMode === 'swipe-harvest') {
        this.world.addSwipePoint(e.clientX, e.clientY, 'harvest');
        const wp = this.world.screenToWorld(e.clientX, e.clientY);
        const f = this.getFieldAtWorld(wp.x, wp.y);
        if (f && !this.swipedFieldIds.has(f.id) && this.isFieldReady(f)) {
          this.swipedFieldIds.add(f.id);
          this.harvestField(f);
        }
        return;
      }

      if (this.dragMode === 'swipe-plant') {
        this.world.addSwipePoint(e.clientX, e.clientY, 'plant');
        const wp = this.world.screenToWorld(e.clientX, e.clientY);
        const f = this.getFieldAtWorld(wp.x, wp.y);
        if (f && !this.swipedFieldIds.has(f.id) && !f.cropId && this.ui.selectedSeed) {
          this.swipedFieldIds.add(f.id);
          this.plantField(f, this.ui.selectedSeed);
        }
        return;
      }

      if (this.dragStart) {
        const dist = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);
        if (dist > 7 || this.dragMode === 'pan') {
          this.dragMode = 'pan';
          const dx = (e.clientX - this.lastPanPos.x) / this.world.cam.zoom;
          const dy = (e.clientY - this.lastPanPos.y) / this.world.cam.zoom;
          this.world.cam.x -= dx;
          this.world.cam.y -= dy;
          this.world.clampCamera();

          const now = performance.now();
          const dt = Math.max(8, now - this.lastPanTime) / 1000;
          this.world.cam.vx = (-dx / dt) * 0.55;
          this.world.cam.vy = (-dy / dt) * 0.55;
          this.lastPanPos = { x: e.clientX, y: e.clientY };
          this.lastPanTime = now;
        }
      }
    });

    const onEnd = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        const wasTap = this.dragStart && !this.dragMode;
        if (wasTap) this.handleCanvasTap(e.clientX, e.clientY);
        this.dragStart = null;
        this.dragMode = null;
        this.pinchStartDist = 0;
      }
    };
    c.addEventListener('pointerup', onEnd);
    c.addEventListener('pointercancel', onEnd);

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.world.cam.targetZoom = null;
      const factor = e.deltaY < 0 ? 1.1 : 0.91;
      this.world.cam.zoom = Math.max(0.42, Math.min(1.65, this.world.cam.zoom * factor));
      this.world.clampCamera();
    }, { passive: false });
  }

  _updatePlacementPreview(sx, sy) {
    const wp = this.world.screenToWorld(sx, sy);
    const { gx, gy } = worldToGrid(wp.x, wp.y);
    const tx = Math.floor(gx), ty = Math.floor(gy);
    let size = 1, ignoreId = null;
    if (this.ui.mode === 'place' && this.ui.pendingPurchase) {
      size = this.ui.pendingPurchase.size || 1;
    } else if (this.ui.mode === 'move' && this.ui.selectedMoveId) {
      const m = this._findMovable(this.ui.selectedMoveId);
      if (m) { size = m.size; ignoreId = m.id; }
    }
    this.ui.previewTile = {
      gx: tx, gy: ty, size,
      valid: this.isAreaFree(tx, ty, size, ignoreId)
    };
  }

  _findMovable(id) {
    const f = this.state.fields.find((x) => x.id === id);
    if (f) return { id, kind: 'field', obj: f, size: 1, label: 'Ackerfeld' };
    const a = this.state.animals.find((x) => x.id === id);
    if (a) return { id, kind: 'animal', obj: a, size: 1, label: a.nick || ANIMALS[a.type].name };
    const d = this.state.decorations.find((x) => x.id === id);
    if (d) return { id, kind: 'deco', obj: d, size: 1, label: DECORATIONS[d.type].name };
    const s = this.state.stations.find((x) => x.id === id && x.built);
    if (s) return { id, kind: 'station', obj: s, size: 2, label: STATIONS[s.type].name };
    return null;
  }

  handleCanvasTap(sx, sy) {
    const wp = this.world.screenToWorld(sx, sy);
    const { gx, gy } = worldToGrid(wp.x, wp.y);
    const tx = Math.floor(gx), ty = Math.floor(gy);

    // 1. Place Mode
    if (this.ui.mode === 'place' && this.ui.pendingPurchase) {
      const p = this.ui.pendingPurchase;
      const size = p.size || 1;
      if (!this.isAreaFree(tx, ty, size)) {
        const lockedZone = this.getLockedZoneAt(tx, ty);
        this.showToast(lockedZone ? `🔒 Schalte zuerst „${lockedZone.name}“ frei!` : 'Hier ist schon etwas im Weg – tippe auf freien Platz!');
        return;
      }
      const fromStorage = p.kind === 'deco' && (this.state.storedDecos[p.type] || 0) > 0;
      const actualCost = fromStorage ? 0 : p.cost;
      if (this.state.coins < actualCost) {
        this.showToast('Nicht genug Münzen!');
        this.exitSpecialMode();
        return;
      }
      this.state.coins -= actualCost;
      const worldP = gridToWorld(tx + size * 0.5, ty + size * 0.5);

      if (p.kind === 'field') {
        const nf = { id: 'f_' + Date.now(), gx: tx, gy: ty, cropId: null, plantedAt: 0 };
        this.state.fields.push(nf);
        this.world.triggerBounce(nf.id);
      } else if (p.kind === 'animal') {
        const def = ANIMALS[p.type];
        const na = { id: 'a_' + Date.now(), type: p.type, nick: def.defaultNick, gx: tx, gy: ty, state: 'hungry', readyAt: 0, lastPet: 0 };
        this.state.animals.push(na);
        this.world.triggerBounce(na.id);
      } else if (p.kind === 'deco') {
        if (fromStorage) {
          this.state.storedDecos[p.type]--;
          if (this.state.storedDecos[p.type] <= 0) delete this.state.storedDecos[p.type];
        } else {
          this.addXp(DECORATIONS[p.type].xp || 12);
        }
        const nd = { id: 'd_' + Date.now(), type: p.type, gx: tx, gy: ty };
        this.state.decorations.push(nd);
        this.world.triggerBounce(nd.id);
      } else if (p.kind === 'station') {
        const st = this.state.stations.find((s) => s.type === p.type);
        if (st) {
          st.built = true;
          st.wrapped = true; // Hay-Day Red-Ribbon Unwrap Moment!!
          st.gx = tx;
          st.gy = ty;
          this.world.triggerBounce(st.id);
          this.showToast(`🎀 Tippe auf das rote Geschenkband, um „${STATIONS[p.type].name}“ auszupacken!`, 3600);
        }
      }

      audio.playCollect();
      this.world.spawnBurst(worldP.x, worldP.y - 24, '#FDE047', 16, 'star');
      this.saveState();
      this.updateHUD();
      this.exitSpecialMode();
      return;
    }

    // 2. Move Mode
    if (this.ui.mode === 'move') {
      if (!this.ui.selectedMoveId) {
        const hit = this.hitTestWorld(wp.x, wp.y);
        if (['field', 'animal', 'deco', 'station'].includes(hit.kind)) {
          this.ui.selectedMoveId = hit.entity.id;
          audio.playTap();
          const m = this._findMovable(hit.entity.id);
          this.showModeBanner(`Neuen Platz tippen für: ${m.label}`, 'Fertig', m.kind === 'deco');
        } else {
          this.showToast('Tippe ein Feld, Tier, Gebäude oder Deko an!');
        }
      } else {
        const m = this._findMovable(this.ui.selectedMoveId);
        if (!m) { this.ui.selectedMoveId = null; return; }
        if (!this.isAreaFree(tx, ty, m.size, m.id)) {
          const lz = this.getLockedZoneAt(tx, ty);
          this.showToast(lz ? `🔒 Grundstück „${lz.name}“ ist noch gesperrt!` : 'Dort ist nicht genug Platz!');
          return;
        }
        m.obj.gx = tx;
        m.obj.gy = ty;
        audio.playPlant();
        this.world.triggerBounce(m.id);
        this.ui.selectedMoveId = null;
        this.ui.previewTile = null;
        this.showModeBanner('Verschoben! Nächstes Objekt tippen oder „Fertig“', 'Fertig', false);
        this.saveState();
      }
      return;
    }

    // 3. Normal Play Mode
    const hit = this.hitTestWorld(wp.x, wp.y);

    if (hit.kind === 'snitch') { this.catchGoldenSnitch(); return; }
    if (hit.kind === 'daily_chest') { this.claimDailyChest(); return; }
    if (hit.kind === 'wild_mushroom') { this.forageWildMushroom(hit.entity); return; }
    if (hit.kind === 'villager') { this.greetVillager(hit.entity); return; }
    if (hit.kind === 'land_sign') { audio.playTap(); this.openModal('shop', {}, 'land'); return; }

    if (hit.kind === 'field') {
      const f = hit.entity;
      if (this.isFieldReady(f)) {
        this.harvestField(f);
      } else if (!f.cropId) {
        if (this.ui.seedTrayOpen && this.ui.selectedSeed) this.plantField(f, this.ui.selectedSeed);
        else { audio.playTap(); this.openSeedTray(); }
      } else {
        const crop = ITEMS[f.cropId];
        const left = Math.max(1, Math.ceil(crop.growTime - (Date.now() - f.plantedAt) / 1000));
        audio.playTap();
        this.world.triggerBounce(f.id);
        this.showToast(`🌱 ${crop.name} ist in ${formatDuration(left)} erntereif!`);
      }
      return;
    }

    if (this.ui.seedTrayOpen) this.closeSeedTray();

    if (hit.kind === 'animal') this.interactAnimal(hit.entity);
    else if (hit.kind === 'station') this.interactStation(hit.entity);
    else if (hit.kind === 'wishlist' || hit.kind === 'sleigh') {
      audio.playTap();
      this.world.triggerBounce('wishlistBoard');
      this.openModal('orders', {}, 'wishlist');
    } else if (hit.kind === 'mailbox') {
      audio.playTap();
      this.world.triggerBounce('mailbox');
      this.openModal('gifts', {}, 'send');
    } else if (hit.kind === 'tree' || hit.kind === 'chalet') {
      audio.playCollect();
      this.world.triggerBounce(hit.kind === 'tree' ? 'christmasTree' : 'chalet');
      const p = gridToWorld(this.state.christmasTree.gx + 1, this.state.christmasTree.gy + 1);
      this.world.spawnBurst(p.x, p.y - 120, '#FDE047', 14, 'star');
      this.openModal('village', {}, 'overview');
    } else if (hit.kind === 'deco') {
      audio.playTap();
      this.world.triggerBounce(hit.entity.id);
      const p = gridToWorld(hit.entity.gx + 0.5, hit.entity.gy + 0.5);
      if (hit.entity.type === 'sorting_hat') {
        const q = SORTING_HAT_QUOTES[Math.floor(Math.random() * SORTING_HAT_QUOTES.length)];
        this.incStat('hatTalks', 1);
        this.saveState();
        this.world.spawnBurst(p.x, p.y - 46, '#FDE047', 12, 'star');
        this.showToast(`🎩 ${q}`, 4400);
      } else if (hit.entity.type === 'ghost') {
        this.world.spawnBurst(p.x, p.y - 42, '#E0F2FE', 8, 'star');
        this.showToast('👻 Buh! Dein kleiner Kuschel-Geist winkt dir zu!');
      } else if (hit.entity.type === 'cauldron') {
        this.world.spawnBurst(p.x, p.y - 45, '#86EFAC', 10, 'star');
        this.showToast('⚗️ Es blubbert magisch nach Matcha und Zaubertrank!');
      }
    }
  }

  // ============================================================================
  // MODALS
  // ============================================================================
  openModal(kind, data = {}, tab = null) {
    this.ui.activeModal = { kind, data, tab };
    this.renderActiveModal();
    document.getElementById('modal-backdrop').classList.remove('hidden');
  }

  closeModal() {
    this.ui.activeModal = null;
    document.getElementById('modal-backdrop').classList.add('hidden');
  }

  renderActiveModal() {
    const m = this.ui.activeModal;
    if (!m) return;
    const titleEl = document.getElementById('modal-title');
    const tabsEl = document.getElementById('modal-tabs');
    const bodyEl = document.getElementById('modal-body');
    tabsEl.style.display = 'none';
    tabsEl.innerHTML = '';

    if (m.kind === 'welcome') this._renderWelcomeModal(titleEl, bodyEl);
    else if (m.kind === 'chapters') this._renderChaptersModal(titleEl, bodyEl);
    else if (m.kind === 'station') this._renderStationModal(titleEl, bodyEl, m.data.stationId);
    else if (m.kind === 'orders') this._renderOrdersModal(titleEl, tabsEl, bodyEl, m.tab || 'wishlist');
    else if (m.kind === 'barn') this._renderBarnModal(titleEl, tabsEl, bodyEl, m.tab || 'inv');
    else if (m.kind === 'shop') this._renderShopModal(titleEl, tabsEl, bodyEl, m.tab || 'buildings');
    else if (m.kind === 'gifts') this._renderGiftsModal(titleEl, tabsEl, bodyEl, m.tab || 'send');
    else if (m.kind === 'gift_opened') this._renderGiftOpenedModal(titleEl, bodyEl, m.data.parcel);
    else if (m.kind === 'daily_chest') this._renderDailyChestModal(titleEl, bodyEl, m.data.reward);
    else if (m.kind === 'villager_offer') this._renderVillagerOfferModal(titleEl, bodyEl, m.data.villagerId);
    else if (m.kind === 'village') this._renderVillageModal(titleEl, tabsEl, bodyEl, m.tab || 'overview');
    else if (m.kind === 'settings') this._renderSettingsModal(titleEl, bodyEl);
    else if (m.kind === 'levelup') this._renderLevelUpModal(titleEl, bodyEl, m.data.lvlInfo);
  }

  _renderWelcomeModal(titleEl, bodyEl) {
    titleEl.textContent = '🦉 Ein Brief per Schnee-Eule';
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:12px;background:linear-gradient(180deg,#FFFDF2,#F9EED4)">
        <div style="font-size:48px">🦉💌✨</div>
        <div style="font-size:18px;font-weight:900;color:#8A1C17">Für meinen Lieblingsmenschen ❤️</div>
        <div style="font-size:14px;line-height:1.5;color:var(--text-dark);background:#FFFDF9;padding:12px 14px;border-radius:16px;border:2px solid var(--cream-border)">
          Willkommen auf deinem ganz eigenen <b>Herbst-, Winter- &amp; Zauberhof</b>!<br/><br/>
          Hier warten frischer <b>Matcha-Latte</b>, himmlisches <b>Matcha-Tiramisu</b>, knusprige <b>Waffeln</b>, goldene <b>Butterplätzchen</b>, Wald-<b>Schwammerl</b>, süße <b>Kürbisse &amp; Geister</b> und ein Hauch <b>Zauberei</b> auf dich.<br/><br/>
          Oben rechts kannst du jederzeit zwischen <b>❄️ Winter</b> und <b>🍂 Herbst</b> wechseln – und halte Ausschau nach dem <b>Goldenen Schnatz</b>! ✨
        </div>
        <button id="btn-welcome-go" class="btn-red" style="padding:12px 28px;font-size:15px">Hof betreten! 🎄🍂</button>
      </div>`;
    bodyEl.querySelector('#btn-welcome-go').addEventListener('click', () => {
      audio.playSleighBells();
      this.closeModal();
      this.showToast('✨ Wische über deine reifen Felder zum Ernten!', 4000);
    });
  }

  _renderChaptersModal(titleEl, bodyEl) {
    titleEl.textContent = '📜 Hof-Kapitel (Stück für Stück)';
    bodyEl.innerHTML = CHAPTERS.map((ch) => {
      const claimed = this.state.claimedChapters.includes(ch.id);
      const ready = !claimed && ch.check(this.state);
      return `
        <div class="cozy-card" style="${ready ? 'border-color:#16A34A;background:#F0FDF4' : ''}">
          <div class="card-thumb" style="font-size:26px">${claimed ? '✅' : ready ? '🎁' : '📜'}</div>
          <div class="card-info">
            <div class="card-title">${ch.title}</div>
            <div class="card-sub">${ch.goalText}</div>
            <div style="font-size:12px;font-weight:900;color:var(--gold-deep);margin-top:3px">Belohnung: ${ch.coins} ★ · +${ch.xp} XP</div>
          </div>
          ${claimed
            ? `<button class="btn-wood" disabled>✓ Erledigt</button>`
            : `<button class="btn-green" data-claim-ch="${ch.id}" ${ready ? '' : 'disabled'}>Abholen</button>`
          }
        </div>`;
    }).join('');
    bodyEl.querySelectorAll('[data-claim-ch]').forEach((b) =>
      b.addEventListener('click', () => this.claimChapter(b.dataset.claimCh))
    );
  }

  _renderStationModal(titleEl, bodyEl, stationId) {
    const st = this.state.stations.find((s) => s.id === stationId);
    const def = STATIONS[st.type];
    const lvl = getLevelInfo(this.state.xp).level;
    const mastery = getStationMastery(st.craftedCount || 0);
    titleEl.textContent = `✨ ${def.name}`;

    const masteryHtml = `
      <div class="cozy-card" style="padding:8px 12px;background:#FFFBEB;border-color:var(--gold-deep);justify-content:space-between">
        <div style="font-size:12px;font-weight:900;color:#78350F">⭐ Meisterstufe: ${mastery.label}</div>
        <div style="font-size:11px;font-weight:800;color:var(--text-muted)">${mastery.nextAt ? `${st.craftedCount || 0}/${mastery.nextAt} hergestellt` : 'Maximal!'}</div>
      </div>`;

    let queueHtml = '<div class="queue-strip">';
    for (let i = 0; i < 4; i++) {
      const job = st.queue[i];
      if (job) {
        const left = i === 0 ? formatDuration(Math.max(1, Math.ceil((job.finishAt - Date.now()) / 1000))) : 'Wartet';
        queueHtml += `<div class="queue-slot filled"><img src="${sprites.getIconUrl(job.itemId)}" alt="" /><span>${left}</span></div>`;
      } else {
        queueHtml += `<div class="queue-slot">Frei</div>`;
      }
    }
    queueHtml += '</div>';

    const recipesHtml = def.recipes.map((rid) => {
      const r = ITEMS[rid];
      const locked = r.unlockLevel > lvl;
      let canMake = !locked && st.queue.length < 4;
      const ingHtml = Object.entries(r.ingredients).map(([ingId, qty]) => {
        const have = this.state.inventory[ingId] || 0;
        const ok = have >= qty;
        if (!ok) canMake = false;
        return `<span class="ing-pill ${ok ? 'ok' : 'missing'}"><img src="${sprites.getIconUrl(ingId)}" alt="" />${have}/${qty} ${ITEMS[ingId].name}</span>`;
      }).join('');
      const effTime = Math.round(r.craftTime * mastery.speedMult);

      return `
        <div class="cozy-card ${locked ? 'locked' : ''}">
          <div class="card-thumb"><img src="${sprites.getIconUrl(rid)}" alt="${r.name}" /></div>
          <div class="card-info">
            <div class="card-title">${r.name} <span style="font-size:11px;color:var(--text-muted)">⏱ ${formatDuration(effTime)}</span></div>
            <div class="card-sub">${r.desc}</div>
            <div class="ing-row">${ingHtml}</div>
          </div>
          ${locked
            ? `<button class="btn-wood" disabled>🔒 Lv.${r.unlockLevel}</button>`
            : `<button class="btn-green" data-craft="${rid}" ${canMake ? '' : 'disabled'}>Herstellen</button>`
          }
        </div>`;
    }).join('');

    bodyEl.innerHTML = masteryHtml + queueHtml + recipesHtml;
    bodyEl.querySelectorAll('[data-craft]').forEach((btn) =>
      btn.addEventListener('click', () => this.startCraft(stationId, btn.dataset.craft))
    );
  }

  _renderOrdersModal(titleEl, tabsEl, bodyEl, tab) {
    titleEl.textContent = '📋 Wunschzettel & Erfolge';
    tabsEl.style.display = 'flex';
    const claimable = this.getClaimableAchievements().length;
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'wishlist' ? 'active' : ''}" data-tab="wishlist">🛷 Wunschzettel</button>
      <button class="tab-btn ${tab === 'achievements' ? 'active' : ''}" data-tab="achievements">🏆 Erfolge${claimable ? ` (${claimable})` : ''}</button>
    `;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => {
        audio.playTap();
        this.ui.activeModal.tab = b.dataset.tab;
        this.renderActiveModal();
      })
    );

    if (tab === 'wishlist') {
      bodyEl.innerHTML = this.state.orders.map((ord) => {
        const npc = NPCS.find((n) => n.id === ord.npcId) || NPCS[0];
        let canDeliver = true;
        const reqHtml = Object.entries(ord.req).map(([id, qty]) => {
          const have = this.state.inventory[id] || 0;
          const ok = have >= qty;
          if (!ok) canDeliver = false;
          return `<span class="ing-pill ${ok ? 'ok' : 'missing'}"><img src="${sprites.getIconUrl(id)}" alt="" />${have}/${qty} ${ITEMS[id].name}</span>`;
        }).join('');
        return `
          <div class="order-card ${canDeliver ? 'ready' : ''}">
            <div class="order-top">
              <div class="npc-avatar" style="background:${npc.avatarBg}">${npc.emoji}</div>
              <div class="card-info">
                <div class="card-title">${npc.name}</div>
                <div class="order-quote">„${ord.quote}“</div>
              </div>
            </div>
            <div class="ing-row">${reqHtml}</div>
            <div class="order-foot">
              <div style="font-weight:900;font-size:13px;color:var(--gold-deep)">Belohnung: ${ord.coins} ★ · +${ord.xp} XP</div>
              <div style="display:flex;gap:6px">
                <button class="btn-wood" style="padding:7px 10px;font-size:12px" data-skip="${ord.id}" title="Neuen Wunsch holen">↻</button>
                <button class="btn-green" data-deliver="${ord.id}" ${canDeliver ? '' : 'disabled'}>🛷 Ausliefern</button>
              </div>
            </div>
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-deliver]').forEach((b) => b.addEventListener('click', () => this.fulfillOrder(b.dataset.deliver)));
      bodyEl.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => this.skipOrder(b.dataset.skip)));
    } else {
      bodyEl.innerHTML = ACHIEVEMENTS.map((a) => {
        const cur = Math.min(a.goal, this.state.stats[a.stat] || 0);
        const claimed = this.state.claimedAchievements.includes(a.id);
        const ready = !claimed && cur >= a.goal;
        return `
          <div class="cozy-card" style="${ready ? 'border-color:#22C55E;background:#F6FFF8' : ''}">
            <div class="card-thumb" style="font-size:28px">${a.icon}</div>
            <div class="card-info">
              <div class="card-title">${a.title} <span style="font-size:11px;color:var(--text-muted)">(${cur}/${a.goal})</span></div>
              <div class="card-sub">${a.desc}</div>
              <div style="font-size:12px;font-weight:800;color:var(--gold-deep);margin-top:3px">Belohnung: ${a.coins} ★ · +${a.xp} XP</div>
            </div>
            ${claimed
              ? `<button class="btn-wood" disabled>✓ Fertig</button>`
              : `<button class="btn-green" data-claim-ach="${a.id}" ${ready ? '' : 'disabled'}>Abholen</button>`
            }
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-claim-ach]').forEach((b) => b.addEventListener('click', () => this.claimAchievement(b.dataset.claimAch)));
    }
  }

  _renderBarnModal(titleEl, tabsEl, bodyEl, tab) {
    titleEl.textContent = '🎒 Vorrat & Hofladen';
    tabsEl.style.display = 'flex';
    const soldCount = this.state.standSlots.filter((s) => s && s.sold).length;
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'inv' ? 'active' : ''}" data-tab="inv">🎒 Mein Vorrat</button>
      <button class="tab-btn ${tab === 'stand' ? 'active' : ''}" data-tab="stand">🏪 Hofladen${soldCount ? ` (${soldCount} 💰)` : ''}</button>
    `;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => {
        audio.playTap();
        this.ui.activeModal.tab = b.dataset.tab;
        this.renderActiveModal();
      })
    );

    const entries = Object.entries(this.state.inventory).filter(([, q]) => q > 0);

    if (tab === 'inv') {
      const used = this.getBarnUsed();
      const cap = this.getBarnCapacity();
      const pct = Math.min(100, Math.round((used / cap) * 100));
      const fillCls = used >= cap ? 'full' : pct >= 80 ? 'warn' : '';
      const isMaxCap = cap >= BARN_CONFIG.maxCapacity;
      const upCost = getBarnUpgradeCost(cap);
      const capHtml = `
        <div class="barn-cap-card">
          <div class="barn-cap-top">
            <div>
              <div class="card-title">Scheunen-Lager: ${used} / ${cap}</div>
              <div class="card-sub">${isMaxCap ? 'Maximale Kapazität erreicht!' : `Erweitern bringt +${BARN_CONFIG.stepCapacity} Plätze`}</div>
            </div>
            ${isMaxCap
              ? `<button class="btn-wood" disabled>Max</button>`
              : `<button id="btn-upgrade-barn" class="btn-green" ${this.state.coins >= upCost ? '' : 'disabled'}>+${BARN_CONFIG.stepCapacity} (${upCost} ★)</button>`
            }
          </div>
          <div class="barn-cap-track"><div class="barn-cap-fill ${fillCls}" style="width:${pct}%"></div></div>
        </div>`;

      if (entries.length === 0) {
        bodyEl.innerHTML = `${capHtml}<div class="cozy-card"><div class="card-info"><div class="card-title">Dein Vorrat ist leer</div><div class="card-sub">Ernte Felder, sammle Schwammerl oder backe Leckereien!</div></div></div>`;
        bodyEl.querySelector('#btn-upgrade-barn')?.addEventListener('click', () => this.upgradeBarn());
        return;
      }
      bodyEl.innerHTML = `
        ${capHtml}
        <div class="card-sub">Tipp: Im <b>Hofladen</b> zahlen Dorfbewohner sogar 25 % mehr Münzen als beim Direktverkauf!</div>
        <div class="inv-grid">
          ${entries.map(([id, qty]) => {
            const it = ITEMS[id];
            if (!it) return '';
            return `
              <div class="inv-tile">
                <img src="${sprites.getIconUrl(id)}" alt="${it.name}" />
                <div style="font-weight:900;font-size:13px">${it.name}</div>
                <div class="inv-qty">${qty}× im Vorrat</div>
                <button class="btn-gold" style="padding:5px 9px;font-size:11px;margin-top:3px" data-sell="${id}">Direkt: ${it.sellPrice} ★</button>
              </div>`;
          }).join('')}
        </div>`;
      bodyEl.querySelector('#btn-upgrade-barn')?.addEventListener('click', () => this.upgradeBarn());
      bodyEl.querySelectorAll('[data-sell]').forEach((btn) =>
        btn.addEventListener('click', () => {
          const id = btn.dataset.sell;
          if (this.removeItem(id, 1)) {
            audio.playCoin();
            this.addCoins(ITEMS[id].sellPrice);
            this.saveState();
            this.renderActiveModal();
          }
        })
      );
    } else {
      const cratesHtml = this.state.standSlots.map((slot, idx) => {
        if (!slot) {
          return `
            <div class="inv-tile" style="border-style:dashed">
              <div style="font-size:26px;opacity:0.45">🪵</div>
              <div style="font-weight:800;font-size:12px;color:var(--text-muted)">Kiste #${idx + 1} frei</div>
              <button class="btn-green" style="padding:5px 10px;font-size:11px;margin-top:4px" data-pick-slot="${idx}" ${entries.length ? '' : 'disabled'}>+ Ware auslegen</button>
            </div>`;
        }
        if (slot.sold) {
          return `
            <div class="inv-tile" style="border-color:#22C55E;background:#F0FDF4">
              <div style="font-size:26px">${slot.buyerEmoji || '💰'}</div>
              <div style="font-weight:900;font-size:12px">Verkauft an ${slot.buyerName}!</div>
              <button class="btn-gold" style="padding:6px 10px;font-size:12px;margin-top:4px" data-collect-slot="${idx}">+${slot.price} ★ abholen</button>
            </div>`;
        }
        const left = Math.max(1, Math.ceil((slot.sellAt - Date.now()) / 1000));
        return `
          <div class="inv-tile" style="background:#FFFBEB;border-color:var(--gold-deep)">
            <img src="${sprites.getIconUrl(slot.itemId)}" alt="" />
            <div style="font-weight:900;font-size:12px">${slot.qty}× ${ITEMS[slot.itemId].name}</div>
            <div style="font-size:11px;color:var(--gold-deep);font-weight:800">${slot.price} ★ · ~${left}s</div>
          </div>`;
      }).join('');

      let pickerHtml = '';
      if (this.ui.activeModal.data?.pickingSlot !== undefined) {
        const sIdx = this.ui.activeModal.data.pickingSlot;
        pickerHtml = `
          <div class="cozy-card" style="flex-direction:column;align-items:stretch;background:#FFFDF0">
            <div class="card-title">Was möchtest du in Kiste #${sIdx + 1} auslegen?</div>
            <div class="ing-row">
              ${entries.map(([id, q]) => {
                const qty = Math.min(q, 2);
                const price = Math.round(ITEMS[id].sellPrice * qty * 1.25);
                return `<button class="ing-pill ok" style="cursor:pointer;padding:6px 10px" data-put-item="${id}" data-put-slot="${sIdx}">
                  <img src="${sprites.getIconUrl(id)}" alt="" />${qty}× ${ITEMS[id].name} (${price}★)
                </button>`;
              }).join('')}
            </div>
          </div>`;
      }

      bodyEl.innerHTML = `<div class="card-sub">Stelle Leckereien &amp; Ernten in deinen Hofladen – Dorfbewohner kaufen sie für +25 % Bonus-Münzen!</div>${pickerHtml}<div class="inv-grid">${cratesHtml}</div>`;
      bodyEl.querySelectorAll('[data-pick-slot]').forEach((b) => b.addEventListener('click', () => { audio.playTap(); this.ui.activeModal.data = { pickingSlot: Number(b.dataset.pickSlot) }; this.renderActiveModal(); }));
      bodyEl.querySelectorAll('[data-put-item]').forEach((b) => b.addEventListener('click', () => { const sIdx = Number(b.dataset.putSlot); this.ui.activeModal.data = {}; this.listItemOnStand(sIdx, b.dataset.putItem); }));
      bodyEl.querySelectorAll('[data-collect-slot]').forEach((b) => b.addEventListener('click', () => this.collectStandSlot(Number(b.dataset.collectSlot))));
    }
  }

  _renderShopModal(titleEl, tabsEl, bodyEl, tab) {
    titleEl.textContent = '🛒 Bau- & Deko-Shop';
    const lvl = getLevelInfo(this.state.xp).level;
    tabsEl.style.display = 'flex';
    const tabs = [
      { id: 'buildings', label: '🏠 Gebäude' },
      { id: 'animals', label: '🦌 Tiere' },
      { id: 'autumn_magic', label: '🎃 Herbst & Magie' },
      { id: 'winter_deco', label: '⛄ Winter' },
      { id: 'land', label: '🗺️ Land' }
    ];
    tabsEl.innerHTML = tabs.map((t) =>
      `<button class="tab-btn ${t.id === tab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`
    ).join('');
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => {
        audio.playTap();
        this.ui.activeModal.tab = b.dataset.tab;
        this.renderActiveModal();
      })
    );

    if (tab === 'buildings') {
      const fieldCost = 25 + Math.max(0, this.state.fields.length - 6) * 18;
      const canMoreFields = this.state.fields.length < 20;
      let html = `
        <div class="cozy-card">
          <div class="card-thumb"><img src="${sprites.getIconUrl('snow_field_plot')}" alt="Feld" /></div>
          <div class="card-info">
            <div class="card-title">Neues Ackerfeld <span style="font-size:11px;color:var(--text-muted)">(${this.state.fields.length}/20)</span></div>
            <div class="card-sub">Für Goldweizen, Schwammerl, Kürbisse, Matcha, Beeren &amp; mehr.</div>
          </div>
          <button class="btn-green" id="buy-field" ${canMoreFields && this.state.coins >= fieldCost ? '' : 'disabled'}>${canMoreFields ? `${fieldCost} ★` : 'Max'}</button>
        </div>`;

      for (const st of this.state.stations) {
        const def = STATIONS[st.type];
        const locked = def.unlockLevel > lvl;
        html += `
          <div class="cozy-card ${locked ? 'locked' : ''}">
            <div class="card-thumb"><img src="${sprites.getIconUrl(def.sprite)}" alt="${def.name}" /></div>
            <div class="card-info">
              <div class="card-title">${def.name}</div>
              <div class="card-sub">${def.desc}</div>
            </div>
            ${st.built
              ? `<button class="btn-wood" disabled>✓ Gebaut</button>`
              : locked
                ? `<button class="btn-wood" disabled>🔒 Lv.${def.unlockLevel}</button>`
                : `<button class="btn-green" data-buy-st="${st.type}" ${this.state.coins >= def.cost ? '' : 'disabled'}>${def.cost} ★</button>`
            }
          </div>`;
      }
      bodyEl.innerHTML = html;
      bodyEl.querySelector('#buy-field')?.addEventListener('click', () => this.enterPlaceMode({ kind: 'field', label: 'Neues Ackerfeld', cost: fieldCost, size: 1 }));
      bodyEl.querySelectorAll('[data-buy-st]').forEach((b) =>
        b.addEventListener('click', () => {
          const def = STATIONS[b.dataset.buySt];
          this.enterPlaceMode({ kind: 'station', type: def.id, label: def.name, cost: def.cost, size: 2 });
        })
      );
    } else if (tab === 'animals') {
      bodyEl.innerHTML = Object.values(ANIMALS).map((an) => {
        const count = this.state.animals.filter((x) => x.type === an.id).length;
        const locked = an.unlockLevel > lvl;
        const full = count >= an.maxCount;
        return `
          <div class="cozy-card ${locked ? 'locked' : ''}">
            <div class="card-thumb"><img src="${sprites.getIconUrl(an.sprite)}" alt="${an.name}" /></div>
            <div class="card-info">
              <div class="card-title">${an.name} <span style="font-size:11px;color:var(--text-muted)">(${count}/${an.maxCount})</span></div>
              <div class="card-sub">${an.desc}</div>
            </div>
            ${locked
              ? `<button class="btn-wood" disabled>🔒 Lv.${an.unlockLevel}</button>`
              : full
                ? `<button class="btn-wood" disabled>Max</button>`
                : `<button class="btn-green" data-buy-an="${an.id}" ${this.state.coins >= an.cost ? '' : 'disabled'}>${an.cost} ★</button>`
            }
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-buy-an]').forEach((b) =>
        b.addEventListener('click', () => {
          const def = ANIMALS[b.dataset.buyAn];
          this.enterPlaceMode({ kind: 'animal', type: def.id, label: def.name, cost: def.cost, size: 1 });
        })
      );
    } else if (tab === 'autumn_magic' || tab === 'winter_deco') {
      const decos = Object.values(DECORATIONS).filter((d) =>
        tab === 'autumn_magic' ? d.theme !== 'Winter' : d.theme === 'Winter'
      );
      bodyEl.innerHTML = decos.map((d) => {
        const stored = this.state.storedDecos[d.id] || 0;
        const locked = d.unlockLevel > lvl && stored === 0;
        return `
          <div class="cozy-card ${locked ? 'locked' : ''}">
            <div class="card-thumb"><img src="${sprites.getIconUrl(d.sprite)}" alt="${d.name}" /></div>
            <div class="card-info">
              <div class="card-title">${d.name} <span style="font-size:11px;color:var(--festive-green)">${stored > 0 ? `📦 ${stored}× im Lager` : `+${d.xp} XP`}</span></div>
              <div class="card-sub">${d.desc}</div>
            </div>
            ${locked
              ? `<button class="btn-wood" disabled>🔒 Lv.${d.unlockLevel}</button>`
              : stored > 0
                ? `<button class="btn-gold" data-buy-deco="${d.id}">Gratis</button>`
                : `<button class="btn-green" data-buy-deco="${d.id}" ${this.state.coins >= d.cost ? '' : 'disabled'}>${d.cost} ★</button>`
            }
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-buy-deco]').forEach((b) =>
        b.addEventListener('click', () => {
          const def = DECORATIONS[b.dataset.buyDeco];
          this.enterPlaceMode({ kind: 'deco', type: def.id, label: def.name, cost: def.cost, size: 1 });
        })
      );
    } else {
      const unlocked = new Set(this.state.unlockedLands || []);
      bodyEl.innerHTML = LAND_ZONES.map((z) => {
        const isOpen = unlocked.has(z.id);
        const locked = z.unlockLevel > lvl;
        return `
          <div class="cozy-card ${locked && !isOpen ? 'locked' : ''}">
            <div class="card-thumb" style="font-size:28px">🗺️</div>
            <div class="card-info">
              <div class="card-title">${z.name}</div>
              <div class="card-sub">${z.desc}</div>
            </div>
            ${isOpen
              ? `<button class="btn-wood" disabled>✓ Frei</button>`
              : locked
                ? `<button class="btn-wood" disabled>🔒 Lv.${z.unlockLevel}</button>`
                : `<button class="btn-green" data-buy-land="${z.id}" ${this.state.coins >= z.cost ? '' : 'disabled'}>${z.cost} ★</button>`
            }
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-buy-land]').forEach((b) =>
        b.addEventListener('click', () => { if (this.unlockLandZone(b.dataset.buyLand)) this.renderActiveModal(); })
      );
    }
  }

  _renderGiftsModal(titleEl, tabsEl, bodyEl, tab) {
    titleEl.textContent = '🦉 Eulenpost – Päckchen schicken';
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'send' ? 'active' : ''}" data-tab="send">🎁 Päckchen verschicken</button>
      <button class="tab-btn ${tab === 'open' ? 'active' : ''}" data-tab="open">📬 Päckchen öffnen</button>
    `;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => { audio.playTap(); this.ui.activeModal.tab = b.dataset.tab; this.renderActiveModal(); })
    );

    if (tab === 'send') {
      const draft = this.ui.giftDraft;
      const totalSelected = Object.values(draft.items).reduce((a, b) => a + b, 0);
      const invEntries = Object.entries(this.state.inventory).filter(([, q]) => q > 0);
      let html = `
        <div class="card-sub">Die Schnee-Eule trägt bis zu 3 Leckereien mit deiner persönlichen Nachricht direkt per WhatsApp-Link oder Code ins Dorf deiner Freundin / deines Freundes!</div>
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Dein Name:</label>
          <input id="gift-from" class="cozy-input" value="${this._esc(this.state.playerName)}" maxlength="24" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Liebe Nachricht:</label>
          <textarea id="gift-note" class="cozy-textarea" maxlength="120" placeholder="Hab dir frischen Matcha-Latte &amp; Waffeln geschickt! 🍵🧇❤️">${this._esc(draft.note)}</textarea>
        </div>
        <div style="font-size:13px;font-weight:900">Ausgewählt (${totalSelected}/3):</div>
        <div class="inv-grid">
          ${invEntries.length === 0 ? '<div class="card-sub">Ernte oder backe erst etwas!</div>' : invEntries.map(([id, qty]) => {
            const sel = draft.items[id] || 0;
            return `
              <div class="inv-tile" style="${sel > 0 ? 'border-color:var(--festive-red);background:#FFF5F5' : ''}">
                <img src="${sprites.getIconUrl(id)}" alt="" />
                <div style="font-weight:800;font-size:12px">${ITEMS[id].name}</div>
                <div style="font-size:11px;color:var(--text-muted)">Vorrat: ${qty}</div>
                <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
                  <button class="btn-wood" style="padding:3px 9px" data-gdec="${id}" ${sel <= 0 ? 'disabled' : ''}>−</button>
                  <span style="font-weight:900;min-width:16px">${sel}</span>
                  <button class="btn-green" style="padding:3px 9px" data-ginc="${id}" ${sel >= qty || totalSelected >= 3 ? 'disabled' : ''}>+</button>
                </div>
              </div>`;
          }).join('')}
        </div>
        <button id="btn-pack-gift" class="btn-red" style="width:100%;padding:12px;font-size:15px" ${totalSelected === 0 ? 'disabled' : ''}>🦉 Eulenpost abschicken &amp; Code erstellen</button>`;

      if (draft.generatedCode) {
        const shareUrl = buildGiftShareUrl(draft.generatedCode);
        html += `
          <div class="cozy-card" style="flex-direction:column;align-items:stretch;background:#FFFBEB;border-color:var(--gold-deep)">
            <div class="card-title">✨ Deine Eulenpost ist abflugbereit!</div>
            <div class="code-box">${this._esc(draft.generatedCode)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${navigator.share ? `<button id="btn-share-native" class="btn-green" style="flex:1">📤 Per WhatsApp teilen</button>` : ''}
              <button id="btn-copy-link" class="btn-gold" style="flex:1">🔗 Link kopieren</button>
              <button id="btn-copy-code" class="btn-wood" style="flex:1">📋 Code kopieren</button>
            </div>
          </div>`;
        setTimeout(() => {
          document.getElementById('btn-share-native')?.addEventListener('click', () => {
            navigator.share({ title: '🦉 Eulenpost für deinen Zauberhof!', text: `${this.state.playerName} schickt dir ein Päckchen: „${draft.note || 'Liebe Grüße!'}“\nCode: ${draft.generatedCode}`, url: shareUrl }).catch(() => {});
          });
          document.getElementById('btn-copy-link')?.addEventListener('click', () => { navigator.clipboard?.writeText(shareUrl).then(() => this.showToast('🔗 Eulenpost-Link kopiert!')); });
          document.getElementById('btn-copy-code')?.addEventListener('click', () => { navigator.clipboard?.writeText(draft.generatedCode).then(() => this.showToast('📋 Päckchen-Code kopiert!')); });
        }, 0);
      }

      bodyEl.innerHTML = html;
      bodyEl.querySelector('#gift-from')?.addEventListener('input', (e) => { this.state.playerName = e.target.value; });
      bodyEl.querySelector('#gift-note')?.addEventListener('input', (e) => { draft.note = e.target.value; });
      bodyEl.querySelectorAll('[data-ginc]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.ginc; draft.items[id] = (draft.items[id] || 0) + 1; draft.generatedCode = null; this.renderActiveModal(); }));
      bodyEl.querySelectorAll('[data-gdec]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.gdec; draft.items[id] = Math.max(0, (draft.items[id] || 0) - 1); if (draft.items[id] === 0) delete draft.items[id]; draft.generatedCode = null; this.renderActiveModal(); }));
      bodyEl.querySelector('#btn-pack-gift')?.addEventListener('click', () => {
        for (const [id, q] of Object.entries(draft.items)) if ((this.state.inventory[id] || 0) < q) return;
        for (const [id, q] of Object.entries(draft.items)) this.removeItem(id, q);
        const code = encodeGiftParcel({ from: this.state.playerName || 'Weihnachtsfreund', note: draft.note || 'Ein liebes Päckchen für dich! 🦉❤️', items: draft.items });
        draft.items = {}; draft.generatedCode = code;
        audio.playGiftOpen(); this.addXp(12); this.saveState(); this.renderActiveModal();
      });
    } else {
      bodyEl.innerHTML = `
        <div class="card-sub">Hast du einen Eulenpost-Code (<code>WH-...</code>) oder Link bekommen? Füge ihn hier ein!</div>
        <textarea id="gift-redeem-input" class="cozy-textarea" placeholder="WH-... oder ganzen Link hier einfügen"></textarea>
        <button id="btn-redeem-gift" class="btn-green" style="width:100%;padding:12px;font-size:15px">🦉 Schnee-Eule landen lassen!</button>`;
      bodyEl.querySelector('#btn-redeem-gift').addEventListener('click', () => {
        const parcel = decodeGiftParcel(bodyEl.querySelector('#gift-redeem-input').value);
        if (!parcel) { this.showToast('Der Code scheint leider nicht gültig zu sein.'); return; }
        this.receiveGiftParcel(parcel);
      });
    }
  }

  _renderGiftOpenedModal(titleEl, bodyEl, parcel) {
    titleEl.textContent = '🦉 Eulenpost gelandet!';
    const itemsHtml = Object.entries(parcel.items).map(([id, qty]) => `
      <span class="ing-pill ok" style="font-size:14px;padding:5px 12px">
        <img src="${sprites.getIconUrl(id)}" style="width:24px;height:24px" alt="" />+${qty} ${ITEMS[id].name}
      </span>`).join('');
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:10px;background:#FFFDF0">
        <div style="font-size:44px">🦉💌🎁</div>
        <div style="font-size:17px;font-weight:900">Von ${this._esc(parcel.from)}</div>
        <div style="font-size:15px;font-style:italic;color:var(--text-dark);background:#FFF;padding:10px 14px;border-radius:14px;border:2px solid var(--cream-border);width:100%">„${this._esc(parcel.note)}“</div>
        <div class="ing-row" style="justify-content:center">${itemsHtml}</div>
        <button id="btn-gift-yay" class="btn-green" style="margin-top:6px;padding:11px 26px;font-size:15px">Danke! In den Vorrat ✨</button>
      </div>`;
    bodyEl.querySelector('#btn-gift-yay').addEventListener('click', () => this.closeModal());
  }

  _renderDailyChestModal(titleEl, bodyEl, reward) {
    titleEl.textContent = 'Tägliche Schatztruhe geöffnet!';
    const itemsHtml = Object.entries(reward.items).map(([id, qty]) => `
      <span class="ing-pill ok" style="font-size:13px;padding:5px 11px">
        <img src="${sprites.getIconUrl(id)}" style="width:22px;height:22px" alt="" />+${qty} ${ITEMS[id].name}
      </span>`).join('');
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:10px;background:#FFFDF0">
        <img src="${sprites.getIconUrl('treasure_chest')}" alt="Schatztruhe" style="width:82px;height:78px;object-fit:contain" />
        <div style="font-size:17px;font-weight:900;color:#8A1C17">Serie: Tag ${reward.streak} in Folge!</div>
        <div style="font-size:15px;font-weight:900;color:var(--gold-deep)">+${reward.coins} ★ Münzen · +${reward.xp} XP</div>
        <div class="ing-row" style="justify-content:center">${itemsHtml}</div>
        <button id="btn-chest-ok" class="btn-green" style="margin-top:6px;padding:11px 26px;font-size:15px">Wunderbar!</button>
      </div>`;
    bodyEl.querySelector('#btn-chest-ok').addEventListener('click', () => this.closeModal());
  }

  _renderVillagerOfferModal(titleEl, bodyEl, villagerId) {
    const v = this.world.villagers.find((x) => x.id === villagerId);
    if (!v || !v.offer) {
      this.closeModal();
      return;
    }
    const it = ITEMS[v.offer.itemId];
    const have = this.state.inventory[v.offer.itemId] || 0;
    const canSell = have >= v.offer.qty;
    titleEl.textContent = `Haustür-Angebot: ${v.name}`;
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:12px;background:#FFFDF0">
        <div class="npc-avatar" style="background:${v.coat};width:56px;height:56px;font-size:30px">${v.emoji}</div>
        <div style="font-size:15px;font-weight:800;color:var(--text-dark)">„Hallo! Ich würde dir sehr gern <b>${v.offer.qty}× ${it.name}</b> abkaufen!“</div>
        <div class="ing-row" style="justify-content:center">
          <span class="ing-pill ${canSell ? 'ok' : 'missing'}" style="font-size:14px;padding:6px 12px">
            <img src="${sprites.getIconUrl(it.id)}" style="width:24px;height:24px" alt="" />${have}/${v.offer.qty} ${it.name}
          </span>
        </div>
        <div style="font-size:16px;font-weight:900;color:var(--gold-deep)">Angebot: +${v.offer.price} ★ · +${v.offer.xp} XP</div>
        <div style="display:flex;gap:10px;width:100%">
          <button id="btn-offer-decline" class="btn-wood" style="flex:1">Nein danke</button>
          <button id="btn-offer-accept" class="btn-green" style="flex:1" ${canSell ? '' : 'disabled'}>Verkaufen (+${v.offer.price} ★)</button>
        </div>
      </div>`;
    bodyEl.querySelector('#btn-offer-accept').addEventListener('click', () => this.acceptVillagerOffer(villagerId));
    bodyEl.querySelector('#btn-offer-decline').addEventListener('click', () => this.declineVillagerOffer(villagerId));
  }

  _renderVillageModal(titleEl, tabsEl, bodyEl, tab) {
    const info = getLevelInfo(this.state.xp);
    titleEl.textContent = `🏡 ${this.state.villageName}`;
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'overview' ? 'active' : ''}" data-tab="overview">🏡 Übersicht</button>
      <button class="tab-btn ${tab === 'album' ? 'active' : ''}" data-tab="album">Sammelbuch</button>
      <button class="tab-btn ${tab === 'animals' ? 'active' : ''}" data-tab="animals">🐾 Tiere</button>
    `;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => { audio.playTap(); this.ui.activeModal.tab = b.dataset.tab; this.renderActiveModal(); })
    );

    if (tab === 'overview') {
      const chestReady = this.isDailyChestReady();
      bodyEl.innerHTML = `
        <div class="cozy-card" style="flex-direction:column;align-items:stretch;gap:6px">
          <div class="card-title">Level ${info.level} · Dorfbaum-Stufe ${info.treeStage}/3 ⭐</div>
          <div class="card-sub">${info.next ? `Noch ${info.next.xpNeeded - this.state.xp} XP bis Level ${info.next.level}: ${info.next.unlockText}` : 'Dein Dorfbaum leuchtet in voller Pracht!'}</div>
        </div>
        ${chestReady ? `
          <div class="cozy-card" style="border-color:var(--gold-deep);background:#FFFBEB;justify-content:space-between">
            <div class="card-info">
              <div class="card-title">Tägliche Schatztruhe wartet!</div>
              <div class="card-sub">Aktuelle Serie: ${this.state.dailyStreak || 0} Tage · Gratis Münzen &amp; Zutaten!</div>
            </div>
            <button id="btn-claim-chest-modal" class="btn-gold">Öffnen</button>
          </div>` : ''}
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Name deines Hofes:</label>
          <div style="display:flex;gap:8px">
            <input id="inp-village-name" class="cozy-input" maxlength="24" value="${this._esc(this.state.villageName)}" />
            <button id="btn-save-vname" class="btn-green">Speichern</button>
          </div>
        </div>
        <div class="cozy-card" style="flex-direction:column;align-items:stretch;gap:6px">
          <div class="card-title">✨ Geheimtipps auf dem Winterhof</div>
          <div class="card-sub">
            • <b>Mühle &amp; Molkerei:</b> Mahle Goldweizen zu Mehl und rühre Wintermilch zu Butter &amp; Mascarpone!<br/>
            • <b>Herbst &amp; Winter:</b> Oben rechts wechseln – sogar die Hausdächer schmücken sich mit Herbstlaub!<br/>
            • <b>Dorfbewohner:</b> Tippe Oma Hilde, Rudi oder Leo an – sie bringen Haustür-Kaufangebote &amp; Trinkgeld!<br/>
            • <b>Alles-ernten-Sense:</b> Ab Level 3 erscheint rechts ein Sense-Button zum Blitz-Ernten aller Felder!
          </div>
        </div>`;
      bodyEl.querySelector('#btn-claim-chest-modal')?.addEventListener('click', () => this.claimDailyChest());
      bodyEl.querySelector('#btn-save-vname').addEventListener('click', () => {
        const val = bodyEl.querySelector('#inp-village-name').value.trim();
        if (val) {
          this.state.villageName = val.slice(0, 24);
          this.saveState(); this.updateHUD();
          this.showToast(`Hof heißt jetzt „${this.state.villageName}“! ✨`);
          this.closeModal();
        }
      });
    } else if (tab === 'album') {
      const discSet = new Set(this.state.discoveredItems || []);
      const allItems = Object.values(ITEMS);
      const discItemsCount = allItems.filter((it) => discSet.has(it.id)).length;
      const discSecretsCount = ALBUM_SECRETS.filter((sc) => sc.check(this.state)).length;
      const totalAll = allItems.length + ALBUM_SECRETS.length;
      const foundAll = discItemsCount + discSecretsCount;
      const pct = Math.round((foundAll / totalAll) * 100);

      const renderGroup = (title, items) => `
        <div class="album-section-title">${title}</div>
        <div class="album-grid">
          ${items.map((it) => {
            const found = discSet.has(it.id);
            const sourceLabel = it.station ? STATIONS[it.station]?.name : it.category === 'crop' ? 'Ackerfeld' : 'Hoftier';
            return `
              <div class="album-tile ${found ? '' : 'undiscovered'}" title="${this._esc(it.desc)}">
                ${found ? `<img src="${sprites.getIconUrl(it.id)}" alt="${it.name}" />` : `<div class="album-q">?</div>`}
                <div style="font-weight:900;font-size:11.5px;line-height:1.15">${found ? it.name : 'Unentdeckt'}</div>
                <div style="font-size:10px;color:var(--text-muted)">${found ? `${it.sellPrice}★ · ${sourceLabel}` : `Ab Lv.${it.unlockLevel}`}</div>
              </div>`;
          }).join('')}
        </div>`;

      const crops = allItems.filter((i) => i.category === 'crop');
      const basics = allItems.filter((i) => i.category === 'animal' || i.station === 'mill_dairy');
      const treats = allItems.filter((i) => i.category === 'crafted' && i.station !== 'mill_dairy');

      const secretsHtml = `
        <div class="album-section-title">Magische Geheimnisse (${discSecretsCount}/${ALBUM_SECRETS.length})</div>
        ${ALBUM_SECRETS.map((sc) => {
          const ok = sc.check(this.state);
          return `
            <div class="cozy-card" style="${ok ? 'border-color:#22C55E;background:#F6FFF8' : 'opacity:0.72'}">
              <div class="card-thumb" style="font-weight:900;font-size:16px;color:${ok ? '#15803D' : 'var(--text-muted)'}">${ok ? 'OK' : '?'}</div>
              <div class="card-info">
                <div class="card-title">${ok ? sc.title : 'Geheimnis noch verborgen'}</div>
                <div class="card-sub">${sc.desc}</div>
              </div>
            </div>`;
        }).join('')}`;

      bodyEl.innerHTML = `
        <div class="barn-cap-card">
          <div class="barn-cap-top">
            <div class="card-title">Rezept- &amp; Sammelbuch</div>
            <div style="font-weight:900;font-size:13px;color:var(--gold-deep)">${foundAll} / ${totalAll} (${pct}%)</div>
          </div>
          <div class="barn-cap-track"><div class="barn-cap-fill" style="width:${pct}%"></div></div>
        </div>
        ${renderGroup('Pflanzen', crops)}
        ${renderGroup('Tiere, Mühle & Molkerei', basics)}
        ${renderGroup('Backstube, Teehaus, Patisserie & Werkstatt', treats)}
        ${secretsHtml}`;
    } else {
      bodyEl.innerHTML = this.state.animals.map((an) => {
        const def = ANIMALS[an.type];
        return `
          <div class="cozy-card">
            <div class="card-thumb"><img src="${sprites.getIconUrl(def.sprite)}" alt="" /></div>
            <div class="card-info">
              <div style="font-size:11px;font-weight:800;color:var(--text-muted)">${def.name}</div>
              <input class="cozy-input" style="padding:6px 10px;margin-top:3px" maxlength="18" value="${this._esc(an.nick || def.defaultNick)}" data-an-nick="${an.id}" />
            </div>
            <button class="btn-green" data-save-nick="${an.id}">OK</button>
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-save-nick]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.saveNick;
          const inp = bodyEl.querySelector(`[data-an-nick="${id}"]`);
          const an = this.state.animals.find((x) => x.id === id);
          if (an && inp && inp.value.trim()) {
            an.nick = inp.value.trim().slice(0, 18);
            audio.playPet(1.1); this.saveState();
            this.showToast(`🐾 Dein Tier heißt jetzt „${an.nick}“!`);
          }
        })
      );
    }
  }

  _renderSettingsModal(titleEl, bodyEl) {
    titleEl.textContent = '⚙️ Ton & Spielstand';
    bodyEl.innerHTML = `
      <div class="cozy-card" style="justify-content:space-between">
        <div>
          <div class="card-title">🔔 Soundeffekte</div>
          <div class="card-sub">Ernte-Klänge, Schlittenglöckchen &amp; Ofen-Klingeln</div>
        </div>
        <button id="tog-sfx" class="${this.state.settings.sfx ? 'btn-green' : 'btn-wood'}">${this.state.settings.sfx ? 'An' : 'Aus'}</button>
      </div>
      <div class="cozy-card" style="justify-content:space-between">
        <div>
          <div class="card-title">🎵 Saison-Spieluhr (Musik)</div>
          <div class="card-sub">Winter-Walzer &amp; magische Herbst-Celesta im Hintergrund</div>
        </div>
        <button id="tog-music" class="${this.state.settings.music ? 'btn-green' : 'btn-wood'}">${this.state.settings.music ? 'An' : 'Aus'}</button>
      </div>
      <div class="cozy-card" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="card-title">💌 Begrüßungsbrief nochmal lesen</div>
        <button id="btn-reread-letter" class="btn-gold">🦉 Brief öffnen</button>
      </div>
      <div class="cozy-card" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="card-title">💾 Spielstand sichern / übertragen</div>
        <div class="card-sub">Kopiere deinen Spielstand-Code für ein Backup oder ein neues Handy:</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="btn-export-save" class="btn-green" style="flex:1">📋 Backup kopieren</button>
          <button id="btn-import-save" class="btn-wood" style="flex:1">📥 Backup laden</button>
        </div>
        <button id="btn-reset-save" class="btn-red" style="margin-top:4px">Neuen Hof starten</button>
      </div>`;

    bodyEl.querySelector('#tog-sfx').addEventListener('click', () => {
      this.state.settings.sfx = !this.state.settings.sfx;
      audio.setSfx(this.state.settings.sfx);
      if (this.state.settings.sfx) audio.playTap();
      this.saveState(); this.renderActiveModal();
    });
    bodyEl.querySelector('#tog-music').addEventListener('click', () => {
      this.state.settings.music = !this.state.settings.music;
      audio.setMusic(this.state.settings.music);
      this.saveState(); this.renderActiveModal();
    });
    bodyEl.querySelector('#btn-reread-letter').addEventListener('click', () => { audio.playTap(); this.openModal('welcome'); });
    bodyEl.querySelector('#btn-export-save').addEventListener('click', () => {
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(this.state))));
      navigator.clipboard?.writeText(b64).then(() => this.showToast('📋 Spielstand-Backup in Zwischenablage kopiert!'));
    });
    bodyEl.querySelector('#btn-import-save').addEventListener('click', () => {
      const raw = prompt('Füge hier deinen gesicherten Backup-Code ein:');
      if (!raw) return;
      try {
        const parsed = JSON.parse(decodeURIComponent(escape(atob(raw.trim()))));
        if (parsed && parsed.fields && parsed.stations) {
          localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
          location.reload();
        } else this.showToast('Ungültiger Backup-Code!');
      } catch {
        this.showToast('Backup-Code konnte nicht gelesen werden.');
      }
    });
    bodyEl.querySelector('#btn-reset-save').addEventListener('click', () => {
      if (confirm('Wirklich einen komplett neuen Hof starten? Dein aktueller Fortschritt geht verloren.')) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      }
    });
  }

  _renderLevelUpModal(titleEl, bodyEl, lvlInfo) {
    titleEl.textContent = `🎉 Level ${lvlInfo.level} erreicht!`;
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:10px;background:#FFFDF0">
        <div style="font-size:48px">🌟🎄🍂✨</div>
        <div style="font-size:18px;font-weight:900">Dein Winterhof wächst!</div>
        <div style="font-size:14px;font-weight:700;color:var(--text-dark)">${lvlInfo.unlockText}</div>
        ${lvlInfo.coinBonus > 0 ? `<div style="font-size:16px;font-weight:900;color:var(--gold-deep)">Geschenk: +${lvlInfo.coinBonus} Münzen ★</div>` : ''}
        <button id="btn-lvl-ok" class="btn-green" style="padding:11px 28px;font-size:15px">Weiter spielen! 🛷</button>
      </div>`;
    bodyEl.querySelector('#btn-lvl-ok').addEventListener('click', () => this.closeModal());
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}

const game = new WinterhofGame();
game.start();
