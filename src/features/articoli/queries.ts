import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Articolo = Database['public']['Tables']['articoli']['Row']
export type ArticoloInsert = Database['public']['Tables']['articoli']['Insert']
export type ArticoloUpdate = Database['public']['Tables']['articoli']['Update']
export type ArticoloTask = Database['public']['Tables']['articolo_tasks']['Row']

const ARTICOLI_KEY = ['articoli']
const TASKS_KEY = ['articolo_tasks']

export function useArticoli() {
  return useQuery({
    queryKey: ARTICOLI_KEY,
    queryFn: async (): Promise<Articolo[]> => {
      const { data, error } = await supabase.from('articoli').select('*').order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateArticolo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ArticoloInsert) => {
      const { data, error } = await supabase.from('articoli').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARTICOLI_KEY }),
  })
}

export function useUpdateArticolo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ArticoloUpdate }) => {
      const { data, error } = await supabase.from('articoli').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARTICOLI_KEY }),
  })
}

export function useDeleteArticolo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('articoli').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARTICOLI_KEY }),
  })
}

export function useArticoloTasks() {
  return useQuery({
    queryKey: TASKS_KEY,
    queryFn: async (): Promise<ArticoloTask[]> => {
      const { data, error } = await supabase.from('articolo_tasks').select('*').order('ordine', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useAddTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { articolo_id: string; testo: string; ordine: number }) => {
      const { error } = await supabase.from('articolo_tasks').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from('articolo_tasks').update({ done }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('articolo_tasks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}
