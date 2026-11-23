// ============================================================================
// Winterhof – immer Querformat
// Hält man das Handy hochkant, wird die ganze App per CSS um 90° gedreht
// (body.is-portrait #app). Diese Hilfen rechnen Größen und Touch-Punkte um,
// damit Spiel und Eingabe in beiden Haltungen gleich funktionieren.
// ============================================================================

export function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

/** Spielfläche (immer breiter als hoch). */
export function viewSize() {
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  return isPortrait() ? { w: h, h: w } : { w, h };
}

/** Bildschirmpunkt (clientX/Y) -> Punkt in der gedrehten Spielfläche. */
export function toView(clientX, clientY) {
  if (!isPortrait()) return { x: clientX, y: clientY };
  return { x: clientY, y: window.innerWidth - clientX };
}

export const vx = (e) => toView(e.clientX, e.clientY).x;
export const vy = (e) => toView(e.clientX, e.clientY).y;

/** Mitte eines DOM-Elements in Spielflächen-Koordinaten. */
export function elementCenter(el) {
  const r = el.getBoundingClientRect();
  return toView(r.left + r.width / 2, r.top + r.height / 2);
}

export function applyOrientationClass() {
  document.body.classList.toggle('is-portrait', isPortrait());
}

/** Android/installierte PWA: echtes Querformat anfordern, wo der Browser es erlaubt. */
export function tryLockLandscape() {
  try {
    const o = screen.orientation;
    if (o && typeof o.lock === 'function') o.lock('landscape').catch(() => {});
  } catch {
    /* nicht unterstützt (z. B. iOS Safari) – CSS-Drehung übernimmt */
  }
}
