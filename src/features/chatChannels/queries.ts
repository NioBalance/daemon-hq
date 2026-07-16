import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type ChatChannel = Database['public']['Tables']['chat_channels']['Row']

const KEY = ['chat_channels']

export function useChatChannels() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ChatChannel[]> => {
      const { data, error } = await supabase.from('chat_channels').select('*')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateChatChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; url: string | null }) => {
      const { error } = await supabase.from('chat_channels').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateChatChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<ChatChannel, 'label' | 'url'>> }) => {
      const { error } = await supabase.from('chat_channels').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteChatChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chat_channels').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
