// ============================================================================
// WINTERHOF & ZAUBERHERBST — Dual-Season Cozy Web Audio & Haptics Engine
// ============================================================================

class CozyAudio {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = false;
    this.season = 'winter';
    this.harvestCombo = 0;
    this.lastHarvestAt = 0;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  vibrate(ms = 12) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  }

  setSfx(enabled) {
    this.sfxEnabled = enabled;
  }

  setSeason(season) {
    this.season = season === 'autumn' ? 'autumn' : 'winter';
  }

  setMusic(enabled) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.unlock();
      this._startMusicBox();
    } else if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _tone(freq, duration = 0.14, type = 'sine', volume = 0.14, delay = 0, slideTo = null) {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playTap() {
    this._tone(420, 0.06, 'triangle', 0.08, 0, 520);
  }

  playPlant() {
    this.vibrate(8);
    this._tone(210, 0.08, 'sine', 0.12, 0, 310);
    this._tone(340, 0.07, 'triangle', 0.07, 0.03, 420);
  }

  playHarvest() {
    this.vibrate(10);
    const now = performance.now();
    if (now - this.lastHarvestAt > 900) this.harvestCombo = 0;
    this.lastHarvestAt = now;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
    const freq = scale[Math.min(this.harvestCombo, scale.length - 1)];
    this.harvestCombo++;
    this._tone(freq, 0.16, 'triangle', 0.13, 0, freq * 1.04);
    this._tone(freq * 1.5, 0.12, 'sine', 0.06, 0.025);
  }

  playCoin() {
    this.vibrate(10);
    this._tone(987.77, 0.1, 'sine', 0.11, 0);
    this._tone(1318.5, 0.22, 'sine', 0.12, 0.065);
  }

  playBakeStart() {
    this._tone(392, 0.1, 'triangle', 0.1, 0);
    this._tone(523.25, 0.14, 'triangle', 0.11, 0.07);
  }

  playCollect() {
    this.vibrate(14);
    this._tone(659.25, 0.12, 'triangle', 0.12, 0);
    this._tone(880, 0.14, 'sine', 0.11, 0.06);
    this._tone(1046.5, 0.2, 'sine', 0.1, 0.12);
  }

  playPet(pitch = 1.0) {
    this.vibrate(8);
    this._tone(520 * pitch, 0.09, 'sine', 0.1, 0, 660 * pitch);
    this._tone(740 * pitch, 0.14, 'sine', 0.09, 0.07, 880 * pitch);
  }

  playUnwrap() {
    this.vibrate(22);
    // Ribbon pop + joyful sparkly cascade
    this._tone(280, 0.09, 'triangle', 0.14, 0, 560);
    [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((n, idx) => {
      this._tone(n, 0.22, 'sine', 0.1, 0.06 + idx * 0.055);
    });
  }

  playSleighBells() {
    const notes = [1046.5, 1318.5, 1567.98, 2093.0, 1567.98, 2093.0];
    notes.forEach((n, idx) => {
      this._tone(n, 0.18, 'sine', 0.08, idx * 0.065);
      this._tone(n * 2.01, 0.08, 'triangle', 0.03, idx * 0.065);
    });
  }

  playLevelUp() {
    this.vibrate(25);
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((f, i) => {
      this._tone(f, 0.28, 'triangle', 0.13, i * 0.085);
      this._tone(f * 0.5, 0.3, 'sine', 0.07, i * 0.085);
    });
  }

  playGiftOpen() {
    this.vibrate(18);
    [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => {
      this._tone(f, 0.24, 'sine', 0.11, i * 0.07);
    });
  }

  _startMusicBox() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    const winterMelody = [
      392.0, 493.88, 587.33, 783.99, 739.99, 587.33,
      659.25, 587.33, 493.88, 587.33, 440.0, null,
      392.0, 493.88, 659.25, 880.0, 783.99, 659.25,
      587.33, 493.88, 440.0, 392.0, null, null
    ];
    // Original whimsical magical celesta waltz for Autumn!
    const autumnMelody = [
      493.88, 659.25, 783.99, 739.99, 659.25, 987.77,
      880.0, 739.99, 659.25, 783.99, 739.99, null,
      493.88, 659.25, 783.99, 987.77, 880.0, 783.99,
      659.25, 587.33, 493.88, null, null, null
    ];
    const bass = [
      196.0, null, null, 293.66, null, null,
      164.81, null, null, 220.0, null, null,
      196.0, null, null, 261.63, null, null,
      293.66, null, null, 196.0, null, null
    ];
    this.musicTimer = setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const melody = this.season === 'autumn' ? autumnMelody : winterMelody;
      const idx = this.musicStep % melody.length;
      this.musicStep++;
      const m = melody[idx];
      const b = bass[idx];
      if (m) this._musicNote(m, 0.54, 0.032);
      if (b) this._musicNote(b, 0.78, 0.02);
    }, 430);
  }

  _musicNote(freq, duration, volume) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}

export const audio = new CozyAudio();
