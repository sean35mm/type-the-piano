import { describe, expect, it, vi } from 'vitest'
import { CrossingCursor, sortCrossings } from './crossings'

describe('crossing events', () => {
  it('orders note-offs before pedal changes and consumes each once', () => {
    const events = sortCrossings([
      { kind: 'sustain', at: 1, channel: 0, down: false, order: 2 },
      { kind: 'noteOff', at: 1, noteId: 'a', order: 1 },
    ])
    const apply = vi.fn()
    const cursor = new CrossingCursor(events)
    cursor.consumeThrough(1, apply)
    cursor.consumeThrough(1, apply)
    expect(apply.mock.calls.map(([event]) => event.kind)).toEqual(['noteOff', 'sustain'])
  })
})
