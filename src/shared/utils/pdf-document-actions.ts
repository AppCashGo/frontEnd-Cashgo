import { downloadBlobFile } from '@/shared/utils/download-blob-file'

export function printPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer')

  if (!printWindow) {
    URL.revokeObjectURL(url)
    throw new Error('El navegador bloqueó la ventana de impresión.')
  }

  printWindow.addEventListener('load', () => {
    printWindow.focus()
    printWindow.print()
  })
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  downloadBlobFile(blob, filename)
}

export async function sharePdfFile(input: {
  blob: Blob
  filename: string
  title: string
  text: string
}) {
  const file = new File([input.blob], input.filename, {
    type: 'application/pdf',
  })

  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: input.title,
      text: input.text,
    })
    return 'shared' as const
  }

  downloadPdfBlob(input.blob, input.filename)
  return 'downloaded' as const
}

export function openWhatsApp(phone: string, message: string) {
  const target = window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer',
  )

  if (!target) {
    throw new Error('El navegador bloqueó la apertura de WhatsApp.')
  }
}
