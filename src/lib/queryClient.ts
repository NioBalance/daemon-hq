import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      // Refetch in background RIATTIVATI (audit A4): il blocco storico era
      // nato da un bug di perdita-modifiche nei form al cambio finestra, ma
      // la causa vera è stata rimossa alla radice — tutti i form tengono i
      // valori in state locale inizializzato UNA volta all'apertura (mai da
      // props/query data a render), e il sistema bozze (useFormDraft, 17
      // file) fa da rete di sicurezza. Un refetch ora può solo aggiornare
      // le liste sotto, mai toccare ciò che l'utente sta scrivendo.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})
