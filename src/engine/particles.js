// ============================================================================
// WINTERHOF v6 — Zero-GC Pre-Allocated GPU Particle & VFX System (PixiJS v8)
// Layered depth snowfall · Chimney smoke · Harvest sparkles · Flying HUD items
// ============================================================================
import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';

const MAX_FLAKES = 96;
const MAX_SMOKE = 48;
const MAX_BURSTS = 72;
const MAX_FLOATERS = 24;
const MAX_FLYING = 28;

export class ParticleSystem {
  constructor(textures) {
    this.textures = textures;

    // World-space containers
    this.worldSmokeLayer = new Container();
    this.worldBurstLayer = new Container();
    this.worldFloaterLayer = new Container();

    // Screen-space containers
    this.screenSnowLayer = new Container();
    this.screenSwipeGfx = new Graphics();
    this.screenFlyingLayer = new Container();

    // 1. Pre-allocated layered depth snow pool (background small slow + foreground larger soft)
    const flakeTex = textures.get('fx_snowflake');
    this.flakes = [];
    for (let i = 0; i < MAX_FLAKES; i++) {
      const sp = new Sprite(flakeTex);
      sp.anchor.set(0.5);
      const depth = i < 64 ? 0.55 + (i % 5) * 0.08 : 1.0 + (i % 4) * 0.16;
      sp.scale.set(0.16 * depth);
      sp.alpha = depth > 0.95 ? 0.68 : 0.42;
      this.screenSnowLayer.addChild(sp);
      this.flakes.push({
        sp,
        x: Math.random() * 1400,
        y: Math.random() * 820,
        vx: -10 - Math.random() * 14 * depth,
        vy: 20 + Math.random() * 24 * depth,
        phase: Math.random() * Math.PI * 2,
        depth
      });
    }

    // 2. Pre-allocated curling chimney smoke pool (ring buffer)
    const smokeTex = textures.get('fx_smoke');
    this.smoke = [];
    this.smokeCursor = 0;
    for (let i = 0; i < MAX_SMOKE; i++) {
      const sp = new Sprite(smokeTex);
      sp.anchor.set(0.5);
      sp.visible = false;
      this.worldSmokeLayer.addChild(sp);
      this.smoke.push({ sp, active: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, maxAge: 1, baseScale: 0.4 });
    }

    // 3. Pre-allocated sparkle / heart burst pool (ring buffer)
    this.starTex = textures.get('fx_star');
    this.heartTex = textures.get('fx_heart');
    this.bursts = [];
    this.burstCursor = 0;
    for (let i = 0; i < MAX_BURSTS; i++) {
      const sp = new Sprite(this.starTex);
      sp.anchor.set(0.5);
      sp.visible = false;
      this.worldBurstLayer.addChild(sp);
      this.bursts.push({ sp, active: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, maxAge: 0.8, size: 14 });
    }

    // 4. Pre-allocated world floater text pool
    this.floaters = [];
    this.floaterCursor = 0;
    const floaterStyle = new TextStyle({
      fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
      fontSize: 15,
      fontWeight: '800',
      fill: 0xfffdf7,
      stroke: { color: 0x2b1408, width: 4, join: 'round' }
    });
    for (let i = 0; i < MAX_FLOATERS; i++) {
      const t = new Text({ text: '', style: floaterStyle.clone() });
      t.anchor.set(0.5);
      t.visible = false;
      this.worldFloaterLayer.addChild(t);
      this.floaters.push({ text: t, active: false, x: 0, y: 0, age: 0, maxAge: 1.35 });
    }

    // 5. Pre-allocated flying HUD item pool
    this.flying = [];
    this.flyingCursor = 0;
    for (let i = 0; i < MAX_FLYING; i++) {
      const sp = new Sprite(this.starTex);
      sp.anchor.set(0.5);
      sp.visible = false;
      this.screenFlyingLayer.addChild(sp);
      this.flying.push({
        sp,
        active: false,
        sx: 0,
        sy: 0,
        tx: 0,
        ty: 0,
        age: 0,
        maxAge: 0.65,
        onLand: null
      });
    }

    // Swipe harvest/plant golden/emerald trail ring
    this.swipeTrail = [];
  }

  emitSmoke(x, y, tintHex = 0xffffff) {
    const p = this.smoke[this.smokeCursor];
    this.smokeCursor = (this.smokeCursor + 1) % MAX_SMOKE;
    p.active = true;
    p.x = x + (Math.random() - 0.5) * 6;
    p.y = y;
    p.vx = 9 + Math.random() * 8;
    p.vy = -22 - Math.random() * 12;
    p.age = 0;
    p.maxAge = 2.1 + Math.random() * 0.9;
    p.baseScale = 0.24 + Math.random() * 0.14;
    p.sp.tint = typeof tintHex === 'string' ? parseInt(tintHex.replace('#', ''), 16) || 0xffffff : tintHex;
    p.sp.visible = true;
  }

