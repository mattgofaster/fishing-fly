/**
 * All sound is synthesised with Web Audio: no audio files to load.
 * Browsers (Safari especially) only allow sound after a touch, so `unlock`
 * must be called from inside a pointer/touch handler.
 */

const MUTE_KEY = 'fishingfly.muted';
const VOLUME = 0.9;

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  /** Glide to this frequency by the end. */
  to?: number;
  delay?: number;
  attack?: number;
  /** Absolute start time, for the music scheduler. Overrides delay. */
  at?: number;
  out?: AudioNode | null;
}

interface NoiseOpts {
  vol?: number;
  filter?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
  delay?: number;
  attack?: number;
  at?: number;
  out?: AudioNode | null;
}

const MUSIC_KEY = 'fishingfly.music';
const MUSIC_VOL = 0.55;

type MusicMode = 'chill' | 'tourney';

/** G, Em, C, D: the four chords every song about a lake is legally required to use. */
const CHORDS = [
  { bass: 98, tones: [392, 494, 587] },
  { bass: 82.4, tones: [330, 392, 494] },
  { bass: 65.4, tones: [262, 330, 392] },
  { bass: 73.4, tones: [294, 370, 440] },
];
/** G major pentatonic, up high, for the whistled tune. */
const WHISTLE = [784, 880, 988, 1175, 1319, 1568];

/** The background tunes the music button cycles through, then off. */
export const TRACKS = [
  { id: 'banjo', name: 'Lazy Banjo', bpm: 86 },
  { id: 'golden', name: 'Golden Hour', bpm: 78 },
  { id: 'catfish', name: 'Catfish Shuffle', bpm: 100 },
] as const;

/** Shifts a frequency by a number of semitones. */
const semi = (f: number, n: number) => f * 2 ** (n / 12);

// Note frequencies used by the composed tunes.
const A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33, Eb5 = 622.25, E5 = 659.25;
const F5 = 698.46, G5 = 783.99, A5 = 880, G4 = 392;

/** Golden Hour: a slow waltz in C. Six eighth notes to a bar, eight bars around. */
const GOLDEN_CHORDS = [
  { bass: 65.41, tones: [261.63, 329.63, 392.0] }, // C
  { bass: 55.0, tones: [220.0, 261.63, 329.63] }, // Am
  { bass: 87.31, tones: [220.0, 261.63, 349.23] }, // F
  { bass: 98.0, tones: [196.0, 246.94, 293.66] }, // G
  { bass: 65.41, tones: [261.63, 329.63, 392.0] }, // C
  { bass: 55.0, tones: [220.0, 261.63, 329.63] }, // Am
  { bass: 73.42, tones: [293.66, 349.23, 440.0] }, // Dm
  { bass: 98.0, tones: [196.0, 246.94, 293.66] }, // G
];
/** The flute melody: [bar, step, frequency, length in steps]. */
const GOLDEN_TUNE: [number, number, number, number][] = [
  [0, 0, G4, 2], [0, 2, C5, 2], [0, 4, E5, 2],
  [1, 0, E5, 4], [1, 4, D5, 2],
  [2, 0, C5, 2], [2, 2, A4, 2], [2, 4, C5, 2],
  [3, 0, D5, 6],
  [4, 0, E5, 2], [4, 2, G5, 2], [4, 4, E5, 2],
  [5, 0, C5, 4], [5, 4, E5, 2],
  [6, 0, F5, 2], [6, 2, E5, 2], [6, 4, D5, 2],
  [7, 0, B4, 4], [7, 4, D5, 2],
];

