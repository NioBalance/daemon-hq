import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type CanvasNode = Database['public']['Tables']['canvas_nodes']['Row']
export type CanvasNodeInsert = Database['public']['Tables']['canvas_nodes']['Insert']
export type CanvasNodeUpdate = Database['public']['Tables']['canvas_nodes']['Update']
export type CanvasEdge = Database['public']['Tables']['canvas_edges']['Row']

/** Caricamento una-tantum di nodi + archi della lavagna. Dopo il fetch, lo
 *  stato vive in React Flow e le modifiche si salvano fire-and-forget (sotto):
 *  niente refetch a ogni tocco. */
export function useCanvas() {
  return useQuery({
    queryKey: ['canvas'],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> => {
      const [n, e] = await Promise.all([
        supabase.from('canvas_nodes').select('*'),
        supabase.from('canvas_edges').select('*'),
      ])
      if (n.error) throw new Error(n.error.message)
      if (e.error) throw new Error(e.error.message)
      return { nodes: n.data, edges: e.data }
    },
  })
}

export async function createCanvasNode(input: CanvasNodeInsert): Promise<CanvasNode> {
  const { data, error } = await supabase.from('canvas_nodes').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data
}
export async function updateCanvasNode(id: string, patch: CanvasNodeUpdate): Promise<void> {
  const { error } = await supabase.from('canvas_nodes').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}
export async function deleteCanvasNode(id: string): Promise<void> {
  const { error } = await supabase.from('canvas_nodes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
export async function createCanvasEdge(id: string, source: string, target: string): Promise<void> {
  const { error } = await supabase.from('canvas_edges').insert({ id, source, target })
  if (error) throw new Error(error.message)
}
export async function deleteCanvasEdge(id: string): Promise<void> {
  const { error } = await supabase.from('canvas_edges').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
