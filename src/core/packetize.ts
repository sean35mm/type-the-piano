import type { CompiledNote, Packet } from './types'

export const PACKET_WINDOW_SECONDS = 0.015

export function packetize(notes: CompiledNote[], windowSeconds = PACKET_WINDOW_SECONDS): Packet[] {
  const packets: Packet[] = []
  let cursor = 0

  while (cursor < notes.length) {
    const anchor = notes[cursor]
    if (!anchor) break
    const packetNotes: CompiledNote[] = []
    while (cursor < notes.length) {
      const note = notes[cursor]
      if (!note || note.startsAt - anchor.startsAt > windowSeconds) break
      packetNotes.push(note)
      cursor += 1
    }
    packets.push({ index: packets.length, startsAt: anchor.startsAt, anchorTick: anchor.startsAtTick, notes: packetNotes })
  }

  return packets
}
