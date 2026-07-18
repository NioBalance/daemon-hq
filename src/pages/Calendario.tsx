import { useState, type FormEvent } from 'react'
import PanelHead from '../components/PanelHead'
import Modal from '../components/Modal'
import FormFields, { type FieldDef, type FormValues } from '../components/FormFields'
import { Loading, ErrorState } from '../components/QueryState'
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, type EventRow } from '../features/events/queries'
import { useDrops, useDropFasi } from '../features/drops/queries'
import { fmtDate, todayIso } from '../lib/format'
import { useToast } from '../lib/useToast'
import { useFormDraft } from '../lib/useFormDraft'
import { useRegisterNewAction } from '../lib/navigation'
import { onEnterOrSpace } from '../lib/a11y'
import type { EventTipo } from '../lib/database.types'

const EV_TIPI: { value: EventTipo; label: string }[] = [
  { value: 'meeting', label: 'Incontro team' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'lancio', label: 'Lancio' },
]
const tipoLabel = (t: EventTipo) => EV_TIPI.find((x) => x.value === t)?.label ?? t

interface CalEvent {
  id: string
  titolo: string
  data: string
  tipo: EventTipo
  src: 'ev' | 'drop' | 'fase'
  note?: string | null
}

const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function Calendario() {
  const now = new Date()
  const [calY, setCalY] = useState(now.getFullYear())
  const [calM, setCalM] = useState(now.getMonth())

  const { data: events, isLoading, isError, error, refetch } = useEvents()
  const { data: drops } = useDrops()
  const { data: fasi } = useDropFasi()
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()
  const showToast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const [values, setValues] = useState<FormValues>({ titolo: '', data: '', tipo: 'meeting', note: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const draft = useFormDraft(`evento:${editing?.id ?? 'new'}`, modalOpen, values, setValues)

  useRegisterNewAction(openCreate)

  const EVENT_FIELDS: FieldDef[] = [
    { key: 'titolo', label: 'Titolo' },
    { key: 'data', label: 'Data', type: 'date', half: true },
    { key: 'tipo', label: 'Tipo', type: 'select', half: true, options: EV_TIPI.map((o) => ({ value: o.value, label: o.label })) },
    { key: 'note', label: 'Note', type: 'textarea' },
  ]

  function openCreate(defData?: string) {
    setValues({ titolo: '', data: defData ?? '', tipo: 'meeting', note: '' })
    setFormError(null)
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(e: EventRow) {
    setValues({ titolo: e.titolo, data: e.data, tipo: e.tipo, note: e.note ?? '' })
    setFormError(null)
    setEditing(e)
    setModalOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const titolo = String(values.titolo ?? '').trim()
    const data = String(values.data ?? '')
    if (!titolo || !data) {
      setFormError('Inserisci titolo e data.')
      return
    }
    const patch = { titolo, data, tipo: values.tipo as EventTipo, note: String(values.note ?? '').trim() || null }
    try {
      if (editing) {
        await updateEvent.mutateAsync({ id: editing.id, patch })
        showToast('success', 'Evento aggiornato.')
      } else {
        await createEvent.mutateAsync(patch)
        showToast('success', 'Evento creato.')
      }
      draft.clear()
      setModalOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    }
  }
  async function handleDelete(e: EventRow) {
    if (!window.confirm('Eliminare?')) return
    try {
      await deleteEvent.mutateAsync(e.id)
      showToast('success', 'Evento eliminato.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }

  const manualEvents: CalEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    titolo: e.titolo,
    data: e.data,
    tipo: e.tipo,
    src: 'ev',
    note: e.note,
  }))
  const dropEvents: CalEvent[] = (drops ?? [])
    .filter((d) => d.data_lancio)
    .map((d) => ({ id: 'drop-' + d.id, titolo: d.nome, data: d.data_lancio!, tipo: 'lancio' as EventTipo, src: 'drop' as const }))
  const faseEvents: CalEvent[] = (fasi ?? [])
    .filter((f) => f.data && !f.done)
    .map((f) => {
      const drop = drops?.find((d) => d.id === f.drop_id)
      return {
        id: 'fase-' + f.id,
        titolo: `${f.nome.split('—')[0].trim()} · ${drop?.nome ?? ''}`,
        data: f.data!,
        tipo: 'deadline' as EventTipo,
        src: 'fase' as const,
      }
    })
  const allEvents = [...manualEvents, ...dropEvents, ...faseEvents]

  const first = new Date(calY, calM, 1)
  const startDow = (first.getDay() + 6) % 7
  const daysIn = new Date(calY, calM + 1, 0).getDate()
  const prevDays = new Date(calY, calM, 0).getDate()
  const todayStr = todayIso()
  const monthName = first.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const tot = Math.ceil((startDow + daysIn) / 7) * 7

  const cells = []
  for (let i = 0; i < tot; i++) {
    const dayNum = i - startDow + 1
    let y = calY
    let m = calM
    let dn = dayNum
    let other = false
    if (dayNum < 1) {
      other = true
      m = calM - 1
      dn = prevDays + dayNum
      if (m < 0) {
        m = 11
        y--
      }
    } else if (dayNum > daysIn) {
      other = true
      m = calM + 1
      dn = dayNum - daysIn
      if (m > 11) {
        m = 0
        y++
      }
    }
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(dn).padStart(2, '0')}`
    const dayEvs = allEvents.filter((e) => e.data === ds)
    cells.push({ ds, dn, other, isToday: ds === todayStr, dayEvs })
  }

  const upcoming = allEvents
    .filter((e) => e.data >= todayStr)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 10)

  function calNav(d: number) {
    let m = calM + d
    let y = calY
    if (m < 0) {
      m = 11
      y--
    }
    if (m > 11) {
      m = 0
      y++
    }
    setCalM(m)
    setCalY(y)
  }
  function calToday() {
    setCalY(now.getFullYear())
    setCalM(now.getMonth())
  }

  return (
    <>
      <PanelHead
        title="Calendario"
        desc="Planner del team: incontri, deadline e date di lancio. Le date dei drop e delle fasi non completate entrano da sole dalla Timeline."
        actions={
          <button className="btn" onClick={() => openCreate()}>
            + Evento
          </button>
        }
      />

      {isLoading && <Loading label="Caricamento calendario…" />}
      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <div className="cal-head">
            <button className="btn sm ghost" onClick={() => calNav(-1)}>
              ←
            </button>
            <span className="cal-month">{monthName}</span>
            <div className="row">
              <button className="btn sm ghost" onClick={calToday}>
                Oggi
              </button>
              <button className="btn sm ghost" onClick={() => calNav(1)}>
                →
              </button>
            </div>
          </div>

          <div className="cal-grid">
            {DOW.map((d) => (
              <div className="cal-dow" key={d}>
                {d}
              </div>
            ))}
            {cells.map((c) => (
              <div
                key={c.ds}
                className={`cal-day${c.other ? ' other' : ''}${c.isToday ? ' today' : ''}`}
                onClick={() => openCreate(c.ds)}
                onKeyDown={onEnterOrSpace(() => openCreate(c.ds))}
                role="button"
                tabIndex={0}
                aria-label={`${c.dn}, aggiungi evento`}
              >
                <span className="dn">{c.dn}</span>
                {c.dayEvs.slice(0, 3).map((e) => (
                  <div className={`cal-ev ${e.tipo}`} key={e.id}>
                    {e.titolo}
                  </div>
                ))}
                {c.dayEvs.length > 3 && <div className="cal-ev">+{c.dayEvs.length - 3}</div>}
                {c.dayEvs.length > 0 && <span className="cnt">{c.dayEvs.length}</span>}
              </div>
            ))}
          </div>

          <div className="legend">
            <span>
              <i style={{ background: '#A9C9E2' }} /> Incontro team
            </span>
            <span>
              <i style={{ background: 'var(--amber)' }} /> Deadline
            </span>
            <span>
              <i style={{ background: 'var(--ember)' }} /> Lancio
            </span>
          </div>

          <span className="code">PROSSIMI 10</span>
          <div className="ev-list" style={{ marginTop: 10 }}>
            {upcoming.length === 0 && <div className="empty" style={{ padding: 18 }}>Nessun evento in arrivo.</div>}
            {upcoming.map((e) => (
              <div
                className="card conv"
                style={{ borderLeftColor: e.tipo === 'lancio' ? 'var(--ember)' : e.tipo === 'deadline' ? 'var(--amber)' : '#A9C9E2' }}
                key={e.id}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="row">
                    <span className="code" style={{ color: 'var(--bone)' }}>
                      {fmtDate(e.data)}
                    </span>
                    <span>{e.titolo}</span>
                    <span className="badge steel">{tipoLabel(e.tipo)}</span>
                  </div>
                  {e.src === 'ev' ? (
                    <div className="row">
                      <button
                        className="btn sm ghost"
                        onClick={() => {
                          const original = events?.find((ev) => ev.id === e.id)
                          if (original) openEdit(original)
                        }}
                      >
                        ✎
                      </button>
                      <button
                        className="btn sm danger"
                        onClick={() => {
                          const original = events?.find((ev) => ev.id === e.id)
                          if (original) handleDelete(original)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="code">da Timeline</span>
                  )}
                </div>
                {e.note && <div className="note">{e.note}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Modifica evento' : 'Nuovo evento'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <FormFields fields={EVENT_FIELDS} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
            {formError && <p className="auth-msg err">{formError}</p>}
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button className="btn" type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
                {createEvent.isPending || updateEvent.isPending ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
