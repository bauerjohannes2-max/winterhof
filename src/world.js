// ============================================================================
// WINTERHOF — AAA Alpine Christmas Isometric World Engine
// Infinite Snow Valley · Grid-Aligned Cobblestone Roads · Realistic Proportions
// Grounded Motion Discipline · Zero Emojis
// ============================================================================

import { GRID_SIZE, LAND_ZONES, ITEMS, ANIMALS, STATIONS, DECORATIONS, NPCS, getLevelInfo, getStationMastery } from './gameData.js';
import { sprites } from './sprites.js';

export const TILE_W = 116;
export const TILE_H = 58;

export function gridToWorld(gx, gy) {
  return {
    x: (gx - gy) * (TILE_W * 0.5),
    y: (gx + gy) * (TILE_H * 0.5)
  };
}

export function worldToGrid(wx, wy) {
  const halfW = TILE_W * 0.5;
  const halfH = TILE_H * 0.5;
  const gx = (wx / halfW + wy / halfH) * 0.5;
  const gy = (wy / halfH - wx / halfW) * 0.5;
  return { gx, gy };
}

const VILLAGER_QUOTES = [
  'Es duftet nach frischem Gebäck.',
  'Wunderbarer Wintertag im Tal.',
  'Ein warmer Punsch wäre fein.',
  'So ordentlich und friedlich hier.',
  'Die Laternen leuchten wunderschön.'
];

// Clean waypoints strictly along the main cobblestone village road (gy = 5.5)
const ROAD_WAYPOINTS = [
  { gx: 2.2, gy: 5.5 },
  { gx: 5.5, gy: 5.5 },
  { gx: 7.5, gy: 5.5 },
  { gx: 10.5, gy: 5.5 },
  { gx: 13.5, gy: 5.5 },
  { gx: 6.0, gy: 4.5 },
  { gx: 4.0, gy: 6.5 }
];

// Chest sits calmly by the lakeside jetty instead of cluttering the front yard
export const DAILY_CHEST_POS = { gx: 11.4, gy: 12.6 };

