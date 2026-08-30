import { nearestSample, PIANO_SAMPLES, playbackRate } from './samples'
import type { CompiledNote, NoteId } from '../core/types'
import { VoiceLifecycle } from './VoiceLifecycle'

interface Voice {
  id: NoteId
  channel: number
  source: AudioBufferSourceNode
  gain: GainNode
  startedAt: number
  releasing: boolean
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`
const MAX_OUTPUT_GAIN = 0.5

export class PianoEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<number, AudioBuffer>()
  private voices = new Map<NoteId, Voice>()
  private lifecycle = new VoiceLifecycle()
  private loading: Promise<void> | null = null
  private disposed = false
  private volume = 0.72

  async wake(): Promise<void> {
    if (this.disposed) throw new Error('The piano engine has been disposed.')
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' })
      this.master = this.context.createGain()
      this.master.gain.value = this.volume * MAX_OUTPUT_GAIN
      this.master.connect(this.context.destination)
    }
    await this.context.resume()
    this.loading ??= this.loadSamples()
    await this.loading
  }

  private async loadSamples(): Promise<void> {
    const context = this.context
    if (!context) throw new Error('Audio is not initialized.')
    const decoded = await Promise.all(PIANO_SAMPLES.map(async (sample) => {
      const response = await fetch(assetUrl(`assets/piano/salamander/${sample.filename}.mp3`))
      if (!response.ok) throw new Error(`Could not load piano sample ${sample.filename}.`)
      return [sample.rootMidi, await context.decodeAudioData(await response.arrayBuffer())] as const
    }))
    for (const [root, buffer] of decoded) this.buffers.set(root, buffer)
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended' || this.context?.state === 'interrupted') {
      await this.context.resume()
    }
  }

  get isRunning(): boolean {
    return this.context?.state === 'running'
  }

  attack(note: CompiledNote): void {
    const context = this.context
    const master = this.master
    if (!context || !master || context.state !== 'running') return
    if (this.voices.size >= 64) this.stealVoice()

    const sample = nearestSample(note.midi)
    const buffer = this.buffers.get(sample.rootMidi)
    if (!buffer) return
    const source = context.createBufferSource()
    const gain = context.createGain()
    const now = context.currentTime
    source.buffer = buffer
    source.playbackRate.value = playbackRate(note.midi, sample.rootMidi)
    const level = 0.09 + Math.pow(note.velocity, 1.35) * 0.72
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, level), now + 0.008)
    source.connect(gain)
    gain.connect(master)

    const voice: Voice = {
      id: note.id,
      channel: note.channel,
      source,
      gain,
      startedAt: now,
      releasing: false,
    }
    this.voices.set(note.id, voice)
    this.lifecycle.attack(note.id, note.channel)
    source.onended = () => this.cleanupVoice(voice)
    source.start(now)
  }

  noteOff(noteId: NoteId): void {
    for (const id of this.lifecycle.noteOff(noteId)) this.releaseById(id)
  }

  setSustain(channel: number, down: boolean): void {
    for (const id of this.lifecycle.setSustain(channel, down)) this.releaseById(id)
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value))
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.volume * MAX_OUTPUT_GAIN, this.context.currentTime, 0.015)
    }
  }

  silenceAll(): void {
    for (const id of this.lifecycle.silenceVoices()) this.releaseById(id, 0.035)
  }

  resetScoreState(): void {
    for (const id of this.lifecycle.reset()) this.releaseById(id, 0.035)
  }

  private stealVoice(): void {
    const voices = [...this.voices.values()].sort((a, b) =>
      Number(this.lifecycle.isLogicallyReleased(b.id)) - Number(this.lifecycle.isLogicallyReleased(a.id)) ||
      a.startedAt - b.startedAt,
    )
    const candidate = voices[0]
    if (candidate) {
      this.voices.delete(candidate.id)
      this.lifecycle.remove(candidate.id)
      this.releaseVoice(candidate, 0.025)
    }
  }

  private releaseVoice(voice: Voice, seconds = 0.12): void {
    if (voice.releasing || !this.context) return
    voice.releasing = true
    const now = this.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now)
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
    try { voice.source.stop(now + seconds + 0.02) } catch { this.cleanupVoice(voice) }
  }

  private releaseById(id: NoteId, seconds?: number): void {
    const voice = this.voices.get(id)
    if (voice) this.releaseVoice(voice, seconds)
  }

  private cleanupVoice(voice: Voice): void {
    if (this.voices.get(voice.id) === voice) this.voices.delete(voice.id)
    this.lifecycle.remove(voice.id)
    voice.source.disconnect()
    voice.gain.disconnect()
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.resetScoreState()
    const context = this.context
    this.context = null
    this.master = null
    if (context && context.state !== 'closed') await context.close()
    this.voices.clear()
    this.buffers.clear()
  }
}
