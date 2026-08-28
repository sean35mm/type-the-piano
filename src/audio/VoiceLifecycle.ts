import type { NoteId } from '../core/types'

interface VoiceState { channel: number; logicallyReleased: boolean }

export class VoiceLifecycle {
  private voices = new Map<NoteId, VoiceState>()
  private sustain = new Map<number, boolean>()

  attack(id: NoteId, channel: number): void {
    this.voices.set(id, { channel, logicallyReleased: false })
  }

  noteOff(id: NoteId): NoteId[] {
    const voice = this.voices.get(id)
    if (!voice || voice.logicallyReleased) return []
    voice.logicallyReleased = true
    return this.sustain.get(voice.channel) ? [] : [id]
  }

  setSustain(channel: number, down: boolean): NoteId[] {
    this.sustain.set(channel, down)
    if (down) return []
    return [...this.voices]
      .filter(([, voice]) => voice.channel === channel && voice.logicallyReleased)
      .map(([id]) => id)
  }

  remove(id: NoteId): void {
    this.voices.delete(id)
  }

  isLogicallyReleased(id: NoteId): boolean {
    return this.voices.get(id)?.logicallyReleased ?? false
  }

  silenceVoices(): NoteId[] {
    const ids = [...this.voices.keys()]
    this.voices.clear()
    return ids
  }

  reset(): NoteId[] {
    const ids = this.silenceVoices()
    this.sustain.clear()
    return ids
  }

  get size(): number {
    return this.voices.size
  }
}
