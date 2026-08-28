import type { CrossingEvent } from './types'

export interface TimingGap { source: number; performance: number }
export interface TailStep { delayMs: number; event: CrossingEvent }

export function performanceScale(gaps: TimingGap[]): number {
  const usable = gaps.slice(-6).filter((gap) => gap.source > 0 && gap.performance >= 0)
  if (usable.length === 0) return 1
  const source = usable.reduce((sum, gap) => sum + gap.source, 0)
  const performance = usable.reduce((sum, gap) => sum + gap.performance, 0)
  return Math.min(3, Math.max(0.35, performance / source))
}

export function buildTailPlan(
  events: CrossingEvent[],
  finalAttackTime: number,
  gaps: TimingGap[],
  maximumTailMs = 4000,
): TailStep[] {
  const scale = performanceScale(gaps)
  return events.map((event) => ({
    event,
    delayMs: Math.min(maximumTailMs, Math.max(0, (event.at - finalAttackTime) * scale * 1000)),
  }))
}

export class TailScheduler {
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private plan: TailStep[] = []
  private pendingSteps = new Set<number>()
  private apply: ((event: CrossingEvent) => void) | null = null
  private finish: (() => void) | null = null
  private elapsedMs = 0
  private startedAt = 0
  private completionDelayMs = 0
  private completionPending = false
  private paused = false
  private active = false
  private generation = 0

  constructor(private readonly now: () => number = () => performance.now()) {}

  schedule(plan: TailStep[], apply: (event: CrossingEvent) => void, finish: () => void): void {
    this.cancel()
    this.plan = plan
    this.pendingSteps = new Set(plan.map((_, index) => index))
    this.apply = apply
    this.finish = finish
    this.completionDelayMs = plan.reduce((maximum, step) => Math.max(maximum, step.delayMs), 0) + 80
    this.completionPending = true
    this.elapsedMs = 0
    this.paused = false
    this.active = true
    this.startedAt = this.now()
    this.armTimers()
  }

  private armTimers(): void {
    const generation = this.generation
    for (const index of this.pendingSteps) {
      const step = this.plan[index]
      if (!step) continue
      const timer = setTimeout(() => {
        this.timers.delete(timer)
        if (this.generation !== generation || !this.pendingSteps.delete(index)) return
        this.apply?.(step.event)
      }, Math.max(0, step.delayMs - this.elapsedMs))
      this.timers.add(timer)
    }
    if (this.completionPending) {
      const completion = setTimeout(() => {
        this.timers.delete(completion)
        if (this.generation !== generation || !this.completionPending) return
        this.completionPending = false
        this.active = false
        this.finish?.()
      }, Math.max(0, this.completionDelayMs - this.elapsedMs))
      this.timers.add(completion)
    }
  }

  pause(): void {
    if (!this.active || this.paused) return
    this.elapsedMs += Math.max(0, this.now() - this.startedAt)
    this.paused = true
    this.clearTimers()
  }

  resume(): void {
    if (!this.active || !this.paused) return
    this.paused = false
    this.startedAt = this.now()
    this.armTimers()
  }

  cancel(): void {
    this.generation += 1
    this.clearTimers()
    this.plan = []
    this.pendingSteps.clear()
    this.apply = null
    this.finish = null
    this.elapsedMs = 0
    this.completionDelayMs = 0
    this.completionPending = false
    this.paused = false
    this.active = false
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
  }

  get pendingCount(): number {
    return this.timers.size
  }
}
