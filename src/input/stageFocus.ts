export type FocusRestoreStatus = 'ready' | 'active' | 'paused' | 'completed' | 'asleep' | 'loading' | 'waking' | 'error'

export function shouldRestoreStageFocus(status: FocusRestoreStatus, focusAllowsRestore: boolean) {
  return focusAllowsRestore && (status === 'ready' || status === 'active')
}
