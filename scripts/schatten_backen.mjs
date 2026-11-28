// ============================================================================
// Schattenbilder backen (Baustein 7 & 10, Entscheidung 62, docs/GRAFIK_TECHNIK.md §4)
// Wie Supercell: Schatten wird vorab aus der Bildform gerechnet, im Spiel liegt nur noch ein Sprite darunter.
// Je Objektbild aus winterhof.json → art.sprites (shadow: kontakt | fleck; bild = Bild bringt Schatten mit, nichts backen):
//   kontakt: Verfolgt spaltenweise die schräge V-Unterkante (auch bei 3×3 / 4×4-Gebäuden und Gehegen!),
//            leicht nach unten rechts verschoben und weichgezeichnet – kein harter waagerechter Schnitt.
//   fleck:   zusätzlich ein weicher Fleck nach unten rechts (Bäume, Laternen, Tiere)
// Ausgabe: art_src/spiel{m}/schatten{tps}/<bild>_schatten.png (weiß, Deckkraft = Schatten; Farbe per Tönung im Spiel).
// ============================================================================
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'art_src', 'spiel{m}', 'objekte{tps}');
const OUT = join(ROOT, 'art_src', 'spiel{m}', 'schatten{tps}');
const CONTENT = join(ROOT, 'src', 'content', 'winterhof.json');
const SELF = fileURLToPath(import.meta.url);

