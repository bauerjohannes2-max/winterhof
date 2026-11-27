// ============================================================================
// Wegfeld (Baustein 6, Entscheidungen 53/54): aus den Wegkacheln wird EINE Fläche mit runden Ecken.
// Rechnet einmal auf der CPU (bei jeder Wegänderung neu), der Boden-Shader liest nur zwei kleine Texturen:
//   A = R: Abstand zur Wegkante in Kacheln (+ innen, − außen), G B A: Gewicht Belag 0–2
//   B = R G B A: Gewicht Belag 3–6
// Form: Kachel-Maske weich geglättet, Kante bei 0,5 → gerade Kanten bleiben genau auf der Kachelgrenze,
// Ecken (außen wie innen) werden rund. Abstand nahe der Kante aus dem Gefälle (glatt, ohne Treppen im Texel-Raster),
// weiter weg aus der exakten Abstandstransformation (Felzenszwalb & Huttenlocher 2012, „Distance Transforms of
// Sampled Functions“). Beläge laufen weich über eine halbe Kachel ineinander (Entscheidung 53).
// Reine Rechnung ohne Grafik (wie die Wiesenform in meadow.ts liegt sie im Kern): testbar in Vitest.
// ============================================================================

/** Texel je Kachel (8 reicht: das Feld ist glatt, die Grafikkarte filtert linear) */
export const PATH_TEXELS = 8;
/** Abstand wird bis ±RANGE Kacheln gespeichert */
export const PATH_RANGE = 1.5;
/** Rundung der Ecken: Glättung in Kacheln (Kante A, Entscheidung 54) */
export const PATH_ROUND = 0.42;
/** Übergang zwischen Belägen in Kacheln (halbe Kachel, Entscheidung 53) */
export const PATH_BLEND = 0.5;
/** Höchstzahl Beläge (Kanal-Plätze in den zwei Texturen) */
export const MAX_SURFACES = 7;

export interface PathBox { gx0: number; gy0: number; w: number; h: number }

export interface PathField {
  readonly box: PathBox;
  /** Texel-Maße */
  readonly width: number;
  readonly height: number;
  readonly a: Uint8Array;
  readonly b: Uint8Array;
}

/** Gauß-Glättung, getrennt in x und y; am Rand wird fortgesetzt (Zufahrt läuft über den Kartenrand hinaus weiter) */
function blur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]!; }
  for (let i = 0; i < k.length; i++) k[i]! /= s;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const xMidEnd = Math.max(r, w - r);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < Math.min(r, w); x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) v += src[row + Math.min(w - 1, Math.max(0, x + i))]! * k[i + r]!;
      tmp[row + x] = v;
    }
    for (let x = r; x < xMidEnd; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) v += src[row + x + i]! * k[i + r]!;
      tmp[row + x] = v;
    }
    for (let x = xMidEnd; x < w; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) v += src[row + Math.min(w - 1, Math.max(0, x + i))]! * k[i + r]!;
      tmp[row + x] = v;
    }
  }
  // Y-Pass zeilenweise (linear im Cache statt Spaltensprünge → deutlich schneller bei gleichem Ergebnis)
  for (let y = 0; y < h; y++) {
    const dst = y * w;
    for (let i = -r; i <= r; i++) {
      const sy = Math.min(h - 1, Math.max(0, y + i)) * w;
      const ki = k[i + r]!;
      for (let x = 0; x < w; x++) out[dst + x] = out[dst + x]! + tmp[sy + x]! * ki;
    }
  }
  return out;
}

const INF = 1e20;
/** 1-D quadratischer Abstand (Felzenszwalb) */
function edt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) { k--; s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!); }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    d[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
  }
}

/** Abstand (Texel) jedes Texels zum nächsten Texel mit seed = true */
function edt(seed: Uint8Array, w: number, h: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = seed[i] ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x]!;
    edt1(f, h, d, v, z);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y]!;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x]!;
    edt1(f, w, d, v, z);
    for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]!);
  }
  return g;
}

const byte = (v: number): number => Math.max(0, Math.min(255, Math.round(v * 255)));

/**
 * Baut das Wegfeld für einen Kartenausschnitt.
 * @param tiles Belag je Kachel ("gx,gy" → Belag-ID)
 * @param surfaces alle Beläge in fester Reihenfolge (Kanal = Index)
 */
