import { supabase } from './supabase'

export const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB — riflette il limite impostato sul bucket "media"
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'video/mp4',
  'video/quicktime',
] as const

const IMAGE_MAX_DIM = 1600

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1)
}

function isImage(file: File | Blob) {
  return file.type.startsWith('image/')
}

/** Ridimensiona/comprime un'immagine lato client prima dell'upload, per restare
 * comodamente sotto il limite del bucket anche con foto dirette da fotocamera. */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.width, img.height))
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(img.src)
        reject(new Error('Canvas non disponibile per la compressione.'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      const finish = (quality: number, onDone: (blob: Blob) => void) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compressione immagine non riuscita.'))
              return
            }
            onDone(blob)
          },
          'image/jpeg',
          quality,
        )
      }

      finish(0.82, (blob) => {
        if (blob.size <= MAX_FILE_BYTES) {
          URL.revokeObjectURL(img.src)
          resolve(blob)
          return
        }
        // Foto ancora pesante: ritenta con qualità più bassa prima di arrendersi.
        finish(0.5, (smaller) => {
          URL.revokeObjectURL(img.src)
          resolve(smaller)
        })
      })
    }
    img.onerror = () => reject(new Error('Immagine non leggibile.'))
    img.src = URL.createObjectURL(file)
  })
}

/** Controlla formato e dimensione; torna il messaggio d'errore (il chiamante
 * decide come mostrarlo, es. toast) o null se il file va bene. */
export function validateMediaFile(file: File): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `Formato non supportato (${file.type || 'sconosciuto'}). Usa JPEG, PNG, WEBP, MP3, MP4 o MOV.`
  }
  if (!isImage(file) && file.size > MAX_FILE_BYTES) {
    return `File troppo grande (${formatMb(file.size)} MB, massimo 5 MB). Per i video preferisci un link (Drive/Dropbox) invece di caricarli qui.`
  }
  return null
}

/** Comprime (se immagine), valida e carica un file nel bucket "media" sotto
 * `{entityType}/{uuid}.ext`. Torna il path da salvare in colonna img_path. */
export async function uploadMediaFile(
  file: File,
  entityType: string,
): Promise<{ path: string | null; error: string | null }> {
  const formatError = validateMediaFile(file)
  if (formatError) return { path: null, error: formatError }

  let body: Blob = file
  let ext = file.name.split('.').pop()?.toLowerCase() || 'bin'

  if (isImage(file)) {
    try {
      body = await compressImage(file)
      ext = 'jpg'
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Compressione immagine non riuscita.'
      return { path: null, error: msg }
    }
    if (body.size > MAX_FILE_BYTES) {
      return {
        path: null,
        error: `Immagine troppo pesante anche dopo la compressione (${formatMb(body.size)} MB). Prova un file più leggero.`,
      }
    }
  }

  const path = `${entityType}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, body, {
    contentType: isImage(file) ? 'image/jpeg' : file.type,
    upsert: false,
  })
  if (error) {
    return { path: null, error: `Upload non riuscito: ${error.message}` }
  }
  return { path, error: null }
}

export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export async function deleteMediaFile(path: string | null | undefined): Promise<void> {
  if (!path) return
  await supabase.storage.from('media').remove([path])
}
