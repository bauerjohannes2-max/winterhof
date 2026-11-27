// ============================================================================
// Objekte + Kontaktschatten (Baustein 7, Entscheidung 62, docs/GRAFIK_TECHNIK.md §3/§4)
// Jedes Kartenobjekt mit Bild: Sprite in der Objekt-Ebene (nach Tiefe sortiert), darunter sein vorgebackenes
// Schattenbild (scripts/schatten_backen.mjs) in der Schatten-Ebene. Keine Standfläche: Vorplatz bringt das Bild mit.
// Bodenpunkt (anchorY) liegt genau auf der Mitte der Grundfläche; Bildhöhe aus dem Größenkatalog, Breite nie verzerrt.
// ============================================================================
import { Container, Sprite, Texture } from 'pixi.js';
import { CONTENT, type MapObject } from '../../core';
import { gridToWorld, TILE_W, type Point } from './iso';

export type ShadowMode = 'kontakt' | 'fleck' | 'bild';
export interface SpriteDef { file: string; size: string; anchorY: number; shadow: ShadowMode }
interface SizeDef { group: string; w?: number; h?: number; heightTiles: number }

const ART = (CONTENT as unknown as { art: { sprites: Record<string, SpriteDef> } }).art.sprites;
const SIZES = CONTENT.sizes as unknown as Record<string, SizeDef>;

/** Kühles Blaugrau, nie Schwarz (GRAFIK_TECHNIK §5); Deckkraft steckt im Schattenbild */
export const SHADOW_TINT = 0x283c46;

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
  /** Tiefe: vorderste Ecke der Grundfläche (gx + gy + w + h), bei Gleichstand Bildschirmhöhe */
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

/** Objekte + Schatten einer Objektliste. Ersetzt beim Neuaufbau alles (Bauen/Verschieben kommt in Baustein 12). */
export class ObjectView {
  readonly objects = new Container({ label: 'objekt-bilder', sortableChildren: true });
  readonly shadows = new Container({ label: 'schatten-bilder' });

  constructor(objects: readonly MapObject[]) { this.build(objects); }

  build(objects: readonly MapObject[]): void {
    this.objects.removeChildren().forEach((c) => c.destroy());
    this.shadows.removeChildren().forEach((c) => c.destroy());
    for (const obj of objects) {
      const key = spriteFor(obj.type);
      if (!key) continue;
      const def = ART[key];
      if (!def) continue;
      const p = placement(obj);
      const tex = Texture.from(key);
      const s = new Sprite({ texture: tex, anchor: { x: 0.5, y: def.anchorY }, label: obj.id });
      s.height = p.height;
      s.width = (tex.orig.width / tex.orig.height) * p.height;          // nie verzerren
      s.position.set(p.ground.x, p.ground.y);
      s.zIndex = p.depth;
      this.objects.addChild(s);
      if (def.shadow === 'bild') continue;
      const sTex = Texture.from(`${key}_schatten`);
      const f = shadowFrame(tex.orig, sTex.orig, def.anchorY, p.height);
      const sh = new Sprite({ texture: sTex, anchor: { x: f.anchorX, y: f.anchorY }, tint: SHADOW_TINT, label: `${obj.id}_schatten` });
      sh.width = f.width;
      sh.height = f.height;
      sh.position.set(p.ground.x, p.ground.y);
      this.shadows.addChild(sh);
    }
  }
}
