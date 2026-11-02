import { useEffect, useRef } from 'react'
import { isUsableBarcode, normalizeBarcode } from './normalize-barcode'

type HardwareBarcodeScannerOptions = {
  enabled?: boolean
  onScan: (barcode: string) => void
}

const SCANNER_KEY_INTERVAL_MS = 80
const SCANNER_SEQUENCE_TIMEOUT_MS = 180

export function useHardwareBarcodeScanner({
  enabled = true,
  onScan,
}: HardwareBarcodeScannerOptions) {
  const onScanRef = useRef(onScan)
  const bufferRef = useRef('')
  const lastKeyAtRef = useRef(0)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) return undefined

    function resetBuffer() {
      bufferRef.current = ''
      lastKeyAtRef.current = 0
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return

      const target = event.target as HTMLElement | null
      const isEditableTarget =
        target?.isContentEditable ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        (target?.tagName === 'INPUT' && target.dataset.barcodeScanner !== 'true')

      if (isEditableTarget) {
        resetBuffer()
        return
      }

      const now = performance.now()
      if (
        lastKeyAtRef.current > 0 &&
        now - lastKeyAtRef.current > SCANNER_SEQUENCE_TIMEOUT_MS
      ) {
        bufferRef.current = ''
      }

      if (event.key === 'Enter') {
        const barcode = normalizeBarcode(bufferRef.current)
        const sequenceWasFast =
          lastKeyAtRef.current > 0 &&
          now - lastKeyAtRef.current <= SCANNER_SEQUENCE_TIMEOUT_MS

        resetBuffer()
        if (sequenceWasFast && isUsableBarcode(barcode)) {
          event.preventDefault()
          onScanRef.current(barcode)
        }
        return
      }

      if (event.key.length !== 1) return

      if (
        lastKeyAtRef.current > 0 &&
        now - lastKeyAtRef.current > SCANNER_KEY_INTERVAL_MS
      ) {
        bufferRef.current = ''
      }

      bufferRef.current += event.key
      lastKeyAtRef.current = now
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [enabled])
}
