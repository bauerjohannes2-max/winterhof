import { describe, expect, test } from 'vitest';
import { buildMeadow, meadow } from '../../src/core';
import { MAX_WAVES, meadowUniforms } from '../../src/render/scene/ground';

describe('Grundboden (Baustein 5, Entscheidung 40)', () => {
  test('Shader bekommt genau die Wiesenform des Kerns', () => {
    const m = meadow();
    const u = meadowUniforms(m);
    expect(u.count).toBe(m.waves.length);
    m.waves.forEach((w, i) => {
      expect(u.waves[i * 3]).toBe(w.k);
      expect(u.waves[i * 3 + 1]).toBeCloseTo(w.a, 5);
      expect(u.waves[i * 3 + 2]).toBeCloseTo(w.p, 5);
    });
    expect([...u.box]).toEqual([m.lo.gx, m.lo.gy, m.hi.gx, m.hi.gy]);
    expect([...u.center]).toEqual([m.cx, m.cy]);
    expect(u.offset).toBeCloseTo(m.offset, 5);
  });
  test('zu viele Wellen für den Shader sind ein Fehler', () => {
    const m = buildMeadow();
    const many = { ...m, waves: Array.from({ length: MAX_WAVES + 1 }, () => ({ k: 2, a: 0.1, p: 0 })) };
    expect(() => meadowUniforms(many)).toThrow();
  });
});
