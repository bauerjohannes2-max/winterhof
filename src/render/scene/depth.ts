// ============================================================================
// Exakte topologische Tiefensortierung (Baustein 10, docs/GRAFIK_TECHNIK.md §3)
// Guibas-Yao-Ordnung (DAG) auf disjunkten Grundflächen [x0..x1) × [y0..y1)
// in isometrischer 2:1-Projektion. Behebt den Fehler der alten Formel (gx+gy+w+h),
// bei der kleine Objekte (1×1) vor größeren Gebäuden (3×3, 4×4) dahinter lagen.
// Reines Rechenmodul ohne Pixi/DOM – bereit auch für bewegte Figuren in Baustein 11.
// ============================================================================
import { CONTENT, footprintOf, type MapObject } from '../../core';

export interface DepthBox {
  readonly id: string;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

const SIZES = CONTENT.sizes as unknown as Record<string, { heightTiles: number }>;

/**
 * Prüft in isometrischer 2:1-Sicht (+x nach rechts-unten, +y nach links-unten),
 * ob Box `a` streng hinter Box `b` liegt (also vor `b` gezeichnet werden muss).
 */
export function isBehind(a: DepthBox, b: DepthBox): boolean {
  return (a.x1 <= b.x0 && a.y0 < b.y1) || (a.y1 <= b.y0 && a.x0 < b.x1);
}

function tieCompare(a: DepthBox, b: DepthBox): number {
  const ca = a.x0 + a.x1 + a.y0 + a.y1;
  const cb = b.x0 + b.x1 + b.y0 + b.y1;
  if (ca !== cb) return ca - cb;
  const xa = a.x0 + a.x1;
  const xb = b.x0 + b.x1;
  if (xa !== xb) return xa - xb;
  if (a.x0 !== b.x0) return a.x0 - b.x0;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Liefert je Objekt-ID einen deterministischen zIndex (0, 10, 20, ...) in gültiger
 * Malreihenfolge (hinten → vorn), unabhängig von der Eingabereihenfolge.
 */
export function computeDepthOrder(boxes: readonly DepthBox[]): Map<string, number> {
  const n = boxes.length;
  const result = new Map<string, number>();
  if (n === 0) return result;

  // Vorsortierung nach Gleichstandsschlüssel sorgt für stabile, eingabe-unabhängige Auflösung
  const sorted = [...boxes].sort(tieCompare);
  const adj: number[][] = Array.from({ length: n }, () => []);
  const indeg = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    const a = sorted[i];
    if (!a) continue;
    for (let j = i + 1; j < n; j++) {
      const b = sorted[j];
      if (!b) continue;
      if (isBehind(a, b)) {
        adj[i]?.push(j);
        indeg[j] = (indeg[j] ?? 0) + 1;
      } else if (isBehind(b, a)) {
        adj[j]?.push(i);
        indeg[i] = (indeg[i] ?? 0) + 1;
      }
    }
  }

  // Kahn-Sort mit kleinstem Gleichstands-Index zuerst (da `sorted` bereits nach tieCompare sortiert ist)
  const ready: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);

  const visited = new Uint8Array(n);
  let rank = 0;

  while (ready.length > 0) {
    let minPos = 0;
    for (let k = 1; k < ready.length; k++) {
      if ((ready[k] ?? 0) < (ready[minPos] ?? 0)) minPos = k;
    }
    const u = ready.splice(minPos, 1)[0];
    if (u === undefined) continue;
    visited[u] = 1;
    const node = sorted[u];
    if (node) {
      result.set(node.id, rank * 10);
      rank++;
    }
    for (const v of adj[u] ?? []) {
      const next = (indeg[v] ?? 0) - 1;
      indeg[v] = next;
      if (next === 0) ready.push(v);
    }
  }

  // Sicherheits-Fallback bei hypothetischer Überlappung zweier Boxen
  if (rank < n) {
    for (let i = 0; i < n; i++) {
      if (!visited[i]) {
        const node = sorted[i];
        if (node) {
          result.set(node.id, rank * 10);
          rank++;
        }
      }
    }
  }

  return result;
}

/** Erzeugt DepthBoxen für alle stehenden Objekte einer Karte (inkl. Felder, ohne flache Wegplatten). */
export function boxesForObjects(objects: readonly MapObject[]): DepthBox[] {
  const out: DepthBox[] = [];
  for (const obj of objects) {
    const sz = SIZES[obj.type];
    if (obj.kind !== 'field' && !(sz && sz.heightTiles > 0)) continue;
    const fp = footprintOf(obj);
    out.push({ id: obj.id, x0: obj.gx, y0: obj.gy, x1: obj.gx + fp.w, y1: obj.gy + fp.h });
  }
  return out;
}
