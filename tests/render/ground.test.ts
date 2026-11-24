import { describe, expect, test } from 'vitest';
import { CONTENT, terrainMap } from '../../src/core';
import { ownedTable, plotLayout, PLOT_TABLE } from '../../src/render/scene/ground';

const map = terrainMap();

describe('Grundboden (Baustein 5, Entscheidung 25)', () => {
  test('Landstücke: gleich groß, Ursprung = linke obere Ecke des Tals', () => {
    const l = plotLayout(map);
    for (const p of map.plots) {
      expect(p.x1 - p.x0 + 1).toBe(l.size);
      expect(p.y1 - p.y0 + 1).toBe(l.size);
      expect(p.x0).toBe(l.gx0 + p.col * l.size);
      expect(p.y0).toBe(l.gy0 + p.row * l.size);
    }
  });
  test('Eigenes Land: genau die Start-Landstücke, Ring außen bleibt Wildnis', () => {
    const t = ownedTable(map, CONTENT.map.plots.start);
    expect([...t].reduce((a, b) => a + b, 0)).toBe(CONTENT.map.plots.start.length);
    for (let i = 0; i < PLOT_TABLE; i++) {
      for (const k of [i, (PLOT_TABLE - 1) * PLOT_TABLE + i, i * PLOT_TABLE, i * PLOT_TABLE + PLOT_TABLE - 1]) expect(t[k]).toBe(0);
    }
    for (const id of CONTENT.map.plots.start) {
      const p = map.plotById(id)!;
      expect(t[(p.row + 1) * PLOT_TABLE + p.col + 1]).toBe(1);
    }
  });
  test('Alle Landstücke passen in die Tabelle, unbekanntes Landstück ist ein Fehler', () => {
    expect(() => ownedTable(map, map.plots.map((p) => p.id))).not.toThrow();
    expect(() => ownedTable(map, ['gibt-es-nicht'])).toThrow();
  });
});
