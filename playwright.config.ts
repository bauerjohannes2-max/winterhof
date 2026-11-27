// Browser-Tests mit Bildvergleich (Baustein 1, 24.11.2026).
// Nutzt den installierten Chrome (kein Browser-Download). Vergleichsbilder: tests/browser/__bilder__/
import { defineConfig } from '@playwright/test';

const PORT = 8087;

export default defineConfig({
  testDir: 'tests/browser',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__bilder__/{arg}-{projectName}-{platform}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, threshold: 0.02, animations: 'disabled' } },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    headless: true
  },
  projects: [
    { name: 'handy-quer', use: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } }
  ],
  webServer: {
    // Geprüft wird der fertige Build (wie live), nicht der Entwicklungs-Server: realistische Startzeit, erzeugte Atlanten
    command: `node ./scripts/schatten_backen.mjs && node ./node_modules/@assetpack/core/bin/index.js && node ./node_modules/vite/bin/vite.js build && node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
