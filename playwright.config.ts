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
    command: `node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/neu.html`,
    reuseExistingServer: false,
    timeout: 60_000
  }
});
