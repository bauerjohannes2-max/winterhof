// Deterministischer Zufall (mulberry32). Der Zustand liegt im Spielstand,
// damit Abläufe reproduzierbar und testbar sind.
export function nextRandom(state: { rngState: number }): number {
  let t = (state.rngState = (state.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state: { rngState: number }, min: number, maxIncl: number): number {
  return min + Math.floor(nextRandom(state) * (maxIncl - min + 1));
}

export function pick<T>(state: { rngState: number }, list: readonly T[]): T {
  if (list.length === 0) throw new Error('pick() auf leerer Liste');
  return list[Math.floor(nextRandom(state) * list.length)]!;
}
