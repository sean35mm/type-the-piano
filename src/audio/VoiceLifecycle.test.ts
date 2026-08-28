import { describe, expect, it } from 'vitest'
import { VoiceLifecycle } from './VoiceLifecycle'

describe('voice lifecycle', () => {
  it('keeps repeated pitches independent by occurrence id', () => {
    const voices = new VoiceLifecycle()
    voices.attack('first-C4', 0)
    voices.attack('second-C4', 0)
    expect(voices.size).toBe(2)
    expect(voices.noteOff('first-C4')).toEqual(['first-C4'])
  })

  it('defers logical note-off under sustain and releases it on pedal-up', () => {
    const voices = new VoiceLifecycle()
    voices.attack('note', 2)
    voices.setSustain(2, true)
    expect(voices.noteOff('note')).toEqual([])
    expect(voices.setSustain(2, false)).toEqual(['note'])
  })

  it('preserves pedal state while silencing voices and clears it on reset', () => {
    const voices = new VoiceLifecycle()
    voices.setSustain(2, true)
    voices.attack('old', 2)
    expect(voices.silenceVoices()).toEqual(['old'])
    voices.attack('resumed', 2)
    expect(voices.noteOff('resumed')).toEqual([])
    voices.reset()
    voices.attack('restarted', 2)
    expect(voices.noteOff('restarted')).toEqual(['restarted'])
  })
})
