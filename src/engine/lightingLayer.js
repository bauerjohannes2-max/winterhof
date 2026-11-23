// ============================================================================
// WINTERHOF v6 — GPU Lighting & Atmosphere Engine (PixiJS v8)
// Style C Crisp Day -> Style B Golden-Hour Dusk -> Deep Sapphire & Gold Night
// ============================================================================
import { Container, Graphics, Sprite } from 'pixi.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rgbToHex(r, g, b) {
  return ((Math.round(r) & 0xff) << 16) | ((Math.round(g) & 0xff) << 8) | (Math.round(b) & 0xff);
}

export class LightingLayer {
  constructor(textures) {
    this.textures = textures;

    // World-space additive emissive light pool (lanterns, windows, ovens, tree, bridge)
    this.worldEmissive = new Container();
    this.glowPool = [];
    const glowTex = textures.get('fx_warm_glow');
    for (let i = 0; i < 42; i++) {
      const sp = new Sprite(glowTex);
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      sp.visible = false;
      this.worldEmissive.addChild(sp);
      this.glowPool.push(sp);
    }

    // Screen-space atmospheric grading container (multiply ambient + dusk warmth + night aurora/stars)
    this.screenLayer = new Container();

    this.multiplyOverlay = new Graphics();
    this.multiplyOverlay.blendMode = 'multiply';
    this.screenLayer.addChild(this.multiplyOverlay);

    this.duskSunWash = new Graphics();
    this.duskSunWash.blendMode = 'screen';
    this.screenLayer.addChild(this.duskSunWash);

    this.auroraGfx = new Graphics();
    this.auroraGfx.blendMode = 'add';
    this.screenLayer.addChild(this.auroraGfx);

    // Pre-allocated crisp starfield sprites for night sky
    this.starContainer = new Container();
    this.stars = [];
    const starTex = textures.get('fx_snowflake');
    for (let i = 0; i < 36; i++) {
      const sp = new Sprite(starTex);
      sp.anchor.set(0.5);
      sp.blendMode = 'add';
      sp.visible = false;
      const sx = ((Math.sin(i * 73.1) * 0.5 + 0.5) * 0.96 + 0.02);
      const sy = ((Math.cos(i * 41.7) * 0.5 + 0.5) * 0.24 + 0.02);
      const r = 0.12 + (i % 4) * 0.055;
      sp.scale.set(r);
      this.starContainer.addChild(sp);
      this.stars.push({ sp, rx: sx, ry: sy, phase: i * 1.13 });
    }
    this.screenLayer.addChild(this.starContainer);

    this._lastW = 0;
    this._lastH = 0;
  }

  /**
   * Computes crisp Day / Style-B Golden Dusk / Deep Sapphire Night blend weights.
   * ev in [0, 1]: 0 = bright Style-C Day, ~0.48 = Style-B Golden Hour, 1 = Starlight Night
   */
  computeFactors(ev) {
    // Bell curve peaking smoothly at Golden Hour (ev = 0.48)
    const dusk = Math.max(0, 1 - Math.abs(ev - 0.48) / 0.42);
    const duskSmooth = dusk * dusk * (3 - 2 * dusk);
    // Deep night ramps up smoothly after dusk (0.45 -> 1.0)
    const night = Math.max(0, Math.min(1, (ev - 0.40) / 0.60));
    return { dusk: duskSmooth, night };
  }

  update(w, h, sec, ev, glowSpots) {
    const { dusk, night } = this.computeFactors(ev);

    // 1. Multiply ambient grade (zero muddy gray! Crisp white -> warm peach-lavender -> deep sapphire)
    let mr = 255;
    let mg = 255;
    let mb = 255;
    if (ev <= 0.48) {
      const t = ev / 0.48;
      // Style B Golden-Hour lavender-warm contrast tint
      mr = lerp(255, 246, t);
      mg = lerp(255, 206, t);
      mb = lerp(255, 212, t);
    } else {
      const t = (ev - 0.48) / 0.52;
      // Deep high-contrast alpine sapphire night (preserves rich blue snow shadows!)
      mr = lerp(246, 86, t);
      mg = lerp(206, 114, t);
      mb = lerp(212, 184, t);
    }

    const multColor = rgbToHex(mr, mg, mb);
    this.multiplyOverlay.clear();
    if (ev > 0.01) {
      this.multiplyOverlay.rect(0, 0, w, h).fill({ color: multColor, alpha: 1.0 });
      this.multiplyOverlay.visible = true;
    } else {
      this.multiplyOverlay.visible = false;
    }

    // 2. Style-B Golden-Hour warm sunlight sheen across snow ridges & roofs
    this.duskSunWash.clear();
    if (dusk > 0.02) {
      this.duskSunWash.rect(0, 0, w, h).fill({ color: 0xffae52, alpha: dusk * 0.16 });
      this.duskSunWash.visible = true;
    } else {
      this.duskSunWash.visible = false;
    }

    // 3. Subtle alpine Aurora veil & twinkling stars along upper rim at night
    this.auroraGfx.clear();
    if (night > 0.25) {
      const aAlpha = (night - 0.25) * 0.22;
      const wave = Math.sin(sec * 0.45) * 26;
      this.auroraGfx
        .ellipse(w * 0.28 + wave, h * 0.06, w * 0.34, h * 0.11)
        .fill({ color: 0x34d399, alpha: aAlpha * 0.55 });
      this.auroraGfx
        .ellipse(w * 0.72 - wave * 0.8, h * 0.07, w * 0.32, h * 0.10)
        .fill({ color: 0x38bdf8, alpha: aAlpha * 0.50 });
      this.auroraGfx.visible = true;
    } else {
      this.auroraGfx.visible = false;
    }

    if (night > 0.35) {
      this.starContainer.visible = true;
      const baseA = (night - 0.35) / 0.65;
      for (let i = 0; i < this.stars.length; i++) {
        const st = this.stars[i];
        st.sp.visible = true;
        st.sp.x = st.rx * w;
        st.sp.y = st.ry * h;
        st.sp.alpha = baseA * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(sec * 2.4 + st.phase)));
      }
    } else {
      this.starContainer.visible = false;
    }

    // 4. World-space additive warm golden light pools (lanterns, windows, ovens, tree, bridge)
    // Glows gently even during Golden Dusk (Style B) and vividly at Night!
    const emissivePower = Math.max(dusk * 0.56, night * 0.96);
    let idx = 0;
    if (emissivePower > 0.03 && glowSpots && glowSpots.length > 0) {
      for (let i = 0; i < glowSpots.length && idx < this.glowPool.length; i++) {
        const g = glowSpots[i];
        const sp = this.glowPool[idx++];
        const flicker = 0.92 + 0.08 * Math.sin(sec * 4.2 + i * 2.17);
        const radius = (g.r || 90) * (1.0 + night * 0.24) * flicker;
        sp.x = g.x;
        sp.y = g.y;
        sp.width = radius * 2.15;
        sp.height = radius * 1.72; // Slightly squashed isometric snow light pool!
        sp.tint = g.tint || 0xffc66d;
        sp.alpha = Math.min(1, emissivePower * (g.intensity || 0.82) * flicker);
        sp.visible = true;
      }
    }
    for (let i = idx; i < this.glowPool.length; i++) {
      this.glowPool[i].visible = false;
    }

    this._lastW = w;
    this._lastH = h;
    return { dusk, night };
  }
}
