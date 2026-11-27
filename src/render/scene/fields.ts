// ============================================================================
// Felder-Darstellung (Baustein 9, Entscheidung 69)
// - Acker-Erdwulst in Ebene `bodenzeichnung` (ohne Rahmen/Leuchtrand, weicher Bodenschatten)
// - 4 Wachstumsstufen als Furchen-Büschel in Ebene `objekte` (gemeinsame Tiefensortierung mit Gebäuden)
// - Sanftes Wind-Wiegen bei reifen Pflanzen + Pop-/Wackel-Feedback
// ============================================================================
import { Container, Sprite, Texture } from 'pixi.js';
import {
  fieldGrowth, footprintOf, type CropStage, type FieldObject, type MapObject
} from '../../core';
import { gridToWorld, TILE_H, TILE_W, worldToGrid, type Point } from './iso';
import { placement, spriteDefs } from './objects';

const CROP_ANCHOR_Y = 0.84;
const STAGE_HEIGHT_TILES: Record<CropStage, number> = {
  0: 0.36,
  1: 0.50,
  2: 0.62,
  3: 0.78
};
/** Nachsicht nach oben für hohe reife Ähren/Büsche beim Antippen */
const CANOPY_TOLERANCE_TILES = 0.35;

/** Reine Funktion: Feld unter einer Rasterkoordinate (exakte Grundfläche). */
export function fieldAtGrid(objects: readonly MapObject[], gx: number, gy: number): FieldObject | null {
  for (const o of objects) {
    if (o.kind !== 'field') continue;
    const fp = footprintOf(o);
    if (gx >= o.gx && gx < o.gx + fp.w && gy >= o.gy && gy < o.gy + fp.h) return o;
  }
  return null;
}

/** Reine Funktion: Feld unter einem Weltpunkt (inkl. kleiner Toleranz für hohe reife Pflanzen). */
export function fieldAtWorld(objects: readonly MapObject[], wx: number, wy: number): FieldObject | null {
  const g = worldToGrid(wx, wy);
  const direct = fieldAtGrid(objects, g.gx, g.gy);
  if (direct) return direct;
  const canopy = worldToGrid(wx, wy + CANOPY_TOLERANCE_TILES * TILE_H);
  const hit = fieldAtGrid(objects, canopy.gx, canopy.gy);
  return hit && hit.crop !== null ? hit : null;
}

