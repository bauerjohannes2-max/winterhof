import { describe, expect, test } from 'vitest';
import { CONTENT, footprintOf } from '../../src/core';
import { gridToWorld, TILE_W } from '../../src/render/scene/iso';
import { isVisibleInView, placement, RIBBON_SPRITE, shadowFrame, spriteDefs, spriteFor } from '../../src/render/scene/objects';

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

  test('Vollständigkeit (Baustein 10): jeder stehende platzierbare Typ hat ein Bild + Schleifen-Overlay', () => {
    const defs = spriteDefs();
    const standTypes = [
      ...Object.keys(CONTENT.stations),
      ...Object.keys(CONTENT.pens),
      ...Object.entries(CONTENT.decorations).filter(([, d]) => d.group !== 'path').map(([id]) => id),
      ...Object.keys(CONTENT.obstacles),
      ...CONTENT.start.objects.map((o) => o.type)
    ];
    for (const t of new Set(standTypes)) {
      const key = spriteFor(t);
      expect(key, `Typ ${t} fehlt in art.sprites`).not.toBeNull();
      const def = defs[key!];
      expect(def?.file, key!).toBe(`${key}.png`);
      expect(CONTENT.sizes[def!.size]?.heightTiles, key!).toBeGreaterThan(0);
    }
    const overlays = (CONTENT as unknown as { art: { overlays?: Record<string, { file: string }> } }).art.overlays;
    expect(overlays?.[RIBBON_SPRITE]?.file).toBe(`${RIBBON_SPRITE}.png`);
  });

  test('Viewport-Culling erkennt sichtbare, randnahe und entfernte Objekte korrekt', () => {
    const view = { x0: -400, y0: -200, x1: 400, y1: 200 };
    expect(isVisibleInView({ x0: -50, y0: -50, x1: 50, y1: 50 }, view, 0)).toBe(true);
    expect(isVisibleInView({ x0: 450, y0: 0, x1: 520, y1: 80 }, view, 100)).toBe(true);
    expect(isVisibleInView({ x0: 600, y0: 0, x1: 700, y1: 80 }, view, 100)).toBe(false);
  });
});
