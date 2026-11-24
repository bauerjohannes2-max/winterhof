// Wirtschaft (7-Tage-Bot), Zufallsverläufe 1, 2 – Regeln in bot.ts (Baustein 2c, Entscheidung 18).
import { describe, it } from 'vitest';
import { checkRun, runBot } from './bot';

describe('Wirtschaft (7-Tage-Bot)', () => {
  it('Verlauf 1: kommt voran, hängt nicht fest, Tempo etwa Stufe 15', () => checkRun(runBot(1)), 300_000);
  it('Verlauf 2: kommt voran, hängt nicht fest, Tempo etwa Stufe 15', () => checkRun(runBot(2)), 300_000);
});
