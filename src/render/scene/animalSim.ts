// ============================================================================
// Reine Weide-Simulation für Gehege-Tiere (Baustein 11, Entsch. 74)
// Kein Pixi, kein DOM, kein Math.random()/Date.now() – 100 % deterministisch testbar.
// ============================================================================
import type { PenAnimal } from '../../core';

export type AnimalSpecies = 'chicken' | 'owl' | 'sheep' | 'donkey' | 'reindeer';

/** Natürliche Blickrichtung je Tier-Sprite (+1 = rechts, -1 = links) */
export const ANIMAL_FACING: Record<string, 1 | -1> = {
  chicken: 1,
  owl: 1,
  sheep: -1,
  donkey: 1,
  reindeer: 1
};

/** Produkt-Overlay je hergestelltem Tierprodukt (art.overlays in winterhof.json) */
export const ANIMAL_BADGE: Record<string, string> = {
  egg: 'badge_egg',
  starmilk: 'badge_starmilk',
  wool: 'badge_wool',
  firewood: 'badge_firewood',
  letter: 'badge_letter'
};

const WALK_SPEED: Record<string, number> = {
  chicken: 0.28,
  owl: 0.34,
  sheep: 0.36,
  donkey: 0.40,
  reindeer: 0.44
};

/** Wohlverteilte Ankerpunkte (relativ zu w×h) in der L-förmigen offenen Weidefläche */
const SLOT_RATIOS: readonly [number, number][] = [
  [0.54, 0.68],
  [0.74, 0.72],
  [0.34, 0.64],
  [0.75, 0.50],
  [0.24, 0.77],
  [0.60, 0.53]
];

export interface AnimalSimState {
  u: number;
  v: number;
  targetU: number;
  targetV: number;
  facing: 1 | -1;
  mode: 'idle' | 'walk';
  timer: number;
  phase: number;
  rngState: number;
}

export interface WalkBounds {
  readonly minU: number;
  readonly maxU: number;
  readonly minV: number;
  readonly maxV: number;
  readonly stallU: number;
  readonly stallV: number;
  readonly backV: number;
}

/** Berechnet die sichere Weide-Freizone innerhalb eines Geheges (w × h), spart Stall und Zaun aus. */
export function penWalkBounds(w: number, h: number): WalkBounds {
  return {
    minU: 0.52,
    maxU: Math.max(0.62, w - 0.56),
    minV: 0.52,
    maxV: Math.max(0.62, h - 0.56),
    stallU: w * 0.54,
    stallV: h * 0.50,
    backV: h * 0.34
  };
}

/** Prüft, ob die lokale Kachelposition (u, v) im offenen Weidebereich liegt (kein Stall, kein Zaun). */
export function isInPenWalkZone(u: number, v: number, w: number, h: number): boolean {
  const b = penWalkBounds(w, h);
  if (u < b.minU || u > b.maxU || v < b.minV || v > b.maxV) return false;
  if (v < b.backV) return false;
  if (u < b.stallU && v < b.stallV) return false;
  return true;
}

