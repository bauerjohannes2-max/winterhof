// Wirtschaft (7-Tage-Bot), Zufallsverläufe 3, 4 – Regeln in bot.ts (Baustein 2c, Entscheidung 18).
import { describe, it } from 'vitest';
import { checkRun, runBot } from './bot';

describe('Wirtschaft (7-Tage-Bot)', () => {
  it('Verlauf 3: kommt voran, hängt nicht fest, Tempo etwa Stufe 15', () => checkRun(runBot(3)), 300_000);
  it('Verlauf 4: kommt voran, hängt nicht fest, Tempo etwa Stufe 15', () => checkRun(runBot(4)), 300_000);
});
