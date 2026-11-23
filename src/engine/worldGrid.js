// ============================================================================
// WINTERHOF v6 — Single Source of Truth WorldGrid & A* Pathfinding
// 4 Strict Layers per Tile (terrain, surface, zone, occupant)
// Guarantees mathematically: Zero fence-in-water, Zero building-on-fence/road,
// Exact bridge orientation, Connected autotiled roads, Road-locked A* villagers
// ============================================================================
import { LAND_ZONES } from '../gameData.js';

export const WORLD_MIN = -10;
export const WORLD_MAX = 26; // Hof + 4 Kacheln Erweiterungsring + Waldrahmen (Hay-Day-Größe)
export const PLAYABLE_MIN = -4;
export const PLAYABLE_MAX = 20; // Hof inkl. aller Erweiterungen, außen Waldrahmen

export const TERRAIN = {
  SNOW: 'SNOW',
  WATER: 'WATER',
  CLIFF: 'CLIFF',
  FOREST: 'FOREST'
};

export const SURFACE = {
  NONE: 'NONE',
  ROAD: 'ROAD',
  PLAZA: 'PLAZA',
  BRIDGE_X: 'BRIDGE_X', // Spans along +gx (NW <-> SE) over a +gy stream
  BRIDGE_Y: 'BRIDGE_Y', // Spans along +gy (NE <-> SW) over a +gx stream
  PLOT: 'PLOT'
};

export const ZONE = {
  STARTER: 'starter',
  WEST_FOREST: 'west_forest',
  SOUTH_MEADOW: 'south_meadow',
  EAST_GLADE: 'east_glade',
  NORTH_RIDGE: 'north_ridge',
  BORDER: 'border'
};

export class WorldGrid {
  constructor() {
    this.min = WORLD_MIN;
    this.max = WORLD_MAX;
    this.span = WORLD_MAX - WORLD_MIN + 1;
    this.tiles = new Array(this.span * this.span);
    this.entities = new Map();
    this.fenceEdges = [];
    this.roadTiles = [];
    this.bridgeTiles = [];
    this._initBaseMap();
  }

  _idx(gx, gy) {
    if (gx < this.min || gx > this.max || gy < this.min || gy > this.max) return -1;
    return (gy - this.min) * this.span + (gx - this.min);
  }

  inBounds(gx, gy) {
    return gx >= this.min && gx <= this.max && gy >= this.min && gy <= this.max;
  }

  getTile(gx, gy) {
    const idx = this._idx(Math.floor(gx), Math.floor(gy));
    return idx >= 0 ? this.tiles[idx] : null;
  }

  _initBaseMap() {
    for (let gy = this.min; gy <= this.max; gy++) {
      for (let gx = this.min; gx <= this.max; gx++) {
        const idx = this._idx(gx, gy);
        this.tiles[idx] = {
          gx,
          gy,
          terrain: TERRAIN.SNOW,
          surface: SURFACE.NONE,
          zone: ZONE.BORDER,
          occupant: null
        };
      }
    }

    // 1. Assign Playable Estate Zones (0..13 x 0..13) — 100% inside the riverbanks!
    for (let gy = 2; gy <= 11; gy++) {
      for (let gx = 2; gx <= 11; gx++) {
        this.getTile(gx, gy).zone = ZONE.STARTER;
      }
    }
    for (const z of LAND_ZONES) {
      const b = z.bounds;
      for (let gy = b.y0; gy <= b.y1; gy++) {
        for (let gx = b.x0; gx <= b.x1; gx++) {
          const t = this.getTile(gx, gy);
          if (t) t.zone = z.id;
        }
      }
    }

    // 2. Kein Wasser mehr (Hannes 23.11.: fließendes Wasser raus, keine Brücke).

    // 3. Perimeter Cliffs & Forest Rim (strictly outside playable 0..13 & outside road gy = 6)
    for (let gy = this.min; gy <= this.max; gy++) {
      for (let gx = this.min; gx <= this.max; gx++) {
        const t = this.getTile(gx, gy);
        if (!t || t.zone !== ZONE.BORDER || t.terrain === TERRAIN.WATER) continue;
        if (gy === 6) continue; // Keep horizon-to-horizon village road clear!
        if (gy <= -5 || gy >= 18 || gx >= 21 || gx <= -5) t.terrain = TERRAIN.FOREST;
      }
    }

    // 4. Grid-Locked Cobblestone Village Road (Row gy = 6, NW -> SE) + Clean Entrance Spurs + Tree Plaza
    for (let gx = this.min; gx <= this.max; gx++) {
      const t = this.getTile(gx, 6);
      if (!t) continue;
      t.surface = SURFACE.ROAD;
    }

    // Clean Chalet entrance path tile (5, 5) connecting Chalet (4..5, 3..4) -> Main Road (5, 6)
    this.getTile(5, 5).surface = SURFACE.ROAD;
    // Clean Bakery doorstep tile (4, 7) connecting Main Road (4, 6) -> Bakery (3..4, 8..9)
    this.getTile(4, 7).surface = SURFACE.ROAD;
    // Clean 2x1 Christmas Tree Plaza tiles (8, 5) & (9, 5) connecting Tree (8..9, 3..4) -> Main Road (8..9, 6)
    this.getTile(8, 5).surface = SURFACE.PLAZA;
    this.getTile(9, 5).surface = SURFACE.PLAZA;

    // Cache road & bridge tile lists
    this.roadTiles = [];
    this.bridgeTiles = [];
    for (const t of this.tiles) {
      if (t.surface === SURFACE.ROAD || t.surface === SURFACE.PLAZA || t.surface === SURFACE.BRIDGE_X || t.surface === SURFACE.BRIDGE_Y) {
        this.roadTiles.push(t);
      }
      if (t.surface === SURFACE.BRIDGE_X || t.surface === SURFACE.BRIDGE_Y) {
        this.bridgeTiles.push(t);
      }
    }
  }

