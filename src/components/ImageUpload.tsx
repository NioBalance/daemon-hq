import { useRef, useState, type ReactNode } from 'react'
import { deleteMediaFile, getMediaUrl, uploadMediaFile } from '../lib/upload'

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

  async function handleFile(file: File) {
    setUploading(true)
    const { path: newPath } = await uploadMediaFile(file, entityType)
    setUploading(false)
    if (newPath) {
      onUploaded(newPath)
      if (path && path !== newPath) void deleteMediaFile(path)
    }
  }

  return (
    <div
      className={className}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
      onClick={() => inputRef.current?.click()}
      title={title}
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
