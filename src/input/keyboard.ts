const ACCEPTED_CODES = new Set([
  'Space', 'Enter', 'Backspace', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown',
  'Backquote', 'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash',
  'Semicolon', 'Quote', 'Comma', 'Period', 'Slash',
])

export interface AcceptedKey {
  code: string
  key: string
  label: string
  timeStamp: number
}

export type GuidedKeyAction = 'attempt' | 'backspace' | 'ignore'

const ignoredTarget = (target: EventTarget | null): boolean => {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"], [role="slider"]'))
}

export function isEligibleKeydown(event: KeyboardEvent): boolean {
  if (event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return false
  if (ignoredTarget(event.target)) return false
  return /^(Key[A-Z]|Digit[0-9])$/.test(event.code) || ACCEPTED_CODES.has(event.code)
}

export function keyLabel(event: KeyboardEvent): string {
  const special: Record<string, string> = {
    Space: 'SPACE', Enter: '↵', Backspace: '⌫', ArrowLeft: '←', ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓',
  }
  return special[event.code] ?? (event.key.length === 1 ? event.key : event.code)
}

export function guidedKeyAction(key: AcceptedKey): GuidedKeyAction {
  if (key.code === 'Backspace') return 'backspace'
  return key.key.length === 1 ? 'attempt' : 'ignore'
}

export class StageKeyboardController {
  private pressedCodes = new Set<string>()

  constructor(private readonly accept: (key: AcceptedKey) => void) {}

  keydown(event: KeyboardEvent): boolean {
    if (!isEligibleKeydown(event) || this.pressedCodes.has(event.code)) return false
    this.pressedCodes.add(event.code)
    event.preventDefault()
    this.accept({ code: event.code, key: event.key, label: keyLabel(event), timeStamp: event.timeStamp })
    return true
  }

  keyup(event: KeyboardEvent): void {
    this.pressedCodes.delete(event.code)
  }

  clear(): void {
    this.pressedCodes.clear()
  }
}
