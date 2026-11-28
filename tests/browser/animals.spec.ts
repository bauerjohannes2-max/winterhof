// Gehege-Tiere in allen 5 Arten & 3 Zuständen inkl. Live-Animation (Baustein 11, Entsch. 74)
import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const fehler: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(e.message));
  return fehler;
}

async function attachGpuBenchmark(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const texBytes = new Map<WebGLTexture | null, number>();
    let frameDraws = 0;
    let lastFrameDraws = 0;
    const stats = {
      drawCalls: (): number => lastFrameDraws || frameDraws,
      texMemMB: (): number => {
        let sum = 0;
        for (const b of texBytes.values()) sum += b;
        return sum / (1024 * 1024);
      }
    };
    (window as unknown as { __gpuBench: typeof stats }).__gpuBench = stats;
    for (const Proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const origClear = Proto.clear;
      Proto.clear = function clear(mask: number): void {
        if (frameDraws > 0) { lastFrameDraws = frameDraws; frameDraws = 0; }
        origClear.call(this, mask);
      };
      const origDrawEl = Proto.drawElements;
      Proto.drawElements = function drawElements(mode: number, count: number, type: number, offset: number): void {
        frameDraws++;
        origDrawEl.call(this, mode, count, type, offset);
      };
      const origDrawArr = Proto.drawArrays;
      Proto.drawArrays = function drawArrays(mode: number, first: number, count: number): void {
        frameDraws++;
        origDrawArr.call(this, mode, first, count);
      };
      const origTex = Proto.texImage2D;
      Proto.texImage2D = function texImage2D(...args: unknown[]): void {
        const last = args[args.length - 1] as { width?: number; height?: number } | null;
        const w = typeof last?.width === 'number' ? last.width : (typeof args[3] === 'number' ? args[3] : 0);
        const h = typeof last?.height === 'number' ? last.height : (typeof args[4] === 'number' ? args[4] : 0);
        if (w > 0 && h > 0) {
          const bound = this.getParameter(this.TEXTURE_BINDING_2D) as WebGLTexture | null;
          texBytes.set(bound, w * h * 4);
        }
        (origTex as (...a: unknown[]) => void).apply(this, args);
      };
      const origDel = Proto.deleteTexture;
      Proto.deleteTexture = function deleteTexture(tex: WebGLTexture | null): void {
        texBytes.delete(tex);
        origDel.call(this, tex);
      };
    }
  });
}

test('Alle 5 Tierarten, alle 3 Zustände, Überdeckung & Live-Bewegung im Budget', async ({ page }) => {
  const fehler = collectErrors(page);
  await attachGpuBenchmark(page);
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');

  // Erweiterten v10-Stand mit allen 5 Gehegen (je 6 Tiere in hungry/producing/ready) und Objekt davor schreiben
  await page.evaluate(() => {
    const raw = localStorage.getItem('winterhof_save_v8');
    if (!raw) throw new Error('Kein v10-Save im localStorage');
    const s = JSON.parse(raw);
    const allPlots: string[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) allPlots.push(`${c},${r}`);
    s.ownedPlots = allPlots;
    s.level = 15;

    const states = ['ready', 'producing', 'hungry', 'ready', 'producing', 'hungry'] as const;
    const mkAnimals = (prefix: string) => states.map((st, idx) => ({
      id: `${prefix}_${idx}`,
      nick: `Tier ${idx + 1}`,
      state: st,
      readyAt: st === 'producing' ? Date.now() + 120_000 : 0,
      lastPet: 0
    }));
    const mkPen = (id: string, type: string, gx: number, gy: number) => ({
      id, kind: 'pen', type, gx, gy, animals: mkAnimals(id)
    });

    const base = (s.objects as Array<{ id: string; kind: string }>).filter(
      (o) => o.kind !== 'obstacle' && o.id !== 'pen_1'
    );
    s.objects = [
      ...base,
      mkPen('pen_1', 'chicken_pen', 7, 4),
      mkPen('t_owl', 'owl_pen', -4, -4),
      mkPen('t_sheep', 'sheep_pen', 0, -5),
      mkPen('t_reindeer', 'reindeer_pen', 5, -5),
      mkPen('t_donkey', 'donkey_pen', -9, -5),
      { id: 't_lantern_front', kind: 'deco', type: 'lantern', gx: 8, gy: 7 }
    ];
    localStorage.setItem('winterhof_save_v8', JSON.stringify(s));
  });

  await page.reload();
  await expect(root).toHaveAttribute('data-bereit', '1');

  const startms = Number(await root.getAttribute('data-startms'));
  expect(startms).toBeLessThan(3000);
  const gpu = await page.evaluate(() => {
    const b = (window as unknown as { __gpuBench: { drawCalls: () => number; texMemMB: () => number } }).__gpuBench;
    return { drawCalls: b.drawCalls(), texMemMB: b.texMemMB() };
  });
  expect(gpu.drawCalls).toBeGreaterThan(0);
  expect(gpu.drawCalls).toBeLessThanOrEqual(60);
  expect(gpu.texMemMB).toBeLessThanOrEqual(96);

  // Prüfen, dass sich die Tiere + Ready-Badges im laufenden Spiel sichtbar bewegen
  const t0 = await page.screenshot();
  await page.waitForTimeout(1200);
  const t1 = await page.screenshot();
  expect(t1.equals(t0)).toBe(false);
  expect(fehler).toEqual([]);
});
