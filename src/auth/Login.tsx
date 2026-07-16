import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from './useAuth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COOLDOWN_S = 60

const cooldownKey = (email: string) => `daemon:otp-cooldown:${email.trim().toLowerCase()}`

// Il magic link scaduto/già usato torna qui con #error=... nell'URL.
function readHashError(): string | null {
  if (!window.location.hash.includes('error')) return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  const code = params.get('error_code')
  const desc = params.get('error_description')
  return code === 'otp_expired'
    ? 'Il link non è più valido: è scaduto o è già stato usato. Richiedine uno nuovo qui sotto.'
    : desc
      ? decodeURIComponent(desc.replace(/\+/g, ' '))
      : 'Accesso non riuscito. Riprova.'
}

export default function Login() {
  const { signInWithOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(readHashError)
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<number | null>(null)

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

  async function requestLink(targetEmail: string, forceResend = false) {
    setError(null)
    if (!EMAIL_RE.test(targetEmail)) {
      setError('Indirizzo email non valido.')
      return
    }

    const storedUntil = Number(sessionStorage.getItem(cooldownKey(targetEmail)) || 0)
    if (!forceResend && storedUntil > Date.now()) {
      setSentTo(targetEmail)
      tickCooldown(storedUntil)
      return
    }

    setSending(true)
    const { error: sendError } = await signInWithOtp(targetEmail)
    setSending(false)
    if (sendError) {
      setError(sendError)
      return
    }
    const until = Date.now() + COOLDOWN_S * 1000
    sessionStorage.setItem(cooldownKey(targetEmail), String(until))
    setSentTo(targetEmail)
    tickCooldown(until)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    requestLink(email.trim())
  }

  if (sentTo) {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <div className="logo">
            D<span className="ae">Æ</span>MON
          </div>
          <span className="hdr-sub">Production HQ · Design → Sample → Drop</span>
          <p className="auth-msg ok">
            Ti abbiamo inviato un link di accesso a <strong>{sentTo}</strong>. Aprilo dalla stessa email per
            entrare — questa pagina si aggiorna da sola.
          </p>
          {error && <p className="auth-msg err">{error}</p>}
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setSentTo(null)
                setError(null)
              }}
            >
              Email sbagliata? Cambiala
            </button>
            <button
              className="btn"
              type="button"
              disabled={cooldown > 0 || sending}
              onClick={() => requestLink(sentTo, true)}
            >
              {cooldown > 0 ? `Rinvia tra ${cooldown}s` : sending ? 'Invio…' : 'Rinvia link'}
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
        <form onSubmit={handleSubmit}>
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
          <button className="btn" type="submit" disabled={sending || cooldown > 0} style={{ width: '100%' }}>
            {sending ? 'Invio…' : cooldown > 0 ? `Riprova tra ${cooldown}s` : 'Invia link di accesso'}
          </button>
        </form>
        {error && <p className="auth-msg err">{error}</p>}
      </div>
    </div>
  )
}
