import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Design = Database['public']['Tables']['designs']['Row']
export type DesignInsert = Database['public']['Tables']['designs']['Insert']
export type DesignUpdate = Database['public']['Tables']['designs']['Update']

const KEY = ['designs']

export function useDesigns() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Design[]> => {
      const { data, error } = await supabase.from('designs').select('*').order('ordine', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateDesign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DesignInsert) => {
      const { data, error } = await supabase.from('designs').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateDesign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DesignUpdate }) => {
      const { data, error } = await supabase.from('designs').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteDesign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('designs').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
