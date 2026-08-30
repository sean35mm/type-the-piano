import { Midi } from '@tonejs/midi'
import { sortCrossings } from './crossings'
import { packetize } from './packetize'
import type { CompiledNote, CompiledPiece, CrossingEvent } from './types'


export function compileMidi(arrayBuffer: ArrayBuffer, trackNames: readonly string[]): CompiledPiece {
  if (trackNames.length === 0) throw new Error('A piece must select at least one MIDI track.')
  if (new Set(trackNames).size !== trackNames.length) throw new Error('MIDI track selections must be unique.')
  const midi = new Midi(arrayBuffer)
  const selected = trackNames.map((name) => {
    const matches = midi.tracks.filter((track) => track.name === name)
    if (matches.length !== 1) {
      throw new Error(`Expected exactly one MIDI track named “${name}”; found ${matches.length}.`)
    }
    return matches[0]!
  })

  const notes: CompiledNote[] = selected.flatMap((track, trackOrder) =>
    track.notes.map((note, noteOrder) => ({
      id: `track-${trackOrder}-note-${noteOrder}`,
      midi: note.midi,
      name: note.name,
      startsAt: note.time,
      startsAtTick: note.ticks,
      duration: note.duration,
      velocity: note.velocity,
      channel: track.channel,
      trackOrder,
      noteOrder,
    })),
  )

  notes.sort((a, b) =>
    a.startsAt - b.startsAt ||
    a.trackOrder - b.trackOrder ||
    a.noteOrder - b.noteOrder ||
    a.midi - b.midi,
  )

  const crossings: CrossingEvent[] = notes.map((note, order) => ({
    kind: 'noteOff',
    at: note.startsAt + note.duration,
    noteId: note.id,
    order,
  }))

  let controlOrder = crossings.length
  for (const track of selected) {
    for (const change of track.controlChanges[64] ?? []) {
      crossings.push({
        kind: 'sustain',
        at: change.time,
        channel: track.channel,
        down: change.value >= 0.5,
        order: controlOrder++,
      })
    }
  }

  if (notes.length === 0) throw new Error('The selected piano tracks contain no notes.')
  const timeSignatures = midi.header.timeSignatures
    .map((change) => ({
      ticks: change.ticks,
      numerator: change.timeSignature[0] ?? 4,
      denominator: change.timeSignature[1] ?? 4,
    }))
    .filter((change) =>
      Number.isFinite(change.ticks) && change.ticks >= 0 &&
      Number.isInteger(change.numerator) && change.numerator > 0 &&
      Number.isInteger(change.denominator) && change.denominator > 0,
    )
    .sort((a, b) => a.ticks - b.ticks)
  if (timeSignatures.length === 0 || timeSignatures[0]!.ticks > 0) {
    timeSignatures.unshift({ ticks: 0, numerator: 4, denominator: 4 })
  }
  return {
    selectedTrackNames: selected.map((track) => track.name),
    ppq: midi.header.ppq,
    timeSignatures,
    notes,
    packets: packetize(notes),
    crossings: sortCrossings(crossings),
  }
}

export async function fetchAndCompileMidi(url: string, trackNames: readonly string[]): Promise<CompiledPiece> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load the MIDI file (${response.status}).`)
  return compileMidi(await response.arrayBuffer(), trackNames)
}
