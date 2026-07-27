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

/** Giorni interi (locali) da aIso a bIso; negativo se bIso precede aIso. */
export function daysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split('-').map(Number)
  const [by, bm, bd] = bIso.split('-').map(Number)
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000)
}

/** Tempo relativo compatto per log e notifiche: ora, 5m, 3h, 2g. */
export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'ora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}g`
}

/* ============ Formattazione dati v5 (spec §10, normativa) ============
   Util uniche: vietato formattare inline nei componenti. Locale 'it' default;
   'en' predisposto per l'arrivo di i18next (che diventerà la fonte del locale). */

export type FmtLocale = 'it' | 'en'

const dec = (locale: FmtLocale) => (locale === 'it' ? ',' : '.')

function compactNum(value: number, locale: FmtLocale): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    const s = m >= 10 || Number.isInteger(m) ? String(Math.round(m)) : m.toFixed(1).replace('.', dec(locale))
    return `${sign}${s}M`
  }
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1000)}k`
  if (abs >= 1_000) {
    const k = abs / 1000
    const s = Number.isInteger(k) ? String(k) : k.toFixed(1).replace('.', dec(locale))
    return `${sign}${s}k`
  }
  return `${sign}${Math.round(abs)}`
}

/** Valuta compatta per KPI/card/colonne: €4k · €2,7k · €176k · €1,2M · €0 (mai 0,00 €).
 *  `exact: true` per contratti/fatture: 4.500,00 €. */
export function formatCurrency(value: number, opts?: { exact?: boolean; locale?: FmtLocale }): string {
  const locale = opts?.locale ?? 'it'
  if (opts?.exact) {
    return value.toLocaleString(locale === 'it' ? 'it-IT' : 'en-US', { style: 'currency', currency: 'EUR' })
  }
  if (value === 0) return '€0'
  return `€${compactNum(value, locale)}`
}

const MONTHS: Record<FmtLocale, string[]> = {
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

/** Data breve per liste e card: 19 lug — anno solo se diverso dal corrente. */
export function formatDateShort(iso: string | null | undefined, locale: FmtLocale = 'it'): string {
  if (!iso) return '—'
  const { y, m, d } = parts(iso)
  if (!y || !m || !d) return iso
  const mon = MONTHS[locale][m - 1]
  const base = locale === 'it' ? `${d} ${mon}` : `${mon} ${d}`
  return y === new Date().getFullYear() ? base : `${base} ${y}`
}

/** Data + ora per log e attività: 23/07/2026 · 22:14. */
export function formatDateTime(iso: string): string {
  const dt = new Date(iso)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const hh = String(dt.getHours()).padStart(2, '0')
  const mi = String(dt.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${dt.getFullYear()} · ${hh}:${mi}`
}

/** Range per drop e campagne: 20–26 lug stesso mese, altrimenti 20 lug – 3 ago. */
export function formatRange(aIso: string, bIso: string, locale: FmtLocale = 'it'): string {
  const a = parts(aIso)
  const b = parts(bIso)
  const year = b.y === new Date().getFullYear() ? '' : ` ${b.y}`
  if (a.y === b.y && a.m === b.m) {
    const mon = MONTHS[locale][a.m - 1]
    return locale === 'it' ? `${a.d}–${b.d} ${mon}${year}` : `${mon} ${a.d}–${b.d}${year}`
  }
  return `${formatDateShort(aIso, locale)} – ${formatDateShort(bIso, locale)}`
}

/** Percentuale: 1 decimale sotto il 10%, intera sopra; virgola in it. 3,3% · 27%. */
export function formatPct(ratio: number, locale: FmtLocale = 'it'): string {
  const pct = ratio * 100
  const abs = Math.abs(pct)
  const s = abs < 10 && !Number.isInteger(pct) ? pct.toFixed(1).replace('.', dec(locale)) : String(Math.round(pct))
  return `${s}%`
}

/** Delta KPI: freccia + valore — ↘ 22% vs settimana scorsa. Il colore NON è
 *  qui: per §2.4 i delta restano grigi, si colorano solo sotto target. */
export function formatDelta(ratio: number, opts?: { vs?: string; locale?: FmtLocale }): string {
  const arrow = ratio < 0 ? '↘' : '↗'
  const body = `${arrow} ${formatPct(Math.abs(ratio), opts?.locale ?? 'it')}`
  return opts?.vs ? `${body} ${opts.vs}` : body
}

/** Durate: 56s · 3m 20s · lead time in giorni 45gg. */
export function formatDuration(value: number, unit: 's' | 'gg' = 's'): string {
  if (unit === 'gg') return `${Math.round(value)}gg`
  if (value < 60) return `${Math.round(value)}s`
  const m = Math.floor(value / 60)
  const s = Math.round(value % 60)
  return s ? `${m}m ${s}s` : `${m}m`
}

/** Quantità pezzi: separatore migliaia it — 1.000 pz. */
export function formatQty(n: number, locale: FmtLocale = 'it'): string {
  return `${n.toLocaleString(locale === 'it' ? 'it-IT' : 'en-US')} pz`
}
