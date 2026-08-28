import { describe, expect, it } from 'vitest'
import { PendingPublication } from './PendingPublication'

describe('PendingPublication', () => {
  it('flushes the latest value once for the active generation', () => {
    const publication = new PendingPublication<string>()
    publication.queue(3, 'first')
    publication.queue(3, 'latest')
    expect(publication.take(3)).toBe('latest')
    expect(publication.take(3)).toBeNull()
  })

  it('discards stale generations and explicit resets', () => {
    const publication = new PendingPublication<string>()
    publication.queue(2, 'stale')
    expect(publication.take(3)).toBeNull()
    publication.queue(3, 'reset')
    publication.discard()
    expect(publication.hasPending).toBe(false)
  })
})
