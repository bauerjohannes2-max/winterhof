// ============================================================================
// Grundboden (Baustein 5, Entscheidungen 26, 29–31, 40): das ganze Tal ist Hay-Day-Wiese, Boden überall gleich
// (eigenes Land zeigen nur Hindernisse). Die Wiese endet weich in großen Buchten (Form: core/meadow.ts),
// dahinter liegt Schnee als dicke Schicht mit Volumen: Seitenkante, Schlagschatten aufs Gras nach unten rechts
// (Licht oben links), Oberseite mit Lichtkante, Verwehungen und Körnung. Vorlage: abgenommene Karten-Bilder R7–R9
// (scripts/karte_rand.py, Wiese GRAS_B, Schnee boden_gras.snow_render).
//
// Gegen sichtbare Wiederholung: Hex-Tiling nach Mikkelsen (2022, „Practical Real-Time Hex-Tiling“, JCGT 11/3),
// ohne Drehung (gemaltes Licht bleibt oben links); Mip-Stufe aus den durchgehenden Koordinaten (textureGrad).
// Große helle/dunkle Wiesenflecken wie Hay Day liegen in Weltkoordinaten darüber.
//
// Ein Zeichenaufruf: ein Viereck über dem sichtbaren Bereich, alles im Shader (Abweichung von „gebacken“,
// GRAFIK_TECHNIK §3: endlose Kulisse + Schärfe bis 2 Bildpunkte je Weltpunkt passen nicht in gebackene Kacheln).
// Teure Kantenrechnung nur nahe am Wiesenrand; tief in Wiese oder Schnee nur Textur bzw. Schneeton.
// ============================================================================
import { BufferImageSource, Geometry, GlProgram, Mesh, Shader, Texture } from 'pixi.js';

import { TILE_H, TILE_W, type Rect } from './iso';
import { PATH_RANGE, type MeadowShape, type PathField } from '../../core';

/**
 * Beläge in der Reihenfolge der Shader-Kanäle (Baustein 6). Muss CONTENT.paths.surfaces entsprechen (Test).
 * Aussehen hier nur Platzhalter aus Farbe + einfachem Muster; echte Belag-Bilder kommen in der Grafik-Runde (Entsch. 39).
 */
export const SHADER_SURFACES = ['erde', 'schnee', 'kies', 'holz', 'kopfstein', 'naturstein', 'sternenpflaster'] as const;

/** Weltbreite einer Gras-Textur-Wiederholung (Karten-Skizzen rechnen intern mit 116er-Bildmaß, umgerechnet auf die 128er-Kachel) */
export const GRASS_REPEAT = 352;
/** Weltbreite einer Erd-Textur-Wiederholung (1024er Bild als @2x → 512 Weltpunkte; etwas dichter für feineren Pinselstrich) */
export const EARTH_REPEAT = 384;
/** Höchstzahl Wellen der Wiesenform im Shader */
export const MAX_WAVES = 12;

