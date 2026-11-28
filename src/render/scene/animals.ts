// ============================================================================
// Gehege-Tiere Darstellung (Baustein 11, Entscheidung 74)
// - Alle 5 Tierarten (Huhn, Eule, Schaf, Esel, Rentier) in exakter Katalog-Größe
// - Bodenschatten direkt über der Weidefläche (`penDepth + 0.5`) in `objekte`
// - Gemeinsame Tiefensortierung mit Gehegen & Gebäuden (`penDepth + 1 + localSort`)
// - Ready-Produkt-Blasen (`badge_*`) in `effekte` über fertigen Tieren
// ============================================================================
import { Container, Sprite, Texture } from 'pixi.js';
import { CONTENT, footprintOf, type MapObject, type PenAnimal, type PenObject } from '../../core';
import { gridAreaBounds, gridToWorld, TILE_W, type Rect } from './iso';
import { isVisibleInView, placement, shadowFrame, SHADOW_TINT, spriteDefs, spriteFor } from './objects';
import {
  ANIMAL_BADGE, ANIMAL_FACING, animalLocalDepth, createAnimalSim, stepAnimalSim, type AnimalSimState
} from './animalSim';

interface AnimalVisual {
  readonly key: string;
  readonly penId: string;
  readonly animalId: string;
  readonly species: string;
  readonly produceItem: string;
  readonly index: number;
  readonly anchorY: number;
  readonly baseHeight: number;
  readonly baseScaleX: number;
  readonly baseScaleY: number;
  readonly sprite: Sprite;
  readonly shadow: Sprite | null;
  readonly badge: Sprite | null;
  readonly sim: AnimalSimState;
  penGx: number;
  penGy: number;
  penW: number;
  penH: number;
  penDepth: number;
  state: PenAnimal['state'];
  visible: boolean;
}

