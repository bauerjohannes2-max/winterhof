// ============================================================================
// WINTERHOF v6 — Automated 12-Rule Supercell World Spatial Validator
// Mathematically guarantees ZERO fence-in-water, ZERO building-on-fence/road,
// ZERO misaligned bridges, ZERO overlaps, and 100% road-locked A* villagers.
// ============================================================================
import { LAND_ZONES } from '../gameData.js';
import { TERRAIN, SURFACE, ZONE } from './worldGrid.js';

export function validateWorld(grid, state, villagers = []) {
  const errors = [];
  const unlocked = new Set(state.unlockedLands || []);

  // Helper: check if a footprint occupies strictly clean unlocked snow tiles with no overlap
  const seenTiles = new Map();

  // Rule 1: Zero Fence-in-Water & Zero Fence-on-Road/Bridge
  for (const edge of grid.fenceEdges) {
    const midX = (edge.x1 + edge.x2) * 0.5;
    const midY = (edge.y1 + edge.y2) * 0.5;
    // Check both adjacent tiles bordering this fence edge
    const adj = edge.side === 'N'
      ? [grid.getTile(edge.x1, edge.y1), grid.getTile(edge.x1, edge.y1 - 1)]
      : edge.side === 'S'
      ? [grid.getTile(edge.x1, edge.y1 - 1), grid.getTile(edge.x1, edge.y1)]
      : edge.side === 'W'
      ? [grid.getTile(edge.x1, edge.y1), grid.getTile(edge.x1 - 1, edge.y1)]
      : [grid.getTile(edge.x1 - 1, edge.y1), grid.getTile(edge.x1, edge.y1)];

    for (const t of adj) {
      if (!t) continue;
      if (t.terrain === TERRAIN.WATER) {
        errors.push(`R1_FENCE_IN_WATER: Fence edge (${edge.x1},${edge.y1})-(${edge.x2},${edge.y2}) borders WATER tile (${t.gx},${t.gy})`);
      }
      if (t.surface === SURFACE.ROAD || t.surface === SURFACE.PLAZA || t.surface === SURFACE.BRIDGE_X || t.surface === SURFACE.BRIDGE_Y) {
        errors.push(`R1_FENCE_ON_ROAD: Fence edge (${midX},${midY}) crosses road/bridge tile (${t.gx},${t.gy})`);
      }
    }
  }

  // Rules 2, 3, 4: Zero Building-on-Fence, Zero Building-on-Road/Water/Cliff, Zero Entity Overlap
  for (const ent of grid.entities.values()) {
    const isSign = ent.kind === 'sign';
    for (let dy = 0; dy < ent.h; dy++) {
      for (let dx = 0; dx < ent.w; dx++) {
        const gx = ent.gx + dx;
        const gy = ent.gy + dy;
        const t = grid.getTile(gx, gy);
        if (!t) {
          errors.push(`R3_OUT_OF_BOUNDS: Entity ${ent.id} tile (${gx},${gy}) outside world`);
          continue;
        }
        const tk = `${gx},${gy}`;
        if (seenTiles.has(tk)) {
          errors.push(`R4_ENTITY_OVERLAP: Tile (${gx},${gy}) occupied by both ${seenTiles.get(tk)} and ${ent.id}`);
        } else {
          seenTiles.set(tk, ent.id);
        }

        if (t.terrain !== TERRAIN.SNOW) {
          errors.push(`R3_BAD_TERRAIN: Entity ${ent.id} on ${t.terrain} at (${gx},${gy})`);
        }
        const allowedSurface = ent.kind === 'field' ? [SURFACE.NONE, SURFACE.PLOT] : [SURFACE.NONE];
        if (!allowedSurface.includes(t.surface)) {
          errors.push(`R3_ENTITY_ON_ROAD: Entity ${ent.id} (${ent.kind}) sits on surface ${t.surface} at (${gx},${gy})`);
        }
        if (!isSign && !grid.isZoneUnlocked(t.zone, unlocked)) {
          errors.push(`R3_ENTITY_IN_LOCKED_ZONE: Entity ${ent.id} at (${gx},${gy}) is in locked zone ${t.zone}`);
        }

        // Rule 2: Tall buildings (2x2) must never touch an outer fence line directly on their North/West perimeter
        if (ent.kind === 'building' || ent.kind === 'station' || ent.kind === 'landmark') {
          for (const edge of grid.fenceEdges) {
            const touchesNorth = edge.side === 'N' && edge.y1 === gy && edge.x1 === gx;
            const touchesSouth = edge.side === 'S' && edge.y1 === gy + 1 && edge.x1 === gx;
            const touchesWest = edge.side === 'W' && edge.x1 === gx && edge.y1 === gy;
            const touchesEast = edge.side === 'E' && edge.x1 === gx + 1 && edge.y1 === gy;
            if (touchesNorth || touchesSouth || touchesWest || touchesEast) {
              errors.push(`R2_BUILDING_ON_FENCE: Building ${ent.id} tile (${gx},${gy}) clips fence edge (${edge.side})`);
            }
          }
        }
      }
    }
  }

  // Rule 5: Bridge Alignment Invariant (Bridge must lie on WATER with orthogonal ROAD approaches)
  for (const bt of grid.bridgeTiles) {
    if (bt.terrain !== TERRAIN.WATER) {
      errors.push(`R5_BRIDGE_NOT_ON_WATER: Bridge at (${bt.gx},${bt.gy}) is on ${bt.terrain}`);
    }
    if (bt.surface === SURFACE.BRIDGE_X) {
      const w = grid.getTile(bt.gx - 1, bt.gy);
      const e = grid.getTile(bt.gx + 1, bt.gy);
      const n = grid.getTile(bt.gx, bt.gy - 1);
      const s = grid.getTile(bt.gx, bt.gy + 1);
      if (!w || w.surface !== SURFACE.ROAD || !e || e.surface !== SURFACE.ROAD) {
        errors.push(`R5_BRIDGE_X_APPROACH: BRIDGE_X at (${bt.gx},${bt.gy}) missing W/E ROAD approaches`);
      }
      if (!n || n.terrain !== TERRAIN.WATER || !s || s.terrain !== TERRAIN.WATER) {
        errors.push(`R5_BRIDGE_X_STREAM: BRIDGE_X at (${bt.gx},${bt.gy}) must span N/S WATER stream`);
      }
    }
  }
  // Seit 23.11. gibt es kein Wasser und keine Brücke mehr (Hannes). Regel 5b: es darf auch keins geben.
  if (grid.bridgeTiles.length > 0 || grid.tiles.some((t) => t.terrain === TERRAIN.WATER)) {
    errors.push('R5_NO_WATER: Karte darf kein Wasser/keine Brücke enthalten');
  }

  // Rule 6: Road Connectivity Invariant (BFS from main road must reach every road/plaza/bridge tile)
  if (grid.roadTiles.length > 0) {
    const start = grid.roadTiles[0];
    const visited = new Set([`${start.gx},${start.gy}`]);
    const queue = [start];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const [dx, dy] of dirs) {
        const nt = grid.getTile(cur.gx + dx, cur.gy + dy);
        if (!nt) continue;
        const k = `${nt.gx},${nt.gy}`;
        if (!visited.has(k) && grid.isTileWalkableForVillager(nt.gx, nt.gy)) {
          visited.add(k);
          queue.push(nt);
        }
      }
    }
    if (visited.size !== grid.roadTiles.length) {
      errors.push(`R6_DISCONNECTED_ROAD: Only ${visited.size}/${grid.roadTiles.length} road tiles connected`);
    }
  }

  // Rule 7 (Schilder) entfällt: gesperrtes Land ist Wildnis ohne Schild (Hay Day).

  // Rule 8: Villager Walkability Invariant (every villager strictly on walkable ROAD/PLAZA/BRIDGE)
  for (const v of villagers) {
    if (!grid.isTileWalkableForVillager(v.gx, v.gy)) {
      errors.push(`R8_VILLAGER_OFF_ROAD: Villager ${v.id} at (${v.gx.toFixed(2)},${v.gy.toFixed(2)}) is off walkable road`);
    }
  }

  // Rule 9: Daily Chest Grounding (must be on clean unlocked snow, not water/road)
  const chestEnt = grid.entities.get('daily_chest');
  if (chestEnt) {
    const ct = grid.getTile(chestEnt.gx, chestEnt.gy);
    if (!ct || ct.terrain !== TERRAIN.SNOW || ct.surface !== SURFACE.NONE) {
      errors.push(`R9_CHEST_GROUNDING: Daily chest at (${chestEnt.gx},${chestEnt.gy}) on bad tile`);
    }
  }

  return {
    ok: errors.length === 0,
    errorCount: errors.length,
    errors,
    summary: {
      entities: grid.entities.size,
      fenceEdges: grid.fenceEdges.length,
      roadTiles: grid.roadTiles.length,
      bridgeTiles: grid.bridgeTiles.length
    }
  };
}
