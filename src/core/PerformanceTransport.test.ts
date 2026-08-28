import { afterEach, describe, expect, it, vi } from 'vitest'
import { PerformanceTransport } from './PerformanceTransport'
import type { CompiledPiece } from './types'

const piece: CompiledPiece = {
  selectedTrackNames: [], ppq: 480, timeSignatures: [{ ticks: 0, numerator: 4, denominator: 4 }], notes: [], crossings: [],
  packets: [
    { index: 0, startsAt: 0, anchorTick: 0, notes: [] },
    { index: 1, startsAt: 1, anchorTick: 480, notes: [] },
  ],
}

describe('PerformanceTransport', () => {
  it('advances exactly one packet for one accepted action', () => {
    const attack = vi.fn()
    const transport = new PerformanceTransport(piece, { attack, crossing: vi.fn(), completed: vi.fn(), silenceAll: vi.fn(), resetAll: vi.fn() })
    transport.advance(10)
    expect(attack).toHaveBeenCalledTimes(1)
    expect(attack).toHaveBeenCalledWith(piece.packets[0])
    transport.dispose()
  })

  it('silences without resetting score state on pause, then resets on dispose', () => {
    const silenceAll = vi.fn()
    const resetAll = vi.fn()
    const transport = new PerformanceTransport(piece, { attack: vi.fn(), crossing: vi.fn(), completed: vi.fn(), silenceAll, resetAll })
    transport.pause()
    expect(silenceAll).toHaveBeenCalledOnce()
    expect(resetAll).not.toHaveBeenCalled()
    transport.dispose()
    expect(resetAll).toHaveBeenCalledOnce()
  })

  it('preserves elapsed tail timing through repeated pause and resume', () => {
    vi.useFakeTimers()
    const crossing = vi.fn()
    const completed = vi.fn()
    const resetAll = vi.fn()
    const tailPiece: CompiledPiece = {
      selectedTrackNames: [], ppq: 480, timeSignatures: [{ ticks: 0, numerator: 4, denominator: 4 }], notes: [],
      packets: [{ index: 0, startsAt: 0, anchorTick: 0, notes: [] }],
      crossings: [{ kind: 'noteOff', at: 1, noteId: 'tail', order: 0 }],
    }
    const transport = new PerformanceTransport(tailPiece, { attack: vi.fn(), crossing, completed, silenceAll: vi.fn(), resetAll })
    transport.advance(0)
    vi.advanceTimersByTime(300)
    transport.pause()
    vi.advanceTimersByTime(500)
    transport.resume()
    vi.advanceTimersByTime(200)
    transport.pause()
    vi.advanceTimersByTime(500)
    transport.resume()
    vi.advanceTimersByTime(499)
    expect(crossing).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(crossing).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(79)
    expect(completed).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(completed).toHaveBeenCalledOnce()
    expect(resetAll).toHaveBeenCalledOnce()
    transport.pause()
    transport.resume()
    vi.runAllTimers()
    expect(crossing).toHaveBeenCalledTimes(1)
    expect(completed).toHaveBeenCalledTimes(1)
    expect(resetAll).toHaveBeenCalledTimes(1)
    transport.dispose()
    expect(resetAll).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending tail cleanly on reset and dispose', () => {
    vi.useFakeTimers()
    const crossing = vi.fn()
    const completed = vi.fn()
    const resetAll = vi.fn()
    const tailPiece: CompiledPiece = {
      selectedTrackNames: [], ppq: 480, timeSignatures: [{ ticks: 0, numerator: 4, denominator: 4 }], notes: [],
      packets: [{ index: 0, startsAt: 0, anchorTick: 0, notes: [] }],
      crossings: [{ kind: 'noteOff', at: 1, noteId: 'tail', order: 0 }],
    }
    const transport = new PerformanceTransport(tailPiece, { attack: vi.fn(), crossing, completed, silenceAll: vi.fn(), resetAll })
    transport.advance(0)
    vi.advanceTimersByTime(250)
    transport.reset()
    vi.runAllTimers()
    expect(crossing).not.toHaveBeenCalled()
    expect(completed).not.toHaveBeenCalled()
    expect(resetAll).toHaveBeenCalledOnce()
    transport.dispose()
    expect(resetAll).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})

afterEach(() => vi.useRealTimers())
