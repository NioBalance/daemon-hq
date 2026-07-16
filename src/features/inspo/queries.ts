import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Inspo = Database['public']['Tables']['inspo']['Row']

const KEY = ['inspo']

export function useInspo() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Inspo[]> => {
      const { data, error } = await supabase.from('inspo').select('*').order('ordine', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateInspo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { titolo: string; ordine: number }) => {
      const { data, error } = await supabase.from('inspo').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateInspo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Inspo, 'titolo' | 'img_path' | 'ordine'>> }) => {
      const { error } = await supabase.from('inspo').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteInspo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inspo').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
