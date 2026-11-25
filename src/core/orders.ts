// ============================================================================
// Winterhof Core – Aufträge passend zum Hof (Baustein 2c, Entscheidung 18)
// Vorbild Hay Day: Die Tafel verlangt nur, was der Hof gerade herstellen kann,
// mischt leichte und anspruchsvolle Aufträge, und der Lohn folgt dem Aufwand.
// Damit hängt der Fortschritt nicht mehr vom Glück einzelner Aufträge ab.
// ============================================================================
import { CONTENT } from './content';
import { nextRandom, randInt } from './rng';
import type { GameState, ItemId, OrderLine, OrderReward, OrderTier } from './types';

/** Kann der Hof diese Ware jetzt herstellen? (Feldfrucht freigeschaltet, Tier vorhanden, Gebäude + alle Zutaten herstellbar) */
export function makeableItems(s: GameState): Set<ItemId> {
  const stations = new Set(s.objects.filter((o) => o.kind === 'station').map((o) => o.type));
  const animals = new Set(s.objects.flatMap((o) => (o.kind === 'pen' && o.animals.length > 0 ? [CONTENT.pens[o.type]?.animal] : [])));
  const memo = new Map<ItemId, boolean>();
  const can = (id: ItemId, depth = 0): boolean => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    const it = CONTENT.items[id];
    let ok = false;
    if (it && it.unlockLevel <= s.level && depth < 8) {
      if (it.category === 'crop') ok = true;
      else if (it.category === 'animal') ok = Object.values(CONTENT.animals).some((a) => a.produceItem === id && animals.has(a.id));
      else if (it.category === 'crafted') ok = !!it.station && stations.has(it.station) && Object.keys(it.ingredients ?? {}).every((i) => can(i, depth + 1));
    }
    memo.set(id, ok);
    return ok;
  };
  return new Set(Object.keys(CONTENT.items).filter((id) => can(id)));
}

/** Stufe einer Ware für die Auftragsmischung: Rohware, einfache Verarbeitung (nur Rohzutaten), mehrstufig. */
export function itemTier(id: ItemId): OrderTier {
  const it = CONTENT.items[id]!;
  if (it.category !== 'crafted') return 'easy';
  const nested = Object.keys(it.ingredients ?? {}).some((i) => CONTENT.items[i]?.category === 'crafted');
  return nested ? 'hard' : 'medium';
}

const TIER_ITEMS: Record<OrderTier, readonly OrderTier[]> = { easy: ['easy'], medium: ['easy', 'medium'], hard: ['easy', 'medium', 'hard'] };

/** Größe eines Kartenstapels: Gewichte × BAG_SIZE Karten, gemischt, eine nach der anderen gezogen. */
const BAG_SIZE = 20;

function fillBag<K extends string>(s: GameState, table: Record<K, { weight: number }>): K[] {
  const entries = Object.entries(table) as [K, { weight: number }][];
  const total = entries.reduce((a, [, v]) => a + v.weight, 0);
  const bag: K[] = [];
  for (const [k, v] of entries) for (let i = 0; i < Math.max(1, Math.round((v.weight / total) * BAG_SIZE)); i++) bag.push(k);
  for (let i = bag.length - 1; i > 0; i--) {             // Fisher-Yates mit dem Zufall aus dem Spielstand
    const j = Math.floor(nextRandom(s) * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag;
}

/** Zieht die nächste Schwierigkeit und Lohn-Art vom Stapel (Shuffle Bag statt Würfeln: keine langen Glücks- oder Pechsträhnen). */
function drawFromBags(s: GameState): { tier: OrderTier; reward: OrderReward } {
  const bag = (s.orderBag ??= { tiers: [], rewards: [] });
  if (!bag.tiers.length) bag.tiers = fillBag(s, CONTENT.orders.tiers);
  if (!bag.rewards.length) bag.rewards = fillBag(s, CONTENT.orders.rewards);
  return { tier: bag.tiers.pop()!, reward: bag.rewards.pop()! };
}

/** Zielwert eines Auftrags in Münzen (Warenwert) je Stufe und Schwierigkeit. */
export function orderValueTarget(level: number, tier: OrderTier): number {
  const r = CONTENT.orders;
  return r.valueBase * Math.pow(level, r.valueExp) * r.tiers[tier].mult;
}

export interface ComposedOrder { lines: OrderLine[]; coins: number; xp: number; tier: OrderTier; reward: OrderReward }

/** Stellt einen Auftrag zusammen (deterministisch über den Zufall im Spielstand). */
export function composeOrder(s: GameState): ComposedOrder {
  const rules = CONTENT.orders;
  const makeable = [...makeableItems(s)].filter((id) => !['material', 'tool'].includes(CONTENT.items[id]!.category));
  const drawn = drawFromBags(s);
  let tier = drawn.tier;
  // anspruchsvoll nur, wenn der Hof mehrstufige Waren kann; sonst eine Stufe leichter
  while (tier !== 'easy' && !makeable.some((id) => itemTier(id) === tier)) tier = tier === 'hard' ? 'medium' : 'easy';
  const target = orderValueTarget(s.level, tier);
  const pool = makeable.filter((id) => TIER_ITEMS[tier].includes(itemTier(id)));
  const lineCount = Math.min(pool.length, randInt(s, rules.tiers[tier].minLines, rules.tiers[tier].maxLines));

  const chosen: ItemId[] = [];
  // Mindestens eine Ware der gewählten Stufe, damit „anspruchsvoll“ auch anspruchsvoll ist
  const pickFrom = (list: ItemId[]) => {
    const affordable = list.filter((id) => CONTENT.items[id]!.sellPrice <= target / Math.max(1, lineCount - chosen.length) * 1.2);
    const from = affordable.length ? affordable : [list.reduce((a, b) => (CONTENT.items[a]!.sellPrice <= CONTENT.items[b]!.sellPrice ? a : b))];
    // Waren im Lager werden öfter verlangt (wie Hay Day): Gewicht 3 statt 1
    const w = from.map((id) => (s.inventory[id] ?? 0) > 0 ? 3 : 1);
    let r = nextRandom(s) * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < from.length; i++) { r -= w[i]!; if (r < 0) return from[i]!; }
    return from[from.length - 1]!;
  };
  const core = pool.filter((id) => itemTier(id) === tier && !chosen.includes(id));
  if (core.length) chosen.push(pickFrom(core));
  while (chosen.length < lineCount) {
    const rest = pool.filter((id) => !chosen.includes(id));
    if (!rest.length) break;
    chosen.push(pickFrom(rest));
  }

  // Mengen so, dass der Warenwert den Zielwert ungefähr trifft
  let remaining = target;
  const lines: OrderLine[] = chosen.map((item, i) => {
    const it = CONTENT.items[item]!;
    const share = remaining / (chosen.length - i);
    const cap = it.category === 'crafted' ? rules.maxQtyCrafted : rules.maxQtyRaw;
    const qty = Math.max(1, Math.min(cap, Math.round(share / it.sellPrice)));
    remaining = Math.max(0, remaining - qty * it.sellPrice);
    return { item, qty };
  });

  const reward = drawn.reward;
  const value = lines.reduce((a, l) => a + CONTENT.items[l.item]!.sellPrice * l.qty, 0);
  const xp = lines.reduce((a, l) => a + (CONTENT.items[l.item]!.xp ?? 0) * l.qty, 0);
  return {
    lines, tier, reward,
    coins: Math.max(1, Math.round(value * rules.coinFactor * rules.rewards[reward].coinMult)),
    xp: Math.max(1, Math.round(xp * rules.xpFactor * rules.rewards[reward].xpMult))
  };
}
