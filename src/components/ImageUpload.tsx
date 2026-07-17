import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { deleteMediaFile, getMediaUrl, uploadMediaFile } from '../lib/upload'
import { useToast } from '../lib/useToast'

export default function ImageUpload({
  path,
  entityType,
  onUploaded,
  className,
  fallback = 'Æ',
  title = 'Tocca per caricare/cambiare foto',
  children,
}: {
  path: string | null | undefined
  entityType: string
  onUploaded: (path: string) => void
  className: string
  fallback?: string
  title?: string
  children?: ReactNode
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const url = getMediaUrl(path)
  const showToast = useToast()

  async function handleFile(file: File) {
    setUploading(true)
    const { path: newPath, error } = await uploadMediaFile(file, entityType)
    setUploading(false)
    if (newPath) {
      onUploaded(newPath)
      if (path && path !== newPath) void deleteMediaFile(path)
    } else if (error) {
      showToast('error', error)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div
      className={className}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      title={title}
      role="button"
      tabIndex={0}
    >
      {!url && (uploading ? '…' : fallback)}
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
    </div>
  )
}
