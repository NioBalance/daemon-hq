import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type PublishItem = Database['public']['Tables']['publish_items']['Row']
export type PublishItemInsert = Database['public']['Tables']['publish_items']['Insert']
export type PublishItemUpdate = Database['public']['Tables']['publish_items']['Update']

const KEY = ['publish_items']

export function usePublishItems() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PublishItem[]> => {
      const { data, error } = await supabase
        .from('publish_items')
        .select('*')
        .order('ordine', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreatePublishItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PublishItemInsert) => {
      const { error } = await supabase.from('publish_items').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdatePublishItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PublishItemUpdate }) => {
      const { error } = await supabase.from('publish_items').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeletePublishItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('publish_items').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
