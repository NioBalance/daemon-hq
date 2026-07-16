import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Gadget = Database['public']['Tables']['gadgets']['Row']

const KEY = ['gadgets']

export function useGadgets() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Gadget[]> => {
      const { data, error } = await supabase.from('gadgets').select('*').order('ordine', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateGadget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { nome: string; ordine: number }) => {
      const { data, error } = await supabase.from('gadgets').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateGadget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Gadget, 'nome' | 'img_path' | 'ordine'>> }) => {
      const { error } = await supabase.from('gadgets').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteGadget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gadgets').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
