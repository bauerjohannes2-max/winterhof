// ============================================================================
// Winterhof Core – Wegflächen (Baustein 6, Entscheidungen 53/54)
// Zufahrt + Hofplatz (Karte, Belag paths.road) und Wegplatten des Spielers (Deko mit group 'path')
// ergeben EINE Fläche: je Kachel genau ein Belag. Die Darstellung (runde Ecken, Kante) macht der Boden-Shader.
// Kein DOM, keine Grafik.
// ============================================================================
import { CONTENT, type ContentPack } from './content';
import type { MapObject } from './types';

/** Belag je Kachel, Schlüssel "gx,gy" */
export type PathTiles = ReadonlyMap<string, string>;

export const tileKey = (gx: number, gy: number): string => `${gx},${gy}`;

/** Kacheln der festen Zufahrt und des Hofplatzes (map.surface 'road' / 'plaza'). */
export function roadTiles(c: ContentPack = CONTENT): Map<string, string> {
  const m = c.map, out = new Map<string, string>();
  m.surface.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const kind = m.legend.surface[row[x]!];
      if (kind === 'road' || kind === 'plaza') out.set(tileKey(m.origin.gx + x, m.origin.gy + y), c.paths.road);
    }
  });
  return out;
}

/** Alle Wegkacheln: Zufahrt/Hofplatz plus gelegte Wegplatten (Platte schlägt Zufahrt nicht: Zufahrt ist fest). */
export function pathTiles(objects: readonly MapObject[], c: ContentPack = CONTENT): Map<string, string> {
  const out = roadTiles(c);
  for (const o of objects) {
    if (o.kind !== 'deco') continue;
    const d = c.decorations[o.type];
    if (d?.group !== 'path' || !d.surface) continue;
    const k = tileKey(o.gx, o.gy);
    if (!out.has(k)) out.set(k, d.surface);
  }
  return out;
}
