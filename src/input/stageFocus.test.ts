import { describe, expect, it } from 'vitest'
import { shouldRestoreStageFocus } from './stageFocus'

describe('shouldRestoreStageFocus', () => {
  it('restores focus only for playable states when focus is safe to move', () => {
    expect(shouldRestoreStageFocus('ready', true)).toBe(true)
    expect(shouldRestoreStageFocus('active', true)).toBe(true)
    expect(shouldRestoreStageFocus('paused', true)).toBe(false)
    expect(shouldRestoreStageFocus('asleep', true)).toBe(false)
  })

  it('preserves deliberate focus on an in-app control', () => {
    expect(shouldRestoreStageFocus('ready', false)).toBe(false)
    expect(shouldRestoreStageFocus('active', false)).toBe(false)
  })
})
