import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Fornitore = Database['public']['Tables']['fornitori']['Row']
export type FornitoreInsert = Database['public']['Tables']['fornitori']['Insert']
export type FornitoreUpdate = Database['public']['Tables']['fornitori']['Update']

const KEY = ['fornitori']

async function fetchFornitori(): Promise<Fornitore[]> {
  const { data, error } = await supabase.from('fornitori').select('*').order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export function useFornitori() {
  return useQuery({ queryKey: KEY, queryFn: fetchFornitori })
}

export function useCreateFornitore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: FornitoreInsert) => {
      const { data, error } = await supabase.from('fornitori').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateFornitore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: FornitoreUpdate }) => {
      const { data, error } = await supabase.from('fornitori').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteFornitore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fornitori').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
