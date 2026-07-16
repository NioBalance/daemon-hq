import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type BrandLink = Database['public']['Tables']['links']['Row']

const KEY = ['links']

export function useLinks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<BrandLink[]> => {
      const { data, error } = await supabase.from('links').select('*').order('ordine', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; url: string | null; ordine: number }) => {
      const { data, error } = await supabase.from('links').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<BrandLink, 'label' | 'url'>> }) => {
      const { error } = await supabase.from('links').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('links').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
