// ============================================================================
// Kamera (Baustein 4, Entscheidung 22, docs/GRAFIK_TECHNIK.md §2)
// Reines Rechenmodell ohne Pixi und ohne DOM: Finger/Maus rein, Mitte + Zoom raus. Zeit wird hereingereicht → testbar.
//  - Wischen mit Nachlauf (Abbremsen wie iOS-Listen, UIScrollView.DecelerationRate.normal = 0,998 je ms)
//  - Gummirand: über die Grenze hinaus nur gebremst (Apple-Formel, c = 0,55), beim Loslassen federt es zurück
//  - Zwei Finger: Zoom + Verschieben aus demselben Gestenstand, der Punkt zwischen den Fingern bleibt unter den Fingern
//  - Mausrad/Touchpad: weich zum Mauszeiger, harte Grenzen
//  - Zoom-Grenzen in Kacheln (bildschirmunabhängig): ganz raus = ganzes Tal, ganz rein = 8 Kacheln breit
// Einheiten: Bildschirm in CSS-Pixeln, Welt in Weltpunkten (iso.ts), Zoom = CSS-Pixel je Weltpunkt, Zeit in Sekunden.
// ============================================================================
import { TILE_W, type Point, type Rect } from '../scene/iso';

/** Apple-Gummirand-Konstante (Bremswirkung über die Grenze hinaus) */
const RUBBER_C = 0.55;
/** Nachlauf: Geschwindigkeit fällt je Millisekunde auf 99,8 % (iOS normal) */
const DECEL_PER_MS = 0.998;
/** Federhärte beim Zurückfedern (kritisch gedämpft, ≈ 0,35 s bis Ruhe) */
const SPRING_W = 14;
/** Zoom-Gummi: so weit (log) darf man über die Grenze ziehen, bevor es ganz fest wird */
const ZOOM_RUBBER_D = 0.3;
/** Mausrad: Annäherung an den Zielzoom (Zeitkonstante) */
const WHEEL_TAU = 0.07;
/** Ab dieser Fingerstrecke (CSS-Pixel) ist es Wischen statt Tippen (Apple ~10 pt) */
export const TOUCH_SLOP = 8;
/** Nachlauf endet unter dieser Geschwindigkeit (CSS-Pixel/s) */
const STOP_SPEED = 8;
/** Geschwindigkeit aus den Fingerbewegungen der letzten … Sekunden */
const VELOCITY_WINDOW = 0.1;
/** Liegt die letzte Fingerbewegung länger zurück, hat der Spieler angehalten → kein Nachlauf */
const HOLD_STILL = 0.08;
/** Ganz rein: so viele Kacheln passen in die Bildschirmbreite */
export const MAX_ZOOM_TILES = 8;

export interface CameraConfig {
  /** Bis hierhin darf der Bildschirm zeigen (Tal + Kulissenstreifen), Welt */
  readonly bounds: Rect;
  /** Ganz rausgezoomt passt dieses Rechteck ganz auf den Bildschirm (Tal + Kulissenstreifen), Welt */
  readonly fit: Rect;
  /** Schärfe-Grenze: höchstens so weit rein, dass ein Bildpunkt der Bilder mindestens einen Bildschirmpunkt deckt (Bildstufe / Zeichenauflösung) */
  readonly maxSharpZoom?: number;
}

/** Ganz rein laut Kachel-Regel (8 Kacheln breit) für eine Bildschirmbreite in CSS-Pixeln */
export function maxZoomForWidth(vw: number): number {
  return vw / (MAX_ZOOM_TILES * TILE_W);
}

export interface View { readonly cx: number; readonly cy: number; readonly zoom: number }

interface PointerSample { x: number; y: number; t: number }
type Mode = 'idle' | 'drag' | 'pinch' | 'glide' | 'settle' | 'wheel';

