// ============================================================================
// Bilder laden nur über das Manifest der Bild-Pipeline (GRAFIK_TECHNIK §6), nie über Dateipfade.
// Manifest + Atlanten erzeugt AssetPack aus art_src/ nach assets/gen/ (npm run assets).
// ============================================================================
import { Assets } from 'pixi.js';
import type { Quality } from './quality';

declare const __WINTERHOF_BUILD__: string;

export const ASSET_BASE = 'assets/gen/';

/** Bündel, die vor dem ersten Bild geladen sein müssen (Ordner mit {m} in art_src). */
export const START_BUNDLES = ['spiel'] as const;

export async function loadStartAssets(q: Quality, onProgress: (p: number) => void): Promise<void> {
  await Assets.init({
    basePath: ASSET_BASE,
    manifest: `manifest.json?v=${__WINTERHOF_BUILD__}`,   // Pfad gilt relativ zu basePath; ?v = Stand (kein alter Zwischenspeicher)
    texturePreference: { resolution: q, format: ['webp', 'png'] }
  });
  await Assets.loadBundle([...START_BUNDLES], onProgress);
}
