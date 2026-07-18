import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // I dati si aggiornano già dopo ogni mutation (invalidateQueries): il
      // refetch al ritorno del focus non serve e causava re-render che
      // disturbavano i form aperti (perdita modifiche cambiando finestra).
      refetchOnWindowFocus: false,
    },
  },
})
