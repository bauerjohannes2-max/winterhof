// Baustein 2c: Aufträge passend zum Hof, Mischung per Kartenstapel, Lohn-Art, steigende Tierpreise.
import { describe, expect, it } from 'vitest';
import {
  CONTENT, animalCount, animalPrice, applyCommand, composeOrder, createNewGame, itemTier, makeableItems, orderValueTarget, type GameState
} from '../../src/core';

const T0 = Date.UTC(2026, 10, 24, 9, 0, 0);

function midGame(seed = 3): GameState {
  const s = createNewGame(T0, seed);
  s.level = 12;
  // Patisserie + Rentier dazu: macht mehrstufige Waren (Beerentarte aus Butterplätzchen, Sternenmilch) möglich
  s.objects.push({ id: 'st_test', kind: 'station', type: 'patisserie', gx: -10, gy: -10, wrapped: false, queue: [], ready: [], craftedCount: 0 });
  s.objects.push({ id: 'pen_test', kind: 'pen', type: 'reindeer_pen', gx: -12, gy: -12, animals: [{ id: 'a_test', nick: 'Test', state: 'hungry', readyAt: T0, lastPet: 0 }] });
  return s;
}

describe('Aufträge passend zum Hof', () => {
  it('verlangen nur Waren, die der Hof gerade herstellen kann (inkl. aller Zutaten)', () => {
    const s = midGame();
    const can = makeableItems(s);
    for (const id of can) {
      const it = CONTENT.items[id]!;
      if (it.category === 'crafted') {
        expect(s.objects.some((o) => o.kind === 'station' && o.type === it.station), id).toBe(true);
        for (const ing of Object.keys(it.ingredients ?? {})) expect(can.has(ing), `${id} braucht ${ing}`).toBe(true);
      }
    }
    for (let i = 0; i < 60; i++) for (const l of composeOrder(s).lines) expect(can.has(l.item), l.item).toBe(true);
  });

  it('Mischung kommt vom Kartenstapel: je 20 Aufträge genau nach Gewicht, keine langen Strähnen', () => {
    const s = midGame();
    const counts = { easy: 0, medium: 0, hard: 0 }, rewards = { coins: 0, xp: 0 };
    for (let i = 0; i < 20; i++) { const o = composeOrder(s); counts[o.tier]++; rewards[o.reward]++; }
    const t = CONTENT.orders.tiers;
    expect(counts).toEqual({ easy: Math.round(t.easy.weight * 20), medium: Math.round(t.medium.weight * 20), hard: Math.round(t.hard.weight * 20) });
    expect(rewards).toEqual({ coins: 10, xp: 10 });
  });

  it('anspruchsvoll enthält eine mehrstufige Ware; ohne passende Gebäude wird es leichter statt unmöglich', () => {
    const s = midGame();
    for (let i = 0; i < 40; i++) {
      const o = composeOrder(s);
      if (o.tier === 'hard') expect(o.lines.some((l) => itemTier(l.item) === 'hard')).toBe(true);
    }
    const bare = createNewGame(T0, 5);
    bare.objects = bare.objects.filter((o) => o.kind !== 'station');
    for (let i = 0; i < 20; i++) expect(composeOrder(bare).tier).toBe('easy');
  });

  it('Lohn folgt Aufwand und Stufe; Münz-Aufträge zahlen mehr Münzen, Erfahrungs-Aufträge mehr Erfahrung', () => {
    expect(orderValueTarget(12, 'hard')).toBeGreaterThan(orderValueTarget(12, 'easy'));
    expect(orderValueTarget(15, 'medium')).toBeGreaterThan(orderValueTarget(5, 'medium'));
    const s = midGame();
    const ratio = { coins: [] as number[], xp: [] as number[] };
    for (let i = 0; i < 40; i++) { const o = composeOrder(s); ratio[o.reward].push(o.coins / o.xp); }
    const avg = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
    expect(avg(ratio.coins)).toBeGreaterThan(avg(ratio.xp) * 2);
  });

  it('gleicher Spielstand + gleicher Zufall = gleicher Auftrag (Server-fähig)', () => {
    expect(composeOrder(midGame(9))).toEqual(composeOrder(midGame(9)));
  });
});

describe('Münz-Ausgaben', () => {
  it('jedes weitere Tier derselben Art kostet mehr (Hay Day)', () => {
    const s = createNewGame(T0, 1);
    s.coins = 10_000;
    const owned = animalCount(s, 'chicken');
    const first = animalPrice(s, 'chicken');
    expect(first).toBe(Math.round(CONTENT.animals.chicken!.cost * (1 + CONTENT.animalCostStep * owned) / 5) * 5);
    const r = applyCommand(s, { type: 'buyAnimal', penId: 'pen_1' }, T0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(s.coins - r.state.coins).toBe(first);
      expect(animalPrice(r.state, 'chicken')).toBeGreaterThan(first);
    }
  });

  it('Deko gibt wenig Erfahrung je Münze (sonst wird Deko zur Stufen-Maschine)', () => {
    for (const d of Object.values(CONTENT.decorations)) expect(d.xp / Math.max(1, d.cost), d.id).toBeLessThanOrEqual(0.07);
  });
});
