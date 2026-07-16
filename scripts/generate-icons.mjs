import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const VOID = '#0B0B0D'
const EMBER = '#E2382A'

const iconSvg = (size, glyphScale = 0.62) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${VOID}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial, sans-serif" font-weight="900" font-size="${Math.round(size * glyphScale)}"
    fill="${EMBER}">Æ</text>
</svg>`

const targets = [
  { file: 'icon-192.png', size: 192, glyphScale: 0.6 },
  { file: 'icon-512.png', size: 512, glyphScale: 0.6 },
  { file: 'icon-maskable-512.png', size: 512, glyphScale: 0.42 },
  { file: 'apple-touch-icon.png', size: 180, glyphScale: 0.6 },
]

for (const t of targets) {
  const svg = Buffer.from(iconSvg(t.size, t.glyphScale))
  await sharp(svg).png().toFile(path.join(outDir, t.file))
  console.log('wrote', t.file)
}
