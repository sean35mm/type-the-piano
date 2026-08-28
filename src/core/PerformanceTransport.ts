import { CrossingCursor } from './crossings'
import { buildTailPlan, TailScheduler, type TimingGap } from './tail'
import type { CompiledPiece, CrossingEvent, Packet } from './types'

export interface TransportOutput {
  attack(packet: Packet): void
  crossing(event: CrossingEvent): void
  completed(): void
  silenceAll(): void
  resetAll(): void
}

export class PerformanceTransport {
  private packetIndex = 0
  private cursor: CrossingCursor
  private tail = new TailScheduler()
  private performanceTimes: number[] = []
  private paused = false
  private finished = false
  private resetIssued = false

  constructor(private readonly piece: CompiledPiece, private readonly output: TransportOutput) {
    this.cursor = new CrossingCursor(piece.crossings)
  }

  advance(atMs: number): Packet | null {
    if (this.paused || this.finished) return null
    const packet = this.piece.packets[this.packetIndex]
    if (!packet) return null
    if (this.packetIndex === 0) this.resetIssued = false
    this.cursor.consumeThrough(packet.startsAt, (event) => this.output.crossing(event))
    this.output.attack(packet)
    this.performanceTimes.push(atMs)
    this.packetIndex += 1
    if (this.packetIndex === this.piece.packets.length) this.scheduleTail(packet.startsAt)
    return packet
  }

  private scheduleTail(finalAttackTime: number): void {
    const gaps: TimingGap[] = []
    const start = Math.max(1, this.performanceTimes.length - 6)
    for (let index = start; index < this.performanceTimes.length; index += 1) {
      const previousPacket = this.piece.packets[index - 1]
      const packet = this.piece.packets[index]
      const previousTime = this.performanceTimes[index - 1]
      const time = this.performanceTimes[index]
      if (previousPacket && packet && previousTime !== undefined && time !== undefined) {
        gaps.push({ source: packet.startsAt - previousPacket.startsAt, performance: (time - previousTime) / 1000 })
      }
    }
    const plan = buildTailPlan(this.cursor.remaining(), finalAttackTime, gaps)
    this.tail.schedule(plan, (event) => {
      this.cursor.consumeThrough(event.at, (crossing) => this.output.crossing(crossing))
    }, () => {
      this.finished = true
      this.resetAllOnce()
      this.output.completed()
    })
  }

  pause(): void {
    this.paused = true
    this.tail.pause()
    this.output.silenceAll()
  }

  resume(): void {
    if (this.finished) return
    this.paused = false
    if (this.packetIndex === this.piece.packets.length) {
      this.tail.resume()
    }
  }

  reset(): void {
    this.tail.cancel()
    this.resetAllOnce()
    this.packetIndex = 0
    this.performanceTimes = []
    this.paused = false
    this.finished = false
    this.cursor = new CrossingCursor(this.piece.crossings)
  }

  dispose(): void {
    this.paused = true
    this.tail.cancel()
    this.resetAllOnce()
  }

  private resetAllOnce(): void {
    if (this.resetIssued) return
    this.resetIssued = true
    this.output.resetAll()
  }

  get progress(): number {
    return this.piece.packets.length ? this.packetIndex / this.piece.packets.length : 0
  }

  get nextPacketIndex(): number {
    return this.packetIndex
  }
}
