// ============================================================================
// Kamera-Rahmen aus den Kartendaten (Baustein 4, Entscheidung 22)
// Grenzen = Tal + Kulissenstreifen (Rechteck wie Hay Day/Clash, Ecken füllt ab Baustein 5 die Wildnis), ganz raus = ganzes Tal mit Luft, Start = Hofplatz in der Mitte, ganzer Start-Hof sichtbar.
// ============================================================================
import type { TerrainMap } from '../../core';
import { gridAreaBounds, gridToWorld, TILE_H, TILE_W, type Point, type Rect } from '../scene/iso';
import type { CameraConfig } from './camera';

/** Kulissenstreifen um das Tal (Welt): seitlich 2 Kacheln, hinten mehr Berge, vorn 2 Kachelhöhen */
export const MARGIN = { side: 2 * TILE_W, back: 4 * TILE_H, front: 2 * TILE_H } as const;
/** Start-Ansicht: Start-Hof füllt den Bildschirm zu diesem Anteil */
const START_FILL = 0.92;

/** Umrahmung des Tals (alle Landstücke), Welt */
export function valleyRect(map: TerrainMap): Rect {
  const xs = map.plots.map((p) => [p.x0, p.x1]).flat(), ys = map.plots.map((p) => [p.y0, p.y1]).flat();
  return gridAreaBounds(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
}

export function cameraConfig(map: TerrainMap): CameraConfig {
  const v = valleyRect(map);
  const bounds = { x0: v.x0 - MARGIN.side, x1: v.x1 + MARGIN.side, y0: v.y0 - MARGIN.back, y1: v.y1 + MARGIN.front };
  // Ganz raus passt der ganze Rahmen (Tal + Kulissenstreifen) drauf, nicht nur das Tal: sonst passt das Tal nur in
  // genau einer Lage und die Spitzen werden beim Verschieben angeschnitten (Hannes 24.11., wie Hay Day/Clash mit Luft)
  return { fit: bounds, bounds };
}

/** Mitte des Hofplatzes (Welt) */
export function plazaCenter(map: TerrainMap): Point {
  const plaza = map.tiles.filter((t) => t.surface === 'plaza');
  if (plaza.length === 0) throw new Error('Karte ohne Hofplatz');
  const gx = plaza.reduce((s, t) => s + t.gx + 0.5, 0) / plaza.length;
  const gy = plaza.reduce((s, t) => s + t.gy + 0.5, 0) / plaza.length;
  return gridToWorld(gx, gy);
}

/** Umrahmung des Start-Hofs (Welt) */
export function startLand(map: TerrainMap): Rect {
  const start = map.plots.filter((p) => p.isStart);
  if (start.length === 0) throw new Error('Karte ohne Start-Hof');
  return gridAreaBounds(Math.min(...start.map((p) => p.x0)), Math.min(...start.map((p) => p.y0)),
    Math.max(...start.map((p) => p.x1)), Math.max(...start.map((p) => p.y1)));
}

/**
 * Start-Ansicht (Hannes 24.11.): Start-Hof mittig und bildfüllend, der Hofplatz liegt dabei sichtbar vorn im Bild.
 * Jeder Start gleich (wie Hay Day/Clash). Die Kamera begrenzt danach selbst.
 */
export function startView(map: TerrainMap, vw: number, vh: number): { cx: number; cy: number; zoom: number } {
  const r = startLand(map);
  const zoom = Math.min(vw / (r.x1 - r.x0), vh / (r.y1 - r.y0)) * START_FILL;
  return { cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2, zoom };
}
