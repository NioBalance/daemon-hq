import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Memo = Database['public']['Tables']['team_memos']['Row']
export type MemoInsert = Database['public']['Tables']['team_memos']['Insert']
export type MemoUpdate = Database['public']['Tables']['team_memos']['Update']

const KEY = ['team_memos']

export function useMemos() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Memo[]> => {
      const { data, error } = await supabase
        .from('team_memos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateMemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MemoInsert) => {
      const { error } = await supabase.from('team_memos').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateMemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MemoUpdate }) => {
      const { error } = await supabase.from('team_memos').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteMemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_memos').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
