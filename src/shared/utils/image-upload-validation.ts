const MAX_IMAGE_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024

const SUPPORTED_IMAGE_UPLOAD_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])

export const IMAGE_UPLOAD_ACCEPT = 'image/png,image/jpeg,image/webp'

export function validateImageUploadFile(file: File): string | null {
  if (!SUPPORTED_IMAGE_UPLOAD_MIME_TYPES.has(file.type)) {
    return 'Solo puedes subir imagenes PNG, JPG o WEBP.'
  }

  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    return 'La imagen debe pesar maximo 2 MB.'
  }

  return null
}