/** Klemmt eine lokale Kachelposition sauber in die offene Weidefläche. */
export function clampToPenWalkZone(u: number, v: number, w: number, h: number): { u: number; v: number } {
  const b = penWalkBounds(w, h);
  let cu = Math.max(b.minU, Math.min(b.maxU, u));
  let cv = Math.max(Math.max(b.minV, b.backV), Math.min(b.maxV, v));
  if (cu < b.stallU && cv < b.stallV) {
    const pushRight = b.stallU - cu;
    const pushDown = b.stallV - cv;
    if (pushRight <= pushDown && b.stallU <= b.maxU) {
      cu = b.stallU;
    } else {
      cv = Math.min(b.maxV, b.stallV);
    }
  }
  return { u: cu, v: cv };
}

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function nextRand(sim: { rngState: number }): number {
  let x = (sim.rngState + 0x6d2b79f5) | 0;
  sim.rngState = x >>> 0;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

export function minAnimalSpacing(w: number, h: number): number {
  return Math.min(w, h) <= 3 ? 0.42 : 0.58;
}

/** Erzeugt einen deterministischen Startzustand für ein Tier im Gehege (mit Mindestabstand zu bereits gesetzten). */
export function createAnimalSim(
  penId: string,
  animalId: string,
  index: number,
  w: number,
  h: number,
  existing: readonly { u: number; v: number }[] = []
): AnimalSimState {
  const seed = { rngState: hashString(`${penId}:${animalId}`) };
  const ratio = SLOT_RATIOS[index % SLOT_RATIOS.length] ?? [0.6, 0.6];
  const spacing = minAnimalSpacing(w, h);
  let pos = clampToPenWalkZone(ratio[0] * w, ratio[1] * h, w, h);

  // Kleiner deterministischer Versatz nur, solange der Mindestabstand gewahrt bleibt
  for (let attempt = 0; attempt < 8; attempt++) {
    const ju = (nextRand(seed) - 0.5) * 0.14;
    const jv = (nextRand(seed) - 0.5) * 0.14;
    const cand = clampToPenWalkZone(ratio[0] * w + ju, ratio[1] * h + jv, w, h);
    if (existing.every((p) => Math.hypot(cand.u - p.u, cand.v - p.v) >= spacing)) {
      pos = cand;
      break;
    }
  }

  const facing: 1 | -1 = nextRand(seed) >= 0.45 ? 1 : -1;
  return {
    u: pos.u,
    v: pos.v,
    targetU: pos.u,
    targetV: pos.v,
    facing,
    mode: 'idle',
    timer: 0.6 + nextRand(seed) * 2.4,
    phase: nextRand(seed) * Math.PI * 2,
    rngState: seed.rngState
  };
}

/**
 * Lokale Tiefe innerhalb des Geheges im Bereich [0..7.5],
 * sodass jedes Tier strikt über seinem Gehege (penDepth) und unter dem nächsten DAG-Objekt (penDepth + 10) liegt.
 */
export function animalLocalDepth(u: number, v: number, w: number, h: number, index: number): number {
  const norm = Math.max(0, Math.min(1, (u + v) / Math.max(1, w + h)));
  return norm * 6.5 + (index % 10) * 0.02;
}

function pickWalkTarget(
  sim: AnimalSimState,
  w: number,
  h: number,
  peers: readonly { u: number; v: number }[]
): { u: number; v: number } | null {
  const b = penWalkBounds(w, h);
  const spacing = minAnimalSpacing(w, h) * 0.85;
  for (let attempt = 0; attempt < 12; attempt++) {
    const cu = b.minU + nextRand(sim) * (b.maxU - b.minU);
    const cv = Math.max(b.minV, b.backV) + nextRand(sim) * (b.maxV - Math.max(b.minV, b.backV));
    if (!isInPenWalkZone(cu, cv, w, h)) continue;
    if (Math.hypot(cu - sim.u, cv - sim.v) < 0.42) continue;
    if (peers.some((p) => Math.hypot(cu - p.u, cv - p.v) < spacing)) continue;
    return { u: cu, v: cv };
  }
  return null;
}

export interface StepVisual {
  readonly hop: number;
  readonly squash: number;
}

/**
 * Führt genau einen Zeitschritt der Tierbewegung aus:
 * - hungry: ruhiges Stehen mit sanftem Atem-/Nick-Impuls
 * - producing: gemütliches Spazieren auf der offenen Weide mit Pausen
 * - ready: fröhliches Wippen (signalisiert Abholbereitschaft)
 */
export function stepAnimalSim(
  sim: AnimalSimState,
  state: PenAnimal['state'],
  w: number,
  h: number,
  dtRaw: number,
  peers: readonly { u: number; v: number }[],
  species: string
): StepVisual {
  const dt = Math.max(0, Math.min(dtRaw, 0.1));
  if (dt === 0) return { hop: 0, squash: 0 };

  if (state === 'hungry') {
    sim.mode = 'idle';
    sim.phase += dt * 2.1;
    return { hop: 0, squash: Math.sin(sim.phase) * 0.022 };
  }

  if (state === 'ready') {
    sim.mode = 'idle';
    sim.phase += dt * 5.8;
    const bounce = Math.abs(Math.sin(sim.phase));
    return { hop: bounce, squash: Math.cos(sim.phase * 2) * 0.035 };
  }

  // state === 'producing': entspanntes Umherwandern mit Pausen
  const speed = WALK_SPEED[species] ?? 0.36;
  if (sim.mode === 'idle') {
    sim.timer -= dt;
    sim.phase += dt * 2.0;
    if (sim.timer <= 0) {
      const target = pickWalkTarget(sim, w, h, peers);
      if (target) {
        sim.targetU = target.u;
        sim.targetV = target.v;
        const screenDx = (target.u - sim.u) - (target.v - sim.v);
        if (Math.abs(screenDx) > 0.04) sim.facing = screenDx > 0 ? 1 : -1;
        sim.mode = 'walk';
        sim.timer = 6.0;
      } else {
        sim.timer = 1.4 + nextRand(sim) * 1.6;
      }
    }
    return { hop: 0, squash: Math.sin(sim.phase) * 0.018 };
  }

  // mode === 'walk'
  sim.timer -= dt;
  const du = sim.targetU - sim.u;
  const dv = sim.targetV - sim.v;
  const dist = Math.hypot(du, dv);
  const stepDist = speed * dt;

  if (dist <= stepDist || sim.timer <= 0) {
    const clamped = clampToPenWalkZone(sim.targetU, sim.targetV, w, h);
    sim.u = clamped.u;
    sim.v = clamped.v;
    sim.mode = 'idle';
    sim.timer = 1.8 + nextRand(sim) * 2.6;
    return { hop: 0, squash: 0 };
  }

  const next = clampToPenWalkZone(sim.u + (du / dist) * stepDist, sim.v + (dv / dist) * stepDist, w, h);
  sim.u = next.u;
  sim.v = next.v;
  sim.phase += dt * 9.5;
  return { hop: Math.abs(Math.sin(sim.phase)) * 0.55, squash: Math.sin(sim.phase * 2) * 0.025 };
}