/** Catfish Shuffle: a swung twelve-bar blues in A. Roots for each bar. */
const BLUES_ROOTS = [55, 55, 55, 55, 73.42, 73.42, 55, 55, 82.41, 73.42, 55, 82.41];
/** The boogie bass line, in semitones above the root, one per eighth. */
const BOOGIE = [0, 4, 7, 9, 10, 9, 7, 4];
/** Harmonica licks by bar of the twelve: [step, frequency, length in steps]. */
const LICKS: Record<number, [number, number, number][]> = {
  0: [[0, A5, 2], [2, G5, 1], [3, E5, 2], [5, D5, 1], [6, C5, 1], [7, A4, 1]],
  1: [[0, A4, 4]],
  4: [[0, D5, 1], [1, Eb5, 1], [2, E5, 2], [4, G5, 2], [6, E5, 2]],
  5: [[0, D5, 4]],
  8: [[0, E5, 1], [1, Eb5, 1], [2, D5, 1], [3, C5, 1], [4, A4, 3]],
  9: [[0, C5, 2], [2, D5, 2], [4, Eb5, 1], [5, E5, 3]],
  10: [[0, A5, 2], [2, G5, 2], [4, E5, 4]],
  11: [[0, E5, 1], [2, E5, 1], [4, G5, 1], [6, Eb5, 2]],
};

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicGain: GainNode | null = null;
  private musicMode: MusicMode = 'chill';
  private nextStep = 0;
  /**
   * Music waits for the intro jingle. Measured in wall-clock time, not the
   * audio clock, which iOS can leave stalled or jumping around while it
   * unlocks. `holdMs` is armed by intro() and starts counting once audio runs.
   */
  private holdMs = 0;
  private holdUntil = 0;
  private step = 0;
  /** The whistled phrase for the current four bars: [step, note index] pairs. */
  private phrase: [number, number][] = [];
  muted = false;
  /** Which of TRACKS is playing, or -1 when the music is off. */
  track = 0;
  /** When the track last changed (performance.now), for the "now playing" label. */
  trackChangedAt = -1e9;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
      // Older saves stored '1' / '0' for music on / off.
      const saved = localStorage.getItem(MUSIC_KEY);
      if (saved === '0' || saved === 'off') this.track = -1;
      else this.track = Math.max(0, TRACKS.findIndex((t) => t.id === saved));
    } catch {
      // Storage blocked: just start unmuted.
    }
  }

  get musicOn() {
    return this.track >= 0;
  }

  /** The music button: next tune, and after the last one, off. */
  cycleMusic() {
    this.track = this.track + 1 >= TRACKS.length ? -1 : this.track + 1;
    this.trackChangedAt = performance.now();
    try {
      localStorage.setItem(MUSIC_KEY, this.musicOn ? TRACKS[this.track].id : 'off');
    } catch {
      // Not remembered, still applied.
    }
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicOn ? MUSIC_VOL : 0, this.ctx.currentTime, 0.1);
    }
    // The new tune starts on a fresh bar.
    this.step = 0;
    this.phrase = [];
  }

  /** What the "now playing" label says. */
  trackLabel() {
    return this.musicOn ? TRACKS[this.track].name : 'Music off';
  }

  unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const c = new AC();
      this.ctx = c;
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : VOLUME;
      this.master.connect(c.destination);

      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this.startAmbient();
      this.startMusic();
    }
    if (this.ctx.state !== 'running') {
      void this.ctx.resume().catch(() => {});
      // iOS only truly unlocks audio once something actually plays inside a
      // touch, so play one silent sample every time we're asked.
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      // Not remembered, still applied.
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : VOLUME, this.ctx.currentTime, 0.02);
    }
  }

  setMusicMode(mode: MusicMode) {
    if (mode === this.musicMode) return;
    this.musicMode = mode;
    // Start the new groove on a fresh bar.
    this.step = 0;
    this.phrase = [];
  }

  /** Stop everything while the app is in the background. */
  setActive(active: boolean) {
    if (!this.ctx) return;
    if (active) void this.ctx.resume().catch(() => {});
    else void this.ctx.suspend().catch(() => {});
  }

  // ---------- Building blocks ----------

  private tone(freq: number, dur: number, o: ToneOpts = {}) {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t = o.at ?? c.currentTime + (o.delay ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.out ?? this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  private noise(dur: number, o: NoiseOpts = {}) {
    const c = this.ctx;
    if (!c || !this.master || !this.noiseBuf || this.muted) return;
    const t = o.at ?? c.currentTime + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.filter ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.out ?? this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.03);
  }

  /** Lapping water under everything, plus the odd bird. */
  private startAmbient() {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = c.createGain();
    g.gain.value = 0.045;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.17;
    const depth = c.createGain();
    depth.gain.value = 0.025;
    lfo.connect(depth);
    depth.connect(g.gain);
    src.connect(f);
    f.connect(g);
    g.connect(this.master!);
    src.start();
    lfo.start();

    const chirp = () => {
      if (c.state === 'running' && !document.hidden) {
        const base = 2200 + Math.random() * 1400;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          this.tone(base, 0.07, { to: base * 1.35, vol: 0.025, delay: i * 0.11 });
        }
      }
      window.setTimeout(chirp, 5000 + Math.random() * 9000);
    };
    window.setTimeout(chirp, 4000);
  }

  // ---------- Music ----------

  /**
   * A look-ahead scheduler: every 50 ms it books the notes due in the next
   * quarter second, so timing stays tight even if a frame stutters.
   */
  private startMusic() {
    const c = this.ctx!;
    this.musicGain = c.createGain();
    this.musicGain.gain.value = this.musicOn ? MUSIC_VOL : 0;
    this.musicGain.connect(this.master!);
    window.setInterval(() => this.scheduleMusic(), 50);
  }

  private scheduleMusic() {
    const c = this.ctx;
    if (!c || c.state !== 'running' || !this.musicOn || this.muted) return;
    if (this.holdMs > 0) {
      this.holdUntil = performance.now() + this.holdMs;
      this.holdMs = 0;
    }
    if (performance.now() < this.holdUntil) return;
    const now = c.currentTime;
    // Fell behind (app was paused), or the clock did something odd: pick up from now.
    if (this.nextStep < now - 0.1 || this.nextStep > now + 1) this.nextStep = now + 0.05;
    const bpm = this.musicMode === 'tourney' ? 132 : TRACKS[this.track].bpm;
    const stepDur = 60 / bpm / 2;
    while (this.nextStep < now + 0.25) {
      const id = this.musicMode === 'tourney' ? 'banjo' : TRACKS[this.track].id;
      if (id === 'golden') this.playGolden(this.step, this.nextStep, stepDur);
      else if (id === 'catfish') this.playCatfish(this.step, this.nextStep, stepDur);
      else this.playStep(this.step, this.nextStep, stepDur);
      this.nextStep += stepDur;
      this.step++;
    }
  }

  /** One eighth note of music. Eight steps to a bar, one chord per bar. */
  private playStep(step: number, at: number, dur: number) {
    const out = this.musicGain;
    const inBar = step % 8;
    const bar = Math.floor(step / 8);
    const chord = CHORDS[bar % 4];
    const fast = this.musicMode === 'tourney';

    // Bass: root on the one, fifth on the three. Boom-chick when it's a race.
    if (fast) {
      if (inBar % 2 === 0) {
        const f = inBar % 4 === 0 ? chord.bass : chord.bass * 1.5;
        this.tone(f, dur * 1.6, { type: 'triangle', vol: 0.2, at, out });
      } else {
        this.noise(0.04, { filter: 'highpass', freq: 6000, vol: 0.05, attack: 0.002, at, out });
      }
    } else if (inBar === 0 || inBar === 4) {
      const f = inBar === 0 ? chord.bass : chord.bass * 1.5;
      this.tone(f, dur * 3, { type: 'triangle', vol: 0.18, at, out, attack: 0.01 });
    }

    // Plucked arpeggio, like a lazy banjo
    const pattern = fast ? [0, 1, 2, 1, 2, 1, 0, 1] : [0, 1, 2, 1, 0, 2, 1, 2];
    const f = chord.tones[pattern[inBar]];
    this.tone(f, fast ? 0.18 : 0.32, { type: 'triangle', vol: fast ? 0.05 : 0.045, at, out, attack: 0.003 });
    if (!fast && inBar % 2 === 1) {
      this.tone(f * 2, 0.12, { type: 'sine', vol: 0.015, at, out, attack: 0.002 });
    }
    // Soft brushed snare on the backbeat
    if (inBar === 2 || inBar === 6) {
      this.noise(0.09, { filter: 'bandpass', freq: 2500, q: 0.7, vol: fast ? 0.05 : 0.025, attack: 0.002, at, out });
    }

    // A whistled tune over the chill groove: a new short phrase every four bars, rests in between.
    if (!fast) {
      if (step % 32 === 0) {
        this.phrase = [];
        if (Math.random() < 0.7) {
          let note = Math.floor(Math.random() * 3) + 1;
          for (const s of [0, 3, 4, 6, 8, 11, 12]) {
            if (Math.random() < 0.75) {
              note = Math.max(0, Math.min(WHISTLE.length - 1, note + Math.floor(Math.random() * 3) - 1));
              this.phrase.push([s, note]);
            }
          }
        }
      }
      const local = step % 32;
      for (const [s, n] of this.phrase) {
        if (s === local) {
          const wf = WHISTLE[n];
          this.tone(wf * 0.97, dur * 1.7, { type: 'sine', vol: 0.035, at, out, attack: 0.04, to: wf });
        }
      }
    }
  }

  /** Golden Hour: one eighth note of a slow, warm waltz. */
  private playGolden(step: number, at: number, dur: number) {
    const out = this.musicGain;
    const inBar = step % 6;
    const bar = Math.floor(step / 6);
    const chord = GOLDEN_CHORDS[bar % 8];
    const round = Math.floor(bar / 8);

    // Oom: a long, round bass note on the one
    if (inBar === 0) {
      this.tone(chord.bass, dur * 5, { type: 'triangle', vol: 0.2, at, out, attack: 0.02 });
      this.tone(chord.bass * 2, dur * 3, { type: 'sine', vol: 0.05, at, out, attack: 0.02 });
    }
    // Pah, pah: soft electric-piano chords with a little bell on top
    if (inBar === 2 || inBar === 4) {
      for (const f of chord.tones) {
        this.tone(f, dur * 1.7, { type: 'sine', vol: 0.03, at, out, attack: 0.01 });
        this.tone(f * 2, dur * 0.6, { type: 'sine', vol: 0.008, at, out, attack: 0.003 });
      }
      this.noise(0.06, { filter: 'highpass', freq: 5000, vol: 0.012, attack: 0.003, at, out });
    }
    if (round % 2 === 0) {
      // The flute melody, every other time round
      for (const [b, s, f, len] of GOLDEN_TUNE) {
        if (b !== bar % 8 || s !== inBar) continue;
        this.tone(f * 0.985, dur * len * 0.95, { type: 'sine', vol: 0.05, at, out, attack: 0.05, to: f });
        this.tone(f, dur * len * 0.9, { type: 'triangle', vol: 0.012, at, out, attack: 0.06 });
      }
    } else if (inBar % 2 === 1) {
      // In between, a gentle music-box ripple up the chord
      const f = chord.tones[(inBar - 1) / 2] * 2;
      this.tone(f, 0.45, { type: 'sine', vol: 0.018, at, out, attack: 0.004 });
    }
  }

  /** Catfish Shuffle: one swung eighth note of a twelve-bar boogie. */
  private playCatfish(step: number, straight: number, dur: number) {
    const out = this.musicGain;
    const inBar = step % 8;
    const bar = Math.floor(step / 8);
    const root = BLUES_ROOTS[bar % 12];
    const chorus = Math.floor(bar / 12);
    // Swing: every off-beat eighth lands late.
    const at = straight + (inBar % 2 ? dur * 0.33 : 0);

    // Walking boogie bass
    this.tone(semi(root, BOOGIE[inBar]), dur * 0.95, { type: 'triangle', vol: 0.2, at, out, attack: 0.005 });
    // Kick, snare and a shuffling hi-hat
    if (inBar === 0 || inBar === 4) this.tone(110, 0.15, { type: 'sine', vol: 0.22, at, out, to: 45, attack: 0.002 });
    if (inBar === 2 || inBar === 6) {
      this.noise(0.12, { filter: 'bandpass', freq: 1800, q: 0.8, vol: 0.055, attack: 0.002, at, out });
    }
    this.noise(0.03, { filter: 'highpass', freq: 7000, vol: inBar % 2 ? 0.018 : 0.028, attack: 0.002, at, out });
    // Short piano stabs of the dominant seventh on the off-beats
    if (inBar === 3 || inBar === 7) {
      for (const n of [4, 7, 10]) this.tone(semi(root * 4, n), 0.13, { type: 'triangle', vol: 0.028, at, out, attack: 0.003 });
    }
    // Harmonica: sits out the first time round, then trades licks every other chorus
    if (chorus % 2 === 1) {
      for (const [s, f, len] of LICKS[bar % 12] ?? []) {
        if (s !== inBar) continue;
        // Short notes get bent up into pitch, the bluesy way. Long ones just sing.
        const bend = len <= 2 ? { to: f } : {};
        this.tone(len <= 2 ? f * 0.94 : f, dur * len * 0.9, { type: 'square', vol: 0.016, at, out, attack: 0.02, ...bend });
        this.tone(f, dur * len * 0.9, { type: 'sine', vol: 0.03, at, out, attack: 0.03 });
      }
    }
  }

  // ---------- Game sounds ----------

  /**
   * The title-screen tap: a banjo-ish run up to a big G chord, then the
   * background music comes in on the next bar.
   */
  intro() {
    const c = this.ctx;
    if (!c) return;
    const run = [196, 247, 294, 392, 494, 587];
    run.forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.06, attack: 0.003 }));
    const hit = 0.42;
    for (const f of [392, 494, 587, 784]) {
      this.tone(f, 0.9, { type: 'triangle', vol: 0.07, delay: hit, attack: 0.005 });
    }
    this.tone(98, 0.9, { type: 'triangle', vol: 0.22, delay: hit, attack: 0.01 });
    this.tone(1568, 0.5, { type: 'sine', vol: 0.03, delay: hit + 0.05, to: 1760 });
    // Hold the music until the chord rings out, then start from the top.
    this.musicMode = 'chill';
    this.step = 0;
    this.phrase = [];
    this.holdMs = (hit + 0.75) * 1000;
    this.nextStep = 0;
  }

  /** Quest complete: a little brass-ish ta-da. */
  questDone() {
    const notes = [392, 523, 659, 784];
    notes.forEach((n, i) => this.tone(n, i === 3 ? 0.6 : 0.14, { type: 'square', vol: 0.07, delay: i * 0.11 }));
    this.tone(1047, 0.6, { type: 'triangle', vol: 0.08, delay: 0.33 });
    this.coin(0.55);
  }

  /** Countdown beep. */
  countdown(delay = 0, vol = 1) {
    this.tone(880, 0.12, { type: 'square', vol: 0.09 * vol, delay });
  }

  /** The referee's whistle: time's up. */
  whistle() {
    this.tone(2600, 0.5, { type: 'sine', vol: 0.12, attack: 0.01 });
    this.tone(2750, 0.5, { type: 'sine', vol: 0.06, attack: 0.01 });
    this.noise(0.5, { filter: 'bandpass', freq: 2700, q: 4, vol: 0.06 });
  }

  cast(power: number) {
    this.noise(0.28, { freq: 700, to: 3200, q: 1.4, vol: 0.12 + power * 0.14, attack: 0.05 });
    // Line paying out
    for (let i = 0; i < 8; i++) this.tick(true, 0.12 + i * 0.045);
  }

  splash(size = 0.5) {
    this.noise(0.4, { filter: 'lowpass', freq: 2400, to: 300, vol: 0.14 + size * 0.2 });
    this.tone(320, 0.16, { to: 90, vol: 0.14 + size * 0.1 });
  }

  nibble() {
    this.tone(520, 0.09, { to: 260, vol: 0.14 });
  }

  bite() {
    this.tone(880, 0.09, { type: 'square', vol: 0.11 });
    this.tone(1320, 0.16, { type: 'square', vol: 0.11, delay: 0.09 });
    this.splash(0.3);
  }

  hook() {
    this.tone(220, 0.2, { to: 520, type: 'triangle', vol: 0.22 });
    this.splash(0.8);
  }

  /** One click of the reel. `fast` is the higher-pitched whine of line being stripped. */
  tick(fast = false, delay = 0) {
    this.noise(0.022, {
      filter: 'highpass',
      freq: fast ? 4200 : 2600,
      vol: fast ? 0.07 : 0.11,
      attack: 0.001,
      delay,
    });
  }

  /** The fish is about to bolt. */
  alert() {
    this.tone(1500, 0.07, { type: 'triangle', vol: 0.14 });
    this.tone(1900, 0.1, { type: 'triangle', vol: 0.14, delay: 0.07 });
  }

  warn() {
    this.tone(1040, 0.07, { type: 'square', vol: 0.075 });
  }

  snap() {
    this.noise(0.09, { filter: 'highpass', freq: 3000, vol: 0.45, attack: 0.001 });
    this.tone(1300, 0.3, { to: 90, type: 'sawtooth', vol: 0.16 });
  }

  trees() {
    this.tone(190, 0.12, { to: 120, type: 'triangle', vol: 0.25 });
    this.noise(0.45, { freq: 3400, q: 0.8, vol: 0.14, attack: 0.03, delay: 0.05 });
  }

  /** Sad trombone. */
  fail(delay = 0.2) {
    const notes = [311, 294, 277, 262];
    notes.forEach((n, i) => {
      const last = i === notes.length - 1;
      this.tone(n, last ? 0.75 : 0.3, {
        to: last ? n * 0.9 : undefined,
        type: 'sawtooth',
        vol: 0.07,
        attack: 0.03,
        delay: delay + i * 0.3,
      });
    });
  }

  win(big: boolean) {
    const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      this.tone(n, 0.22, { type: 'triangle', vol: 0.17, delay: i * 0.1 });
    });
    if (big) {
      for (const n of [523, 659, 784]) {
        this.tone(n, 0.7, { type: 'triangle', vol: 0.09, delay: 0.55 });
      }
    }
    this.coin(big ? 1.0 : 0.6);
  }

  /** You caught garbage. */
  junk() {
    this.tone(260, 0.3, { to: 130, type: 'sawtooth', vol: 0.08, attack: 0.02 });
    this.tone(196, 0.5, { to: 98, type: 'sawtooth', vol: 0.08, attack: 0.02, delay: 0.32 });
    this.coin(1.0);
  }

  coin(delay = 0) {
    this.tone(1568, 0.08, { type: 'square', vol: 0.06, delay });
    this.tone(2093, 0.25, { type: 'square', vol: 0.06, delay: delay + 0.08 });
  }

  /** Babble: a run of pitched blips. Bigger fish, deeper voice. */
  fishTalk(weightLb: number) {
    const base = Math.max(190, 760 - weightLb * 34);
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = base * (0.8 + Math.random() * 0.5);
      this.tone(f, 0.06, { type: 'square', vol: 0.05, delay: i * 0.075 });
    }
  }

  squelch() {
    this.noise(0.24, { filter: 'lowpass', freq: 900, to: 180, q: 6, vol: 0.3, attack: 0.03 });
  }

  squeak() {
    this.tone(900, 0.09, { to: 1700, type: 'square', vol: 0.06 });
    this.tone(1700, 0.14, { to: 800, type: 'square', vol: 0.06, delay: 0.09 });
  }

  /** A phone that has no business working underwater. */
  ring() {
    for (let i = 0; i < 8; i++) {
      this.tone(i % 2 ? 1760 : 1397, 0.05, { type: 'square', vol: 0.05, delay: i * 0.055 });
    }
  }

  clank() {
    for (const f of [523, 811, 1319, 2093]) {
      this.tone(f, 0.22, { type: 'square', vol: 0.035 });
    }
    this.noise(0.05, { filter: 'highpass', freq: 2000, vol: 0.2, attack: 0.001 });
  }

  /** An outboard that has seen better decades: putters up, roars, putters off. */
  motor(dur = 1.8) {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(48, t);
    osc.frequency.linearRampToValueAtTime(95, t + dur * 0.35);
    osc.frequency.linearRampToValueAtTime(70, t + dur);
    // Chop the tone into putts.
    const chop = c.createOscillator();
    chop.type = 'square';
    chop.frequency.setValueAtTime(9, t);
    chop.frequency.linearRampToValueAtTime(22, t + dur * 0.35);
    const chopDepth = c.createGain();
    chopDepth.gain.value = 0.5;
    const amp = c.createGain();
    amp.gain.value = 0.5;
    chop.connect(chopDepth);
    chopDepth.connect(amp.gain);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 650;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.15);
    g.gain.setValueAtTime(0.22, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(f);
    f.connect(g);
    g.connect(this.master);
    osc.start(t);
    chop.start(t);
    osc.stop(t + dur + 0.05);
    chop.stop(t + dur + 0.05);
    // Spray off the hull
    this.noise(dur * 0.8, { filter: 'lowpass', freq: 1800, to: 500, vol: 0.08, attack: 0.3, delay: 0.2 });
  }

  /** Two-tone boat horn. */
  horn() {
    for (const [f, d] of [[233, 0], [233, 0.45]] as const) {
      this.tone(f, 0.38, { type: 'sawtooth', vol: 0.09, delay: d, attack: 0.02 });
      this.tone(f * 1.26, 0.38, { type: 'sawtooth', vol: 0.06, delay: d, attack: 0.02 });
    }
  }

  buddyTalk() {
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = 130 * (0.85 + Math.random() * 0.4);
      this.tone(f, 0.08, { type: 'triangle', vol: 0.13, delay: i * 0.09 });
    }
  }
}

export const sfx = new Sfx();
