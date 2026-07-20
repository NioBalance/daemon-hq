import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Drop = Database['public']['Tables']['drops']['Row']
export type DropInsert = Database['public']['Tables']['drops']['Insert']
export type DropUpdate = Database['public']['Tables']['drops']['Update']
export type DropFase = Database['public']['Tables']['drop_fasi']['Row']

const DROPS_KEY = ['drops']
const FASI_KEY = ['drop_fasi']

// Nomi fase brevi e puliti (i drop creati col template partono così); le
// vecchie fasi con "Nome — descrizione lunga" restano leggibili perché la UI
// mostra solo la parte prima del trattino.
export const PIPELINE_TEMPLATE: string[] = [
  'Supplier & Sample',
  'Production Ready',
  'Content Production',
  'Store Setup',
  'Pre-Launch',
  'Launch',
  'Post-Launch',
]

export function useDrops() {
  return useQuery({
    queryKey: DROPS_KEY,
    queryFn: async (): Promise<Drop[]> => {
      const { data, error } = await supabase.from('drops').select('*').order('data_lancio', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateDrop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DropInsert & { withTemplate?: boolean }) => {
      const { withTemplate, ...dropInput } = input
      const { data, error } = await supabase.from('drops').insert(dropInput).select().single()
      if (error) throw new Error(error.message)
      if (withTemplate) {
        const rows = PIPELINE_TEMPLATE.map((nome, i) => ({ drop_id: data.id, nome, ordine: i }))
        const { error: fasiError } = await supabase.from('drop_fasi').insert(rows)
        if (fasiError) throw new Error(fasiError.message)
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DROPS_KEY })
      queryClient.invalidateQueries({ queryKey: FASI_KEY })
    },
  })
}

export function useUpdateDrop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DropUpdate }) => {
      const { data, error } = await supabase.from('drops').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DROPS_KEY }),
  })
}

export function useDeleteDrop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drops').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DROPS_KEY })
      queryClient.invalidateQueries({ queryKey: ['articoli'] })
    },
  })
}

export function useDropFasi() {
  return useQuery({
    queryKey: FASI_KEY,
    queryFn: async (): Promise<DropFase[]> => {
      const { data, error } = await supabase.from('drop_fasi').select('*').order('ordine', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useAddFase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { drop_id: string; nome: string; data: string | null; ordine: number }) => {
      const { error } = await supabase.from('drop_fasi').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FASI_KEY }),
  })
}

export function useUpdateFase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<DropFase, 'nome' | 'data' | 'done'>> }) => {
      const { error } = await supabase.from('drop_fasi').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FASI_KEY }),
  })
}

export function useDeleteFase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('drop_fasi').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FASI_KEY }),
  })
}
