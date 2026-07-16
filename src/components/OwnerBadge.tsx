import type { Owner } from '../lib/tabs'

const LABELS: Record<Owner, string> = { design: 'Design', logistica: 'Logistica', fornitori: 'Fornitori' }

export default function OwnerBadge({ owner }: { owner: Owner | null }) {
  if (!owner) return null
  return <span className={`owner ${owner}`}>{LABELS[owner]}</span>
}
