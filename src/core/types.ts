export type NoteId = string

export interface CompiledNote {
  id: NoteId
  midi: number
  name: string
  startsAt: number
  startsAtTick: number
  duration: number
  velocity: number
  channel: number
  trackOrder: number
  noteOrder: number
}

export interface Packet {
  index: number
  startsAt: number
  anchorTick: number
  notes: CompiledNote[]
}

export interface TimeSignatureChange {
  ticks: number
  numerator: number
  denominator: number
}

export type CrossingEvent =
  | { kind: 'noteOff'; at: number; noteId: NoteId; order: number }
  | { kind: 'sustain'; at: number; channel: number; down: boolean; order: number }

export interface CompiledPiece {
  selectedTrackNames: string[]
  ppq: number
  timeSignatures: TimeSignatureChange[]
  notes: CompiledNote[]
  packets: Packet[]
  crossings: CrossingEvent[]
}
