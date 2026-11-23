// ============================================================================
// WINTERHOF v6 — Grid-Driven Terrain, Autotiled Cobblestone Roads & Fences
// 100% Derived from WorldGrid (Single Source of Truth) + Optional Debug-Grid
// Zero Random Ellipses · Zero Fence-in-Water · Crisp Grounded Foundations
// ============================================================================
import { Container, Graphics, Matrix, Sprite, Texture, TilingSprite } from 'pixi.js';
import { TERRAIN, SURFACE, PLAYABLE_MIN, PLAYABLE_MAX } from './worldGrid.js';

function isoTilePoly(gridToWorld, gx, gy, pad = 0) {
  const a = gridToWorld(gx - pad, gy - pad);
  const b = gridToWorld(gx + 1 + pad, gy - pad);
  const c = gridToWorld(gx + 1 + pad, gy + 1 + pad);
  const d = gridToWorld(gx - pad, gy + 1 + pad);
  return [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y];
}

function isoRectPoly(gridToWorld, x0, y0, x1, y1) {
  const a = gridToWorld(x0, y0);
  const b = gridToWorld(x1, y0);
  const c = gridToWorld(x1, y1);
  const d = gridToWorld(x0, y1);
  return [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y];
}

export class TerrainLayer {
  constructor(textures, gridToWorld, worldGrid) {
    this.textures = textures;
    this.gridToWorld = gridToWorld;
    this.grid = worldGrid;
    this.container = new Container();

    // 1. Boden wie bei Hay Day: eine ruhige, gemalte Fläche ohne Kachelmuster,
    //    Wege direkt hineingemalt (weiche Ränder, Fahrspuren) statt harter Pflasterkacheln.
    // Probe 23.11.: gemalte, nahtlose Schnee-Textur (Gemini) unter dem Boden-Canvas
    const snowTex = textures.get('probe_ground_snow');
    this.probe = !!snowTex;
    if (snowTex) {
      const ts = new TilingSprite({ texture: snowTex, width: 5200, height: 2900 });
      ts.x = -2600; ts.y = -900;
      ts.tileScale.set(0.62); // 1024 px ≈ 635 Weltpunkte ≈ 5,5 Kacheln je Wiederholung
      this.container.addChild(ts);
      ts.tint = 0xe8eef6; // Hof-Schnee eine Spur gedämpfter (blendete zu hell)
      this.groundTiling = ts;
    }
    this.ground = this._paintGround();
    this.container.addChild(this.ground);
    const dirtTex = this.probe ? textures.get('probe_path_dirt') : null;
    if (dirtTex) {
      // Probe: Weg in voller Auflösung mit gemalter Erde-Textur (Canvas liefert nur den weichen Saum)
      const rg = new Graphics();
      for (const t of worldGrid.roadTiles) {
        rg.poly(isoTilePoly(gridToWorld, t.gx, t.gy, 0.005))
          .fill({ texture: dirtTex, textureSpace: 'global', matrix: new Matrix().scale(0.5, 0.5), color: 0xffffff });
      }
      this.container.addChild(rg);
      this.roadGfx = rg;
    }
    this.roadContainer = new Container();

    // 4. Ackerfelder: flach, exakt auf dem Raster, aneinanderliegend wie ein Feld (Hay Day)
    this.fieldGfx = new Graphics();
    this.container.addChild(this.fieldGfx);
    this._lastFieldSig = null;

    // 5. Grounding Base Plates (Footprint Foundations under buildings/landmarks/props)
    this.groundingGfx = new Graphics();
    this.container.addChild(this.groundingGfx);

    // 6. Unlocked/Locked zone subtle border overlay (place/move mode) & ghost highlight
    this.zoneOverlayGfx = new Graphics();
    this.container.addChild(this.zoneOverlayGfx);

    // 7. Grid-Derived Snow-Capped 3D Timber Fences (strictly from grid.fenceEdges!)
    this.fenceGfx = new Graphics();
    this.container.addChild(this.fenceGfx);

    // 8. Build/Move interactive ghost preview tile highlight
    this.ghostGfx = new Graphics();
    this.container.addChild(this.ghostGfx);

    // 9. Optional Developer / Director Debug-Grid Overlay (?grid=1)
    this.debugGridGfx = new Graphics();
    this.debugGridGfx.visible = false;
    this.container.addChild(this.debugGridGfx);

    this._lastFenceSig = null;
    this._lastGroundSig = null;
  }

