import { Midi } from '@tonejs/midi'
import { describe, expect, it } from 'vitest'
import { compileMidi } from './midiCompiler'

const TRACKS = ['Piano right', 'Piano right 2', 'Piano left'] as const

function fixture(options: { omit?: string; duplicate?: string } = {}): ArrayBuffer {
  const midi = new Midi()
  for (const [index, name] of TRACKS.entries()) {
    if (name === options.omit) continue
    const track = midi.addTrack()
    track.name = name
    track.channel = index + 2
    track.addNote({ midi: 60 + index, time: 0, duration: index === 0 ? 0.06 : 0.1, velocity: 0.8 })
    if (index === 0) {
      track.addCC({ number: 64, time: 0.05, value: 0.49 })
      track.addCC({ number: 64, time: 0.06, value: 0.51 })
    }
  }
  if (options.duplicate) {
    const duplicate = midi.addTrack()
    duplicate.name = options.duplicate
    duplicate.addNote({ midi: 72, time: 0, duration: 0.1, velocity: 0.8 })
  }
  const bytes = midi.toArray()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('MIDI compiler track semantics', () => {
  it('requires exactly one of every configured track', () => {
    expect(() => compileMidi(fixture({ omit: 'Piano left' }), TRACKS)).toThrow(/Piano left.*found 0/)
    expect(() => compileMidi(fixture({ duplicate: 'Piano right' }), TRACKS)).toThrow(/Piano right.*found 2/)
  })

  it('rejects an empty or duplicate track selection', () => {
    expect(() => compileMidi(fixture(), [])).toThrow(/at least one/)
    expect(() => compileMidi(fixture(), ['Piano right', 'Piano right'])).toThrow(/unique/)
  })

  it('extracts normalized CC64 threshold, channel, and equal-time ordering', () => {
    const piece = compileMidi(fixture(), TRACKS)
    const sustain = piece.crossings.filter((event) => event.kind === 'sustain')
    expect(piece.selectedTrackNames).toEqual(TRACKS)
    expect(sustain.map((event) => ({ channel: event.channel, down: event.down }))).toEqual([
      { channel: 2, down: false },
      { channel: 2, down: true },
    ])
    const equalTime = piece.crossings.filter((event) => Math.abs(event.at - 0.06) < 0.002)
    expect(equalTime.map((event) => event.kind)).toEqual(['noteOff', 'sustain'])
  })
})
