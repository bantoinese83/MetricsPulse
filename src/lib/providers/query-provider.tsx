'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: unknown) => {
          // Don't retry on 4xx errors
          if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
            if (error.status >= 400 && error.status < 500) {
              return false
            }
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
        onError: (error) => {
          console.error('Mutation error:', error)
          // You could show a toast notification here
        },
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may suspend
  // because React will throw away the client on the initial render if
  // it suspends and there is no boundary
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}