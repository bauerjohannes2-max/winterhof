// Bild-Pipeline (Baustein 3, docs/GRAFIK_TECHNIK.md §6): Quellbilder in art_src/ → Atlanten + Manifest in assets/gen/.
// Ordner-Tags: {m} = eigenes Bündel im Manifest, {tps} = zu einem Atlas packen.
// Quellbilder gelten als @2x; daraus entsteht zusätzlich @1x. Formate: WebP, PNG als Ersatz.
import { pixiPipes } from '@assetpack/core/pixi';

export default {
  entry: './art_src',
  output: './assets/gen',
  ignore: ['**/probe_raw/**'],
  cache: true,
  pipes: [
    ...pixiPipes({
      cacheBust: true,
      resolutions: { high: 2, default: 1 },
      compression: { png: true, jpg: false, webp: true },
      texturePacker: {
        texturePacker: { nameStyle: 'short', removeFileExtension: true, padding: 2 },
        resolutionOptions: { maximumTextureSize: 2048 }
      },
      manifest: { output: './assets/gen/manifest.json', createShortcuts: true, trimExtensions: true }
    })
  ]
};