  _paintGround() {
    const g2w = this.gridToWorld;
    // Weltausschnitt, der den ganzen Talboden abdeckt (großzügig über den Waldrand hinaus)
    const X0 = -2600, Y0 = -900, W = 5200, H = 2900;
    const K = 0.42; // Bildpunkte je Weltpunkt (Boden ist weich, braucht keine Schärfe)
    const cw = Math.round(W * K), ch = Math.round(H * K);
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext('2d');
    const P = (x, y) => [(x - X0) * K, (y - Y0) * K];
    let seed = 1224;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    const probe = this.probe;
    // Grundton: frischer Schnee, ganz leicht blau (Probe: Textur liegt darunter, Canvas bleibt durchsichtig)
    if (!probe) {
    ctx.fillStyle = '#EDF3F9';
    ctx.fillRect(0, 0, cw, ch);
    // Große, weiche Licht- und Schattenwolken (wie Wiesenflecken bei Hay Day, sehr dezent)
    for (let i = 0; i < 170; i++) {
      const [x, y] = P(X0 + rnd() * W, Y0 + rnd() * H);
      const r = (120 + rnd() * 380) * K;
      const light = rnd() < 0.55;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, light ? 'rgba(255,255,255,0.55)' : 'rgba(196,214,234,0.32)');
      gr.addColorStop(1, light ? 'rgba(255,255,255,0)' : 'rgba(196,214,234,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Feine Schneestruktur: kurze, flache Striche (isometrisch flach gedrückt)
    for (let i = 0; i < 9000; i++) {
      const [x, y] = P(X0 + rnd() * W, Y0 + rnd() * H);
      const bright = rnd() < 0.5;
      ctx.fillStyle = bright ? 'rgba(255,255,255,0.75)' : 'rgba(170,192,218,0.22)';
      ctx.fillRect(x, y, 1 + rnd() * 2.5, 1);
    }
    } else {
      // Nur sanfte, große Lichtflecken über der Textur (warmes Sonnenlicht, kühle Mulden)
      for (let i = 0; i < 60; i++) {
        const [x, y] = P(X0 + rnd() * W, Y0 + rnd() * H);
        const r = (200 + rnd() * 420) * K;
        const light = rnd() < 0.6;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, light ? 'rgba(255,246,226,0.22)' : 'rgba(150,180,220,0.16)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    const dirtImg = probe ? this.textures.get('probe_path_dirt')?.source?.resource : null;

    // Wege: weich gemalter, festgetretener Schneeweg (Hay-Day-Feldweg im Winter)
    const tiles = this.grid.roadTiles;
    const polyPath = (pad) => {
      ctx.beginPath();
      for (const t of tiles) {
        const pts = isoTilePoly(g2w, t.gx, t.gy, pad);
        for (let i = 0; i < 8; i += 2) {
          const [x, y] = P(pts[i], pts[i + 1]);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
    };
    ctx.save();
    // Rand: weicher, dunklerer Saum (Weg liegt leicht vertieft im Schnee)
    ctx.filter = `blur(${Math.max(2, Math.round(6 * K))}px)`;
    ctx.fillStyle = 'rgba(122,86,56,0.75)';
    polyPath(0.08);
    ctx.fill();
    // Wegfläche: warmes, festgefahrenes Erdbraun mit Schnee (Hay-Day-Feldweg im Winter)
    ctx.filter = `blur(${Math.max(1, Math.round(2 * K))}px)`;
    ctx.fillStyle = '#C79A6B';
    if (!probe) { polyPath(0.0); ctx.fill(); }
    if (false && dirtImg) {
      // Gemalte Weg-Textur (Erde, Matschschnee, Steinchen) in die Wegform
      ctx.filter = 'none';
      const pat = ctx.createPattern(dirtImg, 'repeat');
      if (pat) {
        pat.setTransform(new DOMMatrix().scale(0.2)); // 512 px ≈ 2 Kacheln
        ctx.fillStyle = pat;
        polyPath(-0.02);
        ctx.fill();
      }
    }
    ctx.filter = 'none';
    const lg = ctx.createLinearGradient(0, 0, 0, ch);
    lg.addColorStop(0, 'rgba(255,236,205,0.25)'); lg.addColorStop(1, 'rgba(255,236,205,0.1)');
    ctx.fillStyle = lg;
    if (!probe) { polyPath(-0.12); ctx.fill(); }
    ctx.restore();
    // Fahrspuren entlang des Hauptwegs (Reihe gy = 6)
    ctx.save();
    ctx.filter = `blur(${Math.max(1, Math.round(2 * K))}px)`;
    ctx.lineCap = 'round';
    const mainRow = probe ? [] : tiles.filter((t) => t.gy === 6);
    if (mainRow.length) {
      const xs = mainRow.map((t) => t.gx);
      const minX = Math.min(...xs), maxX = Math.max(...xs) + 1;
      for (const off of [0.3, 0.7]) {
        const a = P(g2w(minX, 6 + off).x, g2w(minX, 6 + off).y);
        const b = P(g2w(maxX, 6 + off).x, g2w(maxX, 6 + off).y);
        ctx.strokeStyle = 'rgba(132,92,58,0.6)';
        ctx.lineWidth = 7 * K;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    // Schneereste und Kiesel auf dem Weg
    for (const t of probe ? [] : tiles) {
      for (let i = 0; i < 7; i++) {
        const w = g2w(t.gx + 0.1 + rnd() * 0.8, t.gy + 0.1 + rnd() * 0.8);
        const [x, y] = P(w.x, w.y);
        ctx.fillStyle = rnd() < 0.6 ? 'rgba(255,255,255,0.8)' : 'rgba(120,96,70,0.5)';
        ctx.beginPath(); ctx.ellipse(x, y, (2 + rnd() * 4) * K, (1 + rnd() * 2) * K, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    const tex = Texture.from(c);
    const sp = new Sprite(tex);
    sp.x = X0;
    sp.y = Y0;
    sp.width = W;
    sp.height = H;
    return sp;
  }

  _drawRoadTilePolys(g, pad = 0) {
    const g2w = this.gridToWorld;
    for (const t of this.grid.roadTiles) {
      // Skip drawing stone road over water (the 3D timber bridge spans BRIDGE_X cleanly!)
      if (t.surface === SURFACE.BRIDGE_X || t.surface === SURFACE.BRIDGE_Y) continue;
      g.poly(isoTilePoly(g2w, t.gx, t.gy, pad));
    }
  }

  /**
   * Renders true isometric Footprint Grounding Base Plates under every building/station/landmark
   * so sprites sit firmly PLANTED into the snow (eliminating the "floating sticker" look!).
   */
  _rebuildFields(fields) {
    const g = this.fieldGfx;
    const g2w = this.gridToWorld;
    g.clear();
    const has = new Set(fields.map((f) => `${f.gx},${f.gy}`));
    if (this.probe && this.textures.get('probe_field_soil')) {
      // Probe: Feld-Bilder (world.js) sind exakt auf die Kachel geschnitten. Hier nur der gemeinsame
      // Rand des ganzen Ackers: Schneewall außen, Erdkante vorn, Erde als Lückenfüller (Hay Day: ein Acker).
      const outer = [];
      for (const f of fields) {
        const { gx: x, gy: y } = f;
        if (!has.has(`${x},${y - 1}`)) outer.push([x, y, x + 1, y, 'b']);
        if (!has.has(`${x - 1},${y}`)) outer.push([x, y, x, y + 1, 'b']);
        if (!has.has(`${x},${y + 1}`)) outer.push([x, y + 1, x + 1, y + 1, 'f']);
        if (!has.has(`${x + 1},${y}`)) outer.push([x + 1, y, x + 1, y + 1, 'f']);
      }
      const seg = (w, color, alpha, oy, only) => {
        for (const [x0, y0, x1, y1, k] of outer) {
          if (only && k !== only) continue;
          const a = g2w(x0, y0), b = g2w(x1, y1);
          g.moveTo(a.x, a.y + oy).lineTo(b.x, b.y + oy);
        }
        g.stroke({ color, width: w, alpha, cap: 'round', join: 'round' });
      };
      // weicher Schatten + aufgeworfener Schnee rund um den Acker
      seg(30, 0x45648a, 0.10, 8);
      seg(22, 0xf4f8fc, 0.95, 1);
      seg(12, 0xffffff, 1, -1);
      // Erde (füllt Fugen zwischen den Bildern)
      for (const f of fields) g.poly(isoTilePoly(g2w, f.gx, f.gy, 0)).fill(0x5a3826);
      // Erdkante vorn (Acker liegt leicht erhöht)
      const D = 7;
      for (const [x0, y0, x1, y1, k] of outer) {
        if (k !== 'f') continue;
        const a = g2w(x0, y0), b = g2w(x1, y1);
        g.poly([a.x, a.y, b.x, b.y, b.x, b.y + D, a.x, a.y + D]).fill(x0 === x1 ? 0x3e2516 : 0x4c2e1c);
      }
      return;
    }
    // 1) Kante/Sockel aller Felder zuerst (Erde ragt 6 px aus dem Schnee)
    for (const f of fields) {
      const i = 0.03;
      const a = g2w(f.gx + i, f.gy + 1 - i), b = g2w(f.gx + 1 - i, f.gy + 1 - i), c = g2w(f.gx + 1 - i, f.gy + i);
      const D = 6;
      if (!has.has(`${f.gx},${f.gy + 1}`)) g.poly([a.x, a.y, b.x, b.y, b.x, b.y + D, a.x, a.y + D]).fill(0x5a3218);
      if (!has.has(`${f.gx + 1},${f.gy}`)) g.poly([b.x, b.y, c.x, c.y, c.x, c.y + D, b.x, b.y + D]).fill(0x4a2812);
      g.ellipse((a.x + c.x) / 2 + 3, b.y + D + 3, 30, 6).fill({ color: 0x2c4a70, alpha: 0.08 });
    }
    // 2) Ackerfläche mit Furchen
    for (const f of fields) {
      const i = 0.03;
      const top = isoTilePoly(g2w, f.gx + i, f.gy + i, 0).map((v, k) => v);
      const p0 = g2w(f.gx + i, f.gy + i), p1 = g2w(f.gx + 1 - i, f.gy + i), p2 = g2w(f.gx + 1 - i, f.gy + 1 - i), p3 = g2w(f.gx + i, f.gy + 1 - i);
      g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]).fill(0x8b5a33).stroke({ color: 0x5a3218, width: 1.5, alpha: 0.6 });
      // Furchen entlang gx (gleiche Richtung auf allen Feldern -> sauberes Gesamtbild)
      for (let r = 1; r <= 4; r++) {
        const t = r / 5;
        const u = g2w(f.gx + 0.1, f.gy + t), v = g2w(f.gx + 0.9, f.gy + t);
        g.moveTo(u.x, u.y + 1.5).lineTo(v.x, v.y + 1.5).stroke({ color: 0x5e3519, width: 3, cap: 'round', alpha: 0.75 });
        g.moveTo(u.x, u.y - 1).lineTo(v.x, v.y - 1).stroke({ color: 0xa87444, width: 2, cap: 'round', alpha: 0.8 });
      }
      // Lichtkante oben links
      g.moveTo(p0.x, p0.y + 1).lineTo(p1.x, p1.y + 1).stroke({ color: 0xc08a56, width: 1.5, alpha: 0.7 });
      g.moveTo(p0.x, p0.y + 1).lineTo(p3.x, p3.y + 1).stroke({ color: 0xc08a56, width: 1.5, alpha: 0.7 });
      void top;
    }
  }

  _rebuildGroundingPlates() {
    // Keine Platten/Rauten mehr unter Gebäuden (Hannes 23.11.). Nur der weiche Sprite-Schatten bleibt.
    this.groundingGfx.clear();
    if (this.probe) this._paintYardDetails(this.groundingGfx);
  }

  /** Probe: Hof-Boden lebendig wie bei Hay Day (dort Gras/Blumen/Steine) – im Winter: Mulden, Grashalme,
   *  Steine, Zweige, Fußspuren. Nur auf freien, offenen Kacheln, fest per Kachel-Zufall (kein Flackern). */
  _paintYardDetails(g) {
    const g2w = this.gridToWorld;
    const unlocked = this._unlocked || new Set();
    const t0 = this.grid;
    for (let gy = t0.min; gy <= t0.max; gy++) {
      for (let gx = t0.min; gx <= t0.max; gx++) {
        if (!t0.isTileBuildable(gx, gy, unlocked)) continue;
        let h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
        const r = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
        const at = (u, v) => g2w(gx + u, gy + v);
        // kühle Mulde (bricht die helle Fläche, sehr weich)
        if (r() < 0.55) {
          const c = at(0.25 + r() * 0.5, 0.25 + r() * 0.5), rx = 26 + r() * 30;
          for (let k = 0; k < 4; k++) g.ellipse(c.x, c.y, rx * (1 - k * 0.2), rx * 0.42 * (1 - k * 0.2)).fill({ color: 0x8fa9c9, alpha: 0.05 });
        }
        const kind = r();
        const c = at(0.25 + r() * 0.5, 0.25 + r() * 0.5);
        if (kind < 0.30) {
          // Grashalme ragen aus dem Schnee (trockenes Wintergras)
          const n = 4 + Math.floor(r() * 4);
          g.ellipse(c.x + 1, c.y + 1.5, 9, 3).fill({ color: 0x5f7fa6, alpha: 0.16 });
          for (let i = 0; i < n; i++) {
            const bx = c.x + (i - n / 2) * 2.2, len = 7 + r() * 7, lean = (r() - 0.5) * 7;
            g.moveTo(bx, c.y).quadraticCurveTo(bx + lean * 0.3, c.y - len * 0.6, bx + lean, c.y - len)
              .stroke({ color: i % 2 ? 0x8a8a46 : 0x6c7a3a, width: 1.6, cap: 'round' });
          }
          g.ellipse(c.x, c.y + 0.5, 7, 2.4).fill(0xf7fbff);
        } else if (kind < 0.44) {
          // Stein mit Schneehaube
          const w = 7 + r() * 5;
          g.ellipse(c.x + 3, c.y + 2.5, w * 1.2, w * 0.45).fill({ color: 0x45648a, alpha: 0.18 });
          g.ellipse(c.x, c.y - w * 0.25, w, w * 0.62).fill(0x7d8794);
          g.ellipse(c.x + w * 0.2, c.y - w * 0.12, w * 0.75, w * 0.42).fill(0x646d79);
          g.ellipse(c.x - w * 0.12, c.y - w * 0.62, w * 0.72, w * 0.3).fill(0xfbfdff);
        } else if (kind < 0.62) {
          // kleine Schneewehe mit Schatten
          const w = 12 + r() * 12;
          g.ellipse(c.x + 4, c.y + 3, w * 1.1, w * 0.36).fill({ color: 0x5f7fa6, alpha: 0.16 });
          g.ellipse(c.x, c.y, w, w * 0.4).fill(0xf4f8fc);
          g.ellipse(c.x - w * 0.25, c.y - w * 0.12, w * 0.55, w * 0.2).fill(0xffffff);
        } else if (kind < 0.72) {
          // Fußspuren quer über die Kachel (Tiere/Wichtel)
          const a = at(0.1, 0.2 + r() * 0.6), b = at(0.9, 0.2 + r() * 0.6);
          for (let i = 0; i < 6; i++) {
            const t = (i + 0.5) / 6, side = i % 2 ? 2.5 : -2.5;
            g.ellipse(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + side, 2.6, 1.4).fill({ color: 0x7d97ba, alpha: 0.38 });
          }
        } else if (kind < 0.78) {
          // Zweig im Schnee
          const l = 10 + r() * 6;
          g.moveTo(c.x - l, c.y + 2).lineTo(c.x + l, c.y - 2).stroke({ color: 0x5a3a22, width: 1.8, cap: 'round' });
          g.moveTo(c.x - 2, c.y + 0.4).lineTo(c.x + 3, c.y - 5).stroke({ color: 0x5a3a22, width: 1.3, cap: 'round' });
        }
      }
    }
  }

  _drawFenceEdge(g, edge) {
    const g2w = this.gridToWorld;
    const p1 = g2w(edge.x1, edge.y1);
    const p2 = g2w(edge.x2, edge.y2);

    // 1. Ground contact shadow directly beneath rail
    g.moveTo(p1.x + 2, p1.y + 4)
      .lineTo(p2.x + 2, p2.y + 4)
      .stroke({ color: 0x52749c, width: 8, alpha: 0.24, cap: 'round' });

    // 2. Lower beveled warm oak rail
    g.moveTo(p1.x, p1.y - 6).lineTo(p2.x, p2.y - 6).stroke({ color: 0x45200c, width: 5.8, cap: 'round' });
    g.moveTo(p1.x, p1.y - 6.4).lineTo(p2.x, p2.y - 6.4).stroke({ color: 0x9c5b2b, width: 3.2, cap: 'round' });

    // 3. Upper beveled warm oak rail
    g.moveTo(p1.x, p1.y - 14).lineTo(p2.x, p2.y - 14).stroke({ color: 0x45200c, width: 6.2, cap: 'round' });
    g.moveTo(p1.x, p1.y - 14.5).lineTo(p2.x, p2.y - 14.5).stroke({ color: 0xb87035, width: 3.5, cap: 'round' });

    // 4. Sculpted snow cap along upper rail
    g.moveTo(p1.x, p1.y - 16.6).lineTo(p2.x, p2.y - 16.6).stroke({ color: 0xf8fbff, width: 3.0, alpha: 0.94, cap: 'round' });

    // 5. Sturdy corner posts with snow caps at endpoints
    for (const p of [p1, p2]) {
      g.roundRect(p.x - 3.4, p.y - 20, 6.8, 21, 2).fill(0x522710);
      g.roundRect(p.x - 2.1, p.y - 19, 4.2, 19, 1.5).fill(0xb06830);
      g.ellipse(p.x, p.y - 20.5, 4.4, 2.5).fill(0xffffff);
    }
  }

  _rebuildFences() {
    // Kein Zaun um den Hof (Hay Day: die Grenze ist die Wildnis, nicht ein Zaun).
    this.fenceGfx.clear();
  }

  renderDebugGrid(visible) {
    this.debugGridGfx.visible = Boolean(visible);
    if (!visible) return;
    const g = this.debugGridGfx;
    const g2w = this.gridToWorld;
    g.clear();

    // Draw every tile from -1..16 with color-coded terrain/surface/zone semantics
    for (let gy = -1; gy <= 16; gy++) {
      for (let gx = -1; gx <= 16; gx++) {
        const t = this.grid.getTile(gx, gy);
        if (!t) continue;
        let fillCol = 0x93c5fd;
        let fillAlpha = 0.08;
        if (t.terrain === TERRAIN.WATER) { fillCol = 0x06b6d4; fillAlpha = 0.28; }
        else if (t.terrain === TERRAIN.CLIFF) { fillCol = 0x64748b; fillAlpha = 0.24; }
        else if (t.surface === SURFACE.BRIDGE_X || t.surface === SURFACE.BRIDGE_Y) { fillCol = 0xa855f7; fillAlpha = 0.45; }
        else if (t.surface === SURFACE.ROAD || t.surface === SURFACE.PLAZA) { fillCol = 0xf59e0b; fillAlpha = 0.30; }
        else if (t.surface === SURFACE.PLOT) { fillCol = 0x84cc16; fillAlpha = 0.26; }
        else if (gx >= PLAYABLE_MIN && gx <= PLAYABLE_MAX && gy >= PLAYABLE_MIN && gy <= PLAYABLE_MAX) {
          fillCol = 0x3b82f6;
          fillAlpha = 0.08;
        }
        g.poly(isoTilePoly(g2w, gx, gy, 0))
          .fill({ color: fillCol, alpha: fillAlpha })
          .stroke({ color: 0x1e293b, width: 1, alpha: 0.36 });
      }
    }

    // Highlight every entity footprint in bright emerald green
    for (const ent of this.grid.entities.values()) {
      const col = ent.kind === 'sign' ? 0xf97316 : 0x10b981;
      g.poly(isoRectPoly(g2w, ent.gx, ent.gy, ent.gx + ent.w, ent.gy + ent.h))
        .fill({ color: col, alpha: 0.25 })
        .stroke({ color: col, width: 2.4, alpha: 0.95 });
    }

    // Highlight every fence edge in bright magenta-red
    for (const edge of this.grid.fenceEdges) {
      const p1 = g2w(edge.x1, edge.y1);
      const p2 = g2w(edge.x2, edge.y2);
      g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: 0xe11d48, width: 3.5, alpha: 0.95 });
    }
  }

  update(state, uiState, sec, ev, duskFactor, showDebugGrid = false) {

    const fenceSig = `${this.grid.fenceEdges.length}|${(state.unlockedLands || []).join(',')}`;
    if (fenceSig !== this._lastFenceSig) {
      this._lastFenceSig = fenceSig;
      this._rebuildFences();
    }

    const fields = state.fields || [];
    const fieldSig = fields.map((f) => `${f.gx},${f.gy}`).join(';');
    if (fieldSig !== this._lastFieldSig) {
      this._lastFieldSig = fieldSig;
      this._rebuildFields(fields);
    }

    // Rebuild grounding plates whenever entity count/positions change
    this._unlocked = new Set(state.unlockedLands || []);
    let groundSig = (state.unlockedLands || []).join(',') + '|';
    for (const ent of this.grid.entities.values()) {
      groundSig += `${ent.id}:${ent.gx},${ent.gy};`;
    }
    if (groundSig !== this._lastGroundSig) {
      this._lastGroundSig = groundSig;
      this._rebuildGroundingPlates();
    }

    this.renderDebugGrid(showDebugGrid);

    this.zoneOverlayGfx.clear(); // gesperrtes Land zeigt die Wildnis selbst (world.js)

    // Interactive placement / move tile highlight
    this.ghostGfx.clear();
    if ((uiState.mode === 'place' || uiState.mode === 'move') && uiState.previewTile) {
      const { gx, gy, size = 1, valid = true } = uiState.previewTile;
      const g2w = this.gridToWorld;
      this.ghostGfx
        .poly(isoRectPoly(g2w, gx, gy, gx + size, gy + size))
        .fill({ color: valid ? 0x22c55e : 0xef4444, alpha: 0.34 })
        .stroke({ color: valid ? 0x16a34a : 0xdc2626, width: 2.6, alpha: 0.92 });
    }
  }
}
