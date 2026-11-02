let barcodeAudioContext: AudioContext | null = null

function getBarcodeAudioContext() {
  if (typeof window === 'undefined') return null

  const audioWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext
  }
  const AudioContextConstructor =
    (typeof AudioContext !== 'undefined' ? AudioContext : undefined) ??
    audioWindow.webkitAudioContext

  if (!AudioContextConstructor) return null

  if (!barcodeAudioContext || barcodeAudioContext.state === 'closed') {
    barcodeAudioContext = new AudioContextConstructor()
  }

  return barcodeAudioContext
}

export function prepareBarcodeScanSound() {
  const audioContext = getBarcodeAudioContext()
  if (audioContext?.state === 'suspended') {
    void audioContext.resume().catch(() => undefined)
  }
}

export function playBarcodeScanSound() {
  const audioContext = getBarcodeAudioContext()
  if (!audioContext) return

  const playTone = () => {
    const startTime = audioContext.currentTime + 0.01
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(1850, startTime)
    oscillator.frequency.exponentialRampToValueAtTime(2250, startTime + 0.075)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(0.075, startTime + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + 0.1)
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume().then(playTone).catch(() => undefined)
    return
  }

  playTone()
}
