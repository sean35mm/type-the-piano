import type { CrossingEvent } from './types'

export function sortCrossings(events: CrossingEvent[]): CrossingEvent[] {
  return [...events].sort((a, b) =>
    a.at - b.at ||
    (a.kind === b.kind ? a.order - b.order : a.kind === 'noteOff' ? -1 : 1),
  )
}

export class CrossingCursor {
  private index = 0

  constructor(private readonly events: CrossingEvent[]) {}

  consumeThrough(time: number, apply: (event: CrossingEvent) => void): void {
    while (this.index < this.events.length) {
      const event = this.events[this.index]
      if (!event || event.at > time) break
      apply(event)
      this.index += 1
    }
  }

  remaining(): CrossingEvent[] {
    return this.events.slice(this.index)
  }

  reset(): void {
    this.index = 0
  }
}
