// ============================================================================
// Ladebild (Baustein 3, Entscheidung 19): Bild + Schriftzug + Balken + wechselnde Tipps wie Hay Day.
// Das Grundgerüst steht als HTML in index.html, damit es sofort sichtbar ist, bevor das Skript lädt.
// ============================================================================
import { CONTENT } from '../../core';

const TIP_KEY = 'winterhof_tipp';
const TIP_SECONDS = 4;
/** Dauer des Ausblendens, wie in index.html (#laden transition) */
const FADE_MS = 350;

/** Nächster Tipp je Start (jeder Start zeigt einen anderen, beginnend beim ersten). */
function firstTip(count: number): number {
  try {
    const n = Number(localStorage.getItem(TIP_KEY) ?? '0');
    const i = Number.isInteger(n) && n >= 0 ? n % count : 0;
    localStorage.setItem(TIP_KEY, String(i + 1));
    return i;
  } catch {
    return 0;
  }
}

export interface LoadingScreen {
  /** Fortschritt 0–1 */
  progress(p: number): void;
  /** Blendet das Ladebild weich aus und räumt auf. */
  close(): Promise<void>;
}

export function openLoadingScreen(): LoadingScreen {
  const el = document.getElementById('laden');
  const bar = document.getElementById('laden-balken');
  const tip = document.getElementById('laden-tipp');
  const tips = CONTENT.loadingTips;
  let i = firstTip(tips.length);
  if (tip) tip.textContent = tips[i] ?? '';
  const timer = window.setInterval(() => {
    i = (i + 1) % tips.length;
    if (tip) tip.textContent = tips[i] ?? '';
  }, TIP_SECONDS * 1000);
  let shown = 0;

  return {
    progress(p) {
      shown = Math.max(shown, Math.min(1, Math.max(0, p)));   // Balken läuft nie rückwärts
      if (bar) bar.style.transform = `scaleX(${shown})`;
      el?.setAttribute('aria-valuenow', String(Math.round(shown * 100)));
    },
    async close() {
      window.clearInterval(timer);
      if (!el) return;
      el.classList.add('fertig');
      // Ausblenden dauert 0,35 s (index.html). Ohne Zeichnen (Tab im Hintergrund) kommt kein transitionend, daher mit Frist.
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        await new Promise<void>((r) => {
          el.addEventListener('transitionend', () => r(), { once: true });
          window.setTimeout(r, FADE_MS + 150);
        });
      }
      el.remove();
    }
  };
}
