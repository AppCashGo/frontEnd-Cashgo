import { useState } from 'react'

const preferenceKey = 'cashgo-workspace-sound'
let audioContext: AudioContext | undefined

function readSoundEnabled() {
  try {
    return window.localStorage.getItem(preferenceKey) !== 'off'
  } catch {
    return true
  }
}

function getAudioContext() {
  try {
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
    const Audio = window.AudioContext ?? audioWindow.webkitAudioContext
    if (!Audio) return undefined

    if (!audioContext || audioContext.state === 'closed') audioContext = new Audio()
    return audioContext
  } catch {
    return undefined
  }
}

export function prepareWorkspaceSound() {
  if (!readSoundEnabled()) return
  const context = getAudioContext()
  if (context?.state === 'suspended') void context.resume().catch(() => undefined)
}

function playChime(frequencies = [660, 880], interval = 0.075) {
  const context = getAudioContext()
  if (!context) return

  try {
    const play = () => {
      const startTime = context.currentTime + 0.015
      for (const [index, frequency] of frequencies.entries()) {
        const start = startTime + index * interval
        const tone = context.createOscillator()
        const gain = context.createGain()
        tone.type = 'sine'
        tone.frequency.setValueAtTime(frequency, start)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.045, start + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17)
        tone.connect(gain).connect(context.destination)
        tone.start(start)
        tone.stop(start + 0.18)
      }
    }

    if (context.state === 'running') play()
    else void context.resume().then(play).catch(() => undefined)
  } catch {
    // Sound is optional when audio is unavailable.
  }
}

export function playSignInSound() {
  if (readSoundEnabled()) playChime([523.25, 659.25, 783.99, 1046.5], 0.085)
}

export function useWorkspaceSound() {
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled)

  function toggleSound() {
    const next = !soundEnabled
    setSoundEnabled(next)
    try {
      window.localStorage.setItem(preferenceKey, next ? 'on' : 'off')
    } catch {
      // The control still works for the current page.
    }
    if (next) playChime()
  }

  function playSound() {
    if (soundEnabled) playChime()
  }

  return { soundEnabled, toggleSound, playSound }
}
