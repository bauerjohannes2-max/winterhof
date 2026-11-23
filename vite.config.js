import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function copyStaticFilesPlugin() {
  const staticEntries = ['assets', 'manifest.json', 'sw.js', '.nojekyll'];
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

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [copyStaticFilesPlugin()],
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
    include: ['tests/core/**/*.test.ts']
  },
  server: {
    host: '127.0.0.1',
    port: 8085
  }
});
