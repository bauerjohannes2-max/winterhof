// ============================================================================
// Grundboden (Baustein 5, Entscheidung 25): Hof-Schnee auf eigenem Land, Wildnis überall sonst – auch endlos
// über die Kartendaten hinaus. Hofrand = Farbstufe mit Schattenstreifen nach unten rechts (Licht oben links),
// keine Linie, kein weißer Rand, Kante leicht unregelmäßig.
//
// Gegen sichtbare Wiederholung (Hannes 24.11.: „natürlich und zufällig, kein Muster“): Hex-Tiling nach
// Mikkelsen (2022, „Practical Real-Time Hex-Tiling“, JCGT 11/3): die Textur wird je Sechseck zufällig verschoben
// und an den Rändern weich gemischt, ohne Drehung (gemaltes Licht bleibt oben links). Mip-Stufe aus den
// durchgehenden Koordinaten (textureGrad), sonst Nähte an den Sechseck-Grenzen.
// Variante B (zum Vergleich): zusätzlich große, weiche Dichte-Flecken in der Wildnis und leichte Helligkeitswolken.
//
// Ein Zeichenaufruf: ein Viereck über dem sichtbaren Bereich, alles im Shader. Abweichung von „gebacken“
// (GRAFIK_TECHNIK §3) mit Grund: endlose Wildnis + Schärfe bis 2 Bildpunkte je Weltpunkt passen nicht in
// gebackene Kacheln (Speicher weit über 96 MB); der Shader kostet 1 Aufruf und 3–6 Texturzugriffe je Bildpunkt.
// ============================================================================
import { Geometry, GlProgram, Mesh, Shader, type Texture } from 'pixi.js';
import type { TerrainMap } from '../../core';
import { TILE_H, TILE_W, type Rect } from './iso';

export type GroundVariant = 'a' | 'b';

/** Weltbreite, die eine Textur-Wiederholung abdeckt (Schärfe ≥ 1,6 Bildpunkte je Weltpunkt bei @2x, STIL_REGELN §6) */
export const SNOW_REPEAT = 320;
export const WILD_REPEAT = 640;
/** Platz für die Ownership-Tabelle: 8 × 8 Landstücke (Tal 6 × 6 + Ring außen = immer Wildnis) */
export const PLOT_TABLE = 8;

/** Eigene Landstücke als Tabelle (Index (row + 1) · 8 + col + 1), außen herum ein Ring „nicht eigen“. */
export function ownedTable(map: TerrainMap, owned: readonly string[]): Float32Array {
  const t = new Float32Array(PLOT_TABLE * PLOT_TABLE);
  for (const id of owned) {
    const p = map.plotById(id);
    if (!p) throw new Error(`Unbekanntes Landstück ${id}`);
    if (p.col + 1 >= PLOT_TABLE - 1 || p.row + 1 >= PLOT_TABLE - 1) throw new Error(`Landstück ${id} passt nicht in die Tabelle`);
    t[(p.row + 1) * PLOT_TABLE + p.col + 1] = 1;
  }
  return t;
}

/** Raster-Ursprung und Kantenlänge der Landstücke (alle gleich groß, prüft die Karte) */
export function plotLayout(map: TerrainMap): { gx0: number; gy0: number; size: number } {
  const first = map.plots[0];
  if (!first) throw new Error('Karte ohne Landstücke');
  const size = first.x1 - first.x0 + 1;
  return { gx0: Math.min(...map.plots.map((p) => p.x0)), gy0: Math.min(...map.plots.map((p) => p.y0)), size };
}

const VERTEX = /* glsl */ `#version 300 es
in vec2 aPosition;
out vec2 vWorld;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vWorld = aPosition;
}`;

