// Technik-Gerüst (Baustein 3): Start ohne Fehler, Ebenen in fester Reihenfolge, Ladebild, Hochkant-Pause, Tempo.
import { expect, test, type Page } from '@playwright/test';

/** Sammelt Konsolenfehler und Abstürze der Seite. */
function collectErrors(page: Page): string[] {
  const fehler: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(e.message));
  return fehler;
}

test('startet sauber, Ebenen in fester Reihenfolge, Start unter 3 s', async ({ page }) => {
  const fehler = collectErrors(page);
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');
  // GRAFIK_TECHNIK §3: hinten → vorn
  await expect(root).toHaveAttribute('data-ebenen', 'grund,bodenzeichnung,standflaechen,kontaktschatten,objekte,effekte,auswahl');
  expect(Number(await root.getAttribute('data-inhalte'))).toBeGreaterThan(0);
  expect(Number(await root.getAttribute('data-startms'))).toBeLessThan(3000);
  await expect(page.locator('#laden')).toHaveCount(0);                 // Ladebild ist weg
  await expect(page.locator('#hochkant')).toBeHidden();
  await expect(root).toHaveAttribute('data-kamera', 'idle');
  await expect(page).toHaveScreenshot('b05-start.png');   // Start-Ansicht mit Hilfsraster auf der Wiese (Baustein 5)
  expect(fehler).toEqual([]);
});

/** Ziehen per Touch (Handy) bzw. Maus (Desktop) über die Spielfläche */
async function ziehen(page: Page, touch: boolean, from: [number, number], to: [number, number], schritte: number, haltenMs = 0): Promise<void> {
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    const t = (type: string, p: [number, number][]): Promise<unknown> => cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: p.map(([x, y], id) => ({ x, y, id })) });
    await t('touchStart', [from]);
    for (let i = 1; i <= schritte; i++) await t('touchMove', [[from[0] + ((to[0] - from[0]) * i) / schritte, from[1] + ((to[1] - from[1]) * i) / schritte]]);
    if (haltenMs) await page.waitForTimeout(haltenMs);
    await t('touchEnd', []);
    await cdp.detach();
  } else {
    await page.mouse.move(from[0], from[1]);
    await page.mouse.down();
    await page.mouse.move(to[0], to[1], { steps: schritte });
    if (haltenMs) await page.waitForTimeout(haltenMs);
    await page.mouse.up();
  }
}

test('Kamera: Wischen verschiebt, kommt zur Ruhe; Hilfsraster mit G aus- und einblendbar', async ({ page }, info) => {
  const fehler = collectErrors(page);
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');
  const vorher = await page.screenshot();
  await ziehen(page, info.project.name === 'handy-quer', [500, 200], [300, 220], 10, 150);
  await expect(root).toHaveAttribute('data-kamera', 'idle');
  expect((await page.screenshot()).equals(vorher)).toBe(false);          // Bild hat sich bewegt
  await expect(root).toHaveAttribute('data-raster', '1');
  await page.keyboard.press('g');
  await expect(root).toHaveAttribute('data-raster', '0');
  await page.keyboard.press('g');
  await expect(root).toHaveAttribute('data-raster', '1');
  expect(fehler).toEqual([]);
});

test('Kamera: über den Rand gezogen federt sie zurück in die Grenzen', async ({ page }, info) => {
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');
  const touch = info.project.name === 'handy-quer';
  // Mehrmals weit nach rechts ziehen: Kamera läuft an den linken Rand und darüber hinaus (Gummi)
  for (let i = 0; i < 6; i++) await ziehen(page, touch, [100, 200], [700, 200], 12, 120);
  await expect(root).toHaveAttribute('data-kamera', 'idle');
  const amRand = await page.screenshot();
  await ziehen(page, touch, [100, 200], [700, 200], 12, 120);     // weiter ziehen ändert nach dem Zurückfedern nichts
  await expect(root).toHaveAttribute('data-kamera', 'idle');
  expect((await page.screenshot()).equals(amRand)).toBe(true);
});

