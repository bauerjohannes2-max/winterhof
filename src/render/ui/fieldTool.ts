// ============================================================================
// Hay-Day-Feldwerkzeug (Baustein 9, Entscheidung 69)
//   - Reifes Feld: daumengroße Sichel (Tippen erntet Feld, Ziehen erntet alle überstrichenen reifen Felder)
//   - Leeres Feld: Saat-Leiste mit freigeschalteten Früchten (Bestand/Preis + Dauer, Tippen & Wischen)
//   - Wachsendes Feld: kompakte Fortschritts- & Restzeitanzeige (wechselt automatisch auf Sichel)
// ============================================================================
import {
  CONTENT, fieldGrowth, unlockedCrops,
  type FieldObject, type GameState
} from '../../core';
import type { Camera } from '../camera/camera';
import { fieldsAlongSegment } from '../scene/fields';
import { placement } from '../scene/objects';

export interface FieldToolCallbacks {
  getState(): Readonly<GameState>;
  getNow(): number;
  onHarvest(field: FieldObject): boolean;
  onPlant(field: FieldObject, cropId: string): boolean;
}

const CROP_TINTS: Record<string, string> = {
  wheat: '#f5c948',
  berries: '#e03242',
  matcha: '#78cf48',
  cocoa: '#8f552b',
  cinnamon: '#c97b3f',
  candycane: '#f0444a',
  apples: '#de2c2f',
  almonds: '#dfb06f',
  fir_greens: '#43964d',
  walnuts: '#b28249'
};

function sickleSvg(size = 30): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" aria-hidden="true">
    <path d="M9 28 L15 21" stroke="#7d4a1d" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 22 C10 13, 18 5, 29 7 C24 11, 22 17, 17 22 Z" fill="#eef4fa" stroke="#31475e" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 19 C15 13, 20 8, 27 8" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

function seedSvg(cropId: string, size = 24): string {
  const col = CROP_TINTS[cropId] ?? '#ffd76a';
  return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="10.5" fill="${col}" stroke="#16294a" stroke-width="2"/>
    <circle cx="11" cy="10.5" r="3" fill="#ffffff" opacity="0.55"/>
  </svg>`;
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${m}m` : `${m}m ${rest}s`;
}

export class FieldTool {
  private readonly root: HTMLElement;
  private readonly dragger: HTMLElement;
  private readonly canvas: HTMLElement;
  private readonly camera: Camera;
  private readonly cb: FieldToolCallbacks;

  private selectedFieldId: string | null = null;
  private mode: 'sichel' | 'saat' | 'wachstum' | null = null;
  private progressBar: HTMLElement | null = null;
  private timeLabel: HTMLElement | null = null;
  private dragActive = false;

  constructor(canvas: HTMLElement, camera: Camera, cb: FieldToolCallbacks) {
    this.canvas = canvas;
    this.camera = camera;
    this.cb = cb;

    this.root = document.createElement('div');
    this.root.id = 'feld-werkzeug';
    this.root.hidden = true;
    document.body.appendChild(this.root);

    this.dragger = document.createElement('div');
    this.dragger.id = 'feld-zieher';
    document.body.appendChild(this.dragger);
  }

  get isOpen(): boolean {
    return this.selectedFieldId !== null;
  }

  open(field: FieldObject): void {
    this.selectedFieldId = field.id;
    this.render();
  }

  close(): void {
    if (this.dragActive) return;
    this.selectedFieldId = null;
    this.mode = null;
    this.root.hidden = true;
    this.root.innerHTML = '';
    delete this.root.dataset['feldWerkzeug'];
    delete this.root.dataset['feldId'];
    this.progressBar = null;
    this.timeLabel = null;
  }

  /** Nach State-Änderung (z. B. nach Aussaat/Ernte) aktualisieren. */
  refresh(): void {
    if (!this.selectedFieldId || this.dragActive) return;
    this.render();
  }

