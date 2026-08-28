import { describe, expect, it } from 'vitest'
import { packetize } from './packetize'
import type { CompiledNote } from './types'

const note = (startsAt: number, id: string): CompiledNote => ({
  id, startsAt, startsAtTick: Math.round(startsAt * 1000), midi: 60, name: 'C4', duration: 1, velocity: 0.8, channel: 0, trackOrder: 0, noteOrder: Number(id),
})

describe('packetize', () => {
  it('uses a fixed anchor rather than chaining nearby notes', () => {
    expect(packetize([note(0, '0'), note(.014, '1'), note(.028, '2')])).toHaveLength(2)
  })

  it('includes a note exactly 15 ms from the anchor', () => {
    expect(packetize([note(0, '0'), note(.015, '1')])).toHaveLength(1)
  })

  it('retains the first grouped note tick as the packet anchor', () => {
    expect(packetize([note(.1, '0'), note(.11, '1')])[0]?.anchorTick).toBe(100)
  })
})
