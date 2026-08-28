import { describe, expect, it } from 'vitest'
import { GuidedTypingSession } from './GuidedTypingSession'
import type { GuidedText } from './guidedText'

const guide: GuidedText = {
  cells: [...'abcde '].map((expected, packetIndex) => ({
    packetIndex, expected, wordIndex: 0, beatStart: packetIndex === 0, barStart: packetIndex === 0,
  })),
  words: [{ text: 'abcde', startCell: 0, endCell: 6, barBefore: true }],
  beats: [{ id: 0, packetCount: 6, startsBar: true }],
}

const correct = (session: GuidedTypingSession, actual: string, packetIndex: number, atMs: number) => {
  expect(session.evaluate(actual, atMs).correct).toBe(true)
  expect(session.commitCorrect(packetIndex, atMs)).toEqual({ committed: true })
}

describe('GuidedTypingSession', () => {
  it('records a wrong printable without moving and allows direct correct replacement', () => {
    const session = new GuidedTypingSession(guide)
    expect(session.evaluate('A', 0)).toEqual({ correct: false, expected: 'a' })
    session.recordWrong('A')
    expect(session.snapshot()).toMatchObject({ cursor: 0, matched: 0, incorrectAttempts: 1, pendingActual: 'A' })
    correct(session, 'a', 0, 100)
    expect(session.snapshot()).toMatchObject({ cursor: 1, matched: 1, pendingActual: null, accuracy: .5 })
  })

  it('clears a typo with Backspace semantics without rewinding committed cells', () => {
    const session = new GuidedTypingSession(guide)
    correct(session, 'a', 0, 0)
    session.evaluate('x', 100)
    session.recordWrong('x')
    session.clearError()
    expect(session.snapshot()).toMatchObject({ cursor: 1, pendingActual: null, incorrectAttempts: 1 })
    session.clearError()
    expect(session.cursor).toBe(1)
  })

  it('enforces expected Space and packet-index authority', () => {
    const session = new GuidedTypingSession(guide)
    expect(session.evaluate(' ', 0).correct).toBe(false)
    session.recordWrong(' ')
    expect(session.commitCorrect(1, 0)).toEqual({ committed: false })
    expect(session.cursor).toBe(0)
    correct(session, 'a', 0, 10)
    for (let index = 1; index < 5; index += 1) correct(session, guide.cells[index]!.expected, index, index * 10)
    expect(session.evaluate(' ', 60).correct).toBe(true)
    expect(session.cursor).toBe(5)
    session.commitCorrect(5, 60)
    expect(session.snapshot().completed).toBe(true)
  })

  it('keeps cursor equal to successful musical advances across corrections', () => {
    const session = new GuidedTypingSession(guide)
    let advances = 0
    for (const [actual, atMs] of [['x', 0], ['a', 10], [' ', 20], ['b', 30], ['c', 40]] as const) {
      const evaluation = session.evaluate(actual, atMs)
      if (evaluation.correct) {
        session.commitCorrect(advances, atMs)
        advances += 1
      } else {
        session.recordWrong(actual)
      }
      expect(session.cursor).toBe(advances)
    }
    expect(advances).toBe(3)
    expect(session.snapshot()).toMatchObject({ incorrectAttempts: 2, pendingActual: null })
  })

  it('uses corrected-character WPM with a sensible startup threshold', () => {
    const session = new GuidedTypingSession(guide)
    for (let index = 0; index < 4; index += 1) correct(session, guide.cells[index]!.expected, index, index * 250)
    expect(session.snapshot().wpm).toBeNull()
    correct(session, 'e', 4, 1000)
    expect(session.snapshot()).toMatchObject({ activeElapsedMs: 1000, wpm: 60 })
  })

  it('excludes explicit pause, blur, and hidden time without an interval', () => {
    const session = new GuidedTypingSession(guide)
    correct(session, 'a', 0, 0)
    session.suspend('pause', 500)
    session.suspend('hidden', 600)
    session.suspend('blur', 700)
    session.resume('pause', 5000)
    session.resume('blur', 8000)
    session.resume('hidden', 10000)
    for (let index = 1; index < 5; index += 1) correct(session, guide.cells[index]!.expected, index, 10000 + index * 250)
    expect(session.snapshot()).toMatchObject({ activeElapsedMs: 1500, wpm: 40 })
  })

  it('wrong attempts affect accuracy but not WPM numerator, while reset clears all timing', () => {
    const session = new GuidedTypingSession(guide)
    session.evaluate('x', 0)
    session.recordWrong('x')
    session.clearError()
    for (let index = 0; index < 5; index += 1) correct(session, guide.cells[index]!.expected, index, 1000 + index * 250)
    expect(session.snapshot()).toMatchObject({ matched: 5, incorrectAttempts: 1, accuracy: 5 / 6, wpm: 30 })
    session.reset()
    expect(session.snapshot()).toMatchObject({ cursor: 0, matched: 0, incorrectAttempts: 0, accuracy: 1, activeElapsedMs: 0, wpm: null })
  })
})
