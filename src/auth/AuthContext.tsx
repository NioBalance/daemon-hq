import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Owner } from '../lib/tabs'
import { AuthContext, type AuthStatus, type Profile } from './auth-context'

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('rate limit')) return 'Hai richiesto troppi link di accesso per questa email. Aspetta qualche minuto e riprova.'
  if (m.includes('only request this after')) return 'Hai già richiesto un link da poco. Aspetta ancora qualche secondo e riprova.'
  if (m.includes('invalid') && m.includes('email')) return 'Indirizzo email non valido.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  async function loadProfile(userId: string) {
    setProfileLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, ruolo, email')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data ?? null)
    setProfileLoading(false)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      if (mounted) setInitializing(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) loadProfile(newSession.user.id)
      else setProfile(null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signInWithOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error ? mapAuthError(error.message) : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function saveProfile(nome: string, ruolo: Owner) {
    if (!session) return { error: 'Sessione non valida — prova a rifare l’accesso.' }
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, nome, ruolo, email: session.user.email ?? null }, { onConflict: 'id' })
      .select('id, nome, ruolo, email')
      .single()
    if (error) return { error: error.message }
    setProfile(data)
    return { error: null }
  }

  const status: AuthStatus = initializing || profileLoading
    ? 'loading'
    : !session
      ? 'signedOut'
      : !profile || !profile.nome || !profile.ruolo
        ? 'onboarding'
        : 'ready'

  return (
    <AuthContext.Provider value={{ status, session, profile, signInWithOtp, signOut, saveProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
