// ============================================================================
// WINTERHOF v6 — PixiJS v8 WebGL 2.5D Supercell-Hybrid World Engine
// Style C Terraced Alpine Valley (Day) + Style B Golden Hour (Dusk) + Night Bloom
// Zero-GC Retained Entity Pools · GLSL Glacial Brook · 3D Villagers · Zero Emojis
// ============================================================================
import { Application, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { LAND_ZONES, ITEMS, ANIMALS, STATIONS, DECORATIONS, getLevelInfo, getStationMastery } from './gameData.js';
import { GpuTextures } from './engine/textures.js';
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

export const DAILY_CHEST_POS = { gx: 11.4, gy: 12.6 };

const VILLAGER_QUOTES = [
  'Es duftet nach frischem Gebäck.',
  'Wunderbarer Wintertag im Tal.',
  'Ein warmer Punsch wäre fein.',
  'So ordentlich und friedlich hier.',
  'Die Laternen leuchten wunderschön.'
];

const ROAD_WAYPOINTS = [
  { gx: 2.2, gy: 5.5 },
  { gx: 5.5, gy: 5.5 },
  { gx: 7.5, gy: 5.5 },
  { gx: 10.5, gy: 5.5 },
  { gx: 12.5, gy: 5.5 },
  { gx: 5.9, gy: 4.5 },
  { gx: 4.0, gy: 6.4 },
  { gx: 8.4, gy: 4.2 }
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

    // Centered cleanly on the composed Alpine Village heart in Landscape framing
    const center = gridToWorld(7.3, 6.0);
    this.cam = {
      x: center.x + 24,
      y: center.y - 6,
      zoom: 0.90,
      targetZoom: null,
      vx: 0,
      vy: 0
    };

    // Atmosphere: Style C Day (0) -> Style B Golden Dusk (0.48) -> Deep Sapphire Night (1.0)
    this.lightingMode = 'day';
    this.autoClock = 0.08;
    this.eveningFactor = 0;
    this.duskFactor = 0;

    // Gameplay interactive state
    this.bounces = new Map();
    this.animalMotion = new Map();
    this.villagers = [];
    this.sleighFlight = null;
    this.giftParachute = null;
    this.smokeTimer = 0;
    this.elapsedSec = 0;

    // PixiJS v8 runtime objects (initialized in async init())
    this.app = null;
    this.textures = null;
    this.cameraContainer = null;
    this.terrainLayer = null;
    this.entityStage = null;
    this.overlayWorldLayer = null;
    this.lightingLayer = null;
    this.particles = null;
    this.ready = false;

    // Retained Zero-GC Display Node Pools
    this.entityNodes = new Map();
    this.signNodes = new Map();
    this.bubbleNodes = new Map();
    this.penNodes = new Map();
    this.cropGfxPool = new Map();
    this.sleighFlightNode = null;
    this.parachuteNode = null;
    this.staticPropsBuilt = false;
    this.swayingPines = [];
    this.glowSpots = [];
    this._lastSignBounds = [];
    this._lastBuildingBounds = [];

    // FPS telemetry ring buffer for Stage-1 Benchmark
    this._fpsSamples = new Float32Array(60);
    this._fpsIdx = 0;
    this._fpsFilled = false;

    this._initVillagers();
  }

  _initVillagers() {
    const specs = [
      { id: 'vil_1', name: 'Oma Hilde', sprite: 'alpine_villager', gx: 5.4, gy: 5.5, targetIdx: 2 },
      { id: 'vil_2', name: 'Bäcker Franz', sprite: 'alpine_villager_green', gx: 9.8, gy: 5.5, targetIdx: 1 },
      { id: 'vil_3', name: 'Lukas', sprite: 'alpine_villager_navy', gx: 7.4, gy: 5.2, targetIdx: 4 }
    ];
    this.villagers = specs.map((s, idx) => ({
      ...s,
      speed: 0.56 + idx * 0.06,
      waitTimer: idx * 1.4,
      bubble: null,
      bubbleTimer: 0,
      offer: null,
      facing: 1,
      stepPhase: idx * 2.1
    }));
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
      backgroundColor: 0xd9ebf9,
      width: window.innerWidth || 1280,
      height: window.innerHeight || 720,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    });

    // Disable PixiJS internal RAF because WinterhofGame drives a unified clamped dt loop
    this.app.ticker.stop();

    this.textures = new GpuTextures();
    this.textures.build();

    // Scene Graph Hierarchy (strictly ordered for true 2.5D Supercell layering)
    this.cameraContainer = new Container();
    this.app.stage.addChild(this.cameraContainer);

    // 1. Terrain, Cobblestone Plaza, GLSL Alpine Brook & Sculpted Timber Fences
    this.terrainLayer = new TerrainLayer(this.textures, gridToWorld);
    this.cameraContainer.addChild(this.terrainLayer.container);

    // 2. Animal Pens & Ground Decals (always beneath entities)
    this.penLayer = new Container();
    this.cameraContainer.addChild(this.penLayer);

    // 3. Y-Depth-Sorted 2.5D World Stage (Cliffs, Pines, Bridge, Buildings, Crops, Animals, Villagers, Signs)
    this.entityStage = new Container();
    this.entityStage.sortableChildren = true;
    this.cameraContainer.addChild(this.entityStage);

    // 4. World-space Particle & VFX Layers (Chimney smoke, Harvest sparkles)
    this.particles = new ParticleSystem(this.textures);
    this.cameraContainer.addChild(this.particles.worldSmokeLayer);
    this.cameraContainer.addChild(this.particles.worldBurstLayer);

    // 5. Screen-Space Ambient Multiply + Golden Dusk Wash + Night Aurora/Stars
    this.lightingLayer = new LightingLayer(this.textures);
    this.app.stage.addChild(this.lightingLayer.screenLayer);

    // 6. World-Space Additive Warm Emissive Light Pools (ABOVE multiply so lanterns & windows blaze warmly!)
    this.emissiveWorldContainer = new Container();
    this.emissiveWorldContainer.addChild(this.lightingLayer.worldEmissive);
    this.app.stage.addChild(this.emissiveWorldContainer);

    // 7. Crisp UI/World Bubbles & Floaters (un-dimmed by night multiply so always 100% readable!)
    this.overlayWorldContainer = new Container();
    this.overlayWorldContainer.addChild(this.particles.worldFloaterLayer);
    this.bubbleLayer = new Container();
    this.overlayWorldContainer.addChild(this.bubbleLayer);
    this.app.stage.addChild(this.overlayWorldContainer);

    // 8. Foreground Screen-Space Snowfall, Swipe Trail & Flying HUD Icons
    this.app.stage.addChild(this.particles.screenSnowLayer);
    this.app.stage.addChild(this.particles.screenSwipeGfx);
    this.app.stage.addChild(this.particles.screenFlyingLayer);

    // Build static Style-C Alpine Cliffs, Multi-Scale Forest Border & 3D Wooden Bridge
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
        sh.alpha = opts.shadowAlpha ?? 0.68;
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

    // 1. Style-C Sculpted Snowy Alpine Cliffs framing the Northern & Western/Eastern Valley Rim
    if (cliffTex) {
      const cliffs = [
        // Northern terraced alpine ridge behind the village
        { gx: -2.6, gy: 2.2, s: 250, flip: false },
        { gx: -1.8, gy: 0.4, s: 270, flip: true },
        { gx: -0.4, gy: -1.6, s: 295, flip: false },
        { gx: 1.8, gy: -2.2, s: 280, flip: true },
        { gx: 4.4, gy: -2.4, s: 310, flip: false },
        { gx: 7.2, gy: -2.4, s: 290, flip: true },
        { gx: 10.0, gy: -2.2, s: 300, flip: false },
        { gx: 12.6, gy: -1.8, s: 265, flip: true },
        // Eastern cliff outcrops beyond the glacial brook (cleanly framing without covering bridge/signs)
        { gx: 17.6, gy: 0.6, s: 255, flip: false },
        { gx: 18.2, gy: 3.4, s: 225, flip: true },
        { gx: 17.6, gy: 8.8, s: 245, flip: false },
        { gx: 16.8, gy: 12.2, s: 235, flip: true },
        // Western snow-rock ledges framing the edge
        { gx: -2.4, gy: 7.4, s: 240, flip: true },
        { gx: -2.2, gy: 10.8, s: 260, flip: false },
        { gx: -1.2, gy: 13.8, s: 240, flip: true }
      ];
      for (const c of cliffs) {
        addProp(cliffTex, c.gx, c.gy, c.s, c.s, {
          flipX: c.flip,
          anchorY: 0.84,
          shadow: true,
          shadowW: 0.92,
          shadowH: 0.30,
          shadowY: 6
        });
      }
    }

    // 2. Varied Multi-Scale Alpine Pine Forest Rim (scale, flip & subtle emerald tint variation!)
    if (pineTex) {
      const pineTints = [0xffffff, 0xeef8f2, 0xe3f2ec, 0xf6fbf8];
      const forestCoords = [];

      // Dense northern crown atop & around the snowy cliffs
      for (let gx = -4; gx <= 16; gx += 1.35) {
        forestCoords.push({ gx: gx + (rand() - 0.5) * 0.5, gy: -3.2 + (rand() - 0.5) * 0.9 });
        forestCoords.push({ gx: gx + (rand() - 0.5) * 0.5, gy: -1.6 + (rand() - 0.5) * 0.65 });
      }
      // Western alpine forest flank (cleanly avoiding the main cobblestone road gy = 4.6..6.4)
      for (let gy = -0.5; gy <= 16.5; gy += 1.45) {
        if (gy > 4.2 && gy < 6.7) continue;
        forestCoords.push({ gx: -3.4 + (rand() - 0.5) * 0.8, gy: gy + (rand() - 0.5) * 0.5 });
        forestCoords.push({ gx: -1.6 + (rand() - 0.5) * 0.5, gy: gy + (rand() - 0.5) * 0.5 });
      }
      // Eastern pines across the glacial brook (avoiding road & bridge)
      for (let gy = -1.2; gy <= 15.5; gy += 1.55) {
        if (gy > 4.2 && gy < 6.8) continue;
        forestCoords.push({ gx: 16.4 + (rand() - 0.5) * 0.7, gy: gy + (rand() - 0.5) * 0.5 });
        forestCoords.push({ gx: 18.2 + (rand() - 0.5) * 0.8, gy: gy + (rand() - 0.5) * 0.5 });
      }
      // Southern pine border framing bottom valley edge
      for (let gx = -1.5; gx <= 15.0; gx += 1.7) {
        if (gx > 8.2 && gx < 12.6) continue; // Keep lakeside pond view open!
        forestCoords.push({ gx: gx + (rand() - 0.5) * 0.6, gy: 16.8 + (rand() - 0.5) * 0.7 });
      }

      for (let i = 0; i < forestCoords.length; i++) {
        const fc = forestCoords[i];
        const scale = 0.76 + rand() * 0.48;
        const size = 124 * scale;
        const node = addProp(pineTex, fc.gx, fc.gy, size, size * 1.12, {
          flipX: rand() > 0.5,
          tint: pineTints[i % pineTints.length],
          anchorY: 0.90,
          shadow: true,
          shadowW: 0.74,
          shadowH: 0.24,
          shadowY: 3
        });
        if (node) this.swayingPines.push(node);
      }
    }

    // 3. Signature 3D Arched Snowy Timber Bridge spanning the glacial brook at (13.8, 5.5)
    if (bridgeTex) {
      const wp = gridToWorld(13.82, 5.52);
      addProp(bridgeTex, 13.82, 5.52, 198, 170, {
        anchorY: 0.64,
        zIndex: wp.y + 12,
        shadow: true,
        shadowW: 0.86,
        shadowH: 0.28,
        shadowY: 16,
        shadowAlpha: 0.52
      });
    }
  }

  resize() {
    this.width = window.innerWidth || 1280;
    this.height = window.innerHeight || 720;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Responsive framing for mobile landscape (390px height) vs desktop (720px+ height)
    if (this.width > this.height) {
      const idealZoom = Math.max(0.58, Math.min(0.92, this.height / 760));
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
    if (!Number.isFinite(this.cam.x)) this.cam.x = 120;
    if (!Number.isFinite(this.cam.y)) this.cam.y = 390;
    if (!Number.isFinite(this.cam.zoom)) this.cam.zoom = 0.90;
    if (!Number.isFinite(this.cam.vx)) this.cam.vx = 0;
    if (!Number.isFinite(this.cam.vy)) this.cam.vy = 0;

    this.cam.zoom = Math.max(0.55, Math.min(1.55, this.cam.zoom));
    this.cam.x = Math.max(-720, Math.min(920, this.cam.x));
    this.cam.y = Math.max(60, Math.min(860, this.cam.y));
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
    const start = gridToWorld(state.sleighPos.gx, state.sleighPos.gy);
    this.sleighFlight = { t: 0, dur: 4.8, startX: start.x, startY: start.y };
  }

  launchGiftParachute(from, onDone) {
    this.giftParachute = { t: 0, dur: 2.6, from, onDone };
  }

  hitTestVillager(wx, wy) {
    for (const v of this.villagers) {
      const p = gridToWorld(v.gx, v.gy);
      if (Math.hypot(wx - p.x, wy - (p.y - 32)) < 38) {
        return v;
      }
    }
    return null;
  }

  hitTestDailyChest(wx, wy, chestReady) {
    if (!chestReady) return false;
    const p = gridToWorld(DAILY_CHEST_POS.gx, DAILY_CHEST_POS.gy);
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

    // Record FPS sample for Stage-1 Benchmark
    this._fpsSamples[this._fpsIdx] = 1 / safeDt;
    this._fpsIdx = (this._fpsIdx + 1) % this._fpsSamples.length;
    if (this._fpsIdx === 0) this._fpsFilled = true;

    // Camera inertia & smooth zoom easing
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

    // Atmosphere clock: Day (0.0) -> Style-B Golden Dusk (0.48) -> Deep Sapphire Night (1.0)
    let targetEv = 0;
    if (this.lightingMode === 'day') targetEv = 0;
    else if (this.lightingMode === 'dusk') targetEv = 0.48;
    else if (this.lightingMode === 'night') targetEv = 1.0;
    else {
      this.autoClock = (this.autoClock + safeDt * 0.014) % 1;
      targetEv = 0.5 - 0.5 * Math.cos(this.autoClock * Math.PI * 2);
    }
    this.eveningFactor += (targetEv - this.eveningFactor) * Math.min(1, safeDt * 3.8);

    // Update autonomous walking animals inside their straw-and-timber pens
    for (const an of state.animals || []) {
      const m = this.getAnimalMotion(an);
      m.timer -= safeDt;
      if (m.timer <= 0) {
        m.timer = 2.0 + Math.random() * 2.6;
        m.tx = (Math.random() - 0.5) * 0.34;
        m.ty = (Math.random() - 0.5) * 0.34;
      }
      const dx = m.tx - m.ox;
      const dy = m.ty - m.oy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.02) {
        const step = Math.min(dist, safeDt * 0.32);
        m.ox += (dx / dist) * step;
        m.oy += (dy / dist) * step;
        const wdx = (dx - dy);
        if (Math.abs(wdx) > 0.01) m.facing = wdx >= 0 ? 1 : -1;
        m.phase += safeDt * 8.5;
      }
    }

    // Update strolling 3D alpine villagers along cobblestone village roads
    for (const v of this.villagers) {
      if (v.bubbleTimer > 0) {
        v.bubbleTimer -= safeDt;
        if (v.bubbleTimer <= 0) v.bubble = null;
      }
      if (v.waitTimer > 0) {
        v.waitTimer -= safeDt;
        continue;
      }
      const wp = ROAD_WAYPOINTS[v.targetIdx % ROAD_WAYPOINTS.length];
      const dx = wp.gx - v.gx;
      const dy = wp.gy - v.gy;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.08) {
        v.waitTimer = 2.0 + Math.random() * 3.5;
        v.targetIdx = Math.floor(Math.random() * ROAD_WAYPOINTS.length);
        if (!v.offer && Math.random() < 0.35) {
          v.bubble = VILLAGER_QUOTES[Math.floor(Math.random() * VILLAGER_QUOTES.length)];
          v.bubbleTimer = 4.2;
        }
      } else {
        const step = Math.min(dist, v.speed * safeDt);
        v.gx += (dx / dist) * step;
        v.gy += (dy / dist) * step;
        const wdx = dx - dy;
        if (Math.abs(wdx) > 0.01) v.facing = wdx >= 0 ? 1 : -1;
        v.stepPhase += safeDt * 7.8;
      }
    }

    // Sleigh delivery arc
    if (this.sleighFlight) {
      this.sleighFlight.t += safeDt;
      if (this.sleighFlight.t >= this.sleighFlight.dur) {
        this.sleighFlight = null;
      }
    }

    // Gift parachute arrival
    if (this.giftParachute) {
      this.giftParachute.t += safeDt;
      if (this.giftParachute.t >= this.giftParachute.dur) {
        const cb = this.giftParachute.onDone;
        this.giftParachute = null;
        if (cb) cb();
      }
    }

    // Chimney smoke emitter (Chalet + active built production stations)
    this.smokeTimer += safeDt;
    if (this.smokeTimer >= 0.42 && this.particles) {
      this.smokeTimer = 0;
      const ch = gridToWorld(state.chalet.gx + 0.5, state.chalet.gy + 0.5);
      this.particles.emitSmoke(ch.x + 38, ch.y - 122, 0xfffdf8);

      for (const st of state.stations || []) {
        if (!st.built || st.wrapped) continue;
        const working = (st.queue && st.queue.length > 0);
        if (working || st.type === 'bakery') {
          const sp = gridToWorld(st.gx + 0.5, st.gy + 0.5);
          this.particles.emitSmoke(sp.x + 26, sp.y - 104, working ? 0xfff5dc : 0xf1f5f9);
        }
      }
    }

    // Update GPU particle pools
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

      // Isometric straw bedding diamond + chunky wooden corner rails with snow caps
      const hw = 44;
      const hh = 22;
      g.poly([0, -hh, hw, 0, 0, hh, -hw, 0])
        .fill({ color: 0xe6b856, alpha: 0.94 })
        .stroke({ color: 0x7c4a1d, width: 2.5, alpha: 0.9 });

      // Crisp hand-drawn golden straw wisps inside pen
      const wisps = [
        [-18, -4, -6, -8], [4, -10, 18, -4], [-22, 4, -8, 9], [6, 8, 20, 2],
        [-10, 0, 8, -2], [-2, 12, 12, 10], [-14, -10, 2, -13]
      ];
      for (const [x1, y1, x2, y2] of wisps) {
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0xfef08a, width: 1.8, alpha: 0.8, cap: 'round' });
      }

      // Back wooden rails (NE & NW edges)
      const corners = [
        { x: 0, y: -hh },
        { x: hw, y: 0 },
        { x: 0, y: hh },
        { x: -hw, y: 0 }
      ];
      const edges = [[0, 1], [3, 0], [1, 2], [2, 3]];
      for (const [ia, ib] of edges) {
        const a = corners[ia];
        const b = corners[ib];
        g.moveTo(a.x, a.y - 7).lineTo(b.x, b.y - 7).stroke({ color: 0x45200c, width: 4.5, cap: 'round' });
        g.moveTo(a.x, a.y - 7.5).lineTo(b.x, b.y - 7.5).stroke({ color: 0xb06830, width: 2.4, cap: 'round' });
        g.moveTo(a.x, a.y - 9.2).lineTo(b.x, b.y - 9.2).stroke({ color: 0xffffff, width: 1.8, alpha: 0.9, cap: 'round' });
      }
      // Corner timber posts with little snow caps
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

      // Contact shadow
      g.ellipse(0, 6, 24, 9).fill({ color: 0x3b5984, alpha: 0.34 });
      // Sturdy beveled timber post
      g.roundRect(-4.5, -24, 9, 30, 2).fill(0x45200c);
      g.roundRect(-2.8, -23, 5.6, 28, 1.5).fill(0x9a5525);
      // Warm carved oak signboard plaque with brushed gold rim
      g.roundRect(-48, -56, 96, 36, 9).fill(0x4a2410).stroke({ color: 0xe4b662, width: 2.2 });
      g.roundRect(-45, -53, 90, 30, 7).fill(0x693418);
      // Soft snow cap resting cleanly on top of wooden signpost
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
        // Circular Hay-Day floating collect / feed badge
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

    // 1. Apply camera transform to world containers
    const camX = this.width * 0.5 - this.cam.x * this.cam.zoom;
    const camY = this.height * 0.5 - this.cam.y * this.cam.zoom;
    this.cameraContainer.position.set(camX, camY);
    this.cameraContainer.scale.set(this.cam.zoom);
    this.emissiveWorldContainer.position.set(camX, camY);
    this.emissiveWorldContainer.scale.set(this.cam.zoom);
    this.overlayWorldContainer.position.set(camX, camY);
    this.overlayWorldContainer.scale.set(this.cam.zoom);

    // 2. Subtle breeze sway on perimeter pines
    for (let i = 0; i < this.swayingPines.length; i++) {
      const p = this.swayingPines[i];
      p.sp.rotation = Math.sin(sec * 1.15 + p.phase) * 0.014;
    }

    // Reset Zero-GC retained pool flags
    for (const n of this.entityNodes.values()) n.used = false;
    for (const s of this.signNodes.values()) s.used = false;
    for (const b of this.bubbleNodes.values()) b.used = false;
    for (const p of this.penNodes.values()) p.used = false;
    for (const c of this.cropGfxPool.values()) c.used = false;

    this.glowSpots.length = 0;
    this._lastSignBounds.length = 0;
    this._lastBuildingBounds.length = 0;

    // Warm bridge lantern glow reflecting on the glacial alpine brook at Dusk/Night!
    const bridgePos = gridToWorld(13.82, 5.52);
    this.glowSpots.push({ x: bridgePos.x, y: bridgePos.y - 16, r: 96, tint: 0xffba52, intensity: 0.78 });

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
        node.shadow.alpha = opts.shadowAlpha ?? 0.62;
      }
      if (opts.trackBuilding) {
        this._lastBuildingBounds.push({
          id: key,
          x0: x - w * 0.44,
          y0: y - h * 0.84,
          x1: x + w * 0.44,
          y1: y + h * 0.08
        });
      }
      return node;
    };

    // ---- A. Winter Chalet (2x2) ----
    const chP = gridToWorld(state.chalet.gx + 0.5, state.chalet.gy + 0.5);
    placeEntity('chalet', 'winter_chalet', chP.x, chP.y + 18, 246, 232, {
      bounceId: 'chalet',
      zIndex: chP.y + 18,
      shadowW: 0.82,
      shadowH: 0.28,
      trackBuilding: true
    });
    // Warm golden chalet window glow pools
    this.glowSpots.push({ x: chP.x - 28, y: chP.y - 36, r: 92, tint: 0xffc45c, intensity: 0.88 });
    this.glowSpots.push({ x: chP.x + 36, y: chP.y - 44, r: 96, tint: 0xffba50, intensity: 0.90 });

    // ---- B. Village Christmas Tree (scales smoothly with Level) ----
    const lvInfo = getLevelInfo(state.xp);
    const treeGrowth = lvInfo.level >= 5 ? 1.12 : lvInfo.level >= 3 ? 1.05 : 0.98;
    const trP = gridToWorld(state.christmasTree.gx + 0.5, state.christmasTree.gy + 0.5);
    placeEntity('christmasTree', 'christmas_tree', trP.x, trP.y + 16, 178 * treeGrowth, 212 * treeGrowth, {
      bounceId: 'christmasTree',
      zIndex: trP.y + 16,
      shadowW: 0.78,
      shadowH: 0.24,
      trackBuilding: true
    });
    this.glowSpots.push({ x: trP.x, y: trP.y - 76 * treeGrowth, r: 126, tint: 0xffd166, intensity: 0.95 });

    // ---- C. Wishlist Board, Mailbox, Reindeer Sleigh ----
    const wbP = gridToWorld(state.wishlistBoard.gx, state.wishlistBoard.gy);
    placeEntity('wishlistBoard', 'wishlist_board', wbP.x, wbP.y + 8, 92, 96, {
      bounceId: 'wishlistBoard',
      zIndex: wbP.y + 8
    });
    const readyOrders = (state.orders || []).filter((o) =>
      Object.entries(o.req || {}).every(([id, q]) => (state.inventory[id] || 0) >= q)
    ).length;
    if (readyOrders > 0) {
      this._drawBubbleBadge('orders_ready', wbP.x + 18, wbP.y - 78, `${readyOrders}`, null, {
        bg: 0x1f7a45,
        stroke: 0xfffdf7,
        textColor: 0xffffff
      });
    }

    const mbP = gridToWorld(state.mailbox.gx, state.mailbox.gy);
    placeEntity('mailbox', 'gift_mailbox', mbP.x, mbP.y + 8, 54, 68, {
      bounceId: 'mailbox',
      zIndex: mbP.y + 8
    });

    if (!this.sleighFlight) {
      const slP = gridToWorld(state.sleighPos.gx, state.sleighPos.gy);
      placeEntity('sleigh', 'reindeer_sleigh', slP.x, slP.y + 12, 176, 118, {
        bounceId: 'sleigh',
        zIndex: slP.y + 12,
        shadowW: 0.80,
        shadowH: 0.25
      });
    } else {
      const t = this.sleighFlight.t / this.sleighFlight.dur;
      const sx = this.sleighFlight.startX + Math.sin(t * Math.PI * 2) * 340 + t * 180;
      const sy = this.sleighFlight.startY - Math.sin(t * Math.PI) * 260;
      placeEntity('sleigh', 'reindeer_sleigh', sx, sy, 176, 118, {
        zIndex: 99999,
        rot: -Math.cos(t * Math.PI) * 0.14,
        shadow: false
      });
      this.glowSpots.push({ x: sx, y: sy - 20, r: 90, tint: 0xfde047, intensity: 0.85 });
    }

    // ---- D. Production Stations (Built or Red-Ribbon Wrapped) ----
    for (const st of state.stations || []) {
      if (!st.built) continue;
      const sp = gridToWorld(st.gx + 0.5, st.gy + 0.5);
      const texKey = STATION_SPRITES[st.type] || 'christmas_bakery';
      const size = st.type === 'teahouse' ? 186 : 210;

      if (st.wrapped) {
        // Festive wrapped construction parcel with red ribbon
        placeEntity(`st_${st.id}`, texKey, sp.x, sp.y + 14, size * 0.72, size * 0.68, {
          bounceId: st.id,
          zIndex: sp.y + 14,
          tint: 0xd9c7a8
        });
        this._drawBubbleBadge(`wrap_${st.id}`, sp.x, sp.y - 98 + Math.sin(sec * 4) * 4, 'AUSPACKEN', null, {
          bg: 0xb42324,
          stroke: 0xfde68a,
          textColor: 0xfffdf7
        });
      } else {
        placeEntity(`st_${st.id}`, texKey, sp.x, sp.y + 14, size, size * 0.96, {
          bounceId: st.id,
          zIndex: sp.y + 14,
          shadowW: 0.78,
          shadowH: 0.25,
          trackBuilding: true
        });
        const working = st.queue && st.queue.length > 0;
        this.glowSpots.push({
          x: sp.x - 10,
          y: sp.y - 42,
          r: working ? 112 : 82,
          tint: working ? 0xffae34 : 0xffcb6b,
          intensity: working ? 0.96 : 0.70
        });

        // Ready finished goods bubble
        if (st.ready && st.ready.length > 0) {
          const itemId = st.ready[0];
          const bob = Math.sin(sec * 3.4 + st.gx) * 4;
          this._drawBubbleBadge(`st_ready_${st.id}`, sp.x, sp.y - 122 + bob, '', itemId, {
            bg: 0xfffdf7,
            stroke: 0xd97706
          });
        } else if (working) {
          const cur = st.queue[0];
          const dur = Math.max(1, (cur.doneAt - cur.startedAt) || 15000);
          const pct = Math.max(0, Math.min(1, 1 - (cur.doneAt - Date.now()) / dur));
          this._drawBubbleBadge(`st_work_${st.id}`, sp.x, sp.y - 116, `${Math.round(pct * 100)}%`, cur.itemId, {
            bg: 0x2b1408,
            stroke: 0xe4b662,
            textColor: 0xfef08a
          });
        }

        // Mastery Stars indicator if >= 1 star
        const mastery = getStationMastery(st.craftedCount || 0);
        if (mastery.stars > 0) {
          this._drawBubbleBadge(`st_m_${st.id}`, sp.x + 56, sp.y - 108, `${mastery.stars}★`, null, {
            bg: 0xb45309,
            stroke: 0xfef08a,
            textColor: 0xfef08a
          });
        }
      }
    }

    // ---- E. Crop Fields (Snow Field Plot + 4-Stage Living Growth) ----
    const nowMs = Date.now();
    for (const f of state.fields || []) {
      const fp = gridToWorld(f.gx, f.gy);
      placeEntity(`plot_${f.id}`, 'snow_field_plot', fp.x, fp.y + 10, 122, 68, {
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
          placeEntity(`crop_${f.id}`, cropTexKey, fp.x, fp.y + 4, 108, 86, {
            bounceId: f.id,
            zIndex: fp.y + 4,
            anchorY: 0.72,
            rot: sway,
            shadow: false
          });
        } else {
          // Crisp 3-stage procedural sprouts (Stage 0 seeds -> Stage 1 green shoots -> Stage 2 budding plants)
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

    // ---- F. Animals in Cozy Straw-and-Timber Pens ----
    for (const an of state.animals || []) {
      const baseP = gridToWorld(an.gx, an.gy);
      const pen = this._acquireAnimalPen(an.id);
      pen.container.x = baseP.x;
      pen.container.y = baseP.y + 4;

      const mot = this.getAnimalMotion(an);
      const ap = gridToWorld(an.gx + mot.ox, an.gy + mot.oy);
      const def = ANIMALS[an.type];
      const texKey = ANIMAL_SPRITES[an.type] || 'animal_chicken';
      const sz = an.type === 'reindeer' ? 80 : an.type === 'sheep' ? 66 : 52;
      const hop = Math.abs(Math.sin(mot.phase)) * 3.2;

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

    // ---- G. Decorations (Lanterns, Snowmen, Extra Pines) ----
    for (const d of state.decorations || []) {
      const dp = gridToWorld(d.gx, d.gy);
      const texKey = DECO_SPRITES[d.type] || 'deco_lantern';
      const w = d.type === 'pine' ? 114 : d.type === 'snowman' ? 68 : 58;
      const h = d.type === 'pine' ? 128 : d.type === 'snowman' ? 76 : 74;
      placeEntity(`deco_${d.id}`, texKey, dp.x, dp.y + 6, w, h, {
        bounceId: d.id,
        zIndex: dp.y + 6,
        shadowW: 0.68,
        shadowH: 0.24
      });
      if (d.type === 'lantern') {
        this.glowSpots.push({ x: dp.x, y: dp.y - 36, r: 108, tint: 0xffc04d, intensity: 0.96 });
      }
    }

    // ---- H. Lakeside Daily Treasure Chest ----
    const chPos = gridToWorld(DAILY_CHEST_POS.gx, DAILY_CHEST_POS.gy);
    const chestReady = Boolean(uiState.dailyChestReady);
    placeEntity('daily_chest', 'treasure_chest', chPos.x, chPos.y + 4, 66, 62, {
      zIndex: chPos.y + 4,
      alpha: chestReady ? 1 : 0.72,
      tint: chestReady ? 0xffffff : 0xcbd5e1
    });
    if (chestReady) {
      this.glowSpots.push({ x: chPos.x, y: chPos.y - 16, r: 78, tint: 0xfde047, intensity: 0.86 });
      this._drawBubbleBadge('chest_ready', chPos.x, chPos.y - 62 + Math.sin(sec * 3.8) * 3.5, 'TRUHE', null, {
        bg: 0xb45309,
        stroke: 0xfef08a,
        textColor: 0xfffdf7
      });
    }

    // ---- I. Strolling 3D Supercell Alpine Villagers (ZERO stick figures!) ----
    for (const v of this.villagers) {
      const vp = gridToWorld(v.gx, v.gy);
      const walking = v.waitTimer <= 0;
      const strideBob = walking ? Math.abs(Math.sin(v.stepPhase)) * 3.8 : 0;
      const tilt = walking ? Math.sin(v.stepPhase) * 0.045 : 0;

      placeEntity(`vil_${v.id}`, v.sprite, vp.x, vp.y - strideBob, 42, 66, {
        zIndex: vp.y + 5,
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

    // ---- J. Unobstructed Carved Wooden Land Expansion Signposts ----
    const unlocked = new Set(state.unlockedLands || []);
    for (const zone of LAND_ZONES) {
      if (unlocked.has(zone.id)) continue;
      const sp = gridToWorld(zone.signPos.gx, zone.signPos.gy);
      const sign = this._acquireSignNode(zone);
      sign.container.x = sp.x;
      sign.container.y = sp.y;
      sign.container.zIndex = sp.y + 10;
      this._lastSignBounds.push({
        id: zone.id,
        x0: sp.x - 48,
        y0: sp.y - 60,
        x1: sp.x + 48,
        y1: sp.y + 6
      });
    }

    // ---- K. Incoming Winterpost Gift Parachute ----
    if (this.giftParachute) {
      const t = this.giftParachute.t / this.giftParachute.dur;
      const target = gridToWorld(state.mailbox.gx, state.mailbox.gy);
      const px = target.x + Math.sin(t * Math.PI * 3) * 32 * (1 - t);
      const py = target.y - 340 * (1 - t);
      placeEntity('gift_parachute', 'gift_mailbox', px, py, 48, 56, {
        zIndex: 99990,
        shadow: false
      });
    }

    // Hide unused pooled nodes cleanly (Zero-GC)
    for (const n of this.entityNodes.values()) if (!n.used) n.wrap.visible = false;
    for (const s of this.signNodes.values()) if (!s.used) s.container.visible = false;
    for (const b of this.bubbleNodes.values()) if (!b.used) b.container.visible = false;
    for (const p of this.penNodes.values()) if (!p.used) p.container.visible = false;
    for (const c of this.cropGfxPool.values()) if (!c.used) c.g.visible = false;

    // 3. Update GPU Lighting & Atmosphere + Terrain Water Shader
    const { dusk } = this.lightingLayer.update(this.width, this.height, sec, ev, this.glowSpots);
    this.duskFactor = dusk;
    this.terrainLayer.update(state, uiState, sec, ev, dusk);

    // 4. Render single crisp WebGL2 frame
    this.app.renderer.render(this.app.stage);
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
