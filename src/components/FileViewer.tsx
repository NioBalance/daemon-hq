import { useEffect, useRef, useState } from 'react'
import type { TechpackFile } from '../features/techpackFiles/queries'
import { useSignedUrl } from '../lib/useSignedUrl'
import { renderPdfPage } from '../lib/pdfPreview'
import { getTpDownloadUrl } from '../lib/techpackUpload'
import { useToast } from '../lib/useToast'

/** Viewer inline glass v4 per i file tech pack: PDF renderizzati con pdfjs
 *  (pagine navigabili) e immagini fullscreen, frecce per scorrere i file
 *  della cartella, download col nome originale, chiudi. Tutto dentro l'app
 *  sui signed URL esistenti — mai una nuova scheda del browser. */
export default function FileViewer({
  files,
  startIndex,
  onClose,
}: {
  files: TechpackFile[]
  startIndex: number
  onClose: () => void
}) {
  const showToast = useToast()
  const [i, setI] = useState(() => Math.min(Math.max(0, startIndex), files.length - 1))
  const [page, setPage] = useState(1)
  const [pdf, setPdf] = useState<{ dataUrl: string; numPages: number } | null>(null)
  const [pdfError, setPdfError] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  const current = files[i]
  const url = useSignedUrl(current?.path)
  const isImg = current?.tipo === 'img'
  const isPdf = current?.tipo === 'pdf'

  function go(dir: 1 | -1) {
    setI((x) => Math.min(files.length - 1, Math.max(0, x + dir)))
    setPage(1)
    setPdf(null)
    setPdfError(false)
  }

  function goPage(dir: 1 | -1) {
    if (!pdf) return
    setPage((p) => Math.min(pdf.numPages, Math.max(1, p + dir)))
  }

  useEffect(() => {
    if (!isPdf || !url) return
    let alive = true
    renderPdfPage(url, page)
      .then((r) => {
        if (alive) setPdf(r)
      })
      .catch(() => {
        if (alive) setPdfError(true)
      })
    return () => {
      alive = false
    }
  }, [isPdf, url, page])

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    boxRef.current?.focus()
    return () => prev?.focus()
  }, [])

  async function handleDownload() {
    if (!current) return
    const dl = await getTpDownloadUrl(current.path, current.nome)
    if (!dl) {
      showToast('error', 'Download non disponibile, riprova.')
      return
    }
    const a = document.createElement('a')
    a.href = dl
    a.download = current.nome
    a.click()
  }

  if (!current) return null

  return (
    <div
      className="fv-bg"
      ref={boxRef}
      role="dialog"
      aria-modal="true"
      aria-label={current.nome}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        } else if (e.key === 'ArrowLeft') go(-1)
        else if (e.key === 'ArrowRight') go(1)
        else if (e.key === 'ArrowUp') goPage(-1)
        else if (e.key === 'ArrowDown') goPage(1)
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="fv-top">
        <span className="fv-name">
          {current.nome} <span className="fv-idx">· {i + 1}/{files.length}</span>
        </span>
        <div className="fv-actions">
          {isPdf && pdf && pdf.numPages > 1 && (
            <span className="fv-pages">
              <button className="fv-btn" onClick={() => goPage(-1)} disabled={page <= 1} aria-label="Pagina precedente">
                ‹
              </button>
              pag {page}/{pdf.numPages}
              <button className="fv-btn" onClick={() => goPage(1)} disabled={page >= pdf.numPages} aria-label="Pagina successiva">
                ›
              </button>
            </span>
          )}
          <button className="fv-btn" onClick={() => void handleDownload()} title="Scarica">
            ↓ Scarica
          </button>
          <button className="fv-btn" onClick={onClose} aria-label="Chiudi" title="Chiudi (Esc)">
            ✕
          </button>
        </div>
      </div>

      <div className="fv-body">
        {isImg && url && <img className="fv-img" src={url} alt={current.nome} />}
        {isPdf &&
          (pdfError ? (
            <div className="fv-none">Anteprima non riuscita — usa Scarica.</div>
          ) : pdf ? (
            <img className="fv-img" src={pdf.dataUrl} alt={`${current.nome} — pagina ${page}`} />
          ) : (
            <div className="fv-none">Carico il PDF…</div>
          ))}
        {!isImg && !isPdf && (
          <div className="fv-none">
            Nessuna anteprima per .{(current.nome.split('.').pop() ?? '?').toLowerCase()} — usa Scarica.
          </div>
        )}
      </div>

      {i > 0 && (
        <button className="fv-arrow left" onClick={() => go(-1)} aria-label="File precedente">
          ‹
        </button>
      )}
      {i < files.length - 1 && (
        <button className="fv-arrow right" onClick={() => go(1)} aria-label="File successivo">
          ›
        </button>
      )}
    </div>
  )
}
