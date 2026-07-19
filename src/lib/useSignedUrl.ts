import { useQuery } from '@tanstack/react-query'
import { getSignedMediaUrl, SIGNED_URL_TTL_S } from './upload'

/** URL firmata (1h) per un path del bucket privato "media" — unico punto di
 *  lettura per immagini articoli, thumbnail Media Studio e file tech pack.
 *  React Query fa da cache condivisa: stesso path richiesto da N card = una
 *  sola firma; il rinnovo scatta un po' prima della scadenza reale. */
export function useSignedUrl(path: string | null | undefined): string | null {
  const { data } = useQuery({
    queryKey: ['signed-url', path],
    queryFn: () => getSignedMediaUrl(path),
    enabled: !!path,
    staleTime: (SIGNED_URL_TTL_S - 10 * 60) * 1000,
    gcTime: (SIGNED_URL_TTL_S - 5 * 60) * 1000,
    refetchOnWindowFocus: false,
  })
  return data ?? null
}
