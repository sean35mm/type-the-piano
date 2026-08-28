export interface PianoSample { filename: string; rootMidi: number }

export const PIANO_SAMPLES: PianoSample[] = [
  { filename: 'A0', rootMidi: 21 },
  ...[1, 2, 3, 4, 5, 6, 7].flatMap((octave) => [
    { filename: `C${octave}`, rootMidi: 12 * (octave + 1) },
    { filename: `Ds${octave}`, rootMidi: 12 * (octave + 1) + 3 },
    { filename: `Fs${octave}`, rootMidi: 12 * (octave + 1) + 6 },
    { filename: `A${octave}`, rootMidi: 12 * (octave + 1) + 9 },
  ]),
  { filename: 'C8', rootMidi: 108 },
]

export function nearestSample(targetMidi: number): PianoSample {
  return PIANO_SAMPLES.reduce((best, sample) =>
    Math.abs(sample.rootMidi - targetMidi) < Math.abs(best.rootMidi - targetMidi) ? sample : best,
  )
}

export function playbackRate(targetMidi: number, rootMidi: number): number {
  return 2 ** ((targetMidi - rootMidi) / 12)
}
