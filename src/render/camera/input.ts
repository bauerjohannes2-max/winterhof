// ============================================================================
// Eingabe → Kamera (Baustein 4): Zeigerereignisse (Finger, Maus, Stift) und Mausrad an das Kamera-Modell.
// Kein Spielzustand hier, nur Weiterreichen mit Zeitstempel.
// ============================================================================
import type { Camera } from './camera';

export interface InputHooks {
  /** Hilfsraster umschalten (bis Baustein 12: Taste G, Drei-Finger-Tipp) */
  toggleGrid(): void;
}

export function attachCameraInput(el: HTMLElement, camera: Camera, hooks: InputHooks): () => void {
  const sec = (e: Event): number => e.timeStamp / 1000;
  const pos = (e: PointerEvent | WheelEvent): { x: number; y: number } => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  let down = 0;

  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    const p = pos(e);
    camera.pointerDown(e.pointerId, p.x, p.y, sec(e));
    down++;
    if (down === 3) hooks.toggleGrid();
  };
  const onMove = (e: PointerEvent): void => {
    // Zwischenstände (getCoalescedEvents) gleichen Fingerbewegungen auf schnellen Bildschirmen aus
    const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const c of list.length > 0 ? list : [e]) {
      const p = pos(c);
      camera.pointerMove(e.pointerId, p.x, p.y, sec(c));
    }
  };
  const onUp = (e: PointerEvent): void => {
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    camera.pointerUp(e.pointerId, sec(e));
    down = Math.max(0, down - 1);
  };
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();                      // Seite nicht scrollen/zoomen
    const p = pos(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    camera.wheel(p.x, p.y, dy, e.ctrlKey);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'g' || e.key === 'G') hooks.toggleGrid();
  };
  const noGesture = (e: Event): void => e.preventDefault();   // Safari-Touchpad-Zoom der Seite verhindern

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('gesturestart', noGesture);
  window.addEventListener('keydown', onKey);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('gesturestart', noGesture);
    window.removeEventListener('keydown', onKey);
  };
}
