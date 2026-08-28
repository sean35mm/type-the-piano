import type { GuidedText } from './guidedText'

export interface GuidedTypingSnapshot {
  cursor: number
  matched: number
  total: number
  accuracy: number
  attempts: readonly boolean[]
  completed: boolean
  pendingActual: string | null
  incorrectAttempts: number
  activeElapsedMs: number
  wpm: number | null
}

export interface GuidedEvaluation { correct: boolean; expected: string | null }
export interface GuidedCommitResult { committed: boolean }

export class GuidedTypingSession {
  private cursorValue = 0
  private correctAttempts = 0
  private incorrectAttemptsValue = 0
  private attemptsValue: boolean[] = []
  private pendingActualValue: string | null = null
  private started = false
  private segmentStartedAt: number | null = null
  private elapsedMs = 0
  private lastObservedAt = 0
  private suspensions = new Set<string>()

  constructor(readonly guide: GuidedText) {}

  evaluate(actual: string, atMs: number): GuidedEvaluation {
    const at = this.observe(atMs)
    if (!this.started) {
      this.started = true
      if (this.suspensions.size === 0) this.segmentStartedAt = at
    }
    const expected = this.guide.cells[this.cursorValue]?.expected ?? null
    return { correct: expected !== null && actual === expected, expected }
  }

  recordWrong(actual: string): void {
    this.incorrectAttemptsValue += 1
    this.pendingActualValue = actual
  }

  clearError(): void {
    this.pendingActualValue = null
  }

  commitCorrect(packetIndex: number, atMs: number): GuidedCommitResult {
    const at = this.observe(atMs)
    const cell = this.guide.cells[this.cursorValue]
    if (!cell || cell.packetIndex !== packetIndex) return { committed: false }
    if (!this.started) {
      this.started = true
      if (this.suspensions.size === 0) this.segmentStartedAt = at
    }
    this.correctAttempts += 1
    this.attemptsValue.push(true)
    this.cursorValue += 1
    this.pendingActualValue = null
    return { committed: true }
  }

  suspend(reason: string, atMs: number): void {
    const at = this.observe(atMs)
    if (this.suspensions.has(reason)) return
    if (this.suspensions.size === 0 && this.segmentStartedAt !== null) {
      this.elapsedMs += Math.max(0, at - this.segmentStartedAt)
      this.segmentStartedAt = null
    }
    this.suspensions.add(reason)
  }

  resume(reason: string, atMs: number): void {
    const at = this.observe(atMs)
    this.suspensions.delete(reason)
    if (this.suspensions.size === 0 && this.started && this.segmentStartedAt === null) {
      this.segmentStartedAt = at
    }
  }

  reset(): void {
    this.cursorValue = 0
    this.correctAttempts = 0
    this.incorrectAttemptsValue = 0
    this.attemptsValue = []
    this.pendingActualValue = null
    this.started = false
    this.segmentStartedAt = null
    this.elapsedMs = 0
    this.lastObservedAt = 0
    this.suspensions.clear()
  }

  snapshot(): GuidedTypingSnapshot {
    const activeElapsedMs = this.elapsedMs + (
      this.segmentStartedAt === null ? 0 : Math.max(0, this.lastObservedAt - this.segmentStartedAt)
    )
    const attemptCount = this.correctAttempts + this.incorrectAttemptsValue
    const wpm = this.correctAttempts >= 5 && activeElapsedMs >= 1000
      ? Math.max(0, Math.round(this.correctAttempts * 12000 / activeElapsedMs))
      : null
    return {
      cursor: this.cursorValue,
      matched: this.correctAttempts,
      total: this.guide.cells.length,
      accuracy: attemptCount ? this.correctAttempts / attemptCount : 1,
      attempts: this.attemptsValue,
      completed: this.cursorValue === this.guide.cells.length,
      pendingActual: this.pendingActualValue,
      incorrectAttempts: this.incorrectAttemptsValue,
      activeElapsedMs,
      wpm,
    }
  }

  private observe(atMs: number): number {
    this.lastObservedAt = Math.max(this.lastObservedAt, Number.isFinite(atMs) ? atMs : this.lastObservedAt)
    return this.lastObservedAt
  }

  get cursor(): number {
    return this.cursorValue
  }
}
