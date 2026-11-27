import { describe, expect, test } from 'vitest';
import { CONTENT, footprintOf } from '../../src/core';
import { gridToWorld, TILE_W } from '../../src/render/scene/iso';
import { placement, shadowFrame, spriteDefs, spriteFor } from '../../src/render/scene/objects';

describe('Objekte + Kontaktschatten (Baustein 7, Entscheidung 62)', () => {
  test('jedes Bild hat eine gültige Schatten-Art und eine Größe mit Höhe', () => {
    for (const [key, d] of Object.entries(spriteDefs())) {
      expect(['kontakt', 'fleck', 'bild'], key).toContain(d.shadow);
      expect(CONTENT.sizes[d.size]?.heightTiles, key).toBeGreaterThan(0);
    }
  });

  test('Bodenpunkt liegt genau auf der Mitte der Grundfläche, Höhe aus dem Größenkatalog', () => {
    const obj = { type: 'chalet', gx: 1, gy: 1 };
    const { w, h } = footprintOf(obj);
    const p = placement(obj);
    expect(p.ground).toEqual(gridToWorld(1 + w / 2, 1 + h / 2));
    expect(p.height).toBe((CONTENT.sizes['chalet']?.heightTiles ?? 0) * TILE_W);
  });

  test('vorn liegt vor hinten, bei gleicher Ecke entscheidet die Bildschirmhöhe', () => {
    const hinten = placement({ type: 'lantern', gx: 3, gy: 3 });
    const vorn = placement({ type: 'lantern', gx: 4, gy: 3 });
    expect(vorn.depth).toBeGreaterThan(hinten.depth);
    // großes Haus hinten, Laterne direkt vor seiner vorderen Ecke
    const haus = placement({ type: 'chalet', gx: 0, gy: 0 });
    const laterne = placement({ type: 'lantern', gx: 3, gy: 3 });
    expect(laterne.depth).toBeGreaterThan(haus.depth);
  });

  test('Schattenbild sitzt mit demselben Bodenpunkt wie das Objektbild (Testklotz, halbe Auflösung)', () => {
    // Testklotz: Bild 200 × 100, Schattenleinwand in halber Auflösung (100 × 50 + Rand 30 links/rechts/unten = 160 × 80)
    const f = shadowFrame({ width: 200, height: 100 }, { width: 160, height: 80 }, 0.9, 128);
    const u = 128 / 100;
    expect(f.width).toBeCloseTo(320 * u);
    expect(f.height).toBeCloseTo(160 * u);
    // Bodenpunkt im Objektbild (100, 90) = im halbierten Schattenbild (80, 45)
    expect(f.anchorX * 160).toBeCloseTo(80);
    expect(f.anchorY * 80).toBeCloseTo(45);
  });

  test('Start-Hof: Haupthaus, Baum und Laternen haben Bilder; Laternen werfen einen Fleck', () => {
    for (const t of ['chalet', 'christmasTree', 'lantern', 'bakery']) expect(spriteFor(t), t).not.toBeNull();
    expect(spriteDefs()[spriteFor('lantern') ?? '']?.shadow).toBe('fleck');
    expect(spriteDefs()[spriteFor('chalet') ?? '']?.shadow).toBe('kontakt');
  });
});
