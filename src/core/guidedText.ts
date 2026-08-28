import { GUIDED_WORDS } from './guidedWords'
import type { CompiledPiece, TimeSignatureChange } from './types'

export interface GuideCell {
  packetIndex: number
  expected: string
  wordIndex: number
  beatStart: boolean
  barStart: boolean
}

export interface GuideWord {
  text: string
  startCell: number
  endCell: number
  barBefore: boolean
}

export interface GuideBeat {
  id: number
  packetCount: number
  startsBar: boolean
}

export interface GuidedText {
  cells: GuideCell[]
  words: GuideWord[]
  beats: GuideBeat[]
}

interface GridPosition { beat: number; bar: number }
interface Choice { previous: number; wordLength: number; withSpace: boolean }

const WORD_COST = [0, 24, 8, 2, 0.7, 0, 0.8, 2] as const

function meterAtTicks(ticks: number, ppq: number, changes: TimeSignatureChange[]): GridPosition {
  const safePpq = Number.isFinite(ppq) && ppq > 0 ? ppq : 480
  const meters = changes.length ? changes : [{ ticks: 0, numerator: 4, denominator: 4 }]
  let beatOffset = 0
  let barOffset = 0
  for (let index = 0; index < meters.length; index += 1) {
    const meter = meters[index]!
    const next = meters[index + 1]
    const beatTicks = safePpq * 4 / (meter.denominator || 4)
    const barTicks = beatTicks * (meter.numerator || 4)
    if (!next || ticks < next.ticks) {
      const relative = Math.max(0, ticks - meter.ticks)
      return {
        beat: beatOffset + Math.floor(relative / beatTicks),
        bar: barOffset + Math.floor(relative / barTicks),
      }
    }
    const span = Math.max(0, next.ticks - meter.ticks)
    beatOffset += Math.ceil(span / beatTicks)
    barOffset += Math.ceil(span / barTicks)
  }
  return { beat: 0, bar: 0 }
}

function stableSeed(piece: CompiledPiece): number {
  let hash = 2166136261
  const values = [piece.ppq, piece.packets.length, ...piece.timeSignatures.flatMap((meter) => [meter.ticks, meter.numerator, meter.denominator]), ...piece.packets.map((packet) => packet.anchorTick)]
  for (const value of values) {
    hash ^= Math.round(value)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function chooseWord(length: number, seed: number, wordIndex: number, position: number, previous: string): string {
  const bucket = (GUIDED_WORDS[length] ?? []).filter((word) => word.length === length && /^[a-z]+$/.test(word))
  if (bucket.length === 0) return 'a'.repeat(length)
  let index = (seed + Math.imul(wordIndex + 1, 2654435761) + position * 97) >>> 0
  index %= bucket.length
  if (bucket.length > 1 && bucket[index] === previous) index = (index + 1) % bucket.length
  return bucket[index]!
}

export function generateGuidedText(piece: CompiledPiece): GuidedText {
  const total = piece.packets.length
  if (total === 0) return { cells: [], words: [], beats: [] }
  const grid = piece.packets.map((packet) => meterAtTicks(packet.anchorTick, piece.ppq, piece.timeSignatures))
  const beatEnds = new Set<number>()
  const barEnds = new Set<number>()
  const beats: GuideBeat[] = []
  let beatStart = 0
  for (let index = 1; index <= total; index += 1) {
    const previous = grid[index - 1]!
    const current = grid[index]
    if (!current || current.beat !== previous.beat) {
      beatEnds.add(index)
      beats.push({ id: previous.beat, packetCount: index - beatStart, startsBar: beatStart === 0 || grid[beatStart - 1]?.bar !== previous.bar })
      beatStart = index
    }
    if (!current || current.bar !== previous.bar) barEnds.add(index)
  }

  const costs = Array<number>(total + 1).fill(Number.POSITIVE_INFINITY)
  const choices: Array<Choice | undefined> = Array(total + 1)
  costs[0] = 0
  for (let position = 0; position < total; position += 1) {
    if (!Number.isFinite(costs[position])) continue
    for (let wordLength = 1; wordLength <= 7; wordLength += 1) {
      for (const withSpace of [true, false]) {
        const end = position + wordLength + (withSpace ? 1 : 0)
        if (end > total || (!withSpace && end !== total)) continue
        let cost = costs[position]! + WORD_COST[wordLength]!
        for (const boundary of beatEnds) {
          if (boundary > position && boundary < end) cost += 5
        }
        for (const boundary of barEnds) {
          if (boundary > position && boundary < end) cost += 10
        }
        if (beatEnds.has(end)) cost -= 7
        if (barEnds.has(end)) cost -= 5
        if (cost < costs[end]! - 0.0001) {
          costs[end] = cost
          choices[end] = { previous: position, wordLength, withSpace }
        }
      }
    }
  }

  const fitted: Choice[] = []
  let cursor = total
  while (cursor > 0) {
    const choice = choices[cursor]
    if (!choice) throw new Error(`Could not fit a guided text to ${total} packets.`)
    fitted.push(choice)
    cursor = choice.previous
  }
  fitted.reverse()

  const seed = stableSeed(piece)
  const cells: GuideCell[] = []
  const words: GuideWord[] = []
  let previousWord = ''
  for (const [wordIndex, choice] of fitted.entries()) {
    const word = chooseWord(choice.wordLength, seed, wordIndex, cells.length, previousWord)
    const startCell = cells.length
    previousWord = word
    for (const expected of word) {
      const packetIndex = cells.length
      cells.push({
        packetIndex,
        expected,
        wordIndex,
        beatStart: packetIndex === 0 || grid[packetIndex]?.beat !== grid[packetIndex - 1]?.beat,
        barStart: packetIndex === 0 || grid[packetIndex]?.bar !== grid[packetIndex - 1]?.bar,
      })
    }
    if (choice.withSpace) {
      const packetIndex = cells.length
      cells.push({
        packetIndex,
        expected: ' ',
        wordIndex,
        beatStart: grid[packetIndex]?.beat !== grid[packetIndex - 1]?.beat,
        barStart: grid[packetIndex]?.bar !== grid[packetIndex - 1]?.bar,
      })
    }
    words.push({ text: word, startCell, endCell: cells.length, barBefore: cells[startCell]?.barStart ?? false })
  }
  return { cells, words, beats }
}
