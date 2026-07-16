import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database, NoteEntityType } from '../../lib/database.types'

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']

// Una nota è sempre legata a un'entità precisa, ma per tipo carichiamo tutte
// le righe in un colpo solo: dataset piccolo, evita un giro di rete per ogni
// card/dettaglio che deve solo contare o mostrare le proprie note.
export function useNotesByType(entityType: NoteEntityType) {
  return useQuery({
    queryKey: ['notes', entityType],
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_type', entityType)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useAddNote(entityType: NoteEntityType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NoteInsert) => {
      const { data, error } = await supabase.from('notes').insert(input).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', entityType] }),
  })
}

export function useDeleteNote(entityType: NoteEntityType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', entityType] }),
  })
}
