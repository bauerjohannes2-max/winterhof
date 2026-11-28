// ============================================================================
// Objekte + Kontaktschatten (Baustein 7 & 10, Entsch. 62, docs/GRAFIK_TECHNIK.md §3/§4)
// Jedes Kartenobjekt mit Bild: Sprite in der Objekt-Ebene (topologisch nach Tiefe sortiert),
// darunter sein vorgebackenes Schattenbild (scripts/schatten_backen.mjs) in der Schatten-Ebene.
// Inkrementelles Sync an GameSession, Schleifen-Overlay für verpackte Stationen und Viewport-Culling.
// ============================================================================
import { Container, Sprite, Texture } from 'pixi.js';
import { CONTENT, type MapObject } from '../../core';
import { gridToWorld, TILE_W, type Point, type Rect } from './iso';

export type ShadowMode = 'kontakt' | 'fleck' | 'bild';
export interface SpriteDef { file: string; size: string; anchorY: number; shadow: ShadowMode }
interface SizeDef { group: string; w?: number; h?: number; heightTiles: number }

const ART = (CONTENT as unknown as { art: { sprites: Record<string, SpriteDef> } }).art.sprites;
const SIZES = CONTENT.sizes as unknown as Record<string, SizeDef>;

/** Kühles Blaugrau, nie Schwarz (GRAFIK_TECHNIK §5); Deckkraft steckt im Schattenbild */
export const SHADOW_TINT = 0x283c46;
/** Overlay-Bild für noch verpackte Werkstätten (wrapped: true) */
export const RIBBON_SPRITE = 'station_ribbon';

/** Alle Bilder mit ihren Angaben (für Prüfungen) */
export function spriteDefs(): Readonly<Record<string, SpriteDef>> { return ART; }

/** Bild für einen Objekt-Typ: das erste Bild, dessen Größe der Typ ist (null = noch kein Bild, kommt später). */
const BY_TYPE = new Map<string, string>();
for (const [key, def] of Object.entries(ART)) if (!BY_TYPE.has(def.size)) BY_TYPE.set(def.size, key);
export function spriteFor(type: string): string | null { return BY_TYPE.get(type) ?? null; }

export interface Placement {
  /** Bodenpunkt in der Welt = Mitte der Grundfläche */
  ground: Point;
  /** Bildhöhe in Weltpunkten */
  height: number;
  /** Ersatz-Tiefe ohne DAG (nur Fallback für Einzelaufrufe) */
  depth: number;
}

export function placement(obj: Pick<MapObject, 'type' | 'gx' | 'gy'>): Placement {
  const sz = SIZES[obj.type];
  if (!sz) throw new Error(`Größenkatalog: ${obj.type} fehlt`);
  const w = sz.w ?? 1, h = sz.h ?? 1;
  const ground = gridToWorld(obj.gx + w / 2, obj.gy + h / 2);
  return { ground, height: sz.heightTiles * TILE_W, depth: (obj.gx + obj.gy + w + h) * 100000 + ground.y };
}

/** Schattenbilder werden in halber Auflösung gebacken (GRAFIK_TECHNIK §4, scripts/schatten_backen.mjs). */
export const SHADOW_SCALE = 0.5;

/**
 * Lage des Schattenbilds zum Objektbild. Das Schattenbild ist die Bildleinwand mit gleich großem Rand links,
 * rechts und unten in halber Auflösung (SHADOW_SCALE), deshalb ergibt sich alles exakt aus den beiden Bildgrößen.
 */
export function shadowFrame(sprite: { width: number; height: number }, shadow: { width: number; height: number },
  anchorY: number, worldHeight: number, scale = SHADOW_SCALE): { width: number; height: number; anchorX: number; anchorY: number } {
  const sw = shadow.width / scale;
  const sh = shadow.height / scale;
  const u = worldHeight / sprite.height;
  const pad = (sw - sprite.width) / 2;
  return {
    width: sw * u,
    height: sh * u,
    anchorX: (pad + sprite.width / 2) / sw,
    anchorY: (sprite.height * anchorY) / sh
  };
}

