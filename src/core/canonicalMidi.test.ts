import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PIECE, PIECES } from '../catalog'
import { compileMidi } from './midiCompiler'

describe('canonical Aeolian Harp MIDI', () => {
  it('has the inspected attack and packet invariants', () => {
    const path = fileURLToPath(new URL('../../public/assets/midi/chopin-op25-no1-aeolian-harp.mid', import.meta.url))
    const bytes = readFileSync(path)
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const piece = compileMidi(arrayBuffer, DEFAULT_PIECE.trackNames)
    expect(piece.selectedTrackNames).toEqual(DEFAULT_PIECE.trackNames)
    expect(piece.ppq).toBe(480)
    expect(piece.timeSignatures).toContainEqual({ ticks: 0, numerator: 4, denominator: 4 })
    expect(piece.packets[0]?.anchorTick).toBe(1440)
    expect(piece.notes).toHaveLength(2222)
    expect(piece.packets).toHaveLength(1213)
    expect(piece.crossings.filter((event) => event.kind === 'sustain')).toHaveLength(213)
  })
})

describe('catalog MIDI files', () => {
  it.each(PIECES)('compiles $title with its configured tracks', (definition) => {
    const pathname = new URL(definition.midiUrl, 'https://type-the-piano.test').pathname
    const path = fileURLToPath(new URL(`../../public${pathname}`, import.meta.url))
    const bytes = readFileSync(path)
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const piece = compileMidi(arrayBuffer, definition.trackNames)
    expect(piece.selectedTrackNames).toEqual(definition.trackNames)
    expect(piece.notes.length).toBeGreaterThan(0)
    expect(piece.packets.length).toBeGreaterThan(0)
  })
})
