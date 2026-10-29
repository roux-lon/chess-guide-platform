export type SoundKind = "correct" | "wrong" | "win" | "move";

interface Note {
  /** Pitch in hertz. */
  freq: number;
  /** Seconds after the sound starts. */
  start: number;
  /** How long it rings, in seconds. */
  duration: number;
  type: OscillatorType;
  /** Loudness, kept low: these are small, friendly sounds. */
  gain: number;
}

/**
 * The sounds, written as notes. They are made on the spot with the Web Audio API, so there
 * are no audio files to download or license, and they work offline.
 */
export const SOUND_NOTES: Record<SoundKind, Note[]> = {
  move: [{ freq: 440, start: 0, duration: 0.06, type: "triangle", gain: 0.08 }],
  correct: [
    { freq: 523.25, start: 0, duration: 0.12, type: "sine", gain: 0.12 },
    { freq: 783.99, start: 0.1, duration: 0.2, type: "sine", gain: 0.12 },
  ],
  wrong: [
    { freq: 220, start: 0, duration: 0.18, type: "sine", gain: 0.1 },
    { freq: 196, start: 0.12, duration: 0.22, type: "sine", gain: 0.1 },
  ],
  win: [
    { freq: 523.25, start: 0, duration: 0.15, type: "triangle", gain: 0.12 },
    { freq: 659.25, start: 0.14, duration: 0.15, type: "triangle", gain: 0.12 },
    { freq: 783.99, start: 0.28, duration: 0.15, type: "triangle", gain: 0.12 },
    { freq: 1046.5, start: 0.42, duration: 0.35, type: "triangle", gain: 0.12 },
  ],
};

let context: AudioContext | undefined;

/** Plays a sound, but only when sound is switched on. Never throws: a sound is never worth a crash. */
export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return;
  try {
    context ??= new window.AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    for (const note of SOUND_NOTES[kind]) {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      oscillator.type = note.type;
      oscillator.frequency.value = note.freq;
      const begin = now + note.start;
      volume.gain.setValueAtTime(0.0001, begin);
      volume.gain.exponentialRampToValueAtTime(note.gain, begin + 0.01);
      volume.gain.exponentialRampToValueAtTime(0.0001, begin + note.duration);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(begin);
      oscillator.stop(begin + note.duration + 0.02);
    }
  } catch {
    // No audio available: carry on silently.
  }
}
