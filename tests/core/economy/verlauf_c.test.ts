// Wirtschaft (7-Tage-Bot), Zufallsverläufe 5, 6 – Regeln in bot.ts (Baustein 2c, Entscheidung 18).
import { describe, it } from 'vitest';
import { checkRun, runBot } from './bot';

describe('Wirtschaft (7-Tage-Bot)', () => {
  it('Verlauf 5: kommt voran, hängt nicht fest, Tempo etwa Stufe 15', () => checkRun(runBot(5)), 300_000);
  it('Verlauf 6: kommt voran, hängt nicht fest, Tempo etwa Stufe 15', () => checkRun(runBot(6)), 300_000);
});