export class WinterWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = 0;
    this.height = 0;

    // Centered on the composed farmstead heart (Chalet, Tree, Road, Fields, Bakery)
    const center = gridToWorld(7.2, 6.2);
    this.cam = {
      x: center.x,
      y: center.y - 10,
      zoom: 0.88,
      targetZoom: null,
      vx: 0,
      vy: 0
    };

    // Atmosphere (Pure Alpine Winter: Day / Golden Dusk / Cozy Starlight Night)
    this.lightingMode = 'auto';
    this.autoClock = 0.08;
    this.eveningFactor = 0;

    // Ambient particles & visual effects
    this.flakes = [];
    this.nightStars = [];
    this.smoke = [];
    this.sparkles = [];
    this.floaters = [];
    this.flyingHudItems = [];
    this.swipeTrail = [];

    // Living entities
    this.animalMotion = new Map();
    this.villagers = this._initVillagers();

    // Animated events
    this.sleighAnim = null;
    this.giftParachute = null;
    this.bounceMap = new Map();

    // Scenic valley environment (fills entire horizon seamlessly!)
    this.valleyHills = this._generateValleyHills();
    this.valleyBoulders = this._generateValleyBoulders();
    this.borderTrees = this._generateBorderForest();
    this.roadPavers = this._generateRoadPavers();

    this._initWeather();
    this.resize();
  }

  _initVillagers() {
    const picked = NPCS.slice(0, 3);
    const startWps = [0, 3, 5];
    return picked.map((npc, i) => {
      const start = ROAD_WAYPOINTS[startWps[i]];
      const next = ROAD_WAYPOINTS[(startWps[i] + 1) % ROAD_WAYPOINTS.length];
      return {
        id: 'v_' + npc.id,
        npcId: npc.id,
        name: npc.name,
        coat: npc.coat,
        scarf: npc.scarf,
        hat: npc.hat,
        hair: npc.hair,
        skin: npc.skin,
        gx: start.gx,
        gy: start.gy,
        tx: next.gx,
        ty: next.gy,
        facing: 1,
        pause: 2.0 + i * 2.2,
        quote: '',
        quoteTimer: 0,
        lastTipAt: 0,
        offer: null
      };
    });
  }

  _generateValleyHills() {
    const hills = [];
    let seed = 2026;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 65; i++) {
      const gx = -10 + rand() * 36;
      const gy = -10 + rand() * 36;
      const p = gridToWorld(gx, gy);
      hills.push({
        x: p.x,
        y: p.y,
        rx: 95 + rand() * 190,
        ry: 42 + rand() * 82,
        shade: rand() < 0.5 ? 'light' : 'cool',
        alpha: 0.14 + rand() * 0.18
      });
    }
    return hills;
  }

  _generateValleyBoulders() {
    const boulders = [];
    let seed = 8811;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 32; i++) {
      const gx = -4 + rand() * 24;
      const gy = -4 + rand() * 24;
      if (gx >= 1 && gx <= 15 && gy >= 1 && gy <= 15) continue;
      if (Math.abs(gy - 5.5) < 1.35) continue; // keep main valley road clear
      boulders.push({ gx, gy, r: 10 + rand() * 13 });
    }
    return boulders;
  }

  _generateBorderForest() {
    const trees = [];
    let seed = 1337;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let gx = -8; gx <= GRID_SIZE + 7; gx++) {
      for (let gy = -8; gy <= GRID_SIZE + 7; gy++) {
        // Leave inner farmstead completely open
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) continue;
        // Leave wide corridor for main valley road (gy = 5.5)
        if (Math.abs(gy - 5.5) < 1.4) continue;
        // Leave alpine lake & brook clearing open
        if (gx >= 9 && gx <= 21 && gy >= 13 && gy <= 19) continue;
        const distOut = Math.max(
          gx < 0 ? -gx : gx >= GRID_SIZE ? gx - GRID_SIZE + 1 : 0,
          gy < 0 ? -gy : gy >= GRID_SIZE ? gy - GRID_SIZE + 1 : 0
        );
        const density = distOut <= 2 ? 0.78 : distOut <= 5 ? 0.62 : 0.44;
        if (rand() < density) {
          trees.push({
            gx: gx + (rand() - 0.5) * 0.55,
            gy: gy + (rand() - 0.5) * 0.55,
            scale: 0.86 + rand() * 0.42,
            phase: rand() * Math.PI * 2
          });
        }
      }
    }
    return trees;
  }

  _generateRoadPavers() {
    const pavers = [];
    // Main horizon-to-horizon village road pavers strictly aligned along gy = 5.5
    for (let gx = -10; gx <= 26; gx += 0.58) {
      pavers.push({ gx, gy: 5.5, off: (Math.round(gx * 2) % 2 === 0 ? -1 : 1) * 6, tone: Math.round(gx * 3) % 3 });
    }
    // Chalet front stone path (gy = 4.2..5.2 at gx = 6.0)
    for (let gy = 4.3; gy <= 5.2; gy += 0.45) {
      pavers.push({ gx: 6.0, gy, off: 0, tone: 0 });
    }
    // Bakery entrance stone apron (gy = 5.8..6.8 at gx = 4.0)
    for (let gy = 5.85; gy <= 6.8; gy += 0.45) {
      pavers.push({ gx: 4.0, gy, off: 0, tone: 1 });
    }
    return pavers;
  }

  _initWeather() {
    this.flakes = [];
    for (let i = 0; i < 48; i++) {
      this.flakes.push({
        x: Math.random() * 1400,
        y: Math.random() * 900,
        r: 1.3 + Math.random() * 2.2,
        vy: 14 + Math.random() * 22,
        vx: -6 + Math.random() * 12,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.45
      });
    }
    this.nightStars = [];
    for (let i = 0; i < 34; i++) {
      this.nightStars.push({
        rx: Math.random(),
        ry: Math.random() * 0.3,
        r: 0.9 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    if (!this._initializedZoom) {
      this._initializedZoom = true;
      const isPortrait = this.height > this.width;
      const comfort = isPortrait
        ? (this.width < 430 ? 0.68 : 0.78)
        : (this.height < 460 ? 0.7 : 0.9);
      this.cam.zoom = comfort * 0.92;
      this.cam.targetZoom = comfort;
    }
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.width * 0.5) / this.cam.zoom + this.cam.x,
      y: (sy - this.height * 0.5) / this.cam.zoom + this.cam.y
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.cam.x) * this.cam.zoom + this.width * 0.5,
      y: (wy - this.cam.y) * this.cam.zoom + this.height * 0.5
    };
  }

  clampCamera() {
    const c = gridToWorld(GRID_SIZE * 0.5, GRID_SIZE * 0.5);
    if (!Number.isFinite(this.cam.x)) this.cam.x = c.x;
    if (!Number.isFinite(this.cam.y)) this.cam.y = c.y;
    if (!Number.isFinite(this.cam.zoom)) this.cam.zoom = 0.88;
    if (!Number.isFinite(this.cam.vx)) this.cam.vx = 0;
    if (!Number.isFinite(this.cam.vy)) this.cam.vy = 0;
    this.cam.x = Math.max(c.x - 560, Math.min(c.x + 560, this.cam.x));
    this.cam.y = Math.max(c.y - 380, Math.min(c.y + 380, this.cam.y));
    this.cam.zoom = Math.max(0.52, Math.min(1.55, this.cam.zoom));
  }

  triggerBounce(entityId) {
    this.bounceMap.set(entityId, performance.now());
  }

  spawnBurst(wx, wy, color = '#FDE047', count = 10, shape = 'star') {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const sp = 28 + Math.random() * 68;
      this.sparkles.push({
        x: wx,
        y: wy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 36,
        size: 3.5 + Math.random() * 3.8,
        color,
        shape,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.32
      });
    }
  }

  spawnFloater(wx, wy, text, iconId = null, color = '#FFFFFF') {
    this.floaters.push({ x: wx, y: wy, text, iconId, color, life: 0, maxLife: 1.3 });
  }

  spawnFlyingHudItem(wx, wy, iconId, target = 'barn', onLand = null) {
    const start = this.worldToScreen(wx, wy);
    const elId = target === 'coins' ? 'btn-coins' : target === 'level' ? 'btn-village' : 'dock-barn';
    const el = document.getElementById(elId);
    const rect = el ? el.getBoundingClientRect() : { left: this.width * 0.5, top: 40, width: 40, height: 40 };
    const tx = rect.left + rect.width * 0.5;
    const ty = rect.top + rect.height * 0.5;
    this.flyingHudItems.push({
      sx: start.x,
      sy: start.y,
      cx: (start.x + tx) * 0.5 + (Math.random() - 0.5) * 70,
      cy: Math.min(start.y, ty) - 65,
      tx,
      ty,
      iconId,
      elId,
      t: 0,
      duration: 0.58 + Math.random() * 0.14,
      onLand
    });
  }

  addSwipePoint(sx, sy, mode = 'harvest') {
    this.swipeTrail.push({ x: sx, y: sy, mode, life: 0, maxLife: 0.28 });
  }

  launchSleigh(state) {
    const start = gridToWorld(state.sleighPos.gx, state.sleighPos.gy);
    this.sleighAnim = { active: true, progress: 0, startX: start.x, startY: start.y };
  }

  launchGiftParachute(from, onDone) {
    this.giftParachute = { progress: 0, from, onDone };
  }

  hitTestVillager(wx, wy) {
    for (const v of this.villagers) {
      const p = gridToWorld(v.gx, v.gy);
      const topPad = v.offer ? 78 : 48;
      if (Math.abs(wx - p.x) < 28 && wy > p.y - topPad && wy < p.y + 12) return v;
    }
    return null;
  }

  hitTestDailyChest(wx, wy, chestReady) {
    if (!chestReady) return false;
    const p = gridToWorld(DAILY_CHEST_POS.gx, DAILY_CHEST_POS.gy);
    return Math.abs(wx - p.x) < 38 && wy > p.y - 72 && wy < p.y + 18;
  }

  getAnimalMotion(an) {
    let m = this.animalMotion.get(an.id);
    if (!m) {
      m = { ox: 0, oy: 0, tx: 0, ty: 0, wait: 1.5 + Math.random() * 2.5, flip: false, walkPhase: 0 };
      this.animalMotion.set(an.id, m);
    }
    return m;
  }

  update(dt, state) {
    // Smooth intro camera settle
    if (this.cam.targetZoom !== null) {
      this.cam.zoom += (this.cam.targetZoom - this.cam.zoom) * Math.min(1, dt * 3.2);
      if (Math.abs(this.cam.zoom - this.cam.targetZoom) < 0.003) {
        this.cam.zoom = this.cam.targetZoom;
        this.cam.targetZoom = null;
      }
    }

    // Smooth camera inertia
    if (Math.abs(this.cam.vx) > 0.5 || Math.abs(this.cam.vy) > 0.5) {
      this.cam.x += this.cam.vx * dt;
      this.cam.y += this.cam.vy * dt;
      const damp = Math.pow(0.035, dt);
      this.cam.vx *= damp;
      this.cam.vy *= damp;
      this.clampCamera();
    }

    // Lighting progression
    if (this.lightingMode === 'auto') {
      this.autoClock = (this.autoClock + dt / 280) % 1;
      const wave = 0.5 - 0.5 * Math.cos(this.autoClock * Math.PI * 2);
      this.eveningFactor += (wave - this.eveningFactor) * Math.min(1, dt * 2.2);
    } else {
      const target = this.lightingMode === 'day' ? 0 : this.lightingMode === 'dusk' ? 0.52 : 1;
      this.eveningFactor += (target - this.eveningFactor) * Math.min(1, dt * 3.2);
    }

    // Calm natural animal movement inside their fenced pens
    const sleeping = this.eveningFactor > 0.72;
    for (const an of state.animals) {
      const m = this.getAnimalMotion(an);
      if (sleeping && an.state !== 'ready') {
        m.walkPhase = 0;
        continue;
      }
      const dx = m.tx - m.ox;
      const dy = m.ty - m.oy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.025) {
        const speed = an.type === 'chicken' ? 0.16 : 0.2;
        const step = Math.min(dist, speed * dt);
        m.ox += (dx / dist) * step;
        m.oy += (dy / dist) * step;
        m.flip = (dx - dy) < 0;
        m.walkPhase += dt * 7;
      } else {
        m.walkPhase = 0;
        m.wait -= dt;
        if (m.wait <= 0) {
          m.tx = (Math.random() - 0.5) * 0.34;
          m.ty = (Math.random() - 0.5) * 0.34;
          m.wait = 2.6 + Math.random() * 3.8;
        }
      }
    }

    // Calm strolling villagers strictly along cobblestone roads
    for (const v of this.villagers) {
      if (v.quoteTimer > 0) v.quoteTimer -= dt;
      if (v.pause > 0) {
        v.pause -= dt;
        continue;
      }
      const dx = v.tx - v.gx;
      const dy = v.ty - v.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.06) {
        const step = Math.min(dist, 0.42 * dt);
        v.gx += (dx / dist) * step;
        v.gy += (dy / dist) * step;
        v.facing = (dx - dy) >= 0 ? 1 : -1;
      } else {
        const pick = ROAD_WAYPOINTS[Math.floor(Math.random() * ROAD_WAYPOINTS.length)];
        v.tx = pick.gx;
        v.ty = pick.gy;
        v.pause = 3.2 + Math.random() * 4.5;
        if (!v.offer && Math.random() < 0.32) {
          v.quote = VILLAGER_QUOTES[Math.floor(Math.random() * VILLAGER_QUOTES.length)];
          v.quoteTimer = 3.0;
        }
      }
    }

    // Soft winter snowfall
    for (const sf of this.flakes) {
      sf.phase += dt * 1.2;
      sf.y += sf.vy * dt;
      sf.x += (sf.vx + Math.sin(sf.phase) * 9) * dt;
      if (sf.y > this.height + 12) { sf.y = -12; sf.x = Math.random() * this.width; }
      if (sf.x < -12) sf.x = this.width + 12;
      if (sf.x > this.width + 12) sf.x = -12;
    }

    // Subtle cozy chimney smoke curls
    if (Math.random() < dt * 3.4) {
      const pChalet = gridToWorld(state.chalet.gx + 0.5, state.chalet.gy + 0.5);
      this._emitSmoke(pChalet.x + 26, pChalet.y - 116);
    }
    for (const st of state.stations) {
      if (!st.built || st.wrapped) continue;
      const busy = st.queue.length > 0;
      if (Math.random() < dt * (busy ? 5.2 : 1.1)) {
        const def = STATIONS[st.type];
        const p = gridToWorld(st.gx + 0.5, st.gy + 0.5);
        const col = busy ? '#FFF7E8' : '#EBF5FF';
        this._emitSmoke(p.x + def.chimneyOffset.x * 145, p.y + def.chimneyOffset.y * 140, col);
      }
    }

    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 7.5;
      if (s.life >= s.maxLife) this.smoke.splice(i, 1);
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.life += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 120 * dt;
      if (sp.life >= sp.maxLife) this.sparkles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const fl = this.floaters[i];
      fl.life += dt; fl.y -= 30 * dt;
      if (fl.life >= fl.maxLife) this.floaters.splice(i, 1);
    }
    for (let i = this.swipeTrail.length - 1; i >= 0; i--) {
      this.swipeTrail[i].life += dt;
      if (this.swipeTrail[i].life >= this.swipeTrail[i].maxLife) this.swipeTrail.splice(i, 1);
    }
    for (let i = this.flyingHudItems.length - 1; i >= 0; i--) {
      const fh = this.flyingHudItems[i];
      fh.t += dt / fh.duration;
      if (fh.t >= 1) {
        const el = document.getElementById(fh.elId);
        if (el) {
          el.classList.remove('hud-pop');
          void el.offsetWidth;
          el.classList.add('hud-pop');
        }
        if (fh.onLand) fh.onLand();
        this.flyingHudItems.splice(i, 1);
      }
    }

    // Flying Sleigh
    if (this.sleighAnim && this.sleighAnim.active) {
      this.sleighAnim.progress += dt * 0.28;
      if (Math.random() < dt * 20) {
        const pos = this._getSleighFlyingPos();
        this.sparkles.push({
          x: pos.x - 40 + (Math.random() - 0.5) * 20,
          y: pos.y + 8 + (Math.random() - 0.5) * 14,
          vx: -24 + Math.random() * 16,
          vy: 12 + Math.random() * 16,
          size: 3 + Math.random() * 3.5,
          color: Math.random() < 0.5 ? '#FEF08A' : '#FFFFFF',
          shape: 'star',
          life: 0,
          maxLife: 0.65
        });
      }
      if (this.sleighAnim.progress >= 1) this.sleighAnim = null;
    }

    // Winter Post Delivery
    if (this.giftParachute) {
      this.giftParachute.progress += dt * 0.42;
      if (this.giftParachute.progress >= 1) {
        const cb = this.giftParachute.onDone;
        this.giftParachute = null;
        if (cb) cb();
      }
    }
  }

  _emitSmoke(x, y, color = '#FFFFFF') {
    this.smoke.push({
      x: x + (Math.random() - 0.5) * 4,
      y,
      vx: 8 + Math.random() * 10,
      vy: -22 - Math.random() * 10,
      r: 4 + Math.random() * 3,
      color,
      life: 0,
      maxLife: 1.6 + Math.random() * 0.6
    });
  }

  _getSleighFlyingPos() {
    const a = this.sleighAnim;
    const t = a.progress;
    const arc = Math.sin(t * Math.PI);
    return {
      x: a.startX + Math.sin(t * Math.PI * 2) * 320 + arc * 160,
      y: a.startY - arc * 260 - Math.sin(t * Math.PI * 2) * 32,
      scale: 1 + arc * 0.2,
      tilt: Math.cos(t * Math.PI) * -0.14
    };
  }

  // Subtle, crisp tap feedback (NO jelly bouncing!)
  _getBounceScale(id, now) {
    const t0 = this.bounceMap.get(id);
    if (!t0) return { sx: 1, sy: 1 };
    const elapsed = (now - t0) / 1000;
    if (elapsed > 0.2) { this.bounceMap.delete(id); return { sx: 1, sy: 1 }; }
    const wave = Math.sin(elapsed * Math.PI * 5) * Math.exp(-elapsed * 12);
    return { sx: 1 + wave * 0.045, sy: 1 - wave * 0.045 };
  }

  _mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  render(state, uiState) {
    const ctx = this.ctx;
    const now = performance.now();
    const sec = now * 0.001;
    const ev = this.eveningFactor;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Infinite Alpine Snow Ground Backdrop (Zero floating edges!)
    this._drawBackdrop(ctx, ev, sec);

    // 2. Camera Transform
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.5);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);

    // 3. Layered Alpine Valley Terrain, Roads, Frozen Brook, Fences
    this._drawTerrain(ctx, state, uiState, sec, ev);

    // 4. Depth-Sorted 2.5D World Entities
    const drawList = this._buildDrawList(state, uiState, now, sec, ev);
    drawList.sort((a, b) => a.depth - b.depth);

    const glowSpots = [];
    for (const item of drawList) item.draw(ctx, glowSpots);

    // 5. Ghosted Placement Preview
    if ((uiState.mode === 'place' || uiState.mode === 'move') && uiState.previewTile) {
      this._drawGhostPreview(ctx, state, uiState);
    }

    // 6. Chimney Smoke
    for (const s of this.smoke) {
      const p = s.life / s.maxLife;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = (1 - p) * 0.36;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 7. Flying Sleigh
    if (this.sleighAnim && this.sleighAnim.active) {
      const pos = this._getSleighFlyingPos();
      const spr = sprites.get('reindeer_sleigh');
      if (spr) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.tilt);
        ctx.scale(pos.scale, pos.scale);
        ctx.drawImage(spr, -88, -78, 176, 156);
        ctx.restore();
      }
    }

    // 8. Warm Evening Lantern & Window Glows
    if (ev > 0.08) this._drawWarmLights(ctx, glowSpots, ev, sec);

    // 9. Sparkles & Hearts
    for (const sp of this.sparkles) {
      const alpha = 1 - sp.life / sp.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sp.x, sp.y);
      ctx.fillStyle = sp.color;
      if (sp.shape === 'heart') this._drawHeart(ctx, 0, 0, sp.size * 1.3);
      else this._drawStar(ctx, 0, 0, sp.size);
      ctx.restore();
    }

    // 10. Crisp Floating Feedback Popups
    for (const fl of this.floaters) {
      const p = fl.life / fl.maxLife;
      const alpha = p < 0.72 ? 1 : (1 - p) / 0.28;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 14px Inter, "Segoe UI", system-ui, sans-serif';
      const iconImg = fl.iconId ? sprites.getIconImg(fl.iconId) : null;
      const tw = ctx.measureText(fl.text).width;
      const pillW = tw + 22 + (iconImg ? 22 : 0);
      const pillH = 26;
      ctx.fillStyle = 'rgba(34, 18, 9, 0.86)';
      this._roundRect(ctx, fl.x - pillW * 0.5, fl.y - pillH * 0.5, pillW, pillH, 13);
      ctx.fill();
      ctx.strokeStyle = 'rgba(228, 182, 98, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      let tx = fl.x - pillW * 0.5 + 11;
      if (iconImg) { ctx.drawImage(iconImg, tx - 2, fl.y - 10, 20, 20); tx += 22; }
      ctx.fillStyle = fl.color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(fl.text, tx, fl.y + 0.5);
      ctx.restore();
    }

    ctx.restore(); // end camera transform

    // 11. Screen-Space Evening Mood Tint
    if (ev > 0.05) this._drawEveningOverlay(ctx, ev);

    // 12. Gentle Snowfall
    ctx.save();
    for (const sf of this.flakes) {
      ctx.globalAlpha = sf.alpha * (0.7 + ev * 0.3);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 13. Flying HUD Item & Coin Arcs
    for (const fh of this.flyingHudItems) {
      const u = 1 - fh.t;
      const x = u * u * fh.sx + 2 * u * fh.t * fh.cx + fh.t * fh.t * fh.tx;
      const y = u * u * fh.sy + 2 * u * fh.t * fh.cy + fh.t * fh.t * fh.ty;
      const scale = 1.05 - fh.t * 0.35;
      const img = sprites.getIconImg(fh.iconId);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = 'rgba(255, 251, 235, 0.92)';
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (img) ctx.drawImage(img, -12, -12, 24, 24);
      ctx.restore();
    }

    // 14. Winter Post Delivery
    if (this.giftParachute) this._drawParachuteGift(ctx, this.giftParachute.progress);

    // 15. Clean Swipe Trail
    if (this.swipeTrail.length > 1) this._drawSwipeTrail(ctx);

    ctx.restore();
  }

  _drawBackdrop(ctx, ev, sec) {
    // Seamless snow-valley base color matching the outer alpine terrain (zero floating edge!)
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, `rgb(${this._mix(208, 22, ev)},${this._mix(226, 40, ev)},${this._mix(242, 78, ev)})`);
    grad.addColorStop(0.5, `rgb(${this._mix(222, 28, ev)},${this._mix(236, 48, ev)},${this._mix(248, 88, ev)})`);
    grad.addColorStop(1, `rgb(${this._mix(210, 20, ev)},${this._mix(227, 36, ev)},${this._mix(241, 70, ev)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle Aurora Borealis at night across the very top edge
    if (ev > 0.5) {
      const aAlpha = ((ev - 0.5) / 0.5) * 0.22;
      ctx.save();
      ctx.globalAlpha = aAlpha;
      const aur = ctx.createLinearGradient(0, 0, this.width, this.height * 0.25);
      aur.addColorStop(0, 'rgba(52, 211, 153, 0)');
      aur.addColorStop(0.35, 'rgba(52, 211, 153, 0.72)');
      aur.addColorStop(0.7, 'rgba(56, 189, 248, 0.58)');
      aur.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.fillStyle = aur;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= this.width; x += 60) {
        const y = this.height * 0.12 + Math.sin(x * 0.006 + sec * 0.45) * 18;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.width, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawTerrain(ctx, state, uiState, sec, ev) {
    // 1. Vast Continuous Alpine Snowfield (extends far beyond camera clamp -> NEVER floats!)
    const pTop = gridToWorld(-14, -14);
    const pRight = gridToWorld(GRID_SIZE + 14, -14);
    const pBot = gridToWorld(GRID_SIZE + 14, GRID_SIZE + 14);
    const pLeft = gridToWorld(-14, GRID_SIZE + 14);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pTop.x, pTop.y); ctx.lineTo(pRight.x, pRight.y); ctx.lineTo(pBot.x, pBot.y); ctx.lineTo(pLeft.x, pLeft.y);
    ctx.closePath();
    const valleyGrad = ctx.createLinearGradient(pTop.x, pTop.y, pBot.x, pBot.y);
    valleyGrad.addColorStop(0, '#EBF4FC');
    valleyGrad.addColorStop(0.45, '#E1EEF9');
    valleyGrad.addColorStop(1, '#CEE1F2');
    ctx.fillStyle = valleyGrad;
    ctx.fill();

    // 2. Organic Snow Contours & Sunlit Alpine Drifts
    for (const h of this.valleyHills) {
      ctx.fillStyle = h.shade === 'light'
        ? `rgba(255, 255, 255, ${h.alpha})`
        : `rgba(164, 198, 228, ${h.alpha * 0.85})`;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.rx, h.ry, -0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Sunlit Active Farmstead Clearing (slightly warmer crisp snow in the heart of the village)
    const farmCenter = gridToWorld(7.5, 6.8);
    const farmGlow = ctx.createRadialGradient(farmCenter.x, farmCenter.y, 40, farmCenter.x, farmCenter.y, 580);
    farmGlow.addColorStop(0, 'rgba(255, 253, 248, 0.72)');
    farmGlow.addColorStop(0.65, 'rgba(246, 251, 255, 0.36)');
    farmGlow.addColorStop(1, 'rgba(246, 251, 255, 0)');
    ctx.fillStyle = farmGlow;
    ctx.beginPath();
    ctx.ellipse(farmCenter.x, farmCenter.y, 620, 320, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Winding Frozen Alpine Brook & Snow-Banked Pond (organic river curving across the lower valley!)
    this._drawAlpineBrookAndPond(ctx, sec);

    // 5. Locked Expansion Zones (clean subtle snow-meadow tint & crisp timber stake outline)
    const unlocked = new Set(state.unlockedLands || []);
    for (const zone of LAND_ZONES) {
      if (unlocked.has(zone.id)) continue;
      const b = zone.bounds;
      const zt = gridToWorld(b.x0, b.y0);
      const zr = gridToWorld(b.x1 + 1, b.y0);
      const zb = gridToWorld(b.x1 + 1, b.y1 + 1);
      const zl = gridToWorld(b.x0, b.y1 + 1);
      ctx.beginPath();
      ctx.moveTo(zt.x, zt.y); ctx.lineTo(zr.x, zr.y); ctx.lineTo(zb.x, zb.y); ctx.lineTo(zl.x, zl.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(130, 168, 206, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(118, 152, 188, 0.38)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Grid-Aligned Alpine Cobblestone Village Road (runs horizon-to-horizon!) + Courtyard Paths
    this._drawVillageRoads(ctx);

    // 7. Split-Rail Timber Estate Fence framing unlocked core farmstead (Hay-Day charm!)
    this._drawEstateFences(ctx, unlocked);

    // 8. Snow-Dusted Valley Boulders along forest perimeter
    for (const b of this.valleyBoulders) {
      const p = gridToWorld(b.gx, b.gy);
      ctx.fillStyle = 'rgba(62, 92, 128, 0.18)';
      ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 4, b.r * 1.15, b.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8A9BAA';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, b.r, b.r * 0.68, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F4F9FE';
      ctx.beginPath(); ctx.ellipse(p.x - b.r * 0.12, p.y - b.r * 0.25, b.r * 0.82, b.r * 0.36, -0.1, 0, Math.PI * 2); ctx.fill();
    }

    // 9. Build / Move Snap-to-Grid Overlay
    if (uiState.mode === 'move' || uiState.mode === 'place') {
      ctx.strokeStyle = 'rgba(30, 64, 175, 0.2)';
      ctx.lineWidth = 1.25;
      for (let i = 0; i <= GRID_SIZE; i++) {
        const a = gridToWorld(i, 0), b = gridToWorld(i, GRID_SIZE);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const c = gridToWorld(0, i), d = gridToWorld(GRID_SIZE, i);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
      }
      if (uiState.previewTile) {
        const { gx, gy, size = 1, valid } = uiState.previewTile;
        const t = gridToWorld(gx, gy), r = gridToWorld(gx + size, gy), b = gridToWorld(gx + size, gy + size), l = gridToWorld(gx, gy + size);
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(r.x, r.y); ctx.lineTo(b.x, b.y); ctx.lineTo(l.x, l.y); ctx.closePath();
        ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.38)' : 'rgba(220, 38, 38, 0.42)';
        ctx.fill();
        ctx.strokeStyle = valid ? '#15803D' : '#B91C1C';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawAlpineBrookAndPond(ctx, sec) {
    // Sinuous frozen mountain brook flowing into the scenic alpine lake
    const b0 = gridToWorld(23, 10.5);
    const b1 = gridToWorld(18.5, 13.0);
    const b2 = gridToWorld(14.5, 15.6);
    const b3 = gridToWorld(10.5, 17.4);
    const b4 = gridToWorld(6.5, 19.6);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Recessed snow bank shadow along river
    ctx.strokeStyle = '#B7D2EA';
    ctx.lineWidth = 66;
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y + 4);
    ctx.bezierCurveTo(b1.x, b1.y + 4, b2.x, b2.y + 4, b3.x, b3.y + 4);
    ctx.lineTo(b4.x, b4.y + 4);
    ctx.stroke();

    // Crisp white snow shoreline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 54;
    ctx.beginPath();
    ctx.moveTo(b0.x, b0.y);
    ctx.bezierCurveTo(b1.x, b1.y, b2.x, b2.y, b3.x, b3.y);
    ctx.lineTo(b4.x, b4.y);
    ctx.stroke();

    // Glacial blue ice brook body
    ctx.strokeStyle = '#7DC6EB';
    ctx.lineWidth = 42;
    ctx.stroke();

    ctx.strokeStyle = '#A8DDF5';
    ctx.lineWidth = 22;
    ctx.stroke();

    // Scenic snow-banked widening pond clear of the south fence line
    const pond = gridToWorld(14.8, 16.1);
    ctx.save();
    ctx.translate(pond.x, pond.y);
    ctx.fillStyle = '#B7D2EA';
    ctx.beginPath(); ctx.ellipse(0, 6, 162, 76, -0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, 1, 154, 70, -0.22, 0, Math.PI * 2); ctx.fill();
    const iceG = ctx.createRadialGradient(-28, -12, 14, 0, 0, 148);
    iceG.addColorStop(0, '#C7EEFF');
    iceG.addColorStop(0.55, '#76C4EB');
    iceG.addColorStop(1, '#4898C7');
    ctx.fillStyle = iceG;
    ctx.beginPath(); ctx.ellipse(0, 0, 144, 62, -0.22, 0, Math.PI * 2); ctx.fill();

    // Subtle specular ice sheen & skate swirls
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(18, 4, 38, 13, -0.15, 0, Math.PI * 1.35); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
    const sh = Math.sin(sec * 0.9) * 8;
    ctx.beginPath();
    ctx.ellipse(-26 + sh, -10, 32, 6, -0.25, 0, Math.PI * 2);
    ctx.ellipse(36 - sh * 0.6, 12, 24, 4.5, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Detailed Isometric Wooden Jetty extending onto the ice
    ctx.fillStyle = '#6E391B';
    ctx.fillRect(-114, -18, 6, 18);
    ctx.fillRect(-84, -4, 6, 18);
    ctx.fillStyle = '#9C5A2B';
    ctx.strokeStyle = '#4A2408';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-124, -30); ctx.lineTo(-76, -8); ctx.lineTo(-92, 8); ctx.lineTo(-140, -14); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#6B3710';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-112, -24); ctx.lineTo(-128, -8);
    ctx.moveTo(-100, -19); ctx.lineTo(-116, -3);
    ctx.moveTo(-88, -13); ctx.lineTo(-104, 3);
    ctx.stroke();
    // Snow dusting on jetty edge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath(); ctx.ellipse(-118, -22, 12, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  _drawVillageRoads(ctx) {
    // Horizon-to-horizon main cobblestone road along gy = 5.5 (zero overlap with Chalet, Bakery, or Fields!)
    const mainA = gridToWorld(-12, 5.5);
    const mainB = gridToWorld(28, 5.5);
    // Clean short entry aprons directly into Chalet front steps & Bakery front door
    const chaletA = gridToWorld(6.0, 4.15);
    const chaletB = gridToWorld(6.0, 5.5);
    const bakeryA = gridToWorld(4.0, 5.5);
    const bakeryB = gridToWorld(4.0, 6.95);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const segs = [
      [mainA, mainB, 46],
      [chaletA, chaletB, 34],
      [bakeryA, bakeryB, 32]
    ];

    // 1. Soft snow-bank border shadow
    ctx.strokeStyle = 'rgba(132, 168, 206, 0.5)';
    for (const [a, b, w] of segs) {
      ctx.lineWidth = w + 10;
      ctx.beginPath(); ctx.moveTo(a.x, a.y + 3); ctx.lineTo(b.x, b.y + 3); ctx.stroke();
    }

    // 2. Warm stone curb edge
    ctx.strokeStyle = '#C0A47E';
    for (const [a, b, w] of segs) {
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // 3. Tamped warm gravel center
    ctx.strokeStyle = '#E1CCA9';
    for (const [a, b, w] of segs) {
      ctx.lineWidth = w - 10;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // 4. Hand-set cobbled village square at (7.5, 5.5) with concentric flagstone rings
    const plaza = gridToWorld(7.5, 5.5);
    ctx.fillStyle = '#B89B74';
    ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y, 64, 32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E6D4B5';
    ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y, 56, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#C9AE86';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y, 38, 19, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y, 18, 9, 0, 0, Math.PI * 2); ctx.stroke();

    // 5. Hand-fitted isometric cobblestone pavers
    const tones = ['#F0E3CC', '#D3B993', '#E4D0AE'];
    for (const pv of this.roadPavers) {
      const c = gridToWorld(pv.gx, pv.gy);
      ctx.fillStyle = tones[pv.tone];
      ctx.beginPath();
      ctx.ellipse(c.x + pv.off, c.y - 1, 9.5, 4.4, 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawEstateFences(ctx, unlocked) {
    const drawFenceLine = (ax, ay, bx, by, posts) => {
      const a = gridToWorld(ax, ay);
      const b = gridToWorld(bx, by);
      ctx.save();
      ctx.strokeStyle = '#5C2D12';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 12); ctx.lineTo(b.x, b.y - 12);
      ctx.moveTo(a.x, a.y - 5); ctx.lineTo(b.x, b.y - 5);
      ctx.stroke();
      ctx.strokeStyle = '#A66230';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 12.5); ctx.lineTo(b.x, b.y - 12.5);
      ctx.moveTo(a.x, a.y - 5.5); ctx.lineTo(b.x, b.y - 5.5);
      ctx.stroke();

      for (let i = 0; i <= posts; i++) {
        const t = i / posts;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        ctx.fillStyle = '#7A421D';
        ctx.strokeStyle = '#4A240E';
        ctx.lineWidth = 1.4;
        ctx.fillRect(px - 2.5, py - 17, 5, 18);
        ctx.strokeRect(px - 2.5, py - 17, 5, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.ellipse(px, py - 17, 3.6, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };

    // North ridge boundary
    if (!unlocked.has('north_ridge')) drawFenceLine(2, 2, 14, 2, 10);
    // West boundary split cleanly at the main road gy = 5.5!
    if (!unlocked.has('west_forest')) {
      drawFenceLine(2, 2, 2, 4.7, 3);
      drawFenceLine(2, 6.3, 2, 14, 6);
    }
    // East boundary split cleanly at the main road gy = 5.5!
    if (!unlocked.has('east_glade')) {
      drawFenceLine(14, 2, 14, 4.7, 3);
      drawFenceLine(14, 6.3, 14, 14, 6);
    }
    // South boundary above pond
    if (!unlocked.has('south_meadow')) drawFenceLine(2, 14, 14, 14, 10);

    // Decorative snow-dusted evergreen shrubs tucked naturally at estate corners & road gates
    const shrubSpots = [[2.1, 4.6], [2.1, 6.4], [13.9, 4.6], [13.9, 6.4], [2.2, 13.8], [13.8, 13.8]];
    for (const [sx, sy] of shrubSpots) {
      const p = gridToWorld(sx, sy);
      ctx.save();
      ctx.fillStyle = 'rgba(42, 74, 114, 0.18)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1E5B34';
      ctx.beginPath(); ctx.arc(p.x - 5, p.y - 4, 8, 0, Math.PI * 2); ctx.arc(p.x + 5, p.y - 3, 7, 0, Math.PI * 2); ctx.arc(p.x, p.y - 8, 8.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 11, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _drawGhostPreview(ctx, state, uiState) {
    const pt = uiState.previewTile;
    let spriteKey = null;
    if (uiState.mode === 'place' && uiState.pendingPurchase) {
      const p = uiState.pendingPurchase;
      if (p.kind === 'field') spriteKey = 'snow_field_plot';
      else if (p.kind === 'animal') spriteKey = ANIMALS[p.type]?.sprite;
      else if (p.kind === 'deco') spriteKey = DECORATIONS[p.type]?.sprite;
      else if (p.kind === 'station') spriteKey = STATIONS[p.type]?.sprite;
    } else if (uiState.mode === 'move' && uiState.selectedMoveId) {
      const f = state.fields.find((x) => x.id === uiState.selectedMoveId);
      const a = state.animals.find((x) => x.id === uiState.selectedMoveId);
      const d = state.decorations.find((x) => x.id === uiState.selectedMoveId);
      const s = state.stations.find((x) => x.id === uiState.selectedMoveId);
      if (f) spriteKey = 'snow_field_plot';
      else if (a) spriteKey = ANIMALS[a.type]?.sprite;
      else if (d) spriteKey = DECORATIONS[d.type]?.sprite;
      else if (s) spriteKey = STATIONS[s.type]?.sprite;
    }
    const spr = spriteKey ? sprites.get(spriteKey) : null;
    if (!spr) return;
    const pos = gridToWorld(pt.gx + (pt.size || 1) * 0.5, pt.gy + (pt.size || 1) * 0.5);
    ctx.save();
    ctx.globalAlpha = pt.valid ? 0.78 : 0.4;
    const w = (pt.size || 1) === 2 ? 206 : spriteKey === 'snow_field_plot' ? 120 : 72;
    const h = (w * spr.height) / spr.width;
    const yOff = spriteKey === 'snow_field_plot' ? -h * 0.5 : -h + 14;
    ctx.drawImage(spr, pos.x - w * 0.5, pos.y + yOff, w, h);
    ctx.restore();
  }

  _buildDrawList(state, uiState, now, sec, ev) {
    const list = [];
    const levelInfo = getLevelInfo(state.xp);
    const unlockedLands = new Set(state.unlockedLands || []);

    // A) Dense Layered Alpine Pine Forest framing the valley
    const pineImg = sprites.get('deco_pine');
    if (pineImg) {
      for (const t of this.borderTrees) {
        const pos = gridToWorld(t.gx + 0.5, t.gy + 0.5);
        list.push({
          depth: t.gx + t.gy,
          draw: (ctx) => {
            const w = 112 * t.scale;
            const h = (w * pineImg.height) / pineImg.width;
            const sway = Math.sin(sec * 0.8 + t.phase) * 0.01;
            this._drawShadow(ctx, pos.x, pos.y + 4, w * 0.34, w * 0.15);
            ctx.save();
            ctx.translate(pos.x, pos.y + 8);
            ctx.rotate(sway);
            ctx.drawImage(pineImg, -w * 0.5, -h + 10, w, h);
            ctx.restore();
          }
        });
      }
    }

    // B) Clean Wooden Land Expansion Signs (Zero Emojis)
    for (const zone of LAND_ZONES) {
      if (unlockedLands.has(zone.id)) continue;
      const pos = gridToWorld(zone.signPos.gx + 0.5, zone.signPos.gy + 0.5);
      list.push({
        depth: zone.signPos.gx + zone.signPos.gy + 0.25,
        draw: (ctx) => {
          ctx.save();
          ctx.translate(pos.x, pos.y);
          this._drawShadow(ctx, 0, 6, 24, 10);
          ctx.fillStyle = '#6E391B'; ctx.strokeStyle = '#3B1A08'; ctx.lineWidth = 2;
          ctx.fillRect(-4, -32, 8, 38); ctx.strokeRect(-4, -32, 8, 38);
          ctx.fillStyle = '#FCF6E8'; ctx.strokeStyle = '#7A421D'; ctx.lineWidth = 2.2;
          this._roundRect(ctx, -46, -62, 92, 34, 9); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#2E190C'; ctx.font = '800 11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${zone.cost} Münzen`, 0, -50);
          ctx.font = '700 9.5px Inter, system-ui, sans-serif'; ctx.fillStyle = '#765742';
          ctx.fillText(`Ab Level ${zone.unlockLevel}`, 0, -37);
          ctx.restore();
        }
      });
    }

    // C) Daily Treasure Chest calmly placed by the scenic lakeside jetty
    if (uiState.dailyChestReady) {
      const pos = gridToWorld(DAILY_CHEST_POS.gx, DAILY_CHEST_POS.gy);
      list.push({
        depth: DAILY_CHEST_POS.gx + DAILY_CHEST_POS.gy + 0.35,
        draw: (ctx, glows) => {
          const spr = sprites.get('treasure_chest');
          this._drawShadow(ctx, pos.x, pos.y + 5, 28, 12);
          ctx.save();
          ctx.translate(pos.x, pos.y + 6);
          const hg = ctx.createRadialGradient(0, -24, 4, 0, -24, 40);
          hg.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
          hg.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.arc(0, -24, 40, 0, Math.PI * 2); ctx.fill();
          if (spr) ctx.drawImage(spr, -30, -56, 60, 56);
          ctx.restore();
          glows.push({ x: pos.x, y: pos.y - 24, r: 72 });
        }
      });
    }

    // D) Farm Field Plots (Crisp 4-Stage Growth · Gentle Wind Sway)
    const fieldImg = sprites.get('snow_field_plot');
    for (const f of state.fields) {
      const pos = gridToWorld(f.gx + 0.5, f.gy + 0.5);
      const crop = f.cropId ? ITEMS[f.cropId] : null;
      const elapsed = f.cropId ? (Date.now() - f.plantedAt) / 1000 : 0;
      const pct = crop ? Math.min(1, elapsed / crop.growTime) : 0;
      const isReady = crop && pct >= 1;

      list.push({
        depth: f.gx + f.gy - 0.15,
        draw: (ctx) => {
          const b = this._getBounceScale(f.id, now);
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.scale(b.sx, b.sy);

          if (fieldImg) {
            ctx.drawImage(fieldImg, -TILE_W * 0.53, -TILE_H * 0.61, TILE_W * 1.06, TILE_H * 1.25);
          }

          if (crop) {
            if (isReady) {
              const cImg = sprites.get('crop_' + crop.id);
              const sway = Math.sin(sec * 1.6 + f.gx * 0.8 + f.gy) * 0.014;
              ctx.save();
              ctx.translate(0, 10);
              ctx.rotate(sway);
              if (cImg) ctx.drawImage(cImg, -46, -68, 92, 76);
              ctx.restore();

              // Subtle golden ripe shimmer star
              const spAlpha = 0.3 + 0.5 * Math.sin(sec * 2.6 + f.gx * 2 + f.gy);
              ctx.save(); ctx.globalAlpha = spAlpha; ctx.fillStyle = '#FEF08A';
              this._drawStar(ctx, 18, -22, 4.5);
              ctx.restore();
            } else {
              this._draw4StageCrop(ctx, crop, pct, sec + f.gx);
            }
          }

          if (uiState.selectedMoveId === f.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(0, 0, 50, 25, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
        }
      });
    }

    // E) Hero Farmhouse Chalet (Solid, Grounded Architecture — 242px)
    {
      const c = state.chalet;
      const pos = gridToWorld(c.gx + 1, c.gy + 1);
      list.push({
        depth: c.gx + c.gy + 1.5,
        draw: (ctx, glows) => {
          const spr = sprites.get('winter_chalet');
          const b = this._getBounceScale('chalet', now);
          this._drawShadow(ctx, pos.x, pos.y + 6, 106, 50);
          ctx.save();
          ctx.translate(pos.x, pos.y + 18);
          ctx.scale(b.sx, b.sy);
          if (spr) ctx.drawImage(spr, -121, -216, 242, 232);
          ctx.restore();
          glows.push({ x: pos.x - 36, y: pos.y - 54, r: 95 });
          glows.push({ x: pos.x + 42, y: pos.y - 42, r: 85 });
        }
      });
    }

    // F) Central Village Christmas Tree (Grows gracefully with player level!)
    {
      const tr = state.christmasTree;
      const pos = gridToWorld(tr.gx + 1, tr.gy + 1);
      const stageScale = levelInfo.treeStage === 1 ? 0.88 : levelInfo.treeStage === 2 ? 0.98 : 1.1;
      list.push({
        depth: tr.gx + tr.gy + 1.5,
        draw: (ctx, glows) => {
          const spr = sprites.get('christmas_tree');
          const b = this._getBounceScale('christmasTree', now);
          this._drawShadow(ctx, pos.x, pos.y + 8, 78 * stageScale, 36 * stageScale);
          ctx.save();
          ctx.translate(pos.x, pos.y + 18);
          ctx.scale(b.sx * stageScale, b.sy * stageScale);
          if (spr) {
            const w = 192;
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 18, w, h);
          }
          const starPulse = 1 + Math.sin(sec * 2.4) * 0.12;
          const sg = ctx.createRadialGradient(0, -230, 2, 0, -230, 28 * starPulse);
          sg.addColorStop(0, 'rgba(255, 250, 195, 0.9)');
          sg.addColorStop(0.55, 'rgba(255, 210, 75, 0.38)');
          sg.addColorStop(1, 'rgba(255, 210, 75, 0)');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(0, -230, 28 * starPulse, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          glows.push({ x: pos.x, y: pos.y - 106 * stageScale, r: 150 * stageScale });
        }
      });
    }

    // G) Wishlist Notice Board (Proportional 88px along road)
    {
      const wb = state.wishlistBoard;
      const pos = gridToWorld(wb.gx + 0.5, wb.gy + 0.5);
      const readyOrders = state.orders.filter((o) =>
        Object.entries(o.req).every(([id, q]) => (state.inventory[id] || 0) >= q)
      ).length;
      list.push({
        depth: wb.gx + wb.gy + 0.4,
        draw: (ctx, glows) => {
          const spr = sprites.get('wishlist_board');
          const b = this._getBounceScale('wishlistBoard', now);
          this._drawShadow(ctx, pos.x, pos.y + 5, 36, 16);
          ctx.save();
          ctx.translate(pos.x, pos.y + 10); ctx.scale(b.sx, b.sy);
          if (spr) {
            const w = 88;
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 10, w, h);
          }
          ctx.restore();
          glows.push({ x: pos.x - 28, y: pos.y - 30, r: 54 });
          if (readyOrders > 0) this._drawReadyIndicator(ctx, pos.x + 22, pos.y - 92 + Math.sin(sec * 2.4) * 2, String(readyOrders), '#1F7A45');
        }
      });
    }

    // H) Parked Reindeer Sleigh (Grounded solidly beside the main road — ZERO bobbing!)
    if (!this.sleighAnim || !this.sleighAnim.active) {
      const sp = state.sleighPos;
      const pos = gridToWorld(sp.gx + 0.5, sp.gy + 0.5);
      list.push({
        depth: sp.gx + sp.gy + 0.6,
        draw: (ctx) => {
          const spr = sprites.get('reindeer_sleigh');
          this._drawShadow(ctx, pos.x, pos.y + 8, 72, 30);
          if (spr) {
            const w = 170;
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, pos.x - w * 0.5, pos.y - h + 32, w, h);
          }
        }
      });
    }

    // I) Winter Post Mailbox (Realistic 52px scale!)
    {
      const mb = state.mailbox;
      const pos = gridToWorld(mb.gx + 0.5, mb.gy + 0.5);
      list.push({
        depth: mb.gx + mb.gy + 0.4,
        draw: (ctx) => {
          const spr = sprites.get('gift_mailbox');
          const b = this._getBounceScale('mailbox', now);
          this._drawShadow(ctx, pos.x, pos.y + 4, 22, 10);
          ctx.save();
          ctx.translate(pos.x, pos.y + 8); ctx.scale(b.sx, b.sy);
          if (spr) {
            const w = 52;
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 8, w, h);
          }
          ctx.restore();
        }
      });
    }

    // J) Production Stations (True 3D WebP · Grounded Architecture · Subtle Live Details)
    for (const st of state.stations) {
      if (!st.built) continue;
      const def = STATIONS[st.type];
      if (!def) continue;
      const pos = gridToWorld(st.gx + 1, st.gy + 1);
      const isWorking = !st.wrapped && st.queue.length > 0;
      const readyCount = st.ready.length;
      const mastery = getStationMastery(st.craftedCount || 0);

      list.push({
        depth: st.gx + st.gy + 1.5,
        draw: (ctx, glows) => {
          const b = this._getBounceScale(st.id, now);
          this._drawShadow(ctx, pos.x, pos.y + 7, 86, 40);

          if (st.wrapped) {
            this._drawWrappedConstruction(ctx, pos.x, pos.y, sec, b);
            return;
          }

          const spr = sprites.get(def.sprite);
          ctx.save();
          ctx.translate(pos.x, pos.y + 16);
          ctx.scale(b.sx, b.sy);
          const w = st.type === 'teahouse' ? 184 : 206;
          if (spr) {
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 14, w, h);
          }

          // Subtle, grounded live crafting cues (NO building wobble!)
          if (isWorking) {
            if (st.type === 'teahouse') {
              const sx = -36 + Math.cos(sec * 3.4) * 9;
              const sy = -68 + Math.sin(sec * 3.4) * 3;
              ctx.strokeStyle = '#6B3410'; ctx.lineWidth = 5; ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(sec * 3.4) * 5, sy - 22); ctx.stroke();
            } else if (st.type === 'bakery') {
              const og = ctx.createRadialGradient(-24, -70, 3, -24, -70, 28 + Math.sin(sec * 5) * 4);
              og.addColorStop(0, 'rgba(255, 240, 150, 0.6)');
              og.addColorStop(1, 'rgba(255, 160, 40, 0)');
              ctx.fillStyle = og;
              ctx.beginPath(); ctx.arc(-24, -70, 32, 0, Math.PI * 2); ctx.fill();
            }
          }
          ctx.restore();

          // Subtle Mastery Star plaque
          if (mastery.stars > 0) {
            ctx.save();
            ctx.font = '800 11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FACC15';
            ctx.strokeStyle = '#3B1A08';
            ctx.lineWidth = 2.5;
            const starsStr = '★'.repeat(mastery.stars);
            ctx.strokeText(starsStr, pos.x, pos.y + 20);
            ctx.fillText(starsStr, pos.x, pos.y + 20);
            ctx.restore();
          }

          if (uiState.selectedMoveId === st.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.ellipse(pos.x, pos.y + 6, 92, 44, 0, 0, Math.PI * 2); ctx.stroke();
          }

          for (const gp of def.glowPoints) {
            glows.push({ x: pos.x + gp.x * 185, y: pos.y + gp.y * 175, r: gp.r * 240 });
          }

          if (readyCount > 0) {
            this._drawCollectBubble(ctx, pos.x, pos.y - 162 + Math.sin(sec * 2.5) * 2, st.ready[0], readyCount);
          } else if (isWorking) {
            const job = st.queue[0];
            const recipe = ITEMS[job.itemId];
            const totalMs = recipe.craftTime * mastery.speedMult * 1000;
            const pct = Math.min(1, Math.max(0, 1 - (job.finishAt - Date.now()) / totalMs));
            this._drawMiniProgress(ctx, pos.x, pos.y - 144, pct, job.itemId);
          }
        }
      });
    }

    // K) Properly Scaled Alpine Animals inside Isometric Wooden Pens!
    const isNightSleep = ev > 0.72;
    for (const an of state.animals) {
      const def = ANIMALS[an.type];
      if (!def) continue;
      const mot = this.getAnimalMotion(an);
      const basePos = gridToWorld(an.gx + 0.5, an.gy + 0.5);
      const livePos = gridToWorld(an.gx + 0.5 + mot.ox, an.gy + 0.5 + mot.oy);
      const isReady = an.state === 'ready';
      const isFed = an.state === 'producing';
      const stepY = mot.walkPhase > 0 ? Math.abs(Math.sin(mot.walkPhase)) * -3 : 0;

      list.push({
        depth: an.gx + mot.ox + an.gy + mot.oy + 0.35,
        draw: (ctx) => {
          // Proper isometric wooden pen (back rails, warm straw bedding, corner posts)
          this._drawAnimalPen(ctx, basePos.x, basePos.y);

          const spr = sprites.get(def.sprite);
          const b = this._getBounceScale(an.id, now);
          // Realistic animal proportions relative to houses & villagers!
          const size = an.type === 'chicken' ? 48 : an.type === 'sheep' ? 64 : 78;
          this._drawShadow(ctx, livePos.x, livePos.y + 4, size * 0.34, size * 0.16);
          ctx.save();
          ctx.translate(livePos.x, livePos.y + 6 + stepY);
          ctx.scale((mot.flip ? -1 : 1) * b.sx, b.sy);
          if (spr) {
            const h = (size * spr.height) / spr.width;
            ctx.drawImage(spr, -size * 0.5, -h + 6, size, h);
          }
          ctx.restore();

          if (uiState.selectedMoveId === an.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(livePos.x, livePos.y + 4, 42, 20, 0, 0, Math.PI * 2); ctx.stroke();
          }

          if (isNightSleep && !isReady) {
            const zOff = (sec * 10 + an.gx * 4) % 20;
            ctx.save();
            ctx.globalAlpha = (1 - zOff / 20) * 0.85;
            ctx.font = '800 11px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#E0F2FE';
            ctx.fillText('z', livePos.x + 14, livePos.y - size * 0.72 - zOff);
            ctx.restore();
          }

          if (isReady) {
            this._drawCollectBubble(ctx, livePos.x, livePos.y - size - 14 + Math.sin(sec * 2.5 + an.gx) * 2, def.produceItem, 1);
          } else if (isFed) {
            const pct = Math.min(1, Math.max(0, 1 - (an.readyAt - Date.now()) / (def.produceTime * 1000)));
            this._drawMiniProgress(ctx, livePos.x, livePos.y - size - 12, pct, def.produceItem);
          } else {
            this._drawHungryBubble(ctx, livePos.x, livePos.y - size - 10, def.feedItem);
          }
        }
      });
    }

    // L) Illustrated Alpine Villagers strolling along roads (ZERO Emojis!)
    for (const v of this.villagers) {
      const pos = gridToWorld(v.gx, v.gy);
      const walking = v.pause <= 0;
      const stepBob = walking ? Math.abs(Math.sin(sec * 7.5 + v.gx * 2.5)) * -2.8 : 0;
      list.push({
        depth: v.gx + v.gy + 0.38,
        draw: (ctx) => {
          this._drawShadow(ctx, pos.x, pos.y + 2, 13, 5.5);
          ctx.save();
          ctx.translate(pos.x, pos.y + stepBob);
          this._drawIllustratedVillager(ctx, v, walking, sec);

          if (v.offer) {
            const bobO = Math.sin(sec * 2.4 + v.gx) * 1.8;
            ctx.save();
            ctx.translate(0, -60 + bobO);
            ctx.fillStyle = '#FFFBEB';
            ctx.strokeStyle = '#B47720';
            ctx.lineWidth = 2;
            this._roundRect(ctx, -32, -15, 64, 26, 13);
            ctx.fill(); ctx.stroke();
            const oImg = sprites.getIconImg(v.offer.itemId);
            if (oImg) ctx.drawImage(oImg, -26, -12, 20, 20);
            ctx.fillStyle = '#4A2410';
            ctx.font = '800 10.5px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${v.offer.price}`, -2, -1.5);
            ctx.restore();
          } else if (v.quoteTimer > 0 && v.quote) {
            ctx.font = '700 10.5px Inter, system-ui, sans-serif';
            const tw = ctx.measureText(v.quote).width;
            const bw = tw + 16;
            ctx.fillStyle = 'rgba(252, 246, 232, 0.95)';
            ctx.strokeStyle = '#9B562B'; ctx.lineWidth = 1.6;
            this._roundRect(ctx, -bw * 0.5, -66, bw, 22, 11); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#2E190C';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(v.quote, 0, -55);
          }
          ctx.restore();
        }
      });
    }

    // M) Placed Winter Decorations (Realistic Proportions)
    for (const d of state.decorations) {
      const def = DECORATIONS[d.type];
      if (!def) continue;
      const pos = gridToWorld(d.gx + 0.5, d.gy + 0.5);
      list.push({
        depth: d.gx + d.gy + 0.3,
        draw: (ctx, glows) => {
          const spr = sprites.get(def.sprite);
          const b = this._getBounceScale(d.id, now);
          const w = d.type === 'lightarch' ? 116
            : d.type === 'pine' ? 104
            : d.type === 'lantern' ? 56
            : d.type === 'snowman' ? 64
            : 72;
          this._drawShadow(ctx, pos.x, pos.y + 5, w * 0.34, w * 0.15);
          ctx.save();
          ctx.translate(pos.x, pos.y + 9);
          ctx.scale(b.sx, b.sy);
          if (spr) {
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 8, w, h);
          }
          ctx.restore();

          if (uiState.selectedMoveId === d.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(pos.x, pos.y + 4, 40, 19, 0, 0, Math.PI * 2); ctx.stroke();
          }

          if (def.glow && def.glowOffset) {
            glows.push({
              x: pos.x + def.glowOffset.x * 90,
              y: pos.y + def.glowOffset.y * 105,
              r: def.glowOffset.r * 195
            });
          }
        }
      });
    }

    return list;
  }

  _drawAnimalPen(ctx, x, y) {
    ctx.save();
    // Warm sunlit straw/pasture base pad
    ctx.fillStyle = 'rgba(218, 189, 138, 0.42)';
    ctx.beginPath(); ctx.ellipse(x, y + 3, 44, 21, 0, 0, Math.PI * 2); ctx.fill();
    // Subtle isometric 4-corner rustic posts & back rails
    const pN = { x, y: y - 20 };
    const pE = { x: x + 42, y };
    const pS = { x, y: y + 20 };
    const pW = { x: x - 42, y };
    ctx.strokeStyle = '#7A421D';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(pW.x, pW.y - 8); ctx.lineTo(pN.x, pN.y - 8); ctx.lineTo(pE.x, pE.y - 8);
    ctx.stroke();
    ctx.fillStyle = '#6E391B';
    for (const pt of [pN, pE, pW, pS]) {
      ctx.fillRect(pt.x - 2.2, pt.y - 12, 4.4, 13);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(pt.x - 2.2, pt.y - 13, 4.4, 2.2);
      ctx.fillStyle = '#6E391B';
    }
    ctx.restore();
  }

  _drawIllustratedVillager(ctx, v, walking, sec) {
    // Grounded illustrated miniature winter villager (boots, coat, scarf, face, beanie — zero emoji!)
    const swing = walking ? Math.sin(sec * 9 + v.gx) * 2.4 : 0;
    // Boots
    ctx.fillStyle = '#3B1A08';
    ctx.beginPath();
    ctx.ellipse(-4 + swing, -2, 3.2, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(4 - swing, -2, 3.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tailored winter coat
    ctx.fillStyle = v.coat;
    ctx.strokeStyle = '#2B1408';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.quadraticCurveTo(-10, -21, -5, -26);
    ctx.lineTo(5, -26);
    ctx.quadraticCurveTo(10, -21, 9, -6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Cozy knit scarf
    ctx.fillStyle = v.scarf;
    ctx.beginPath(); ctx.roundRect(-7, -27, 14, 5, 2.5); ctx.fill();
    ctx.fillRect(2, -23, 3.5, 8);
    // Head
    ctx.fillStyle = v.skin;
    ctx.strokeStyle = '#4A240E';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, -33, 7.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Rosy winter cheeks & crisp eyes
    ctx.fillStyle = 'rgba(220, 90, 90, 0.45)';
    ctx.beginPath(); ctx.arc(-3.5, -31.5, 1.5, 0, Math.PI * 2); ctx.arc(3.5, -31.5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2B1408';
    ctx.beginPath(); ctx.arc(-2.2, -33.2, 1.1, 0, Math.PI * 2); ctx.arc(2.2, -33.2, 1.1, 0, Math.PI * 2); ctx.fill();
    // Knit winter hat + pom-pom
    ctx.fillStyle = v.hat;
    ctx.beginPath(); ctx.arc(0, -35.5, 7.5, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.roundRect(-8, -37.2, 16, 3.4, 1.7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -43.5, 2.6, 0, Math.PI * 2); ctx.fill();
  }

  _drawWrappedConstruction(ctx, x, y, sec, b) {
    ctx.save();
    ctx.translate(x, y + 12);
    ctx.scale(b.sx, b.sy);
    ctx.strokeStyle = '#4A2408'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    ctx.fillStyle = '#D99B52';
    ctx.beginPath(); ctx.moveTo(0, -96); ctx.lineTo(66, -64); ctx.lineTo(0, -32); ctx.lineTo(-66, -64); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#B87232';
    ctx.beginPath(); ctx.moveTo(-66, -64); ctx.lineTo(0, -32); ctx.lineTo(0, 12); ctx.lineTo(-66, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9A5B22';
    ctx.beginPath(); ctx.moveTo(66, -64); ctx.lineTo(0, -32); ctx.lineTo(0, 12); ctx.lineTo(66, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Crimson ribbon cross & bow
    ctx.fillStyle = '#B91C1C'; ctx.strokeStyle = '#781016'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-38, -50); ctx.lineTo(-26, -44); ctx.lineTo(-26, 0); ctx.lineTo(-38, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38, -50); ctx.lineTo(26, -44); ctx.lineTo(26, 0); ctx.lineTo(38, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#DC2626';
    ctx.beginPath(); ctx.ellipse(-19, -86, 20, 11, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(19, -86, 20, 11, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -80, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Clean label pill (Zero Emoji)
    const floatY = Math.sin(sec * 2.5) * 2;
    ctx.fillStyle = '#FCF6E8'; ctx.strokeStyle = '#B47720'; ctx.lineWidth = 2;
    this._roundRect(ctx, -50, -130 + floatY, 100, 24, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7B1516'; ctx.font = '800 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Auspacken', 0, -118 + floatY);
    ctx.restore();
  }

  _draw4StageCrop(ctx, crop, pct, phase) {
    const sway = Math.sin(phase * 1.4) * 0.015;
    ctx.save();
    ctx.rotate(sway);
    const pts = [[-20, -4], [0, -11], [20, -4], [-9, 7], [11, 7]];

    if (pct < 0.22) {
      for (const [ox, oy] of pts) {
        ctx.fillStyle = '#6B3E20';
        ctx.beginPath(); ctx.ellipse(ox, oy, 6.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath(); ctx.arc(ox - 2, oy - 2, 2, 0, Math.PI * 2); ctx.arc(ox + 2.2, oy - 1, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pct < 0.58) {
      const s = 0.55 + ((pct - 0.22) / 0.36) * 0.35;
      for (const [ox, oy] of pts) {
        ctx.fillStyle = '#4ADE80'; ctx.strokeStyle = '#166534'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(ox - 4.5 * s, oy - 7 * s, 6.5 * s, 3.8 * s, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(ox + 4.5 * s, oy - 7 * s, 6.5 * s, 3.8 * s, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else {
      const s = 0.85 + ((pct - 0.58) / 0.42) * 0.22;
      for (const [ox, oy] of pts) {
        ctx.fillStyle = '#2E9E46'; ctx.strokeStyle = '#14532D'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(ox - 6.5 * s, oy - 9 * s, 8.5 * s, 5 * s, -0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(ox + 6.5 * s, oy - 9 * s, 8.5 * s, 5 * s, 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = crop.color;
        ctx.beginPath(); ctx.arc(ox, oy - 14 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.arc(0, -28, 9, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * pct); ctx.stroke();
    ctx.restore();
  }

  _drawShadow(ctx, x, y, rx, ry) {
    ctx.fillStyle = 'rgba(42, 74, 114, 0.2)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }

  _drawCollectBubble(ctx, x, y, itemId, count) {
    ctx.save();
    ctx.fillStyle = '#FFFDF7'; ctx.strokeStyle = '#B47720'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const img = sprites.getIconImg(itemId);
    if (img) ctx.drawImage(img, x - 14, y - 14, 28, 28);
    if (count > 1) {
      ctx.fillStyle = '#B42324'; ctx.beginPath(); ctx.arc(x + 15, y - 14, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(count), x + 15, y - 13.5);
    }
    ctx.restore();
  }

  _drawHungryBubble(ctx, x, y, feedItemId) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(255, 253, 247, 0.94)'; ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const img = sprites.getIconImg(feedItemId);
    if (img) ctx.drawImage(img, x - 10, y - 10, 20, 20);
    ctx.restore();
  }

  _drawReadyIndicator(ctx, x, y, label, bg) {
    ctx.save();
    ctx.fillStyle = bg; ctx.strokeStyle = '#FFFDF7'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.font = '800 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 0.5);
    ctx.restore();
  }

  _drawMiniProgress(ctx, x, y, pct, itemId) {
    ctx.save();
    ctx.fillStyle = 'rgba(43, 20, 8, 0.84)';
    this._roundRect(ctx, x - 26, y - 12, 52, 22, 11); ctx.fill();
    const img = sprites.getIconImg(itemId);
    if (img) ctx.drawImage(img, x - 22, y - 9, 16, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this._roundRect(ctx, x - 3, y - 3.5, 24, 7, 3.5); ctx.fill();
    ctx.fillStyle = '#FACC15';
    this._roundRect(ctx, x - 3, y - 3.5, Math.max(4, 24 * pct), 7, 3.5); ctx.fill();
    ctx.restore();
  }

  _drawWarmLights(ctx, glowSpots, ev, sec) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < glowSpots.length; i++) {
      const g = glowSpots[i];
      const flicker = 0.94 + Math.sin(sec * 3.5 + i * 1.7) * 0.06;
      const r = g.r * flicker;
      const grad = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, r);
      grad.addColorStop(0, `rgba(255, 226, 148, ${0.42 * ev})`);
      grad.addColorStop(0.5, `rgba(255, 176, 74, ${0.18 * ev})`);
      grad.addColorStop(1, 'rgba(255, 160, 50, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawEveningOverlay(ctx, ev) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, `rgba(18, 32, 72, ${ev * 0.44})`);
    grad.addColorStop(1, `rgba(12, 22, 52, ${ev * 0.34})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  _drawParachuteGift(ctx, progress) {
    const x = this.width * 0.5 + Math.sin(progress * Math.PI * 2.5) * 46;
    const y = -50 + progress * (this.height * 0.62);
    const giftImg = sprites.getIconImg('mega_gift');
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-22, -26); ctx.lineTo(-8, 4); ctx.moveTo(22, -26); ctx.lineTo(8, 4); ctx.stroke();
    ctx.fillStyle = '#B42324'; ctx.strokeStyle = '#FFFDF7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -24, 24, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (giftImg) ctx.drawImage(giftImg, -20, -2, 40, 40);
    ctx.restore();
  }

  _drawSwipeTrail(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < this.swipeTrail.length; i++) {
      const p0 = this.swipeTrail[i - 1], p1 = this.swipeTrail[i];
      const alpha = 1 - p1.life / p1.maxLife;
      ctx.strokeStyle = p1.mode === 'harvest' ? `rgba(250, 204, 21, ${alpha * 0.8})` : `rgba(52, 211, 153, ${alpha * 0.8})`;
      ctx.lineWidth = 9 * alpha;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    ctx.restore();
  }

  _drawStar(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r : r * 0.36;
      const a = (i * Math.PI) / 4;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  _drawHeart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.4);
    ctx.bezierCurveTo(x - r, y - r * 0.4, x - r * 0.5, y - r * 1.1, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.5, y - r * 1.1, x + r, y - r * 0.4, x, y + r * 0.4);
    ctx.fill();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
