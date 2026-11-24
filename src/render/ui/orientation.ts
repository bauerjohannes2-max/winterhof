// ============================================================================
// Nur Querformat (STIL_REGELN, Entscheidung 19): Hochkant pausiert das Spiel.
// Den Hinweis „Bitte quer halten“ zeigt CSS sofort (index.html, auch vor dem Laden);
// hier wird nur die Zeit angehalten, damit hochkant nichts weiterläuft und kein Akku verbraucht wird.
// ============================================================================

const PORTRAIT = '(orientation: portrait)';

export function isPortrait(): boolean {
  return window.matchMedia(PORTRAIT).matches;
}

/** Ruft onChange(hochkant) bei jedem Wechsel und einmal sofort auf. */
export function watchOrientation(onChange: (portrait: boolean) => void): () => void {
  const mq = window.matchMedia(PORTRAIT);
  const handler = (): void => onChange(mq.matches);
  mq.addEventListener('change', handler);
  handler();
  return () => mq.removeEventListener('change', handler);
}
