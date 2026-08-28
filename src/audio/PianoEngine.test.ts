import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompiledNote } from '../core/types'
import { PianoEngine } from './PianoEngine'

class MockParam {
  value = 1
  setValueAtTime = vi.fn((value: number) => { this.value = value })
  exponentialRampToValueAtTime = vi.fn((value: number) => { this.value = value })
  cancelScheduledValues = vi.fn()
  setTargetAtTime = vi.fn((value: number) => { this.value = value })
}

class MockGain {
  gain = new MockParam()
  connect = vi.fn()
  disconnect = vi.fn()
}

class MockSource {
  buffer: AudioBuffer | null = null
  playbackRate = new MockParam()
  onended: ((event: Event) => void) | null = null
  connect = vi.fn()
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockAudioContext {
  static latest: MockAudioContext
  state: AudioContextState = 'suspended'
  currentTime = 1
  destination = {} as AudioDestinationNode
  gains: MockGain[] = []
  sources: MockSource[] = []

  constructor() { MockAudioContext.latest = this }
  createGain() { const gain = new MockGain(); this.gains.push(gain); return gain as unknown as GainNode }
  createBufferSource() { const source = new MockSource(); this.sources.push(source); return source as unknown as AudioBufferSourceNode }
  decodeAudioData = vi.fn(async () => ({} as AudioBuffer))
  resume = vi.fn(async () => { this.state = 'running' })
  close = vi.fn(async () => { this.state = 'closed' })
}

const note = (id: string, midi = 60, channel = 0): CompiledNote => ({
  id, midi, channel, name: 'C4', startsAt: 0, startsAtTick: 0, duration: 1, velocity: 0.8, trackOrder: 0, noteOrder: 0,
})

describe('PianoEngine production voice lifecycle', () => {
  let engine: PianoEngine

  beforeEach(async () => {
    vi.stubGlobal('AudioContext', MockAudioContext)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })))
    engine = new PianoEngine()
    await engine.wake()
  })

  afterEach(async () => {
    await engine.dispose()
    vi.unstubAllGlobals()
  })

  it('releases repeated pitches independently by NoteId', () => {
    engine.attack(note('first'))
    engine.attack(note('second'))
    const [first, second] = MockAudioContext.latest.sources
    engine.noteOff('first')
    expect(first?.stop).toHaveBeenCalledOnce()
    expect(second?.stop).not.toHaveBeenCalled()
  })

  it('preserves score sustain while silencing current voices', () => {
    engine.setSustain(3, true)
    engine.attack(note('before-blur', 60, 3))
    engine.silenceAll()
    engine.attack(note('after-blur', 60, 3))
    const resumed = MockAudioContext.latest.sources[1]
    engine.noteOff('after-blur')
    expect(resumed?.stop).not.toHaveBeenCalled()
    engine.setSustain(3, false)
    expect(resumed?.stop).toHaveBeenCalledOnce()
  })

  it('steals the oldest voice when the 64-voice cap is reached', () => {
    for (let index = 0; index < 65; index += 1) engine.attack(note(`voice-${index}`, 60 + index % 12))
    expect(MockAudioContext.latest.sources[0]?.stop).toHaveBeenCalledOnce()
    expect(MockAudioContext.latest.sources[64]?.start).toHaveBeenCalledOnce()
  })

  it('disconnects and removes a voice when its source ends', () => {
    engine.attack(note('ended'))
    const source = MockAudioContext.latest.sources[0]!
    const voiceGain = MockAudioContext.latest.gains[1]!
    source.onended?.({} as Event)
    engine.noteOff('ended')
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(voiceGain.disconnect).toHaveBeenCalledOnce()
    expect(source.stop).not.toHaveBeenCalled()
  })
})
