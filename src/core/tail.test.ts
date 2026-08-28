import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTailPlan, TailScheduler } from './tail'

afterEach(() => vi.useRealTimers())

describe('final tail', () => {
  it('bounds delayed crossings', () => {
    const plan = buildTailPlan([{ kind: 'noteOff', at: 20, noteId: 'a', order: 0 }], 1, [], 4000)
    expect(plan[0]?.delayMs).toBe(4000)
  })

  it('cancels all timers on reset or dispose', () => {
    vi.useFakeTimers()
    const scheduler = new TailScheduler()
    scheduler.schedule([{ delayMs: 100, event: { kind: 'noteOff', at: 1, noteId: 'a', order: 0 } }], vi.fn(), vi.fn())
    scheduler.cancel()
    expect(scheduler.pendingCount).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('uses an injected monotonic clock across wall-clock discontinuities', () => {
    vi.useFakeTimers()
    let monotonicNow = 0
    const apply = vi.fn()
    const scheduler = new TailScheduler(() => monotonicNow)
    scheduler.schedule([{ delayMs: 1000, event: { kind: 'noteOff', at: 1, noteId: 'a', order: 0 } }], apply, vi.fn())
    monotonicNow = 400
    vi.advanceTimersByTime(400)
    scheduler.pause()
    vi.setSystemTime(new Date('2040-01-01T00:00:00Z'))
    vi.advanceTimersByTime(5000)
    scheduler.resume()
    vi.advanceTimersByTime(599)
    expect(apply).not.toHaveBeenCalled()
    monotonicNow = 1000
    vi.advanceTimersByTime(1)
    expect(apply).toHaveBeenCalledOnce()
    scheduler.cancel()
  })
})
