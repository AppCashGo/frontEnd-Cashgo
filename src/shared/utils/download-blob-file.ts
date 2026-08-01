export function downloadBlobFile(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const linkElement = document.createElement('a')

  linkElement.href = objectUrl
  linkElement.download = filename
  linkElement.rel = 'noopener'
  document.body.appendChild(linkElement)
  linkElement.click()
  linkElement.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