  /** Im Ticker aufrufen: hält Lage bei weicher Kamera und Countdown aktuell. */
  tick(now: number): void {
    if (!this.selectedFieldId) return;
    const f = this.currentField();
    if (!f) { this.close(); return; }
    this.positionAt(f);
    if (this.mode === 'wachstum') {
      const g = fieldGrowth(f, now);
      if (!g || g.ready) {
        this.render();
        return;
      }
      if (this.progressBar) this.progressBar.style.width = `${Math.round(g.progress * 100)}%`;
      if (this.timeLabel) this.timeLabel.textContent = formatDuration(g.remainingMs);
    }
  }

  destroy(): void {
    this.root.remove();
    this.dragger.remove();
  }

  private currentField(): FieldObject | null {
    if (!this.selectedFieldId) return null;
    const o = this.cb.getState().objects.find((x) => x.id === this.selectedFieldId);
    return o && o.kind === 'field' ? o : null;
  }

  private render(): void {
    const f = this.currentField();
    if (!f) { this.close(); return; }
    const now = this.cb.getNow();
    const state = this.cb.getState();
    const growth = fieldGrowth(f, now);

    this.root.hidden = false;
    this.root.classList.remove('ziehen');
    this.root.dataset['feldId'] = f.id;
    this.progressBar = null;
    this.timeLabel = null;

    if (growth?.ready) {
      this.mode = 'sichel';
      this.root.dataset['feldWerkzeug'] = 'sichel';
      this.root.innerHTML = `<div class="fw-karte">
        <button type="button" class="fw-btn" data-tool="sichel" aria-label="Feld ernten – wischen für weitere Felder">
          ${sickleSvg(30)}
          <span>Ernten</span>
        </button>
      </div>`;
      const btn = this.root.querySelector<HTMLButtonElement>('[data-tool="sichel"]');
      if (btn) this.attachToolSwipe(btn, 'sichel');
    } else if (!growth) {
      this.mode = 'saat';
      this.root.dataset['feldWerkzeug'] = 'saat';
      const crops = unlockedCrops(state);
      const buttons = crops.map((c) => {
        const have = state.inventory[c.id] ?? 0;
        const cost = c.seedCost ?? 0;
        const canAfford = have > 0 || state.coins >= cost;
        const badge = have > 0
          ? `<span class="fw-badge">${have}</span>`
          : `<span class="fw-badge preis">${cost}</span>`;
        return `<button type="button" class="fw-btn${canAfford ? '' : ' knapp'}" data-tool="saat" data-crop="${c.id}" aria-label="${c.name} aussäen">
          ${badge}
          ${seedSvg(c.id)}
          <span class="fw-name">${c.name}</span>
          <span class="fw-meta">${formatDuration((c.growTime ?? 0) * 1000)}</span>
        </button>`;
      }).join('');
      this.root.innerHTML = `<div class="fw-karte">${buttons}</div>`;
      for (const btn of Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-tool="saat"]'))) {
        const cropId = btn.dataset['crop'];
        if (cropId) this.attachToolSwipe(btn, 'saat', cropId);
      }
    } else {
      this.mode = 'wachstum';
      this.root.dataset['feldWerkzeug'] = 'wachstum';
      const name = CONTENT.items[growth.crop]?.name ?? growth.crop;
      this.root.innerHTML = `<div class="fw-info">
        <div class="fw-info-kopf">
          <span>${name}</span>
          <span data-zeit>${formatDuration(growth.remainingMs)}</span>
        </div>
        <div class="fw-balken-spur"><div class="fw-balken" style="width:${Math.round(growth.progress * 100)}%"></div></div>
      </div>`;
      this.timeLabel = this.root.querySelector('[data-zeit]');
      this.progressBar = this.root.querySelector('.fw-balken');
    }

