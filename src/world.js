// ============================================================================
// WINTERHOF & ZAUBERHERBST — 60 FPS Hay-Day-Benchmark Living World Engine
// ============================================================================

import { GRID_SIZE, LAND_ZONES, ITEMS, ANIMALS, STATIONS, DECORATIONS, getLevelInfo, getStationMastery } from './gameData.js';
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
  'Mmmh, riecht nach Matcha! 🍵',
  'So gemütlich hier! ✨',
  'Frische Waffeln? Lecker! 🧇',
  'Was für tolle Schwammerl! 🍄',
  'Wundervoller Hof! ❤️',
  'Ein Butterbier wär jetzt fein!'
];

const ROAD_WAYPOINTS = [
  { gx: 4.5, gy: 4.5 },
  { gx: 7.5, gy: 4.5 },
  { gx: 10.8, gy: 4.5 },
  { gx: 7.5, gy: 7.2 },
  { gx: 4.8, gy: 7.2 },
  { gx: 11.2, gy: 7.2 },
  { gx: 7.5, gy: 9.2 }
];

export class WinterWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = 0;
    this.height = 0;

    const center = gridToWorld(7.6, 6.2);
    this.cam = {
      x: center.x + 8,
      y: center.y - 26,
      zoom: 0.84,
      targetZoom: null,
      vx: 0,
      vy: 0
    };

    // Atmosphere & Season
    this.lightingMode = 'auto';
    this.autoClock = 0.1;
    this.eveningFactor = 0;
    this.seasonBlend = 0; // 0 = winter, 1 = autumn

    // Ambient particles & visual juice
    this.flakes = [];
    this.fireflies = [];
    this.nightStars = [];
    this.smoke = [];
    this.sparkles = [];
    this.floaters = [];
    this.flyingHudItems = []; // Bezier arcs directly to HUD!
    this.swipeTrail = [];

    // Living entities
    this.animalMotion = new Map(); // id -> { ox, oy, tx, ty, wait, flip, hopPhase }
    this.villagers = this._initVillagers();

    // Animated hero events
    this.sleighAnim = null;
    this.giftParachute = null;
    this.snitch = null;
    this.snitchCooldown = 14;
    this.bounceMap = new Map();

    // Scenic valley forest & terrain
    this.borderTrees = this._generateBorderForest();
    this.groundDrifts = this._generateGroundDrifts();

    this._initWeather();
    this.resize();
  }

  _initVillagers() {
    const specs = [
      { id: 'v_hilde', name: 'Oma Hilde', emoji: '👵', coat: '#C1121F', hat: '#FFFDF7', wp: 0 },
      { id: 'v_rudi', name: 'Wildhüter Rudi', emoji: '🧔', coat: '#6B3F1D', hat: '#3E220D', wp: 2 },
      { id: 'v_leo', name: 'Zauberlehrling Leo', emoji: '🧙', coat: '#3B2552', hat: '#FACC15', wp: 4 }
    ];
    return specs.map((sp, i) => {
      const start = ROAD_WAYPOINTS[sp.wp];
      const next = ROAD_WAYPOINTS[(sp.wp + 1) % ROAD_WAYPOINTS.length];
      return {
        ...sp,
        gx: start.gx,
        gy: start.gy,
        tx: next.gx,
        ty: next.gy,
        pause: i * 1.6,
        quote: '',
        quoteTimer: 0,
        lastTipAt: 0
      };
    });
  }

  _generateBorderForest() {
    const trees = [];
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let gx = -3; gx <= GRID_SIZE + 2; gx++) {
      for (let gy = -3; gy <= GRID_SIZE + 2; gy++) {
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) continue;
        if (gx >= 11 && gx <= 17 && gy >= 14 && gy <= 18) continue;
        if (rand() < 0.64) {
          trees.push({
            gx: gx + (rand() - 0.5) * 0.65,
            gy: gy + (rand() - 0.5) * 0.65,
            scale: 0.78 + rand() * 0.44,
            phase: rand() * Math.PI * 2,
            autumnVariant: rand() < 0.65
          });
        }
      }
    }
    return trees;
  }

  _generateGroundDrifts() {
    const drifts = [];
    let seed = 4242;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 30; i++) {
      const p = gridToWorld(rand() * GRID_SIZE, rand() * GRID_SIZE);
      drifts.push({
        x: p.x, y: p.y,
        rx: 42 + rand() * 76,
        ry: 18 + rand() * 32,
        alpha: 0.14 + rand() * 0.2
      });
    }
    return drifts;
  }

  _initWeather() {
    this.flakes = [];
    const leafColors = ['#F97316', '#EA580C', '#FACC15', '#DC2626', '#D97706'];
    for (let i = 0; i < 68; i++) {
      this.flakes.push({
        x: Math.random() * 1400, y: Math.random() * 900,
        r: 1.6 + Math.random() * 3.1,
        vy: 18 + Math.random() * 30,
        vx: -10 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        leafColor: leafColors[i % leafColors.length],
        alpha: 0.45 + Math.random() * 0.5
      });
    }
    this.fireflies = [];
    for (let i = 0; i < 22; i++) {
      this.fireflies.push({
        x: Math.random() * 1400, y: Math.random() * 900,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.2
      });
    }
    this.nightStars = [];
    for (let i = 0; i < 36; i++) {
      this.nightStars.push({
        rx: Math.random(), ry: Math.random() * 0.34,
        r: 1 + Math.random() * 1.8,
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
        ? (this.width < 430 ? 0.58 : 0.72)
        : (this.height < 460 ? 0.62 : 0.84);
      // Start slightly zoomed out for a cinematic Hay-Day zoom-in reveal!
      this.cam.zoom = comfort * 0.84;
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
    this.cam.x = Math.max(c.x - 720, Math.min(c.x + 720, this.cam.x));
    this.cam.y = Math.max(c.y - 460, Math.min(c.y + 460, this.cam.y));
    this.cam.zoom = Math.max(0.42, Math.min(1.65, this.cam.zoom));
  }

  triggerBounce(entityId) {
    this.bounceMap.set(entityId, performance.now());
  }

  spawnBurst(wx, wy, color = '#FDE047', count = 12, shape = 'star') {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const sp = 35 + Math.random() * 92;
      this.sparkles.push({
        x: wx, y: wy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 48,
        size: 4 + Math.random() * 5,
        color, shape,
        life: 0,
        maxLife: 0.68 + Math.random() * 0.4
      });
    }
  }

  spawnFloater(wx, wy, text, iconId = null, color = '#FFFFFF') {
    this.floaters.push({ x: wx, y: wy, text, iconId, color, life: 0, maxLife: 1.45 });
  }

  spawnFlyingHudItem(wx, wy, iconId, target = 'barn', onLand = null) {
    const start = this.worldToScreen(wx, wy);
    const elId = target === 'coins' ? 'btn-coins' : target === 'level' ? 'btn-village' : 'dock-barn';
    const el = document.getElementById(elId);
    const rect = el ? el.getBoundingClientRect() : { left: this.width * 0.5, top: 40, width: 40, height: 40 };
    const tx = rect.left + rect.width * 0.5;
    const ty = rect.top + rect.height * 0.5;
    this.flyingHudItems.push({
      sx: start.x, sy: start.y,
      cx: (start.x + tx) * 0.5 + (Math.random() - 0.5) * 90,
      cy: Math.min(start.y, ty) - 80,
      tx, ty,
      iconId, elId,
      t: 0,
      duration: 0.62 + Math.random() * 0.16,
      onLand
    });
  }

  addSwipePoint(sx, sy, mode = 'harvest') {
    this.swipeTrail.push({ x: sx, y: sy, mode, life: 0, maxLife: 0.32 });
  }

  launchSleigh(state) {
    const start = gridToWorld(state.sleighPos.gx, state.sleighPos.gy);
    this.sleighAnim = { active: true, progress: 0, startX: start.x, startY: start.y };
  }

  launchGiftParachute(from, onDone) {
    this.giftParachute = { progress: 0, from, onDone };
  }

  spawnSnitch() {
    const c = gridToWorld(7.5, 6.5);
    this.snitch = {
      x: c.x - 360,
      y: c.y - 120 + (Math.random() - 0.5) * 140,
      baseY: c.y - 110,
      vx: 72,
      phase: 0,
      life: 0,
      maxLife: 14
    };
  }

  hitTestSnitch(wx, wy) {
    if (!this.snitch) return false;
    return Math.hypot(wx - this.snitch.x, wy - this.snitch.y) < 48;
  }

  hitTestVillager(wx, wy) {
    for (const v of this.villagers) {
      const p = gridToWorld(v.gx, v.gy);
      if (Math.abs(wx - p.x) < 28 && wy > p.y - 54 && wy < p.y + 12) return v;
    }
    return null;
  }

  getAnimalMotion(an) {
    let m = this.animalMotion.get(an.id);
    if (!m) {
      m = { ox: 0, oy: 0, tx: 0, ty: 0, wait: 1 + Math.random() * 2.5, flip: false, hop: 0 };
      this.animalMotion.set(an.id, m);
    }
    return m;
  }

  update(dt, state) {
    // Cinematic smooth intro zoom-in
    if (this.cam.targetZoom !== null) {
      this.cam.zoom += (this.cam.targetZoom - this.cam.zoom) * Math.min(1, dt * 3.8);
      if (Math.abs(this.cam.zoom - this.cam.targetZoom) < 0.004) {
        this.cam.zoom = this.cam.targetZoom;
        this.cam.targetZoom = null;
      }
    }

    // Camera momentum
    if (Math.abs(this.cam.vx) > 0.5 || Math.abs(this.cam.vy) > 0.5) {
      this.cam.x += this.cam.vx * dt;
      this.cam.y += this.cam.vy * dt;
      const damp = Math.pow(0.04, dt);
      this.cam.vx *= damp;
      this.cam.vy *= damp;
      this.clampCamera();
    }

    // Smooth season cross-fade
    const targetSeason = state.season === 'autumn' ? 1 : 0;
    this.seasonBlend += (targetSeason - this.seasonBlend) * Math.min(1, dt * 3.8);

    // Lighting progression
    if (this.lightingMode === 'auto') {
      this.autoClock = (this.autoClock + dt / 240) % 1;
      const wave = 0.5 - 0.5 * Math.cos(this.autoClock * Math.PI * 2);
      this.eveningFactor += (wave - this.eveningFactor) * Math.min(1, dt * 2.5);
    } else {
      const target = this.lightingMode === 'day' ? 0 : this.lightingMode === 'dusk' ? 0.52 : 1;
      this.eveningFactor += (target - this.eveningFactor) * Math.min(1, dt * 3.5);
    }

    // Autonomous Animal Wandering & Hopping (slows & sleeps peacefully at night!)
    const sleeping = this.eveningFactor > 0.72;
    for (const an of state.animals) {
      const m = this.getAnimalMotion(an);
      if (an.type === 'owl' || (sleeping && an.state !== 'ready')) {
        // Owls perch & bob gently; sleeping animals settle softly
        m.hop = 0;
        continue;
      }
      const dx = m.tx - m.ox;
      const dy = m.ty - m.oy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.03) {
        const speed = an.type === 'chicken' ? 0.24 : 0.3;
        const step = Math.min(dist, speed * dt);
        m.ox += (dx / dist) * step;
        m.oy += (dy / dist) * step;
        m.flip = (dx - dy) < 0;
        m.hop += dt * 11;
      } else {
        m.hop = 0;
        m.wait -= dt;
        if (m.wait <= 0) {
          m.tx = (Math.random() - 0.5) * 0.52;
          m.ty = (Math.random() - 0.5) * 0.52;
          m.wait = 2.0 + Math.random() * 3.2;
        }
      }
    }

    // Strolling NPC Villagers along village walkways
    for (const v of this.villagers) {
      if (v.quoteTimer > 0) v.quoteTimer -= dt;
      if (v.pause > 0) {
        v.pause -= dt;
        continue;
      }
      const dx = v.tx - v.gx;
      const dy = v.ty - v.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.08) {
        const step = Math.min(dist, 0.55 * dt);
        v.gx += (dx / dist) * step;
        v.gy += (dy / dist) * step;
      } else {
        const pick = ROAD_WAYPOINTS[Math.floor(Math.random() * ROAD_WAYPOINTS.length)];
        v.tx = pick.gx;
        v.ty = pick.gy;
        v.pause = 2.5 + Math.random() * 4.5;
        if (Math.random() < 0.45) {
          v.quote = VILLAGER_QUOTES[Math.floor(Math.random() * VILLAGER_QUOTES.length)];
          v.quoteTimer = 3.4;
        }
      }
    }

    // Weather particles
    for (const sf of this.flakes) {
      sf.phase += dt * 1.5;
      sf.rot += dt * (1.2 + this.seasonBlend * 1.4);
      sf.y += sf.vy * (1 + this.seasonBlend * 0.25) * dt;
      sf.x += (sf.vx + Math.sin(sf.phase) * (14 + this.seasonBlend * 16)) * dt;
      if (sf.y > this.height + 14) { sf.y = -14; sf.x = Math.random() * this.width; }
      if (sf.x < -14) sf.x = this.width + 14;
      if (sf.x > this.width + 14) sf.x = -14;
    }

    // Golden Snitch
    if (this.snitch) {
      this.snitch.life += dt;
      this.snitch.phase += dt * 4.2;
      this.snitch.x += (this.snitch.vx + Math.sin(this.snitch.phase * 0.7) * 38) * dt;
      this.snitch.y = this.snitch.baseY + Math.sin(this.snitch.phase) * 52 + Math.cos(this.snitch.phase * 1.7) * 20;
      if (Math.random() < dt * 18) {
        this.sparkles.push({
          x: this.snitch.x + (Math.random() - 0.5) * 14,
          y: this.snitch.y + (Math.random() - 0.5) * 10,
          vx: -18 + Math.random() * 14, vy: 10 + Math.random() * 18,
          size: 3 + Math.random() * 3.5, color: '#FEF08A', shape: 'star', life: 0, maxLife: 0.55
        });
      }
      if (this.snitch.life >= this.snitch.maxLife) {
        this.snitch = null;
        this.snitchCooldown = 42 + Math.random() * 26;
      }
    } else {
      this.snitchCooldown -= dt;
      if (this.snitchCooldown <= 0) this.spawnSnitch();
    }

    // Chimney smoke & active building production steam/sparks
    if (Math.random() < dt * 4.5) {
      const pChalet = gridToWorld(state.chalet.gx + 0.5, state.chalet.gy + 0.5);
      this._emitSmoke(pChalet.x + 28, pChalet.y - 118);
    }
    for (const st of state.stations) {
      if (!st.built || st.wrapped) continue;
      const busy = st.queue.length > 0;
      if (Math.random() < dt * (busy ? 7.2 : 1.5)) {
        const def = STATIONS[st.type];
        const p = gridToWorld(st.gx + 0.5, st.gy + 0.5);
        let col = '#EBF5FF';
        if (busy) {
          const activeId = st.queue[0]?.itemId;
          col = activeId?.includes('matcha') ? '#BBF7D0'
            : activeId === 'butterbeer' ? '#FDE68A'
            : '#FFF7E6';
        }
        this._emitSmoke(p.x + def.chimneyOffset.x * 165, p.y + def.chimneyOffset.y * 155, col);
      }
      // Subtle festive production sparkles while working
      if (busy && Math.random() < dt * 3.5) {
        const p = gridToWorld(st.gx + 1, st.gy + 1);
        const col = st.type === 'teahouse' ? '#86EFAC'
          : st.type === 'gift_workshop' ? '#F87171'
          : '#FEF08A';
        this.sparkles.push({
          x: p.x + (Math.random() - 0.5) * 65,
          y: p.y - 75 - Math.random() * 35,
          vx: (Math.random() - 0.5) * 24,
          vy: -28 - Math.random() * 24,
          size: 3.5 + Math.random() * 2.5,
          color: col, shape: 'star', life: 0, maxLife: 0.75
        });
      }
    }
    for (const d of state.decorations) {
      if (d.type === 'cauldron' && Math.random() < dt * 3.8) {
        const p = gridToWorld(d.gx + 0.5, d.gy + 0.5);
        this._emitSmoke(p.x, p.y - 54, '#86EFAC');
      }
    }

    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 9.5;
      if (s.life >= s.maxLife) this.smoke.splice(i, 1);
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.life += dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 140 * dt;
      if (sp.life >= sp.maxLife) this.sparkles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const fl = this.floaters[i];
      fl.life += dt; fl.y -= 36 * dt;
      if (fl.life >= fl.maxLife) this.floaters.splice(i, 1);
    }
    for (let i = this.swipeTrail.length - 1; i >= 0; i--) {
      this.swipeTrail[i].life += dt;
      if (this.swipeTrail[i].life >= this.swipeTrail[i].maxLife) this.swipeTrail.splice(i, 1);
    }
    // Flying HUD items
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
      if (Math.random() < dt * 26) {
        const pos = this._getSleighFlyingPos();
        this.sparkles.push({
          x: pos.x - 45 + (Math.random() - 0.5) * 24,
          y: pos.y + 10 + (Math.random() - 0.5) * 18,
          vx: -30 + Math.random() * 20, vy: 15 + Math.random() * 20,
          size: 3.5 + Math.random() * 4.5,
          color: Math.random() < 0.5 ? '#FEF08A' : '#FFFFFF',
          shape: 'star', life: 0, maxLife: 0.75
        });
      }
      if (this.sleighAnim.progress >= 1) this.sleighAnim = null;
    }

    // Owl Gift delivery
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
      x: x + (Math.random() - 0.5) * 6, y,
      vx: 10 + Math.random() * 14, vy: -26 - Math.random() * 14,
      r: 5 + Math.random() * 4, color, life: 0, maxLife: 1.7 + Math.random() * 0.7
    });
  }

  _getSleighFlyingPos() {
    const a = this.sleighAnim;
    const t = a.progress;
    const arc = Math.sin(t * Math.PI);
    return {
      x: a.startX + Math.sin(t * Math.PI * 2) * 340 + arc * 180,
      y: a.startY - arc * 290 - Math.sin(t * Math.PI * 2) * 40,
      scale: 1 + arc * 0.25,
      tilt: Math.cos(t * Math.PI) * -0.18
    };
  }

  _getBounceScale(id, now) {
    const t0 = this.bounceMap.get(id);
    if (!t0) return { sx: 1, sy: 1 };
    const elapsed = (now - t0) / 1000;
    if (elapsed > 0.36) { this.bounceMap.delete(id); return { sx: 1, sy: 1 }; }
    const wave = Math.sin(elapsed * Math.PI * 5.5) * Math.exp(-elapsed * 7.5);
    return { sx: 1 + wave * 0.14, sy: 1 - wave * 0.14 };
  }

  _mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  render(state, uiState) {
    const ctx = this.ctx;
    const now = performance.now();
    const sec = now * 0.001;
    const ev = this.eveningFactor;
    const aut = this.seasonBlend;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Sky / Valley Backdrop + Night Stars + Aurora
    this._drawBackdrop(ctx, ev, aut, sec);

    // 2. Camera Transform
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.5);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);

    // 3. Terrain, Walkways, Pond + Wooden Dock + Swimming Ducks
    this._drawTerrain(ctx, state, uiState, sec, ev, aut);

    // 4. Depth-Sorted 2.5D Render List
    const drawList = this._buildDrawList(state, uiState, now, sec, aut, ev);
    drawList.sort((a, b) => a.depth - b.depth);

    const glowSpots = [];
    for (const item of drawList) item.draw(ctx, glowSpots);

    // 5. Ghosted Placement Preview
    if ((uiState.mode === 'place' || uiState.mode === 'move') && uiState.previewTile) {
      this._drawGhostPreview(ctx, state, uiState);
    }

    // 6. Chimney Smoke & Magic Steam
    for (const s of this.smoke) {
      const p = s.life / s.maxLife;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = (1 - p) * 0.44;
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
        ctx.drawImage(spr, -105, -95, 210, 186);
        ctx.restore();
      }
    }

    // 8. Flying Golden Snitch
    if (this.snitch) {
      const spr = sprites.get('golden_snitch');
      const flap = 1 + Math.sin(sec * 28) * 0.12;
      ctx.save();
      ctx.translate(this.snitch.x, this.snitch.y);
      const sg = ctx.createRadialGradient(0, 0, 4, 0, 0, 42);
      sg.addColorStop(0, 'rgba(254, 240, 138, 0.78)');
      sg.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();
      ctx.scale(flap, 1 / flap);
      if (spr) ctx.drawImage(spr, -44, -28, 88, 56);
      ctx.restore();
    }

    // 9. Warm Evening Lights
    if (ev > 0.08) this._drawWarmLights(ctx, glowSpots, ev, sec);

    // 10. Sparkles & Hearts
    for (const sp of this.sparkles) {
      const alpha = 1 - sp.life / sp.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sp.x, sp.y);
      ctx.fillStyle = sp.color;
      if (sp.shape === 'heart') this._drawHeart(ctx, 0, 0, sp.size * 1.4);
      else this._drawStar(ctx, 0, 0, sp.size);
      ctx.restore();
    }

    // 11. Floating Text Popups
    for (const fl of this.floaters) {
      const p = fl.life / fl.maxLife;
      const alpha = p < 0.72 ? 1 : (1 - p) / 0.28;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 17px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
      const iconImg = fl.iconId ? sprites.getIconImg(fl.iconId) : null;
      const tw = ctx.measureText(fl.text).width;
      const pillW = tw + 24 + (iconImg ? 26 : 0);
      const pillH = 30;
      ctx.fillStyle = 'rgba(42, 24, 14, 0.85)';
      this._roundRect(ctx, fl.x - pillW * 0.5, fl.y - pillH * 0.5, pillW, pillH, 15);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 224, 130, 0.82)';
      ctx.lineWidth = 2;
      ctx.stroke();

      let tx = fl.x - pillW * 0.5 + 12;
      if (iconImg) { ctx.drawImage(iconImg, tx - 2, fl.y - 12, 24, 24); tx += 26; }
      ctx.fillStyle = fl.color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(fl.text, tx, fl.y + 1);
      ctx.restore();
    }

    ctx.restore(); // end camera transform

    // 12. Screen-Space Evening Mood Glaze
    if (ev > 0.05) this._drawEveningOverlay(ctx, ev, aut);

    // 13. Weather Particles (Snow / Autumn Leaves / Fireflies)
    ctx.save();
    for (const sf of this.flakes) {
      ctx.globalAlpha = sf.alpha * (0.75 + ev * 0.25);
      if (aut > 0.5) {
        ctx.save();
        ctx.translate(sf.x, sf.y);
        ctx.rotate(sf.rot);
        ctx.fillStyle = sf.leafColor;
        ctx.beginPath(); ctx.ellipse(0, 0, sf.r * 2.1, sf.r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (aut > 0.35 && ev > 0.25) {
      for (const ff of this.fireflies) {
        const fx = (ff.x + Math.sin(sec * ff.speed + ff.phase) * 45 + this.width) % this.width;
        const fy = (ff.y + Math.cos(sec * ff.speed * 0.8 + ff.phase) * 35 + this.height) % this.height;
        ctx.globalAlpha = (0.35 + 0.65 * Math.sin(sec * 3.2 + ff.phase)) * aut * ev;
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // 14. Flying HUD Item & Coin Bezier Arcs!
    for (const fh of this.flyingHudItems) {
      const u = 1 - fh.t;
      const x = u * u * fh.sx + 2 * u * fh.t * fh.cx + fh.t * fh.t * fh.tx;
      const y = u * u * fh.sy + 2 * u * fh.t * fh.cy + fh.t * fh.t * fh.ty;
      const scale = 1.15 - fh.t * 0.45;
      const img = sprites.getIconImg(fh.iconId);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      if (img) ctx.drawImage(img, -14, -14, 28, 28);
      ctx.restore();
    }

    // 15. Owl Gift Delivery
    if (this.giftParachute) this._drawParachuteGift(ctx, this.giftParachute.progress);

    // 16. Magic Swipe Trail
    if (this.swipeTrail.length > 1) this._drawSwipeTrail(ctx);

    ctx.restore();
  }

  _drawBackdrop(ctx, ev, aut, sec) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    const dayTopR = this._mix(188, 224, aut), dayTopG = this._mix(226, 206, aut), dayTopB = this._mix(250, 152, aut);
    const dayBotR = this._mix(225, 240, aut), dayBotG = this._mix(242, 221, aut), dayBotB = this._mix(254, 174, aut);
    const nTopR = this._mix(18, 32, aut), nTopG = this._mix(34, 24, aut), nTopB = this._mix(78, 64, aut);
    const nBotR = this._mix(32, 52, aut), nBotG = this._mix(58, 40, aut), nBotB = this._mix(108, 86, aut);
    grad.addColorStop(0, `rgb(${this._mix(dayTopR, nTopR, ev)},${this._mix(dayTopG, nTopG, ev)},${this._mix(dayTopB, nTopB, ev)})`);
    grad.addColorStop(1, `rgb(${this._mix(dayBotR, nBotR, ev)},${this._mix(dayBotG, nBotG, ev)},${this._mix(dayBotB, nBotB, ev)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Twinkling Night Stars
    if (ev > 0.4) {
      const sa = (ev - 0.4) / 0.6;
      ctx.save();
      for (const st of this.nightStars) {
        ctx.globalAlpha = sa * (0.35 + 0.65 * Math.sin(sec * 2.5 + st.phase));
        ctx.fillStyle = '#FFFDF5';
        ctx.beginPath(); ctx.arc(st.rx * this.width, st.ry * this.height, st.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Northern Lights in Winter Night
    if (ev > 0.45 && aut < 0.7) {
      const aAlpha = ((ev - 0.45) / 0.55) * (1 - aut) * 0.28;
      ctx.save();
      ctx.globalAlpha = aAlpha;
      const aur = ctx.createLinearGradient(0, 0, this.width, this.height * 0.32);
      aur.addColorStop(0, 'rgba(52, 211, 153, 0)');
      aur.addColorStop(0.32, 'rgba(52, 211, 153, 0.78)');
      aur.addColorStop(0.65, 'rgba(56, 189, 248, 0.68)');
      aur.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.fillStyle = aur;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= this.width; x += 60) {
        const y = this.height * 0.16 + Math.sin(x * 0.006 + sec * 0.6) * 28 + Math.cos(x * 0.011 - sec * 0.4) * 14;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.width, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  _drawTerrain(ctx, state, uiState, sec, ev, aut) {
    const pTop = gridToWorld(-1.6, -1.6);
    const pRight = gridToWorld(GRID_SIZE + 1.6, -1.6);
    const pBot = gridToWorld(GRID_SIZE + 1.6, GRID_SIZE + 1.6);
    const pLeft = gridToWorld(-1.6, GRID_SIZE + 1.6);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pTop.x, pTop.y); ctx.lineTo(pRight.x, pRight.y); ctx.lineTo(pBot.x, pBot.y); ctx.lineTo(pLeft.x, pLeft.y);
    ctx.closePath();

    const g1 = `rgb(${this._mix(245, 198, aut)},${this._mix(250, 216, aut)},${this._mix(255, 128, aut)})`;
    const g2 = `rgb(${this._mix(235, 178, aut)},${this._mix(245, 200, aut)},${this._mix(255, 108, aut)})`;
    const g3 = `rgb(${this._mix(220, 158, aut)},${this._mix(236, 182, aut)},${this._mix(249, 92, aut)})`;
    const meadowGrad = ctx.createLinearGradient(pTop.x, pTop.y, pBot.x, pBot.y);
    meadowGrad.addColorStop(0, g1); meadowGrad.addColorStop(0.5, g2); meadowGrad.addColorStop(1, g3);
    ctx.fillStyle = meadowGrad;
    ctx.fill();

    const driftCol = aut > 0.5 ? '245, 224, 152' : '255, 255, 255';
    for (const d of this.groundDrifts) {
      ctx.fillStyle = `rgba(${driftCol}, ${d.alpha})`;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Locked land zones
    const unlocked = new Set(state.unlockedLands || []);
    for (const zone of LAND_ZONES) {
      if (unlocked.has(zone.id)) continue;
      const b = zone.bounds;
      const zt = gridToWorld(b.x0, b.y0), zr = gridToWorld(b.x1 + 1, b.y0), zb = gridToWorld(b.x1 + 1, b.y1 + 1), zl = gridToWorld(b.x0, b.y1 + 1);
      ctx.beginPath(); ctx.moveTo(zt.x, zt.y); ctx.lineTo(zr.x, zr.y); ctx.lineTo(zb.x, zb.y); ctx.lineTo(zl.x, zl.y); ctx.closePath();
      ctx.fillStyle = aut > 0.5 ? 'rgba(92, 64, 32, 0.16)' : 'rgba(110, 155, 205, 0.16)';
      ctx.fill();
      ctx.strokeStyle = aut > 0.5 ? 'rgba(166, 98, 36, 0.42)' : 'rgba(120, 165, 215, 0.48)';
      ctx.lineWidth = 2.5; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Cobblestone Walkways + Cozy Central Village Plaza
    const plaza = gridToWorld(7.5, 4.5);
    ctx.fillStyle = aut > 0.5 ? 'rgba(105, 75, 40, 0.3)' : 'rgba(155, 190, 224, 0.45)';
    ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y + 4, 72, 36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#DFC9A8';
    ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y, 64, 31, 0, 0, Math.PI * 2); ctx.fill();

    const roadSegments = [
      [gridToWorld(4.5, 4.5), gridToWorld(11.2, 4.5)],
      [gridToWorld(7.5, 4.5), gridToWorld(7.5, 9.6)],
      [gridToWorld(4.5, 7.2), gridToWorld(11.6, 7.2)]
    ];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = aut > 0.5 ? 'rgba(105, 75, 40, 0.35)' : 'rgba(155, 190, 224, 0.52)';
    ctx.lineWidth = 44;
    for (const [a, b] of roadSegments) { ctx.beginPath(); ctx.moveTo(a.x, a.y + 3); ctx.lineTo(b.x, b.y + 3); ctx.stroke(); }
    ctx.strokeStyle = '#C9AE8C'; ctx.lineWidth = 36;
    for (const [a, b] of roadSegments) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.strokeStyle = '#DFC9A8'; ctx.lineWidth = 26;
    for (const [a, b] of roadSegments) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    const stoneCoords = [
      [5.1, 4.5], [6.0, 4.5], [6.9, 4.5], [8.1, 4.5], [9.1, 4.5], [10.1, 4.5], [10.9, 4.5],
      [7.5, 5.2], [7.5, 6.1], [7.5, 7.9], [7.5, 8.8],
      [5.2, 7.2], [6.2, 7.2], [8.4, 7.2], [9.4, 7.2], [10.4, 7.2], [11.2, 7.2]
    ];
    for (let i = 0; i < stoneCoords.length; i++) {
      const c = gridToWorld(stoneCoords[i][0], stoneCoords[i][1]);
      ctx.fillStyle = i % 2 === 0 ? '#EBDCC2' : '#D5BA94';
      ctx.beginPath();
      ctx.ellipse(c.x - 8, c.y - 2, 11, 5.2, 0.22, 0, Math.PI * 2);
      ctx.ellipse(c.x + 9, c.y + 3, 10, 4.8, -0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scenic Valley Pond + Wooden Dock + Swimming Autumn Ducks / Winter Ice Swirls!
    const pond = gridToWorld(13.8, 15.2);
    ctx.save();
    ctx.translate(pond.x, pond.y);
    ctx.fillStyle = aut > 0.5 ? '#8FA368' : '#B8D4EC';
    ctx.beginPath(); ctx.ellipse(0, 6, 155, 74, -0.1, 0, Math.PI * 2); ctx.fill();
    const iceG = ctx.createRadialGradient(-30, -14, 16, 0, 0, 150);
    if (aut > 0.5) {
      iceG.addColorStop(0, '#7DD3FC'); iceG.addColorStop(0.55, '#2A8BB5'); iceG.addColorStop(1, '#1A5F80');
    } else {
      iceG.addColorStop(0, '#B5EAFF'); iceG.addColorStop(0.55, '#6CC4EE'); iceG.addColorStop(1, '#3D99CF');
    }
    ctx.fillStyle = iceG;
    ctx.beginPath(); ctx.ellipse(0, 0, 146, 68, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = aut > 0.5 ? '#D4B982' : '#FFFFFF'; ctx.lineWidth = 4; ctx.stroke();

    // Cute Wooden Jetty / Dock extending into the pond!
    ctx.fillStyle = '#9C5A2B'; ctx.strokeStyle = '#4A2408'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-118, -32); ctx.lineTo(-74, -12); ctx.lineTo(-92, 6); ctx.lineTo(-136, -14); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Planks
    ctx.strokeStyle = '#6B3710'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-104, -25); ctx.lineTo(-122, -7);
    ctx.moveTo(-90, -19); ctx.lineTo(-108, -1);
    ctx.stroke();

    if (aut > 0.5) {
      // Cute swimming golden-white duck circling gently in the autumn pond!
      const dx = Math.cos(sec * 0.55) * 46;
      const dy = Math.sin(sec * 0.55) * 18;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(dx, dy + 4, 14, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#FFFDF5'; ctx.strokeStyle = '#78350F'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(dx, dy, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(dx + 6, dy - 6, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath(); ctx.ellipse(dx + 11, dy - 5, 3, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // Shimmering Winter Ice Skate Swirls
      ctx.strokeStyle = 'rgba(255,255,255,0.52)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(15, 4, 42, 16, 0.2, 0, Math.PI * 1.4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      const gl = Math.sin(sec * 1.8) * 14;
      ctx.beginPath();
      ctx.ellipse(-28 + gl, -12, 30, 6, -0.15, 0, Math.PI * 2);
      ctx.ellipse(38 - gl * 0.7, 14, 22, 4.5, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Build / Move Grid Overlay
    if (uiState.mode === 'move' || uiState.mode === 'place') {
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.28)'; ctx.lineWidth = 1.5;
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
        ctx.fillStyle = valid ? 'rgba(34, 197, 94, 0.42)' : 'rgba(239, 68, 68, 0.45)';
        ctx.fill();
        ctx.strokeStyle = valid ? '#16A34A' : '#DC2626'; ctx.lineWidth = 3.5; ctx.stroke();
      }
    }
    ctx.restore();
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
    ctx.globalAlpha = pt.valid ? 0.78 : 0.42;
    const w = (pt.size || 1) === 2 ? 215 : spriteKey === 'snow_field_plot' ? 124 : 96;
    const h = (w * spr.height) / spr.width;
    const yOff = spriteKey === 'snow_field_plot' ? -h * 0.5 : -h + 16;
    ctx.drawImage(spr, pos.x - w * 0.5, pos.y + yOff, w, h);
    ctx.restore();
  }

  _buildDrawList(state, uiState, now, sec, aut, ev) {
    const list = [];
    const levelInfo = getLevelInfo(state.xp);
    const unlockedLands = new Set(state.unlockedLands || []);

    // A) 3D Surrounding Valley Forest
    const pineImg = sprites.get('deco_pine');
    const autumnTreeImg = sprites.get('deco_autumn_tree');
    for (const t of this.borderTrees) {
      const img = aut > 0.5 && t.autumnVariant && autumnTreeImg ? autumnTreeImg : pineImg;
      if (!img) continue;
      const pos = gridToWorld(t.gx + 0.5, t.gy + 0.5);
      list.push({
        depth: t.gx + t.gy,
        draw: (ctx) => {
          const w = 114 * t.scale;
          const h = (w * img.height) / img.width;
          const sway = Math.sin(sec * 1.1 + t.phase) * 0.025;
          this._drawShadow(ctx, pos.x, pos.y + 4, w * 0.36, w * 0.16);
          ctx.save();
          ctx.translate(pos.x, pos.y + 8);
          ctx.rotate(sway);
          ctx.drawImage(img, -w * 0.5, -h + 10, w, h);
          ctx.restore();
        }
      });
    }

    // B) Land Expansion Wooden Signs
    for (const zone of LAND_ZONES) {
      if (unlockedLands.has(zone.id)) continue;
      const pos = gridToWorld(zone.signPos.gx + 0.5, zone.signPos.gy + 0.5);
      list.push({
        depth: zone.signPos.gx + zone.signPos.gy + 0.25,
        draw: (ctx) => {
          ctx.save();
          ctx.translate(pos.x, pos.y + Math.sin(sec * 2.4) * 2);
          this._drawShadow(ctx, 0, 8, 30, 12);
          ctx.fillStyle = '#7C3F1A'; ctx.strokeStyle = '#3E1D09'; ctx.lineWidth = 2.5;
          ctx.fillRect(-5, -34, 10, 40); ctx.strokeRect(-5, -34, 10, 40);
          ctx.fillStyle = '#FFF7E0'; ctx.strokeStyle = '#8C4818'; ctx.lineWidth = 3;
          this._roundRect(ctx, -58, -68, 116, 40, 11); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#4A240E'; ctx.font = '900 12px ui-rounded, system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`🗺️ ${zone.cost} ★`, 0, -54);
          ctx.font = '700 10px ui-rounded, system-ui, sans-serif'; ctx.fillStyle = '#9A531C';
          ctx.fillText(`Ab Lv.${zone.unlockLevel}`, 0, -39);
          ctx.restore();
        }
      });
    }

    // C) Wild Forageable Forest Schwammerl (3D!)
    const wildImg = sprites.get('wild_mushroom');
    for (const wm of state.wildMushrooms || []) {
      const pos = gridToWorld(wm.gx + 0.5, wm.gy + 0.5);
      list.push({
        depth: wm.gx + wm.gy + 0.2,
        draw: (ctx) => {
          const pulse = 1 + Math.sin(sec * 3.4 + wm.gx) * 0.045;
          this._drawShadow(ctx, pos.x, pos.y + 6, 36, 16);
          ctx.save();
          ctx.translate(pos.x, pos.y + 10);
          ctx.scale(pulse, pulse);
          if (wildImg) ctx.drawImage(wildImg, -44, -76, 88, 80);
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(sec * 4.5 + wm.gx);
          ctx.fillStyle = '#FEF08A';
          this._drawStar(ctx, pos.x + 18, pos.y - 64, 6);
          ctx.restore();
        }
      });
    }

    // D) Farm Field Plots with TRUE 4-Stage Crop Growth!
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
            ctx.drawImage(fieldImg, -TILE_W * 0.54, -TILE_H * 0.62, TILE_W * 1.08, TILE_H * 1.28);
          }

          if (crop) {
            if (isReady) {
              const cImg = sprites.get('crop_' + crop.id);
              const sway = Math.sin(sec * 2.4 + f.gx * 0.9 + f.gy) * 0.032;
              const pulse = 1 + Math.sin(sec * 3.2 + f.gx) * 0.025;
              ctx.save();
              ctx.translate(0, 12);
              ctx.rotate(sway);
              ctx.scale(pulse, pulse);
              if (cImg) ctx.drawImage(cImg, -50, -74, 100, 84);
              ctx.restore();

              const spAlpha = 0.45 + 0.55 * Math.sin(sec * 4 + f.gx * 2 + f.gy);
              ctx.save(); ctx.globalAlpha = spAlpha; ctx.fillStyle = '#FEF08A';
              this._drawStar(ctx, 22, -26, 6);
              ctx.restore();
            } else {
              this._draw4StageCrop(ctx, crop, pct, sec + f.gx);
            }
          }

          if (uiState.selectedMoveId === f.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.ellipse(0, 0, 52, 26, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.restore();
        }
      });
    }

    // E) Hero Farmhouse Chalet
    {
      const c = state.chalet;
      const pos = gridToWorld(c.gx + 1, c.gy + 1);
      list.push({
        depth: c.gx + c.gy + 1.5,
        draw: (ctx, glows) => {
          const spr = sprites.get('winter_chalet');
          const b = this._getBounceScale('chalet', now);
          this._drawShadow(ctx, pos.x, pos.y + 6, 108, 52);
          ctx.save();
          ctx.translate(pos.x, pos.y + 18);
          ctx.scale(b.sx, b.sy);
          if (spr) ctx.drawImage(spr, -124, -222, 248, 238);
          ctx.restore();
          glows.push({ x: pos.x - 36, y: pos.y - 54, r: 95 });
          glows.push({ x: pos.x + 42, y: pos.y - 42, r: 85 });
        }
      });
    }

    // F) Central Village Landmark Tree (3D Christmas Tree ↔ 3D Grand Autumn Maple & Pumpkins!)
    {
      const tr = state.christmasTree;
      const pos = gridToWorld(tr.gx + 1, tr.gy + 1);
      const stageScale = levelInfo.treeStage === 1 ? 0.85 : levelInfo.treeStage === 2 ? 0.96 : 1.08;
      list.push({
        depth: tr.gx + tr.gy + 1.5,
        draw: (ctx, glows) => {
          const spr = aut > 0.5 ? sprites.get('autumn_tree_landmark') : sprites.get('christmas_tree');
          const b = this._getBounceScale('christmasTree', now);
          const sway = Math.sin(sec * 1.1) * 0.014;
          this._drawShadow(ctx, pos.x, pos.y + 8, 88 * stageScale, 42 * stageScale);
          ctx.save();
          ctx.translate(pos.x, pos.y + 18);
          ctx.rotate(sway);
          ctx.scale(b.sx * stageScale, b.sy * stageScale);
          if (spr) {
            const w = aut > 0.5 ? 228 : 192;
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 18, w, h);
          }
          if (aut <= 0.5) {
            const starPulse = 1 + Math.sin(sec * 3.8) * 0.22;
            const sg = ctx.createRadialGradient(0, -234, 2, 0, -234, 34 * starPulse);
            sg.addColorStop(0, 'rgba(255, 250, 190, 0.95)');
            sg.addColorStop(0.5, 'rgba(255, 210, 75, 0.45)');
            sg.addColorStop(1, 'rgba(255, 210, 75, 0)');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(0, -234, 34 * starPulse, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
          glows.push({ x: pos.x, y: pos.y - 110 * stageScale, r: 155 * stageScale });
        }
      });
    }

    // G) Wishlist Notice Board
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
          this._drawShadow(ctx, pos.x, pos.y + 6, 48, 22);
          ctx.save();
          ctx.translate(pos.x, pos.y + 12); ctx.scale(b.sx, b.sy);
          if (spr) ctx.drawImage(spr, -58, -126, 116, 138);
          ctx.restore();
          glows.push({ x: pos.x - 38, y: pos.y - 36, r: 62 });
          if (readyOrders > 0) this._drawActionBadge(ctx, pos.x + 26, pos.y - 118 + Math.sin(sec * 4) * 4, '🛷', '#16A34A');
        }
      });
    }

    // H) Parked Reindeer Sleigh
    if (!this.sleighAnim || !this.sleighAnim.active) {
      const sp = state.sleighPos;
      const pos = gridToWorld(sp.gx + 0.5, sp.gy + 0.5);
      list.push({
        depth: sp.gx + sp.gy + 0.6,
        draw: (ctx) => {
          const spr = sprites.get('reindeer_sleigh');
          const bob = Math.sin(sec * 2.2) * 2.5;
          this._drawShadow(ctx, pos.x, pos.y + 10, 88, 38);
          if (spr) ctx.drawImage(spr, pos.x - 102, pos.y - 134 + bob, 204, 180);
        }
      });
    }

    // I) Eulenpost Mailbox
    {
      const mb = state.mailbox;
      const pos = gridToWorld(mb.gx + 0.5, mb.gy + 0.5);
      list.push({
        depth: mb.gx + mb.gy + 0.4,
        draw: (ctx) => {
          const spr = sprites.get('gift_mailbox');
          const b = this._getBounceScale('mailbox', now);
          this._drawShadow(ctx, pos.x, pos.y + 6, 34, 16);
          ctx.save();
          ctx.translate(pos.x, pos.y + 10); ctx.scale(b.sx, b.sy);
          if (spr) ctx.drawImage(spr, -36, -110, 72, 122);
          ctx.restore();
          this._drawActionBadge(ctx, pos.x + 18, pos.y - 106 + Math.sin(sec * 3.1) * 3.5, '🦉', '#B91C1C');
        }
      });
    }

    // J) Production Stations (Wrapped Construction Ribbon OR Active Live Production Animations!)
    for (const st of state.stations) {
      if (!st.built) continue;
      const def = STATIONS[st.type];
      const pos = gridToWorld(st.gx + 1, st.gy + 1);
      const isWorking = !st.wrapped && st.queue.length > 0;
      const readyCount = st.ready.length;
      const mastery = getStationMastery(st.craftedCount || 0);

      list.push({
        depth: st.gx + st.gy + 1.5,
        draw: (ctx, glows) => {
          const b = this._getBounceScale(st.id, now);
          this._drawShadow(ctx, pos.x, pos.y + 8, 96, 46);

          if (st.wrapped) {
            // Hay-Day Red-Ribbon Wrapped Construction Crate waiting to be unwrapped!
            this._drawWrappedConstruction(ctx, pos.x, pos.y, sec, b);
            return;
          }

          const spr = sprites.get(def.sprite);
          const workPulse = isWorking ? 1 + Math.sin(sec * 5.6) * 0.025 : 1;
          ctx.save();
          ctx.translate(pos.x, pos.y + 18);
          ctx.scale(b.sx * workPulse, b.sy / workPulse);
          if (spr) {
            const w = st.type === 'teahouse' ? 208 : 232;
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 16, w, h);
          }

          // LIVE PRODUCTION ANIMATIONS right on the building (like Hay Day!)
          if (isWorking) {
            if (st.type === 'teahouse') {
              // Animated wooden stirring spoon circling inside the copper cauldron!
              const sx = -42 + Math.cos(sec * 4.5) * 11;
              const sy = -76 + Math.sin(sec * 4.5) * 4;
              ctx.save();
              ctx.strokeStyle = '#6B3410'; ctx.lineWidth = 6; ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(sec * 4.5) * 7, sy - 26); ctx.stroke();
              ctx.strokeStyle = '#DF9E5E'; ctx.lineWidth = 3;
              ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.sin(sec * 4.5) * 7, sy - 25); ctx.stroke();
              ctx.restore();
            } else if (st.type === 'bakery') {
              // Pulsing warm oven embers glow at the arched oven window!
              const og = ctx.createRadialGradient(-26, -78, 4, -26, -78, 32 + Math.sin(sec * 8) * 6);
              og.addColorStop(0, 'rgba(255, 240, 150, 0.72)');
              og.addColorStop(1, 'rgba(255, 160, 40, 0)');
              ctx.fillStyle = og;
              ctx.beginPath(); ctx.arc(-26, -78, 38, 0, Math.PI * 2); ctx.fill();
            } else if (st.type === 'patisserie') {
              // Sparkling golden shimmer inside the pastry showcase!
              ctx.fillStyle = '#FEF08A';
              ctx.globalAlpha = 0.5 + 0.5 * Math.sin(sec * 6);
              this._drawStar(ctx, -12, -58, 7);
              this._drawStar(ctx, 10, -48, 5);
              ctx.globalAlpha = 1;
            } else if (st.type === 'gift_workshop') {
              // Rotating festive ribbon star above porch!
              ctx.save();
              ctx.translate(10, -110);
              ctx.rotate(sec * 2.5);
              ctx.fillStyle = '#FACC15';
              this._drawStar(ctx, 0, 0, 9);
              ctx.restore();
            }
          }
          ctx.restore();

          // Display earned Mastery Stars cleanly near base of building!
          if (mastery.stars > 0) {
            ctx.save();
            ctx.font = '900 13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FACC15';
            ctx.strokeStyle = '#4A240E';
            ctx.lineWidth = 3;
            const starsStr = '★'.repeat(mastery.stars);
            ctx.strokeText(starsStr, pos.x, pos.y + 24);
            ctx.fillText(starsStr, pos.x, pos.y + 24);
            ctx.restore();
          }

          if (uiState.selectedMoveId === st.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(pos.x, pos.y + 6, 98, 48, 0, 0, Math.PI * 2); ctx.stroke();
          }

          for (const gp of def.glowPoints) {
            glows.push({ x: pos.x + gp.x * 200, y: pos.y + gp.y * 190, r: gp.r * 260 });
          }

          if (readyCount > 0) {
            this._drawCollectBubble(ctx, pos.x, pos.y - 178 + Math.sin(sec * 4.2) * 5, st.ready[0], readyCount);
          } else if (isWorking) {
            const job = st.queue[0];
            const recipe = ITEMS[job.itemId];
            const totalMs = recipe.craftTime * mastery.speedMult * 1000;
            const pct = Math.min(1, Math.max(0, 1 - (job.finishAt - Date.now()) / totalMs));
            this._drawMiniProgress(ctx, pos.x, pos.y - 155, pct, job.itemId);
          }
        }
      });
    }

    // K) Autonomous Walking & Sleeping Cozy Animals!
    const isNightSleep = ev > 0.72;
    for (const an of state.animals) {
      const def = ANIMALS[an.type];
      if (!def) continue;
      const mot = this.getAnimalMotion(an);
      const basePos = gridToWorld(an.gx + 0.5, an.gy + 0.5);
      const livePos = gridToWorld(an.gx + 0.5 + mot.ox, an.gy + 0.5 + mot.oy);
      const isReady = an.state === 'ready';
      const isFed = an.state === 'producing';
      const hopY = mot.hop > 0 ? Math.abs(Math.sin(mot.hop)) * -7 : 0;

      list.push({
        depth: an.gx + mot.ox + an.gy + mot.oy + 0.35,
        draw: (ctx) => {
          // Subtle cozy pasture straw/moss bed & tiny rustic wooden corner posts
          if (an.type !== 'owl') {
            ctx.save();
            ctx.fillStyle = aut > 0.5 ? 'rgba(180, 130, 62, 0.28)' : 'rgba(214, 184, 132, 0.32)';
            ctx.beginPath(); ctx.ellipse(basePos.x, basePos.y + 4, 48, 22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#8C4E1B'; ctx.strokeStyle = '#4A2408'; ctx.lineWidth = 1.6;
            ctx.fillRect(basePos.x - 42, basePos.y - 8, 6, 15); ctx.strokeRect(basePos.x - 42, basePos.y - 8, 6, 15);
            ctx.fillRect(basePos.x + 36, basePos.y - 8, 6, 15); ctx.strokeRect(basePos.x + 36, basePos.y - 8, 6, 15);
            ctx.restore();
          }

          const spr = sprites.get(def.sprite);
          const b = this._getBounceScale(an.id, now);
          const idleBob = Math.sin(sec * 2.8 + an.gx * 1.7) * 2.2;
          const size = an.type === 'chicken' ? 84 : an.type === 'owl' ? 88 : an.type === 'sheep' ? 104 : 108;
          this._drawShadow(ctx, livePos.x, livePos.y + 6, size * 0.34, size * 0.16);
          ctx.save();
          ctx.translate(livePos.x, livePos.y + 10 + idleBob + hopY);
          ctx.scale((mot.flip ? -1 : 1) * b.sx, b.sy);
          if (spr) {
            const h = (size * spr.height) / spr.width;
            ctx.drawImage(spr, -size * 0.5, -h + 10, size, h);
          }
          ctx.restore();

          if (uiState.selectedMoveId === an.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.ellipse(livePos.x, livePos.y + 4, 46, 22, 0, 0, Math.PI * 2); ctx.stroke();
          }

          // Nighttime adorable Zzz sleeping bubbles!
          if (isNightSleep && !isReady && an.type !== 'owl') {
            const zOff = (sec * 14 + an.gx * 5) % 24;
            ctx.save();
            ctx.globalAlpha = 1 - zOff / 24;
            ctx.font = '900 14px ui-rounded, system-ui, sans-serif';
            ctx.fillStyle = '#E0F2FE';
            ctx.fillText('Zzz', livePos.x + 18, livePos.y - size * 0.72 - zOff);
            ctx.restore();
          }

          if (isReady) {
            this._drawCollectBubble(ctx, livePos.x, livePos.y - size * 0.96 + Math.sin(sec * 4.5 + an.gx) * 4, def.produceItem, 1);
          } else if (isFed) {
            const pct = Math.min(1, Math.max(0, 1 - (an.readyAt - Date.now()) / (def.produceTime * 1000)));
            this._drawMiniProgress(ctx, livePos.x, livePos.y - size * 0.92, pct, def.produceItem);
          } else {
            this._drawHungryBubble(ctx, livePos.x, livePos.y - size * 0.92 + Math.sin(sec * 2.6 + an.gx) * 3, def.feedItem);
          }
        }
      });
    }

    // L) Strolling Village NPCs walking along the cobblestone walkways!
    for (const v of this.villagers) {
      const pos = gridToWorld(v.gx, v.gy);
      const walking = v.pause <= 0;
      const stepBob = walking ? Math.abs(Math.sin(sec * 9 + v.gx * 3)) * -5 : Math.sin(sec * 2.2) * -1;
      list.push({
        depth: v.gx + v.gy + 0.38,
        draw: (ctx) => {
          this._drawShadow(ctx, pos.x, pos.y + 2, 16, 7);
          ctx.save();
          ctx.translate(pos.x, pos.y + stepBob);
          // Cozy cloak body
          ctx.fillStyle = v.coat; ctx.strokeStyle = '#2B180A'; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.ellipse(0, -14, 12, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          // Head circle with friendly NPC emoji
          ctx.fillStyle = '#FFF7E6';
          ctx.beginPath(); ctx.arc(0, -32, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.font = '18px system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(v.emoji, 0, -31);
          // Speech bubble if chatting!
          if (v.quoteTimer > 0 && v.quote) {
            ctx.font = '800 11px ui-rounded, system-ui, sans-serif';
            const tw = ctx.measureText(v.quote).width;
            const bw = tw + 18;
            ctx.fillStyle = 'rgba(255, 253, 245, 0.95)';
            ctx.strokeStyle = '#C88D48'; ctx.lineWidth = 2;
            this._roundRect(ctx, -bw * 0.5, -72, bw, 24, 12); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#3B1E0D';
            ctx.fillText(v.quote, 0, -59.5);
          }
          ctx.restore();
        }
      });
    }

    // M) Placed Decorations (3D!)
    for (const d of state.decorations) {
      const def = DECORATIONS[d.type];
      if (!def) continue;
      const pos = gridToWorld(d.gx + 0.5, d.gy + 0.5);
      list.push({
        depth: d.gx + d.gy + 0.3,
        draw: (ctx, glows) => {
          const spr = sprites.get(def.sprite);
          const b = this._getBounceScale(d.id, now);
          const floatY = def.floatAnim ? Math.sin(sec * 2.4 + d.gx * 1.3) * 7 : 0;
          const w = d.type === 'lightarch' ? 132
            : (d.type === 'pine' || d.type === 'autumn_tree') ? 112
            : d.type === 'lantern' ? 78
            : d.type === 'pumpkin_lantern' ? 76
            : d.type === 'ghost' ? 84
            : 92;
          this._drawShadow(ctx, pos.x, pos.y + 6, w * 0.34, w * 0.15);
          ctx.save();
          ctx.translate(pos.x, pos.y + 10 + floatY);
          ctx.scale(b.sx, b.sy);
          if (spr) {
            const h = (w * spr.height) / spr.width;
            ctx.drawImage(spr, -w * 0.5, -h + 10, w, h);
          }
          // Animated glowing emerald bubbles rising from the magic cauldron!
          if (d.type === 'cauldron') {
            const bub = (sec * 18) % 20;
            ctx.fillStyle = '#86EFAC';
            ctx.globalAlpha = 1 - bub / 20;
            ctx.beginPath(); ctx.arc(Math.sin(sec * 3) * 10, -54 - bub, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.restore();

          if (uiState.selectedMoveId === d.id) {
            ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.ellipse(pos.x, pos.y + 4, 44, 21, 0, 0, Math.PI * 2); ctx.stroke();
          }

          if (def.glow && def.glowOffset) {
            glows.push({
              x: pos.x + def.glowOffset.x * 100,
              y: pos.y + def.glowOffset.y * 120 + floatY,
              r: def.glowOffset.r * 215
            });
          }
        }
      });
    }

    return list;
  }

  _drawWrappedConstruction(ctx, x, y, sec, b) {
    const pulse = 1 + Math.sin(sec * 4.5) * 0.04;
    ctx.save();
    ctx.translate(x, y + 12);
    ctx.scale(b.sx * pulse, b.sy * pulse);
    // Warm wooden crate isometric box
    ctx.strokeStyle = '#4A2408'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
    ctx.fillStyle = '#D99B52';
    ctx.beginPath(); ctx.moveTo(0, -108); ctx.lineTo(74, -72); ctx.lineTo(0, -36); ctx.lineTo(-74, -72); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#B87232';
    ctx.beginPath(); ctx.moveTo(-74, -72); ctx.lineTo(0, -36); ctx.lineTo(0, 14); ctx.lineTo(-74, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9A5B22';
    ctx.beginPath(); ctx.moveTo(74, -72); ctx.lineTo(0, -36); ctx.lineTo(0, 14); ctx.lineTo(74, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Glossy Festive Red Ribbon Cross!
    ctx.fillStyle = '#DC2626'; ctx.strokeStyle = '#7F1D1D'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-42, -56); ctx.lineTo(-28, -50); ctx.lineTo(-28, 0); ctx.lineTo(-42, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, -56); ctx.lineTo(28, -50); ctx.lineTo(28, 0); ctx.lineTo(42, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Big Glossy Bow on Top!
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.ellipse(-22, -96, 24, 13, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(22, -96, 24, 13, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -90, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // "Tippen zum Auspacken!" floating pill
    ctx.fillStyle = '#FFFDF5'; ctx.strokeStyle = '#D97706'; ctx.lineWidth = 2.5;
    this._roundRect(ctx, -64, -148 + Math.sin(sec * 5) * 4, 128, 28, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8A1C17'; ctx.font = '900 12px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🎀 Auspacken!', 0, -134 + Math.sin(sec * 5) * 4);
    ctx.restore();
  }

  _draw4StageCrop(ctx, crop, pct, phase) {
    const sway = Math.sin(phase * 2.2) * 0.04;
    ctx.save();
    ctx.rotate(sway);
    const pts = [[-22, -4], [0, -12], [22, -4], [-10, 8], [12, 8]];

    if (pct < 0.22) {
      // STAGE 0: Freshly planted seeds & tiny soil mounds!
      for (const [ox, oy] of pts) {
        ctx.fillStyle = '#5C3014';
        ctx.beginPath(); ctx.ellipse(ox, oy, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath(); ctx.arc(ox - 2, oy - 2, 2.2, 0, Math.PI * 2); ctx.arc(ox + 2.5, oy - 1, 2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pct < 0.58) {
      // STAGE 1: Tender young sprouts emerging!
      const s = 0.55 + ((pct - 0.22) / 0.36) * 0.35;
      for (const [ox, oy] of pts) {
        ctx.fillStyle = '#4ADE80'; ctx.strokeStyle = '#166534'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(ox - 5 * s, oy - 8 * s, 7 * s, 4 * s, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(ox + 5 * s, oy - 8 * s, 7 * s, 4 * s, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else {
      // STAGE 2: Lush mid-growth showing crop-specific buds!
      const s = 0.88 + ((pct - 0.58) / 0.42) * 0.25;
      for (const [ox, oy] of pts) {
        ctx.fillStyle = '#2E9E46'; ctx.strokeStyle = '#14532D'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(ox - 7 * s, oy - 10 * s, 9 * s, 5.5 * s, -0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(ox + 7 * s, oy - 10 * s, 9 * s, 5.5 * s, 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Crop-specific budding shapes
        ctx.fillStyle = crop.color;
        if (crop.id === 'mushroom') {
          ctx.beginPath(); ctx.arc(ox, oy - 14 * s, 6.5 * s, Math.PI, 0); ctx.fill();
        } else if (crop.id === 'pumpkin') {
          ctx.beginPath(); ctx.ellipse(ox, oy - 12 * s, 7.5 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(ox, oy - 15 * s, 5.5 * s, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // Crisp circular growth progress ring
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.arc(0, -30, 10, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * pct); ctx.stroke();
    ctx.restore();
  }

  _drawShadow(ctx, x, y, rx, ry) {
    ctx.fillStyle = this.seasonBlend > 0.5 ? 'rgba(54, 40, 18, 0.22)' : 'rgba(42, 74, 118, 0.22)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }

  _drawCollectBubble(ctx, x, y, itemId, count) {
    ctx.save();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.48)';
    ctx.beginPath(); ctx.arc(x, y, 29, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFDF5'; ctx.strokeStyle = '#D97706'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const img = sprites.getIconImg(itemId);
    if (img) ctx.drawImage(img, x - 16, y - 16, 32, 32);
    if (count > 1) {
      ctx.fillStyle = '#E62937'; ctx.beginPath(); ctx.arc(x + 17, y - 16, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(count), x + 17, y - 15.5);
    }
    ctx.restore();
  }

  _drawHungryBubble(ctx, x, y, feedItemId) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(255, 253, 245, 0.94)'; ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const img = sprites.getIconImg(feedItemId);
    if (img) ctx.drawImage(img, x - 11, y - 11, 22, 22);
    ctx.restore();
  }

  _drawActionBadge(ctx, x, y, emoji, bgColor) {
    ctx.save();
    ctx.fillStyle = bgColor; ctx.strokeStyle = '#FFFDF5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '18px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y + 1);
    ctx.restore();
  }

  _drawMiniProgress(ctx, x, y, pct, itemId) {
    ctx.save();
    const w = 68, h = 22;
    ctx.fillStyle = 'rgba(42, 24, 14, 0.8)';
    this._roundRect(ctx, x - w * 0.5, y - h * 0.5, w, h, 11); ctx.fill();
    const bx = x - 10, bw = 38;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this._roundRect(ctx, bx, y - 4, bw, 8, 4); ctx.fill();
    ctx.fillStyle = '#FACC15';
    this._roundRect(ctx, bx, y - 4, Math.max(4, bw * pct), 8, 4); ctx.fill();
    const img = sprites.getIconImg(itemId);
    if (img) ctx.drawImage(img, x - w * 0.5 + 3, y - 9, 18, 18);
    ctx.restore();
  }

  _drawWarmLights(ctx, glowSpots, ev, sec) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const intensity = Math.min(1, ev * 1.2);
    for (let i = 0; i < glowSpots.length; i++) {
      const g = glowSpots[i];
      const flicker = 0.92 + Math.sin(sec * 3.6 + i * 2.1) * 0.08;
      const rad = g.r * flicker;
      const grad = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, rad);
      grad.addColorStop(0, `rgba(255, 224, 130, ${0.46 * intensity})`);
      grad.addColorStop(0.5, `rgba(255, 178, 68, ${0.2 * intensity})`);
      grad.addColorStop(1, 'rgba(255, 160, 40, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(g.x, g.y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawEveningOverlay(ctx, ev, aut) {
    ctx.save();
    const duskBell = Math.sin(ev * Math.PI);
    if (duskBell > 0.05) {
      ctx.fillStyle = `rgba(255, 148, 66, ${duskBell * (0.14 + aut * 0.05)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (ev > 0.25) {
      const nightAmt = (ev - 0.25) / 0.75;
      ctx.fillStyle = aut > 0.5
        ? `rgba(26, 20, 58, ${nightAmt * 0.34})`
        : `rgba(18, 34, 78, ${nightAmt * 0.32})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.restore();
  }

  _drawParachuteGift(ctx, p) {
    const x = this.width * 0.5 + Math.sin(p * Math.PI * 3) * 48 * (1 - p);
    const y = -60 + p * (this.height * 0.56);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.cos(p * Math.PI * 3) * 0.12);
    const owl = sprites.get('animal_owl');
    if (owl) ctx.drawImage(owl, -32, -74, 64, 74);
    const giftImg = sprites.getIconImg('mega_gift');
    if (giftImg) ctx.drawImage(giftImg, -24, -4, 48, 48);
    ctx.restore();
  }

  _drawSwipeTrail(ctx) {
    ctx.save();
    for (let i = 1; i < this.swipeTrail.length; i++) {
      const a = this.swipeTrail[i - 1], b = this.swipeTrail[i];
      const alpha = Math.max(0, 1 - b.life / b.maxLife);
      ctx.strokeStyle = b.mode === 'harvest'
        ? `rgba(254, 240, 138, ${alpha * 0.9})`
        : `rgba(134, 239, 172, ${alpha * 0.9})`;
      ctx.lineWidth = 10 * alpha; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  _drawStar(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r : r * 0.36;
      const px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  _drawHeart(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.35, x - s * 0.5, y - s, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s, x + s, y - s * 0.35, x, y + s * 0.35);
    ctx.fill();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
}