/** Wiesenform als Shader-Werte (Wellen k, a, p; Tal-Quadrat lo/hi; Mitte; Grundreichweite). */
export function meadowUniforms(m: MeadowShape): { waves: Float32Array; count: number; box: Float32Array; center: Float32Array; offset: number } {
  if (m.waves.length > MAX_WAVES) throw new Error(`Wiese hat ${m.waves.length} Wellen, Shader kann ${MAX_WAVES}`);
  const waves = new Float32Array(MAX_WAVES * 3);
  m.waves.forEach((w, i) => waves.set([w.k, w.a, w.p], i * 3));
  return {
    waves, count: m.waves.length,
    box: new Float32Array([m.lo.gx, m.lo.gy, m.hi.gx, m.hi.gy]),
    center: new Float32Array([m.cx, m.cy]),
    offset: m.offset
  };
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
precision highp float;
in vec2 vWorld;
out vec4 finalColor;
uniform sampler2D uGrass;
uniform vec3 uWaves[${MAX_WAVES}];
uniform float uWaveCount;
uniform vec4 uBox;
uniform vec2 uCenter;
uniform float uOffset;
uniform sampler2D uPathA;   // R: Abstand zur Wegkante, G B A: Belag 0–2
uniform sampler2D uPathB;   // R G B A: Belag 3–6
uniform vec4 uPathBox;      // gx0, gy0, Breite, Höhe (Kacheln)
uniform sampler2D uEarth;   // gemalte Erd-Textur (Gemini, Look 2b), nahtlos
uniform sampler2D uStones;  // 8 gemalte Steinchen nebeneinander (Gemini, Look 2b), Alpha

const float HW = ${TILE_W / 2}.0;
const float HH = ${TILE_H / 2}.0;
const float THICK = 4.8;                                  // Schneedicke in Weltpunkten (Seitenkante)
const vec3 SNOW_TOP = vec3(243.0, 242.0, 234.0) / 255.0;  // passend zum Schnee der Baumbilder (karte_rand SCHNEE)
const vec3 SNOW_SHADE = vec3(190.0, 206.0, 218.0) / 255.0;
const vec3 SNOW_SIDE = vec3(136.0, 160.0, 192.0) / 255.0;
const vec3 SHADOW = vec3(0.42, 0.36, 0.16);               // Schlagschatten aufs Gras (warm abgedunkelt)
const float PATH_RANGE = ${PATH_RANGE.toFixed(3)};

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
  vec3 lum = vec3(dot(c1, vec3(0.3, 0.59, 0.11)), dot(c2, vec3(0.3, 0.59, 0.11)), dot(c3, vec3(0.3, 0.59, 0.11)));
  w *= mix(vec3(1.0), lum, 0.6);
  w = pow(max(w, 0.0), vec3(5.0));
  w /= (w.x + w.y + w.z);
  return c1 * w.x + c2 * w.y + c3 * w.z;
}

vec2 toGrid(vec2 w) { return vec2((w.y / HH + w.x / HW) * 0.5, (w.y / HH - w.x / HW) * 0.5); }
// Boden liegt flach: Rauschen in „aufgeklappten“ Weltkoordinaten (Bild 2 : 1 gestaucht)
vec2 flat2(vec2 w) { return vec2(w.x, w.y * 2.0); }

// Wiesenform (gleich core/meadow.ts): > 0 Wiese, < 0 Schnee, ungefähr Kacheln bis zum Rand
float meadow(vec2 g) {
  float t = atan(g.y - uCenter.y, g.x - uCenter.x);
  float reach = uOffset;
  for (int i = 0; i < ${MAX_WAVES}; i++) {
    if (float(i) >= uWaveCount) break;
    vec3 wv = uWaves[i];
    reach += wv.y * cos(wv.x * t + wv.z);
  }
  vec2 d = max(max(uBox.xy - g, g - uBox.zw), 0.0);
  return reach - length(d);
}

// Wegfeld (Baustein 6): Abstand zur Wegkante in Kacheln (+ innen). textureLod: Aufrufe liegen in Verzweigungen.
vec2 pathUv(vec2 g) { return (g - uPathBox.xy) / uPathBox.zw; }
float pathSd(vec2 g) { return (textureLod(uPathA, pathUv(g), 0.0).r * 2.0 - 1.0) * PATH_RANGE; }
// Wegkante gemalt statt geometrisch: in Weltpunkten leicht gewellt (±0,04 Kachel, Wellen ~0,3 Kachel)
float pathSdW(vec2 w) { return pathSd(toGrid(w)) + (noise(flat2(w) / 34.0) - 0.5) * 0.08; }