  isZoneUnlocked(zone, unlockedSet) {
    if (zone === ZONE.STARTER) return true;
    return unlockedSet.has(zone);
  }

  isTileWalkableForVillager(gx, gy) {
    const t = this.getTile(gx, gy);
    if (!t) return false;
    return (
      t.surface === SURFACE.ROAD ||
      t.surface === SURFACE.PLAZA ||
      t.surface === SURFACE.BRIDGE_X ||
      t.surface === SURFACE.BRIDGE_Y
    );
  }

  isTileBuildable(gx, gy, unlockedSet, ignoreEntityId = null) {
    const t = this.getTile(gx, gy);
    if (!t) return false;
    if (t.zone === ZONE.BORDER) return false;
    if (!this.isZoneUnlocked(t.zone, unlockedSet)) return false;
    if (t.terrain !== TERRAIN.SNOW) return false;
    if (t.surface !== SURFACE.NONE) return false;
    if (t.occupant && t.occupant !== ignoreEntityId) return false;
    return true;
  }

  /**
   * Synchronizes the occupancy layer & fence edges directly from current game state.
   * Called on boot and whenever state layout/unlocks change.
   */
  syncFromState(state, dailyChestPos = null) {
    // Clear occupancy & plot markers
    for (const t of this.tiles) {
      t.occupant = null;
      if (t.surface === SURFACE.PLOT) t.surface = SURFACE.NONE;
    }
    this.entities.clear();

    const register = (id, kind, gx, gy, w = 1, h = 1, extra = {}) => {
      const ent = { id, kind, gx, gy, w, h, ...extra };
      this.entities.set(id, ent);
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const t = this.getTile(gx + dx, gy + dy);
          if (t) {
            t.occupant = id;
            if (kind === 'field') t.surface = SURFACE.PLOT;
          }
        }
      }
    };

    if (state.chalet) register('chalet', 'building', state.chalet.gx, state.chalet.gy, 2, 2);
    if (state.christmasTree) register('christmasTree', 'landmark', state.christmasTree.gx, state.christmasTree.gy, 2, 2);
    if (state.wishlistBoard) register('wishlistBoard', 'prop', state.wishlistBoard.gx, state.wishlistBoard.gy, 1, 1);
    if (state.sleighPos) register('sleigh', 'prop', state.sleighPos.gx, state.sleighPos.gy, 1, 1);
    if (state.mailbox) register('mailbox', 'prop', state.mailbox.gx, state.mailbox.gy, 1, 1);

    for (const st of state.stations || []) {
      if (st.built) register(st.id, 'station', st.gx, st.gy, 2, 2, { stationType: st.type });
    }
    for (const f of state.fields || []) {
      register(f.id, 'field', f.gx, f.gy, 1, 1);
    }
    for (const an of state.animals || []) {
      register(an.id, 'animal', an.gx, an.gy, 1, 1);
    }
    for (const d of state.decorations || []) {
      register(d.id, 'deco', d.gx, d.gy, 1, 1);
    }
    if (dailyChestPos) {
      register('daily_chest', 'chest', Math.floor(dailyChestPos.gx), Math.floor(dailyChestPos.gy), 1, 1);
    }

    const unlocked = new Set(state.unlockedLands || []);

    this._computeFenceEdges(unlocked);
  }

  /**
   * Computes exact grid-edge fence segments strictly on borders of unlocked land.
   * NEVER places a fence on WATER, ROAD, PLAZA, or BRIDGE!
   */
  _computeFenceEdges(unlockedSet) {
    this.fenceEdges = [];
    const isOwned = (gx, gy) => {
      const t = this.getTile(gx, gy);
      return !!(t && t.zone !== ZONE.BORDER && this.isZoneUnlocked(t.zone, unlockedSet));
    };
    const isRoadOrWater = (gx, gy) => {
      const t = this.getTile(gx, gy);
      if (!t) return false;
      return (
        t.terrain === TERRAIN.WATER ||
        t.surface === SURFACE.ROAD ||
        t.surface === SURFACE.PLAZA ||
        t.surface === SURFACE.BRIDGE_X ||
        t.surface === SURFACE.BRIDGE_Y
      );
    };

    for (let gy = PLAYABLE_MIN; gy <= PLAYABLE_MAX; gy++) {
      for (let gx = PLAYABLE_MIN; gx <= PLAYABLE_MAX; gx++) {
        if (!isOwned(gx, gy)) continue;

        // North edge: between (gx, gy) and (gx, gy - 1)
        if (!isOwned(gx, gy - 1) && !isRoadOrWater(gx, gy) && !isRoadOrWater(gx, gy - 1)) {
          this.fenceEdges.push({ x1: gx, y1: gy, x2: gx + 1, y2: gy, side: 'N' });
        }
        // South edge: between (gx, gy) and (gx, gy + 1)
        if (!isOwned(gx, gy + 1) && !isRoadOrWater(gx, gy) && !isRoadOrWater(gx, gy + 1)) {
          this.fenceEdges.push({ x1: gx, y1: gy + 1, x2: gx + 1, y2: gy + 1, side: 'S' });
        }
        // West edge: between (gx, gy) and (gx - 1, gy)
        if (!isOwned(gx - 1, gy) && !isRoadOrWater(gx, gy) && !isRoadOrWater(gx - 1, gy)) {
          this.fenceEdges.push({ x1: gx, y1: gy, x2: gx, y2: gy + 1, side: 'W' });
        }
        // East edge: between (gx, gy) and (gx + 1, gy)
        if (!isOwned(gx + 1, gy) && !isRoadOrWater(gx, gy) && !isRoadOrWater(gx + 1, gy)) {
          this.fenceEdges.push({ x1: gx + 1, y1: gy, x2: gx + 1, y2: gy + 1, side: 'E' });
        }
      }
    }
  }

  /**
   * Classic Supercell-style A* Pathfinding strictly along walkable road/plaza/bridge tiles.
   */
  findRoadPath(startGx, startGy, goalGx, goalGy) {
    const sx = Math.floor(startGx);
    const sy = Math.floor(startGy);
    const tx = Math.floor(goalGx);
    const ty = Math.floor(goalGy);
    if (!this.isTileWalkableForVillager(sx, sy) || !this.isTileWalkableForVillager(tx, ty)) {
      return [];
    }
    if (sx === tx && sy === ty) return [{ gx: tx + 0.5, gy: ty + 0.5 }];

    const key = (x, y) => `${x},${y}`;
    const open = [{ x: sx, y: sy, g: 0, f: Math.abs(tx - sx) + Math.abs(ty - sy) }];
    const cameFrom = new Map();
    const gScore = new Map([[key(sx, sy), 0]]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (cur.x === tx && cur.y === ty) {
        const path = [];
        let k = key(tx, ty);
        let cx = tx;
        let cy = ty;
        while (cameFrom.has(k)) {
          path.push({ gx: cx + 0.5, gy: cy + 0.5 });
          const prev = cameFrom.get(k);
          cx = prev.x;
          cy = prev.y;
          k = key(cx, cy);
        }
        path.reverse();
        return path;
      }

      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (!this.isTileWalkableForVillager(nx, ny)) continue;
        // Keep villagers comfortably inside visible village road span (1..15)
        if (nx < 1 || nx > 15 || ny < 2 || ny > 12) continue;
        const nk = key(nx, ny);
        const tentative = cur.g + 1;
        if (tentative < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, { x: cur.x, y: cur.y });
          gScore.set(nk, tentative);
          open.push({ x: nx, y: ny, g: tentative, f: tentative + Math.abs(tx - nx) + Math.abs(ty - ny) });
        }
      }
    }
    return [];
  }
}
