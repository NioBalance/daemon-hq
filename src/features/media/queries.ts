import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type MediaItem = Database['public']['Tables']['media']['Row']
export type MediaInsert = Database['public']['Tables']['media']['Insert']
export type MediaUpdate = Database['public']['Tables']['media']['Update']

const KEY = ['media']

export function useMediaItems() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<MediaItem[]> => {
      const { data, error } = await supabase.from('media').select('*').order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MediaInsert) => {
      const { data, error } = await supabase.from('media').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MediaUpdate }) => {
      const { error } = await supabase.from('media').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('media').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
