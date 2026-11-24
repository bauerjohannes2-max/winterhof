import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function copyStaticFilesPlugin() {
  const staticEntries = ['assets', 'manifest.json', '.nojekyll'];
  function copyRecursive(src, dst) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        copyRecursive(path.join(src, entry), path.join(dst, entry));
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
      for (const rel of staticEntries) {
        const src = path.join(root, rel);
        if (fs.existsSync(src)) {
          copyRecursive(src, path.join(outDir, rel));
        }
      }
    }
  };
}

/** Setzt die Ladebild-Tipps aus winterhof.json (einzige Datenquelle) ins HTML, damit der Tipp schon beim Einblenden steht. */
function loadingTipsPlugin() {
  return {
    name: 'winterhof-lade-tipps',
    transformIndexHtml(html) {
      const content = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/winterhof.json'), 'utf8'));
      const tips = content.loadingTips;
      if (!Array.isArray(tips) || tips.length === 0) throw new Error('winterhof.json: loadingTips fehlt oder leer');
      if (!html.includes('<!--LADE-TIPPS-->')) throw new Error('index.html: Platzhalter <!--LADE-TIPPS--> fehlt');
      // "<" maskieren, damit kein Tipp das Skript-Element beenden kann
      return html.replace('<!--LADE-TIPPS-->', JSON.stringify(tips).replace(/</g, '\\u003c'));
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [copyStaticFilesPlugin(), loadingTipsPlugin()],
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
