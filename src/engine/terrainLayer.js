// ============================================================================
// WINTERHOF v6 — Grid-Driven Terrain, Autotiled Cobblestone Roads & Fences
// 100% Derived from WorldGrid (Single Source of Truth) + Optional Debug-Grid
// Zero Random Ellipses · Zero Fence-in-Water · Crisp Grounded Foundations
// ============================================================================
import { Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import { LAND_ZONES } from '../gameData.js';
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

    // 1. Calm, silky hand-painted Alpine Snow Ground (GPU TilingSprite)
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
      this.snowField.tileScale.set(0.68, 0.50);
      this.container.addChild(this.snowField);
    } else {
      const fb = new Graphics();
      fb.rect(-2800, -1400, 5600, 3600).fill(0xe8f2fb);
      this.container.addChild(fb);
    }

    // 2. Soft sunlit center radial lift (smooth gradient sprite, zero hard contour edges)
    const softGlow = textures.get('fx_frost_glow');
    if (softGlow) {
      const center = gridToWorld(7.0, 6.5);
      const sp = new Sprite(softGlow);
      sp.anchor.set(0.5);
      sp.x = center.x;
      sp.y = center.y;
      sp.width = 1650;
      sp.height = 880;
      sp.tint = 0xffffff;
      sp.alpha = 0.22;
      this.container.addChild(sp);
    }

    // 3. Strictly Grid-Driven Cobblestone Roads & Plaza (ZERO ellipses, ZERO orphan stubs!)
    this.roadContainer = new Container();
    this._buildGridCobblestoneRoads();
    this.container.addChild(this.roadContainer);

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

  _drawRoadTilePolys(g, pad = 0) {
    const g2w = this.gridToWorld;
    for (const t of this.grid.roadTiles) {
      // Skip drawing stone road over water (the 3D timber bridge spans BRIDGE_X cleanly!)
      if (t.surface === SURFACE.BRIDGE_X || t.surface === SURFACE.BRIDGE_Y) continue;
      g.poly(isoTilePoly(g2w, t.gx, t.gy, pad));
    }
  }

  _buildGridCobblestoneRoads() {
    const cobbleTex = this.textures.get('terrain_cobble');

    // Outer cool alpine stone-edge shadow so cobblestones recess naturally into the snow
    const curbShadow = new Graphics();
    this._drawRoadTilePolys(curbShadow, 0.08);
    curbShadow.fill({ color: 0x7e9ec0, alpha: 0.36 });
    this.roadContainer.addChild(curbShadow);

    // Soft sculpted snow curb framing every road & plaza tile
    const curbSnow = new Graphics();
    this._drawRoadTilePolys(curbSnow, 0.04);
    curbSnow.fill({ color: 0xf7fbff, alpha: 0.90 });
    this.roadContainer.addChild(curbSnow);

    if (cobbleTex) {
      const roadMask = new Graphics();
      this._drawRoadTilePolys(roadMask, 0.0);
      roadMask.fill({ color: 0xffffff, alpha: 1 });
      this.roadContainer.addChild(roadMask);

      const cobbleTiling = new TilingSprite({
        texture: cobbleTex,
        width: 3600,
        height: 2400
      });
      cobbleTiling.anchor.set(0.5);
      cobbleTiling.x = 0;
      cobbleTiling.y = 420;
      cobbleTiling.tileScale.set(0.30, 0.21);
      cobbleTiling.mask = roadMask;
      this.roadContainer.addChild(cobbleTiling);
    } else {
      const fallback = new Graphics();
      this._drawRoadTilePolys(fallback, 0.0);
      fallback.fill({ color: 0x9aa5b4, alpha: 0.95 });
      this.roadContainer.addChild(fallback);
    }
  }

  /**
   * Renders true isometric Footprint Grounding Base Plates under every building/station/landmark
   * so sprites sit firmly PLANTED into the snow (eliminating the "floating sticker" look!).
   */
  _rebuildGroundingPlates() {
    // Keine Platten/Rauten mehr unter Gebäuden (Hannes 23.11.). Nur der weiche Sprite-Schatten bleibt.
    this.groundingGfx.clear();
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
    const g = this.fenceGfx;
    g.clear();
    for (const edge of this.grid.fenceEdges) {
      this._drawFenceEdge(g, edge);
    }
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

    // Rebuild grounding plates whenever entity count/positions change
    let groundSig = '';
    for (const ent of this.grid.entities.values()) {
      groundSig += `${ent.id}:${ent.gx},${ent.gy};`;
    }
    if (groundSig !== this._lastGroundSig) {
      this._lastGroundSig = groundSig;
      this._rebuildGroundingPlates();
    }

    this.renderDebugGrid(showDebugGrid);

    // Gesperrtes Land immer leicht abgedunkelt (wie bei den großen Aufbauspielen),
    // beim Bauen/Verschieben etwas deutlicher.
    this.zoneOverlayGfx.clear();
    {
      const unlocked = new Set(state.unlockedLands || []);
      const building = uiState.mode === 'place' || uiState.mode === 'move';
      const g2w = this.gridToWorld;
      for (const zone of LAND_ZONES) {
        if (unlocked.has(zone.id)) continue;
        const b = zone.bounds;
        this.zoneOverlayGfx
          .poly(isoRectPoly(g2w, b.x0, b.y0, b.x1 + 1, b.y1 + 1))
          .fill({ color: 0x46648c, alpha: building ? 0.2 : 0.11 });
      }
    }

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
