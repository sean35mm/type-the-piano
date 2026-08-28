import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { generateGuidedText } from './guidedText'
import { compileMidi } from './midiCompiler'
import type { CompiledPiece, Packet } from './types'

const makePiece = (beatPacketCounts: number[], tickOffset = 0): CompiledPiece => {
  const packets: Packet[] = []
  for (const [beat, count] of beatPacketCounts.entries()) {
    for (let index = 0; index < count; index += 1) {
      packets.push({ index: packets.length, startsAt: packets.length * .01, anchorTick: tickOffset + beat * 480 + index * (400 / Math.max(1, count)), notes: [] })
    }
  }
  return {
    selectedTrackNames: ['fixture'], ppq: 480,
    timeSignatures: [{ ticks: 0, numerator: 4, denominator: 4 }],
    notes: [], packets, crossings: [],
  }
}

const canonicalPiece = () => {
  const path = fileURLToPath(new URL('../../public/assets/midi/chopin-op25-no1-aeolian-harp.mid', import.meta.url))
  const bytes = readFileSync(path)
  return compileMidi(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}

describe('guided text generation', () => {
  it('maps an ordinary six-packet beat to five letters and a consuming space', () => {
    const guide = generateGuidedText(makePiece([6]))
    expect(guide.words).toHaveLength(1)
    expect(guide.words[0]?.text).toHaveLength(5)
    expect(guide.cells.map((cell) => cell.expected).join('')).toMatch(/^[a-z]{5} $/)
  })

  it('fits sparse, dense, final, and degenerate totals exactly', () => {
    for (const offset of [0, 960, 1920, 6240]) {
      for (const counts of [[], [1], [2, 3, 5], [1, 11, 2], [7, 19, 4, 13]]) {
        const piece = makePiece(counts, offset)
        const guide = generateGuidedText(piece)
        expect(guide.cells).toHaveLength(piece.packets.length)
        expect(guide.cells.map((cell) => cell.packetIndex)).toEqual(piece.packets.map((packet) => packet.index))
        expect(guide.words.every((word) => word.text.length > 0)).toBe(true)
      }
    }
  })

  it('depends on normalized tick structure, not tempo seconds or metadata', () => {
    const original = makePiece([6, 6, 4])
    const changed = { ...original, selectedTrackNames: ['renamed'], packets: original.packets.map((packet) => ({ ...packet, startsAt: packet.startsAt * 3 })) }
    expect(generateGuidedText(changed)).toEqual(generateGuidedText(original))
  })

  it('builds a deterministic, common-length canonical guide', () => {
    const piece = canonicalPiece()
    const first = generateGuidedText(piece)
    const second = generateGuidedText(piece)
    expect(first).toEqual(second)
    expect(first.cells).toHaveLength(1213)
    expect(first.cells.every((cell, index) => cell.packetIndex === index)).toBe(true)
    expect(first.cells.map((cell) => cell.expected).join('')).toMatch(/^[a-z ]+$/)
    expect(first.beats).toHaveLength(195)
    expect(first.beats.filter((beat) => beat.packetCount === 6)).toHaveLength(152)
    const barStarts = first.cells.flatMap((cell, index) => cell.barStart ? [index] : [])
    const barPacketCounts = barStarts.map((start, index) => (barStarts[index + 1] ?? first.cells.length) - start)
    expect(barPacketCounts).toHaveLength(50)
    expect(barPacketCounts.filter((count) => count === 24)).toHaveLength(37)
    expect(first.words.filter((word) => word.text.length >= 3 && word.text.length <= 7).length / first.words.length).toBeGreaterThan(.9)
    expect(first.words.some((word, index) => index > 0 && word.text === first.words[index - 1]?.text)).toBe(false)
  })

  it('falls back safely when meter and PPQ are missing', () => {
    const piece = { ...makePiece([3, 8]), ppq: 0, timeSignatures: [] }
    const guide = generateGuidedText(piece)
    expect(guide.cells).toHaveLength(11)
    expect(guide.words.every((word) => word.text.length > 0)).toBe(true)
  })
})
