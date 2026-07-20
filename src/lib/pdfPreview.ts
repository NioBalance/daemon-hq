/** Rendering PDF client-side con pdfjs-dist, caricato SOLO on-demand:
 *  la libreria (~330KB gz) vive in un chunk async che si scarica alla prima
 *  anteprima richiesta — il bundle iniziale non la contiene. */

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function loadPdfjs() {
  pdfjsPromise ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })()
  return pdfjsPromise
}

// Cache dei thumbnail per path: un PDF renderizzato una volta per sessione.
const thumbCache = new Map<string, string>()

/** Prima pagina del PDF come dataURL jpeg, lato lungo = maxDim. */
export async function renderPdfThumb(cacheKey: string, url: string, maxDim = 96): Promise<string> {
  const hit = thumbCache.get(cacheKey)
  if (hit) return hit
  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({ url })
  const doc = await task.promise
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const scale = (maxDim * (window.devicePixelRatio || 1)) / Math.max(base.width, base.height)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await page.render({ canvas, viewport }).promise
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
    thumbCache.set(cacheKey, dataUrl)
    return dataUrl
  } finally {
    void task.destroy()
  }
}

/** Una pagina del PDF a risoluzione da viewer. Torna anche il totale pagine. */
export async function renderPdfPage(
  url: string,
  pageNum: number,
  maxDim = 1600,
): Promise<{ dataUrl: string; numPages: number }> {
  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({ url })
  const doc = await task.promise
  try {
    const numPages = doc.numPages
    const page = await doc.getPage(Math.min(Math.max(1, pageNum), numPages))
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(2.5, maxDim / Math.max(base.width, base.height))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await page.render({ canvas, viewport }).promise
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), numPages }
  } finally {
    void task.destroy()
  }
}
