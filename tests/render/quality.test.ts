// Bildschärfe automatisch je Handy (Baustein 3, Entscheidung 19)
import { describe, expect, it } from 'vitest';
import { ATLAS_MAX, chooseQuality, renderResolution, type DeviceInfo } from '../../src/render/boot/quality';

const strong: DeviceInfo = { dpr: 3, cores: 8, memoryGb: 6, maxTextureSize: 8192, slowBefore: false };

describe('Bildschärfe', () => {
  it('starkes Retina-Handy bekommt @2x', () => expect(chooseQuality(strong)).toBe(2));
  it('ohne Angaben zu Kernen/Speicher (iPhone Safari) entscheidet Bildschirm + Grafik', () =>
    expect(chooseQuality({ dpr: 3, maxTextureSize: 16384, slowBefore: false })).toBe(2));
  it('kein Retina-Bildschirm → @1x', () => expect(chooseQuality({ ...strong, dpr: 1 })).toBe(1));
  it('schwache Grafik → @1x', () => expect(chooseQuality({ ...strong, maxTextureSize: ATLAS_MAX })).toBe(1));
  it('wenig Speicher → @1x', () => expect(chooseQuality({ ...strong, memoryGb: 2 })).toBe(1));
  it('wenige Kerne → @1x', () => expect(chooseQuality({ ...strong, cores: 2 })).toBe(1));
  it('beim letzten Start zu langsam → @1x', () => expect(chooseQuality({ ...strong, slowBefore: true })).toBe(1));
  it('Zeichenauflösung höchstens 2, nie über dem Bildschirm, nie unter 1', () => {
    expect(renderResolution(2, 3)).toBe(2);
    expect(renderResolution(2, 1.25)).toBe(1.25);
    expect(renderResolution(1, 3)).toBe(1.5);
    expect(renderResolution(1, 0.8)).toBe(1);
  });
});