const BADGE_HEIGHT = TILE_W * 0.38;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export class AnimalView {
  private readonly objectsLayer: Container;
  private readonly effectsLayer: Container;
  private readonly items = new Map<string, AnimalVisual>();
  private readonly penGroups = new Map<string, AnimalVisual[]>();
  private ambientActive = false;
  private clock = 0;

  constructor(
    objectsLayer: Container,
    effectsLayer: Container,
    objects: readonly MapObject[],
    depths?: ReadonlyMap<string, number>
  ) {
    this.objectsLayer = objectsLayer;
    this.effectsLayer = effectsLayer;
    this.sync(objects, depths);
  }

  /** Aktiviert die Tier-Animation weich nach dem Ausblenden des Ladebilds. */
  enableAmbient(): void {
    this.ambientActive = true;
  }

  sync(objects: readonly MapObject[], depths?: ReadonlyMap<string, number>): void {
    const seen = new Set<string>();
    const defs = spriteDefs();
    this.penGroups.clear();

    for (const obj of objects) {
      if (obj.kind !== 'pen') continue;
      const pen = obj as PenObject;
      const penDef = CONTENT.pens[pen.type];
      if (!penDef) continue;
      const species = penDef.animal;
      const animalDef = CONTENT.animals[species];
      const spriteKey = spriteFor(species);
      if (!animalDef || !spriteKey) continue;
      const spriteDef = defs[spriteKey];
      const sizeDef = CONTENT.sizes[species];
      if (!spriteDef || !sizeDef) continue;

      const fp = footprintOf(pen);
      const penDepth = depths?.get(pen.id) ?? placement(pen).depth;
      const group: AnimalVisual[] = [];
      this.penGroups.set(pen.id, group);

      const placedPositions: { u: number; v: number }[] = [];
      pen.animals.forEach((a, idx) => {
        const key = `${pen.id}:${a.id}`;
        seen.add(key);
        let v = this.items.get(key);
        if (!v || v.species !== species) {
          if (v) this.removeVisual(v);
          v = this.createVisual(
            key, pen, a, idx, species, animalDef.produceItem, spriteKey, spriteDef, sizeDef.heightTiles * TILE_W,
            fp.w, fp.h, penDepth, placedPositions
          );
          this.items.set(key, v);
        } else {
          v.penGx = pen.gx;
          v.penGy = pen.gy;
          v.penW = fp.w;
          v.penH = fp.h;
          v.penDepth = penDepth;
          v.state = a.state;
        }
        placedPositions.push({ u: v.sim.u, v: v.sim.v });
        group.push(v);
        this.applyTransform(v, 0, 0);
      });
    }

    for (const [key, v] of this.items) {
      if (seen.has(key)) continue;
      this.removeVisual(v);
      this.items.delete(key);
    }
  }

  /** Blendet Tiere, Schatten und Badges in nicht sichtbaren Gehegen aus (Culling). */
  cull(view: Rect, pad = TILE_W * 2): void {
    for (const group of this.penGroups.values()) {
      const first = group[0];
      if (!first) continue;
      const b = gridAreaBounds(first.penGx, first.penGy, first.penGx + first.penW - 1, first.penGy + first.penH - 1);
      const vis = isVisibleInView({ x0: b.x0, y0: b.y0 - TILE_W, x1: b.x1, y1: b.y1 }, view, pad);
      for (const v of group) {
        v.visible = vis;
        if (v.sprite.visible !== vis) v.sprite.visible = vis;
        if (v.shadow && v.shadow.visible !== vis) v.shadow.visible = vis;
        if (v.badge) {
          const showBadge = vis && v.state === 'ready';
          if (v.badge.visible !== showBadge) v.badge.visible = showBadge;
        }
      }
    }
  }

  update(dt: number): void {
    if (dt <= 0) return;
    this.clock += Math.min(dt, 0.1);
    const animate = this.ambientActive && !reducedMotion();

    for (const group of this.penGroups.values()) {
      for (let i = 0; i < group.length; i++) {
        const v = group[i];
        if (!v || !v.visible) continue;
        let hop = 0;
        let squash = 0;
        if (animate) {
          const peers: { u: number; v: number }[] = [];
          for (let j = 0; j < group.length; j++) {
            const p = group[j];
            if (i !== j && p) peers.push({ u: p.sim.u, v: p.sim.v });
          }
          const step = stepAnimalSim(v.sim, v.state, v.penW, v.penH, dt, peers, v.species);
          hop = step.hop;
          squash = step.squash;
        }
        this.applyTransform(v, hop, squash);
      }
    }
  }

  private createVisual(
    key: string,
    pen: PenObject,
    animal: PenAnimal,
    index: number,
    species: string,
    produceItem: string,
    spriteKey: string,
    spriteDef: { anchorY: number; shadow: string },
    worldHeight: number,
    penW: number,
    penH: number,
    penDepth: number,
    placedPositions: readonly { u: number; v: number }[]
  ): AnimalVisual {
    const tex = Texture.from(spriteKey);
    const sprite = new Sprite({ texture: tex, anchor: { x: 0.5, y: spriteDef.anchorY }, label: `tier_${pen.id}_${animal.id}` });
    sprite.height = worldHeight;
    sprite.width = (tex.orig.width / tex.orig.height) * worldHeight;
    this.objectsLayer.addChild(sprite);

    let shadow: Sprite | null = null;
    if (spriteDef.shadow !== 'bild') {
      const sTex = Texture.from(`${spriteKey}_schatten`);
      shadow = new Sprite({ texture: sTex, tint: SHADOW_TINT, label: `tier_${pen.id}_${animal.id}_schatten` });
      const f = shadowFrame(tex.orig, sTex.orig, spriteDef.anchorY, worldHeight);
      shadow.anchor.set(f.anchorX, f.anchorY);
      shadow.width = f.width;
      shadow.height = f.height;
      this.objectsLayer.addChild(shadow);
    }

    let badge: Sprite | null = null;
    const badgeKey = ANIMAL_BADGE[produceItem];
    if (badgeKey) {
      const bTex = Texture.from(badgeKey);
      badge = new Sprite({ texture: bTex, anchor: { x: 0.5, y: 1 }, label: `tier_${pen.id}_${animal.id}_badge` });
      badge.height = BADGE_HEIGHT;
      badge.width = (bTex.orig.width / bTex.orig.height) * BADGE_HEIGHT;
      badge.visible = animal.state === 'ready';
      this.effectsLayer.addChild(badge);
    }

    const sim = createAnimalSim(pen.id, animal.id, index, penW, penH, placedPositions);
    return {
      key,
      penId: pen.id,
      animalId: animal.id,
      species,
      produceItem,
      index,
      anchorY: spriteDef.anchorY,
      baseHeight: worldHeight,
      baseScaleX: Math.abs(sprite.scale.x),
      baseScaleY: Math.abs(sprite.scale.y),
      sprite,
      shadow,
      badge,
      sim,
      penGx: pen.gx,
      penGy: pen.gy,
      penW,
      penH,
      penDepth,
      state: animal.state,
      visible: true
    };
  }

  private applyTransform(v: AnimalVisual, hop: number, squash: number): void {
    const pos = gridToWorld(v.penGx + v.sim.u, v.penGy + v.sim.v);
    const hopPx = hop * TILE_W * (v.state === 'ready' ? 0.08 : 0.04);
    const nativeFacing = ANIMAL_FACING[v.species] ?? 1;
    const flipSign = v.sim.facing * nativeFacing;

    v.sprite.scale.set(v.baseScaleX * flipSign * (1 - squash * 0.6), v.baseScaleY * (1 + squash));
    v.sprite.position.set(pos.x, pos.y - hopPx);
    v.sprite.zIndex = v.penDepth + 1 + animalLocalDepth(v.sim.u, v.sim.v, v.penW, v.penH, v.index);

    if (v.shadow) {
      v.shadow.position.set(pos.x, pos.y);
      const shrink = 1 - hop * 0.12;
      v.shadow.alpha = 1 - hop * 0.15;
      // Schatten-Spiegelung bleibt aus, damit Lichtrichtung oben links unverändert stimmt
      const sTex = v.shadow.texture.orig;
      const oTex = v.sprite.texture.orig;
      const f = shadowFrame(oTex, sTex, v.anchorY, v.baseHeight);
      v.shadow.width = f.width * shrink;
      v.shadow.height = f.height * shrink;
      v.shadow.zIndex = v.penDepth + 0.5;
    }

    if (v.badge) {
      const show = v.visible && v.state === 'ready';
      if (v.badge.visible !== show) v.badge.visible = show;
      if (show) {
        const floatY = this.ambientActive && !reducedMotion() ? Math.sin(this.clock * 3.6 + v.sim.phase) * 3.5 : 0;
        const headTopY = pos.y - v.baseHeight * v.anchorY;
        v.badge.position.set(pos.x, headTopY - 4 + floatY);
        v.badge.zIndex = v.sprite.zIndex;
      }
    }
  }

  private removeVisual(v: AnimalVisual): void {
    this.objectsLayer.removeChild(v.sprite);
    v.sprite.destroy();
    if (v.shadow) {
      this.objectsLayer.removeChild(v.shadow);
      v.shadow.destroy();
    }
    if (v.badge) {
      this.effectsLayer.removeChild(v.badge);
      v.badge.destroy();
    }
  }
}
