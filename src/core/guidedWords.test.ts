import { describe, expect, it } from 'vitest'
import { GUIDED_WORDS } from './guidedWords'

describe('guided word lexicon', () => {
  it('contains only lowercase ASCII words in the declared length bucket', () => {
    for (const [length, words] of Object.entries(GUIDED_WORDS)) {
      for (const word of words) {
        expect(word).toMatch(/^[a-z]+$/)
        expect(word).toHaveLength(Number(length))
      }
    }
  })
})