// Rand leicht unruhig: ±0,25 Kachel in weichen Wellen, ±0,07 fein (Value-Rauschen braucht größere Zellen als das Gauß-Rauschen der Karten-Bilder, sonst Knicke)
// Feine Zacken werden weit draußen ausgeblendet (sonst sägt die Kante: kleiner als ein Bildpunkt).
float uPx = 1.0;
float meadowField(vec2 w) {
  vec2 f = flat2(w);
  float fine = smoothstep(4.0, 1.5, uPx);
  return meadow(toGrid(w)) + (noise(f / 90.0) - 0.5) * 0.5 + (noise(f / 30.0 + 5.0) - 0.5) * 0.14 * fine;
}
// Schnee liegt nicht auf Wegen: wo die Zufahrt durch den Schnee führt, ist er geräumt (Kante mit Volumen wie am Wiesenrand)
float edgeField(vec2 w) {
  return max(meadowField(w), pathSd(toGrid(w)));
}

// Zellen-Rauschen für Pflaster (Abstand zur Fuge, Zellwert)
vec2 cells(vec2 p) {
  vec2 i = floor(p), fr = fract(p);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 q = o + 0.15 + 0.7 * hash22(i + o) - fr;
    float d = dot(q, q);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(i + o + 7.0); } else if (d < d2) { d2 = d; }
  }
  return vec2(sqrt(d2) - sqrt(d1), id);
}
vec3 paving(vec2 g, float scale, vec3 base, float joint) {
  vec2 c = cells(g / scale);
  vec3 col = base * (0.9 + 0.2 * c.y);
  return mix(col * 0.62, col, smoothstep(0.0, joint, c.x));
}

// Belag-Farbe (Platzhalter bis zur Grafik-Runde): Gewichte e0–e6 in der Reihenfolge SHADER_SURFACES
vec3 pathLook(vec2 g, vec2 f, vec3 e012, vec4 e3456, float px) {
  float grain = (noise(f / 2.5) - 0.5) * smoothstep(3.0, 1.0, px);
  vec3 col = vec3(0.0);
  // Erst nur Erdweg (Entsch. 55): alle Beläge zeigen vorerst Erde, eigene Bilder je Belag in der Grafik-Runde
  float all = e012.x + e012.y + e012.z + e3456.x + e3456.y + e3456.z + e3456.w;
  e012 = vec3(all, 0.0, 0.0); e3456 = vec4(0.0);
  // Erde (Kufenspuren brauchen die Fahrtrichtung und kommen mit dem gemalten Erd-Bild in der Grafik-Runde)
  // Erde: gemalte Textur (Gemini, Look 2b), Hex-Tiling gegen Wiederholung, große weiche Hell-Dunkel-Wolken darüber
  if (e012.x > 0.003) col += hexSample(uEarth, f / ${EARTH_REPEAT}.0) * (1.0 + 0.06 * (noise(f / 40.0) - 0.5)) * e012.x;
  if (e012.y > 0.003) col += vec3(226.0, 230.0, 236.0) / 255.0 * (1.0 + 0.05 * grain) * e012.y;   // Schneepfad
  if (e012.z > 0.003) {                                       // Kies: helle und dunkle Körner
    float k = hash12(floor(f / 2.2));
    col += vec3(176.0, 168.0, 152.0) / 255.0 * (0.86 + 0.28 * k) * e012.z;
  }
  if (e3456.x > 0.003) {                                      // Holzbohlen quer
    float seam = smoothstep(0.03, 0.0, abs(fract(g.x * 3.0) - 0.5) - 0.47);
    vec3 c = vec3(168.0, 122.0, 74.0) / 255.0 * (1.0 + 0.1 * grain) * (0.92 + 0.16 * hash12(vec2(floor(g.x * 3.0), 3.0)));
    col += c * (1.0 - 0.35 * seam) * e3456.x;
  }
  if (e3456.y > 0.003) col += paving(g, 0.22, vec3(146.0, 146.0, 154.0) / 255.0, 0.12) * e3456.y;  // Kopfstein
  if (e3456.z > 0.003) col += paving(g, 0.48, vec3(182.0, 176.0, 166.0) / 255.0, 0.06) * e3456.z;  // Natursteinplatten
  if (e3456.w > 0.003) {                                      // Sternenpflaster: Kopfstein dunkel, goldene Einlagen
    vec2 c = cells(g / 0.22);
    vec3 s = mix(vec3(118.0, 112.0, 140.0) / 255.0 * 0.62, vec3(118.0, 112.0, 140.0) / 255.0, smoothstep(0.0, 0.12, c.x));
    s = mix(s, vec3(0.96, 0.78, 0.32), step(0.9, c.y) * smoothstep(0.1, 0.3, c.x));
    col += s * e3456.w;
  }
  return col;
}

