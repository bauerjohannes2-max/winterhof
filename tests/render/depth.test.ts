import { describe, expect, test } from 'vitest';
import { createNewGame } from '../../src/core';
import { boxesForObjects, computeDepthOrder, isBehind, type DepthBox } from '../../src/render/scene/depth';

describe('Topologische Tiefensortierung (Baustein 10, GRAFIK_TECHNIK §3)', () => {
  test('1×1-Objekte vor einem 3×3-Chalet oder 4×4-Gehege liegen immer davor', () => {
    const chalet: DepthBox = { id: 'chalet', x0: 1, y0: 1, x1: 4, y1: 4 };
    const vorLinks: DepthBox = { id: 'laterne_links', x0: 2, y0: 4, x1: 3, y1: 5 };
    const vorRechts: DepthBox = { id: 'laterne_rechts', x0: 4, y0: 2, x1: 5, y1: 3 };
    const hinterLinks: DepthBox = { id: 'baum_hinten_l', x0: 0, y0: 2, x1: 1, y1: 3 };
    const hinterRechts: DepthBox = { id: 'baum_hinten_r', x0: 2, y0: 0, x1: 3, y1: 1 };

    const order = computeDepthOrder([vorLinks, vorRechts, chalet, hinterLinks, hinterRechts]);
    expect(order.get('baum_hinten_l')!).toBeLessThan(order.get('chalet')!);
    expect(order.get('baum_hinten_r')!).toBeLessThan(order.get('chalet')!);
    expect(order.get('laterne_links')!).toBeGreaterThan(order.get('chalet')!);
    expect(order.get('laterne_rechts')!).toBeGreaterThan(order.get('chalet')!);

    // 4×4-Gehege mit kleinem Objekt und 2×2-Gebäude davor
    const weide: DepthBox = { id: 'weide', x0: 0, y0: 0, x1: 4, y1: 4 };
    const zwerg: DepthBox = { id: 'zwerg', x0: 0, y0: 4, x1: 1, y1: 5 };
    const baecker: DepthBox = { id: 'baecker', x0: -1, y0: 4, x1: 1, y1: 6 };
    const penOrder = computeDepthOrder([zwerg, weide, baecker]);
    expect(penOrder.get('zwerg')!).toBeGreaterThan(penOrder.get('weide')!);
    expect(penOrder.get('baecker')!).toBeGreaterThan(penOrder.get('weide')!);
  });

  test('versetzte 2×1-Objekte und gemischte Größen sortieren exakt nach isBehind', () => {
    const hinten: DepthBox = { id: 'bank_hinten', x0: 1, y0: 0, x1: 3, y1: 1 };
    const vorn: DepthBox = { id: 'bogen_vorn', x0: 0, y0: 1, x1: 2, y1: 2 };
    expect(isBehind(hinten, vorn)).toBe(true);
    expect(isBehind(vorn, hinten)).toBe(false);
    const order = computeDepthOrder([vorn, hinten]);
    expect(order.get('bank_hinten')!).toBeLessThan(order.get('bogen_vorn')!);
  });

  test('Ergebnis ist unabhängig von der Eingabereihenfolge deterministisch', () => {
    const boxes: DepthBox[] = [
      { id: 'chalet', x0: 1, y0: 1, x1: 4, y1: 4 },
      { id: 'f1', x0: 2, y0: 5, x1: 4, y1: 7 },
      { id: 'board', x0: 6, y0: 8, x1: 8, y1: 9 },
      { id: 'laterne', x0: 4, y0: 3, x1: 5, y1: 4 },
      { id: 'baum', x0: 6, y0: 1, x1: 8, y1: 3 }
    ];
    const ref = computeDepthOrder(boxes);
    const rev = computeDepthOrder([...boxes].reverse());
    const rotated = computeDepthOrder([boxes[2]!, boxes[4]!, boxes[0]!, boxes[3]!, boxes[1]!]);
    for (const b of boxes) {
      expect(rev.get(b.id)).toBe(ref.get(b.id));
      expect(rotated.get(b.id)).toBe(ref.get(b.id));
    }
  });

  test('kompletter Start-Hof inkl. aller Hindernisse hat 0 Tiefen-Verstöße', () => {
    const state = createNewGame(0);
    const boxes = boxesForObjects(state.objects);
    expect(boxes.length).toBeGreaterThan(150);
    const order = computeDepthOrder(boxes);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (isBehind(a, b)) expect(order.get(a.id)!, `${a.id} < ${b.id}`).toBeLessThan(order.get(b.id)!);
        if (isBehind(b, a)) expect(order.get(b.id)!, `${b.id} < ${a.id}`).toBeLessThan(order.get(a.id)!);
      }
    }
  });
});
