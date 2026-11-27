import { describe, expect, test } from 'vitest';
import {
  buildPathField, CONTENT, createNewGame, footprintOf, meadow, pathTiles, terrainMap,
  type MapObject
} from '../../src/core';
import {
  DECO_KINDS, DECO_OBJ_CLEARANCE, DECO_PATH_CLEARANCE,
  generateDecoCandidates, placeGroundDeco
} from '../../src/render/scene/groundDeco';

function buildStartPaths(objects: readonly MapObject[]) {
  const map = terrainMap();
  const box = { gx0: map.minGx, gy0: map.minGy, w: map.maxGx - map.minGx + 1, h: map.maxGy - map.minGy + 1 };
  return buildPathField(pathTiles(objects), CONTENT.paths.surfaces, box);
}

describe('Boden-Deko-Ebene (Baustein 7b, Entscheidungen 51/52)', () => {
  const shape = meadow();
  const candidates = generateDecoCandidates(shape);
  const startObjects = createNewGame(0).objects;
  const startPaths = buildStartPaths(startObjects);

  test('erzeugt deterministische Kandidaten nur auf der grünen Wiese (schnell < 50 ms)', () => {
    const t0 = performance.now();
    const again = generateDecoCandidates(shape);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(again).toEqual(candidates);
    expect(candidates.length).toBeGreaterThan(200);
    for (const c of candidates) expect(shape.field(c.gx, c.gy)).toBeGreaterThan(0.35);
  });

  test('weicht allen Objekten und Wegen sauber aus, nutzt alle 6 Winter-Arten und rechnet schnell (< 25 ms)', () => {
    const t0 = performance.now();
    const items = placeGroundDeco(candidates, startObjects, startPaths, shape);
    expect(performance.now() - t0).toBeLessThan(25);
    expect(items.length).toBeGreaterThan(40);
    const kinds = new Set(items.map((i) => i.kind));
    for (const k of DECO_KINDS) expect(kinds.has(k), k).toBe(true);

    let minObjDist = Infinity;
    let minMeadow = Infinity;
    for (const item of items) {
      minMeadow = Math.min(minMeadow, shape.field(item.gx, item.gy));
      for (const obj of startObjects) {
        if (obj.kind === 'deco' && CONTENT.decorations[obj.type]?.surface) continue;
        const { w, h } = footprintOf(obj);
        const dx = Math.max(obj.gx - item.gx, 0, item.gx - (obj.gx + w));
        const dy = Math.max(obj.gy - item.gy, 0, item.gy - (obj.gy + h));
        minObjDist = Math.min(minObjDist, Math.hypot(dx, dy));
      }
    }
    expect(minMeadow).toBeGreaterThan(0.35);
    expect(minObjDist).toBeGreaterThanOrEqual(DECO_OBJ_CLEARANCE - 1e-6);
  });

  test('Umbau: neue Wegplatten verdrängen Deko, nach Entfernen kehrt sie exakt zurück', () => {
    const vorher = placeGroundDeco(candidates, startObjects, startPaths, shape);
    // Quer durch den Start-Hof eine Reihe Wegplatten legen
    const extra: MapObject[] = [];
    for (let x = 0; x <= 9; x++) extra.push({ id: `w_${x}`, kind: 'deco', type: 'path_gravel', gx: x, gy: 6 });
    const mitWegObjs = [...startObjects, ...extra];
    const mitWeg = placeGroundDeco(candidates, mitWegObjs, buildStartPaths(mitWegObjs), shape);
    // Auf der neuen Wegreihe (gy 6..7) liegt kein Deko-Teil mehr
    for (const item of mitWeg) {
      if (item.gx >= 0 && item.gx <= 10) {
        expect(item.gy < 6 - DECO_PATH_CLEARANCE + 0.1 || item.gy > 7 + DECO_PATH_CLEARANCE - 0.1).toBe(true);
      }
    }
    // Nach dem Entfernen: exakt dieselbe Deko wie vorher
    const nachher = placeGroundDeco(candidates, startObjects, startPaths, shape);
    expect(nachher).toEqual(vorher);
  });

  test('neues Gebäude verdrängt Deko darunter, unberührte Bereiche bleiben stabil', () => {
    const vorher = placeGroundDeco(candidates, startObjects, startPaths, shape);
    const extra: MapObject = { id: 'neu_haus', kind: 'station', type: 'bakery', gx: 8, gy: 7, wrapped: false, queue: [], ready: [], craftedCount: 0 };
    const mitHaus = placeGroundDeco(candidates, [...startObjects, extra], startPaths, shape);
    for (const item of mitHaus) {
      const dx = Math.max(8 - item.gx, 0, item.gx - 10);
      const dy = Math.max(7 - item.gy, 0, item.gy - 9);
      expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(DECO_OBJ_CLEARANCE - 1e-6);
    }
    // Nach Abriss exakt zurück
    expect(placeGroundDeco(candidates, startObjects, startPaths, shape)).toEqual(vorher);
  });
});
