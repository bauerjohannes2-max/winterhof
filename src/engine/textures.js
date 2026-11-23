// ============================================================================
// WINTERHOF v6 — GPU Texture Registry & Pre-baked Soft VFX Atlases (Zero-GC)
// ============================================================================
import { Texture } from 'pixi.js';
import { sprites } from '../sprites.js';

function makeCanvasTexture(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  drawFn(ctx, w, h);
  return Texture.from(c);
}

export class GpuTextures {
  constructor() {
    this.map = new Map();
    this.ready = false;
  }

  build() {
    if (this.ready) return;

    // Upload all loaded WebP sprites & terrain textures onto GPU
    // Rasterize SVG-backed Images onto crisp offscreen canvases so WebGL2 uploads valid RGBA pixels (zero black/blank textures!)
    for (const [key, img] of Object.entries(sprites.images)) {
      if (!img) continue;
      try {
        let sourceEl = img;
        const isSvg = typeof img.src === 'string' && img.src.startsWith('data:image/svg');
        if (isSvg) {
          const rw = Math.max(128, Math.min(256, img.naturalWidth || 200));
          const rh = Math.max(128, Math.min(256, img.naturalHeight || 200));
          const c = document.createElement('canvas');
          c.width = rw;
          c.height = rh;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, rw, rh);
          sourceEl = c;
        }
        const tex = Texture.from(sourceEl);
        if (tex.source) {
          tex.source.scaleMode = 'linear';
          if (key.startsWith('terrain_')) {
            tex.source.addressMode = 'repeat';
          }
        }
        this.map.set(key, tex);
      } catch {
        // Ignore non-image entries safely
      }
    }

    // Soft cool-alpine contact shadow (replaces flat ellipses, zero CPU shadowBlur)
    this.map.set('fx_shadow', makeCanvasTexture(128, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, w * 0.5);
      g.addColorStop(0.0, 'rgba(24, 48, 86, 0.42)');
      g.addColorStop(0.55, 'rgba(32, 62, 108, 0.22)');
      g.addColorStop(1.0, 'rgba(32, 62, 108, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));

    // Warm additive emissive lantern / window glow pool (Style B / Night bloom)
    this.map.set('fx_warm_glow', makeCanvasTexture(192, 192, (ctx, w, h) => {
      const cx = w * 0.5;
      const g = ctx.createRadialGradient(cx, cx, 2, cx, cx, cx);
      g.addColorStop(0.0, 'rgba(255, 240, 175, 0.92)');
      g.addColorStop(0.24, 'rgba(255, 186, 72, 0.58)');
      g.addColorStop(0.58, 'rgba(245, 132, 34, 0.22)');
      g.addColorStop(1.0, 'rgba(245, 120, 20, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));

    // Cool turquoise frost glow for ice-brook highlights & treasure chest aura
    this.map.set('fx_frost_glow', makeCanvasTexture(128, 128, (ctx, w, h) => {
      const cx = w * 0.5;
      const g = ctx.createRadialGradient(cx, cx, 2, cx, cx, cx);
      g.addColorStop(0.0, 'rgba(224, 248, 255, 0.85)');
      g.addColorStop(0.45, 'rgba(125, 211, 252, 0.32)');
      g.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));

    // Crisp soft snowflake particle
    this.map.set('fx_snowflake', makeCanvasTexture(32, 32, (ctx, w, h) => {
      const cx = w * 0.5;
      const g = ctx.createRadialGradient(cx, cx, 1, cx, cx, cx - 2);
      g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      g.addColorStop(0.48, 'rgba(235, 247, 255, 0.78)');
      g.addColorStop(1.0, 'rgba(220, 240, 255, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));

    // Soft painterly chimney smoke puff
    this.map.set('fx_smoke', makeCanvasTexture(64, 64, (ctx, w, h) => {
      const cx = w * 0.5;
      const g = ctx.createRadialGradient(cx - 4, cx - 4, 4, cx, cx, cx - 3);
      g.addColorStop(0.0, 'rgba(255, 253, 248, 0.72)');
      g.addColorStop(0.55, 'rgba(236, 244, 252, 0.36)');
      g.addColorStop(1.0, 'rgba(226, 238, 248, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }));

    // 4-point golden harvest sparkle star
    this.map.set('fx_star', makeCanvasTexture(48, 48, (ctx, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const rad = i % 2 === 0 ? 20 : 6.5;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }));

    // Clean vector heart particle for animal petting
    this.map.set('fx_heart', makeCanvasTexture(48, 48, (ctx, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.46;
      const r = 13;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.95);
      ctx.bezierCurveTo(cx - r * 1.4, cy + r * 0.1, cx - r * 1.2, cy - r * 0.95, cx, cy - r * 0.25);
      ctx.bezierCurveTo(cx + r * 1.2, cy - r * 0.95, cx + r * 1.4, cy + r * 0.1, cx, cy + r * 0.95);
      ctx.fill();
    }));

    // Warm golden straw texture for animal pens
    this.map.set('fx_straw', makeCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#E5B75C';
      ctx.fillRect(0, 0, w, h);
      const colors = ['#F4D37B', '#C9933B', '#FDE69D', '#B67D2A'];
      for (let i = 0; i < 240; i++) {
        const x = (Math.sin(i * 19.3) * 0.5 + 0.5) * w;
        const y = (Math.cos(i * 31.7) * 0.5 + 0.5) * h;
        const ang = Math.sin(i * 7.1) * 1.4;
        const len = 10 + (i % 9);
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * len * 0.5, y - Math.sin(ang) * len * 0.5);
        ctx.lineTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5);
        ctx.stroke();
      }
    }));

    this.ready = true;
  }

  get(key) {
    return this.map.get(key) || null;
  }

  getIcon(itemId) {
    return this.map.get('icon_' + itemId) || this.map.get(itemId) || null;
  }
}
