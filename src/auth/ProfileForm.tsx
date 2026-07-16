import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import { OWNER_OPTS, type Owner } from '../lib/tabs'
import { useAuth } from './useAuth'

export default function ProfileForm({
  mode,
  onDone,
}: {
  mode: 'onboarding' | 'edit'
  onDone?: () => void
}) {
  const { profile, saveProfile, signOut } = useAuth()
  const [nome, setNome] = useState(profile?.nome ?? '')
  const [ruolo, setRuolo] = useState<Owner | ''>(profile?.ruolo ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = nome.trim()
    if (!trimmed) {
      setError('Inserisci il tuo nome.')
      return
    }
    if (!ruolo) {
      setError('Seleziona il tuo ruolo.')
      return
    }
    setSaving(true)
    const { error: saveError } = await saveProfile(trimmed, ruolo)
    setSaving(false)
    if (saveError) {
      setError(saveError)
      return
    }
    onDone?.()
  }

  const fields = (
    <>
      <div className="field">
        <label>Il tuo nome (firma le tue note)</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Andrea" autoFocus />
      </div>
      <div className="field">
        <label>Ruolo</label>
        <select value={ruolo} onChange={(e) => setRuolo(e.target.value as Owner)}>
          <option value="">— seleziona —</option>
          {OWNER_OPTS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="auth-msg err">{error}</p>}
    </>
  )

  if (mode === 'onboarding') {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <div className="logo">
            D<span className="ae">Æ</span>MON
          </div>
          <span className="hdr-sub">Benvenuto — completa il profilo per iniziare</span>
          <form onSubmit={handleSubmit}>
            {fields}
            <button className="btn" type="submit" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Salvataggio…' : 'Entra'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <Modal title="Il tuo profilo" onClose={() => onDone?.()}>
      <form onSubmit={handleSubmit}>
        {fields}
        <div className="modal-actions">
          <button className="btn danger" type="button" onClick={() => signOut()}>
            Esci
          </button>
          <button className="btn ghost" type="button" onClick={onDone}>
            Annulla
          </button>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
