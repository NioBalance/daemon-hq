import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database, KpiMetrica } from '../../lib/database.types'

export type KpiSnapshot = Database['public']['Tables']['kpi_snapshots']['Row']
export type KpiSnapshotInsert = Database['public']['Tables']['kpi_snapshots']['Insert']

const KEY = ['kpi_snapshots']

export const KPI_METRICHE: { value: KpiMetrica; label: string; unit?: string }[] = [
  { value: 'instagram_followers', label: 'Follower Instagram' },
  { value: 'ordini_totali', label: 'Ordini totali' },
  { value: 'pacchi_drop', label: 'Pacchi drop' },
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'revenue_drop', label: 'Revenue drop', unit: '€' },
]

export const kpiLabel = (m: KpiMetrica) => KPI_METRICHE.find((x) => x.value === m)?.label ?? m

export function useKpiSnapshots() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<KpiSnapshot[]> => {
      const { data, error } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .order('data', { ascending: true })
      if (error) throw new Error(error.message)
      return data
    },
  })
}

/** Upsert su (metrica, data): reinserire lo stesso giorno aggiorna il valore. */
export function useUpsertKpi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: KpiSnapshotInsert) => {
      const { error } = await supabase
        .from('kpi_snapshots')
        .upsert(input, { onConflict: 'metrica,data' })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