// Schneedecke 0…1 an einem Weltpunkt; soft = Weichheit in Kacheln. Keine losen Schollen auf der Wiese
// (Hay Day: Wiese endet sauber; Kulisse davor kommt mit der Rand-Gestaltung, Entscheidung 39).
float snowAt(vec2 w, float soft) {
  return 1.0 - smoothstep(-soft, soft, edgeField(w));
}

// Oberseite des Schnees: Lichtkante (rim), lange schräge Verwehungen, feine Körnung (weit draußen ausgeblendet)
vec3 snowTop(vec2 f, float rim, float px) {
  vec2 q = mat2(0.921, -0.389, 0.389, 0.921) * f * vec2(1.0 / 1.5, 1.5);
  float hA = noise(q / 760.0), hB = noise((q + vec2(3.0, 0.0)) / 760.0), hC = noise((q + vec2(0.0, 3.0)) / 760.0);
  float rA = pow(1.0 - abs(hA * 2.0 - 1.0), 2.0), rB = pow(1.0 - abs(hB * 2.0 - 1.0), 2.0), rC = pow(1.0 - abs(hC * 2.0 - 1.0), 2.0);
  float dr = clamp(-((rB - rA) * 0.8 + (rC - rA)) * 50.0 / 3.0, -1.0, 1.0) * 0.5;
  float grain = (noise(f / 3.0) - 0.5) * smoothstep(3.0, 1.0, px);
  float tone = clamp(0.72 + rim * 0.5 + dr * 0.6 + grain * 0.16, 0.0, 1.0);
  return mix(SNOW_SHADE, SNOW_TOP, tone);
}

