// ============================================================================
// Feld-Effekte („Juice“, Baustein 9, Entscheidung 69) in Ebene `effekte`:
//   - Ernte: fruchtfarbene Halm-/Beeren-Partikel + aufsteigendes +Menge / +XP
//   - Aussaat: feine Erd-/Saatkrümel
//   - Warnung (z. B. Silo voll): gedrosselter Schwebe-Hinweis
// ============================================================================
import { Container, Graphics, Text } from 'pixi.js';
import { CONTENT, type FieldObject } from '../../core';
import { placement } from './objects';

const CROP_COLORS: Record<string, number> = {
  wheat: 0xf7c948,
  berries: 0xe03242,
  matcha: 0x7fd35a,
  cocoa: 0x8e562e,
  cinnamon: 0xc97b3f,
  candycane: 0xf2464c,
  apples: 0xe4383b,
  almonds: 0xdfae6e,
  fir_greens: 0x4ca358,
  walnuts: 0xb6844b
};

interface Particle {
  readonly node: Graphics;
  vx: number;
  vy: number;
  life: number;
  readonly maxLife: number;
}

interface FloatingLabel {
  readonly node: Text;
  vy: number;
  life: number;
  readonly maxLife: number;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export class FieldEffects {
  readonly view = new Container({ label: 'feld-effekte' });
  private readonly particles: Particle[] = [];
  private readonly labels: FloatingLabel[] = [];
  private readonly lastWarnAt = new Map<string, number>();

  spawnHarvest(field: FieldObject, cropId: string, qty: number, xp: number): void {
    const p = placement(field);
    const color = CROP_COLORS[cropId] ?? 0xffd76a;
    if (!reducedMotion()) {
      for (let i = 0; i < 9; i++) {
        const ang = (-Math.PI * 0.85) + (i / 8) * (Math.PI * 0.70);
        const speed = 75 + (i % 3) * 35;
        const g = new Graphics();
        g.circle(0, 0, i % 2 === 0 ? 4.5 : 3.2).fill({ color });
        g.position.set(p.ground.x + ((i % 3) - 1) * 18, p.ground.y - 16);
        this.view.addChild(g);
        this.particles.push({
          node: g,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 25,
          life: 0.55,
          maxLife: 0.55
        });
      }
    }
    const name = CONTENT.items[cropId]?.name ?? cropId;
    this.addLabel(p.ground.x, p.ground.y - 34, `+${qty} ${name}  +${xp} XP`, 0xfff5c0);
  }

  spawnPlant(field: FieldObject): void {
    if (reducedMotion()) return;
    const p = placement(field);
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI * 0.8 + (i / 5) * Math.PI * 0.6;
      const g = new Graphics();
      g.circle(0, 0, 3).fill({ color: i % 2 === 0 ? 0x955a30 : 0x98de4a });
      g.position.set(p.ground.x + ((i % 3) - 1) * 20, p.ground.y - 6);
      this.view.addChild(g);
      this.particles.push({
        node: g,
        vx: Math.cos(ang) * 48,
        vy: Math.sin(ang) * 48 - 10,
        life: 0.36,
        maxLife: 0.36
      });
    }
  }

  spawnWarning(field: FieldObject, text: string, nowMs = Date.now()): void {
    const prev = this.lastWarnAt.get(field.id) ?? 0;
    if (nowMs - prev < 800) return;
    this.lastWarnAt.set(field.id, nowMs);
    const p = placement(field);
    this.addLabel(p.ground.x, p.ground.y - 42, text, 0xff9b8a);
  }

  update(dt: number): void {
    if (dt <= 0) return;
    const step = Math.min(dt, 0.05);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      if (!pt) continue;
      pt.life -= step;
      if (pt.life <= 0) {
        this.view.removeChild(pt.node);
        pt.node.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy += 260 * step;
      pt.node.x += pt.vx * step;
      pt.node.y += pt.vy * step;
      pt.node.alpha = Math.min(1, (pt.life / pt.maxLife) * 1.4);
    }
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const lb = this.labels[i];
      if (!lb) continue;
      lb.life -= step;
      if (lb.life <= 0) {
        this.view.removeChild(lb.node);
        lb.node.destroy();
        this.labels.splice(i, 1);
        continue;
      }
      lb.node.y += lb.vy * step;
      lb.node.alpha = Math.min(1, (lb.life / lb.maxLife) * 1.6);
    }
  }

  private addLabel(x: number, y: number, msg: string, fill: number): void {
    const node = new Text({
      text: msg,
      style: {
        fontFamily: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif',
        fontSize: 18,
        fontWeight: '800',
        fill,
        stroke: { color: 0x16294a, width: 4 }
      },
      anchor: 0.5
    });
    node.position.set(x, y);
    this.view.addChild(node);
    this.labels.push({ node, vy: -34, life: 0.95, maxLife: 0.95 });
  }
}
