export function triggerHaptic(duration: number = 30): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(duration)
    } catch {
      // Gracefully ignore on unsupported devices
    }
  }
}
