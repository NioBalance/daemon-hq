// Tutte le date "di calendario" ragionano in ORA LOCALE (audit A2): con le
// vecchie versioni basate su toISOString (UTC), in Italia tra mezzanotte e
// l'1/2 di notte "oggi" risultava ieri — countdown, marker del calendario e
// alert scadenze sbagliavano di un giorno.

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' di oggi, in ora locale. */
export function todayIso(): string {
  return toIsoDate(new Date())
}

/** Converte un timestamp ISO (UTC) nella data locale 'YYYY-MM-DD'. */
export function localDateIso(iso: string): string {
  return toIsoDate(new Date(iso))
}

/** Formatta date-only ('YYYY-MM-DD') così come sono; i timestamp completi
 *  vengono prima convertiti alla data locale. */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  if (d.includes('T')) {
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
  }
  const [y, m, day] = d.slice(0, 10).split('-')
  return y && m && day ? `${day}/${m}/${y}` : d
}

/** Aritmetica sui giorni via componenti locali (niente round-trip UTC). */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toIsoDate(new Date(y, m - 1, d + days))
}

/** Giorni interi da oggi (mezzanotte locale) alla data data; Math.round
 *  assorbe l'ora di cambio DST. */
export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
