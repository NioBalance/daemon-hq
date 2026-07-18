import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type TechpackFile = Database['public']['Tables']['techpack_files']['Row']
export type TechpackFileInsert = Database['public']['Tables']['techpack_files']['Insert']

const KEY = ['techpack_files']

export function useTechpackFiles() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<TechpackFile[]> => {
      const { data, error } = await supabase
        .from('techpack_files')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useAddTechpackFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TechpackFileInsert) => {
      const { error } = await supabase.from('techpack_files').insert(input)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTechpackFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('techpack_files').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
