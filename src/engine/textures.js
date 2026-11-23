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

    // ---- Wildnis auf gesperrtem Land (Hay-Day-Prinzip: Steine, Stümpfe, Büsche) ----
    const outline = '#3A2A22';
    this.map.set('wild_rock', makeCanvasTexture(160, 120, (ctx) => {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = outline;
      const body = new Path2D('M18 98 C10 70 30 40 62 34 C80 18 116 24 132 48 C150 62 152 90 140 102 C110 112 50 112 18 98 Z');
      const gr = ctx.createLinearGradient(30, 30, 130, 110);
      gr.addColorStop(0, '#B9C6D6'); gr.addColorStop(0.6, '#8C9BB0'); gr.addColorStop(1, '#6C7A90');
      ctx.fillStyle = gr; ctx.fill(body); ctx.stroke(body);
      const cap = new Path2D('M30 58 C40 38 66 30 82 34 C100 24 124 34 132 52 C118 60 104 52 92 58 C76 50 56 64 30 58 Z');
      ctx.fillStyle = '#FBFDFF'; ctx.fill(cap);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(58,42,34,0.55)'; ctx.stroke(cap);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(52, 76, 10, 5, -0.4, 0, Math.PI * 2); ctx.fill();
    }));
    this.map.set('wild_stump', makeCanvasTexture(120, 120, (ctx) => {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = outline;
      const side = new Path2D('M24 46 L24 92 C24 108 96 108 96 92 L96 46 Z');
      const gr = ctx.createLinearGradient(24, 0, 96, 0);
      gr.addColorStop(0, '#8A5530'); gr.addColorStop(0.5, '#6E3F22'); gr.addColorStop(1, '#4E2A15');
      ctx.fillStyle = gr; ctx.fill(side); ctx.stroke(side);
      ctx.beginPath(); ctx.ellipse(60, 46, 36, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F7FBFF'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(58,42,34,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(40, 70); ctx.lineTo(40, 96); ctx.moveTo(72, 66); ctx.lineTo(72, 98); ctx.stroke();
    }));
    this.map.set('wild_bush', makeCanvasTexture(150, 120, (ctx) => {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = outline;
      const b = new Path2D('M16 96 C6 74 22 52 44 54 C48 32 76 22 94 38 C112 30 138 46 132 68 C148 78 142 102 124 104 C90 110 46 110 16 96 Z');
      ctx.fillStyle = '#2F7A4A'; ctx.fill(b); ctx.stroke(b);
      ctx.fillStyle = '#3F9A5E';
      ctx.beginPath(); ctx.ellipse(56, 78, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(102, 82, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
      const snow = new Path2D('M30 62 C40 48 56 46 64 52 C72 34 96 32 106 46 C118 42 130 54 126 66 C110 62 98 70 86 64 C70 72 50 62 30 62 Z');
      ctx.fillStyle = '#FBFDFF'; ctx.fill(snow);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(58,42,34,0.45)'; ctx.stroke(snow);
      ctx.fillStyle = '#D23A32';
      for (const [x, y] of [[48, 84], [90, 72], [112, 92]]) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill(); }
    }));

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