/** Reine Funktion: Alle getroffenen Felder entlang eines Wischsegments in Besuchsreihenfolge (ohne Duplikate). */
export function fieldsAlongSegment(objects: readonly MapObject[], a: Point, b: Point, step = 20): FieldObject[] {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / step));
  const seen = new Set<string>();
  const out: FieldObject[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const f = fieldAtWorld(objects, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    if (f && !seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

/** Sprite-Schlüssel im `felder`-Atlas für eine Frucht und Wachstumsstufe 0..3. */
export function cropTextureKey(cropId: string, stage: CropStage): string {
  return stage === 0 ? 'feld_keim' : `feld_${cropId}_${stage}`;
}

/** Tiefe der Pflanzen eines Felds in der gemeinsamen `objekte`-Ebene. */
export function fieldCropDepth(f: Pick<FieldObject, 'type' | 'gx' | 'gy'>): number {
  return placement(f).depth;
}

interface TuftSlot {
  readonly sprite: Sprite;
  readonly baseY: number;
  readonly baseScaleX: number;
  readonly baseScaleY: number;
  readonly phase: number;
}

interface FieldVisual {
  readonly id: string;
  readonly bed: Sprite;
  readonly cropWrap: Container;
  readonly tufts: TuftSlot[];
  gx: number;
  gy: number;
  crop: string | null;
  stage: CropStage | -1;
  baseX: number;
  baseY: number;
  pop: number;
  shake: number;
  phase: number;
}

const FURROW_GRID = [0.16, 0.39, 0.61, 0.84] as const;

function hash2(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export class FieldView {
  readonly beds = new Container({ label: 'feld-acker', sortableChildren: true });
  private readonly cropsParent: Container;
  private readonly items = new Map<string, FieldVisual>();
  private readonly fieldSprite = spriteDefs()['snow_field_plot'];
  private ambientActive = false;
  private ambientDelay = 0.25;
  private ambientWeight = 0;
  private clock = 0;

  constructor(bedsParent: Container, cropsParent: Container, objects: readonly MapObject[], now: number) {
    this.cropsParent = cropsParent;
    bedsParent.addChild(this.beds);
    this.sync(objects, now);
  }

  /** Sanftes Wind-Wiegen erst nach dem Ladebild weich anlaufen lassen (deterministischer Start-Screenshot). */
  enableAmbient(): void {
    this.ambientActive = true;
  }

  triggerPop(fieldId: string): void {
    const v = this.items.get(fieldId);
    if (v) v.pop = 1;
  }

  triggerShake(fieldId: string): void {
    const v = this.items.get(fieldId);
    if (v) v.shake = 1;
  }

  sync(objects: readonly MapObject[], now: number): void {
    const seen = new Set<string>();
    for (const o of objects) {
      if (o.kind !== 'field') continue;
      seen.add(o.id);
      const g = fieldGrowth(o, now);
      const crop = g ? g.crop : null;
      const stage: CropStage | -1 = g ? g.stage : -1;
      let v = this.items.get(o.id);
      if (!v) {
        v = this.createVisual(o);
        this.items.set(o.id, v);
      }
      if (v.gx !== o.gx || v.gy !== o.gy) {
        v.gx = o.gx;
        v.gy = o.gy;
        this.positionVisual(v, o);
      }
      if (v.crop !== crop || v.stage !== stage) {
        v.crop = crop;
        v.stage = stage;
        this.rebuildTufts(v, o);
      }
    }
    for (const [id, v] of this.items) {
      if (seen.has(id)) continue;
      this.beds.removeChild(v.bed);
      v.bed.destroy();
      this.cropsParent.removeChild(v.cropWrap);
      v.cropWrap.destroy({ children: true });
      this.items.delete(id);
    }
  }

  update(dt: number): void {
    if (dt <= 0) return;
    const step = Math.min(dt, 0.05);
    this.clock += step;
    const noMotion = reducedMotion();

    if (this.ambientActive && !noMotion) {
      if (this.ambientDelay > 0) this.ambientDelay = Math.max(0, this.ambientDelay - step);
      else this.ambientWeight = Math.min(1, this.ambientWeight + step / 0.6);
    } else if (noMotion) {
      this.ambientWeight = 0;
    }

    for (const v of this.items.values()) {
      let sx = 1;
      let sy = 1;
      let ox = 0;
      if (v.pop > 0) {
        v.pop = Math.max(0, v.pop - step / 0.28);
        if (!noMotion) {
          const s = Math.sin(v.pop * Math.PI);
          sx = 1 + s * 0.09;
          sy = 1 - s * 0.06;
        }
      }
      if (v.shake > 0) {
        v.shake = Math.max(0, v.shake - step / 0.34);
        if (!noMotion) ox = Math.sin(this.clock * 46 + v.phase) * 7 * v.shake;
      }
      v.bed.position.set(v.baseX + ox, v.baseY);
      v.bed.scale.set(v.bed.scale.x >= 0 ? Math.abs(v.bed.scale.x) : 1);
      v.cropWrap.position.set(v.baseX + ox, v.baseY);
      v.cropWrap.scale.set(sx, sy);

      const swayAmp = v.stage === 3 ? 0.052 * this.ambientWeight : 0;
      for (const t of v.tufts) {
        t.sprite.rotation = swayAmp > 0 ? Math.sin(this.clock * 2.15 + t.phase) * swayAmp : 0;
        t.sprite.scale.set(t.baseScaleX, t.baseScaleY);
        t.sprite.y = t.baseY;
      }
    }
  }

  private createVisual(f: FieldObject): FieldVisual {
    const tex = Texture.from('snow_field_plot');
    const anchorY = this.fieldSprite?.anchorY ?? 0.513;
    const bed = new Sprite({ texture: tex, anchor: { x: 0.5, y: anchorY }, label: `${f.id}_acker` });
    const cropWrap = new Container({ label: `${f.id}_saat`, sortableChildren: false });
    this.beds.addChild(bed);
    this.cropsParent.addChild(cropWrap);
    const v: FieldVisual = {
      id: f.id, bed, cropWrap, tufts: [],
      gx: f.gx, gy: f.gy, crop: null, stage: -1,
      baseX: 0, baseY: 0, pop: 0, shake: 0,
      phase: hash2(f.gx, f.gy) * Math.PI * 2
    };
    this.positionVisual(v, f);
    return v;
  }

  private positionVisual(v: FieldVisual, f: FieldObject): void {
    const p = placement(f);
    const tex = v.bed.texture;
    v.bed.height = p.height;
    v.bed.width = (tex.orig.width / tex.orig.height) * p.height;
    v.bed.position.set(p.ground.x, p.ground.y);
    v.bed.zIndex = p.depth;
    v.cropWrap.position.set(p.ground.x, p.ground.y);
    v.cropWrap.zIndex = fieldCropDepth(f);
    v.baseX = p.ground.x;
    v.baseY = p.ground.y;
  }

  private rebuildTufts(v: FieldVisual, f: FieldObject): void {
    v.cropWrap.removeChildren().forEach((c) => c.destroy());
    v.tufts.length = 0;
    if (!v.crop || v.stage < 0) return;

    const stage = v.stage as CropStage;
    const key = cropTextureKey(v.crop, stage);
    const tex = Texture.from(key);
    const fp = footprintOf(f);
    const baseH = STAGE_HEIGHT_TILES[stage] * TILE_W;

    const slots: { u: number; v: number; r1: number; r2: number }[] = [];
    for (let iy = 0; iy < FURROW_GRID.length; iy++) {
      const baseV = FURROW_GRID[iy] ?? 0.5;
      for (let ix = 0; ix < FURROW_GRID.length; ix++) {
        const baseU = FURROW_GRID[ix] ?? 0.5;
        const r1 = hash2(f.gx * 13 + ix, f.gy * 17 + iy);
        const r2 = hash2(f.gx * 29 + ix, f.gy * 31 + iy);
        const u = baseU + (r1 - 0.5) * 0.045;
        const vv = baseV + (r2 - 0.5) * 0.045;
        slots.push({ u, v: vv, r1, r2 });
      }
    }
    slots.sort((a, b) => (a.u + a.v) - (b.u + b.v));

    for (const sl of slots) {
      const worldPos = gridToWorld(f.gx + sl.u * fp.w, f.gy + sl.v * fp.h);
      const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: CROP_ANCHOR_Y } });
      const h = baseH * (0.90 + sl.r1 * 0.22);
      const w = (tex.orig.width / tex.orig.height) * h;
      s.width = w;
      s.height = h;
      const flip = sl.r2 < 0.5 ? -1 : 1;
      if (flip < 0) s.scale.x = -Math.abs(s.scale.x);
      s.position.set(worldPos.x - v.baseX, worldPos.y - v.baseY);
      v.cropWrap.addChild(s);
      v.tufts.push({
        sprite: s,
        baseY: s.y,
        baseScaleX: s.scale.x,
        baseScaleY: s.scale.y,
        phase: sl.u * 4.2 + sl.v * 3.1 + v.phase
      });
    }
  }
}
