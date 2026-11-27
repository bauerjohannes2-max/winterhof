// ============================================================================
// Winterhof Core – Spielsitzung
// Einzige Stelle, die den aktuellen Stand hält. UI/Grafik schicken Befehle
// (dispatch) und hören auf Ereignisse (subscribe). Speichern gedrosselt und
// nur nach echten Änderungen – nie im Render-Loop.
// ============================================================================
import { advanceTime, applyCommand } from './commands';
import { loadFromStore, saveToStore, type KeyValueStore, type LoadReport } from './save';
import type { Command, CommandResult, GameEvent, GameState } from './types';

export type Listener = (events: GameEvent[], state: GameState) => void;

export interface SessionOptions {
  store: KeyValueStore;
  now?: () => number;
  saveDelayMs?: number;
  onSaveError?: (err: unknown) => void;
}

export class GameSession {
  private _state: GameState;
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly now: () => number;
  readonly loadReport: LoadReport;

  constructor(private opts: SessionOptions) {
    this.now = opts.now ?? (() => Date.now());
    this.loadReport = loadFromStore(opts.store, this.now());
    this._state = this.loadReport.state;
    const adv = advanceTime(this._state, this.now());
    this._state = adv.state;
    if (this.loadReport.source !== 'current') this.saveNow();
  }

  get state(): Readonly<GameState> {
    return this._state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispatch(cmd: Command): CommandResult {
    const res = applyCommand(this._state, cmd, this.now());
    if (res.ok) {
      this._state = res.state;
      this.emit(res.events);
      this.scheduleSave();
    }
    return res;
  }

  /** Zeitfortschritt (z. B. 1× pro Sekunde aus einem Intervall, nicht pro Frame). */
  tick(): GameEvent[] {
    const adv = advanceTime(this._state, this.now());
    this._state = adv.state;
    if (adv.events.length > 0) {
      this.emit(adv.events);
      this.scheduleSave();
    }
    return adv.events;
  }

  private emit(events: GameEvent[]) {
    for (const fn of this.listeners) {
      try { fn(events, this._state); } catch (e) { console.error('[Winterhof] Listener-Fehler', e); }
    }
  }

  scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.saveNow(), this.opts.saveDelayMs ?? 1200);
  }

  saveNow() {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    try { saveToStore(this.opts.store, this._state); }
    catch (e) {
      if (this.opts.onSaveError) this.opts.onSaveError(e);
      else console.error('[Winterhof] Speichern fehlgeschlagen', e);
    }
  }

  /** Schreibt nur, wenn noch eine verzögerte Speicherung aussteht (überschreibt sonst nichts beim Schließen). */
  flush() {
    if (this.saveTimer) this.saveNow();
  }
}