test('Bildschärfe: Retina-Handy und Desktop 1280 (zoomt bis 1,25 : 1, Baustein 4) laden @2x', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');
  const wanted = '2';
  await expect(root).toHaveAttribute('data-aufloesung', wanted);
  const atlas = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('/assets/gen/spiel/')));
  expect(atlas.length).toBeGreaterThan(0);
  for (const url of atlas) expect(url.includes('@2x'), url).toBe(wanted === '2');
  // WebP bevorzugt: Pixi wählt den WebP-Atlas (das Bild selbst lädt Pixi im Worker, daher hier die Atlas-Beschreibung)
  expect(atlas.some((u) => u.endsWith('.webp.json'))).toBe(true);
  expect(atlas.some((u) => u.endsWith('.png.json'))).toBe(false);
});

test('Ladebild: Motiv, Schriftzug, Tipp und Balken', async ({ page }) => {
  // Manifest zurückhalten, damit das Ladebild stehen bleibt (ohne Sonderweg im Spiel-Code)
  let release: () => void = () => undefined;
  const held = new Promise<void>((r) => { release = r; });
  await page.route('**/assets/gen/manifest.json', async (route) => { await held; await route.continue(); });
  await page.goto('/');
  await expect(page.locator('#laden')).toHaveClass(/bereit/);
  await expect(page.locator('#laden-tipp')).not.toHaveText('');
  await expect(page.locator('#laden-logo')).toHaveText('Winterhof');
  await expect(page).toHaveScreenshot('b03-ladebild.png');
  release();
  await expect(page.locator('#neu-root')).toHaveAttribute('data-bereit', '1');
});

test('Ladebild erscheint als Ganzes: nie Schriftzug oder Tipp vor dem Motiv', async ({ page }) => {
  // Motiv zurückhalten (langsames Netz): bis dahin nur die Grundfarbe, Schriftzug/Tipp/Balken unsichtbar
  let release: () => void = () => undefined;
  const held = new Promise<void>((r) => { release = r; });
  await page.route('**/splash_art*.webp', async (route) => { await held; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  const laden = page.locator('#laden');
  await expect(laden).toBeAttached();
  await page.waitForTimeout(600);
  await expect(laden).not.toHaveClass(/bereit/);
  const opacity = (sel: string): Promise<string> => page.locator(sel).evaluate((e) => getComputedStyle(e).opacity);
  expect(await opacity('#laden-inhalt')).toBe('0');
  expect(Number(await opacity('#laden-bild'))).toBeLessThanOrEqual(0.01);   // unsichtbar vorgezeichnet
  // Statt leerer Fläche steht sofort die Mini-Vorschau des Motivs (steckt im HTML, kein eigener Ladevorgang)
  const vorschau = await laden.evaluate((e) => getComputedStyle(e, '::before').backgroundImage);
  expect(vorschau).toContain('data:image/webp;base64,');
  // Tipp steht schon vor dem Einblenden fest (kommt aus dem HTML, nicht erst mit dem Spiel-Skript)
  await expect(page.locator('#laden-tipp')).not.toHaveText('');
  release();
  await expect(laden).toHaveClass(/bereit/);
  await expect.poll(() => opacity('#laden-inhalt')).toBe('1');
  expect(await opacity('#laden-bild')).toBe('1');
  await expect(page.locator('#neu-root')).toHaveAttribute('data-bereit', '1');
});

test('Hochkant: Hinweis „quer halten“ und Spiel pausiert', async ({ page }, info) => {
  const fehler = collectErrors(page);
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');
  await expect(root).toHaveAttribute('data-pausiert', '0');
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: Math.min(size.width, size.height), height: Math.max(size.width, size.height) });
  await expect(page.locator('#hochkant')).toBeVisible();
  await expect(root).toHaveAttribute('data-pausiert', '1');
  if (info.project.name === 'handy-quer') await expect(page).toHaveScreenshot('b03-hochkant.png');
  await page.setViewportSize(size);
  await expect(page.locator('#hochkant')).toBeHidden();
  await expect(root).toHaveAttribute('data-pausiert', '0');
  expect(fehler).toEqual([]);
});

test('Tempo: mindestens 55 Bilder pro Sekunde', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#neu-root')).toHaveAttribute('data-bereit', '1');
  const fps = await page.evaluate(() => new Promise<number>((resolve) => {
    let frames = 0;
    const t0 = performance.now();
    const step = (t: number): void => {
      frames++;
      if (t - t0 >= 2000) resolve((frames * 1000) / (t - t0)); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
  expect(fps).toBeGreaterThanOrEqual(55);
});