void main() {
  vec2 w = vWorld;
  vec2 f = flat2(w);
  // Bildpunkt-Größe in Weltpunkten: für Kantenglättung und um feine Körnung weit draußen auszublenden
  float px = max(fwidth(w.x), 1e-3);
  uPx = px;

  // Wiese: Textur + große Licht-Flecken wie Hay Day
  vec3 grass = hexSample(uGrass, f / ${GRASS_REPEAT}.0);
  float patches = noise(f / 700.0) * 0.7 + noise(f / 240.0 + 9.0) * 0.3;
  // Hay Day: Licht wandert über die Wiese, aber keine dunklen Flecken (wirkten wie Schatten/Schmutz, Hannes 25.11.)
  float lit = patches - 0.5;
  grass *= 1.0 + lit * 0.1;
  grass = mix(grass, grass * vec3(1.07, 1.05, 0.86), clamp(lit * 2.0, 0.0, 1.0) * 0.6);   // helle Flecken etwas sonniger
  // Trockenflecken wie Hay Day: selten, etwa kachelgroß, in Weltkoordinaten (Textur würde sie als Muster wiederholen)
  float dryN = noise(f / 230.0 + 17.0) * 0.75 + noise(f / 70.0 + 3.0) * 0.25;
  float dry = smoothstep(0.62, 0.84, dryN);
  float bladeLift = clamp((dot(grass, vec3(0.3, 0.59, 0.11)) - 0.55) * 6.0, 0.0, 1.0);   // helle Halme werden zuerst gelb
  grass = mix(grass, grass * vec3(1.18, 1.06, 0.55) + vec3(0.06, 0.04, 0.0), dry * (0.3 + 0.7 * bladeLift));

  float fe = edgeField(w);
  float aaT = max(fwidth(fe), 1e-4) * 0.75;                     // ein Bildpunkt in Kacheln
  float perPx = fwidth(fe) / px;                                // Kacheln je Weltpunkt (für Weltmaße am Rand)
  vec3 col = grass;

  if (fe < -1.0) {
    // Tief im Schnee: nur Oberseite (keine Kante in der Nähe)
    col = snowTop(f, 0.0, px);
  } else if (fe < 1.2) {
    // Nah am Rand: Schicht mit Volumen. top = Oberseite (um THICK nach oben versetzt), side = sichtbare Kante
    float m = snowAt(w, aaT);
    float top = snowAt(w + vec2(0.0, THICK), aaT);
    float sh = snowAt(w + vec2(-1.2 * THICK, -0.1 * THICK), max(aaT, 1.4 * THICK * perPx));
    col *= 1.0 - clamp(sh, 0.0, 1.0) * SHADOW;
    col = mix(col, SNOW_SIDE, clamp(m - top, 0.0, 1.0));
    // Lichtkante der Oberseite: Gefälle der weichen Kante gegen das Licht von oben links
    float s = max(aaT, 2.4 * perPx);
    float e = 1.5;
    float gx = snowAt(w + vec2(e, THICK), s) - snowAt(w + vec2(-e, THICK), s);
    float gy = snowAt(w + vec2(0.0, THICK + e), s) - snowAt(w + vec2(0.0, THICK - e), s);
    float rim = clamp(-(gx * 0.8 + gy) * 3.0, -1.0, 1.0);
    col = mix(col, snowTop(f, rim, px), clamp(top, 0.0, 1.0));
  }
  // Wegfläche (Baustein 6, Look 2b, Entsch. 56; Zielbild docs/qa/neustart/b06_ziel_2b.jpg): gemalter Erdweg, leicht
  // vertieft. Licht oben links: oben/links fällt die Grasböschung als dunkler Streifen ab und wirft Schatten auf die Erde,
  // unten/rechts ragt das Gras in kurzen weichen Halmen über die Erde und die Erde steigt hell zur Kante an.
  // Breite Fließ-Streifen längs des Wegs (Bänder gleichen Abstands zur Kante), dunkle Kante innen. Keine Büschel (56).
  vec2 g = toGrid(w);
  float sd = pathSdW(w);
  if (sd > -0.12) {
    float onM = smoothstep(0.2, 0.7, meadowField(w));
    float aaS = max(fwidth(sd), 1e-4) * 0.8;
    float inPath = clamp(sd / aaS + 0.5, 0.0, 1.0);
    vec2 uv = pathUv(g);
    vec4 wa = textureLod(uPathA, uv, 0.0), wb = textureLod(uPathB, uv, 0.0);
    vec3 pc = pathLook(g, f, wa.gba, wb, px);
    // Fließ-Streifen: Abstand zur Kante, weich verbogen, längs in Stücke gebrochen; hell und dunkel versetzt
    float along = dot(g, vec2(0.5, 0.5));
    float v = sd * 4.0 + (noise(g * 0.9) - 0.5) * 1.4;
    float lightB = smoothstep(0.5, 0.72, noise(vec2(v, along * 0.6)));
    float darkB = smoothstep(0.55, 0.78, noise(vec2(v + 7.3, along * 0.5 + 3.0)));
    pc = mix(pc, vec3(238.0, 152.0, 62.0) / 255.0, lightB * 0.55);
    pc = mix(pc, vec3(148.0, 74.0, 30.0) / 255.0, darkB * 0.7 * (1.0 - lightB));
    // Pinselstriche wie 2b: helle Linie mit dunklem Schatten knapp daneben, längs des Wegs, in Stücke gebrochen
    float fine = smoothstep(3.0, 1.2, px);
    float n1 = noise(vec2(v * 1.7 + 2.0, along * 0.8));
    float n2 = noise(vec2(v * 1.7 + 2.0 - 0.35, along * 0.8));
    float brk = smoothstep(0.32, 0.55, noise(vec2(v * 0.8, along * 1.3) + 11.0));
    float strokeL = smoothstep(0.11, 0.02, abs(n1 - 0.5)) * brk * fine;
    float strokeD = smoothstep(0.11, 0.02, abs(n2 - 0.5)) * brk * fine * (1.0 - strokeL);
    pc = mix(pc, vec3(240.0, 162.0, 78.0) / 255.0, strokeL * 0.62);
    pc = mix(pc, vec3(150.0, 82.0, 38.0) / 255.0, strokeD * 0.45);
    // dunkle Kante innen (rotbraun)
    pc = mix(pc, pc * vec3(0.74, 0.62, 0.56), smoothstep(0.18, 0.0, sd) * onM);
    // Vertiefung: Schatten der Böschung oben links, Lichtkante unten rechts
    float sh = smoothstep(0.02, -0.06, pathSdW(w + vec2(-14.0, -10.0))) * onM;
    float hl = smoothstep(0.02, -0.06, pathSdW(w + vec2(12.0, 8.0))) * onM * (1.0 - sh);
    pc *= 1.0 - 0.28 * sh;
    pc *= 1.0 + 0.08 * hl;
    // Steinchen wie 2b: vereinzelt im Weg (nicht an der Kante), Raster 36 Weltpunkte, je Zelle höchstens einer
    if (sd > 0.05) {
      const float C = 40.0, S = 26.0;
      vec2 c0 = floor((w - S * 0.5) / C), c1 = floor((w + S * 0.5) / C);
      for (float cy = c0.y; cy <= c1.y; cy += 1.0) {
        for (float cx = c0.x; cx <= c1.x; cx += 1.0) {
          vec2 id = vec2(cx, cy);
          if (hash12(id + 31.0) > 0.28) continue;
          vec2 an = (id + 0.2 + 0.6 * hash22(id + 47.0)) * C;
          if (pathSd(toGrid(an)) < 0.22) continue;
          float sc = 0.7 + 0.5 * hash12(id + 5.0);
          vec2 lo = (w - an) / (S * sc) + 0.5;
          if (any(lessThan(lo, vec2(0.0))) || any(greaterThan(lo, vec2(1.0)))) continue;
          float k = floor(hash12(id + 13.0) * 8.0);
          vec4 st = textureLod(uStones, vec2((k + lo.x) / 8.0, lo.y), 0.0);
          pc = mix(pc, st.rgb / max(st.a, 1e-3), st.a);
        }
      }
    }
    col = mix(col, pc, inPath);
    if (onM > 0.01) {
      // Halme senkrecht im Bild, in Grüppchen wie 2b: Spalten 2,6 Weltpunkte, Höhe 3–9 Weltpunkte, Lücken dazwischen
      float cw = 2.6;
      float ci = floor(w.x / cw);
      float tri = pow(1.0 - abs(fract(w.x / cw) - 0.5) * 2.0, 0.8);
      float clump = smoothstep(0.3, 0.7, noise(vec2(w.x / 18.0, 2.0)));
      float hgt = mix(3.0, 9.0, hash12(vec2(ci, 3.0))) * mix(0.35, 1.0, clump);
      // Böschung oben: Gras knapp darüber → dunkler Streifen mit gezackter Unterkante
      float face = smoothstep(0.004, -0.004, pathSdW(w - vec2(0.0, 3.5 + hgt * 0.4 * tri)));
      // Halme unten: Gras knapp darunter → Halm ragt über die Erde
      float blade = smoothstep(0.004, -0.004, pathSdW(w + vec2(0.0, hgt * tri))) * fine;
      vec3 faceC = grass * vec3(0.62, 0.7, 0.5);
      col = mix(col, faceC, face * inPath * onM);
      vec3 bladeC = grass * mix(vec3(0.92, 0.96, 0.9), vec3(1.12, 1.1, 1.0), hash12(vec2(ci, 9.0)));
      col = mix(col, bladeC, blade * inPath * onM);
    }
  }
  finalColor = vec4(col, 1.0);
}`;

export class Ground {
  readonly view: Mesh<Geometry, Shader>;
  private readonly positions = new Float32Array(8);
  private readonly geometry: Geometry;
  private last = '';

  private pathA: Texture;
  private pathB: Texture;
  private readonly pathBox = new Float32Array(4);
  private readonly shader: Shader;

  constructor(shape: MeadowShape, grass: Texture, earth: Texture, stones: Texture, paths: PathField) {
    stones.source.scaleMode = 'linear';
    for (const t of [grass, earth]) {
      t.source.addressMode = 'repeat';
      t.source.autoGenerateMipmaps = true;
      t.source.scaleMode = 'linear';
      t.source.updateMipmaps();
    }
    const u = meadowUniforms(shape);
    this.geometry = new Geometry({ attributes: { aPosition: this.positions }, indexBuffer: [0, 1, 2, 0, 2, 3] });
    this.pathA = pathTexture(paths.a, paths.width, paths.height);
    this.pathB = pathTexture(paths.b, paths.width, paths.height);
    this.pathBox.set([paths.box.gx0, paths.box.gy0, paths.box.w, paths.box.h]);
    const shader = new Shader({
      glProgram: GlProgram.from({ vertex: VERTEX, fragment: FRAGMENT, name: 'grundboden', preferredFragmentPrecision: 'highp' }),
      resources: {
        uGrass: grass.source,
        uPathA: this.pathA.source,
        uPathB: this.pathB.source,
        uEarth: earth.source,
        uStones: stones.source,
        boden: {
          uWaves: { value: u.waves, type: 'vec3<f32>', size: MAX_WAVES },
          uWaveCount: { value: u.count, type: 'f32' },
          uBox: { value: u.box, type: 'vec4<f32>' },
          uCenter: { value: u.center, type: 'vec2<f32>' },
          uOffset: { value: u.offset, type: 'f32' },
          uPathBox: { value: this.pathBox, type: 'vec4<f32>' }
        }
      }
    });
    this.shader = shader;
    this.view = new Mesh({ geometry: this.geometry, shader, label: 'grundboden' });
  }

  /** Neues Wegfeld (nach Bauen/Verschieben von Wegplatten). Gleiche Maße: nur hochladen. */
  setPaths(paths: PathField): void {
    this.pathBox.set([paths.box.gx0, paths.box.gy0, paths.box.w, paths.box.h]);
    const same = this.pathA.source.width === paths.width && this.pathA.source.height === paths.height;
    if (same) {
      (this.pathA.source as BufferImageSource).resource = paths.a;
      (this.pathB.source as BufferImageSource).resource = paths.b;
      this.pathA.source.update();
      this.pathB.source.update();
      return;
    }
    this.pathA.destroy(true);
    this.pathB.destroy(true);
    this.pathA = pathTexture(paths.a, paths.width, paths.height);
    this.pathB = pathTexture(paths.b, paths.width, paths.height);
    this.shader.resources['uPathA'] = this.pathA.source;
    this.shader.resources['uPathB'] = this.pathB.source;
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

function pathTexture(data: Uint8Array, width: number, height: number): Texture {
  const source = new BufferImageSource({
    resource: data, width, height, format: 'rgba8unorm',
    scaleMode: 'linear', addressMode: 'clamp-to-edge', alphaMode: 'no-premultiply-alpha', autoGenerateMipmaps: false
  });
  return new Texture({ source });
}
