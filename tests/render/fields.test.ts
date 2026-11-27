import { describe, expect, test } from 'vitest';
import { CONTENT, type FieldObject, type MapObject } from '../../src/core';
import {
  cropTextureKey, fieldAtGrid, fieldAtWorld, fieldCropDepth, fieldsAlongSegment
} from '../../src/render/scene/fields';
import { gridToWorld } from '../../src/render/scene/iso';
import { placement } from '../../src/render/scene/objects';

const mkField = (id: string, gx: number, gy: number, crop: string | null = 'wheat'): FieldObject => ({
  id, kind: 'field', type: 'field', gx, gy, crop, plantedAt: 0
});

describe('Felder (Baustein 9, Entscheidung 69)', () => {
  const startFields: MapObject[] = [
    mkField('f_1', 2, 5, 'wheat'),
    mkField('f_2', 4, 5, 'wheat'),
    mkField('f_3', 2, 7, null),
    mkField('f_4', 4, 7, 'berries')
  ];

  test('fieldAtGrid und fieldAtWorld treffen exakte 2×2-Felder und hohe Pflanzen-Spitzen', () => {
    expect(fieldAtGrid(startFields, 2.5, 5.5)?.id).toBe('f_1');
    expect(fieldAtGrid(startFields, 4.1, 7.9)?.id).toBe('f_4');
    expect(fieldAtGrid(startFields, 1.9, 5.5)).toBeNull();

    const mid = gridToWorld(3, 6);
    expect(fieldAtWorld(startFields, mid.x, mid.y)?.id).toBe('f_1');

    // Knapp über der oberen Rautenkante eines bepflanzten Felds greift die Pflanzen-Toleranz
    const topEdge = gridToWorld(2.2, 5.05);
    expect(fieldAtWorld(startFields, topEdge.x, topEdge.y - 12)?.id).toBe('f_1');
  });

  test('fieldsAlongSegment überspringt beim schnellen Wischen kein Feld und liefert keine Duplikate', () => {
    const a = gridToWorld(2.5, 5.5);
    const b = gridToWorld(5.5, 8.5);
    const hits = fieldsAlongSegment(startFields, a, b, 20);
    expect(hits.map((f) => f.id)).toEqual(['f_1', 'f_4']);

    const horizA = gridToWorld(2.5, 5.5);
    const horizB = gridToWorld(5.5, 5.5);
    expect(fieldsAlongSegment(startFields, horizA, horizB, 20).map((f) => f.id)).toEqual(['f_1', 'f_2']);
  });

  test('Tiefensortierung: Bäckerei hinter Feldern, Wunschtafel davor', () => {
    const bakery = placement({ type: 'bakery', gx: 1, gy: 2 }).depth;
    const feld = fieldCropDepth(mkField('f_1', 2, 5));
    const board = placement({ type: 'wishlistBoard', gx: 6, gy: 8 }).depth;
    expect(feld).toBeGreaterThan(bakery);
    expect(board).toBeGreaterThan(feld);
  });

  test('Alle 10 Feldfrüchte × 4 Stufen liefern gültige Atlas-Schlüssel', () => {
    for (const cropId of CONTENT.cropIds) {
      expect(cropTextureKey(cropId, 0)).toBe('feld_keim');
      expect(cropTextureKey(cropId, 1)).toBe(`feld_${cropId}_1`);
      expect(cropTextureKey(cropId, 2)).toBe(`feld_${cropId}_2`);
      expect(cropTextureKey(cropId, 3)).toBe(`feld_${cropId}_3`);
    }
  });
});
