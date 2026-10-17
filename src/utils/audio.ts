let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const SOUND_NAMES = [
  'Kampala Sunset Bounce',
  'Midnight City Lo-Fi',
  'Hyperpop Velocity',
  'Rooftop Freestyle Groove',
  'Tape Hiss & 808s'
];

export function playSynthesizerSound(index: number) {
  try {
    const ctx = getAudioContext();
    const tempoValues = [108, 84, 132, 112, 90];
    const baseFreqs = [220, 196, 262, 247, 175];
    const waveTypes: OscillatorType[] = ['triangle', 'sine', 'sawtooth', 'triangle', 'square'];

    const clampedIndex = Math.max(0, Math.min(index, tempoValues.length - 1));
    const d = 60 / tempoValues[clampedIndex] / 2;
    const b = baseFreqs[clampedIndex];
    const ty = waveTypes[clampedIndex];
    const melodyNotes = [0, 3, 7, 10, 12, 10, 7, 3];

    melodyNotes.forEach((n, j) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + j * d;

      osc.type = ty;
      osc.frequency.value = b * Math.pow(2, n / 12);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d * 0.88);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + d);
    });
  } catch (err) {
    console.warn('Web Audio synthesis not available or blocked by user gesture', err);
  }
}

export function playTapSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // ignore
  }
}

export function playLikeSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.05;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  } catch {
    // ignore
  }
}
