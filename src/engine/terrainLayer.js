// ============================================================================
// WINTERHOF v6 — Style-C Painted Alpine Terrain, Cobblestone Plaza & Fences
// Zero Flat Solid Ground · Seamless GPU Tiling · Sculpted Timber Fences
// ============================================================================
import { Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import { LAND_ZONES } from '../gameData.js';
import { createAlpineWaterLayer } from './waterShader.js';

function isoDiamondPoly(gridToWorld, x0, y0, x1, y1) {
  const a = gridToWorld(x0, y0);
  const b = gridToWorld(x1, y0);
  const c = gridToWorld(x1, y1);
  const d = gridToWorld(x0, y1);
  return [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y];
}

export class TerrainLayer {
  constructor(textures, gridToWorld) {
    this.textures = textures;
    this.gridToWorld = gridToWorld;
    this.container = new Container();

    // 1. Seamless hand-painted Alpine Snow Valley base (TilingSprite on GPU)
    const snowTex = textures.get('terrain_snow');
    if (snowTex) {
      this.snowField = new TilingSprite({
        texture: snowTex,
        width: 5600,
        height: 3600
      });
      this.snowField.anchor.set(0.5);
      this.snowField.x = 0;
      this.snowField.y = 440;
      this.snowField.tileScale.set(0.56, 0.42); // Isometric foreshortening of snowdrifts!
      this.container.addChild(this.snowField);
    } else {
      const fb = new Graphics();
      fb.rect(-2800, -1400, 5600, 3600).fill(0xe4effa);
      this.container.addChild(fb);
    }

    // 2. Subtle painted alpine elevation vignette (soft radial gradient texture, zero hard ellipse edges!)
    const softVignette = textures.get('fx_frost_glow');
    if (softVignette) {
      const center = gridToWorld(7.2, 6.2);
      const glow = new Sprite(softVignette);
      glow.anchor.set(0.5);
      glow.x = center.x;
      glow.y = center.y;
      glow.width = 1650;
      glow.height = 880;
      glow.tint = 0xffffff;
      glow.alpha = 0.24;
      this.container.addChild(glow);
    }

    // 3. Hand-painted Supercell Cobblestone Village Road + Christmas Tree Plaza
    this.roadContainer = new Container();
    this._buildCobblestoneRoads();
    this.container.addChild(this.roadContainer);

    // 4. Custom GLSL Glacial Alpine Brook & Pond
    this.waterLayer = createAlpineWaterLayer(gridToWorld);
    this.container.addChild(this.waterLayer.container);

    // 5. Dynamic buildable grid highlight (only shown in place/move mode) & unlock zone tint
    this.zoneOverlayGfx = new Graphics();
    this.container.addChild(this.zoneOverlayGfx);

    // 6. Sculpted 3D Timber Estate Boundary Fences with snow caps (rebuilt only on land unlock)
    this.fenceGfx = new Graphics();
    this.container.addChild(this.fenceGfx);

    // 7. Build/Move interactive ghost preview tile layer
    this.ghostGfx = new Graphics();
    this.container.addChild(this.ghostGfx);

    this._lastUnlockedKey = null;
  }

  _buildValleyRelief() {
    // Replaced with soft radial GPU sprite to prevent hard polygon contour edges
  }

  _drawRoadShapes(g, padPx = 0) {
    const g2w = this.gridToWorld;
    const p = padPx / 116; // Convert pixel pad into approximate grid margin

    // A. Main horizon-to-horizon village cobblestone road along gy = 5.5 (stops cleanly at bridge abutments & resumes beyond)
    g.poly(isoDiamondPoly(g2w, -9.0, 5.05 - p, 13.05, 6.02 + p));
    g.poly(isoDiamondPoly(g2w, 14.55, 5.05 - p, 24.0, 6.02 + p));

    // B. Central Christmas Tree Cobblestone Plaza (matching Style C!)
    const plazaCenter = g2w(8.45, 3.65);
    g.ellipse(plazaCenter.x, plazaCenter.y, 142 + padPx, 74 + padPx * 0.55);

    // Wide connector from Tree Plaza down to Main Road
    g.poly(isoDiamondPoly(g2w, 7.65 - p, 3.2, 9.25 + p, 5.45));

    // C. Clean Chalet front entrance stone apron (Chalet at 5,2 -> front door around 5.8, 3.8..5.2)
    g.poly(isoDiamondPoly(g2w, 5.35 - p, 3.65, 6.45 + p, 5.25));

    // D. Clean Bakery front entrance stone apron (Bakery at 3,7 -> front around 3.6..4.6, 5.8..7.1)
    g.poly(isoDiamondPoly(g2w, 3.55 - p, 5.8, 4.65 + p, 7.15));

    // E. Subtle rounded courtyard hub where road meets Chalet & Plaza
    const hub = g2w(7.2, 5.54);
    g.ellipse(hub.x, hub.y, 76 + padPx, 40 + padPx * 0.55);
  }

  _buildCobblestoneRoads() {
    const cobbleTex = this.textures.get('terrain_cobble');

    // Outer snowy-curb shadow & snow-lip bevel so cobblestone settles organically into snow
    const curbShadow = new Graphics();
    this._drawRoadShapes(curbShadow, 9);
    curbShadow.fill({ color: 0x8aa8c8, alpha: 0.42 });
    this.roadContainer.addChild(curbShadow);

    const curbSnow = new Graphics();
    this._drawRoadShapes(curbSnow, 5);
    curbSnow.fill({ color: 0xf7fbff, alpha: 0.92 });
    this.roadContainer.addChild(curbSnow);

    if (cobbleTex) {
      const roadMask = new Graphics();
      this._drawRoadShapes(roadMask, 0);
      roadMask.fill({ color: 0xffffff, alpha: 1 });
      this.roadContainer.addChild(roadMask);

      const cobbleTiling = new TilingSprite({
        texture: cobbleTex,
        width: 3400,
        height: 2200
      });
      cobbleTiling.anchor.set(0.5);
      cobbleTiling.x = 0;
      cobbleTiling.y = 420;
      // Isometric squash so stones read cleanly in 2:1 perspective
      cobbleTiling.tileScale.set(0.32, 0.22);
      cobbleTiling.mask = roadMask;
      this.roadContainer.addChild(cobbleTiling);

      // Subtle warm stone glaze for Style-C cohesion
      const glaze = new Graphics();
      this._drawRoadShapes(glaze, 0);
      glaze.fill({ color: 0xe2e8f0, alpha: 0.10 });
      this.roadContainer.addChild(glaze);
    } else {
      const fallback = new Graphics();
      this._drawRoadShapes(fallback, 0);
      fallback.fill({ color: 0x9aa5b4, alpha: 0.95 });
      this.roadContainer.addChild(fallback);
    }
  }

  /**
   * Draws chunky beveled Supercell 3D wooden split-rail fences with thick white snow caps!
   */
  _drawFenceSegment(g, gx1, gy1, gx2, gy2) {
    const g2w = this.gridToWorld;
    const steps = Math.max(1, Math.round(Math.hypot(gx2 - gx1, gy2 - gy1) * 1.4));
    const p1 = g2w(gx1, gy1);
    const p2 = g2w(gx2, gy2);

    // 1. Soft snow contact shadow under the fence line
    g.moveTo(p1.x + 2, p1.y + 4)
      .lineTo(p2.x + 2, p2.y + 4)
      .stroke({ color: 0x5c7ea6, width: 9, alpha: 0.26, cap: 'round' });

    // 2. Lower warm oak rail (dark outline + warm mid wood)
    g.moveTo(p1.x, p1.y - 6).lineTo(p2.x, p2.y - 6).stroke({ color: 0x45200c, width: 6.2, cap: 'round' });
    g.moveTo(p1.x, p1.y - 6.5).lineTo(p2.x, p2.y - 6.5).stroke({ color: 0x9c5b2b, width: 3.4, cap: 'round' });

    // 3. Upper warm oak rail
    g.moveTo(p1.x, p1.y - 14.5).lineTo(p2.x, p2.y - 14.5).stroke({ color: 0x45200c, width: 6.6, cap: 'round' });
    g.moveTo(p1.x, p1.y - 15).lineTo(p2.x, p2.y - 15).stroke({ color: 0xb87035, width: 3.8, cap: 'round' });

    // 4. Sculpted snow cap resting along top rail
    g.moveTo(p1.x, p1.y - 17.2).lineTo(p2.x, p2.y - 17.2).stroke({ color: 0xf8fbff, width: 3.2, alpha: 0.94, cap: 'round' });

    // 5. Sturdy beveled vertical timber fence posts with little snow caps
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = p1.x + (p2.x - p1.x) * t;
      const py = p1.y + (p2.y - p1.y) * t;
      // Post body
      g.roundRect(px - 3.6, py - 21, 7.2, 22, 2).fill(0x522710);
      g.roundRect(px - 2.3, py - 20, 4.4, 20, 1.5).fill(0xb06830);
      g.roundRect(px - 2.0, py - 20, 1.6, 19, 1).fill(0xd68e4a);
      // Post snow cap
      g.ellipse(px, py - 21.2, 4.6, 2.7).fill(0xffffff);
    }
  }

  _rebuildFences(unlockedSet) {
    const g = this.fenceGfx;
    g.clear();

    const minX = unlockedSet.has('west_forest') ? 0.05 : 1.92;
    const maxX = unlockedSet.has('east_glade') ? 15.85 : 13.05;
    const minY = unlockedSet.has('north_ridge') ? 0.05 : 1.88;
    const maxY = unlockedSet.has('south_meadow') ? 15.85 : 13.92;

    // North fence
    this._drawFenceSegment(g, minX, minY, maxX, minY);
    // South fence
    this._drawFenceSegment(g, minX, maxY, maxX, maxY);
    // West fence (leave clean open gateway for the main village cobblestone road gy = 4.9..6.15!)
    this._drawFenceSegment(g, minX, minY, minX, 4.88);
    this._drawFenceSegment(g, minX, 6.18, minX, maxY);
    // East fence (leave clean open gateway to the Wooden Bridge at gy = 4.9..6.15!)
    this._drawFenceSegment(g, maxX, minY, maxX, 4.88);
    this._drawFenceSegment(g, maxX, 6.18, maxX, maxY);
  }

  update(state, uiState, sec, ev, duskFactor) {
    this.waterLayer.update(sec, ev, duskFactor);

    const unlocked = new Set(state.unlockedLands || []);
    const key = [...unlocked].sort().join(',');
    if (key !== this._lastUnlockedKey) {
      this._lastUnlockedKey = key;
      this._rebuildFences(unlocked);
    }

    // Subtle frosty lock zone tint only during place/move modes (clean calm valley in normal play!)
    this.zoneOverlayGfx.clear();
    if (uiState.mode === 'place' || uiState.mode === 'move') {
      const g2w = this.gridToWorld;
      for (const zone of LAND_ZONES) {
        if (unlocked.has(zone.id)) continue;
        const b = zone.bounds;
        this.zoneOverlayGfx
          .poly(isoDiamondPoly(g2w, b.x0, b.y0, b.x1 + 1, b.y1 + 1))
          .fill({ color: 0x64748b, alpha: 0.14 })
          .stroke({ color: 0x94a3b8, width: 1.5, alpha: 0.45 });
      }
    }

    // Interactive placement / move tile highlight
    this.ghostGfx.clear();
    if ((uiState.mode === 'place' || uiState.mode === 'move') && uiState.previewTile) {
      const { gx, gy, size = 1, valid = true } = uiState.previewTile;
      const g2w = this.gridToWorld;
      const poly = isoDiamondPoly(g2w, gx, gy, gx + size, gy + size);
      this.ghostGfx
        .poly(poly)
        .fill({ color: valid ? 0x22c55e : 0xef4444, alpha: 0.34 })
        .stroke({ color: valid ? 0x16a34a : 0xdc2626, width: 2.6, alpha: 0.92 });
    }
  }
}
