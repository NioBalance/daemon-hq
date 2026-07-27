/** Toni del sistema badge §6.3 — modulo separato dal componente (react-refresh). */
export type BadgeTone = 'steel' | 'info' | 'primary' | 'warning' | 'success' | 'destructive'

/** Mappa DÆMON §6.3: stato pipeline → tono. Fallback: steel. */
export function statusTone(stato: string | null | undefined): BadgeTone {
  switch ((stato ?? '').toLowerCase()) {
    case 'inviato':
    case 'pianificato':
      return 'info'
    case 'in-corso':
    case 'in-produzione':
      return 'primary'
    case 'in-review':
    case 'revisione':
      return 'warning'
    case 'confermato':
    case 'fatto':
    case 'approvato':
    case 'attivo':
      return 'success'
    case 'bloccato':
    case 'urgente':
    case 'scartato':
      return 'destructive'
    default:
      return 'steel'
  }
}
