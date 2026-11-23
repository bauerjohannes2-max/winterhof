// ============================================================================
// WINTERHOF v6 — PixiJS v8 WebGL 2.5D Supercell-Hybrid World Engine
// Single-Source-of-Truth WorldGrid · 12-Rule Spatial Validator · A* Villagers
// Aligned Bridge · Grounded Isometric Footprints · Zero-GC Pools · Zero Emojis
// ============================================================================
import { Application, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { LAND_ZONES, ITEMS, ANIMALS, getLevelInfo, getStationMastery } from './gameData.js';
import { GpuTextures } from './engine/textures.js';
import { WorldGrid, SURFACE } from './engine/worldGrid.js';
import { validateWorld } from './engine/worldValidator.js';
import { TerrainLayer } from './engine/terrainLayer.js';
import { LightingLayer } from './engine/lightingLayer.js';
import { ParticleSystem } from './engine/particles.js';

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

// Clean unlocked lakeside corner tile inside the estate (never touching fence or water!)
export const DAILY_CHEST_POS = { gx: 11, gy: 11 };

const VILLAGER_QUOTES = [
  'Es duftet nach frischem Gebäck.',
  'Wunderbarer Wintertag im Tal.',
  'Ein warmer Punsch wäre fein.',
  'So ordentlich und friedlich hier.',
  'Die Laternen leuchten wunderschön.'
];

// Strictly valid WorldGrid walkable ROAD / PLAZA / BRIDGE destinations for A* pathfinding
const ROAD_DESTINATIONS = [
  { gx: 2, gy: 6 },
  { gx: 4, gy: 6 },
  { gx: 4, gy: 7 },
  { gx: 5, gy: 5 },
  { gx: 6, gy: 6 },
  { gx: 8, gy: 5 },
  { gx: 9, gy: 5 },
  { gx: 10, gy: 6 },
  { gx: 12, gy: 6 },
  { gx: 14, gy: 6 }, // Bridge crossing!
  { gx: 15, gy: 6 }
];

const STATION_SPRITES = {
  bakery: 'christmas_bakery',
  teahouse: 'punch_stand',
  patisserie: 'patisserie_house',
  gift_workshop: 'gift_workshop'
};

const ANIMAL_SPRITES = {
  chicken: 'animal_chicken',
  reindeer: 'animal_reindeer',
  sheep: 'animal_sheep'
};

const DECO_SPRITES = {
  pine: 'deco_pine',
  snowman: 'deco_snowman',
  lantern: 'deco_lantern'
};

function makeSeededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class WinterWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth || 1280;
    this.height = window.innerHeight || 720;

    // Single Source of Truth World Grid
    this.grid = new WorldGrid();

    // Centered cleanly on the composed Alpine Village heart in Landscape framing
    const center = gridToWorld(7.6, 6.8);
    this.cam = {
      x: center.x + 12,
      y: center.y - 12,
      zoom: 0.88,
      targetZoom: null,
      vx: 0,
      vy: 0
    };

    // Atmosphere: Style C Day (0) -> Style B Golden Dusk (0.48) -> Deep Sapphire Night (1.0)
    this.lightingMode = 'day';
    this.autoClock = 0.08;
    this.eveningFactor = 0;
    this.duskFactor = 0;

    // Optional visible Debug-Grid (?grid=1)
    this.showDebugGrid = typeof location !== 'undefined' && new URLSearchParams(location.search).get('grid') === '1';

    // Gameplay interactive state
    this.bounces = new Map();
    this.animalMotion = new Map();
    this.villagers = [];
    this.sleighFlight = null;
    this.giftParachute = null;
    this.smokeTimer = 0;
    this.elapsedSec = 0;

    // PixiJS v8 runtime objects
    this.app = null;
    this.textures = null;
    this.cameraContainer = null;
    this.terrainLayer = null;
    this.entityStage = null;
    this.lightingLayer = null;
    this.particles = null;
    this.ready = false;

    // Retained Zero-GC Display Node Pools
    this.entityNodes = new Map();
    this.signNodes = new Map();
    this.bubbleNodes = new Map();
    this.penNodes = new Map();
    this.cropGfxPool = new Map();
    this.staticPropsBuilt = false;
    this.swayingPines = [];
    this.glowSpots = [];
    this._lastSignBounds = [];
    this._lastBuildingBounds = [];

    // FPS telemetry ring buffer
    this._fpsSamples = new Float32Array(60);
    this._fpsIdx = 0;
    this._fpsFilled = false;

    this._initVillagers();
  }

  _initVillagers() {
    // Spawn strictly on center of walkable WorldGrid ROAD / PLAZA tiles!
    const specs = [
      { id: 'vil_1', name: 'Oma Hilde', sprite: 'alpine_villager', gx: 5.5, gy: 6.5 },
      { id: 'vil_2', name: 'Bäcker Franz', sprite: 'alpine_villager_green', gx: 8.5, gy: 5.5 },
      { id: 'vil_3', name: 'Lukas', sprite: 'alpine_villager_navy', gx: 11.5, gy: 6.5 }
    ];
    this.villagers = specs.map((s, idx) => ({
      ...s,
      speed: 0.72 + idx * 0.06,
      waitTimer: 0.8 + idx * 1.1,
      path: [],
      bubble: null,
      bubbleTimer: 0,
      offer: null,
      facing: 1,
      stepPhase: idx * 2.1
    }));
  }

  setDebugGrid(flag) {
    this.showDebugGrid = Boolean(flag);
  }

  async init() {
    if (this.ready) return;

    this.app = new Application();
    await this.app.init({
      canvas: this.canvas,
      preference: 'webgl',
      antialias: true,
      autoDensity: true,
      resolution: this.dpr,
      backgroundColor: 0xe6f1fa,
      width: window.innerWidth || 1280,
      height: window.innerHeight || 720,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    });

    this.app.ticker.stop();

    this.textures = new GpuTextures();
    this.textures.build();

    this.cameraContainer = new Container();
    this.app.stage.addChild(this.cameraContainer);

    // 1. Grid-Driven Terrain, Cobblestone Roads, GLSL Brook, Grounding Plates & Fences
    this.terrainLayer = new TerrainLayer(this.textures, gridToWorld, this.grid);
    this.cameraContainer.addChild(this.terrainLayer.container);

    // 2. Animal Pens (strictly beneath entities)
    this.penLayer = new Container();
    this.cameraContainer.addChild(this.penLayer);

    // 3. Y-Depth-Sorted 2.5D World Stage
    this.entityStage = new Container();
    this.entityStage.sortableChildren = true;
    this.cameraContainer.addChild(this.entityStage);

    // 4. World-space Particle Layers
    this.particles = new ParticleSystem(this.textures);
    this.cameraContainer.addChild(this.particles.worldSmokeLayer);
    this.cameraContainer.addChild(this.particles.worldBurstLayer);

    // 5. Screen-Space Ambient Multiply + Golden Dusk Wash + Night Aurora/Stars
    this.lightingLayer = new LightingLayer(this.textures);
    this.app.stage.addChild(this.lightingLayer.screenLayer);

    // 6. World-Space Additive Warm Emissive Bloom
    this.emissiveWorldContainer = new Container();
    this.emissiveWorldContainer.addChild(this.lightingLayer.worldEmissive);
    this.app.stage.addChild(this.emissiveWorldContainer);

    // 7. World-Space Crisp UI Bubbles & Floaters (un-dimmed by night)
    this.overlayWorldContainer = new Container();
    this.overlayWorldContainer.addChild(this.particles.worldFloaterLayer);
    this.bubbleLayer = new Container();
    this.overlayWorldContainer.addChild(this.bubbleLayer);
    this.app.stage.addChild(this.overlayWorldContainer);

    // 8. Foreground Screen-Space Snow, Swipe Trail & Flying HUD Rewards
    this.app.stage.addChild(this.particles.screenSnowLayer);
    this.app.stage.addChild(this.particles.screenSwipeGfx);
    this.app.stage.addChild(this.particles.screenFlyingLayer);

    this._buildStaticAlpineScenery();

    this.ready = true;
    this.resize();
  }

  _buildStaticAlpineScenery() {
    if (this.staticPropsBuilt) return;
    this.staticPropsBuilt = true;

    const rand = makeSeededRand(20261224);
    const cliffTex = this.textures.get('alpine_cliff');
    const pineTex = this.textures.get('deco_pine');
    const bridgeTex = this.textures.get('timber_bridge');
    const shadowTex = this.textures.get('fx_shadow');

    const addProp = (tex, gx, gy, w, h, opts = {}) => {
      if (!tex) return null;
      const wp = gridToWorld(gx, gy);
      const wrap = new Container();
      wrap.x = wp.x + (opts.ox || 0);
      wrap.y = wp.y + (opts.oy || 0);
      wrap.zIndex = opts.zIndex ?? wp.y;

      if (opts.shadow && shadowTex) {
        const sh = new Sprite(shadowTex);
        sh.anchor.set(0.5);
        sh.width = w * (opts.shadowW || 0.78);
        sh.height = h * (opts.shadowH || 0.26);
        sh.y = opts.shadowY || 4;
        sh.alpha = opts.shadowAlpha ?? 0.62;
        wrap.addChild(sh);
      }

      const sp = new Sprite(tex);
      sp.anchor.set(0.5, opts.anchorY ?? 0.88);
      sp.width = w;
      sp.height = h;
      if (opts.flipX) sp.scale.x *= -1;
      if (opts.tint) sp.tint = opts.tint;
      wrap.addChild(sp);

      this.entityStage.addChild(wrap);
      return { wrap, sp, phase: rand() * Math.PI * 2 };
    };

    // 1. Style-C Sculpted Snowy Alpine Cliffs strictly in BORDER ring (outside playable 0..13 & outside brook!)
    if (cliffTex) {
      const cliffs = [
        // Northern terraced alpine ridge (gy = -2.2)
        { gx: -2.4, gy: 1.8, s: 245, flip: false },
        { gx: -1.6, gy: -0.2, s: 265, flip: true },
        { gx: 0.2, gy: -1.8, s: 285, flip: false },
        { gx: 2.8, gy: -2.2, s: 280, flip: true },
        { gx: 5.5, gy: -2.3, s: 300, flip: false },
        { gx: 8.2, gy: -2.2, s: 285, flip: true },
        { gx: 10.9, gy: -2.0, s: 290, flip: false },
        { gx: 13.0, gy: -1.6, s: 255, flip: true },
        // Eastern cliff ridge strictly beyond brook (gx >= 17.6, keeping entire 3D bridge 100% unobstructed!)
        { gx: 17.6, gy: 1.0, s: 255, flip: false },
        { gx: 18.2, gy: 3.6, s: 230, flip: true },
        { gx: 18.8, gy: 10.2, s: 240, flip: false },
        { gx: 17.8, gy: 13.2, s: 235, flip: true },
        // Western snow-rock ridge strictly outside west_forest (gx <= -2.4, clear of road gy=6!)
        { gx: -2.6, gy: 8.6, s: 240, flip: true },
        { gx: -2.4, gy: 11.8, s: 255, flip: false }
      ];
      for (const c of cliffs) {
        addProp(cliffTex, c.gx, c.gy, c.s, c.s, {
          flipX: c.flip,
          anchorY: 0.84,
          shadow: true,
          shadowW: 0.90,
          shadowH: 0.28,
          shadowY: 6
        });
      }
    }

    // 2. Varied Multi-Scale Alpine Pine Forest Rim strictly in BORDER zone
    if (pineTex) {
      const pineTints = [0xffffff, 0xeef8f2, 0xe3f2ec, 0xf6fbf8];
      const forestCoords = [];

      // Northern forest crown behind cliffs
      for (let gx = -4; gx <= 16; gx += 1.4) {
        forestCoords.push({ gx: gx + (rand() - 0.5) * 0.4, gy: -3.2 + (rand() - 0.5) * 0.7 });
        forestCoords.push({ gx: gx + (rand() - 0.5) * 0.4, gy: -1.6 + (rand() - 0.5) * 0.5 });
      }
      // Western forest flank (strictly gx <= -1.6, road gap gy = 4.8..7.6!)
      for (let gy = -0.5; gy <= 15.5; gy += 1.5) {
        if (gy > 4.6 && gy < 7.6) continue;
        forestCoords.push({ gx: -3.4 + (rand() - 0.5) * 0.7, gy: gy + (rand() - 0.5) * 0.4 });
        forestCoords.push({ gx: -1.6 + (rand() - 0.5) * 0.4, gy: gy + (rand() - 0.5) * 0.4 });
      }
      // Eastern forest flank strictly across the brook (gx >= 16.5, road gap gy = 4.6..7.8!)
      for (let gy = -1.0; gy <= 14.5; gy += 1.55) {
        if (gy > 4.6 && gy < 7.8) continue;
        forestCoords.push({ gx: 16.6 + (rand() - 0.5) * 0.6, gy: gy + (rand() - 0.5) * 0.4 });
        forestCoords.push({ gx: 18.4 + (rand() - 0.5) * 0.7, gy: gy + (rand() - 0.5) * 0.4 });
      }
      // Southern forest frame far outside pond
      for (let gx = -1.5; gx <= 7.0; gx += 1.7) {
        forestCoords.push({ gx: gx + (rand() - 0.5) * 0.5, gy: 16.6 + (rand() - 0.5) * 0.6 });
      }

      for (let i = 0; i < forestCoords.length; i++) {
        const fc = forestCoords[i];
        const scale = 0.78 + rand() * 0.44;
        const size = 122 * scale;
        const node = addProp(pineTex, fc.gx, fc.gy, size, size * 1.12, {
          flipX: rand() > 0.5,
          tint: pineTints[i % pineTints.length],
          anchorY: 0.90,
          shadow: true,
          shadowW: 0.72,
          shadowH: 0.24,
          shadowY: 3
        });
        if (node) this.swayingPines.push(node);
      }
    }

    // 3. Mathematically Aligned 3D Timber Bridge driven directly by WorldGrid.bridgeTiles!
    //    timber_bridge.webp spans bottom-left <-> top-right (+gy) unflipped.
    //    For SURFACE.BRIDGE_X (road spans NW -> SE along +gx across a +gy stream), flipX = true aligns planks 100%!
    if (bridgeTex) {
      for (const bt of this.grid.bridgeTiles) {
        const cx = bt.gx + 0.5;
        const cy = bt.gy + 0.5;
        const wp = gridToWorld(cx, cy);
        const flipX = bt.surface === SURFACE.BRIDGE_X;
        addProp(bridgeTex, cx, cy, 176, 152, {
          flipX,
          anchorY: 0.62,
          zIndex: wp.y + 8,
          shadow: true,
          shadowW: 0.84,
          shadowH: 0.26,
          shadowY: 14,
          shadowAlpha: 0.48
        });
      }
    }
  }

  resize() {
    this.width = window.innerWidth || 1280;
    this.height = window.innerHeight || 720;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.width > this.height) {
      const idealZoom = Math.max(0.56, Math.min(0.90, this.height / 760));
      if (!this._userZoomed) this.cam.zoom = idealZoom;
    }
    if (this.app && this.app.renderer) {
      this.app.renderer.resolution = this.dpr;
      this.app.renderer.resize(this.width, this.height);
    }
    this.clampCamera();
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
    if (!Number.isFinite(this.cam.x)) this.cam.x = 60;
    if (!Number.isFinite(this.cam.y)) this.cam.y = 400;
    if (!Number.isFinite(this.cam.zoom)) this.cam.zoom = 0.88;
    if (!Number.isFinite(this.cam.vx)) this.cam.vx = 0;
    if (!Number.isFinite(this.cam.vy)) this.cam.vy = 0;

    this.cam.zoom = Math.max(0.54, Math.min(1.55, this.cam.zoom));
    this.cam.x = Math.max(-720, Math.min(920, this.cam.x));
    this.cam.y = Math.max(80, Math.min(860, this.cam.y));
  }

  triggerBounce(entityId) {
    this.bounces.set(entityId, performance.now());
  }

  spawnBurst(wx, wy, color = '#FDE047', count = 10, shape = 'star') {
    if (this.particles) this.particles.spawnBurst(wx, wy, color, count, shape);
  }

  spawnFloater(wx, wy, text, _iconId = null, color = '#FFFDF7') {
    if (this.particles) this.particles.spawnFloater(wx, wy, text, color);
  }

  spawnFlyingHudItem(wx, wy, iconId, target = 'barn', onLand = null) {
    if (!this.particles) {
      if (onLand) onLand();
      return;
    }
    const sc = this.worldToScreen(wx, wy);
    const elId = target === 'coins' ? 'btn-coins' : 'dock-barn';
    const el = document.getElementById(elId);
    const rect = el ? el.getBoundingClientRect() : { left: this.width - 60, top: 40, width: 32, height: 32 };
    const tx = rect.left + rect.width * 0.5;
    const ty = rect.top + rect.height * 0.5;
    this.particles.spawnFlyingHudItem(sc.x, sc.y, tx, ty, iconId, () => {
      if (el) {
        el.classList.remove('hud-pop');
        void el.offsetWidth;
        el.classList.add('hud-pop');
      }
      if (onLand) onLand();
    });
  }

  addSwipePoint(sx, sy, mode = 'harvest') {
    if (this.particles) this.particles.addSwipePoint(sx, sy, mode);
  }

  launchSleigh(state) {
    const start = gridToWorld(state.sleighPos.gx + 0.5, state.sleighPos.gy + 0.5);
    this.sleighFlight = { t: 0, dur: 4.8, startX: start.x, startY: start.y };
  }

  launchGiftParachute(from, onDone) {
    this.giftParachute = { t: 0, dur: 2.6, from, onDone };
  }

  hitTestVillager(wx, wy) {
    for (const v of this.villagers) {
      const p = gridToWorld(v.gx, v.gy);
      if (Math.hypot(wx - p.x, wy - (p.y - 32)) < 38) return v;
    }
    return null;
  }

  hitTestDailyChest(wx, wy, chestReady) {
    if (!chestReady) return false;
    const p = gridToWorld(DAILY_CHEST_POS.gx + 0.5, DAILY_CHEST_POS.gy + 0.5);
    return Math.hypot(wx - p.x, wy - (p.y - 18)) < 46;
  }

  getAnimalMotion(an) {
    let m = this.animalMotion.get(an.id);
    if (!m) {
      m = { ox: 0, oy: 0, tx: 0, ty: 0, facing: 1, timer: 1.5, phase: Math.random() * 6.28 };
      this.animalMotion.set(an.id, m);
    }
    return m;
  }

  _getBounceScale(id, now) {
    const t0 = this.bounces.get(id);
    if (!t0) return 1;
    const dt = (now - t0) / 210;
    if (dt >= 1) {
      this.bounces.delete(id);
      return 1;
    }
    return 1 + Math.sin(dt * Math.PI) * 0.045;
  }

  update(dt, state) {
    const safeDt = Math.min(0.033, Math.max(0.001, dt));
    this.elapsedSec += safeDt;

    // Keep WorldGrid synchronized with latest state
    this.grid.syncFromState(state, DAILY_CHEST_POS);

    // Record FPS sample
    this._fpsSamples[this._fpsIdx] = 1 / safeDt;
    this._fpsIdx = (this._fpsIdx + 1) % this._fpsSamples.length;
    if (this._fpsIdx === 0) this._fpsFilled = true;

    // Camera inertia & zoom easing
    if (Math.abs(this.cam.vx) > 0.1 || Math.abs(this.cam.vy) > 0.1) {
      this.cam.x += this.cam.vx * safeDt;
      this.cam.y += this.cam.vy * safeDt;
      const damp = Math.pow(0.015, safeDt);
      this.cam.vx *= damp;
      this.cam.vy *= damp;
      this.clampCamera();
    }
    if (this.cam.targetZoom != null) {
      this.cam.zoom += (this.cam.targetZoom - this.cam.zoom) * Math.min(1, safeDt * 10);
      if (Math.abs(this.cam.zoom - this.cam.targetZoom) < 0.004) {
        this.cam.zoom = this.cam.targetZoom;
        this.cam.targetZoom = null;
      }
      this.clampCamera();
    }

    // Atmosphere clock: Day (0) -> Style-B Golden Dusk (0.48) -> Deep Sapphire Night (1.0)
    let targetEv = 0;
    if (this.lightingMode === 'day') targetEv = 0;
    else if (this.lightingMode === 'dusk') targetEv = 0.48;
    else if (this.lightingMode === 'night') targetEv = 1.0;
    else {
      this.autoClock = (this.autoClock + safeDt * 0.014) % 1;
      targetEv = 0.5 - 0.5 * Math.cos(this.autoClock * Math.PI * 2);
    }
    this.eveningFactor += (targetEv - this.eveningFactor) * Math.min(1, safeDt * 3.8);

    // Autonomous animals strolling gently inside their 1x1 straw-and-timber pen
    for (const an of state.animals || []) {
      const m = this.getAnimalMotion(an);
      m.timer -= safeDt;
      if (m.timer <= 0) {
        m.timer = 2.0 + Math.random() * 2.6;
        m.tx = (Math.random() - 0.5) * 0.28;
        m.ty = (Math.random() - 0.5) * 0.28;
      }
      const dx = m.tx - m.ox;
      const dy = m.ty - m.oy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.02) {
        const step = Math.min(dist, safeDt * 0.28);
        m.ox += (dx / dist) * step;
        m.oy += (dy / dist) * step;
        const wdx = dx - dy;
        if (Math.abs(wdx) > 0.01) m.facing = wdx >= 0 ? 1 : -1;
        m.phase += safeDt * 8.5;
      }
    }

    // A* Road-Locked Alpine Villagers (NEVER walk through buildings, fences, or water!)
    for (const v of this.villagers) {
      if (v.bubbleTimer > 0) {
        v.bubbleTimer -= safeDt;
        if (v.bubbleTimer <= 0) v.bubble = null;
      }
      if (v.waitTimer > 0) {
        v.waitTimer -= safeDt;
        continue;
      }
      if (!v.path || v.path.length === 0) {
        const dest = ROAD_DESTINATIONS[Math.floor(Math.random() * ROAD_DESTINATIONS.length)];
        v.path = this.grid.findRoadPath(v.gx, v.gy, dest.gx, dest.gy);
        if (v.path.length === 0) {
          v.waitTimer = 1.5;
          continue;
        }
      }
      const next = v.path[0];
      const dx = next.gx - v.gx;
      const dy = next.gy - v.gy;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.06) {
        v.gx = next.gx;
        v.gy = next.gy;
        v.path.shift();
        if (v.path.length === 0) {
          v.waitTimer = 1.8 + Math.random() * 3.0;
          if (!v.offer && Math.random() < 0.35) {
            v.bubble = VILLAGER_QUOTES[Math.floor(Math.random() * VILLAGER_QUOTES.length)];
            v.bubbleTimer = 4.2;
          }
        }
      } else {
        const step = Math.min(dist, v.speed * safeDt);
        v.gx += (dx / dist) * step;
        v.gy += (dy / dist) * step;
        const wdx = dx - dy;
        if (Math.abs(wdx) > 0.01) v.facing = wdx >= 0 ? 1 : -1;
        v.stepPhase += safeDt * 8.0;
      }
    }

    // Sleigh delivery flight
    if (this.sleighFlight) {
      this.sleighFlight.t += safeDt;
      if (this.sleighFlight.t >= this.sleighFlight.dur) this.sleighFlight = null;
    }

    // Gift parachute
    if (this.giftParachute) {
      this.giftParachute.t += safeDt;
      if (this.giftParachute.t >= this.giftParachute.dur) {
        const cb = this.giftParachute.onDone;
        this.giftParachute = null;
        if (cb) cb();
      }
    }

    // Chimney smoke emitter anchored accurately to Chalet & Built Stations
    this.smokeTimer += safeDt;
    if (this.smokeTimer >= 0.42 && this.particles) {
      this.smokeTimer = 0;
      const ch = gridToWorld(state.chalet.gx + 1.0, state.chalet.gy + 1.0);
      this.particles.emitSmoke(ch.x + 36, ch.y - 122, 0xfffdf8);

      for (const st of state.stations || []) {
        if (!st.built || st.wrapped) continue;
        const working = st.queue && st.queue.length > 0;
        if (working || st.type === 'bakery') {
          const sp = gridToWorld(st.gx + 1.0, st.gy + 1.0);
          this.particles.emitSmoke(sp.x + 24, sp.y - 102, working ? 0xfff5dc : 0xf1f5f9);
        }
      }
    }

    if (this.particles) {
      this.particles.update(safeDt, this.elapsedSec, this.width, this.height);
    }
  }

  _acquireEntityNode(key, textureKey, hasShadow = true) {
    let node = this.entityNodes.get(key);
    const tex = this.textures.get(textureKey);
    if (!node) {
      const wrap = new Container();
      let shadow = null;
      if (hasShadow) {
        const shTex = this.textures.get('fx_shadow');
        if (shTex) {
          shadow = new Sprite(shTex);
          shadow.anchor.set(0.5);
          wrap.addChild(shadow);
        }
      }
      const sp = new Sprite(tex || this.textures.get('fx_star'));
      sp.anchor.set(0.5, 0.88);
      wrap.addChild(sp);
      this.entityStage.addChild(wrap);
      node = { wrap, sp, shadow, texKey: textureKey, used: false };
      this.entityNodes.set(key, node);
    } else if (node.texKey !== textureKey && tex) {
      node.sp.texture = tex;
      node.texKey = textureKey;
    }
    node.used = true;
    node.wrap.visible = true;
    return node;
  }

  _acquireAnimalPen(key) {
    let pen = this.penNodes.get(key);
    if (!pen) {
      const c = new Container();
      const g = new Graphics();
      const hw = 48;
      const hh = 24;
      g.poly([0, -hh, hw, 0, 0, hh, -hw, 0])
        .fill({ color: 0xe6b856, alpha: 0.94 })
        .stroke({ color: 0x7c4a1d, width: 2.5, alpha: 0.9 });

      const wisps = [
        [-18, -4, -6, -8], [4, -10, 18, -4], [-22, 4, -8, 9], [6, 8, 20, 2],
        [-10, 0, 8, -2], [-2, 12, 12, 10], [-14, -10, 2, -13]
      ];
      for (const [x1, y1, x2, y2] of wisps) {
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0xfef08a, width: 1.8, alpha: 0.8, cap: 'round' });
      }

      const corners = [{ x: 0, y: -hh }, { x: hw, y: 0 }, { x: 0, y: hh }, { x: -hw, y: 0 }];
      const edges = [[0, 1], [3, 0], [1, 2], [2, 3]];
      for (const [ia, ib] of edges) {
        const a = corners[ia];
        const b = corners[ib];
        g.moveTo(a.x, a.y - 7).lineTo(b.x, b.y - 7).stroke({ color: 0x45200c, width: 4.5, cap: 'round' });
        g.moveTo(a.x, a.y - 7.5).lineTo(b.x, b.y - 7.5).stroke({ color: 0xb06830, width: 2.4, cap: 'round' });
        g.moveTo(a.x, a.y - 9.2).lineTo(b.x, b.y - 9.2).stroke({ color: 0xffffff, width: 1.8, alpha: 0.9, cap: 'round' });
      }
      for (const p of corners) {
        g.roundRect(p.x - 3, p.y - 13, 6, 14, 1.5).fill(0x522710);
        g.roundRect(p.x - 1.8, p.y - 12, 3.6, 12, 1).fill(0xb87035);
        g.ellipse(p.x, p.y - 13.5, 3.6, 2).fill(0xffffff);
      }

      c.addChild(g);
      this.penLayer.addChild(c);
      pen = { container: c, used: false };
      this.penNodes.set(key, pen);
    }
    pen.used = true;
    pen.container.visible = true;
    return pen;
  }

  _acquireSignNode(zone) {
    let node = this.signNodes.get(zone.id);
    if (!node) {
      const c = new Container();
      const g = new Graphics();

      g.ellipse(0, 6, 24, 9).fill({ color: 0x3b5984, alpha: 0.34 });
      g.roundRect(-4.5, -24, 9, 30, 2).fill(0x45200c);
      g.roundRect(-2.8, -23, 5.6, 28, 1.5).fill(0x9a5525);
      g.roundRect(-48, -56, 96, 36, 9).fill(0x4a2410).stroke({ color: 0xe4b662, width: 2.2 });
      g.roundRect(-45, -53, 90, 30, 7).fill(0x693418);
      g.roundRect(-44, -60, 88, 7, 4).fill(0xf8fbff);

      c.addChild(g);

      const title = new Text({
        text: `${zone.cost} Münzen`,
        style: new TextStyle({
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
          fontSize: 11.5,
          fontWeight: '800',
          fill: 0xfef08a
        })
      });
      title.anchor.set(0.5);
      title.y = -43;
      c.addChild(title);

      const sub = new Text({
        text: `Ab Level ${zone.unlockLevel}`,
        style: new TextStyle({
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
          fontSize: 9.5,
          fontWeight: '700',
          fill: 0xfcf6e8
        })
      });
      sub.anchor.set(0.5);
      sub.y = -29;
      c.addChild(sub);

      this.entityStage.addChild(c);
      node = { container: c, title, sub, used: false };
      this.signNodes.set(zone.id, node);
    }
    node.used = true;
    node.container.visible = true;
    return node;
  }

  _acquireBubble(key, bgHex = 0xfffdf7, strokeHex = 0x6e391b) {
    let b = this.bubbleNodes.get(key);
    if (!b) {
      const c = new Container();
      const bg = new Graphics();
      const icon = new Sprite(this.textures.get('fx_star'));
      icon.anchor.set(0.5);
      icon.visible = false;
      const label = new Text({
        text: '',
        style: new TextStyle({
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
          fontSize: 11.5,
          fontWeight: '800',
          fill: 0x2e190c
        })
      });
      label.anchor.set(0.5);
      c.addChild(bg, icon, label);
      this.bubbleLayer.addChild(c);
      b = { container: c, bg, icon, label, lastKey: '', used: false };
      this.bubbleNodes.set(key, b);
    }
    b.used = true;
    b.container.visible = true;
    b.bgHex = bgHex;
    b.strokeHex = strokeHex;
    return b;
  }

  _acquireCropGfx(key) {
    let entry = this.cropGfxPool.get(key);
    if (!entry) {
      const g = new Graphics();
      this.entityStage.addChild(g);
      entry = { g, used: false };
      this.cropGfxPool.set(key, entry);
    }
    entry.used = true;
    entry.g.visible = true;
    return entry.g;
  }

  _drawBubbleBadge(key, x, y, textStr, iconId = null, opts = {}) {
    const bgHex = opts.bg ?? 0xfffdf7;
    const strokeHex = opts.stroke ?? 0x7c451f;
    const textColor = opts.textColor ?? 0x2e190c;
    const b = this._acquireBubble(key, bgHex, strokeHex);
    b.container.x = x;
    b.container.y = y;

    const sig = `${textStr}|${iconId || ''}|${bgHex}|${strokeHex}|${textColor}`;
    if (b.lastKey !== sig) {
      b.lastKey = sig;
      b.bg.clear();
      const hasIcon = !!(iconId && this.textures.getIcon(iconId));
      const hasText = Boolean(textStr);

      if (hasIcon && !hasText) {
        b.bg.circle(0, 0, 17).fill(bgHex).stroke({ color: strokeHex, width: 2.4 });
        b.bg.poly([-5, 16, 5, 16, 0, 22]).fill(bgHex);
        b.icon.texture = this.textures.getIcon(iconId);
        b.icon.x = 0;
        b.icon.y = 0;
        b.icon.width = 24;
        b.icon.height = 24;
        b.icon.visible = true;
        b.label.visible = false;
      } else {
        b.label.text = textStr;
        b.label.style.fill = textColor;
        b.label.visible = true;
        const tw = Math.max(24, b.label.width);
        const padX = hasIcon ? 34 : 18;
        const bw = tw + padX;
        const bh = 24;
        b.bg.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, 12).fill(bgHex).stroke({ color: strokeHex, width: 2.0 });
        if (hasIcon) {
          b.icon.texture = this.textures.getIcon(iconId);
          b.icon.width = 18;
          b.icon.height = 18;
          b.icon.x = -bw * 0.5 + 14;
          b.icon.y = 0;
          b.icon.visible = true;
          b.label.x = 8;
        } else {
          b.icon.visible = false;
          b.label.x = 0;
        }
        b.label.y = 0;
      }
    }
  }

  render(state, uiState) {
    if (!this.ready || !this.app) return;

    const now = performance.now();
    const sec = this.elapsedSec;
    const ev = this.eveningFactor;

    const camX = this.width * 0.5 - this.cam.x * this.cam.zoom;
    const camY = this.height * 0.5 - this.cam.y * this.cam.zoom;
    this.cameraContainer.position.set(camX, camY);
    this.cameraContainer.scale.set(this.cam.zoom);
    this.emissiveWorldContainer.position.set(camX, camY);
    this.emissiveWorldContainer.scale.set(this.cam.zoom);
    this.overlayWorldContainer.position.set(camX, camY);
    this.overlayWorldContainer.scale.set(this.cam.zoom);

    for (let i = 0; i < this.swayingPines.length; i++) {
      const p = this.swayingPines[i];
      p.sp.rotation = Math.sin(sec * 1.15 + p.phase) * 0.014;
    }

    for (const n of this.entityNodes.values()) n.used = false;
    for (const s of this.signNodes.values()) s.used = false;
    for (const b of this.bubbleNodes.values()) b.used = false;
    for (const p of this.penNodes.values()) p.used = false;
    for (const c of this.cropGfxPool.values()) c.used = false;

    this.glowSpots.length = 0;
    this._lastSignBounds.length = 0;
    this._lastBuildingBounds.length = 0;

    // Warm bridge glow reflecting on glacial brook
    for (const bt of this.grid.bridgeTiles) {
      const bp = gridToWorld(bt.gx + 0.5, bt.gy + 0.5);
      this.glowSpots.push({ x: bp.x, y: bp.y - 16, r: 98, tint: 0xffba52, intensity: 0.80 });
    }

    const placeEntity = (key, texKey, x, y, w, h, opts = {}) => {
      const node = this._acquireEntityNode(key, texKey, opts.shadow !== false);
      const bounce = opts.bounceId ? this._getBounceScale(opts.bounceId, now) : 1;
      node.wrap.x = x;
      node.wrap.y = y;
      node.wrap.zIndex = opts.zIndex ?? y;
      node.sp.anchor.set(0.5, opts.anchorY ?? 0.88);
      node.sp.width = w * bounce;
      node.sp.height = h * bounce;
      if (opts.flipX) node.sp.scale.x = -Math.abs(node.sp.scale.x);
      else node.sp.scale.x = Math.abs(node.sp.scale.x);
      node.sp.rotation = opts.rot || 0;
      node.sp.alpha = opts.alpha ?? 1;
      node.sp.tint = opts.tint ?? 0xffffff;
      if (node.shadow) {
        node.shadow.visible = opts.shadow !== false;
        node.shadow.width = w * (opts.shadowW ?? 0.72);
        node.shadow.height = h * (opts.shadowH ?? 0.24);
        node.shadow.y = opts.shadowY ?? 3;
        node.shadow.alpha = opts.shadowAlpha ?? 0.58;
      }
      if (opts.trackBuilding) {
        this._lastBuildingBounds.push({
          id: key,
          x0: x - w * 0.44,
          y0: y - h * 0.82,
          x1: x + w * 0.44,
          y1: y + h * 0.08
        });
      }
      return node;
    };

    // NOTE ON EXACT FOOTPRINT ANCHORING:
    // A 2x2 footprint at (gx, gy) spans [gx..gx+2] x [gy..gy+2]; its isometric ground center is (gx+1, gy+1),
    // and its front base corner is (gx+2, gy+2). Anchoring bottom-center at (gx+1, gy+1) + yOffset plants the
    // building squarely inside its 2x2 grounding diamond!
    // A 1x1 footprint at (gx, gy) has isometric ground center (gx+0.5, gy+0.5).

    // ---- A. Winter Chalet (2x2) ----
    const chP = gridToWorld(state.chalet.gx + 1.0, state.chalet.gy + 1.0);
    placeEntity('chalet', 'winter_chalet', chP.x, chP.y + 34, 232, 220, {
      bounceId: 'chalet',
      zIndex: chP.y + 34,
      anchorY: 0.86,
      shadowW: 0.84,
      shadowH: 0.28,
      trackBuilding: true
    });
    this.glowSpots.push({ x: chP.x - 28, y: chP.y - 24, r: 92, tint: 0xffc45c, intensity: 0.88 });
    this.glowSpots.push({ x: chP.x + 36, y: chP.y - 32, r: 96, tint: 0xffba50, intensity: 0.90 });

    // ---- B. Village Christmas Tree (2x2 Landmark) ----
    const lvInfo = getLevelInfo(state.xp);
    const treeGrowth = lvInfo.level >= 5 ? 1.10 : lvInfo.level >= 3 ? 1.04 : 0.98;
    const trP = gridToWorld(state.christmasTree.gx + 1.0, state.christmasTree.gy + 1.0);
    placeEntity('christmasTree', 'christmas_tree', trP.x, trP.y + 30, 174 * treeGrowth, 206 * treeGrowth, {
      bounceId: 'christmasTree',
      zIndex: trP.y + 30,
      anchorY: 0.86,
      shadowW: 0.78,
      shadowH: 0.24,
      trackBuilding: true
    });
    this.glowSpots.push({ x: trP.x, y: trP.y - 62 * treeGrowth, r: 126, tint: 0xffd166, intensity: 0.95 });

    // ---- C. Wishlist Board, Mailbox, Reindeer Sleigh (1x1 Grounded Props) ----
    const wbP = gridToWorld(state.wishlistBoard.gx + 0.5, state.wishlistBoard.gy + 0.5);
    placeEntity('wishlistBoard', 'wishlist_board', wbP.x, wbP.y + 12, 86, 92, {
      bounceId: 'wishlistBoard',
      zIndex: wbP.y + 12
    });
    const readyOrders = (state.orders || []).filter((o) =>
      Object.entries(o.req || {}).every(([id, q]) => (state.inventory[id] || 0) >= q)
    ).length;
    if (readyOrders > 0) {
      this._drawBubbleBadge('orders_ready', wbP.x + 18, wbP.y - 74, `${readyOrders}`, null, {
        bg: 0x1f7a45,
        stroke: 0xfffdf7,
        textColor: 0xffffff
      });
    }

    const mbP = gridToWorld(state.mailbox.gx + 0.5, state.mailbox.gy + 0.5);
    placeEntity('mailbox', 'gift_mailbox', mbP.x, mbP.y + 10, 52, 66, {
      bounceId: 'mailbox',
      zIndex: mbP.y + 10
    });

    if (!this.sleighFlight) {
      const slP = gridToWorld(state.sleighPos.gx + 0.5, state.sleighPos.gy + 0.5);
      placeEntity('sleigh', 'reindeer_sleigh', slP.x, slP.y + 14, 162, 108, {
        bounceId: 'sleigh',
        zIndex: slP.y + 14,
        shadowW: 0.80,
        shadowH: 0.25
      });
    } else {
      const t = this.sleighFlight.t / this.sleighFlight.dur;
      const sx = this.sleighFlight.startX + Math.sin(t * Math.PI * 2) * 340 + t * 180;
      const sy = this.sleighFlight.startY - Math.sin(t * Math.PI) * 260;
      placeEntity('sleigh', 'reindeer_sleigh', sx, sy, 162, 108, {
        zIndex: 99999,
        rot: -Math.cos(t * Math.PI) * 0.14,
        shadow: false
      });
      this.glowSpots.push({ x: sx, y: sy - 20, r: 90, tint: 0xfde047, intensity: 0.85 });
    }

    // ---- D. Production Stations (2x2 Grounded Buildings) ----
    for (const st of state.stations || []) {
      if (!st.built) continue;
      const sp = gridToWorld(st.gx + 1.0, st.gy + 1.0);
      const texKey = STATION_SPRITES[st.type] || 'christmas_bakery';
      const size = st.type === 'teahouse' ? 182 : 204;

      if (st.wrapped) {
        placeEntity(`st_${st.id}`, texKey, sp.x, sp.y + 30, size * 0.72, size * 0.68, {
          bounceId: st.id,
          zIndex: sp.y + 30,
          tint: 0xd9c7a8
        });
        this._drawBubbleBadge(`wrap_${st.id}`, sp.x, sp.y - 84 + Math.sin(sec * 4) * 4, 'AUSPACKEN', null, {
          bg: 0xb42324,
          stroke: 0xfde68a,
          textColor: 0xfffdf7
        });
      } else {
        placeEntity(`st_${st.id}`, texKey, sp.x, sp.y + 30, size, size * 0.96, {
          bounceId: st.id,
          zIndex: sp.y + 30,
          anchorY: 0.86,
          shadowW: 0.80,
          shadowH: 0.26,
          trackBuilding: true
        });
        const working = st.queue && st.queue.length > 0;
        this.glowSpots.push({
          x: sp.x - 10,
          y: sp.y - 28,
          r: working ? 112 : 82,
          tint: working ? 0xffae34 : 0xffcb6b,
          intensity: working ? 0.96 : 0.70
        });

        if (st.ready && st.ready.length > 0) {
          const itemId = st.ready[0];
          const bob = Math.sin(sec * 3.4 + st.gx) * 4;
          this._drawBubbleBadge(`st_ready_${st.id}`, sp.x, sp.y - 108 + bob, '', itemId, {
            bg: 0xfffdf7,
            stroke: 0xd97706
          });
        } else if (working) {
          const cur = st.queue[0];
          const dur = Math.max(1, (cur.doneAt - cur.startedAt) || 15000);
          const pct = Math.max(0, Math.min(1, 1 - (cur.doneAt - Date.now()) / dur));
          this._drawBubbleBadge(`st_work_${st.id}`, sp.x, sp.y - 104, `${Math.round(pct * 100)}%`, cur.itemId, {
            bg: 0x2b1408,
            stroke: 0xe4b662,
            textColor: 0xfef08a
          });
        }

        const mastery = getStationMastery(st.craftedCount || 0);
        if (mastery.stars > 0) {
          this._drawBubbleBadge(`st_m_${st.id}`, sp.x + 56, sp.y - 96, `${mastery.stars}★`, null, {
            bg: 0xb45309,
            stroke: 0xfef08a,
            textColor: 0xfef08a
          });
        }
      }
    }

    // ---- E. Crop Fields (1x1 Exact Tile Center) ----
    const nowMs = Date.now();
    for (const f of state.fields || []) {
      const fp = gridToWorld(f.gx + 0.5, f.gy + 0.5);
      placeEntity(`plot_${f.id}`, 'snow_field_plot', fp.x, fp.y + 8, 118, 66, {
        bounceId: f.id,
        zIndex: fp.y - 4,
        anchorY: 0.62,
        shadow: false
      });

      if (f.cropId && ITEMS[f.cropId]) {
        const crop = ITEMS[f.cropId];
        const elapsed = (nowMs - (f.plantedAt || 0)) / 1000;
        const pct = Math.max(0, Math.min(1, elapsed / (crop.growTime || 60)));

        if (pct >= 1) {
          const cropTexKey = `crop_${f.cropId}`;
          const sway = Math.sin(sec * 2.1 + f.gx * 1.3 + f.gy * 0.9) * 0.018;
          placeEntity(`crop_${f.id}`, cropTexKey, fp.x, fp.y + 2, 106, 84, {
            bounceId: f.id,
            zIndex: fp.y + 4,
            anchorY: 0.72,
            rot: sway,
            shadow: false
          });
        } else {
          const cg = this._acquireCropGfx(`sprout_${f.id}`);
          cg.clear();
          cg.x = fp.x;
          cg.y = fp.y;
          cg.zIndex = fp.y + 2;
          const rows = [[-22, -6], [0, -10], [22, -4], [-14, 6], [10, 6]];
          for (const [ox, oy] of rows) {
            if (pct < 0.25) {
              cg.ellipse(ox, oy, 4, 2.2).fill(0x8c5a2b);
            } else if (pct < 0.65) {
              cg.moveTo(ox, oy).lineTo(ox - 3, oy - 9).stroke({ color: 0x4ade80, width: 2.2, cap: 'round' });
              cg.moveTo(ox, oy).lineTo(ox + 3, oy - 8).stroke({ color: 0x22c55e, width: 2.2, cap: 'round' });
            } else {
              cg.moveTo(ox, oy).lineTo(ox - 4, oy - 15).stroke({ color: 0x16a34a, width: 2.8, cap: 'round' });
              cg.moveTo(ox, oy).lineTo(ox + 4, oy - 14).stroke({ color: 0x22c55e, width: 2.8, cap: 'round' });
              cg.circle(ox, oy - 15, 3.2).fill(parseInt((crop.color || '#F5B82E').replace('#', ''), 16) || 0xf5b82e);
            }
          }
        }
      }
    }

    // ---- F. Animals in Cozy Straw-and-Timber Pens (1x1 Exact Tile Center) ----
    for (const an of state.animals || []) {
      const baseP = gridToWorld(an.gx + 0.5, an.gy + 0.5);
      const pen = this._acquireAnimalPen(an.id);
      pen.container.x = baseP.x;
      pen.container.y = baseP.y + 2;

      const mot = this.getAnimalMotion(an);
      const ap = gridToWorld(an.gx + 0.5 + mot.ox, an.gy + 0.5 + mot.oy);
      const def = ANIMALS[an.type];
      const texKey = ANIMAL_SPRITES[an.type] || 'animal_chicken';
      const sz = an.type === 'reindeer' ? 78 : an.type === 'sheep' ? 64 : 52;
      const hop = Math.abs(Math.sin(mot.phase)) * 3.0;

      placeEntity(`an_${an.id}`, texKey, ap.x, ap.y - hop, sz, sz, {
        bounceId: an.id,
        zIndex: ap.y + 6,
        flipX: mot.facing < 0,
        shadowW: 0.66,
        shadowH: 0.24,
        shadowY: hop + 2
      });

      if (an.state === 'ready' && def) {
        const bob = Math.sin(sec * 3.6 + an.gx) * 3.5;
        this._drawBubbleBadge(`an_r_${an.id}`, ap.x, ap.y - sz - 12 + bob, '', def.produceItem, {
          bg: 0xfffdf7,
          stroke: 0xd97706
        });
      } else if (an.state === 'hungry' && def) {
        this._drawBubbleBadge(`an_h_${an.id}`, ap.x, ap.y - sz - 10, '', def.feedItem, {
          bg: 0xfef3c7,
          stroke: 0xb45309
        });
      }
    }

    // ---- G. Decorations (1x1 Exact Tile Center) ----
    for (const d of state.decorations || []) {
      const dp = gridToWorld(d.gx + 0.5, d.gy + 0.5);
      const texKey = DECO_SPRITES[d.type] || 'deco_lantern';
      const w = d.type === 'pine' ? 112 : d.type === 'snowman' ? 66 : 56;
      const h = d.type === 'pine' ? 126 : d.type === 'snowman' ? 74 : 72;
      placeEntity(`deco_${d.id}`, texKey, dp.x, dp.y + 8, w, h, {
        bounceId: d.id,
        zIndex: dp.y + 8,
        shadowW: 0.68,
        shadowH: 0.24
      });
      if (d.type === 'lantern') {
        this.glowSpots.push({ x: dp.x, y: dp.y - 34, r: 108, tint: 0xffc04d, intensity: 0.96 });
      }
    }

    // ---- H. Lakeside Daily Treasure Chest (1x1 Exact Tile Center) ----
    const chPos = gridToWorld(DAILY_CHEST_POS.gx + 0.5, DAILY_CHEST_POS.gy + 0.5);
    const chestReady = Boolean(uiState.dailyChestReady);
    placeEntity('daily_chest', 'treasure_chest', chPos.x, chPos.y + 6, 62, 58, {
      zIndex: chPos.y + 6,
      alpha: chestReady ? 1 : 0.72,
      tint: chestReady ? 0xffffff : 0xcbd5e1
    });
    if (chestReady) {
      this.glowSpots.push({ x: chPos.x, y: chPos.y - 14, r: 78, tint: 0xfde047, intensity: 0.86 });
      this._drawBubbleBadge('chest_ready', chPos.x, chPos.y - 58 + Math.sin(sec * 3.8) * 3.5, 'TRUHE', null, {
        bg: 0xb45309,
        stroke: 0xfef08a,
        textColor: 0xfffdf7
      });
    }

    // ---- I. A* Road-Locked 3D Alpine Villagers ----
    for (const v of this.villagers) {
      const vp = gridToWorld(v.gx, v.gy);
      const walking = v.waitTimer <= 0 && v.path && v.path.length > 0;
      const strideBob = walking ? Math.abs(Math.sin(v.stepPhase)) * 3.6 : 0;
      const tilt = walking ? Math.sin(v.stepPhase) * 0.045 : 0;

      placeEntity(`vil_${v.id}`, v.sprite, vp.x, vp.y - strideBob, 42, 66, {
        zIndex: vp.y + 10,
        anchorY: 0.92,
        flipX: v.facing < 0,
        rot: tilt,
        shadowW: 0.78,
        shadowH: 0.22,
        shadowY: strideBob + 2
      });

      if (v.offer) {
        this._drawBubbleBadge(`vil_o_${v.id}`, vp.x, vp.y - 78 + Math.sin(sec * 4) * 3, `${v.offer.price}`, v.offer.itemId, {
          bg: 0xfef3c7,
          stroke: 0xd97706,
          textColor: 0x78350f
        });
      } else if (v.bubble) {
        this._drawBubbleBadge(`vil_b_${v.id}`, vp.x, vp.y - 78, v.bubble, null, {
          bg: 0xfffdf7,
          stroke: 0x7c451f,
          textColor: 0x2e190c
        });
      }
    }

    // ---- J. Unobstructed Carved Wooden Land Expansion Signposts (1x1 Exact Tile Center) ----
    const unlocked = new Set(state.unlockedLands || []);
    for (const zone of LAND_ZONES) {
      if (unlocked.has(zone.id)) continue;
      const sp = gridToWorld(zone.signPos.gx + 0.5, zone.signPos.gy + 0.5);
      const sign = this._acquireSignNode(zone);
      sign.container.x = sp.x;
      sign.container.y = sp.y + 4;
      sign.container.zIndex = sp.y + 10;
      this._lastSignBounds.push({
        id: zone.id,
        x0: sp.x - 48,
        y0: sp.y - 56,
        x1: sp.x + 48,
        y1: sp.y + 10
      });
    }

    // ---- K. Incoming Gift Parachute ----
    if (this.giftParachute) {
      const t = this.giftParachute.t / this.giftParachute.dur;
      const target = gridToWorld(state.mailbox.gx + 0.5, state.mailbox.gy + 0.5);
      const px = target.x + Math.sin(t * Math.PI * 3) * 32 * (1 - t);
      const py = target.y - 340 * (1 - t);
      placeEntity('gift_parachute', 'gift_mailbox', px, py, 48, 56, {
        zIndex: 99990,
        shadow: false
      });
    }

    for (const n of this.entityNodes.values()) if (!n.used) n.wrap.visible = false;
    for (const s of this.signNodes.values()) if (!s.used) s.container.visible = false;
    for (const b of this.bubbleNodes.values()) if (!b.used) b.container.visible = false;
    for (const p of this.penNodes.values()) if (!p.used) p.container.visible = false;
    for (const c of this.cropGfxPool.values()) if (!c.used) c.g.visible = false;

    const { dusk } = this.lightingLayer.update(this.width, this.height, sec, ev, this.glowSpots);
    this.duskFactor = dusk;
    this.terrainLayer.update(state, uiState, sec, ev, dusk, this.showDebugGrid);

    this.app.renderer.render(this.app.stage);
  }

  validateState(state) {
    this.grid.syncFromState(state, DAILY_CHEST_POS);
    return validateWorld(this.grid, state, this.villagers);
  }

  getRendererInfo() {
    if (!this.app || !this.app.renderer) {
      return { ready: false, rendererType: 'none', avgFps: 0 };
    }
    const count = this._fpsFilled ? this._fpsSamples.length : Math.max(1, this._fpsIdx);
    let sum = 0;
    for (let i = 0; i < count; i++) sum += this._fpsSamples[i] || 60;
    return {
      ready: this.ready,
      rendererType: this.app.renderer.name || String(this.app.renderer.type),
      dpr: this.dpr,
      avgFps: Math.round((sum / count) * 10) / 10,
      entityPoolSize: this.entityNodes.size
    };
  }

  getLayoutDiagnostics() {
    const overlaps = [];
    for (const s of this._lastSignBounds) {
      for (const b of this._lastBuildingBounds) {
        const hit = !(s.x1 < b.x0 || s.x0 > b.x1 || s.y1 < b.y0 || s.y0 > b.y1);
        if (hit) overlaps.push({ sign: s.id, building: b.id });
      }
    }
    return {
      signCount: this._lastSignBounds.length,
      buildingCount: this._lastBuildingBounds.length,
      signBuildingOverlaps: overlaps
    };
  }
}
