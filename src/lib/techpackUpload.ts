import { supabase } from './supabase'
import type { TechpackFileTipo } from './database.types'

/** Upload dei file tech pack: a differenza dei media (compressi, 5MB) qui i
 *  file restano ORIGINALI — un bozzetto .ai o una scheda misure ricompressi
 *  non servono a niente. Limite 50MB (= bucket), formati estesi ammessi solo
 *  sotto techpacks/ (regola replicata server-side dalla policy 0008). */

export const TP_MAX_BYTES = 50 * 1024 * 1024

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  ai: 'application/postscript',
  eps: 'application/postscript',
  psd: 'image/vnd.adobe.photoshop',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  txt: 'text/plain',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

const IMG_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export function tpExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function isTpAllowed(name: string): boolean {
  return tpExtension(name) in EXT_MIME
}

/** Tipo DB dal nome file: img/pdf anteprimabili inline, il resto 'file'. */
export function tpTipo(name: string): TechpackFileTipo {
  const ext = tpExtension(name)
  if (IMG_EXT.has(ext)) return 'img'
  if (ext === 'pdf') return 'pdf'
  return 'file'
}

/** Normalizza un percorso relativo: separatori /, niente segmenti vuoti o
 *  "..", spazi ridotti. Torna null se il percorso non è utilizzabile. */
export function sanitizeRelPath(raw: string): string | null {
  const parts = raw
    .replaceAll('\\', '/')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && p !== '.' && p !== '..')
  if (!parts.length) return null
  // File di sistema che inquinano zip e cartelle (macOS/Windows).
  const file = parts[parts.length - 1]
  if (parts.some((p) => p === '__MACOSX') || file === '.DS_Store' || file === 'Thumbs.db' || file.startsWith('._')) {
    return null
  }
  return parts.join('/')
}

export interface TpUploadResult {
  path: string | null
  error: string | null
}

/** Carica un file sotto techpacks/{id}/{percorso relativo}. Stesso percorso =
 *  stesso oggetto (upsert): ricaricare una cartella aggiorna i file omonimi
 *  invece di duplicarli. */
export async function uploadTechpackFile(
  techpackId: string,
  relPath: string,
  file: Blob,
): Promise<TpUploadResult> {
  const clean = sanitizeRelPath(relPath)
  if (!clean) return { path: null, error: `Percorso non valido: ${relPath}` }
  if (!isTpAllowed(clean)) {
    return { path: null, error: `«${clean}»: formato .${tpExtension(clean) || '?'} non supportato.` }
  }
  if (file.size > TP_MAX_BYTES) {
    return { path: null, error: `«${clean}» supera i 50 MB (${(file.size / 1048576).toFixed(1)} MB).` }
  }
  // Estensione minuscola nel path: la policy server-side ragiona così.
  const ext = tpExtension(clean)
  const storagePath = `techpacks/${techpackId}/${clean.replace(/\.[^.]+$/, `.${ext}`)}`
  const { error } = await supabase.storage.from('media').upload(storagePath, file, {
    contentType: EXT_MIME[ext],
    upsert: true,
  })
  if (error) return { path: null, error: `Upload di «${clean}» non riuscito: ${error.message}` }
  return { path: storagePath, error: null }
}

/** Signed URL breve con content-disposition: attachment — il browser scarica
 *  col nome originale invece di aprire il file. */
export async function getTpDownloadUrl(
  path: string | null,
  filename: string,
): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUrl(path, 60, { download: filename })
  if (error || !data) return null
  return data.signedUrl
}

export interface TpEntry {
  relPath: string
  blob: Blob
}

/** Estrae uno .zip lato client in singoli file (struttura preservata),
 *  scartando directory e file di sistema. */
export async function extractZip(file: File): Promise<TpEntry[]> {
  // Import dinamico: jszip (~30KB gz) si scarica solo alla prima estrazione.
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  const out: TpEntry[] = []
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue
    const clean = sanitizeRelPath(entry.name)
    if (!clean) continue
    out.push({ relPath: clean, blob: await entry.async('blob') })
  }
  return out
}
