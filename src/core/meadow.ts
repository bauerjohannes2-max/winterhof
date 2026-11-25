// ============================================================================
// Winterhof Core – Spielfeld-Wiese (Baustein 5, Entscheidungen 29–31, 40)
// Das ganze Tal ist Wiese; der Rand läuft weich in großen Buchten 0,6 … 5,2 Kacheln über das Tal hinaus,
// dahinter Schnee (Kulisse). Einzige Quelle der Form: winterhof.json → map.meadow.
// Die Darstellung (render/scene/ground.ts) rechnet dieselbe Formel im Shader, mit den Werten von meadowShape().
// ============================================================================
import { CONTENT, type ContentPack } from './content';

export interface MeadowShape {
  /** Talmitte und Tal-Quadrat (Raster, durchgehend) */
  readonly cx: number;
  readonly cy: number;
  readonly lo: { gx: number; gy: number };
  readonly hi: { gx: number; gy: number };
  /** Wellen k, a·scale, p; reach(θ) = offset + Σ a·cos(k·θ + p) */
  readonly waves: readonly { k: number; a: number; p: number }[];
  readonly offset: number;
  /** > 0 Wiese, < 0 Schnee; Betrag ≈ Abstand zum Rand in Kacheln */
  field(gx: number, gy: number): number;
}

const SAMPLES = 4000;

export function validateMeadow(c: ContentPack = CONTENT): string[] {
  const m = c.map.meadow;
  const errs: string[] = [];
  if (!(m.reachMin > 0 && m.reachMax > m.reachMin)) errs.push('meadow: reachMin > 0 und reachMax > reachMin nötig');
  if (m.waves.length === 0) errs.push('meadow: keine Wellen');
  for (const w of m.waves) if (!(Number.isInteger(w.k) && w.k >= 1 && w.a > 0)) errs.push(`meadow: Welle k=${w.k} ungültig`);
  return errs;
}

export function buildMeadow(c: ContentPack = CONTENT): MeadowShape {
  const errs = validateMeadow(c);
  if (errs.length) throw new Error(`Wiese ungültig: ${errs.join('; ')}`);
  const m = c.map.meadow, p = c.map.plots;
  const lo = { gx: p.origin.gx, gy: p.origin.gy };
  const hi = { gx: p.origin.gx + p.cols * p.size, gy: p.origin.gy + p.rows * p.size };
  const cx = (lo.gx + hi.gx) / 2, cy = (lo.gy + hi.gy) / 2;
  // Auf reachMin … reachMax normieren (wie scripts/karte_rand.py: 4000 Winkel)
  const raw = (t: number) => m.waves.reduce((s, w) => s + w.a * Math.cos(w.k * t + w.p), 0);
  let n0 = Infinity, n1 = -Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    const v = raw((2 * Math.PI * i) / (SAMPLES - 1));
    n0 = Math.min(n0, v); n1 = Math.max(n1, v);
  }
  const scale = (m.reachMax - m.reachMin) / (n1 - n0);
  const waves = m.waves.map((w) => ({ k: w.k, a: w.a * scale, p: w.p }));
  const offset = m.reachMin - n0 * scale;
  return {
    cx, cy, lo, hi, waves, offset,
    field(gx, gy) {
      const t = Math.atan2(gy - cy, gx - cx);
      let reach = offset;
      for (const w of waves) reach += w.a * Math.cos(w.k * t + w.p);
      const dx = Math.max(lo.gx - gx, gx - hi.gx, 0), dy = Math.max(lo.gy - gy, gy - hi.gy, 0);
      return reach - Math.hypot(dx, dy);
    }
  };
}

let cached: MeadowShape | null = null;
/** Die Wiese des Spiels (einmal gebaut). */
export function meadow(): MeadowShape {
  if (!cached) cached = buildMeadow();
  return cached;
}
