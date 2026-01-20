import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { metricsApi, stripeApi, workspaceApi, isApiSuccess } from './api'
import { Metric, MetricName, LoadingState } from './types'
export { useNetworkStatus, useOfflineHandler, useOptimisticUpdate } from './hooks/use-network-status'

// Custom hooks for data fetching and state management

// Metrics hooks
export function useMetrics(workspaceId?: string, days: number = 30) {
  return useQuery({
    queryKey: ['metrics', workspaceId, days],
    queryFn: async () => {
      const response = await metricsApi.getMetrics(workspaceId, days)
      if (isApiSuccess(response)) {
        return response.data
      }
      throw new Error(response.error || 'Failed to fetch metrics')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useMetricHistory(metricName: MetricName, days: number = 30) {
  return useQuery({
    queryKey: ['metric-history', metricName, days],
    queryFn: async () => {
      const response = await metricsApi.getMetricHistory(metricName, days)
      if (isApiSuccess(response)) {
        return response.data
      }
      throw new Error(response.error || 'Failed to fetch metric history')
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCalculateMetrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: metricsApi.calculateMetrics,
    onSuccess: (response) => {
      if (isApiSuccess(response)) {
        // Invalidate and refetch metrics
        queryClient.invalidateQueries({ queryKey: ['metrics'] })
        queryClient.invalidateQueries({ queryKey: ['metric-history'] })
      }
    },
  })
}

// Workspace hooks
export function useWorkspace() {
  return useQuery({
    queryKey: ['workspace'],
    queryFn: async () => {
      const response = await workspaceApi.getCurrentWorkspace()
      if (isApiSuccess(response)) {
        return response.data
      }
      throw new Error(response.error || 'Failed to fetch workspace')
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Stripe connection hooks
export function useStripeConnection() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectStripe = useCallback(async (userId: string) => {
    setIsConnecting(true)
    setError(null)

    try {
      const response = await stripeApi.getConnectionUrl(userId)
      if (isApiSuccess(response) && response.data?.url) {
        window.location.href = response.data.url
      } else {
        setError(response.error || 'Failed to connect Stripe')
      }
    } catch {
      setError('Failed to initiate Stripe connection')
    } finally {
      setIsConnecting(false)
    }
  }, [])

  return {
    connectStripe,
    isConnecting,
    error,
  }
}

// Loading state hook
export function useLoadingState(initialLoading = false): LoadingState & {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
} {
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    setLoading,
    setError,
    reset,
  }
}

// Local storage hook with TypeScript support
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue]
}

// Debounce hook for search/input optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Previous value hook for comparisons
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  const [previousValue, setPreviousValue] = useState<T | undefined>(undefined)

  useEffect(() => {
    setPreviousValue(ref.current)
    ref.current = value
  }, [value])

  return previousValue
}

// Online status hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Metrics calculation hook with memoization
export function useMetricsCalculations(metrics: Metric[]) {
  return useMemo(() => {
    const getLatestMetric = (metricName: MetricName) => {
      const metricData = metrics.filter(m => m.metricName === metricName)
      return metricData[metricData.length - 1]
    }

    const getPreviousMetric = (metricName: MetricName) => {
      const metricData = metrics.filter(m => m.metricName === metricName)
      return metricData[metricData.length - 2]
    }

    const calculateChange = (current: number, previous: number) => {
      if (!previous) return 0
      return ((current - previous) / previous) * 100
    }

    const mrr = getLatestMetric('mrr')
    const churnRate = getLatestMetric('churn_rate')
    const ltv = getLatestMetric('ltv')
    const activeCustomers = getLatestMetric('active_customers')

    const mrrChange = calculateChange(mrr?.value || 0, getPreviousMetric('mrr')?.value || 0)
    const churnChange = calculateChange(churnRate?.value || 0, getPreviousMetric('churn_rate')?.value || 0)

    return {
      mrr,
      churnRate,
      ltv,
      activeCustomers,
      mrrChange,
      churnChange,
      getLatestMetric,
      getPreviousMetric,
      calculateChange,
    }
  }, [metrics])
}

// Chart data preparation hook
export function useChartData(metrics: Metric[]) {
  return useMemo(() => {
    return metrics.reduce((acc, metric) => {
      const date = new Date(metric.recordedAt).toISOString().split('T')[0]
      const existing = acc.find(item => item.date === date)
      if (existing) {
        existing[metric.metricName] = metric.value
      } else {
        acc.push({ date, [metric.metricName]: metric.value })
      }
      return acc
    }, [] as Array<Record<string, unknown>>)
  }, [metrics])
}