import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Techpack = Database['public']['Tables']['techpacks']['Row']
export type TechpackInsert = Database['public']['Tables']['techpacks']['Insert']
export type TechpackUpdate = Database['public']['Tables']['techpacks']['Update']

const KEY = ['techpacks']

export function useTechpacks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Techpack[]> => {
      const { data, error } = await supabase.from('techpacks').select('*').order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateTechpack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TechpackInsert) => {
      const { data, error } = await supabase.from('techpacks').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateTechpack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TechpackUpdate }) => {
      const { data, error } = await supabase.from('techpacks').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTechpack() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('techpacks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
