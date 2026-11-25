import { describe, expect, test } from 'vitest';
import { CONTENT, createNewGame, pathTiles, roadTiles, tileKey, validateContent } from '../../src/core';
import type { MapObject } from '../../src/core';
import { buildPathField, MAX_SURFACES, sdAt, weightAt } from '../../src/core';
import { SHADER_SURFACES } from '../../src/render/scene/ground';

const S = CONTENT.paths.surfaces;
const box = { gx0: 0, gy0: 0, w: 12, h: 12 };
const tiles = (list: [number, number, string][]): Map<string, string> => new Map(list.map(([x, y, s]) => [tileKey(x, y), s]));

describe('Wege im Kern (Baustein 6)', () => {
  test('Zufahrt und Hofplatz kommen aus der Karte, Belag paths.road', () => {
    const r = roadTiles();
    expect(r.size).toBeGreaterThan(10);
    for (const s of r.values()) expect(s).toBe(CONTENT.paths.road);
    expect(r.get(tileKey(7, 12))).toBe('erde');   // Zufahrt vorn
    expect(r.get(tileKey(6, 9))).toBe('erde');    // Hofplatz
  });
  test('Wegplatten des Spielers kommen mit ihrem Belag dazu, Zufahrt bleibt fest', () => {
    const objs: MapObject[] = [
      { id: 'p1', kind: 'deco', type: 'path_gravel', gx: 6, gy: 6 },
      { id: 'p2', kind: 'deco', type: 'path_planks', gx: 6, gy: 9 },   // auf dem Hofplatz: bleibt Erde
      { id: 'p3', kind: 'deco', type: 'snowman', gx: 1, gy: 1 }
    ];
    const t = pathTiles(objs);
    expect(t.get(tileKey(6, 6))).toBe('kies');
    expect(t.get(tileKey(6, 9))).toBe('erde');
    expect(t.has(tileKey(1, 1))).toBe(false);
  });
  test('Neues Spiel: nur Zufahrt und Hofplatz', () => {
    expect(pathTiles(createNewGame(0).objects).size).toBe(roadTiles().size);
  });
  test('jede Wegplatte hat einen gültigen Belag, höchstens so viele Beläge wie der Shader kann', () => {
    expect(validateContent()).toEqual([]);
    expect(S.length).toBeLessThanOrEqual(MAX_SURFACES);
    expect([...SHADER_SURFACES]).toEqual(S);   // Shader-Kanäle = Reihenfolge der Beläge
    const bad = { ...CONTENT, decorations: { ...CONTENT.decorations, path_gravel: { ...CONTENT.decorations['path_gravel']!, surface: 'lava' } } };
    expect(validateContent(bad).some((e) => e.includes('path_gravel'))).toBe(true);
  });
});

describe('Wegfeld: eine Fläche mit runden Ecken (Entscheidungen 53/54)', () => {
  // L-Form: waagerecht y=5, x=2..8, dann senkrecht x=8, y=5..9
  const L = buildPathField(tiles([...[2, 3, 4, 5, 6, 7, 8].map((x): [number, number, string] => [x, 5, 'kies']),
    ...[6, 7, 8, 9].map((y): [number, number, string] => [8, y, 'kies'])]), S, box);

  test('gerade Kante liegt genau auf der Kachelgrenze', () => {
    expect(sdAt(L, 4.5, 5.0 + 0.06)).toBeGreaterThan(0);
    expect(sdAt(L, 4.5, 5.0 - 0.06)).toBeLessThan(0);
    expect(Math.abs(sdAt(L, 4.5, 5.0))).toBeLessThan(0.08);
    expect(sdAt(L, 4.5, 5.5)).toBeGreaterThan(0.35);          // Mitte eines 1-Kachel-Wegs ≈ 0,5
  });
  test('Außenecke ist rund (Eckpunkt liegt draußen), Innenecke ist ausgerundet (Eckpunkt liegt drin)', () => {
    expect(sdAt(L, 8.97, 5.03)).toBeLessThan(0);               // äußere Ecke oben rechts abgerundet
    expect(sdAt(L, 8.03, 5.97)).toBeGreaterThan(0);            // innere Ecke unten links gefüllt
  });
  test('keine Kachel-Treppe: Abstand ändert sich längs einer geraden Kante nicht', () => {
    const v = [3.1, 3.4, 3.7, 4.0, 4.3, 4.6, 4.9].map((x) => sdAt(L, x, 5.2));
    expect(Math.max(...v) - Math.min(...v)).toBeLessThan(0.03);
  });
  test('Beläge laufen weich ineinander, Summe 1', () => {
    const k = S.indexOf('kies'), h = S.indexOf('holz');
    const f = buildPathField(tiles([[2, 5, 'kies'], [3, 5, 'kies'], [4, 5, 'holz'], [5, 5, 'holz']]), S, box);
    expect(weightAt(f, k, 2.5, 5.5)).toBeGreaterThan(0.9);
    expect(weightAt(f, h, 5.5, 5.5)).toBeGreaterThan(0.9);
    const mid = weightAt(f, k, 4.0, 5.5);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    const sum = S.reduce((s, _, i) => s + weightAt(f, i, 4.0, 5.5), 0);
    expect(sum).toBeGreaterThan(0.97);
    expect(sum).toBeLessThan(1.03);
  });
  test('ohne Wege: überall draußen', () => {
    const f = buildPathField(new Map(), S, box);
    expect(sdAt(f, 6, 6)).toBeLessThan(-1.4);
  });
  test('unbekannter Belag ist ein Fehler', () => {
    expect(() => buildPathField(tiles([[1, 1, 'lava']]), S, box)).toThrow();
  });
});
