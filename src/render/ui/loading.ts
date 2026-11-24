// ============================================================================
// Ladebild (Baustein 3, Entscheidung 19): Bild + Schriftzug + Balken + wechselnde Tipps wie Hay Day.
// Das Grundgerüst und das Einblenden stehen in index.html (Inline-Skript), damit das Ladebild sofort und als
// EIN fertiges Bild erscheint: Motiv, Schriftzug, Tipp und Balken gemeinsam, erst wenn das Motiv dekodiert ist.
// Hier: Balken, Tipp-Wechsel und weiches Ausblenden – nie bevor das Ladebild kurz zu sehen war (kein Aufblitzen).
// ============================================================================
import { CONTENT } from '../../core';

const TIP_SECONDS = 4;
/** Dauer des Ausblendens, wie in index.html (#laden transition) */
const FADE_MS = 350;
/** Einblenden (Scharfstellen) dauert 0,7 s (index.html); danach steht das Ladebild mindestens 0,7 s ganz da. */
const MIN_VISIBLE_MS = 700 + 700;
/** Wie im Inline-Skript: spätestens nach 4 s ist das Ladebild gezeigt (auch ohne Motiv). */
const SHOW_DEADLINE_MS = 4000;
/** Balken füllt sich in 0,2 s (index.html), dann 0,2 s voll stehen lassen. */
const BAR_FULL_MS = 200 + 200;

export interface LoadingScreen {
  /** Fortschritt 0–1 */
  progress(p: number): void;
  /** Blendet das Ladebild weich aus und räumt auf. */
  close(): Promise<void>;
}

const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

/** Wartet, bis das Inline-Skript das Ladebild eingeblendet hat (Klasse „bereit“). */
function shown(el: HTMLElement): Promise<void> {
  if (el.classList.contains('bereit')) return Promise.resolve();
  return new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (el.classList.contains('bereit')) { obs.disconnect(); resolve(); }
    });
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    window.setTimeout(() => { obs.disconnect(); el.classList.add('bereit'); resolve(); }, SHOW_DEADLINE_MS + 500);
  });
}

export function openLoadingScreen(): LoadingScreen {
  const el = document.getElementById('laden');
  const bar = document.getElementById('laden-balken');
  const tip = document.getElementById('laden-tipp');
  const tips = CONTENT.loadingTips;
  let i = Number(el?.dataset['tipp'] ?? '0');
  if (!Number.isInteger(i) || i < 0) i = 0;
  const timer = window.setInterval(() => {
    i = (i + 1) % tips.length;
    if (tip) tip.textContent = tips[i] ?? '';
  }, TIP_SECONDS * 1000);
  let progress = 0;

  return {
    progress(p) {
      progress = Math.max(progress, Math.min(1, Math.max(0, p)));   // Balken läuft nie rückwärts
      if (bar) bar.style.transform = `scaleX(${progress})`;
      el?.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    },
    async close() {
      if (!el) { window.clearInterval(timer); return; }
      await shown(el);
      const since = Number(el.dataset['seit'] ?? '0');
      const rest = MIN_VISIBLE_MS - (performance.now() - since);
      // Der volle Balken ist kurz zu sehen, bevor ausgeblendet wird (Füllen 0,2 s in index.html + kurzes Halten)
      await wait(Math.max(rest, BAR_FULL_MS));
      window.clearInterval(timer);
      el.classList.add('fertig');
      // Ohne Zeichnen (Tab im Hintergrund) kommt kein transitionend, daher mit Frist.
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        await new Promise<void>((r) => {
          el.addEventListener('transitionend', (e) => { if (e.target === el) r(); });
          window.setTimeout(r, FADE_MS + 150);
        });
      }
      el.remove();
    }
  };
}
