import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type Meeting = Database['public']['Tables']['meetings']['Row']
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
export type MeetingUpdate = Database['public']['Tables']['meetings']['Update']
export type MeetingAction = Database['public']['Tables']['meeting_actions']['Row']
export type MeetingActionInsert = Database['public']['Tables']['meeting_actions']['Insert']
export type MeetingActionUpdate = Database['public']['Tables']['meeting_actions']['Update']

const KEY = ['meetings']
const ACT_KEY = ['meeting_actions']

export function useMeetings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Meeting[]> => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('data', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MeetingInsert) => {
      const { data, error } = await supabase.from('meetings').insert(input).select('id').single()
      if (error) throw new Error(error.message)
      return data.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MeetingUpdate }) => {
      const { error } = await supabase.from('meetings').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMeetingActions() {
  return useQuery({
    queryKey: ACT_KEY,
    queryFn: async (): Promise<MeetingAction[]> => {
      const { data, error } = await supabase
        .from('meeting_actions')
        .select('*')
        .order('ordine', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useAddMeetingAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MeetingActionInsert) => {
      const { error } = await supabase.from('meeting_actions').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACT_KEY }),
  })
}

export function useUpdateMeetingAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MeetingActionUpdate }) => {
      const { error } = await supabase.from('meeting_actions').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACT_KEY }),
  })
}

export function useDeleteMeetingAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meeting_actions').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACT_KEY }),
  })
}
