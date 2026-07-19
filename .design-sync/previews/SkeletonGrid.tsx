import { SkeletonGrid } from 'daemon-production-hq'
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
      }}
    >
      {children}
    </div>
  )
}

export function GrigliaMedia() {
  return (
    <Canvas>
      <SkeletonGrid count={8} height={190} minWidth={180} />
    </Canvas>
  )
}

export function RigheCompatte() {
  return (
    <Canvas>
      <SkeletonGrid count={4} height={64} minWidth={320} />
    </Canvas>
  )
}
