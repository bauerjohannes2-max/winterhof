// ============================================================================
// WINTERHOF – Oberfläche
// Regel: Diese Datei ändert den Spielstand NIE selbst. Jede Aktion geht als
// Befehl an den Logik-Kern (GameSession.dispatch). Ereignisse des Kerns
// lösen Animation, Ton und Anzeige aus (onEvents).
// ============================================================================

import {
  ITEMS,
  CROP_IDS,
  ANIMALS,
  STATIONS,
  DECORATIONS,
  LAND_ZONES,
  ACHIEVEMENTS,
  CHAPTERS,
  NPCS,
  ALBUM_SECRETS,
  LEVELS,
  getLevelInfo,
  getStationMastery
} from './gameData.js';
import {
  CONTENT,
  GameSession,
  SAVE_KEY,
  canPlace,
  footprintOf,
  storageUsed,
  storageUpgradeCost,
  goalReady,
  activeChapter,
  dayKey,
  serialize,
  deserialize,
  createNewGame
} from './core';
import { buildView } from './ui/view.js';
import { sprites } from './sprites.js';
import { vx, vy, applyOrientationClass, tryLockLandscape } from './viewport.js';
import { audio } from './audio.js';
import { WinterWorld, gridToWorld, worldToGrid } from './world.js';
import {
  encodeGiftParcel,
  decodeGiftParcel,
  buildGiftShareUrl,
  getIncomingUrlGift,
  clearIncomingUrlGift
} from './giftExchange.js';

const LOADING_TIPS = [
  'Wische mit einem Finger über reife Felder zum Ernten.',
  'Im Hofladen bekommst du viel mehr als beim Händler.',
  'Tippe auf fertige Backwaren über deiner Backstube.',
  'Neue Gebäude und Tiere schaltest du Stufe für Stufe frei.'
];

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function getInitials(name) {
  return String(name || 'W')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase();
}

/** localStorage mit Absicherung (privater Modus, volle Platte). */
function createStore() {
  const mem = new Map();
  return {
    getItem(k) {
      try { return localStorage.getItem(k); } catch { return mem.has(k) ? mem.get(k) : null; }
    },
    setItem(k, v) {
      try { localStorage.setItem(k, v); } catch { mem.set(k, v); }
    }
  };
}

