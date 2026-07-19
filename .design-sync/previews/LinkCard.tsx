import { LinkCard } from 'daemon-production-hq'
import type { ReactNode } from 'react'

function Canvas({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--void)',
        color: 'var(--bone)',
        fontFamily: 'var(--font-b)',
        fontSize: 15,
        lineHeight: 1.5,
        padding: 20,
        borderRadius: 14,
        display: 'grid',
        gap: 8,
      }}
    >
      {children}
    </div>
  )
}

export function ListaLink() {
  return (
    <Canvas>
      <LinkCard label="Shopify — admin" url="https://admin.shopify.com/store/daemon" onEdit={() => {}} onDelete={() => {}} />
      <LinkCard label="Cartella Drive — Tech pack" url="https://drive.google.com/drive/folders/abc123" onEdit={() => {}} onDelete={() => {}} />
    </Canvas>
  )
}

export function SenzaUrl() {
  return (
    <Canvas>
      <LinkCard label="Google Calendar — Embed" url={null} onEdit={() => {}} />
    </Canvas>
  )
}
