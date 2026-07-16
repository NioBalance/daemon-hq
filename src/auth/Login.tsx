import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from './useAuth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COOLDOWN_S = 60
const CODE_LEN = 8 // Supabase invia un codice OTP a 8 cifre via email

const cooldownKey = (email: string) => `daemon:otp-cooldown:${email.trim().toLowerCase()}`
const sanitizeCode = (raw: string) => raw.replace(/\D/g, '').slice(0, CODE_LEN)

// Se l'utente clicca comunque il link nell'email invece di digitare il codice,
// un link scaduto/già usato torna qui con #error=... nell'URL.
function readHashError(): string | null {
  if (!window.location.hash.includes('error')) return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  const code = params.get('error_code')
  const desc = params.get('error_description')
  return code === 'otp_expired'
    ? 'Il link non è più valido: è scaduto o è già stato usato. Richiedi un nuovo codice qui sotto.'
    : desc
      ? decodeURIComponent(desc.replace(/\+/g, ' '))
      : 'Accesso non riuscito. Riprova.'
}

export default function Login() {
  const { signInWithOtp, verifyOtp } = useAuth()
  const [view, setView] = useState<'form' | 'code'>('form')
  const [email, setEmail] = useState('')
  const [remember, setRememberChecked] = useState(true)
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(readHashError)
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<number | null>(null)
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (window.location.hash.includes('error')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (view === 'code') codeInputRef.current?.focus()
  }, [view])

  function tickCooldown(until: number) {
    if (timerRef.current) window.clearInterval(timerRef.current)
    const update = () => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000))
      setCooldown(remaining)
      if (remaining <= 0 && timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    update()
    timerRef.current = window.setInterval(update, 1000)
  }

  async function sendCode(targetEmail: string, forceResend = false) {
    setError(null)
    if (!EMAIL_RE.test(targetEmail)) {
      setError('Indirizzo email non valido.')
      return
    }

    const storedUntil = Number(sessionStorage.getItem(cooldownKey(targetEmail)) || 0)
    if (!forceResend && storedUntil > Date.now()) {
      setView('code')
      tickCooldown(storedUntil)
      return
    }

    setSending(true)
    const { error: sendError } = await signInWithOtp(targetEmail, remember)
    setSending(false)
    if (sendError) {
      setError(sendError)
      return
    }
    const until = Date.now() + COOLDOWN_S * 1000
    sessionStorage.setItem(cooldownKey(targetEmail), String(until))
    setCode('')
    setView('code')
    tickCooldown(until)
  }

  async function handleVerify(codeOverride?: string) {
    const value = codeOverride ?? code
    if (value.length !== CODE_LEN || verifying) return
    setError(null)
    setVerifying(true)
    const { error: verifyError } = await verifyOtp(email.trim(), value)
    setVerifying(false)
    if (verifyError) {
      setError(verifyError)
      setCode('')
      codeInputRef.current?.focus()
    }
  }

  function handleCodeChange(raw: string) {
    const next = sanitizeCode(raw)
    setCode(next)
    if (next.length === CODE_LEN) void handleVerify(next)
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    sendCode(email.trim())
  }

  function handleCodeSubmit(e: FormEvent) {
    e.preventDefault()
    void handleVerify()
  }

  if (view === 'code') {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <div className="logo">
            D<span className="ae">Æ</span>MON
          </div>
          <span className="hdr-sub">Production HQ · Design → Sample → Drop</span>
          <p className="auth-msg ok">
            Codice inviato a <strong>{email.trim()}</strong>. Copialo dall'email e incollalo (o digitalo) qui
            sotto.
          </p>
          <form onSubmit={handleCodeSubmit}>
            <div className="field">
              <label>Codice a 8 cifre</label>
              <input
                ref={codeInputRef}
                className="otp-input"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="········"
                maxLength={CODE_LEN}
                disabled={verifying}
              />
            </div>
            {error && <p className="auth-msg err">{error}</p>}
            <button
              className="btn"
              type="submit"
              disabled={verifying || code.length !== CODE_LEN}
              style={{ width: '100%' }}
            >
              {verifying ? 'Verifica…' : 'Entra'}
            </button>
          </form>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setView('form')
                setError(null)
              }}
            >
              Email sbagliata? Cambiala
            </button>
            <button
              className="btn ghost"
              type="button"
              disabled={cooldown > 0 || sending}
              onClick={() => sendCode(email.trim(), true)}
            >
              {cooldown > 0 ? `Rinvia tra ${cooldown}s` : sending ? 'Invio…' : 'Rinvia codice'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <div className="logo">
          D<span className="ae">Æ</span>MON
        </div>
        <span className="hdr-sub">Production HQ · Design → Sample → Drop</span>
        <form onSubmit={handleFormSubmit}>
          <div className="field">
            <label>La tua email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@daemon.com"
              autoFocus
            />
          </div>
          <label className="row" style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRememberChecked(e.target.checked)}
              style={{ accentColor: 'var(--ember)', width: 15, height: 15, cursor: 'pointer' }}
            />
            Resta connesso su questo dispositivo
          </label>
          <button className="btn" type="submit" disabled={sending || cooldown > 0} style={{ width: '100%' }}>
            {sending ? 'Invio…' : cooldown > 0 ? `Riprova tra ${cooldown}s` : 'Invia codice di accesso'}
          </button>
        </form>
        {error && <p className="auth-msg err">{error}</p>}
      </div>
    </div>
  )
}
