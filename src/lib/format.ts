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
