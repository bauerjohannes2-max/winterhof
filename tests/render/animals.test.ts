import { describe, expect, test } from 'vitest';
import { CONTENT } from '../../src/core';
import {
  ANIMAL_BADGE, ANIMAL_FACING, animalLocalDepth, createAnimalSim, isInPenWalkZone, minAnimalSpacing, stepAnimalSim
} from '../../src/render/scene/animalSim';
import { spriteDefs, spriteFor } from '../../src/render/scene/objects';

describe('Tiere im Gehege (Baustein 11, Entscheidung 74)', () => {
  test('alle 5 Tierarten haben Katalog-Größe, Sprite (fleck), Badge-Overlay und korrekte Größenreihe', () => {
    const species = ['chicken', 'owl', 'sheep', 'donkey', 'reindeer'] as const;
    const defs = spriteDefs();
    const overlays = (CONTENT as unknown as { art: { overlays?: Record<string, { file: string }> } }).art.overlays ?? {};
    const heights: number[] = [];

    for (const sp of species) {
      const animalDef = CONTENT.animals[sp];
      expect(animalDef, sp).toBeDefined();
      const key = spriteFor(sp);
      expect(key, `Sprite für ${sp} fehlt`).not.toBeNull();
      expect(defs[key!]?.shadow, sp).toBe('fleck');
      expect(ANIMAL_FACING[sp]).toBeTypeOf('number');

      const badgeKey = ANIMAL_BADGE[animalDef!.produceItem];
      expect(badgeKey, `Badge für ${animalDef!.produceItem}`).toBeDefined();
      expect(overlays[badgeKey!]?.file).toBe(`${badgeKey}.png`);

      const h = CONTENT.sizes[sp]?.heightTiles ?? 0;
      expect(h, sp).toBeGreaterThan(0);
      heights.push(h);
    }

    // STIL_REGELN §4 / sizes: Huhn < Eule < Schaf < Esel < Rentier
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThan(heights[i - 1]!);
    }
    expect(heights[3]).toBeLessThan(CONTENT.sizes['person']!.heightTiles);
  });

  test('6 Tiere je Gehege (3×3 und 4×4) starten deterministisch, halten Abstand und bleiben in der Weide-Freizone', () => {
    for (const [penId, w, h] of [['pen_3', 3, 3], ['pen_4', 4, 4]] as const) {
      const placedA: { u: number; v: number }[] = [];
      const placedB: { u: number; v: number }[] = [];
      const spacing = minAnimalSpacing(w, h);

      for (let i = 0; i < 6; i++) {
        const a = createAnimalSim(penId, `a_${i}`, i, w, h, placedA);
        const b = createAnimalSim(penId, `a_${i}`, i, w, h, placedB);
        expect(a).toEqual(b);
        expect(isInPenWalkZone(a.u, a.v, w, h), `${penId} Startpunkt (${a.u}, ${a.v})`).toBe(true);
        for (const prev of placedA) {
          expect(Math.hypot(a.u - prev.u, a.v - prev.v)).toBeGreaterThanOrEqual(spacing - 1e-6);
        }
        placedA.push({ u: a.u, v: a.v });
        placedB.push({ u: b.u, v: b.v });
      }
    }
  });

  test('über 600 Simulationsschritte verlässt kein Tier die Weide-Freizone (kein Stall/Zaun-Clipping)', () => {
    for (const [penId, w, h, sp] of [['p3', 3, 3, 'chicken'], ['p4', 4, 4, 'reindeer']] as const) {
      const sims = Array.from({ length: 6 }, (_, i) => createAnimalSim(penId, `t_${i}`, i, w, h));
      for (let step = 0; step < 600; step++) {
        for (let i = 0; i < sims.length; i++) {
          const sim = sims[i]!;
          const peers = sims.filter((_, j) => j !== i).map((s) => ({ u: s.u, v: s.v }));
          stepAnimalSim(sim, 'producing', w, h, 0.05, peers, sp);
          expect(isInPenWalkZone(sim.u, sim.v, w, h), `${penId} Schritt ${step}: (${sim.u}, ${sim.v})`).toBe(true);
        }
      }
    }
  });

  test('Zustandsverhalten: hungry bleibt stehen, producing spaziert, ready wippt lebhaft', () => {
    const hungry = createAnimalSim('p1', 'h', 0, 3, 3);
    const startH = { u: hungry.u, v: hungry.v };
    for (let i = 0; i < 120; i++) stepAnimalSim(hungry, 'hungry', 3, 3, 0.05, [], 'chicken');
    expect(hungry.u).toBe(startH.u);
    expect(hungry.v).toBe(startH.v);
    expect(hungry.mode).toBe('idle');

    const prod = createAnimalSim('p1', 'p', 1, 4, 4);
    const startP = { u: prod.u, v: prod.v };
    for (let i = 0; i < 200; i++) stepAnimalSim(prod, 'producing', 4, 4, 0.05, [], 'reindeer');
    expect(Math.hypot(prod.u - startP.u, prod.v - startP.v)).toBeGreaterThan(0.1);

    const ready = createAnimalSim('p1', 'r', 2, 3, 3);
    let maxHop = 0;
    for (let i = 0; i < 40; i++) {
      const v = stepAnimalSim(ready, 'ready', 3, 3, 0.03, [], 'owl');
      maxHop = Math.max(maxHop, v.hop);
    }
    expect(maxHop).toBeGreaterThan(0.5);
  });

  test('Tiefenordnung innerhalb des Geheges liegt strikt zwischen Gehege und nächstem DAG-Objekt', () => {
    const penDepth = 120;
    const nextObjectDepth = 130;
    const shadowZ = penDepth + 0.5;
    const backZ = penDepth + 1 + animalLocalDepth(1.6, 1.1, 3, 3, 0);
    const frontZ = penDepth + 1 + animalLocalDepth(2.3, 2.3, 3, 3, 1);
    expect(shadowZ).toBeGreaterThan(penDepth);
    expect(backZ).toBeGreaterThan(shadowZ);
    expect(frontZ).toBeGreaterThan(backZ);
    expect(frontZ).toBeLessThan(nextObjectDepth);
  });
});
