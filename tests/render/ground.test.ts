import { describe, expect, test } from 'vitest';
import { buildMeadow, meadow } from '../../src/core';
import { FRAGMENT, hash12, MAX_WAVES, meadowUniforms, NOISE_SIZE, noiseTable } from '../../src/render/scene/ground';

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

  test('Zufallstabelle: Werte wie hash12 des Shaders, gleichverteilt, Ecken nahtlos (ein Abruf je Rauschzelle)', () => {
    const t = noiseTable();
    const half = NOISE_SIZE / 2;
    for (const [x, y] of [[0, 0], [-3, 7], [120, -200], [-256, 255]] as const) {
      expect(t[((y + half) * NOISE_SIZE + (x + half)) * 4]).toBe(Math.round(hash12(x, y) * 255));
    }
    const v = (x: number, y: number): number => t[(((y + NOISE_SIZE) % NOISE_SIZE) * NOISE_SIZE + ((x + NOISE_SIZE) % NOISE_SIZE)) * 4] ?? -1;
    for (const [x, y] of [[0, 0], [17, 200], [NOISE_SIZE - 1, 5], [3, NOISE_SIZE - 1], [NOISE_SIZE - 1, NOISE_SIZE - 1]] as const) {
      const i = (y * NOISE_SIZE + x) * 4;
      expect([t[i], t[i + 1], t[i + 2], t[i + 3]]).toEqual([v(x, y), v(x + 1, y), v(x, y + 1), v(x + 1, y + 1)]);
    }
    let sum = 0;
    for (let i = 0; i < t.length; i += 4) sum += t[i] ?? 0;
    expect(sum / (NOISE_SIZE * NOISE_SIZE)).toBeGreaterThan(120);
    expect(sum / (NOISE_SIZE * NOISE_SIZE)).toBeLessThan(135);
  });

  test('Shader bleibt schnell übersetzbar: Randproben als Schleife mit Uniform-Länge, Rauschen ohne Hash', () => {
    // Gemessen 26.11.: ausgerollt bzw. mit Hash-Rauschen 3,4 s Übersetzungszeit unter Windows (ANGLE/D3D), jetzt ~0,6 s
    expect(FRAGMENT).toContain('k < uEdgeSamples');
    expect(FRAGMENT.match(/snowAt\(/g)?.length).toBe(2);                    // Definition + eine Stelle in der Schleife
    expect(FRAGMENT.match(/snowTop\(/g)?.length).toBe(2);
    expect(FRAGMENT).not.toMatch(/mix\(hash12/);
  });
});
