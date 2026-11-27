import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

/** Kopiert aus assets/gen/ nur manifest.json und tatsächlich darin referenzierte Dateien (keine verwaisten AssetPack-Altlasten). */
function copyGeneratedAssets(genSrc, genDst) {
  const manifestPath = path.join(genSrc, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('assets/gen/manifest.json fehlt (vorher npm run assets laufen lassen)');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const needed = new Set(['manifest.json']);
  const queue = [];
  for (const bundle of manifest.bundles ?? []) {
    for (const asset of bundle.assets ?? []) {
      const srcs = Array.isArray(asset.src) ? asset.src : [asset.src];
      for (const rel of srcs) if (typeof rel === 'string') queue.push(rel);
    }
  }
  while (queue.length > 0) {
    const rel = queue.pop();
    if (needed.has(rel)) continue;
    const full = path.join(genSrc, rel);
    if (!fs.existsSync(full)) throw new Error(`Manifest verweist auf fehlende Datei: assets/gen/${rel}`);
    needed.add(rel);
    if (rel.endsWith('.json')) {
      const meta = JSON.parse(fs.readFileSync(full, 'utf8')).meta;
      const dir = path.posix.dirname(rel);
      const joinRel = (name) => (dir === '.' ? name : `${dir}/${name}`);
      if (typeof meta?.image === 'string') queue.push(joinRel(meta.image));
      for (const extra of meta?.related_multi_packs ?? []) {
        if (typeof extra === 'string') queue.push(joinRel(extra));
      }
    }
  }
  for (const rel of needed) {
    const dst = path.join(genDst, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(genSrc, rel), dst);
  }
}

function copyStaticFilesPlugin() {
  const staticEntries = ['assets', 'manifest.json', '.nojekyll'];
  function copyRecursive(src, dst, genDir) {
    if (path.resolve(src) === genDir) {
      copyGeneratedAssets(src, dst);
      return;
    }
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        copyRecursive(path.join(src, entry), path.join(dst, entry), genDir);
      }
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  }
  return {
    name: 'winterhof-copy-static',
    closeBundle() {
      const root = process.cwd();
      const outDir = path.join(root, 'dist');
      const genDir = path.resolve(root, 'assets', 'gen');
      for (const rel of staticEntries) {
        const src = path.join(root, rel);
        if (fs.existsSync(src)) {
          copyRecursive(src, path.join(outDir, rel), genDir);
        }
      }
    }
  };
}

const SPLASH = 'assets/splash_art.webp';
/** Breite der Mini-Vorschau in Bildpunkten (rund 1 KB, steckt direkt im HTML) */
const PREVIEW_WIDTH = 64;

function replaceOnce(html, token, value) {
  if (!html.includes(token)) throw new Error(`index.html: Platzhalter ${token} fehlt`);
  return html.replace(token, () => value);
}

/**
 * Ladebild beim Bauen vorbereiten (alles aus den Quellen, nichts von Hand gepflegt):
 * - Tipps aus winterhof.json (einzige Datenquelle), damit der Tipp schon beim Einblenden steht
 * - Mini-Vorschau des Motivs als Daten-URL: das Motiv ist ab dem ersten Bild da (weich), bis das scharfe Motiv dekodiert ist
 * - Grundfarbe = Mittelwert des Motivs, falls auch die Vorschau fehlt
 */
function loadingScreenPlugin() {
  return {
    name: 'winterhof-ladebild',
    async transformIndexHtml(html) {
      const root = process.cwd();
      const content = JSON.parse(fs.readFileSync(path.join(root, 'src/content/winterhof.json'), 'utf8'));
      const tips = content.loadingTips;
      if (!Array.isArray(tips) || tips.length === 0) throw new Error('winterhof.json: loadingTips fehlt oder leer');
      const { default: sharp } = await import('sharp');
      const src = sharp(path.join(root, SPLASH));
      // schon hier weichzeichnen: im Browser nur noch hochskaliert, ohne CSS-Filter, Ränder bleiben sauber
      const preview = await src.clone().resize({ width: PREVIEW_WIDTH }).blur(1.2).webp({ quality: 50 }).toBuffer();
      const { channels } = await src.clone().stats();
      const hex = channels.slice(0, 3).map((c) => Math.round(c.mean).toString(16).padStart(2, '0')).join('');
      let out = replaceOnce(html, '<!--LADE-TIPPS-->', JSON.stringify(tips).replace(/</g, '\\u003c'));   // "<" maskieren
      out = replaceOnce(out, '__LADE_VORSCHAU__', `data:image/webp;base64,${preview.toString('base64')}`);
      out = replaceOnce(out, '__LADE_GRUNDFARBE__', `#${hex}`);
      return out;
    }
  };
}

export default defineConfig({
  base: './',
  // Stand-Kennung je Bau: hängt am Manifest-Abruf, damit Handys nach einem Update nie die alte Bildliste aus dem
  // Zwischenspeicher nehmen (Bilddateien selbst tragen schon eine Prüfsumme im Namen)
  define: { __WINTERHOF_BUILD__: JSON.stringify(Date.now().toString(36)) },
  publicDir: false,
  plugins: [copyStaticFilesPlugin(), loadingScreenPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js']
        }
      }
    }
  },
  test: {
    include: ['tests/core/**/*.test.ts', 'tests/render/**/*.test.ts']
  },
  server: {
    host: '127.0.0.1',
    port: 8085
  }
});
