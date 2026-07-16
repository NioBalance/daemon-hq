import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Owner } from '../lib/tabs'

export interface Profile {
  id: string
  nome: string
  ruolo: Owner | null
  email: string | null
}

export type AuthStatus = 'loading' | 'signedOut' | 'onboarding' | 'ready'

export interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  profile: Profile | null
  signInWithOtp: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  saveProfile: (nome: string, ruolo: Owner) => Promise<{ error: string | null }>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
