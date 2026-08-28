export interface PendingValue<T> {
  generation: number
  value: T
}

export class PendingPublication<T> {
  private pending: PendingValue<T> | null = null

  queue(generation: number, value: T): void {
    this.pending = { generation, value }
  }

  take(currentGeneration: number): T | null {
    const pending = this.pending
    this.pending = null
    return pending?.generation === currentGeneration ? pending.value : null
  }

  discard(): void {
    this.pending = null
  }

  get hasPending(): boolean {
    return this.pending !== null
  }
}
