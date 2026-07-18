import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/useAuth'
import type { Database } from '../../lib/database.types'
import type { TabKey } from '../../lib/tabs'

export type ActivityRow = Database['public']['Tables']['activity']['Row']

const KEY = ['activity']
const CAP = 200

export function useActivity() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(CAP)
      if (error) throw new Error(error.message)
      return data
    },
  })
}

/** Scrive una riga di log firmata (fire-and-forget: un log fallito non deve
 *  mai bloccare l'azione vera) e mantiene il cap FIFO a ~200 voci. */
export function useActivityLogger() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  return useCallback(
    (azione: string, oggetto: string, tab?: TabKey) => {
      if (!profile) return
      void (async () => {
        try {
          await supabase.from('activity').insert({
            author_id: profile.id,
            author_name: profile.nome,
            azione,
            oggetto,
            tab: tab ?? null,
          })
          queryClient.invalidateQueries({ queryKey: KEY })
          // Trim FIFO oltre il cap: guarda il created_at della voce n. CAP
          // in cache e cancella tutto ciò che è più vecchio.
          const cached = queryClient.getQueryData<ActivityRow[]>(KEY)
          if (cached && cached.length >= CAP) {
            const cutoff = cached[CAP - 1].created_at
            await supabase.from('activity').delete().lt('created_at', cutoff)
          }
        } catch {
          // silenzioso: il log è best-effort
        }
      })()
    },
    [profile, queryClient],
  )
}

/** Badge dei change non ancora visti dall'utente corrente (esclude i suoi). */
export function useUnseenActivity(): number {
  const { profile } = useAuth()
  const { data: activity } = useActivity()
  if (!profile || !activity) return 0
  const seen = getActivitySeen(profile.id)
  return activity.filter((a) => a.created_at > seen && a.author_id !== profile.id).length
}

/** Badge non-visti: timestamp dell'ultima visita al widget, per utente,
 *  in chiave locale personale. */
const seenKey = (userId: string) => `daemon:activity-seen:${userId}`

export function getActivitySeen(userId: string): string {
  return localStorage.getItem(seenKey(userId)) ?? new Date(0).toISOString()
}

export function markActivitySeen(userId: string) {
  localStorage.setItem(seenKey(userId), new Date().toISOString())
}