/** Apple: angezeigter Überstand zu tatsächlichem Überstand o bei Ausdehnung d */
export function rubber(o: number, d: number): number {
  return (1 - 1 / ((o * RUBBER_C) / d + 1)) * d;
}
/** Umkehrung von rubber (angezeigt → tatsächlich) */
export function unrubber(shown: number, d: number): number {
  const s = Math.min(shown, d * 0.999);
  return (d / RUBBER_C) * (s / (d - s));
}

function rubberClamp(raw: number, min: number, max: number, d: number): number {
  if (raw < min) return min - rubber(min - raw, d);
  if (raw > max) return max + rubber(raw - max, d);
  return raw;
}
function unrubberClamp(shown: number, min: number, max: number, d: number): number {
  if (shown < min) return min - unrubber(min - shown, d);
  if (shown > max) return max + unrubber(shown - max, d);
  return shown;
}
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export class Camera {
  private vw = 1;
  private vh = 1;
  private cx = 0;
  private cy = 0;
  private z = 1;
  /** Ungebremster Zoom (log) während zwei Finger ziehen (Gummirand rechnet daraus den angezeigten) */
  private rawLogZ = 0;
  private mode: Mode = 'idle';
  private readonly pointers = new Map<number, PointerSample>();
  private samples: PointerSample[] = [];
  private slopPassed = false;
  private downAt: PointerSample | null = null;
  private vx = 0;
  private vy = 0;
  /** Zurückfedern: Start, Ziel, Anker und Laufzeit */
  private settle: { lz0: number; lzT: number; anchor: Point; screen: Point; dx: number; dy: number; t: number } | null = null;
  /** Mausrad: Ziel-Zoom und Anker */
  private wheelState: { lzT: number; anchor: Point; screen: Point } | null = null;

  constructor(private readonly cfg: CameraConfig) {}

  // ---------------------------------------------------------------- Zustand
  get view(): View { return { cx: this.cx, cy: this.cy, zoom: this.z }; }
  /** Steht still (keine Geste, kein Nachlauf) → Darstellung darf auf ganze Bildpunkte runden */
  get idle(): boolean { return this.mode === 'idle'; }
  get state(): Mode { return this.mode; }

  zoomLimits(): { min: number; max: number } {
    const f = this.cfg.fit;
    const min = Math.min(this.vw / (f.x1 - f.x0), this.vh / (f.y1 - f.y0));
    const max = Math.max(min, Math.min(maxZoomForWidth(this.vw), this.cfg.maxSharpZoom ?? Infinity));
    return { min, max };
  }

  /** Erlaubter Bereich für die Bildmitte bei Zoom z (ist die Welt schmaler als der Bildschirm: Mitte fest) */
  centerRange(z: number): { minX: number; maxX: number; minY: number; maxY: number } {
    const b = this.cfg.bounds, hw = this.vw / (2 * z), hh = this.vh / (2 * z);
    let minX = b.x0 + hw, maxX = b.x1 - hw, minY = b.y0 + hh, maxY = b.y1 - hh;
    if (minX > maxX) minX = maxX = (b.x0 + b.x1) / 2;
    if (minY > maxY) minY = maxY = (b.y0 + b.y1) / 2;
    return { minX, maxX, minY, maxY };
  }

  /** Weltpunkt unter einem Bildschirmpunkt */
  screenToWorld(sx: number, sy: number): Point {
    return { x: this.cx + (sx - this.vw / 2) / this.z, y: this.cy + (sy - this.vh / 2) / this.z };
  }
  worldToScreen(x: number, y: number): Point {
    return { x: (x - this.cx) * this.z + this.vw / 2, y: (y - this.cy) * this.z + this.vh / 2 };
  }

  // ---------------------------------------------------------------- Setzen
  resize(vw: number, vh: number): void {
    this.vw = Math.max(1, vw);
    this.vh = Math.max(1, vh);
    this.stopMotion();
    this.applyHard(this.cx, this.cy, this.z);
  }

  /** Ansicht setzen (hart in die Grenzen) */
  setView(cx: number, cy: number, zoom: number): void {
    this.stopMotion();
    this.applyHard(cx, cy, zoom);
  }

  private applyHard(cx: number, cy: number, zoom: number): void {
    const lim = this.zoomLimits();
    this.z = clamp(zoom, lim.min, lim.max);
    const r = this.centerRange(this.z);
    this.cx = clamp(cx, r.minX, r.maxX);
    this.cy = clamp(cy, r.minY, r.maxY);
  }

  private stopMotion(): void {
    this.mode = this.pointers.size > 0 ? this.mode : 'idle';
    this.vx = this.vy = 0;
    this.settle = null;
    this.wheelState = null;
  }

  // ---------------------------------------------------------------- Finger / Maus
  pointerDown(id: number, x: number, y: number, t: number): void {
    // Jede Berührung fängt Nachlauf, Federn und Mausrad sofort ab (wie iOS)
    this.settle = null;
    this.wheelState = null;
    this.vx = this.vy = 0;
    this.pointers.set(id, { x, y, t });
    this.beginGesture(t);
  }

  pointerMove(id: number, x: number, y: number, t: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    if (this.mode === 'drag') {
      if (!this.slopPassed && this.downAt) {
        if (Math.hypot(x - this.downAt.x, y - this.downAt.y) < TOUCH_SLOP) { p.x = x; p.y = y; p.t = t; return; }
        this.slopPassed = true;               // ab hier verschieben, ohne Sprung um die Schwelle
      } else {
        this.moveRaw(-(x - p.x) / this.z, -(y - p.y) / this.z, this.z);
      }
      p.x = x; p.y = y; p.t = t;
      this.samples.push({ x, y, t });
      // Fenster der letzten 0,1 s, aber immer mit einem Punkt davor (seltene Fingermeldungen ergeben sonst keine Geschwindigkeit)
      while (this.samples.length > 2 && t - (this.samples[1]?.t ?? t) > VELOCITY_WINDOW) this.samples.shift();
      return;
    }
    if (this.mode === 'pinch') {
      const [a, b] = this.twoPointers();
      if (!a || !b) return;
      const c0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d0 = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = x; p.y = y; p.t = t;
      const c1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d1 = Math.hypot(a.x - b.x, a.y - b.y);
      if (d0 < 1 || d1 < 1) return;
      // Weltpunkt zwischen den Fingern bleibt zwischen den Fingern
      const anchor = this.screenToWorld(c0.x, c0.y);
      this.rawLogZ += Math.log(d1 / d0);
      const z = this.shownZoom(this.rawLogZ);
      const wantX = anchor.x - (c1.x - this.vw / 2) / z, wantY = anchor.y - (c1.y - this.vh / 2) / z;
      this.moveRaw(wantX - this.cx, wantY - this.cy, z);
    }
  }

  pointerUp(id: number, t: number): void {
    if (!this.pointers.delete(id)) return;
    if (this.mode === 'pinch') {
      if (this.pointers.size === 1) { this.beginGesture(t); return; }   // ein Finger bleibt: weiter wischen, ohne Sprung
    }
    if (this.pointers.size > 0) return;
    if (this.mode === 'drag' && this.slopPassed) {
      const first = this.samples[0], last = this.samples[this.samples.length - 1];
      // Finger vor dem Loslassen still gehalten → kein Nachlauf
      if (first && last && last.t > first.t && t - last.t < HOLD_STILL) {
        this.vx = -((last.x - first.x) / (last.t - first.t)) / this.z;
        this.vy = -((last.y - first.y) / (last.t - first.t)) / this.z;
      }
    }
    this.release();
  }

  /** Mausrad / Touchpad (ctrl = Zwei-Finger-Zoom am Touchpad) */
  wheel(x: number, y: number, deltaY: number, ctrl: boolean): void {
    if (this.pointers.size > 0) return;
    this.settle = null;
    this.vx = this.vy = 0;
    const factor = clamp(Math.exp(-deltaY * (ctrl ? 0.01 : 0.002)), 0.5, 2);
    const lim = this.zoomLimits();
    const base = this.wheelState ? this.wheelState.lzT : Math.log(this.z);
    const lzT = clamp(base + Math.log(factor), Math.log(lim.min), Math.log(lim.max));
    this.wheelState = { lzT, anchor: this.screenToWorld(x, y), screen: { x, y } };
    this.mode = 'wheel';
  }

  // ---------------------------------------------------------------- Bewegung je Bild
  update(dt: number): void {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.1);                   // nach Pause/Tab-Wechsel nicht springen
    if (this.mode === 'glide') this.updateGlide(dt);
    else if (this.mode === 'settle') this.updateSettle(dt);
    else if (this.mode === 'wheel') this.updateWheel(dt);
  }

  private updateGlide(dt: number): void {
    const r = this.centerRange(this.z);
    const ax = this.glideAxis(this.cx, this.vx, r.minX, r.maxX, dt);
    const ay = this.glideAxis(this.cy, this.vy, r.minY, r.maxY, dt);
    this.cx = ax.p; this.vx = ax.v; this.cy = ay.p; this.vy = ay.v;
    const speed = Math.hypot(this.vx, this.vy) * this.z;
    if (speed < STOP_SPEED && ax.rest && ay.rest) {
      this.cx = clamp(this.cx, r.minX, r.maxX);
      this.cy = clamp(this.cy, r.minY, r.maxY);
      this.vx = this.vy = 0;
      this.mode = 'idle';
    }
  }

  /** Eine Achse: innen frei abbremsen, außen kritisch gedämpfte Feder zur Grenze (Überschwingen beim Anprall inklusive) */
  private glideAxis(p: number, v: number, min: number, max: number, dt: number): { p: number; v: number; rest: boolean } {
    const edge = p < min ? min : p > max ? max : null;
    if (edge === null) {
      const k = Math.pow(DECEL_PER_MS, dt * 1000);
      // exakt integriert: Strecke = v · (k − 1) / ln(Abbremsfaktor je s)
      const lnPerS = Math.log(DECEL_PER_MS) * 1000;
      // Über den Rand hinaus übernimmt ab dem nächsten Bild die Feder (Anprall mit Überschwingen)
      const np = p + (v * (k - 1)) / lnPerS;
      const nv = v * k;
      return { p: np, v: nv, rest: Math.abs(nv) * this.z < STOP_SPEED && np >= min && np <= max };
    }
    const x0 = p - edge, w = SPRING_W, e = Math.exp(-w * dt);
    const x = (x0 + (v + w * x0) * dt) * e;
    const nv = (v - w * dt * (v + w * x0)) * e;
    const rest = Math.abs(x) * this.z < 0.3 && Math.abs(nv) * this.z < STOP_SPEED;
    return { p: rest ? edge : edge + x, v: rest ? 0 : nv, rest };
  }

  private updateSettle(dt: number): void {
    const s = this.settle;
    if (!s) { this.mode = 'idle'; return; }
    s.t += dt;
    const w = SPRING_W, prog = 1 - (1 + w * s.t) * Math.exp(-w * s.t);
    const done = prog > 0.9995;
    const p = done ? 1 : prog;
    this.z = Math.exp(s.lz0 + (s.lzT - s.lz0) * p);
    // Zoom um den Anker, dazu anteilig die Korrektur in die Grenzen
    this.cx = s.anchor.x - (s.screen.x - this.vw / 2) / this.z + s.dx * p;
    this.cy = s.anchor.y - (s.screen.y - this.vh / 2) / this.z + s.dy * p;
    if (done) { this.settle = null; this.mode = 'idle'; }
  }

  private updateWheel(dt: number): void {
    const s = this.wheelState;
    if (!s) { this.mode = 'idle'; return; }
    const lz = Math.log(this.z), k = 1 - Math.exp(-dt / WHEEL_TAU);
    const done = Math.abs(s.lzT - lz) < 0.0005;
    this.z = Math.exp(done ? s.lzT : lz + (s.lzT - lz) * k);
    const r = this.centerRange(this.z);
    this.cx = clamp(s.anchor.x - (s.screen.x - this.vw / 2) / this.z, r.minX, r.maxX);
    this.cy = clamp(s.anchor.y - (s.screen.y - this.vh / 2) / this.z, r.minY, r.maxY);
    if (done) { this.wheelState = null; this.mode = 'idle'; }
  }

  // ---------------------------------------------------------------- intern
  private beginGesture(t: number): void {
    const fromPinch = this.mode === 'pinch';
    // Ungebremsten Zoom aus dem angezeigten zurückrechnen: Wer in den Gummirand greift, zieht ohne Sprung weiter
    const lim = this.zoomLimits();
    this.rawLogZ = unrubberClamp(Math.log(this.z), Math.log(lim.min), Math.log(lim.max), ZOOM_RUBBER_D);
    this.samples = [];
    if (this.pointers.size >= 2) {
      this.mode = 'pinch';
      this.slopPassed = true;
      return;
    }
    const only = [...this.pointers.values()][0];
    this.mode = 'drag';
    // Schwelle nur beim ersten Aufsetzen; bleibt nach dem Zoomen ein Finger liegen, wischt er sofort weiter
    this.slopPassed = fromPinch;
    this.downAt = only ? { ...only } : null;
    if (only) this.samples.push({ x: only.x, y: only.y, t });
  }

  /** Verschiebt um Δ (Welt) auf der ungebremsten Lage und zeigt sie mit Gummirand an; Zoom z gilt ab jetzt */
  private moveRaw(dx: number, dy: number, z: number): void {
    const r = this.centerRange(z);
    const rawX = unrubberClamp(this.cx, r.minX, r.maxX, this.vw / z) + dx;
    const rawY = unrubberClamp(this.cy, r.minY, r.maxY, this.vh / z) + dy;
    this.z = z;
    this.cx = rubberClamp(rawX, r.minX, r.maxX, this.vw / z);
    this.cy = rubberClamp(rawY, r.minY, r.maxY, this.vh / z);
  }

  private shownZoom(rawLog: number): number {
    const lim = this.zoomLimits();
    return Math.exp(rubberClamp(rawLog, Math.log(lim.min), Math.log(lim.max), ZOOM_RUBBER_D));
  }

  private twoPointers(): [PointerSample | undefined, PointerSample | undefined] {
    const it = this.pointers.values();
    return [it.next().value, it.next().value];
  }

  /** Loslassen: liegt Zoom oder Mitte außerhalb → zurückfedern, sonst Nachlauf */
  private release(): void {
    const lim = this.zoomLimits();
    const zT = clamp(this.z, lim.min, lim.max);
    if (Math.abs(Math.log(zT / this.z)) > 1e-6) {
      // Zoom federt zurück, Anker = Bildmitte; Mitte landet gleichzeitig in den Grenzen
      const screen = { x: this.vw / 2, y: this.vh / 2 };
      const anchor = this.screenToWorld(screen.x, screen.y);
      const r = this.centerRange(zT);
      this.settle = {
        lz0: Math.log(this.z), lzT: Math.log(zT), anchor, screen, t: 0,
        dx: clamp(anchor.x, r.minX, r.maxX) - anchor.x, dy: clamp(anchor.y, r.minY, r.maxY) - anchor.y
      };
      this.vx = this.vy = 0;
      this.mode = 'settle';
      return;
    }
    this.mode = 'glide';
    this.updateGlide(0.000001);              // steht schon still und innen → sofort ruhig
  }
}