/** Prüft, ob eine Welt-Bounding-Box im gepufferten Kamera-Ausschnitt liegt (Culling, GRAFIK_TECHNIK §7). */
export function isVisibleInView(bounds: Rect, view: Rect, pad = TILE_W * 2): boolean {
  return bounds.x1 >= view.x0 - pad && bounds.x0 <= view.x1 + pad
    && bounds.y1 >= view.y0 - pad && bounds.y0 <= view.y1 + pad;
}

interface ObjVisual {
  readonly id: string;
  readonly key: string;
  readonly def: SpriteDef;
  readonly sprite: Sprite;
  readonly shadow: Sprite | null;
  ribbon: Sprite | null;
  type: string;
  gx: number;
  gy: number;
  wrapped: boolean;
  bounds: Rect;
}

/** Objekte + Schatten einer Objektliste. Synchronisiert inkrementell und blendet Unsichtbares per Culling aus. */
export class ObjectView {
  readonly objects: Container;
  readonly shadows: Container;
  private readonly items = new Map<string, ObjVisual>();

  constructor(
    objects: readonly MapObject[],
    targets?: { objects?: Container; shadows?: Container },
    depths?: ReadonlyMap<string, number>
  ) {
    this.objects = targets?.objects ?? new Container({ label: 'objekt-bilder', sortableChildren: true });
    this.shadows = targets?.shadows ?? new Container({ label: 'schatten-bilder' });
    this.sync(objects, depths);
  }

  /** Baut Änderungen inkrementell ein (behält unveränderte Sprites, aktualisiert Tiefe, Position und wrapped-Schleife). */
  sync(objects: readonly MapObject[], depths?: ReadonlyMap<string, number>): void {
    const seen = new Set<string>();
    for (const obj of objects) {
      if (obj.kind === 'field') continue; // Felder liegen als Erdwulst + 4 Stufen in FieldView
      const key = spriteFor(obj.type);
      if (!key) continue;
      const def = ART[key];
      if (!def) continue;
      seen.add(obj.id);

      const depth = depths?.get(obj.id) ?? placement(obj).depth;
      const wrapped = obj.kind === 'station' && obj.wrapped;
      const cur = this.items.get(obj.id);

      if (cur && cur.type === obj.type && cur.key === key) {
        if (cur.gx !== obj.gx || cur.gy !== obj.gy) {
          cur.gx = obj.gx;
          cur.gy = obj.gy;
          this.positionVisual(cur, obj);
        }
        cur.sprite.zIndex = depth;
        if (cur.wrapped !== wrapped) {
          cur.wrapped = wrapped;
          this.updateRibbon(cur, obj, depth);
        } else if (cur.ribbon) {
          cur.ribbon.zIndex = depth + 1;
        }
        continue;
      }

      if (cur) this.removeVisual(cur);
      const created = this.createVisual(obj, key, def, depth, wrapped);
      this.items.set(obj.id, created);
    }

    for (const [id, v] of this.items) {
      if (seen.has(id)) continue;
      this.removeVisual(v);
      this.items.delete(id);
    }
  }

  /** Kompatibilität für bestehende Aufrufe ohne Tiefen-Map. */
  build(objects: readonly MapObject[], depths?: ReadonlyMap<string, number>): void {
    this.sync(objects, depths);
  }

  /** Blendet Objekte außerhalb des sichtbaren Kamera-Bereichs aus (Draw Calls & GPU-Füllrate). */
  cull(view: Rect, pad = TILE_W * 2): void {
    for (const v of this.items.values()) {
      const vis = isVisibleInView(v.bounds, view, pad);
      if (v.sprite.visible !== vis) v.sprite.visible = vis;
      if (v.shadow && v.shadow.visible !== vis) v.shadow.visible = vis;
      if (v.ribbon && v.ribbon.visible !== vis) v.ribbon.visible = vis;
    }
  }

