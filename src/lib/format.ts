// Colonne `date` arrivano come 'YYYY-MM-DD', le `timestamptz` come ISO
// completo: bastano i primi 10 caratteri in entrambi i casi.
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return y && m && day ? `${day}/${m}/${y}` : d
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Differenza in giorni interi tra oggi (mezzanotte locale) e la data data,
// arrotondata per eccesso come nel prototipo (T-3, T-0, lanciato da 2gg...).
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date(todayIso()).getTime()) / 86400000)
}
