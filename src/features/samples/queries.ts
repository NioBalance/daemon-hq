import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Sample = Database['public']['Tables']['samples']['Row']
export type SampleInsert = Database['public']['Tables']['samples']['Insert']
export type SampleUpdate = Database['public']['Tables']['samples']['Update']

const KEY = ['samples']

export function useSamples() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Sample[]> => {
      const { data, error } = await supabase.from('samples').select('*').order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateSample() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SampleInsert) => {
      const { data, error } = await supabase.from('samples').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateSample() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SampleUpdate }) => {
      const { data, error } = await supabase.from('samples').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteSample() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('samples').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
