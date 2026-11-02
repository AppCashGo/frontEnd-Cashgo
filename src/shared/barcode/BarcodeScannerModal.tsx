import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat } from '@zxing/library'
import { Camera, CameraOff, RefreshCw, ScanBarcode } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppModal } from '@/shared/components/ui/AppModal'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import { playBarcodeScanSound, prepareBarcodeScanSound } from './barcode-scan-sound'
import { isUsableBarcode, normalizeBarcode } from './normalize-barcode'
import styles from './BarcodeScannerModal.module.css'

type BarcodeScannerModalProps = {
  isOpen: boolean
  onClose: () => void
  onDetected: (barcode: string) => void
  title?: string
}

type ScannerStatus = 'IDLE' | 'STARTING' | 'SCANNING' | 'ERROR'

const RETAIL_BARCODE_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
]

const SCAN_ATTEMPT_DELAY_MS = 40

async function enableContinuousFocus(video: HTMLVideoElement | null) {
  const track = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0]
  if (!track?.getCapabilities) return

  const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
    focusMode?: string[]
  }
  if (!capabilities.focusMode?.includes('continuous')) return

  try {
    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
    })
  } catch {
    // Some browsers advertise focus controls but reject them at runtime.
  }
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'No se concedió permiso para usar la cámara. Habilítalo en la configuración del navegador.'
    }
    if (error.name === 'NotFoundError') {
      return 'No encontramos una cámara disponible en este dispositivo.'
    }
    if (error.name === 'NotReadableError') {
      return 'La cámara está siendo utilizada por otra aplicación o no pudo iniciarse.'
    }
  }

  return getErrorMessage(error, 'No pudimos iniciar la cámara. Puedes escribir el código manualmente.')
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
  title = 'Escanear código de barras',
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const detectedRef = useRef(false)
  const onDetectedRef = useRef(onDetected)
  const [status, setStatus] = useState<ScannerStatus>('IDLE')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [restartToken, setRestartToken] = useState(0)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    function prepareSound() {
      prepareBarcodeScanSound()
    }

    window.addEventListener('pointerdown', prepareSound, { capture: true, once: true })
    return () => window.removeEventListener('pointerdown', prepareSound, true)
  }, [])

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    const stream = videoRef.current?.srcObject
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      setStatus('IDLE')
      return undefined
    }

    let cancelled = false
    const reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: SCAN_ATTEMPT_DELAY_MS,
      delayBetweenScanSuccess: SCAN_ATTEMPT_DELAY_MS,
    })
    reader.possibleFormats = RETAIL_BARCODE_FORMATS
    detectedRef.current = false
    setStatus('STARTING')
    setErrorMessage(null)

    async function startScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Este navegador no permite acceder a la cámara.')
        }

        const controls = deviceId
          ? await reader.decodeFromVideoDevice(deviceId, videoRef.current ?? undefined, handleResult)
          : await reader.decodeFromConstraints(
              {
                audio: false,
                video: {
                  facingMode: { ideal: 'environment' },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30 },
                },
              },
              videoRef.current ?? undefined,
              handleResult,
            )

        if (cancelled) {
          controls.stop()
          return
        }

        controlsRef.current = controls
        await enableContinuousFocus(videoRef.current)
        if (cancelled || detectedRef.current) {
          controls.stop()
          return
        }
        setStatus('SCANNING')
        const availableDevices = await BrowserCodeReader.listVideoInputDevices()
        if (!cancelled) {
          setDevices(availableDevices)
          const activeTrack = (videoRef.current?.srcObject as MediaStream | null)
            ?.getVideoTracks()[0]
          const activeDeviceId = activeTrack?.getSettings().deviceId
          if (!deviceId && activeDeviceId) setDeviceId(activeDeviceId)
        }
      } catch (error) {
        if (cancelled) return
        setStatus('ERROR')
        setErrorMessage(getCameraErrorMessage(error))
      }
    }

    function handleResult(result: { getText(): string } | undefined) {
      if (!result || detectedRef.current) return
      const barcode = normalizeBarcode(result.getText())
      if (!isUsableBarcode(barcode)) return

      detectedRef.current = true
      stopScanner()
      playBarcodeScanSound()
      onDetectedRef.current(barcode)
    }

    void startScanner()
    return () => {
      cancelled = true
      stopScanner()
    }
  }, [deviceId, isOpen, restartToken, stopScanner])

  function handleClose() {
    stopScanner()
    onClose()
  }

  return (
    <AppModal
      bodyClassName={styles.body}
      description="Centra el código dentro del marco. La lectura se realizará automáticamente."
      isOpen={isOpen}
      panelClassName={styles.panel}
      size="lg"
      title={title}
      onClose={handleClose}
    >
      <div className={styles.cameraStage}>
        <video ref={videoRef} autoPlay muted playsInline className={styles.video} />
        <div className={styles.scanFrame} aria-hidden="true">
          <span />
        </div>
        {status === 'STARTING' ? (
          <div className={styles.cameraState}>
            <RefreshCw aria-hidden="true" className={styles.spinner} />
            <strong>Iniciando cámara…</strong>
          </div>
        ) : null}
        {status === 'ERROR' ? (
          <div className={styles.cameraState}>
            <CameraOff aria-hidden="true" />
            <strong>No pudimos abrir la cámara</strong>
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setRestartToken((value) => value + 1)}>
              Intentar nuevamente
            </button>
          </div>
        ) : null}
        {status === 'SCANNING' ? (
          <div className={styles.liveBadge}>
            <ScanBarcode aria-hidden="true" /> Buscando código
          </div>
        ) : null}
      </div>

      <div className={styles.controls}>
        <div className={styles.tip}>
          <Camera aria-hidden="true" />
          <span>Usa buena iluminación y mantén el código completo dentro del marco.</span>
        </div>
        {devices.length > 1 ? (
          <label className={styles.cameraSelector}>
            <span>Cámara</span>
            <SearchableSelect value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
              {devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Cámara ${index + 1}`}
                </option>
              ))}
            </SearchableSelect>
          </label>
        ) : null}
      </div>
    </AppModal>
  )
}
