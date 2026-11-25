// Baustein 5: Spielfeld-Wiese als Daten (Entscheidungen 29–31, 40) – gleiche Form wie die abgenommenen Karten-Bilder.
import { describe, expect, it } from 'vitest';
import { CONTENT, buildMeadow, meadow, terrainMap, validateMap, validateMeadow, type ContentPack } from '../../src/core';

const clone = (): ContentPack => JSON.parse(JSON.stringify(CONTENT)) as ContentPack;

describe('Spielfeld-Wiese', () => {
  it('Daten gültig, Teil der Kartenprüfung', () => {
    expect(validateMeadow()).toEqual([]);
    const c = clone();
    c.map.meadow.reachMin = 0;
    expect(validateMap(c).join()).toMatch(/meadow/);
    expect(() => buildMeadow(c)).toThrow();
  });

  it('gleiche Form wie scripts/karte_rand.py (Bezugswerte aus Python)', () => {
    const m = meadow();
    const ref: [number, number, number][] = [
      [2, 2, 3.2955], [-13, -13, 3.3153], [17, 17, 2.323], [-13, 5, 1.4002], [20, 2, 0.2955],
      [2, -20, -2.2725], [-25, -5, -10.672], [6.8, 30, -9.0791], [17, -13, 3.3181]
    ];
    for (const [gx, gy, f] of ref) expect(m.field(gx, gy)).toBeCloseTo(f, 2);
  });

  it('jede Kachel jedes Landstücks liegt mindestens reachMin tief in der Wiese', () => {
    const m = meadow();
    for (const p of terrainMap().plots) {
      for (const [gx, gy] of [[p.x0, p.y0], [p.x1 + 1, p.y0], [p.x0, p.y1 + 1], [p.x1 + 1, p.y1 + 1]] as const) {
        expect(m.field(gx, gy)).toBeGreaterThanOrEqual(CONTENT.map.meadow.reachMin - 1e-9);
      }
    }
  });

  it('Rand reicht reachMin … reachMax über das Tal hinaus', () => {
    const m = meadow();
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 720; i++) {
      const t = (i / 720) * 2 * Math.PI;
      // vom Talrand nach außen laufen, bis die Wiese endet
      let r = 0;
      while (m.field(m.cx + Math.cos(t) * (15 + r), m.cy + Math.sin(t) * (15 + r)) > 0 && r < 40) r += 0.02;
      const gx = m.cx + Math.cos(t) * (15 + r), gy = m.cy + Math.sin(t) * (15 + r);
      const out = Math.hypot(Math.max(m.lo.gx - gx, gx - m.hi.gx, 0), Math.max(m.lo.gy - gy, gy - m.hi.gy, 0));
      lo = Math.min(lo, out); hi = Math.max(hi, out);
    }
    expect(lo).toBeGreaterThan(CONTENT.map.meadow.reachMin - 0.1);
    expect(hi).toBeLessThan(CONTENT.map.meadow.reachMax + 0.1);
  });
});
