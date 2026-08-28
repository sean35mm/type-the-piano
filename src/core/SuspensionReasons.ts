export class SuspensionReasons {
  private reasons = new Set<string>()

  constructor(
    private readonly pause: () => void,
    private readonly resume: () => void,
  ) {}

  suspend(reason: string): void {
    if (this.reasons.has(reason)) return
    const wasActive = this.reasons.size > 0
    this.reasons.add(reason)
    if (!wasActive) this.pause()
  }

  release(reason: string): void {
    if (!this.reasons.delete(reason)) return
    if (this.reasons.size === 0) this.resume()
  }

  clear(): void {
    this.reasons.clear()
  }

  get activeReasons(): readonly string[] {
    return [...this.reasons]
  }
}
