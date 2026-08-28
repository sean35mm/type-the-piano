import { describe, expect, it } from 'vitest'
import { nearestSample, playbackRate } from './samples'

describe('sample selection', () => {
  it('selects the deterministic nearest root', () => {
    expect(nearestSample(61)).toMatchObject({ filename: 'C4', rootMidi: 60 })
    expect(nearestSample(63)).toMatchObject({ filename: 'Ds4', rootMidi: 63 })
  })

  it('calculates equal-tempered playback rate', () => {
    expect(playbackRate(72, 60)).toBe(2)
  })
})
