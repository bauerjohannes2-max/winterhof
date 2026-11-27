// ============================================================================
// Schattenbilder backen (Baustein 7, Entscheidung 62, docs/GRAFIK_TECHNIK.md §4)
// Wie Supercell: Schatten wird vorab aus der Bildform gerechnet, im Spiel liegt nur noch ein Sprite darunter.
// Je Objektbild aus winterhof.json → art.sprites (shadow: kontakt | fleck; bild = Bild bringt Schatten mit, nichts backen):
//   kontakt: Bildform leicht nach unten geschoben und eng weichgezeichnet, nur am Fuß des Objekts (Kontaktlinie)
//   fleck:   zusätzlich ein weicher Fleck nach unten rechts (Bäume, Laternen, Tiere)
// Maße als Anteil der Kachelbreite T = Bildhöhe / heightTiles, abgestimmt in scripts/standflaeche_skizze.py Runde 3.
// Ausgabe: art_src/spiel{m}/schatten{tps}/<bild>_schatten.png (weiß, Deckkraft = Schatten; Farbe per Tönung im Spiel).
// Leinwand = Bildleinwand + Rand PAD links, rechts, unten (gleicher Pixelmaßstab) → Bodenpunkt im Spiel exakt.
// Läuft vor AssetPack (scripts/assets.mjs); unveränderte Bilder werden übersprungen.
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

/** Rand der Schatten-Leinwand als Anteil der größeren Bildseite (das Spiel rechnet die Lage aus beiden Bildgrößen, render/scene/objects.ts) */
const PAD = 0.3;
/** Halbe Auflösung wie in GRAFIK_TECHNIK §4: weiche Schatten sehen identisch aus, passen aber auf eine kleine Atlasseite (4× weniger Speicher) */
const SCALE = 0.5;
const K = {
  shift: 0.035,      // Kontakt: Verschiebung nach unten (× T)
  blur: 0.035,       // Kontakt: Weichzeichnung (× T)
  band: 0.35,        // Kontakt: nur die untersten 0,35 T des Objekts werfen Kontakt
  contact: 1.0,      // Kontakt: Stärke
  fleckRight: 0.10,  // Fleck: Mitte rechts vom Bild (× T)
  fleckUp: 0.10,     // Fleck: Mitte über dem Fuß (× Bildbreite)
  fleckRx: 0.50,     // Fleck: Halbachsen (× Bildbreite)
  fleckRy: 0.17,
  fleckBlur: 0.07,   // Fleck: Weichzeichnung (× T)
  fleck: 0.30,       // Fleck: Stärke
  max: 0.65          // höchste Deckkraft
};

async function blur(buf, w, h, sigma) {
  // toColourspace('b-w'): sharp gibt sonst drei Kanäle zurück
  const out = await sharp(buf, { raw: { width: w, height: h, channels: 1 } }).blur(Math.max(0.3, sigma)).toColourspace('b-w').raw().toBuffer();
  if (out.length !== w * h) throw new Error(`Weichzeichner: ${out.length} statt ${w * h} Werte`);
  return out;
}

async function backe(file, heightTiles, mode, out) {
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
  // Fuß (unterste deckende Zeile) und Breite der Bildform
  let foot = 0, x0 = W, x1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[y * W + x] > 127) { foot = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const breite = Math.max(1, x1 - x0);
  // Kontaktlinie
  const dy = Math.round(K.shift * T);
  const p = Buffer.alloc(CW * CH);
  for (let y = 0; y < H && y + dy < CH; y++) data.copy(p, (y + dy) * CW + m, y * W, y * W + W);
  const k = await blur(p, CW, CH, K.blur * T);
  const bandTop = foot - K.band * T;
  const a = new Float32Array(CW * CH);
  for (let y = Math.max(0, Math.floor(bandTop)); y < CH; y++) for (let x = 0; x < CW; x++) a[y * CW + x] = (k[y * CW + x] / 255) * K.contact;
  // Fleck
  if (mode === 'fleck') {
    const cx = m + (x0 + x1) / 2 + K.fleckRight * T, cy = foot - K.fleckUp * breite;
    const rx = K.fleckRx * breite, ry = K.fleckRy * breite;
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
    await backe(s.file, size.heightTiles, s.shadow, out);
    neu++;
  }
  for (const f of readdirSync(OUT)) if (!soll.has(f)) rmSync(join(OUT, f));   // verwaiste Schatten weg
  console.log(`Schatten: ${neu} neu, ${soll.size} gesamt, ${Math.round(performance.now() - t0)} ms`);
}

await main();
