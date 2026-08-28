import type { GuidedText } from './guidedText'
import type { GuidedTypingSnapshot } from './GuidedTypingSession'

export function guidedWordAnnouncement(
  guide: GuidedText | null,
  snapshot: GuidedTypingSnapshot | null,
): string {
  if (!guide || !snapshot || snapshot.completed) return ''
  const cell = guide.cells[snapshot.cursor]
  const word = cell ? guide.words[cell.wordIndex] : undefined
  if (!word) return ''
  const endsWithSpace = guide.cells[word.endCell - 1]?.expected === ' '
  return `Current word: ${word.text}. Type the word${endsWithSpace ? ', then space' : ''}.`
}