/** Rand der Schatten-Leinwand als Anteil der größeren Bildseite */
const PAD = 0.3;
/** Halbe Auflösung wie in GRAFIK_TECHNIK §4 */
const SCALE = 0.5;
const K = {
  shiftX: 0.018,     // Licht oben links → leichter Versatz nach rechts (× T)
  shiftY: 0.035,     // leichter Versatz nach unten (× T)
  blur: 0.036,       // Kontakt: Weichzeichnung (× T)
  colBand: 0.18,     // spaltenlokales Kontaktband über colFoot[x] (× T)
  colFade: 0.10,     // weiches Auslaufen des Spaltenbands (× T)
  riseFade: 0.14,    // weiches Auslaufen bei sehr steilen/hohen Silhouetten (× T)
  contact: 1.0,      // Kontakt: Stärke
  fleckRight: 0.10,  // Fleck: Mitte rechts vom Bild (× T)
  fleckUp: 0.10,     // Fleck: Mitte über dem Fuß (× Breite)
  fleckRx: 0.50,     // Fleck: Halbachsen (× Breite)
  fleckRy: 0.17,
  fleckBlur: 0.07,   // Fleck: Weichzeichnung (× T)
  fleck: 0.30,       // Fleck: Stärke
  max: 0.65          // höchste Deckkraft
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

async function blur(buf, w, h, sigma) {
  const out = await sharp(buf, { raw: { width: w, height: h, channels: 1 } }).blur(Math.max(0.3, sigma)).toColourspace('b-w').raw().toBuffer();
  if (out.length !== w * h) throw new Error(`Weichzeichner: ${out.length} statt ${w * h} Werte`);
  return out;
}

async function backe(file, heightTiles, mode, out, fw = 1, fh = 1) {
  const meta = await sharp(join(SRC, file)).metadata();
  const sw = Math.max(1, Math.round((meta.width ?? 1) * SCALE));
  const sh = Math.max(1, Math.round((meta.height ?? 1) * SCALE));
  const { data, info } = await sharp(join(SRC, file))
    .ensureAlpha()
    .extractChannel(3)
    .resize(sw, sh, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, T = H / heightTiles;
  const m = Math.round(PAD * Math.max(W, H));
  const CW = W + 2 * m, CH = H + m;

  // Unterste deckende Zeile insgesamt sowie je Bildspalte (folgt der V-Grundfläche)
  let foot = 0, x0 = W, x1 = 0;
  const colFoot = new Int32Array(W).fill(-1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[y * W + x] > 127) {
        foot = y;
        colFoot[x] = y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
    }
  }
  const breite = Math.max(1, x1 - x0);

  // Für Randunschärfe über die Bildkante hinaus den nächsten gültigen colFoot-Wert bestimmen
  const blurR = Math.max(2, Math.ceil(K.blur * T * 2.5));
  const nearFoot = new Int32Array(CW).fill(-1);
  for (let cx = 0; cx < CW; cx++) {
    const sx = cx - m;
    if (sx >= 0 && sx < W && colFoot[sx] >= 0) {
      nearFoot[cx] = colFoot[sx];
      continue;
    }
    let best = -1;
    for (let d = 1; d <= blurR; d++) {
      const l = sx - d, r = sx + d;
      if (l >= 0 && l < W && colFoot[l] >= 0) best = Math.max(best, colFoot[l]);
      if (r >= 0 && r < W && colFoot[r] >= 0) best = Math.max(best, colFoot[r]);
      if (best >= 0) break;
    }
    nearFoot[cx] = best;
  }

  // Kontaktlinie entlang der schrägen V-Unterkante
  const dx = Math.round(K.shiftX * T);
  const dy = Math.round(K.shiftY * T);
  const p = Buffer.alloc(CW * CH);
  for (let y = 0; y < H && y + dy < CH; y++) {
    for (let x = 0; x < W; x++) {
      const dstX = x + m + dx;
      if (dstX >= 0 && dstX < CW) p[(y + dy) * CW + dstX] = data[y * W + x];
    }
  }
  const k = await blur(p, CW, CH, K.blur * T);

  const maxRise = (Math.max(fw, fh) * 0.25 + 0.18) * T;
  const colBandPx = K.colBand * T;
  const colFadePx = K.colFade * T;
  const riseFadePx = K.riseFade * T;
  const riseTop = foot - maxRise;

  const a = new Float32Array(CW * CH);
  for (let y = 0; y < CH; y++) {
    const wRise = clamp01((y - riseTop) / riseFadePx);
    if (wRise <= 0) continue;
    const rowOff = y * CW;
    for (let x = 0; x < CW; x++) {
      const cf = nearFoot[x];
      if (cf < 0) continue;
      const wCol = clamp01((y - (cf - colBandPx)) / colFadePx);
      if (wCol <= 0) continue;
      a[rowOff + x] = (k[rowOff + x] / 255) * K.contact * wCol * wRise;
    }
  }

  // Weicher Bodenfleck (Bäume, Laternen, Tiere) – Breite bei schmalen Masten begrenzen
  if (mode === 'fleck') {
    const fleckW = Math.min(breite, Math.max(12, 0.72 * T));
    const cx = m + (x0 + x1) / 2 + K.fleckRight * T, cy = foot - K.fleckUp * fleckW;
    const rx = K.fleckRx * fleckW, ry = K.fleckRy * fleckW;
    const e = Buffer.alloc(CW * CH);
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(CH - 1, Math.ceil(cy + ry)); y++) {
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(CW - 1, Math.ceil(cx + rx)); x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) e[y * CW + x] = 255;
      }
    }
    const f = await blur(e, CW, CH, K.fleckBlur * T);
    for (let i = 0; i < a.length; i++) a[i] += (f[i] / 255) * K.fleck;
  }

  const rgba = Buffer.alloc(CW * CH * 4, 255);
  for (let i = 0; i < a.length; i++) rgba[i * 4 + 3] = Math.round(Math.min(K.max, a[i]) * 255);
  await sharp(rgba, { raw: { width: CW, height: CH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(out);
}

async function main() {
  const t0 = performance.now();
  const c = JSON.parse(readFileSync(CONTENT, 'utf8'));
  mkdirSync(OUT, { recursive: true });
  const stand = Math.max(statSync(CONTENT).mtimeMs, statSync(SELF).mtimeMs);
  const soll = new Set();
  let neu = 0;
  for (const [key, s] of Object.entries(c.art.sprites)) {
    if (s.shadow === 'bild') continue;
    if (s.shadow !== 'kontakt' && s.shadow !== 'fleck') throw new Error(`art.sprites.${key}.shadow ungültig: ${s.shadow}`);
    const size = c.sizes[s.size];
    if (!size || !(size.heightTiles > 0)) throw new Error(`art.sprites.${key}: Größe ${s.size} fehlt`);
    const name = `${key}_schatten.png`;
    soll.add(name);
    const out = join(OUT, name);
    if (existsSync(out) && statSync(out).mtimeMs > Math.max(stand, statSync(join(SRC, s.file)).mtimeMs)) continue;
    await backe(s.file, size.heightTiles, s.shadow, out, size.w ?? 1, size.h ?? 1);
    neu++;
  }
  for (const f of readdirSync(OUT)) if (!soll.has(f)) rmSync(join(OUT, f));   // verwaiste Schatten weg
  console.log(`Schatten: ${neu} neu, ${soll.size} gesamt, ${Math.round(performance.now() - t0)} ms`);
}

await main();
