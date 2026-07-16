import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Chat = Database['public']['Tables']['chats']['Row']
export type ChatInsert = Database['public']['Tables']['chats']['Insert']
export type ChatUpdate = Database['public']['Tables']['chats']['Update']

const KEY = ['chats']

export function useChats() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Chat[]> => {
      const { data, error } = await supabase.from('chats').select('*').order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ChatInsert) => {
      const { data, error } = await supabase.from('chats').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ChatUpdate }) => {
      const { error } = await supabase.from('chats').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chats').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
