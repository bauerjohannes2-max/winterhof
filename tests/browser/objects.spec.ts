// Alle Gebäude, Gehege, Dekos, Hindernisse & Tiefensortierung (Baustein 10)
import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const fehler: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(e.message));
  return fehler;
}

test('Schau-Hof mit allen Gebäuden (inkl. wrapped), Gehegen, Dekos, Hindernissen und Vorn/Hinten-Cluster lädt fehlerfrei', async ({ page }) => {
  const fehler = collectErrors(page);
  await page.goto('/');
  const root = page.locator('#neu-root');
  await expect(root).toHaveAttribute('data-bereit', '1');

  // Erweiterten v10-Teststand mit sämtlichen Objekt-Typen + engem Tiefen-Cluster in localStorage schreiben
  await page.evaluate(() => {
    const raw = localStorage.getItem('winterhof_save_v8');
    if (!raw) throw new Error('Kein v10-Save im localStorage');
    const s = JSON.parse(raw);
    const allPlots: string[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) allPlots.push(`${c},${r}`);
    s.ownedPlots = allPlots;
    s.level = 15;

    const mkStation = (id: string, type: string, gx: number, gy: number, wrapped = false) => ({
      id, kind: 'station', type, gx, gy, wrapped, queue: [], ready: [], craftedCount: 0
    });
    const mkPen = (id: string, type: string, gx: number, gy: number) => ({
      id, kind: 'pen', type, gx, gy, animals: []
    });
    const mkDeco = (id: string, type: string, gx: number, gy: number) => ({
      id, kind: 'deco', type, gx, gy
    });
    const mkObs = (id: string, type: string, gx: number, gy: number) => ({
      id, kind: 'obstacle', type, gx, gy
    });

    // Bestehende Start-Objekte behalten und um alle übrigen Typen + Tiefen-Härtetest erweitern
    const base = (s.objects as Array<{ id: string; kind: string }>).filter((o) => o.kind !== 'obstacle');
    s.objects = [
      ...base,
      // Vorn/Hinten-Cluster direkt vor dem 3×3-Chalet (1..4, 1..4) und hinter dem Baum
      mkDeco('t_laterne_vorn_l', 'lantern', 2, 4),
      mkDeco('t_nuss_vorn_r', 'big_nutcracker', 4, 2),
      mkDeco('t_bank_hinten', 'bench', 1, 0),
      mkDeco('t_tor_vorn', 'gingerbread_gate', 5, 0),
      // Alle weiteren Werkstätten (toy_workshop verpackt mit Schleife!)
      mkStation('t_tea', 'teahouse', -4, 4, false),
      mkStation('t_pat', 'patisserie', -4, 7, false),
      mkStation('t_gift', 'gift_workshop', -7, 4, false),
      mkStation('t_apple', 'apple_stand', -7, 7, false),
      mkStation('t_almond', 'almond_hut', -10, 4, false),
      mkStation('t_wreath', 'wreath_shop', -10, 7, false),
      mkStation('t_post', 'wichtel_post', -4, 1, false),
      mkStation('t_toy', 'toy_workshop', -7, 1, true),
      // Alle weiteren Gehege (inkl. 1×1-Deko direkt vor der 4×4-Schafweide)
      mkPen('t_owl', 'owl_pen', -4, -4),
      mkPen('t_sheep', 'sheep_pen', 0, -5),
      mkDeco('t_ren_vor_schaf', 'light_reindeer', 1, -1),
      mkPen('t_reindeer', 'reindeer_pen', 5, -5),
      mkPen('t_donkey', 'donkey_pen', -9, -5),
      // Alle übrigen stehenden Dekos
      mkDeco('t_pine', 'pine', -1, 4),
      mkDeco('t_pine_l', 'pine_large', -1, 1),
      mkDeco('t_giftpile', 'giftpile', 3, 4),
      mkDeco('t_arch', 'lightarch', 5, 2),
      // Alle 7 Hindernis-Typen
      mkObs('t_obs_ds', 'drift_small', -12, 1),
      mkObs('t_obs_dl', 'drift_large', -12, 3),
      mkObs('t_obs_rs', 'rock_small', -12, 6),
      mkObs('t_obs_rl', 'rock_large', -12, 8),
      mkObs('t_obs_is', 'ice_small', -12, 11),
      mkObs('t_obs_il', 'ice_large', -12, 13),
      mkObs('t_obs_ps', 'pine_small', -10, 1)
    ];
    localStorage.setItem('winterhof_save_v8', JSON.stringify(s));
  });

  await page.reload();
  await expect(root).toHaveAttribute('data-bereit', '1');
  const startms = Number(await root.getAttribute('data-startms'));
  expect(startms).toBeLessThan(3000);
  expect(fehler).toEqual([]);
});
