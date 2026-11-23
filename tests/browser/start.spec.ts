// Startseite (neue Darstellung): startet ohne Fehler, liest den Kern, sieht aus wie abgenommen.
import { expect, test } from '@playwright/test';

test('Startseite startet sauber und entspricht dem Vergleichsbild', async ({ page }) => {
  const fehler: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(e.message));

  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');
  expect(Number(await root.getAttribute('data-inhalte'))).toBeGreaterThan(0);

  await expect(page).toHaveScreenshot('neu-start.png');
  expect(fehler).toEqual([]);
});