  private createVisual(obj: MapObject, key: string, def: SpriteDef, depth: number, wrapped: boolean): ObjVisual {
    const tex = Texture.from(key);
    const sprite = new Sprite({ texture: tex, anchor: { x: 0.5, y: def.anchorY }, label: obj.id });
    this.objects.addChild(sprite);

    let shadow: Sprite | null = null;
    if (def.shadow !== 'bild') {
      const sTex = Texture.from(`${key}_schatten`);
      shadow = new Sprite({ texture: sTex, tint: SHADOW_TINT, label: `${obj.id}_schatten` });
      this.shadows.addChild(shadow);
    }

    const v: ObjVisual = {
      id: obj.id, key, def, sprite, shadow, ribbon: null,
      type: obj.type, gx: obj.gx, gy: obj.gy, wrapped,
      bounds: { x0: 0, y0: 0, x1: 0, y1: 0 }
    };
    this.positionVisual(v, obj);
    sprite.zIndex = depth;
    this.updateRibbon(v, obj, depth);
    return v;
  }

  private positionVisual(v: ObjVisual, obj: Pick<MapObject, 'type' | 'gx' | 'gy'>): void {
    const p = placement(obj);
    const tex = v.sprite.texture;
    v.sprite.height = p.height;
    v.sprite.width = (tex.orig.width / tex.orig.height) * p.height;          // nie verzerren
    v.sprite.position.set(p.ground.x, p.ground.y);

    let x0 = p.ground.x - v.sprite.width / 2;
    let x1 = p.ground.x + v.sprite.width / 2;
    let y0 = p.ground.y - v.sprite.height * v.def.anchorY;
    let y1 = p.ground.y + v.sprite.height * (1 - v.def.anchorY);

    if (v.shadow) {
      const f = shadowFrame(tex.orig, v.shadow.texture.orig, v.def.anchorY, p.height);
      v.shadow.anchor.set(f.anchorX, f.anchorY);
      v.shadow.width = f.width;
      v.shadow.height = f.height;
      v.shadow.position.set(p.ground.x, p.ground.y);
      x0 = Math.min(x0, p.ground.x - f.width * f.anchorX);
      x1 = Math.max(x1, p.ground.x + f.width * (1 - f.anchorX));
      y0 = Math.min(y0, p.ground.y - f.height * f.anchorY);
      y1 = Math.max(y1, p.ground.y + f.height * (1 - f.anchorY));
    }

    v.bounds = { x0, y0, x1, y1 };
    if (v.ribbon) this.placeRibbon(v);
  }

  private placeRibbon(v: ObjVisual): void {
    if (!v.ribbon) return;
    const tex = v.ribbon.texture;
    const targetW = Math.min(v.sprite.width, v.sprite.height) * 0.62;
    v.ribbon.width = targetW;
    v.ribbon.height = (tex.orig.height / tex.orig.width) * targetW;
    v.ribbon.position.set(v.sprite.x, v.sprite.y - v.sprite.height * (v.def.anchorY - 0.50));
  }

  private updateRibbon(v: ObjVisual, _obj: MapObject, depth: number): void {
    if (v.wrapped && !v.ribbon) {
      const tex = Texture.from(RIBBON_SPRITE);
      const r = new Sprite({ texture: tex, anchor: { x: 0.5, y: 0.5 }, label: `${v.id}_schleife` });
      r.zIndex = depth + 1;
      r.visible = v.sprite.visible;
      this.objects.addChild(r);
      v.ribbon = r;
      this.placeRibbon(v);
    } else if (!v.wrapped && v.ribbon) {
      this.objects.removeChild(v.ribbon);
      v.ribbon.destroy();
      v.ribbon = null;
    }
  }

  private removeVisual(v: ObjVisual): void {
    this.objects.removeChild(v.sprite);
    v.sprite.destroy();
    if (v.shadow) {
      this.shadows.removeChild(v.shadow);
      v.shadow.destroy();
    }
    if (v.ribbon) {
      this.objects.removeChild(v.ribbon);
      v.ribbon.destroy();
    }
  }
}
