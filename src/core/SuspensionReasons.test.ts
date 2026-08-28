import { describe, expect, it, vi } from 'vitest'
import { SuspensionReasons } from './SuspensionReasons'

describe('SuspensionReasons', () => {
  it('pauses on the first reason and resumes only after all overlap clears', () => {
    const pause = vi.fn()
    const resume = vi.fn()
    const reasons = new SuspensionReasons(pause, resume)
    reasons.suspend('blur')
    reasons.suspend('hidden')
    reasons.suspend('blur')
    expect(pause).toHaveBeenCalledOnce()
    reasons.release('blur')
    expect(resume).not.toHaveBeenCalled()
    reasons.release('hidden')
    expect(resume).toHaveBeenCalledOnce()
  })

  it('clears reset state without resuming stale transport', () => {
    const resume = vi.fn()
    const reasons = new SuspensionReasons(vi.fn(), resume)
    reasons.suspend('explicit')
    reasons.clear()
    reasons.release('explicit')
    expect(reasons.activeReasons).toEqual([])
    expect(resume).not.toHaveBeenCalled()
  })
})
