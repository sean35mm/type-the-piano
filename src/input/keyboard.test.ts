import { describe, expect, it, vi } from 'vitest'
import { guidedKeyAction, isEligibleKeydown, StageKeyboardController } from './keyboard'

const event = (overrides: Partial<KeyboardEvent> = {}) => ({
  code: 'KeyA', key: 'a', repeat: false, isComposing: false, metaKey: false, ctrlKey: false, altKey: false,
  target: null, preventDefault: vi.fn(), ...overrides,
}) as unknown as KeyboardEvent

describe('keyboard input', () => {
  it('rejects repeats and command modifiers', () => {
    expect(isEligibleKeydown(event({ repeat: true }))).toBe(false)
    expect(isEligibleKeydown(event({ ctrlKey: true }))).toBe(false)
    expect(isEligibleKeydown(event({ altKey: true }))).toBe(false)
  })

  it('rejects events originating in editable controls', () => {
    class FakeElement { closest() { return this } }
    vi.stubGlobal('Element', FakeElement)
    expect(isEligibleKeydown(event({ target: new FakeElement() as unknown as EventTarget }))).toBe(false)
    vi.unstubAllGlobals()
  })

  it('accepts a held physical key only once until keyup', () => {
    const accept = vi.fn()
    const controller = new StageKeyboardController(accept)
    controller.keydown(event())
    controller.keydown(event())
    expect(accept).toHaveBeenCalledTimes(1)
    controller.keyup(event())
    controller.keydown(event())
    expect(accept).toHaveBeenCalledTimes(2)
  })

  it('emits the physical code, exact key, label, and timestamp', () => {
    const accept = vi.fn()
    const controller = new StageKeyboardController(accept)
    controller.keydown(event({ code: 'Space', key: ' ', timeStamp: 42 }))
    expect(accept).toHaveBeenCalledWith({ code: 'Space', key: ' ', label: 'SPACE', timeStamp: 42 })
  })

  it('classifies only printable guided attempts while preserving commands', () => {
    const payload = (code: string, key: string) => ({ code, key, label: key, timeStamp: 0 })
    expect(guidedKeyAction(payload('KeyA', 'a'))).toBe('attempt')
    expect(guidedKeyAction(payload('Space', ' '))).toBe('attempt')
    expect(guidedKeyAction(payload('Backspace', 'Backspace'))).toBe('backspace')
    expect(guidedKeyAction(payload('Enter', 'Enter'))).toBe('ignore')
    expect(guidedKeyAction(payload('ArrowLeft', 'ArrowLeft'))).toBe('ignore')
  })
})
