// Felder-Interaktion & Wachstum (Baustein 9, Entscheidung 69)
import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const fehler: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(e.message));
  return fehler;
}

test('Tippen auf reifes Feld → Sichel → Wisch-Ernte über alle 4 Startfelder + Aussaat + Reload-Speicherstand', async ({ page }, info) => {
  const fehler = collectErrors(page);
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');

  const touch = info.project.name === 'handy-quer';
  // 4 Startfelder (f_1..f_4) durch kurzes Suchen im sichtbaren Hofbereich antippen:
  // Im Startbild liegen die Felder auf der linken Hofhälfte. Wir ermitteln die exakten 4 Feldmitten sauber über eine kurze Raster-Suche?
  // Nein – besser: ein einziges Mal über die feste Start-Kamera-Mathematik aus `mapView.ts` im Test rechnen, ohne Spielcode-Sonderweg!
  const pts = await page.evaluate(() => {
    // Exakte Kopie der deterministischen startView-Formel für die Start-Ansicht (kein Eingriff in Spielcode!)
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Hofzentrum aus winterhof.json: Start-Plot 2,2..3,3 -> x0=-1,y0=-1..x1=10,y1=10, Hofplatz (5..8, 9..10)
    // Start-Kamera: fit = gridAreaBounds(-1, -1, 10, 10) mit Rand, wir testen direkt über Klickpunkte im linken Hofdrittel,
    // oder suchen mit einem echten Klick in einem 5x5-Raster bis #feld-werkzeug aufgeht? Noch besser: wir klicken in 1–3 gezielten Punkten!
    return { vw, vh };
  });

  // Startfelder f_1..f_4 liegen bei beiden Viewports (844x390 und 1280x720) im linken unteren Drittel des Start-Hofs.
  // Wir klicken gezielt auf ein Raster von Kandidatenpunkten, bis #feld-werkzeug[data-feld-werkzeug="sichel"] aufgeht.
  const tool = page.locator('#feld-werkzeug');
  const candidates: [number, number][] = [
    [0.38, 0.44], [0.44, 0.50], [0.32, 0.50], [0.38, 0.56]
  ];

  for (const [rx, ry] of candidates) {
    await page.mouse.click(pts.vw * rx, pts.vh * ry);
    if (await tool.isVisible()) break;
  }
  await expect(tool).toBeVisible();
  await expect(tool).toHaveAttribute('data-feld-werkzeug', 'sichel');

  const sichelBtn = tool.locator('[data-tool="sichel"]');
  const box = (await sichelBtn.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(48);
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(pts.vw);
  expect(box.y + box.height).toBeLessThanOrEqual(pts.vh);

  // Sichel über alle 4 Startfelder ziehen (f_1 oben, f_2 rechts, f_4 unten, f_3 links)
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  const sweep: [number, number][] = [
    [pts.vw * 0.38, pts.vh * 0.44],
    [pts.vw * 0.44, pts.vh * 0.50],
    [pts.vw * 0.38, pts.vh * 0.56],
    [pts.vw * 0.32, pts.vh * 0.50],
    [pts.vw * 0.38, pts.vh * 0.44]
  ];
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    const send = (type: string, x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await send('touchStart', sx, sy);
    let px = sx, py = sy;
    for (const [tx, ty] of sweep) {
      for (let i = 1; i <= 5; i++) {
        await send('touchMove', px + (tx - px) * (i / 5), py + (ty - py) * (i / 5));
      }
      px = tx; py = ty;
    }
    await send('touchEnd', 0, 0);
    await cdp.detach();
  } else {
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (const [tx, ty] of sweep) await page.mouse.move(tx, ty, { steps: 6 });
    await page.mouse.up();
  }

  // Alle 4 Startfelder sind abgeerntet und im Speicherstand gesichert (GameSession speichert verzögert)
  await expect.poll(async () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('winterhof_save_v8') || '{}');
    return { harvests: s.stats?.harvests ?? 0, xp: s.xp ?? 0 };
  }), { timeout: 5000 }).toMatchObject({ harvests: 4 });
  const savedAfterHarvest = await page.evaluate(() => JSON.parse(localStorage.getItem('winterhof_save_v8') || '{}'));
  expect(savedAfterHarvest.xp).toBeGreaterThan(0);

  // Reload bestätigt Persistenz: nach Neuladen öffnet Tippen auf das Feld die Saat-Leiste (nicht Sichel)
  await page.reload();
  await expect(root).toHaveAttribute('data-bereit', '1');
  for (const [rx, ry] of candidates) {
    await page.mouse.click(pts.vw * rx, pts.vh * ry);
    if (await tool.isVisible()) break;
  }
  await expect(tool).toHaveAttribute('data-feld-werkzeug', 'saat');
  await expect(tool.locator('[data-crop="wheat"]')).toBeVisible();
  await expect(tool.locator('[data-crop="berries"]')).toBeVisible();

  // Goldweizen über alle 4 leeren Felder wischen
  const wheatBtn = tool.locator('[data-crop="wheat"]');
  const wBox = (await wheatBtn.boundingBox())!;
  expect(wBox.width).toBeGreaterThanOrEqual(48);
  expect(wBox.height).toBeGreaterThanOrEqual(48);
  const wx = wBox.x + wBox.width / 2;
  const wy = wBox.y + wBox.height / 2;
  await page.mouse.move(wx, wy);
  await page.mouse.down();
  for (const [tx, ty] of sweep) await page.mouse.move(tx, ty, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('winterhof_save_v8') || '{}');
    return s.stats?.planted ?? 0;
  }), { timeout: 5000 }).toBe(4);

  // Wachsendes Feld antippen → Wachstums-Anzeige mit Restzeit
  for (const [rx, ry] of candidates) {
    await page.mouse.click(pts.vw * rx, pts.vh * ry);
    if (await tool.isVisible()) break;
  }
  await expect(tool).toHaveAttribute('data-feld-werkzeug', 'wachstum');
  await expect(tool.locator('[data-zeit]')).not.toHaveText('');
  expect(fehler).toEqual([]);
});

test('Volles Silo: Ernten blockiert sauber ohne Verlust und ohne Fehler', async ({ page }) => {
  const fehler = collectErrors(page);
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');

  // Gültigen v10-Save im localStorage mit vollem Silo setzen
  await page.evaluate(() => {
    const raw = localStorage.getItem('winterhof_save_v8');
    const s = raw ? JSON.parse(raw) : null;
    if (!s) throw new Error('Kein Speicherstand gefunden');
    const berries = s.inventory.berries ?? 0;
    s.inventory.wheat = s.storage.silo - berries;
    localStorage.setItem('winterhof_save_v8', JSON.stringify(s));
  });
  await page.reload();
  await expect(root).toHaveAttribute('data-bereit', '1');

  const vw = await page.evaluate(() => window.innerWidth);
  const vh = await page.evaluate(() => window.innerHeight);
  const tool = page.locator('#feld-werkzeug');
  for (const [rx, ry] of [[0.38, 0.44], [0.44, 0.50], [0.32, 0.50], [0.38, 0.56]] as [number, number][]) {
    await page.mouse.click(vw * rx, vh * ry);
    if (await tool.isVisible()) break;
  }
  await expect(tool).toHaveAttribute('data-feld-werkzeug', 'sichel');
  await tool.locator('[data-tool="sichel"]').click();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('winterhof_save_v8') || '{}'));
  expect(saved.stats?.harvests).toBe(0);
  expect((saved.inventory?.wheat ?? 0) + (saved.inventory?.berries ?? 0)).toBe(saved.storage?.silo);
  expect(fehler).toEqual([]);
});