const FRAGMENT = /* glsl */ `#version 300 es
in vec2 vWorld;
out vec4 finalColor;
uniform sampler2D uSnow;
uniform sampler2D uWild;
uniform vec4 uOwned[16];
uniform vec2 uPlotOrigin;
uniform float uPlotSize;
uniform float uVariant;

const float HW = ${TILE_W / 2}.0;
const float HH = ${TILE_H / 2}.0;

// Hash ohne Sinus (Dave Hoskins), auf Handys stabil
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { return 0.65 * noise(p) + 0.35 * noise(p * 2.03 + 17.0); }

// Hex-Tiling (Mikkelsen 2022): Dreiecksraster, drei Ecken mit eigener Zufallsverschiebung
vec3 hexSample(sampler2D tex, vec2 uv) {
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  vec2 st = uv * 3.4641016;                                     // 2·√3: Sechseck ≈ halbe Textur
  vec2 sk = vec2(st.x - 0.57735027 * st.y, 1.15470054 * st.y);
  vec2 base = floor(sk);
  vec3 t = vec3(fract(sk), 0.0);
  t.z = 1.0 - t.x - t.y;
  float s = step(0.0, -t.z), s2 = 2.0 * s - 1.0;
  vec3 w = vec3(-t.z * s2, s - t.y * s2, s - t.x * s2);
  vec2 v1 = base + vec2(s, s), v2 = base + vec2(s, 1.0 - s), v3 = base + vec2(1.0 - s, s);
  vec3 c1 = textureGrad(tex, uv + hash22(v1), dx, dy).rgb;
  vec3 c2 = textureGrad(tex, uv + hash22(v2), dx, dy).rgb;
  vec3 c3 = textureGrad(tex, uv + hash22(v3), dx, dy).rgb;
  // Gewichte schärfen (weniger Geister-Überblendung), hellere Stelle gewinnt leicht (Mikkelsen: Luminanz)
  vec3 lum = vec3(dot(c1, vec3(0.3, 0.59, 0.11)), dot(c2, vec3(0.3, 0.59, 0.11)), dot(c3, vec3(0.3, 0.59, 0.11)));
  w *= mix(vec3(1.0), lum, 0.6);
  w = pow(max(w, 0.0), vec3(5.0));
  w /= (w.x + w.y + w.z);
  return c1 * w.x + c2 * w.y + c3 * w.z;
}

float owned(vec2 cell) {
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x > 7.0 || cell.y > 7.0) return 0.0;
  int i = int(cell.y) * 8 + int(cell.x);
  return uOwned[i / 4][i - (i / 4) * 4];
}

// Abstand zur Grenze des eigenen Landes in Kacheln: > 0 im Hof, < 0 in der Wildnis
float landDistance(vec2 g) {
  vec2 p = (g - uPlotOrigin) / uPlotSize + 1.0;   // +1: Ring außen
  vec2 c = floor(p);
  float inside = owned(c);
  float d = 2.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 n = c + vec2(float(x), float(y));
      if (owned(n) != inside) {
        vec2 q = max(abs(p - (n + 0.5)) - 0.5, 0.0);
        d = min(d, length(q));
      }
    }
  }
  return (inside > 0.5 ? d : -d) * uPlotSize;
}

void main() {
  vec2 w = vWorld;
  vec2 g = vec2((w.y / HH + w.x / HW) * 0.5, (w.y / HH - w.x / HW) * 0.5);
  // Boden liegt flach: Textur im Bild 2 : 1 gestaucht (Schrägansicht)
  vec2 flatPos = vec2(w.x, w.y * 2.0);
  vec3 snow = hexSample(uSnow, flatPos / ${SNOW_REPEAT}.0) * vec3(0.95, 0.955, 0.95);   // Hof: ruhig, leicht wärmer als die Wildnis, kein Papierweiß
  vec3 wild = hexSample(uWild, flatPos / ${WILD_REPEAT}.0) * vec3(1.02, 1.04, 1.06);   // Wildnis etwas kühler, nur wenig dunkler als der Hof

  float macro = fbm(g / 7.0);
  if (uVariant > 0.5) {
    // B: Wildnis mal dichter, mal lichter (große weiche Flecken), Helligkeit wolkig ±3 %
    float dense = smoothstep(0.3, 0.72, fbm(g / 5.0 + 41.0));
    wild = mix(mix(snow, wild, 0.55), wild, dense);
    float light = 1.0 + (macro - 0.5) * 0.06;
    snow *= light;
    wild *= light;
  }

  // Hofrand: Kante leicht unregelmäßig (±0,1 Kachel), weiche Farbstufe, Schatten nach unten rechts
  float wobble = (fbm(g * 1.3 + 7.0) - 0.5) * 0.2;
  float d = landDistance(g) + wobble;
  float aa = max(0.05, fwidth(d));
  float hof = smoothstep(-aa, aa, d);
  vec2 shadowDir = vec2(0.285, 0.095);                           // Bild nach unten rechts = Raster (3, 1)
  float ds = landDistance(g - shadowDir) + wobble;
  float shadow = smoothstep(-0.35, 0.05, ds) * (1.0 - hof);
  vec3 col = mix(wild, snow, hof);
  col = mix(col, col * vec3(0.66, 0.74, 0.86), 0.5 * shadow);
  finalColor = vec4(col, 1.0);
}`;

export class Ground {
  readonly view: Mesh<Geometry, Shader>;
  private readonly positions = new Float32Array(8);
  private readonly geometry: Geometry;
  private readonly uniforms: { uniforms: { uOwned: Float32Array; uVariant: number } };
  private last = '';

  constructor(map: TerrainMap, owned: readonly string[], snow: Texture, wild: Texture, variant: GroundVariant) {
    for (const tex of [snow, wild]) {
      tex.source.addressMode = 'repeat';
      tex.source.autoGenerateMipmaps = true;
      tex.source.scaleMode = 'linear';
      tex.source.updateMipmaps();
    }
    const layout = plotLayout(map);
    this.geometry = new Geometry({ attributes: { aPosition: this.positions }, indexBuffer: [0, 1, 2, 0, 2, 3] });
    const shader = new Shader({
      glProgram: GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: 'grundboden', preferredFragmentPrecision: 'highp' }),
      resources: {
        uSnow: snow.source,
        uWild: wild.source,
        boden: {
          uOwned: { value: ownedTable(map, owned), type: 'vec4<f32>', size: 16 },
          uPlotOrigin: { value: new Float32Array([layout.gx0, layout.gy0]), type: 'vec2<f32>' },
          uPlotSize: { value: layout.size, type: 'f32' },
          uVariant: { value: variant === 'b' ? 1 : 0, type: 'f32' }
        }
      }
    });
    this.uniforms = shader.resources['boden'] as typeof this.uniforms;
    this.view = new Mesh({ geometry: this.geometry, shader, label: 'grundboden' });
  }

  /** Eigenes Land geändert (Landstück gekauft): nur die Tabelle neu */
  setOwned(map: TerrainMap, owned: readonly string[]): void {
    this.uniforms.uniforms.uOwned.set(ownedTable(map, owned));
  }

  /** Viereck über den sichtbaren Bereich legen (Welt), mit Rand; nur bei Änderung neu hochladen. */
  cover(r: Rect): void {
    const m = 64;
    const x0 = Math.floor(r.x0 / m) * m - m, y0 = Math.floor(r.y0 / m) * m - m;
    const x1 = Math.ceil(r.x1 / m) * m + m, y1 = Math.ceil(r.y1 / m) * m + m;
    const key = `${x0},${y0},${x1},${y1}`;
    if (key === this.last) return;
    this.last = key;
    this.positions.set([x0, y0, x1, y0, x1, y1, x0, y1]);
    this.geometry.getBuffer('aPosition').update();
  }
}
