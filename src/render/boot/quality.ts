// ============================================================================
// Bildschärfe automatisch je Handy (Baustein 3, Entscheidung 19)
// Scharf = Atlanten @2x und Zeichenauflösung bis 2; leicht = @1x.
// Reine Entscheidung ohne Browser-Zugriff, damit sie getestet werden kann.
// ============================================================================

export type Quality = 1 | 2;

export interface DeviceInfo {
  /** window.devicePixelRatio */
  dpr: number;
  /** navigator.hardwareConcurrency (fehlt in manchen Browsern) */
  cores?: number;
  /** navigator.deviceMemory in GB (nur Chrome/Samsung Internet) */
  memoryGb?: number;
  /** größte Textur, die die Grafikkarte kann (WebGL MAX_TEXTURE_SIZE) */
  maxTextureSize: number;
  /** beim letzten Start zu langsam gewesen (siehe FPS-Wächter in main.ts) */
  slowBefore: boolean;
}

/** Größte Atlas-Seite der Bild-Pipeline (.assetpack.js maximumTextureSize). Kann die Grafikkarte das nicht, nur @1x. */
export const ATLAS_MAX = 2048;

/** Unter diesem Wert (Bilder pro Sekunde, Mittel der ersten Sekunden) gilt das Gerät als zu langsam für @2x. */
export const SLOW_FPS = 45;

export function chooseQuality(d: DeviceInfo): Quality {
  if (d.slowBefore) return 1;
  if (d.dpr < 1.5) return 1;                                  // kein Retina-Bildschirm: @2x bringt nichts
  if (d.maxTextureSize < ATLAS_MAX * 2) return 1;            // schwache Grafik
  if (d.memoryGb !== undefined && d.memoryGb < 3) return 1;  // wenig Speicher (Texturspeicher-Budget GRAFIK_TECHNIK §7)
  if (d.cores !== undefined && d.cores < 4) return 1;
  return 2;
}

/** Zeichenauflösung: nie mehr als der Bildschirm kann, höchstens 2 (3er-Bildschirme kosten viel Leistung, Unterschied kaum sichtbar). */
export function renderResolution(q: Quality, dpr: number): number {
  return Math.max(1, Math.min(dpr, q === 2 ? 2 : 1.5));
}
