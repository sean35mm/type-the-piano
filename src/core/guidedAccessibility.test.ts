import { describe, expect, it } from 'vitest'
import { guidedWordAnnouncement } from './guidedAccessibility'
import type { GuidedText } from './guidedText'
import type { GuidedTypingSnapshot } from './GuidedTypingSession'

const guide: GuidedText = {
  cells: [
    { packetIndex: 0, expected: 'g', wordIndex: 0, beatStart: true, barStart: true },
    { packetIndex: 1, expected: 'o', wordIndex: 0, beatStart: false, barStart: false },
    { packetIndex: 2, expected: ' ', wordIndex: 0, beatStart: false, barStart: false },
    { packetIndex: 3, expected: 'n', wordIndex: 1, beatStart: true, barStart: false },
  ],
  words: [
    { text: 'go', startCell: 0, endCell: 3, barBefore: true },
    { text: 'now', startCell: 3, endCell: 4, barBefore: false },
  ],
  beats: [],
}

const snapshot = (cursor: number): GuidedTypingSnapshot => ({
  cursor, matched: cursor, total: 4, accuracy: 1, attempts: [], completed: cursor === 4,
  pendingActual: null, incorrectAttempts: 0, activeElapsedMs: 0, wpm: null,
})

describe('guidedWordAnnouncement', () => {
  it('stays unchanged within a word and changes only at the next word', () => {
    expect(guidedWordAnnouncement(guide, snapshot(0))).toBe('Current word: go. Type the word, then space.')
    expect(guidedWordAnnouncement(guide, snapshot(1))).toBe('Current word: go. Type the word, then space.')
    expect(guidedWordAnnouncement(guide, snapshot(2))).toBe('Current word: go. Type the word, then space.')
    expect(guidedWordAnnouncement(guide, snapshot(3))).toBe('Current word: now. Type the word.')
    expect(guidedWordAnnouncement(guide, snapshot(4))).toBe('')
  })
})
