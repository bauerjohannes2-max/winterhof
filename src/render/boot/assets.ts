// ============================================================================
// Bilder laden nur über das Manifest der Bild-Pipeline (GRAFIK_TECHNIK §6), nie über Dateipfade.
// Manifest + Atlanten erzeugt AssetPack aus art_src/ nach assets/gen/ (npm run assets).
// ============================================================================
import { Assets } from 'pixi.js';
import type { Quality } from './quality';

export const ASSET_BASE = 'assets/gen/';

/** Bündel, die vor dem ersten Bild geladen sein müssen (Ordner mit {m} in art_src). */
export const START_BUNDLES = ['spiel'] as const;

export async function loadStartAssets(q: Quality, onProgress: (p: number) => void): Promise<void> {
  await Assets.init({
    basePath: ASSET_BASE,
    manifest: 'manifest.json',   // Pfad gilt relativ zu basePath
    texturePreference: { resolution: q, format: ['webp', 'png'] }
  });
  await Assets.loadBundle([...START_BUNDLES], onProgress);
}
