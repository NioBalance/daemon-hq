import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database, MediaTag } from '../../lib/database.types'

export type MediaTagRow = Database['public']['Tables']['media_tags']['Row']

const KEY = ['media_tags']

export function useMediaTags() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<MediaTagRow[]> => {
      const { data, error } = await supabase
        .from('media_tags')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useAddMediaTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { media_id: string; tag: MediaTag }) => {
      const { error } = await supabase.from('media_tags').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRemoveMediaTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { media_id: string; tag: MediaTag }) => {
      const { error } = await supabase
        .from('media_tags')
        .delete()
        .eq('media_id', input.media_id)
        .eq('tag', input.tag)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