    this.positionAt(f);
  }

  private positionAt(f: FieldObject): void {
    const p = placement(f);
    const sc = this.camera.worldToScreen(p.ground.x, p.ground.y);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = this.root.offsetWidth || 160;
    const h = this.root.offsetHeight || 74;
    const pad = 12;
    let x = sc.x - w / 2;
    let y = sc.y - h - 54;
    if (y < pad) y = sc.y + 44;
    x = Math.max(pad, Math.min(vw - w - pad, x));
    y = Math.max(pad, Math.min(vh - h - pad, y));
    this.root.style.left = `${Math.round(x)}px`;
    this.root.style.top = `${Math.round(y)}px`;
  }

  private attachToolSwipe(btn: HTMLButtonElement, kind: 'sichel' | 'saat', cropId?: string): void {
    const toLocal = (clientX: number, clientY: number) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    };

    btn.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();
      try { btn.setPointerCapture(e.pointerId); } catch { /* synthetische Tests */ }
      this.dragActive = true;
      const startPos = { x: e.clientX, y: e.clientY };
      let lastLocal = toLocal(e.clientX, e.clientY);
      let dragged = false;
      const swiped = new Set<string>();
      const touchOffset = e.pointerType === 'touch' ? { x: -16, y: -34 } : { x: 0, y: 0 };

      this.dragger.innerHTML = kind === 'sichel' ? sickleSvg(42) : seedSvg(cropId ?? 'wheat', 36);
      this.dragger.classList.add('aktiv');
      this.dragger.style.left = `${e.clientX + touchOffset.x}px`;
      this.dragger.style.top = `${e.clientY + touchOffset.y}px`;

      const applyOnPoint = (a: { x: number; y: number }, b: { x: number; y: number }): void => {
        const wa = this.camera.screenToWorld(a.x, a.y);
        const wb = this.camera.screenToWorld(b.x, b.y);
        const state = this.cb.getState();
        const now = this.cb.getNow();
        const hits = fieldsAlongSegment(state.objects, wa, wb);
        for (const field of hits) {
          if (swiped.has(field.id)) continue;
          if (kind === 'sichel') {
            if (!fieldGrowth(field, now)?.ready) continue;
            swiped.add(field.id);
            if (this.cb.onHarvest(field)) this.pulseDragger();
          } else if (cropId) {
            if (field.crop !== null) continue;
            swiped.add(field.id);
            if (this.cb.onPlant(field, cropId)) this.pulseDragger();
          }
        }
      };

      const onMove = (ev: PointerEvent): void => {
        if (ev.pointerId !== e.pointerId) return;
        const list = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : [];
        for (const c of list.length > 0 ? list : [ev]) {
          if (!dragged && Math.hypot(c.clientX - startPos.x, c.clientY - startPos.y) >= 8) {
            dragged = true;
            this.root.classList.add('ziehen');
          }
          const cur = toLocal(c.clientX, c.clientY);
          this.dragger.style.left = `${c.clientX + touchOffset.x}px`;
          this.dragger.style.top = `${c.clientY + touchOffset.y}px`;
          if (dragged) applyOnPoint(lastLocal, cur);
          lastLocal = cur;
        }
      };

      const finish = (ev: PointerEvent): void => {
        if (ev.pointerId !== e.pointerId) return;
        try { if (btn.hasPointerCapture(ev.pointerId)) btn.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
        btn.removeEventListener('pointermove', onMove);
        btn.removeEventListener('pointerup', finish);
        btn.removeEventListener('pointercancel', finish);
        this.dragger.classList.remove('aktiv', 'schwung');
        this.dragActive = false;

        if (!dragged && ev.type === 'pointerup') {
          const target = this.currentField();
          if (target) {
            if (kind === 'sichel') this.cb.onHarvest(target);
            else if (cropId) this.cb.onPlant(target, cropId);
          }
        }
        this.close();
      };

      btn.addEventListener('pointermove', onMove);
      btn.addEventListener('pointerup', finish);
      btn.addEventListener('pointercancel', finish);
    });
  }

  private pulseDragger(): void {
    this.dragger.classList.add('schwung');
    window.setTimeout(() => this.dragger.classList.remove('schwung'), 110);
  }
}
