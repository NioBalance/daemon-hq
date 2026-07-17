import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../public/icons')
const sourceLogo = path.resolve(__dirname, '../spolli-merch-logo-removebg.png')
mkdirSync(outDir, { recursive: true })

const VOID = { r: 0x0b, g: 0x0b, b: 0x0d, alpha: 1 }

// logoScale = quanto spazio occupa il logo rispetto al canvas. Le icone
// "maskable" vengono ritagliate dall'OS (cerchio/squircle): il contenuto deve
// stare dentro la safe zone centrale, quindi scala più piccola.
const targets = [
  { file: 'icon-192.png', size: 192, logoScale: 0.7 },
  { file: 'icon-512.png', size: 512, logoScale: 0.7 },
  { file: 'icon-maskable-512.png', size: 512, logoScale: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, logoScale: 0.72 },
  { file: 'favicon-48.png', size: 48, logoScale: 0.78 },
]

for (const t of targets) {
  const logoSize = Math.round(t.size * t.logoScale)
  const logo = await sharp(sourceLogo).resize(logoSize, logoSize, { fit: 'contain' }).toBuffer()

  await sharp({
    create: { width: t.size, height: t.size, channels: 4, background: VOID },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, t.file))

  console.log('wrote', t.file)
}
