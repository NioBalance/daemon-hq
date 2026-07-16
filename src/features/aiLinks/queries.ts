import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type AiLink = Database['public']['Tables']['ai_links']['Row']

const KEY = ['ai_links']

export function useAiLinks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<AiLink[]> => {
      const { data, error } = await supabase.from('ai_links').select('*')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateAiLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; url: string | null }) => {
      const { error } = await supabase.from('ai_links').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateAiLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<AiLink, 'label' | 'url'>> }) => {
      const { error } = await supabase.from('ai_links').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteAiLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_links').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