function memoryStore() {
  const mem = new Map();
  return { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
}

const STORAGE_LABEL = { silo: 'Silo', barn: 'Scheune' };

class WinterhofGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.world = new WinterWorld(this.canvas);

    this._saveBlocked = false;
    try {
      this.session = new GameSession({ store: createStore() });
    } catch (e) {
      // Spielstand ist neuer als das Spiel o. Ä.: nichts überschreiben, nur im Speicher spielen
      console.error('[Winterhof] Spielstand nicht ladbar', e);
      this._saveBlocked = true;
      this.session = new GameSession({ store: memoryStore() });
      this._startWarning = 'Dein Spielstand konnte nicht geladen werden und bleibt unverändert. Bitte Seite neu laden.';
    }
    if (this.session.loadReport.warnings.length) console.warn('[Winterhof] Hinweise beim Laden', this.session.loadReport.warnings);

    this._viewSrc = null;
    this._view = null;

    audio.setSfx(this.core.settings.sfx);
    audio.setMusic?.(this.core.settings.music);
    audio.setSeason('winter');
    this.world.lightingMode = this.core.settings.lighting || 'day';

    this.ui = {
      mode: 'normal',
      selectedSeed: null,
      seedTrayOpen: false,
      selectedMoveId: null,
      pendingPurchase: null,
      previewTile: null,
      activeModal: null,
      dailyChestReady: false,
      giftDraft: { items: {}, note: '', from: null, generatedCode: null },
      pendingLevelUp: null
    };

    this.pointers = new Map();
    this.pinchStartDist = 0;
    this.pinchStartZoom = 1;
    this.dragStart = null;
    this.dragMode = null;
    this.lastPanPos = null;
    this.lastPanTime = 0;
    this.swipedFieldIds = new Set();
    this._swipeFullWarned = false;

    this.toastTimer = null;
    this.lastFrame = performance.now();
    this.lastModalRefresh = 0;

    this.session.subscribe((events) => this.onEvents(events));

    this.mountHudIcons();
    this.syncOrientationGuard();
    this.bindUI();
    this.bindCanvasEvents();
    this.updateHUD();
    window.__WINTERHOF__ = this;
  }

  // ---- Zugriff auf den Stand ----
  /** Kern-Stand (nur lesen). */
  get core() {
    return this.session.state;
  }

  /** Anzeige-Form für Grafik und Fenster (nur lesen, wird bei Änderung neu gebaut). */
  get state() {
    const src = this.session.state;
    if (src !== this._viewSrc) {
      this._viewSrc = src;
      this._view = buildView(src);
    }
    return this._view;
  }

  /** Befehl an den Kern. Fehler werden als Hinweis gezeigt (außer quiet). */
  act(cmd, { quiet = false } = {}) {
    const res = this.session.dispatch(cmd);
    if (!res.ok && !quiet) this.showError(res.error);
    return res;
  }

  showError(error) {
    audio.playTap();
    if (error.code === 'storage_full') {
      const k = error.detail?.storage || 'barn';
      this.showToast(`${STORAGE_LABEL[k]} voll (${storageUsed(this.core, k)}/${this.core.storage[k]}). Im Vorrat ausbauen oder verkaufen.`, 3200);
    } else if (error.code === 'missing_items' && error.detail) {
      const names = Object.entries(error.detail).map(([id, q]) => `${q}× ${ITEMS[id]?.name || id}`).join(', ');
      this.showToast(`Es fehlt: ${names}`);
    } else {
      this.showToast(error.message);
    }
  }

  syncOrientationGuard() {
    // Kein Hinweis "Bitte Querformat": hochkant dreht CSS die App, Android/PWA sperrt echtes Querformat.
    applyOrientationClass();
    tryLockLandscape();
    window.addEventListener('resize', applyOrientationClass);
    window.addEventListener('orientationchange', () => { applyOrientationClass(); setTimeout(() => this.world && this.world.resize(), 120); });
    document.addEventListener('pointerdown', tryLockLandscape, { once: true });
  }

  mountHudIcons() {
    const map = {
      'ico-shop': 'shop',
      'ico-move': 'move',
      'ico-barn': 'barn',
      'ico-orders': 'orders',
      'ico-gifts': 'mail',
      'btn-settings': 'gear'
    };
    for (const [elId, iconName] of Object.entries(map)) {
      const el = document.getElementById(elId);
      if (el) el.innerHTML = sprites.getUiIcon(iconName);
    }
  }

  async start() {
    const splashBg = document.getElementById('splash-bg');
    if (splashBg && window.__WINTERHOF_ASSETS__?.splash_art) {
      splashBg.style.backgroundImage = `url("${window.__WINTERHOF_ASSETS__.splash_art}")`;
    }
    const tipEl = document.getElementById('load-tip');
    const barEl = document.getElementById('load-bar-fill');
    if (tipEl) tipEl.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];

    await sprites.loadAll((pct) => {
      if (barEl) barEl.style.width = `${Math.max(14, Math.round(pct * 84))}%`;
    });

    if (tipEl) tipEl.textContent = 'Wintertal wird aufgebaut...';
    await this.world.init();

    if (barEl) barEl.style.width = '100%';
    await new Promise((r) => setTimeout(r, 240));

    const splash = document.getElementById('loading-screen');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 550);
    }

    if (this._startWarning) this.showToast(this._startWarning, 8000);

    const incoming = getIncomingUrlGift();
    if (incoming) {
      clearIncomingUrlGift();
      setTimeout(() => this.receiveGiftParcel(incoming), 550);
    }

    // Zeitfortschritt 1× pro Sekunde (nicht pro Frame); Speichern übernimmt die Session gedrosselt
    setInterval(() => this.session.tick(), 1000);
    const flush = () => { if (!this._saveBlocked) this.session.saveNow(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
      else this.session.tick();
    });

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  /** Für Tests und alte Aufrufe: sofort speichern. */
  saveState() {
    if (!this._saveBlocked) this.session.saveNow();
  }

  // ---- 60-FPS-Schleife: nur Darstellung, keine Spiellogik ----
  loop(now) {
    const dt = Math.min(0.033, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    const view = this.state;
    this.ui.dailyChestReady = this.isDailyChestReady();
    this.syncVillagerOffer();
    this.world.update(dt, view);
    this.world.render(view, this.ui);

    if (
      this.ui.activeModal &&
      (this.ui.activeModal.kind === 'station' || this.ui.activeModal.kind === 'orders' || (this.ui.activeModal.kind === 'barn' && this.ui.activeModal.tab === 'stand')) &&
      now - this.lastModalRefresh > 600
    ) {
      this.lastModalRefresh = now;
      this.renderActiveModal();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  // ---- Ereignisse des Kerns -> Animation, Ton, Anzeige ----
  posOf(id, lift = 0) {
    if (!id) return null;
    const o = this.core.objects.find((x) => x.id === id);
    if (!o) return null;
    const fp = footprintOf(o);
    let ox = 0, oy = 0;
    if (o.kind === 'animal') {
      const mot = this.world.getAnimalMotion(this.state.animals.find((a) => a.id === id) || o);
      ox = mot.ox; oy = mot.oy;
    }
    const p = gridToWorld(o.gx + fp.w * 0.5 + ox, o.gy + fp.h * 0.5 + oy);
    const defaultLift = o.kind === 'station' ? 88 : o.kind === 'field' ? 18 : 32;
    return { x: p.x, y: p.y - (lift || defaultLift), obj: o };
  }

  onEvents(events) {
    let levelUp = null;
    for (const ev of events) {
      switch (ev.type) {
        case 'harvested': {
          const crop = ITEMS[ev.crop];
          const p = this.posOf(ev.fieldId, 14);
          audio.playHarvest();
          this.world.triggerBounce(ev.fieldId);
          if (p) {
            this.world.spawnBurst(p.x, p.y, crop?.color || '#FDE047', 8, 'star');
            this.world.spawnFloater(p.x, p.y - 12, `+${ev.qty} ${crop?.name || ''}`, ev.crop, '#FFFDF7');
            this.world.spawnFlyingHudItem(p.x, p.y - 4, ev.crop, 'barn');
          }
          break;
        }
        case 'planted': {
          const p = this.posOf(ev.fieldId, 6);
          audio.playPlant();
          this.world.triggerBounce(ev.fieldId);
          if (p) this.world.spawnBurst(p.x, p.y, '#86EFAC', 5, 'star');
          break;
        }
        case 'animalCollected': {
          const it = ITEMS[ev.item];
          const p = this.posOf(ev.animalId, 30);
          audio.playCollect();
          this.world.triggerBounce(ev.animalId);
          if (p) {
            this.world.spawnBurst(p.x, p.y, '#FDE047', 9, 'star');
            this.world.spawnFloater(p.x, p.y - 10, `+1 ${it?.name || ''}`, ev.item, '#FFFDF7');
            this.world.spawnFlyingHudItem(p.x, p.y - 2, ev.item, 'barn');
          }
          break;
        }
        case 'animalFed': {
          const p = this.posOf(ev.animalId, 28);
          const o = p?.obj;
          const def = o ? ANIMALS[o.type] : null;
          audio.playPet(def?.soundPitch);
          this.world.triggerBounce(ev.animalId);
          if (p) {
            this.world.spawnBurst(p.x, p.y, '#FCA5A5', 6, 'heart');
            this.world.spawnFloater(p.x, p.y - 12, `${o.nick || def?.name} gefüttert`, def?.feedItem, '#FFFDF7');
          }
          break;
        }
        case 'animalPetted': {
          const p = this.posOf(ev.animalId, 30);
          const o = p?.obj;
          audio.playPet(o ? ANIMALS[o.type]?.soundPitch : 1);
          this.world.triggerBounce(ev.animalId);
          if (p) {
            this.world.spawnBurst(p.x, p.y, '#FCA5A5', 6, 'heart');
            this.world.spawnFloater(p.x, p.y - 14, `${o.nick || ANIMALS[o.type]?.name} freut sich`, null, '#FFFDF7');
          }
          break;
        }
        case 'productionStarted': {
          const p = this.posOf(ev.stationId, 82);
          audio.playBakeStart();
          this.world.triggerBounce(ev.stationId);
          if (p) this.world.spawnBurst(p.x, p.y, '#FDBA74', 7, 'star');
          break;
        }
        case 'productCollected': {
          const it = ITEMS[ev.item];
          const p = this.posOf(ev.stationId, 88);
          audio.playCollect();
          this.world.triggerBounce(ev.stationId);
          if (p) {
            this.world.spawnBurst(p.x, p.y, '#FDE047', 12, 'star');
            this.world.spawnFloater(p.x, p.y - 14, `+1 ${it?.name || ''}`, ev.item, '#FFFDF7');
            this.world.spawnFlyingHudItem(p.x, p.y, ev.item, 'barn');
          }
          break;
        }
        case 'stationUnwrapped': {
          const p = this.posOf(ev.stationId, 72);
          const st = p?.obj;
          audio.playUnwrap();
          this.world.triggerBounce(ev.stationId);
          if (p) {
            this.world.spawnBurst(p.x, p.y, '#DC2626', 14, 'star');
            this.world.spawnBurst(p.x, p.y - 16, '#FDE047', 14, 'star');
            this.world.spawnFloater(p.x, p.y - 38, `${STATIONS[st.type]?.name} eröffnet`, null, '#FEF08A');
          }
          break;
        }
        case 'objectPlaced': {
          const p = this.posOf(ev.objectId, 22);
          audio.playCollect();
          this.world.triggerBounce(ev.objectId);
          if (p) this.world.spawnBurst(p.x, p.y, '#FDE047', 12, 'star');
          if (p?.obj.kind === 'station') {
            this.showToast(`Tippe auf die Schleife, um "${STATIONS[p.obj.type]?.name}" zu eröffnen.`, 3200);
          }
          break;
        }
        case 'objectMoved':
          audio.playPlant();
          this.world.triggerBounce(ev.objectId);
          break;
        case 'objectStored':
          audio.playTap();
          break;
        case 'coinsChanged': {
          if (ev.delta > 0 && ev.at) {
            const p = this.posOf(ev.at, ev.at === 'sleigh' ? 72 : 42);
            if (p) {
              this.world.spawnFloater(p.x, p.y, `+${ev.delta}`, 'coin', '#FEF08A');
              this.world.spawnFlyingHudItem(p.x, p.y, 'coin', 'coins');
            }
          }
          break;
        }
        case 'orderFulfilled': {
          audio.playSleighBells();
          this.world.launchSleigh(this.state);
          const p = this.posOf('sleigh', 54);
          if (p) this.world.spawnBurst(p.x, p.y, '#FDE047', 16, 'star');
          break;
        }
        case 'xpGained': {
          if (ev.at === 'sleigh') {
            const p = this.posOf('sleigh', 102);
            if (p) this.world.spawnFloater(p.x, p.y, `+${ev.amount} XP`, null, '#A7F3D0');
          }
          break;
        }
        case 'levelUp':
          levelUp = ev;
          break;
        case 'standSold':
          this.showToast(`${ev.buyer} hat im Hofladen eingekauft.`, 3000);
          break;
        case 'standCollected':
          audio.playCoin();
          this.showToast(`+${ev.coins} Münzen aus dem Hofladen.`);
          break;
        case 'storageUpgraded':
          audio.playLevelUp();
          this.showToast(`${STORAGE_LABEL[ev.storage]} erweitert auf ${ev.capacity} Plätze.`);
          break;
        case 'zoneUnlocked': {
          const z = LAND_ZONES.find((x) => x.id === ev.zoneId);
          audio.playLevelUp();
          if (z) {
            const sp = gridToWorld(z.signPos.gx + 0.5, z.signPos.gy + 0.5);
            this.world.spawnBurst(sp.x, sp.y - 20, '#FDE047', 18, 'star');
            this.world.spawnFloater(sp.x, sp.y - 42, `${z.name} frei`, null, '#A7F3D0');
          }
          break;
        }
        case 'dailyClaimed': {
          audio.playLevelUp();
          const p = this.posOf('dailyChest', 28);
          if (p) this.world.spawnBurst(p.x, p.y, '#FDE047', 18, 'star');
          this.openModal('daily_chest', { reward: { streak: ev.streak, coins: ev.coins, xp: 10, items: ev.items } });
          break;
        }
        case 'goalClaimed': {
          const g = [...CHAPTERS, ...ACHIEVEMENTS].find((x) => x.id === ev.goalId);
          audio.playLevelUp();
          if (g) this.showToast(`${g.title} abgeschlossen (+${g.coins} Münzen).`, 3000);
          break;
        }
        case 'discovered':
          if (ITEMS[ev.item]) this.showToast(`Neu im Sammelbuch: ${ITEMS[ev.item].name}`, 2400);
          break;
        case 'offerClosed':
          if (this.ui.activeModal?.kind === 'villager_offer') this.closeModal();
          break;
        case 'giftPacked':
        case 'giftReceived':
          audio.playGiftOpen();
          break;
        default:
          break;
      }
    }

    if (levelUp) {
      audio.playLevelUp();
      const tree = this.posOf('christmasTree', 105);
      if (tree) this.world.spawnBurst(tree.x, tree.y, '#FDE047', 20, 'star');
      const lvlInfo = { ...(LEVELS.find((l) => l.level === levelUp.level) || getLevelInfo(this.core.xp)), coinBonus: levelUp.coinBonus };
      // Belohnungsfenster (z. B. Truhe) nicht überdecken: Level-Fenster danach zeigen
      if (this.ui.activeModal && this.ui.activeModal.kind !== 'levelup') this.ui.pendingLevelUp = lvlInfo;
      else this.openModal('levelup', { lvlInfo });
    }

    this.updateHUD();
  }

  // ---- Dorfbewohner-Angebot: Kern hat 1 Angebot, Grafik zeigt es an einem Bewohner ----
  offerVillager() {
    const off = this.core.villagerOffer;
    const vils = this.world.villagers || [];
    if (!off || vils.length === 0) return null;
    const idx = Math.max(0, CONTENT.npcs.findIndex((n) => n.id === off.npc));
    return vils[idx % vils.length];
  }

  syncVillagerOffer() {
    const off = this.core.villagerOffer;
    const target = this.offerVillager();
    for (const v of this.world.villagers || []) {
      if (v === target && off) {
        if (!v.offer || v.offer._src !== off) v.offer = { itemId: off.item, qty: off.qty, price: off.coins, xp: off.xp, _src: off };
      } else if (v.offer) {
        v.offer = null;
      }
    }
  }

  greetVillager(v) {
    if (v.offer) {
      audio.playTap();
      this.openModal('villager_offer', { villagerId: v.id });
      return;
    }
    const p = gridToWorld(v.gx, v.gy);
    audio.playPet(1.12);
    this.world.spawnBurst(p.x, p.y - 34, '#FDE047', 6, 'star');
    const res = this.act({ type: 'greetVillager' }, { quiet: true });
    if (res.ok) {
      v.quote = 'Ein kleines Trinkgeld für dich.';
      v.quoteTimer = 3.0;
      this.world.spawnFloater(p.x, p.y - 42, '+5', 'coin', '#FEF08A');
      this.world.spawnFlyingHudItem(p.x, p.y - 42, 'coin', 'coins');
    } else {
      v.quote = 'Schönen Wintertag auf dem Hof.';
      v.quoteTimer = 2.6;
    }
  }

  acceptVillagerOffer(villagerId) {
    const v = this.world.villagers.find((x) => x.id === villagerId);
    const res = this.act({ type: 'acceptOffer' });
    if (!res.ok) return false;
    if (v) {
      v.quote = 'Vielen Dank, das duftet wunderbar.';
      v.quoteTimer = 3.0;
      const p = gridToWorld(v.gx, v.gy);
      audio.playCoin();
      this.world.spawnBurst(p.x, p.y - 32, '#FDE047', 10, 'star');
    }
    this.closeModal();
    return true;
  }

  declineVillagerOffer(villagerId) {
    const v = this.world.villagers.find((x) => x.id === villagerId);
    this.act({ type: 'declineOffer' }, { quiet: true });
    if (v) {
      v.quote = 'Kein Problem, bis bald.';
      v.quoteTimer = 2.4;
    }
    audio.playTap();
    this.closeModal();
  }

  // ---- Abgeleitete Werte ----
  isDailyChestReady() {
    return this.core.daily.lastDay !== dayKey(Date.now());
  }

  isFieldReady(f) {
    if (!f || !f.cropId || !ITEMS[f.cropId]) return false;
    return (Date.now() - f.plantedAt) / 1000 >= ITEMS[f.cropId].growTime;
  }

  readyOrderCount() {
    return this.state.orders.filter((o) =>
      Object.entries(o.req).every(([id, q]) => (this.core.inventory[id] || 0) >= q)
    ).length;
  }

  getClaimableAchievements() {
    return ACHIEVEMENTS.filter((a) => goalReady(this.core, a));
  }

  getActiveChapter() {
    const ch = activeChapter(this.core);
    return ch ? CHAPTERS.find((c) => c.id === ch.id) : null;
  }

  getLockedZoneAt(gx, gy) {
    const unlocked = new Set(this.core.unlockedZones);
    for (const z of LAND_ZONES) {
      if (unlocked.has(z.id)) continue;
      const b = z.bounds;
      if (gx >= b.x0 && gx <= b.x1 && gy >= b.y0 && gy <= b.y1) return z;
    }
    return null;
  }

  /** Platz frei? Gleiche Regel wie der Kern (keine zweite Wahrheit). */
  isAreaFree(gx, gy, size = 1, ignoreId = null) {
    return canPlace(this.core, gx, gy, size, size, ignoreId).ok;
  }

  // ---- Aktionen (alle über Befehle) ----
  harvestField(f, { quiet = false } = {}) {
    const res = this.act({ type: 'harvest', fieldId: f.id }, { quiet: true });
    if (!res.ok && !quiet) this.showError(res.error);
    return res;
  }

  plantField(f, cropId, { quiet = false } = {}) {
    return this.act({ type: 'plant', fieldId: f.id, crop: cropId }, { quiet }).ok;
  }

  harvestAllReadyFields() {
    const before = this.core.stats.harvests;
    const res = this.act({ type: 'harvestAll' });
    if (!res.ok) return 0;
    const count = this.core.stats.harvests - before;
    const stillReady = this.state.fields.filter((f) => this.isFieldReady(f)).length;
    if (stillReady > 0) this.showToast(`${count} Felder geerntet – Silo voll (${storageUsed(this.core, 'silo')}/${this.core.storage.silo}).`, 3200);
    else this.showToast(`${count} reife Felder mit der Sense geerntet.`, 2500);
    return count;
  }

  interactAnimal(an) {
    if (an.state === 'ready') return this.act({ type: 'collectAnimal', animalId: an.id }).ok;
    if (an.state === 'hungry') {
      const def = ANIMALS[an.type];
      const have = this.core.inventory[def.feedItem] || 0;
      if (have < def.feedQty) {
        audio.playTap();
        this.world.triggerBounce(an.id);
        this.showToast(`${an.nick || def.name} braucht ${def.feedQty}× ${ITEMS[def.feedItem].name}.`);
        return false;
      }
      return this.act({ type: 'feedAnimal', animalId: an.id }).ok;
    }
    const res = this.act({ type: 'petAnimal', animalId: an.id }, { quiet: true });
    if (!res.ok) {
      audio.playTap();
      this.world.triggerBounce(an.id);
      const left = Math.max(1, Math.ceil((an.readyAt - Date.now()) / 1000));
      this.showToast(`${an.nick || ANIMALS[an.type].name} ist zufrieden (fertig in ${formatDuration(left)}).`);
    }
    return res.ok;
  }

  interactStation(st) {
    if (st.wrapped) {
      this.act({ type: 'unwrapStation', stationId: st.id });
      return;
    }
    if (st.ready.length > 0) {
      let n = 0;
      while (true) {
        const cur = this.core.objects.find((o) => o.id === st.id);
        if (!cur || cur.ready.length === 0) break;
        const res = this.act({ type: 'collectProduct', stationId: st.id }, { quiet: n > 0 });
        if (!res.ok) break;
        n++;
      }
      return;
    }
    audio.playTap();
    this.world.triggerBounce(st.id);
    this.openModal('station', { stationId: st.id });
  }

  startCraft(stationId, itemId) {
    if (this.act({ type: 'startProduction', stationId, item: itemId }).ok) this.renderActiveModal();
  }

  claimDailyChest() {
    if (!this.isDailyChestReady()) {
      this.showToast('Die heutige Schatztruhe wurde bereits geöffnet.');
      return null;
    }
    const res = this.act({ type: 'claimDaily' });
    return res.ok ? res.events.find((e) => e.type === 'dailyClaimed') : null;
  }

  claimChapter(id) {
    if (this.act({ type: 'claimGoal', goalId: id }).ok) this.renderActiveModal();
  }

  claimAchievement(id) {
    if (this.act({ type: 'claimGoal', goalId: id }).ok) this.renderActiveModal();
  }

  upgradeStorage(kind) {
    const ok = this.act({ type: 'upgradeStorage', storage: kind }).ok;
    if (ok) this.renderActiveModal();
    return ok;
  }

  unlockLandZone(zoneId) {
    return this.act({ type: 'unlockZone', zoneId }).ok;
  }

  sellItem(itemId) {
    if (this.act({ type: 'sellItem', item: itemId, qty: 1 }).ok) {
      audio.playCoin();
      this.renderActiveModal();
    }
  }

  standOffer(itemId) {
    const have = this.core.inventory[itemId] || 0;
    const qty = Math.min(have, 2);
    const price = Math.round(ITEMS[itemId].sellPrice * qty * 1.25);
    return { qty, price };
  }

  listItemOnStand(slotIdx, itemId) {
    const { qty, price } = this.standOffer(itemId);
    if (qty <= 0) return;
    if (this.act({ type: 'listOnStand', slot: slotIdx, item: itemId, qty, price }).ok) {
      audio.playBakeStart();
      this.renderActiveModal();
    }
  }

  collectStandSlot(slotIdx) {
    if (this.act({ type: 'collectStand', slot: slotIdx }).ok) this.renderActiveModal();
  }

  fulfillOrder(orderId) {
    if (this.act({ type: 'fulfillOrder', orderId }).ok) this.closeModal();
  }

  skipOrder(orderId) {
    audio.playTap();
    if (this.act({ type: 'skipOrder', orderId }).ok) this.renderActiveModal();
  }

  receiveGiftParcel(parcel) {
    if (this.core.claimedGifts.includes(parcel.id)) {
      this.showToast('Dieses Päckchen wurde bereits ausgepackt.');
      return;
    }
    this.closeModal();
    audio.playSleighBells();
    this.showToast(`Winterpost von ${parcel.from} ist unterwegs.`);
    this.world.launchGiftParachute(parcel.from, () => {
      if (this.act({ type: 'receiveGift', parcelId: parcel.id, items: parcel.items }).ok) {
        this.openModal('gift_opened', { parcel });
      }
    });
  }

  // ---- Bauen, Verschieben, Einlagern ----
  enterPlaceMode(purchase) {
    this.closeModal();
    this.closeSeedTray();
    this.ui.mode = 'place';
    this.ui.pendingPurchase = purchase;
    this.ui.selectedMoveId = null;
    this.ui.previewTile = null;
    this.showModeBanner(`Freien Platz tippen für: ${purchase.label}`, 'Abbrechen', false);
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
    this.showModeBanner('Feld, Tier, Gebäude oder Deko zum Verschieben antippen', 'Fertig', false);
  }

  storeSelectedDeco() {
    const id = this.ui.selectedMoveId;
    if (!id) return;
    const deco = this.core.objects.find((o) => o.id === id && o.kind === 'deco');
    if (!deco) return;
    if (this.act({ type: 'storeDeco', decoId: id }).ok) {
      this.ui.selectedMoveId = null;
      this.ui.previewTile = null;
      this.showModeBanner(`${DECORATIONS[deco.type].name} eingelagert (im Shop gratis platzierbar)`, 'Fertig', false);
    }
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
    const lvl = this.core.level;
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
    const lvl = this.core.level;
    tray.innerHTML = CROP_IDS.map((id) => {
      const c = ITEMS[id];
      const locked = c.unlockLevel > lvl;
      const active = this.ui.selectedSeed === id;
      const have = this.core.inventory[id] || 0;
      const meta = locked ? `Lv.${c.unlockLevel}` : `${have > 0 ? `Silo ${have}` : c.seedCost} · ${formatDuration(c.growTime)}`;
      return `
        <button class="seed-chip ${active ? 'active' : ''} ${locked ? 'locked' : ''}" data-seed="${id}">
          <img src="${sprites.getIconUrl(id)}" alt="${c.name}" />
          <span class="s-name">${c.name}</span>
          <span class="s-meta">${meta}</span>
        </button>`;
    }).join('');

    tray.querySelectorAll('.seed-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.seed;
        if (ITEMS[id].unlockLevel > lvl) {
          this.showToast(`${ITEMS[id].name} wird ab Level ${ITEMS[id].unlockLevel} freigeschaltet.`);
          return;
        }
        audio.playTap();
        this.ui.selectedSeed = id;
        this.renderSeedTray();
      });
    });
  }

  showToast(msg, duration = 2600) {
    const el = document.getElementById('toast-tip');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  updateHUD() {
    const s = this.core;
    const info = getLevelInfo(s.xp);
    document.getElementById('hud-level').textContent = s.level;
    document.getElementById('hud-village-name').textContent = s.villageName;
    document.getElementById('hud-xp-fill').style.width = `${Math.round(info.progress * 100)}%`;
    document.getElementById('hud-coins').textContent = s.coins;

    const lightEl = document.getElementById('btn-light');
    if (lightEl) {
      const iconKey = this.world.lightingMode === 'day' ? 'sun' : this.world.lightingMode === 'dusk' ? 'dusk' : this.world.lightingMode === 'night' ? 'moon' : 'auto';
      lightEl.innerHTML = sprites.getUiIcon(iconKey);
    }

    const ch = this.getActiveChapter();
    const chPill = document.getElementById('chapter-pill');
    if (ch) {
      const done = goalReady(s, ch);
      chPill.classList.remove('hidden');
      chPill.classList.toggle('ready', done);
      document.getElementById('chapter-pill-text').textContent = done ? `Kapitel ${ch.num} bereit` : `Kapitel ${ch.num}`;
      document.getElementById('chapter-pill-dot').classList.toggle('hidden', !done);
    } else {
      chPill.classList.add('hidden');
    }

    const totalOrderBadge = this.readyOrderCount() + this.getClaimableAchievements().length;
    const badgeOrd = document.getElementById('badge-orders');
    badgeOrd.textContent = totalOrderBadge;
    badgeOrd.classList.toggle('hidden', totalOrderBadge === 0);

    const soldStand = s.stand.filter((x) => x && x.sold).length;
    const badgeBarn = document.getElementById('badge-barn');
    badgeBarn.textContent = soldStand;
    badgeBarn.classList.toggle('hidden', soldStand === 0);

    const barnMini = document.getElementById('hud-barn-mini');
    if (barnMini) {
      // Das vollere Lager zeigen (Silo oder Scheune)
      const fill = (k) => storageUsed(s, k) / s.storage[k];
      const k = fill('silo') >= fill('barn') ? 'silo' : 'barn';
      barnMini.textContent = `${storageUsed(s, k)}/${s.storage[k]}`;
    }

    const scytheBtn = document.getElementById('btn-scythe');
    const scytheCountEl = document.getElementById('scythe-count');
    if (scytheBtn && scytheCountEl) {
      const readyFieldsCount = this.state.fields.filter((f) => this.isFieldReady(f)).length;
      scytheBtn.classList.toggle('hidden', !(s.level >= 3 && readyFieldsCount > 0));
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

    document.getElementById('btn-light').addEventListener('click', () => {
      audio.playTap();
      const cycle = ['day', 'dusk', 'night', 'auto'];
      const labels = {
        auto: 'Tageszeit: Automatisch',
        day: 'Tageszeit: Wintertag',
        dusk: 'Tageszeit: Abenddämmerung',
        night: 'Tageszeit: Sternennacht'
      };
      const next = cycle[(cycle.indexOf(this.world.lightingMode) + 1) % cycle.length];
      this.world.lightingMode = next;
      this.act({ type: 'setSetting', key: 'lighting', value: next }, { quiet: true });
      this.updateHUD();
      this.showToast(labels[next]);
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      audio.playTap();
      this.openModal('settings');
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
      const hasSold = this.core.stand.some((x) => x && x.sold);
      this.openModal('barn', {}, hasSold ? 'stand' : 'inv');
    });
    document.getElementById('dock-orders').addEventListener('click', () => {
      audio.playTap();
      const hasAch = this.getClaimableAchievements().length > 0;
      this.openModal('orders', {}, this.readyOrderCount() === 0 && hasAch ? 'achievements' : 'wishlist');
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

  // ---- Zeiger / Touch ----
  bindCanvasEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      audio.unlock();
      this.world.cam.targetZoom = null;
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: vx(e), y: vy(e) });

      if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        this.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        this.pinchStartZoom = this.world.cam.zoom;
        this.dragMode = 'pinch';
        return;
      }

      this.world.cam.vx = 0;
      this.world.cam.vy = 0;
      this.dragStart = { x: vx(e), y: vy(e), time: performance.now() };
      this.lastPanPos = { x: vx(e), y: vy(e) };
      this.lastPanTime = performance.now();
      this.swipedFieldIds.clear();
      this._swipeFullWarned = false;
      this.dragMode = null;

      if (this.ui.mode === 'place' || (this.ui.mode === 'move' && this.ui.selectedMoveId)) {
        this._updatePlacementPreview(vx(e), vy(e));
      }

      if (this.ui.mode === 'normal') {
        const wp = this.world.screenToWorld(vx(e), vy(e));
        const f = this.getFieldAtWorld(wp.x, wp.y);
        if (f && this.isFieldReady(f)) {
          this.dragMode = 'swipe-harvest';
          this._swipeHarvest(f);
          this.world.addSwipePoint(vx(e), vy(e), 'harvest');
        } else if (f && !f.cropId && this.ui.seedTrayOpen && this.ui.selectedSeed) {
          this.dragMode = 'swipe-plant';
          this.plantField(f, this.ui.selectedSeed);
          this.swipedFieldIds.add(f.id);
          this.world.addSwipePoint(vx(e), vy(e), 'plant');
        }
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) {
        if (this.ui.mode === 'place' || (this.ui.mode === 'move' && this.ui.selectedMoveId)) {
          this._updatePlacementPreview(vx(e), vy(e));
        }
        return;
      }
      this.pointers.set(e.pointerId, { x: vx(e), y: vy(e) });

      if (this.pointers.size === 2 && this.pinchStartDist > 0) {
        const pts = [...this.pointers.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        this.world.cam.zoom = Math.max(0.52, Math.min(1.55, this.pinchStartZoom * (dist / this.pinchStartDist)));
        this.world.clampCamera();
        return;
      }

      if (this.dragMode === 'swipe-harvest') {
        this.world.addSwipePoint(vx(e), vy(e), 'harvest');
        const wp = this.world.screenToWorld(vx(e), vy(e));
        const f = this.getFieldAtWorld(wp.x, wp.y);
        if (f && !this.swipedFieldIds.has(f.id) && this.isFieldReady(f)) this._swipeHarvest(f);
        return;
      }

      if (this.dragMode === 'swipe-plant') {
        this.world.addSwipePoint(vx(e), vy(e), 'plant');
        const wp = this.world.screenToWorld(vx(e), vy(e));
        const f = this.getFieldAtWorld(wp.x, wp.y);
        if (f && !this.swipedFieldIds.has(f.id) && !f.cropId && this.ui.selectedSeed) {
          this.swipedFieldIds.add(f.id);
          this.plantField(f, this.ui.selectedSeed, { quiet: true });
        }
        return;
      }

      if (this.dragStart) {
        const dist = Math.hypot(vx(e) - this.dragStart.x, vy(e) - this.dragStart.y);
        if (dist > 7 || this.dragMode === 'pan') {
          this.dragMode = 'pan';
          const dx = (vx(e) - this.lastPanPos.x) / this.world.cam.zoom;
          const dy = (vy(e) - this.lastPanPos.y) / this.world.cam.zoom;
          this.world.cam.x -= dx;
          this.world.cam.y -= dy;
          this.world.clampCamera();

          const now = performance.now();
          const dt = Math.max(8, now - this.lastPanTime) / 1000;
          this.world.cam.vx = (-dx / dt) * 0.5;
          this.world.cam.vy = (-dy / dt) * 0.5;
          this.lastPanPos = { x: vx(e), y: vy(e) };
          this.lastPanTime = now;
        }
      }
    });

    const onEnd = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        const wasTap = this.dragStart && !this.dragMode;
        if (wasTap) this.handleCanvasTap(vx(e), vy(e));
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
      const factor = e.deltaY < 0 ? 1.09 : 0.92;
      this.world.cam.zoom = Math.max(0.52, Math.min(1.55, this.world.cam.zoom * factor));
      this.world.clampCamera();
    }, { passive: false });
  }

  /** Wisch-Ernte: Silo-voll-Hinweis nur einmal pro Wisch. */
  _swipeHarvest(f) {
    this.swipedFieldIds.add(f.id);
    const res = this.harvestField(f, { quiet: true });
    if (!res.ok && res.error.code === 'storage_full' && !this._swipeFullWarned) {
      this._swipeFullWarned = true;
      this.showError(res.error);
    }
  }

  getFieldAtWorld(wx, wy) {
    const { gx, gy } = worldToGrid(wx, wy);
    const tx = Math.floor(gx), ty = Math.floor(gy);
    return this.state.fields.find((f) => f.gx === tx && f.gy === ty) || null;
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
    this.ui.previewTile = { gx: tx, gy: ty, size, valid: this.isAreaFree(tx, ty, size, ignoreId) };
  }

  _findMovable(id) {
    const o = this.core.objects.find((x) => x.id === id);
    if (!o || o.kind === 'prop') return null;
    const size = footprintOf(o).w;
    const label =
      o.kind === 'field' ? 'Ackerfeld'
        : o.kind === 'animal' ? (o.nick || ANIMALS[o.type]?.name)
          : o.kind === 'deco' ? DECORATIONS[o.type]?.name
            : STATIONS[o.type]?.name;
    return { id, kind: o.kind, size, label };
  }

  _placeError(tx, ty) {
    const lz = this.getLockedZoneAt(tx, ty);
    this.showToast(lz ? `Schalte zuerst "${lz.name}" frei.` : 'Hier ist kein freier Platz.');
  }

  handleCanvasTap(sx, sy) {
    const wp = this.world.screenToWorld(sx, sy);
    const { gx, gy } = worldToGrid(wp.x, wp.y);
    const tx = Math.floor(gx), ty = Math.floor(gy);

    // 1. Bauen
    if (this.ui.mode === 'place' && this.ui.pendingPurchase) {
      const p = this.ui.pendingPurchase;
      if (!this.isAreaFree(tx, ty, p.size || 1)) {
        audio.playTap();
        this._placeError(tx, ty);
        return;
      }
      let cmd;
      if (p.kind === 'field') cmd = { type: 'buyField', gx: tx, gy: ty };
      else if (p.kind === 'animal') cmd = { type: 'buyAnimal', animalType: p.type, gx: tx, gy: ty };
      else if (p.kind === 'station') cmd = { type: 'buyStation', stationType: p.type, gx: tx, gy: ty };
      else if (p.kind === 'deco') {
        cmd = (this.core.storedDecos[p.type] || 0) > 0
          ? { type: 'placeStoredDeco', decoType: p.type, gx: tx, gy: ty }
          : { type: 'buyDeco', decoType: p.type, gx: tx, gy: ty };
      }
      const res = this.act(cmd);
      if (res.ok || res.error.code === 'no_coins' || res.error.code === 'limit') this.exitSpecialMode();
      return;
    }

    // 2. Verschieben
    if (this.ui.mode === 'move') {
      if (!this.ui.selectedMoveId) {
        const hit = this.hitTestWorld(wp.x, wp.y);
        const m = ['field', 'animal', 'deco', 'station'].includes(hit.kind) ? this._findMovable(hit.entity.id) : null;
        if (m) {
          this.ui.selectedMoveId = m.id;
          audio.playTap();
          this.showModeBanner(`Neuen Platz tippen für: ${m.label}`, 'Fertig', m.kind === 'deco');
        } else {
          this.showToast('Tippe ein Feld, Tier, Gebäude oder Deko an.');
        }
      } else {
        const m = this._findMovable(this.ui.selectedMoveId);
        if (!m) { this.ui.selectedMoveId = null; return; }
        if (!this.isAreaFree(tx, ty, m.size, m.id)) {
          audio.playTap();
          this._placeError(tx, ty);
          return;
        }
        if (this.act({ type: 'moveObject', objectId: m.id, gx: tx, gy: ty }).ok) {
          this.ui.selectedMoveId = null;
          this.ui.previewTile = null;
          this.showModeBanner('Verschoben. Nächstes Objekt tippen oder Fertig.', 'Fertig', false);
        }
      }
      return;
    }

    // 3. Normales Spielen
    const hit = this.hitTestWorld(wp.x, wp.y);

    if (hit.kind === 'daily_chest') { this.claimDailyChest(); return; }
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
        this.showToast(`${crop.name} ist in ${formatDuration(left)} erntereif.`);
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
      audio.playTap();
      this.world.triggerBounce(hit.kind === 'tree' ? 'christmasTree' : 'chalet');
      this.openModal('village', {}, 'overview');
    } else if (hit.kind === 'deco') {
      audio.playTap();
      this.world.triggerBounce(hit.entity.id);
    }
  }

  // ---- Hit Testing ----
  hitTestWorld(wx, wy) {
    if (this.world.hitTestDailyChest(wx, wy, this.isDailyChestReady())) return { kind: 'daily_chest' };

    const candidates = [];

    const vil = this.world.hitTestVillager(wx, wy);
    if (vil) {
      candidates.push({ kind: 'villager', entity: vil, depth: vil.gx + vil.gy + 0.5, hit: () => true });
    }

    const unlocked = new Set(this.state.unlockedLands || []);
    for (const z of LAND_ZONES) {
      if (unlocked.has(z.id)) continue;
      const p = gridToWorld(z.signPos.gx + 0.5, z.signPos.gy + 0.5);
      candidates.push({
        kind: 'land_sign', entity: z, depth: z.signPos.gx + z.signPos.gy + 0.8,
        hit: () => Math.abs(wx - p.x) < 52 && wy > p.y - 68 && wy < p.y + 14
      });
    }

    for (const st of this.state.stations) {
      if (!st.built) continue;
      const p = gridToWorld(st.gx + 1, st.gy + 1);
      candidates.push({
        kind: 'station', entity: st, depth: st.gx + st.gy + 1.5,
        hit: () => Math.abs(wx - p.x) < 88 && wy > p.y - 180 && wy < p.y + 28
      });
    }

    {
      const p = gridToWorld(this.state.chalet.gx + 1, this.state.chalet.gy + 1);
      candidates.push({
        kind: 'chalet', entity: this.state.chalet, depth: this.state.chalet.gx + this.state.chalet.gy + 1.5,
        hit: () => Math.abs(wx - p.x) < 96 && wy > p.y - 196 && wy < p.y + 26
      });
    }
    {
      const p = gridToWorld(this.state.christmasTree.gx + 1, this.state.christmasTree.gy + 1);
      candidates.push({
        kind: 'tree', entity: this.state.christmasTree, depth: this.state.christmasTree.gx + this.state.christmasTree.gy + 1.5,
        hit: () => Math.abs(wx - p.x) < 76 && wy > p.y - 235 && wy < p.y + 24
      });
    }
    {
      const p = gridToWorld(this.state.wishlistBoard.gx + 0.5, this.state.wishlistBoard.gy + 0.5);
      candidates.push({
        kind: 'wishlist', entity: this.state.wishlistBoard, depth: this.state.wishlistBoard.gx + this.state.wishlistBoard.gy + 0.4,
        hit: () => Math.abs(wx - p.x) < 48 && wy > p.y - 108 && wy < p.y + 20
      });
    }
    {
      const p = gridToWorld(this.state.sleighPos.gx + 0.5, this.state.sleighPos.gy + 0.5);
      candidates.push({
        kind: 'sleigh', entity: this.state.sleighPos, depth: this.state.sleighPos.gx + this.state.sleighPos.gy + 0.6,
        hit: () => Math.abs(wx - p.x) < 82 && wy > p.y - 115 && wy < p.y + 32
      });
    }
    {
      const p = gridToWorld(this.state.mailbox.gx + 0.5, this.state.mailbox.gy + 0.5);
      candidates.push({
        kind: 'mailbox', entity: this.state.mailbox, depth: this.state.mailbox.gx + this.state.mailbox.gy + 0.4,
        hit: () => Math.abs(wx - p.x) < 32 && wy > p.y - 88 && wy < p.y + 16
      });
    }

    for (const an of this.state.animals) {
      const mot = this.world.getAnimalMotion(an);
      const p = gridToWorld(an.gx + 0.5 + mot.ox, an.gy + 0.5 + mot.oy);
      candidates.push({
        kind: 'animal', entity: an, depth: an.gx + mot.ox + an.gy + mot.oy + 0.35,
        hit: () => Math.abs(wx - p.x) < 40 && wy > p.y - 86 && wy < p.y + 18
      });
    }

    for (const d of this.state.decorations) {
      const p = gridToWorld(d.gx + 0.5, d.gy + 0.5);
      candidates.push({
        kind: 'deco', entity: d, depth: d.gx + d.gy + 0.3,
        hit: () => Math.abs(wx - p.x) < 36 && wy > p.y - 82 && wy < p.y + 16
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


  // ============================================================================
  openModal(kind, data = {}, tab = null) {
    this.ui.activeModal = { kind, data, tab };
    this.renderActiveModal();
    document.getElementById('modal-backdrop').classList.remove('hidden');
  }

  closeModal() {
    this.ui.activeModal = null;
    document.getElementById('modal-backdrop').classList.add('hidden');
    if (this.ui.pendingLevelUp) {
      const lvlInfo = this.ui.pendingLevelUp;
      this.ui.pendingLevelUp = null;
      this.openModal('levelup', { lvlInfo });
    }
  }

  renderActiveModal() {
    const m = this.ui.activeModal;
    if (!m) return;
    const titleEl = document.getElementById('modal-title');
    const tabsEl = document.getElementById('modal-tabs');
    const bodyEl = document.getElementById('modal-body');
    tabsEl.style.display = 'none';
    tabsEl.innerHTML = '';

    if (m.kind === 'chapters') this._renderChaptersModal(titleEl, bodyEl);
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

  _renderChaptersModal(titleEl, bodyEl) {
    titleEl.textContent = 'Hof-Kapitel';
    bodyEl.innerHTML = CHAPTERS.map((ch) => {
      const claimed = this.state.claimedChapters.includes(ch.id);
      const ready = goalReady(this.core, ch);
      const iconKey = claimed ? 'check' : ready ? 'star' : 'scroll';
      return `
        <div class="cozy-card" style="${ready ? 'border-color:var(--pine);background:#F4FFF7' : ''}">
          <div class="card-thumb" style="color:${claimed ? 'var(--pine)' : 'var(--oak-mid)'}">${sprites.getUiIcon(iconKey)}</div>
          <div class="card-info">
            <div class="card-title">${ch.title}</div>
            <div class="card-sub">${ch.goalText}</div>
            <div style="font-size:11.5px;font-weight:800;color:var(--brass-deep);margin-top:3px">Belohnung: ${ch.coins} Münzen · +${ch.xp} XP</div>
          </div>
          ${claimed
            ? `<button class="btn-wood" disabled>Erledigt</button>`
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
    if (!st) { this.closeModal(); return; }
    const def = STATIONS[st.type];
    const slots = def.queueSlots || 4;
    const lvl = getLevelInfo(this.state.xp).level;
    const mastery = getStationMastery(st.craftedCount || 0);
    titleEl.textContent = def.name;

    const masteryHtml = `
      <div class="cozy-card" style="padding:8px 12px;background:#FFFBF0;border-color:var(--brass);justify-content:space-between">
        <div style="font-size:12px;font-weight:800;color:var(--oak-dark)">Meisterstufe: ${mastery.label}</div>
        <div style="font-size:11px;font-weight:700;color:var(--ink-muted)">${mastery.nextAt ? `${st.craftedCount || 0}/${mastery.nextAt}` : 'Maximal'}</div>
      </div>`;

    let queueHtml = '<div class="queue-strip">';
    for (let i = 0; i < slots; i++) {
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
      let canMake = !locked && st.queue.length < slots;
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
            <div class="card-title">${r.name} <span style="font-size:11px;color:var(--ink-muted);font-weight:700">${formatDuration(effTime)}</span></div>
            <div class="card-sub">${r.desc}</div>
            <div class="ing-row">${ingHtml}</div>
          </div>
          ${locked
            ? `<button class="btn-wood" disabled>Lv.${r.unlockLevel}</button>`
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
    titleEl.textContent = 'Aufträge & Erfolge';
    tabsEl.style.display = 'flex';
    const claimable = this.getClaimableAchievements().length;
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'wishlist' ? 'active' : ''}" data-tab="wishlist">Wunschzettel</button>
      <button class="tab-btn ${tab === 'achievements' ? 'active' : ''}" data-tab="achievements">Erfolge${claimable ? ` (${claimable})` : ''}</button>
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
              <div class="npc-avatar" style="background:${npc.avatarBg}">${getInitials(npc.name)}</div>
              <div class="card-info">
                <div class="card-title">${npc.name}</div>
                <div class="order-quote">"${ord.quote}"</div>
              </div>
            </div>
            <div class="ing-row">${reqHtml}</div>
            <div class="order-foot">
              <div style="font-weight:800;font-size:12.5px;color:var(--brass-deep)">${ord.coins} Münzen · +${ord.xp} XP</div>
              <div style="display:flex;gap:6px">
                <button class="btn-wood" style="padding:7px 10px" data-skip="${ord.id}" title="Neuen Auftrag holen">Neu</button>
                <button class="btn-green" data-deliver="${ord.id}" ${canDeliver ? '' : 'disabled'}>Ausliefern</button>
              </div>
            </div>
          </div>`;
      }).join('') + this.core.orders.filter((o) => o.availableAt > Date.now()).map((o) => `
          <div class="order-card" style="opacity:0.6">
            <div class="card-info">
              <div class="card-title">Neuer Auftrag unterwegs</div>
              <div class="card-sub">Kommt in ${formatDuration(Math.max(1, Math.ceil((o.availableAt - Date.now()) / 1000)))}</div>
            </div>
          </div>`).join('');
      bodyEl.querySelectorAll('[data-deliver]').forEach((b) => b.addEventListener('click', () => this.fulfillOrder(b.dataset.deliver)));
      bodyEl.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => this.skipOrder(b.dataset.skip)));
    } else {
      bodyEl.innerHTML = ACHIEVEMENTS.map((a) => {
        const cur = Math.min(a.goal, this.state.stats[a.stat] || 0);
        const claimed = this.state.claimedAchievements.includes(a.id);
        const ready = goalReady(this.core, a);
        return `
          <div class="cozy-card" style="${ready ? 'border-color:var(--pine);background:#F4FFF7' : ''}">
            <div class="card-thumb">${sprites.getUiIcon(a.icon || 'star')}</div>
            <div class="card-info">
              <div class="card-title">${a.title} <span style="font-size:11px;color:var(--ink-muted)">(${cur}/${a.goal})</span></div>
              <div class="card-sub">${a.desc}</div>
              <div style="font-size:11.5px;font-weight:800;color:var(--brass-deep);margin-top:3px">${a.coins} Münzen · +${a.xp} XP</div>
            </div>
            ${claimed
              ? `<button class="btn-wood" disabled>Fertig</button>`
              : `<button class="btn-green" data-claim-ach="${a.id}" ${ready ? '' : 'disabled'}>Abholen</button>`
            }
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-claim-ach]').forEach((b) => b.addEventListener('click', () => this.claimAchievement(b.dataset.claimAch)));
    }
  }

  _renderBarnModal(titleEl, tabsEl, bodyEl, tab) {
    titleEl.textContent = 'Vorrat & Hofladen';
    tabsEl.style.display = 'flex';
    const soldCount = this.state.standSlots.filter((s) => s && s.sold).length;
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'inv' ? 'active' : ''}" data-tab="inv">Mein Vorrat</button>
      <button class="tab-btn ${tab === 'stand' ? 'active' : ''}" data-tab="stand">Hofladen${soldCount ? ` (${soldCount})` : ''}</button>
    `;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => {
        audio.playTap();
        this.ui.activeModal.tab = b.dataset.tab;
        this.renderActiveModal();
      })
    );

    const entries = Object.entries(this.state.inventory).filter(([id, q]) => q > 0 && ITEMS[id]);

    if (tab === 'inv') {
      const capCard = (kind) => {
        const s = this.core;
        const used = storageUsed(s, kind);
        const cap = s.storage[kind];
        const pct = Math.min(100, Math.round((used / cap) * 100));
        const fillCls = used >= cap ? 'full' : pct >= 80 ? 'warn' : '';
        const upCost = storageUpgradeCost(s, kind);
        const step = CONTENT.storage[kind].stepCapacity;
        const what = kind === 'silo' ? 'Ernte' : 'Tierprodukte und Waren';
        return `
        <div class="barn-cap-card">
          <div class="barn-cap-top">
            <div>
              <div class="card-title">${STORAGE_LABEL[kind]}: ${used} / ${cap}</div>
              <div class="card-sub">${upCost === null ? 'Maximal ausgebaut.' : `Für ${what}. Ausbau: +${step} Plätze.`}</div>
            </div>
            ${upCost === null
              ? `<button class="btn-wood" disabled>Max</button>`
              : `<button class="btn-green" data-upgrade="${kind}" ${s.coins >= upCost ? '' : 'disabled'}>+${step} (${upCost})</button>`
            }
          </div>
          <div class="barn-cap-track"><div class="barn-cap-fill ${fillCls}" style="width:${pct}%"></div></div>
        </div>`;
      };
      const capHtml = capCard('silo') + capCard('barn');
      const bindUpgrade = () => bodyEl.querySelectorAll('[data-upgrade]').forEach((b) => b.addEventListener('click', () => this.upgradeStorage(b.dataset.upgrade)));

      if (entries.length === 0) {
        bodyEl.innerHTML = `${capHtml}<div class="cozy-card"><div class="card-info"><div class="card-title">Dein Vorrat ist leer</div><div class="card-sub">Ernte Felder oder backe Leckereien in deiner Backstube.</div></div></div>`;
        bindUpgrade();
        return;
      }
      bodyEl.innerHTML = `
        ${capHtml}
        <div class="card-sub">Der Händler zahlt wenig. Im <b>Hofladen</b> und mit <b>Aufträgen</b> verdienst du deutlich mehr.</div>
        <div class="inv-grid">
          ${entries.map(([id, qty]) => {
            const it = ITEMS[id];
            return `
              <div class="inv-tile">
                <img src="${sprites.getIconUrl(id)}" alt="${it.name}" />
                <div style="font-weight:800;font-size:12.5px">${it.name}</div>
                <div class="inv-qty">${qty}x im Vorrat</div>
                <button class="btn-gold" style="padding:5px 9px;font-size:11px;margin-top:3px" data-sell="${id}">Händler: ${Math.max(1, Math.floor(it.sellPrice * CONTENT.market.sellFactor))}</button>
              </div>`;
          }).join('')}
        </div>`;
      bindUpgrade();
      bodyEl.querySelectorAll('[data-sell]').forEach((btn) =>
        btn.addEventListener('click', () => this.sellItem(btn.dataset.sell))
      );
    } else {
      const cratesHtml = this.state.standSlots.map((slot, idx) => {
        if (!slot) {
          return `
            <div class="inv-tile" style="border-style:dashed">
              <div style="font-weight:800;font-size:12px;color:var(--ink-muted);margin-top:6px">Kiste #${idx + 1}</div>
              <div class="card-sub">Frei</div>
              <button class="btn-green" style="padding:5px 10px;font-size:11px;margin-top:4px" data-pick-slot="${idx}" ${entries.length ? '' : 'disabled'}>Auslegen</button>
            </div>`;
        }
        if (slot.sold) {
          return `
            <div class="inv-tile" style="border-color:var(--pine);background:#F4FFF7">
              <div style="font-weight:800;font-size:12px;margin-top:4px">Verkauft an ${slot.buyerName}</div>
              <button class="btn-gold" style="padding:6px 10px;font-size:12px;margin-top:6px" data-collect-slot="${idx}">+${slot.price} abholen</button>
            </div>`;
        }
        const left = Math.max(1, Math.ceil((slot.sellAt - Date.now()) / 1000));
        return `
          <div class="inv-tile" style="background:#FFFBF0;border-color:var(--brass)">
            <img src="${sprites.getIconUrl(slot.itemId)}" alt="" />
            <div style="font-weight:800;font-size:12px">${slot.qty}x ${ITEMS[slot.itemId].name}</div>
            <div style="font-size:11px;color:var(--brass-deep);font-weight:800">${slot.price} · ${left}s</div>
          </div>`;
      }).join('');

      let pickerHtml = '';
      if (this.ui.activeModal.data?.pickingSlot !== undefined) {
        const sIdx = this.ui.activeModal.data.pickingSlot;
        pickerHtml = `
          <div class="cozy-card" style="flex-direction:column;align-items:stretch;background:#FFFBF0">
            <div class="card-title">Ware für Kiste #${sIdx + 1} wählen:</div>
            <div class="ing-row">
              ${entries.map(([id, q]) => {
                const { qty, price } = this.standOffer(id);
                return `<button class="ing-pill ok" style="cursor:pointer;padding:6px 10px" data-put-item="${id}" data-put-slot="${sIdx}">
                  <img src="${sprites.getIconUrl(id)}" alt="" />${qty}x ${ITEMS[id].name} (${price})
                </button>`;
              }).join('')}
            </div>
          </div>`;
      }

      bodyEl.innerHTML = `<div class="card-sub">Stelle Waren in deinen Hofladen – Dorfbewohner zahlen viel mehr als der Händler.</div>${pickerHtml}<div class="inv-grid">${cratesHtml}</div>`;
      bodyEl.querySelectorAll('[data-pick-slot]').forEach((b) => b.addEventListener('click', () => { audio.playTap(); this.ui.activeModal.data = { pickingSlot: Number(b.dataset.pickSlot) }; this.renderActiveModal(); }));
      bodyEl.querySelectorAll('[data-put-item]').forEach((b) => b.addEventListener('click', () => { const sIdx = Number(b.dataset.putSlot); this.ui.activeModal.data = {}; this.listItemOnStand(sIdx, b.dataset.putItem); }));
      bodyEl.querySelectorAll('[data-collect-slot]').forEach((b) => b.addEventListener('click', () => this.collectStandSlot(Number(b.dataset.collectSlot))));
    }
  }

  _renderShopModal(titleEl, tabsEl, bodyEl, tab) {
    titleEl.textContent = 'Bau- & Deko-Shop';
    const lvl = getLevelInfo(this.state.xp).level;
    tabsEl.style.display = 'flex';
    const tabs = [
      { id: 'buildings', label: 'Gebäude' },
      { id: 'animals', label: 'Tiere' },
      { id: 'deco', label: 'Deko' },
      { id: 'land', label: 'Land' }
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
      const fcfg = CONTENT.field;
      const nFields = this.state.fields.length;
      const fieldCost = fcfg.cost + fcfg.costStep * nFields;
      const canMoreFields = nFields < fcfg.maxCount;
      let html = `
        <div class="cozy-card">
          <div class="card-thumb"><img src="${sprites.getIconUrl('snow_field_plot')}" alt="Ackerfeld" /></div>
          <div class="card-info">
            <div class="card-title">Neues Ackerfeld <span style="font-size:11px;color:var(--ink-muted)">(${nFields}/${fcfg.maxCount})</span></div>
            <div class="card-sub">Für Goldweizen, Winterbeeren, Matcha, Kakao, Zimt und Zuckerstangen.</div>
          </div>
          <button class="btn-green" id="buy-field" ${canMoreFields && this.state.coins >= fieldCost ? '' : 'disabled'}>${canMoreFields ? `${fieldCost}` : 'Max'}</button>
        </div>`;

      for (const def of Object.values(STATIONS)) {
        const built = this.state.stations.some((x) => x.type === def.id);
        const locked = def.unlockLevel > lvl;
        html += `
          <div class="cozy-card ${locked ? 'locked' : ''}">
            <div class="card-thumb"><img src="${sprites.getIconUrl(def.sprite)}" alt="${def.name}" /></div>
            <div class="card-info">
              <div class="card-title">${def.name}</div>
              <div class="card-sub">${def.desc}</div>
            </div>
            ${built
              ? `<button class="btn-wood" disabled>Gebaut</button>`
              : locked
                ? `<button class="btn-wood" disabled>Lv.${def.unlockLevel}</button>`
                : `<button class="btn-green" data-buy-st="${def.id}" ${this.state.coins >= def.cost ? '' : 'disabled'}>${def.cost}</button>`
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
              <div class="card-title">${an.name} <span style="font-size:11px;color:var(--ink-muted)">(${count}/${an.maxCount})</span></div>
              <div class="card-sub">${an.desc}</div>
            </div>
            ${locked
              ? `<button class="btn-wood" disabled>Lv.${an.unlockLevel}</button>`
              : full
                ? `<button class="btn-wood" disabled>Max</button>`
                : `<button class="btn-green" data-buy-an="${an.id}" ${this.state.coins >= an.cost ? '' : 'disabled'}>${an.cost}</button>`
            }
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-buy-an]').forEach((b) =>
        b.addEventListener('click', () => {
          const def = ANIMALS[b.dataset.buyAn];
          this.enterPlaceMode({ kind: 'animal', type: def.id, label: def.name, cost: def.cost, size: 1 });
        })
      );
    } else if (tab === 'deco') {
      bodyEl.innerHTML = Object.values(DECORATIONS).map((d) => {
        const stored = this.state.storedDecos[d.id] || 0;
        const locked = d.unlockLevel > lvl && stored === 0;
        return `
          <div class="cozy-card ${locked ? 'locked' : ''}">
            <div class="card-thumb"><img src="${sprites.getIconUrl(d.sprite)}" alt="${d.name}" /></div>
            <div class="card-info">
              <div class="card-title">${d.name} <span style="font-size:11px;color:var(--pine)">${stored > 0 ? `${stored}x im Lager` : `+${d.xp} XP`}</span></div>
              <div class="card-sub">${d.desc}</div>
            </div>
            ${locked
              ? `<button class="btn-wood" disabled>Lv.${d.unlockLevel}</button>`
              : stored > 0
                ? `<button class="btn-gold" data-buy-deco="${d.id}">Gratis</button>`
                : `<button class="btn-green" data-buy-deco="${d.id}" ${this.state.coins >= d.cost ? '' : 'disabled'}>${d.cost}</button>`
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
            <div class="card-thumb">${sprites.getUiIcon('land')}</div>
            <div class="card-info">
              <div class="card-title">${z.name}</div>
              <div class="card-sub">${z.desc}</div>
            </div>
            ${isOpen
              ? `<button class="btn-wood" disabled>Frei</button>`
              : locked
                ? `<button class="btn-wood" disabled>Lv.${z.unlockLevel}</button>`
                : `<button class="btn-green" data-buy-land="${z.id}" ${this.state.coins >= z.cost ? '' : 'disabled'}>${z.cost}</button>`
            }
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-buy-land]').forEach((b) =>
        b.addEventListener('click', () => { if (this.unlockLandZone(b.dataset.buyLand)) this.renderActiveModal(); })
      );
    }
  }

  _renderGiftsModal(titleEl, tabsEl, bodyEl, tab) {
    titleEl.textContent = 'Winterpost';
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'send' ? 'active' : ''}" data-tab="send">Päckchen senden</button>
      <button class="tab-btn ${tab === 'open' ? 'active' : ''}" data-tab="open">Päckchen öffnen</button>
    `;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => { audio.playTap(); this.ui.activeModal.tab = b.dataset.tab; this.renderActiveModal(); })
    );

    if (tab === 'send') {
      const draft = this.ui.giftDraft;
      const totalSelected = Object.values(draft.items).reduce((a, b) => a + b, 0);
      const invEntries = Object.entries(this.state.inventory).filter(([id, q]) => q > 0 && ITEMS[id]);
      let html = `
        <div class="card-sub">Packe bis zu 3 Waren mit einer persönlichen Nachricht als Link oder Code.</div>
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Absender:</label>
          <input id="gift-from" class="cozy-input" value="${this._esc(draft.from ?? this.state.playerName)}" maxlength="24" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Nachricht:</label>
          <textarea id="gift-note" class="cozy-textarea" maxlength="120" placeholder="Kleine Stärkung aus dem Winterhof.">${this._esc(draft.note)}</textarea>
        </div>
        <div style="font-size:12.5px;font-weight:800">Ausgewählt (${totalSelected}/3):</div>
        <div class="inv-grid">
          ${invEntries.length === 0 ? '<div class="card-sub">Ernte oder backe erst etwas.</div>' : invEntries.map(([id, qty]) => {
            const sel = draft.items[id] || 0;
            return `
              <div class="inv-tile" style="${sel > 0 ? 'border-color:var(--crimson);background:#FFF5F5' : ''}">
                <img src="${sprites.getIconUrl(id)}" alt="" />
                <div style="font-weight:800;font-size:12px">${ITEMS[id].name}</div>
                <div style="font-size:11px;color:var(--ink-muted)">Vorrat: ${qty}</div>
                <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
                  <button class="btn-wood" style="padding:3px 9px" data-gdec="${id}" ${sel <= 0 ? 'disabled' : ''}>-</button>
                  <span style="font-weight:900;min-width:16px">${sel}</span>
                  <button class="btn-green" style="padding:3px 9px" data-ginc="${id}" ${sel >= qty || totalSelected >= 3 ? 'disabled' : ''}>+</button>
                </div>
              </div>`;
          }).join('')}
        </div>
        <button id="btn-pack-gift" class="btn-red" style="width:100%;padding:11px;font-size:14px" ${totalSelected === 0 ? 'disabled' : ''}>Päckchen packen &amp; Code erstellen</button>`;

      if (draft.generatedCode) {
        const shareUrl = buildGiftShareUrl(draft.generatedCode);
        html += `
          <div class="cozy-card" style="flex-direction:column;align-items:stretch;background:#FFFBF0;border-color:var(--brass)">
            <div class="card-title">Dein Päckchen ist versandbereit</div>
            <div class="code-box">${this._esc(draft.generatedCode)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${navigator.share ? `<button id="btn-share-native" class="btn-green" style="flex:1">Teilen</button>` : ''}
              <button id="btn-copy-link" class="btn-gold" style="flex:1">Link kopieren</button>
              <button id="btn-copy-code" class="btn-wood" style="flex:1">Code kopieren</button>
            </div>
          </div>`;
        setTimeout(() => {
          document.getElementById('btn-share-native')?.addEventListener('click', () => {
            navigator.share({ title: 'Winterhof Post', text: `${this.state.playerName} schickt dir ein Päckchen: "${draft.note || 'Viele Grüße!'}"\nCode: ${draft.generatedCode}`, url: shareUrl }).catch(() => {});
          });
          document.getElementById('btn-copy-link')?.addEventListener('click', () => { navigator.clipboard?.writeText(shareUrl).then(() => this.showToast('Link kopiert.')); });
          document.getElementById('btn-copy-code')?.addEventListener('click', () => { navigator.clipboard?.writeText(draft.generatedCode).then(() => this.showToast('Code kopiert.')); });
        }, 0);
      }

      bodyEl.innerHTML = html;
      bodyEl.querySelector('#gift-from')?.addEventListener('input', (e) => { draft.from = e.target.value; });
      bodyEl.querySelector('#gift-note')?.addEventListener('input', (e) => { draft.note = e.target.value; });
      bodyEl.querySelectorAll('[data-ginc]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.ginc; draft.items[id] = (draft.items[id] || 0) + 1; draft.generatedCode = null; this.renderActiveModal(); }));
      bodyEl.querySelectorAll('[data-gdec]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.gdec; draft.items[id] = Math.max(0, (draft.items[id] || 0) - 1); if (draft.items[id] === 0) delete draft.items[id]; draft.generatedCode = null; this.renderActiveModal(); }));
      bodyEl.querySelector('#btn-pack-gift')?.addEventListener('click', () => {
        const from = (draft.from ?? this.core.playerName).trim();
        if (from && from !== this.core.playerName) this.act({ type: 'rename', playerName: from }, { quiet: true });
        const items = { ...draft.items };
        if (!this.act({ type: 'packGift', items }).ok) return;
        const code = encodeGiftParcel({ from: this.core.playerName || 'Winterhof-Gast', note: draft.note || 'Ein kleines Päckchen für dich.', items });
        draft.items = {}; draft.from = null; draft.generatedCode = code;
        this.renderActiveModal();
      });
    } else {
      bodyEl.innerHTML = `
        <div class="card-sub">Füge hier einen erhaltenen Päckchen-Code (<code>WH-...</code>) oder Link ein.</div>
        <textarea id="gift-redeem-input" class="cozy-textarea" placeholder="WH-... oder Link einfügen"></textarea>
        <button id="btn-redeem-gift" class="btn-green" style="width:100%;padding:11px;font-size:14px">Päckchen empfangen</button>`;
      bodyEl.querySelector('#btn-redeem-gift').addEventListener('click', () => {
        const parcel = decodeGiftParcel(bodyEl.querySelector('#gift-redeem-input').value);
        if (!parcel) { this.showToast('Der Code ist leider nicht gültig.'); return; }
        this.receiveGiftParcel(parcel);
      });
    }
  }

  _renderGiftOpenedModal(titleEl, bodyEl, parcel) {
    titleEl.textContent = 'Winterpost angekommen';
    const itemsHtml = Object.entries(parcel.items)
      .filter(([id]) => ITEMS[id])
      .map(([id, qty]) => `
        <span class="ing-pill ok" style="font-size:13px;padding:5px 11px">
          <img src="${sprites.getIconUrl(id)}" style="width:22px;height:22px" alt="" />+${qty} ${ITEMS[id].name}
        </span>`).join('');
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:10px;background:#FFFBF0">
        <div style="width:52px;height:52px">${sprites.getUiIcon('mail')}</div>
        <div style="font-size:16px;font-weight:800">Von ${this._esc(parcel.from)}</div>
        <div style="font-size:14px;font-style:italic;color:var(--ink);background:#FFF;padding:10px 14px;border-radius:12px;border:1.5px solid var(--parchment-border);width:100%">"${this._esc(parcel.note)}"</div>
        <div class="ing-row" style="justify-content:center">${itemsHtml}</div>
        <button id="btn-gift-yay" class="btn-green" style="margin-top:6px;padding:10px 24px">In den Vorrat</button>
      </div>`;
    bodyEl.querySelector('#btn-gift-yay').addEventListener('click', () => this.closeModal());
  }

  _renderDailyChestModal(titleEl, bodyEl, reward) {
    titleEl.textContent = 'Tägliche Schatztruhe';
    const itemsHtml = Object.entries(reward.items).map(([id, qty]) => `
      <span class="ing-pill ok" style="font-size:13px;padding:5px 11px">
        <img src="${sprites.getIconUrl(id)}" style="width:22px;height:22px" alt="" />+${qty} ${ITEMS[id].name}
      </span>`).join('');
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:10px;background:#FFFBF0">
        <img src="${sprites.getIconUrl('treasure_chest')}" alt="Schatztruhe" style="width:76px;height:72px;object-fit:contain" />
        <div style="font-size:16px;font-weight:800;color:var(--oak-dark)">Serie: Tag ${reward.streak}</div>
        <div style="font-size:14.5px;font-weight:800;color:var(--brass-deep)">+${reward.coins} Münzen · +${reward.xp} XP</div>
        <div class="ing-row" style="justify-content:center">${itemsHtml}</div>
        <button id="btn-chest-ok" class="btn-green" style="margin-top:6px;padding:10px 24px">Einsammeln</button>
      </div>`;
    bodyEl.querySelector('#btn-chest-ok').addEventListener('click', () => this.closeModal());
  }

  _renderVillagerOfferModal(titleEl, bodyEl, villagerId) {
    const v = this.world.villagers.find((x) => x.id === villagerId);
    if (!v || !v.offer) { this.closeModal(); return; }
    const it = ITEMS[v.offer.itemId];
    const have = this.state.inventory[v.offer.itemId] || 0;
    const canSell = have >= v.offer.qty;
    titleEl.textContent = `Angebot: ${v.name}`;
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:12px;background:#FFFBF0">
        <div class="npc-avatar" style="background:${v.coat};width:52px;height:52px;font-size:18px">${getInitials(v.name)}</div>
        <div style="font-size:14px;font-weight:700;color:var(--ink)">"Hallo! Ich würde dir gern <b>${v.offer.qty}x ${it.name}</b> abkaufen."</div>
        <div class="ing-row" style="justify-content:center">
          <span class="ing-pill ${canSell ? 'ok' : 'missing'}" style="font-size:13.5px;padding:5px 12px">
            <img src="${sprites.getIconUrl(it.id)}" style="width:22px;height:22px" alt="" />${have}/${v.offer.qty} ${it.name}
          </span>
        </div>
        <div style="font-size:15px;font-weight:800;color:var(--brass-deep)">Angebot: +${v.offer.price} Münzen · +${v.offer.xp} XP</div>
        <div style="display:flex;gap:10px;width:100%">
          <button id="btn-offer-decline" class="btn-wood" style="flex:1">Ablehnen</button>
          <button id="btn-offer-accept" class="btn-green" style="flex:1" ${canSell ? '' : 'disabled'}>Verkaufen (+${v.offer.price})</button>
        </div>
      </div>`;
    bodyEl.querySelector('#btn-offer-accept').addEventListener('click', () => this.acceptVillagerOffer(villagerId));
    bodyEl.querySelector('#btn-offer-decline').addEventListener('click', () => this.declineVillagerOffer(villagerId));
  }

  _renderVillageModal(titleEl, tabsEl, bodyEl, tab) {
    const info = getLevelInfo(this.state.xp);
    titleEl.textContent = this.state.villageName;
    tabsEl.style.display = 'flex';
    tabsEl.innerHTML = `
      <button class="tab-btn ${tab === 'overview' ? 'active' : ''}" data-tab="overview">Übersicht</button>
      <button class="tab-btn ${tab === 'album' ? 'active' : ''}" data-tab="album">Sammelbuch</button>
      <button class="tab-btn ${tab === 'animals' ? 'active' : ''}" data-tab="animals">Tiere</button>
    `;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) =>
      b.addEventListener('click', () => { audio.playTap(); this.ui.activeModal.tab = b.dataset.tab; this.renderActiveModal(); })
    );

    if (tab === 'overview') {
      const chestReady = this.isDailyChestReady();
      bodyEl.innerHTML = `
        <div class="cozy-card" style="flex-direction:column;align-items:stretch;gap:5px">
          <div class="card-title">Level ${info.level} · Weihnachtsbaum-Stufe ${info.treeStage}/3</div>
          <div class="card-sub">${info.next ? `Noch ${info.next.xpNeeded - this.state.xp} XP bis Level ${info.next.level}: ${info.next.unlockText}` : 'Dein Weihnachtsbaum erstrahlt in voller Pracht.'}</div>
        </div>
        ${chestReady ? `
          <div class="cozy-card" style="border-color:var(--brass);background:#FFFBF0;justify-content:space-between">
            <div class="card-info">
              <div class="card-title">Tägliche Schatztruhe am Teichsteg</div>
              <div class="card-sub">Serie: ${this.state.dailyStreak || 0} Tage · Münzen &amp; Vorräte</div>
            </div>
            <button id="btn-claim-chest-modal" class="btn-gold">Öffnen</button>
          </div>` : ''}
        <div>
          <label style="font-size:12px;font-weight:800;display:block;margin-bottom:4px">Hofname:</label>
          <div style="display:flex;gap:8px">
            <input id="inp-village-name" class="cozy-input" maxlength="24" value="${this._esc(this.state.villageName)}" />
            <button id="btn-save-vname" class="btn-green">Speichern</button>
          </div>
        </div>`;
      bodyEl.querySelector('#btn-claim-chest-modal')?.addEventListener('click', () => this.claimDailyChest());
      bodyEl.querySelector('#btn-save-vname').addEventListener('click', () => {
        const val = bodyEl.querySelector('#inp-village-name').value.trim();
        if (val && this.act({ type: 'rename', villageName: val }).ok) {
          this.updateHUD();
          this.showToast(`Hofname gespeichert: "${this.core.villageName}".`);
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
                <div style="font-weight:800;font-size:11.5px;line-height:1.15">${found ? it.name : 'Unentdeckt'}</div>
                <div style="font-size:10px;color:var(--ink-muted)">${found ? `${it.sellPrice} · ${sourceLabel}` : `Ab Lv.${it.unlockLevel}`}</div>
              </div>`;
          }).join('')}
        </div>`;

      const crops = allItems.filter((i) => i.category === 'crop');
      const animalProds = allItems.filter((i) => i.category === 'animal');
      const treats = allItems.filter((i) => i.category === 'crafted');

      const secretsHtml = `
        <div class="album-section-title">Meilensteine (${discSecretsCount}/${ALBUM_SECRETS.length})</div>
        ${ALBUM_SECRETS.map((sc) => {
          const ok = sc.check(this.state);
          return `
            <div class="cozy-card" style="${ok ? 'border-color:var(--pine);background:#F4FFF7' : 'opacity:0.7'}">
              <div class="card-thumb" style="font-weight:900;font-size:14px;color:${ok ? 'var(--pine)' : 'var(--ink-muted)'}">${ok ? sprites.getUiIcon('check') : '?'}</div>
              <div class="card-info">
                <div class="card-title">${ok ? sc.title : 'Noch verborgen'}</div>
                <div class="card-sub">${sc.desc}</div>
              </div>
            </div>`;
        }).join('')}`;

      bodyEl.innerHTML = `
        <div class="barn-cap-card">
          <div class="barn-cap-top">
            <div class="card-title">Rezept- &amp; Sammelbuch</div>
            <div style="font-weight:800;font-size:12.5px;color:var(--brass-deep)">${foundAll} / ${totalAll} (${pct}%)</div>
          </div>
          <div class="barn-cap-track"><div class="barn-cap-fill" style="width:${pct}%"></div></div>
        </div>
        ${renderGroup('Winterpflanzen', crops)}
        ${renderGroup('Tierprodukte', animalProds)}
        ${renderGroup('Backstube, Café, Patisserie & Werkstatt', treats)}
        ${secretsHtml}`;
    } else {
      bodyEl.innerHTML = this.state.animals.map((an) => {
        const def = ANIMALS[an.type];
        return `
          <div class="cozy-card">
            <div class="card-thumb"><img src="${sprites.getIconUrl(def.sprite)}" alt="" /></div>
            <div class="card-info">
              <div style="font-size:11px;font-weight:700;color:var(--ink-muted)">${def.name}</div>
              <input class="cozy-input" style="padding:6px 10px;margin-top:3px" maxlength="18" value="${this._esc(an.nick || def.defaultNick)}" data-an-nick="${an.id}" />
            </div>
            <button class="btn-green" data-save-nick="${an.id}">OK</button>
          </div>`;
      }).join('');
      bodyEl.querySelectorAll('[data-save-nick]').forEach((b) =>
        b.addEventListener('click', () => {
          const id = b.dataset.saveNick;
          const inp = bodyEl.querySelector(`[data-an-nick="${id}"]`);
          if (inp && this.act({ type: 'renameAnimal', animalId: id, nick: inp.value }).ok) {
            audio.playPet(1.1);
            this.showToast(`Name gespeichert: "${this.state.animals.find((x) => x.id === id)?.nick}".`);
          }
        })
      );
    }
  }

  _renderSettingsModal(titleEl, bodyEl) {
    titleEl.textContent = 'Einstellungen';
    bodyEl.innerHTML = `
      <div class="cozy-card" style="justify-content:space-between">
        <div>
          <div class="card-title">Soundeffekte</div>
          <div class="card-sub">Ernte-Klänge, Glöckchen und Ofen-Signale</div>
        </div>
        <button id="tog-sfx" class="${this.state.settings.sfx ? 'btn-green' : 'btn-wood'}">${this.state.settings.sfx ? 'An' : 'Aus'}</button>
      </div>
      <div class="cozy-card" style="justify-content:space-between">
        <div>
          <div class="card-title">Winter-Spieluhr</div>
          <div class="card-sub">Sanfte Hintergrundmelodie</div>
        </div>
        <button id="tog-music" class="${this.state.settings.music ? 'btn-green' : 'btn-wood'}">${this.state.settings.music ? 'An' : 'Aus'}</button>
      </div>
      <div class="cozy-card" style="flex-direction:column;align-items:stretch;gap:8px">
        <div class="card-title">Spielstand sichern</div>
        <div class="card-sub">Backup-Code kopieren oder auf einem anderen Gerät laden:</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="btn-export-save" class="btn-green" style="flex:1">Backup kopieren</button>
          <button id="btn-import-save" class="btn-wood" style="flex:1">Backup laden</button>
        </div>
        <button id="btn-reset-save" class="btn-red" style="margin-top:4px">Neuen Hof starten</button>
      </div>`;

    bodyEl.querySelector('#tog-sfx').addEventListener('click', () => {
      this.act({ type: 'setSetting', key: 'sfx', value: !this.core.settings.sfx });
      audio.setSfx(this.core.settings.sfx);
      if (this.core.settings.sfx) audio.playTap();
      this.renderActiveModal();
    });
    bodyEl.querySelector('#tog-music').addEventListener('click', () => {
      this.act({ type: 'setSetting', key: 'music', value: !this.core.settings.music });
      audio.setMusic(this.core.settings.music);
      this.renderActiveModal();
    });
    bodyEl.querySelector('#btn-export-save').addEventListener('click', () => {
      const b64 = btoa(unescape(encodeURIComponent(serialize(this.core))));
      navigator.clipboard?.writeText(b64).then(() => this.showToast('Spielstand-Backup kopiert.'));
    });
    bodyEl.querySelector('#btn-import-save').addEventListener('click', () => {
      const raw = prompt('Backup-Code einfügen:');
      if (!raw) return;
      try {
        // Prüfen und (bei Altformat) umwandeln, bevor irgendetwas überschrieben wird
        const report = deserialize(decodeURIComponent(escape(atob(raw.trim()))), Date.now());
        this.session.saveNow(); // aktueller Stand wird zur Sicherungskopie
        this._saveBlocked = true;
        localStorage.setItem(SAVE_KEY, serialize(report.state));
        location.reload();
      } catch {
        this.showToast('Backup-Code konnte nicht gelesen werden.');
      }
    });
    bodyEl.querySelector('#btn-reset-save').addEventListener('click', () => {
      if (confirm('Wirklich einen neuen Winterhof starten?')) {
        this.session.saveNow(); // alter Hof bleibt als Sicherungskopie
        this._saveBlocked = true;
        const now = Date.now();
        localStorage.setItem(SAVE_KEY, serialize(createNewGame(now, (now ^ 0x9e3779b9) | 0)));
        location.reload();
      }
    });
  }

  _renderLevelUpModal(titleEl, bodyEl, lvlInfo) {
    titleEl.textContent = `Level ${lvlInfo.level} erreicht`;
    bodyEl.innerHTML = `
      <div class="cozy-card" style="flex-direction:column;text-align:center;padding:18px;gap:10px;background:#FFFBF0">
        <div style="width:52px;height:52px">${sprites.getUiIcon('star')}</div>
        <div style="font-size:17px;font-weight:900">Dein Winterhof wächst</div>
        <div style="font-size:13.5px;font-weight:600;color:var(--ink)">${lvlInfo.unlockText}</div>
        ${lvlInfo.coinBonus > 0 ? `<div style="font-size:15px;font-weight:800;color:var(--brass-deep)">Bonus: +${lvlInfo.coinBonus} Münzen</div>` : ''}
        <button id="btn-lvl-ok" class="btn-green" style="padding:10px 26px;font-size:14px">Weiter</button>
      </div>`;
    bodyEl.querySelector('#btn-lvl-ok').addEventListener('click', () => this.closeModal());
  }

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
}

const game = new WinterhofGame();
game.start();