  spawnBurst(wx, wy, color = '#FDE047', count = 10, shape = 'star') {
    const tint = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) || 0xfde047 : color;
    const tex = shape === 'heart' ? this.heartTex : this.starTex;
    for (let i = 0; i < count; i++) {
      const p = this.bursts[this.burstCursor];
      this.burstCursor = (this.burstCursor + 1) % MAX_BURSTS;
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const spd = 48 + Math.random() * 68;
      p.active = true;
      p.x = wx;
      p.y = wy;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd - 44;
      p.age = 0;
      p.maxAge = 0.65 + Math.random() * 0.35;
      p.size = 11 + Math.random() * 9;
      p.sp.texture = tex;
      p.sp.tint = tint;
      p.sp.visible = true;
    }
  }

  spawnFloater(wx, wy, label, color = '#FFFDF7') {
    const f = this.floaters[this.floaterCursor];
    this.floaterCursor = (this.floaterCursor + 1) % MAX_FLOATERS;
    f.active = true;
    f.x = wx;
    f.y = wy;
    f.age = 0;
    f.maxAge = 1.35;
    f.text.text = String(label || '');
    f.text.style.fill = color;
    f.text.x = wx;
    f.text.y = wy;
    f.text.alpha = 1;
    f.text.visible = true;
  }

  spawnFlyingHudItem(sx, sy, tx, ty, itemId, onLand = null) {
    const f = this.flying[this.flyingCursor];
    this.flyingCursor = (this.flyingCursor + 1) % MAX_FLYING;
    const tex = this.textures.getIcon(itemId) || this.starTex;
    f.active = true;
    f.sx = sx;
    f.sy = sy;
    f.tx = tx;
    f.ty = ty;
    f.age = 0;
    f.maxAge = 0.62;
    f.onLand = onLand;
    f.sp.texture = tex;
    f.sp.tint = 0xffffff;
    f.sp.width = 30;
    f.sp.height = 30;
    f.sp.visible = true;
  }

  addSwipePoint(sx, sy, mode = 'harvest') {
    this.swipeTrail.push({ x: sx, y: sy, age: 0, mode });
    if (this.swipeTrail.length > 26) this.swipeTrail.shift();
  }

  update(dt, sec, screenW, screenH) {
    // 1. Update snowfall
    for (let i = 0; i < MAX_FLAKES; i++) {
      const f = this.flakes[i];
      f.x += (f.vx + Math.sin(sec * 1.15 + f.phase) * 14 * f.depth) * dt;
      f.y += f.vy * dt;
      if (f.y > screenH + 16) {
        f.y = -12;
        f.x = Math.random() * (screenW + 120);
      }
      if (f.x < -16) f.x = screenW + 16;
      if (f.x > screenW + 140) f.x = -12;
      f.sp.x = f.x;
      f.sp.y = f.y;
    }

    // 2. Update smoke
    for (let i = 0; i < MAX_SMOKE; i++) {
      const p = this.smoke[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        p.sp.visible = false;
        continue;
      }
      const t = p.age / p.maxAge;
      p.x += (p.vx + Math.sin(sec * 2.0 + i) * 5) * dt;
      p.y += p.vy * dt;
      p.sp.x = p.x;
      p.sp.y = p.y;
      const sc = p.baseScale * (1 + t * 1.9);
      p.sp.scale.set(sc);
      p.sp.alpha = Math.sin(t * Math.PI) * 0.56;
    }

    // 3. Update bursts
    for (let i = 0; i < MAX_BURSTS; i++) {
      const p = this.bursts[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        p.sp.visible = false;
        continue;
      }
      const t = p.age / p.maxAge;
      p.vy += 170 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sp.x = p.x;
      p.sp.y = p.y;
      const sz = p.size * (1 - t * 0.45);
      p.sp.width = sz;
      p.sp.height = sz;
      p.sp.rotation = t * 2.4;
      p.sp.alpha = 1 - t;
    }

    // 4. Update floaters
    for (let i = 0; i < MAX_FLOATERS; i++) {
      const f = this.floaters[i];
      if (!f.active) continue;
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        f.text.visible = false;
        continue;
      }
      const t = f.age / f.maxAge;
      f.y -= 36 * dt;
      f.text.x = f.x;
      f.text.y = f.y;
      f.text.alpha = t < 0.72 ? 1 : (1 - t) / 0.28;
    }

    // 5. Update flying HUD items
    for (let i = 0; i < MAX_FLYING; i++) {
      const f = this.flying[i];
      if (!f.active) continue;
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        f.sp.visible = false;
        if (f.onLand) {
          const cb = f.onLand;
          f.onLand = null;
          cb();
        }
        continue;
      }
      const t = f.age / f.maxAge;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const arc = Math.sin(t * Math.PI) * 62;
      f.sp.x = f.sx + (f.tx - f.sx) * ease;
      f.sp.y = f.sy + (f.ty - f.sy) * ease - arc;
      const sz = 28 + Math.sin(t * Math.PI) * 8;
      f.sp.width = sz;
      f.sp.height = sz;
      f.sp.alpha = t > 0.85 ? (1 - t) / 0.15 : 1;
    }

    // 6. Update swipe trail
    this.screenSwipeGfx.clear();
    for (let i = this.swipeTrail.length - 1; i >= 0; i--) {
      this.swipeTrail[i].age += dt;
      if (this.swipeTrail[i].age > 0.28) this.swipeTrail.splice(i, 1);
    }
    if (this.swipeTrail.length > 1) {
      for (let i = 1; i < this.swipeTrail.length; i++) {
        const a = this.swipeTrail[i - 1];
        const b = this.swipeTrail[i];
        const life = Math.max(0, 1 - b.age / 0.28);
        const col = b.mode === 'plant' ? 0x4ade80 : 0xfde047;
        this.screenSwipeGfx
          .moveTo(a.x, a.y)
          .lineTo(b.x, b.y)
          .stroke({ color: col, width: 4 + life * 9, alpha: life * 0.72, cap: 'round' });
      }
    }
  }
}