export function buildPathField(tiles: ReadonlyMap<string, string>, surfaces: readonly string[], box: PathBox, T = PATH_TEXELS): PathField {
  if (surfaces.length > MAX_SURFACES) throw new Error(`Wegfeld kann höchstens ${MAX_SURFACES} Beläge, nicht ${surfaces.length}`);
  const W = box.w * T, H = box.h * T, N = W * H;
  const mask = new Float32Array(N);
  // Nur Beläge anlegen und glätten, die tatsächlich auf der Karte liegen (spart beim Start 6 leere Durchläufe)
  const per: (Float32Array | null)[] = surfaces.map(() => null);
  for (const [key, surf] of tiles) {
    const [gx, gy] = key.split(',').map(Number) as [number, number];
    const si = surfaces.indexOf(surf);
    if (si < 0) throw new Error(`Wegfeld: Belag ${surf} unbekannt`);
    const x0 = (gx - box.gx0) * T, y0 = (gy - box.gy0) * T;
    if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) continue;
    let layer = per[si];
    if (!layer) { layer = new Float32Array(N); per[si] = layer; }
    for (let y = y0; y < y0 + T; y++) {
      for (let x = x0; x < x0 + T; x++) { mask[y * W + x] = 1; layer[y * W + x] = 1; }
    }
  }

  // Form: geglättet, Kante bei 0,5
  const b = blur(mask, W, H, PATH_ROUND * T);
  const inside = new Uint8Array(N), outside = new Uint8Array(N);
  for (let i = 0; i < N; i++) { inside[i] = b[i]! >= 0.5 ? 1 : 0; outside[i] = 1 - inside[i]!; }
  const dOut = edt(inside, W, H);    // außen: Abstand zur Fläche
  const dIn = edt(outside, W, H);    // innen: Abstand zur Wiese

  const a = new Uint8Array(N * 4), bb = new Uint8Array(N * 4);
  const wts = per.map((p) => (p ? blur(p, W, H, PATH_BLEND * T * 0.5) : null));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // Abstand weit weg: exakt aus der Transformation (Texelmitten, daher −0,5 Texel)
      const far = inside[i] ? (dIn[i]! - 0.5) / T : -(dOut[i]! - 0.5) / T;
      // Abstand nah an der Kante: aus dem Gefälle der geglätteten Maske (glatt, ohne Texel-Treppen)
      const gxv = (b[y * W + Math.min(W - 1, x + 1)]! - b[y * W + Math.max(0, x - 1)]!) / 2;
      const gyv = (b[Math.min(H - 1, y + 1) * W + x]! - b[Math.max(0, y - 1) * W + x]!) / 2;
      const grad = Math.hypot(gxv, gyv) * T;
      const near = grad > 1e-4 ? (b[i]! - 0.5) / grad : far;
      const t = Math.min(1, Math.max(0, (Math.abs(near) - 0.15) / 0.15));
      const sd = Math.max(-PATH_RANGE, Math.min(PATH_RANGE, near * (1 - t) + far * t));
      a[i * 4] = byte(sd / PATH_RANGE * 0.5 + 0.5);
      let s = 0;
      for (const w of wts) if (w) s += w[i]!;
      const norm = s > 1e-4 ? 1 / s : 0;
      for (let k = 0; k < MAX_SURFACES; k++) {
        const wk = k < wts.length ? wts[k] : null;
        const v = wk ? wk[i]! * norm : 0;
        if (k < 3) a[i * 4 + 1 + k] = byte(v); else bb[i * 4 + k - 3] = byte(v);
      }
    }
  }
  return { box, width: W, height: H, a, b: bb };
}

/** Abstand an einer Kachel-Position (Kacheln), wie der Shader ihn liest (nächstes Texel, für Tests). */
export function sdAt(f: PathField, gx: number, gy: number, T = PATH_TEXELS): number {
  const x = Math.min(f.width - 1, Math.max(0, Math.floor((gx - f.box.gx0) * T)));
  const y = Math.min(f.height - 1, Math.max(0, Math.floor((gy - f.box.gy0) * T)));
  return (f.a[(y * f.width + x) * 4]! / 255 - 0.5) * 2 * PATH_RANGE;
}

/** Gewicht eines Belags (0…1) an einer Kachel-Position (für Tests). */
export function weightAt(f: PathField, k: number, gx: number, gy: number, T = PATH_TEXELS): number {
  const x = Math.min(f.width - 1, Math.max(0, Math.floor((gx - f.box.gx0) * T)));
  const y = Math.min(f.height - 1, Math.max(0, Math.floor((gy - f.box.gy0) * T)));
  const i = (y * f.width + x) * 4;
  return (k < 3 ? f.a[i + 1 + k]! : f.b[i + k - 3]!) / 255;
}
