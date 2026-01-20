import { useState, useEffect, useCallback } from 'react'

interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType: string | null
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
  lastOnlineAt: Date | null
  lastOfflineAt: Date | null
}

interface NetworkStatusHook extends NetworkStatus {
  checkConnection: () => Promise<boolean>
  getConnectionQuality: () => 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
}

// Extended Navigator interface for connection info
interface NavigatorExtended extends Navigator {
  connection?: {
    effectiveType?: string
    type?: string
    downlink?: number
    rtt?: number
    addEventListener: (type: string, listener: EventListener) => void
    removeEventListener: (type: string, listener: EventListener) => void
  }
}

export function useNetworkStatus(): NetworkStatusHook {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    lastOnlineAt: null,
    lastOfflineAt: null,
  })

  // Update connection info
  const updateConnectionInfo = useCallback(() => {
    const navigatorExt = navigator as NavigatorExtended

    if (navigatorExt.connection) {
      const connection = navigatorExt.connection
      setStatus(prev => ({
        ...prev,
        connectionType: connection.type || null,
        effectiveType: connection.effectiveType || null,
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
        isSlowConnection: (connection.downlink && connection.downlink < 1) ||
                         (connection.rtt && connection.rtt > 300) ||
                         false,
      }))
    }
  }, [])

  // Check actual connection by making a lightweight request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Use a lightweight HEAD request to check connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      const isConnected = response.ok
      setStatus(prev => ({
        ...prev,
        isOnline: isConnected,
        lastOnlineAt: isConnected ? new Date() : prev.lastOnlineAt,
        lastOfflineAt: isConnected ? prev.lastOfflineAt : new Date(),
      }))

      return isConnected
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastOfflineAt: new Date(),
      }))
      return false
    }
  }, [])

  // Get connection quality assessment
  const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' => {
    if (!status.isOnline) return 'offline'

    const { downlink, rtt, effectiveType } = status

    // Network Information API assessment
    if (effectiveType) {
      switch (effectiveType) {
        case '4g':
          return 'excellent'
        case '3g':
          return 'good'
        case '2g':
          return 'poor'
        case 'slow-2g':
          return 'poor'
        default:
          return 'fair'
      }
    }

    // Fallback assessment using downlink and RTT
    if (downlink !== null && rtt !== null) {
      if (downlink >= 5 && rtt <= 100) return 'excellent'
      if (downlink >= 2 && rtt <= 200) return 'good'
      if (downlink >= 1 && rtt <= 300) return 'fair'
      return 'poor'
    }

    // Basic assessment
    if (status.isSlowConnection) return 'poor'

    return 'good'
  }, [status])

  // Set up event listeners
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        lastOnlineAt: new Date(),
      }))
    }

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastOfflineAt: new Date(),
      }))
    }

    // Network status events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Connection change events (Network Information API)
    const navigatorExt = navigator as NavigatorExtended
    if (navigatorExt.connection) {
      const handleConnectionChange = () => updateConnectionInfo()
      navigatorExt.connection.addEventListener('change', handleConnectionChange)

      // Initial connection info
      updateConnectionInfo()

      return () => {
        navigatorExt.connection.removeEventListener('change', handleConnectionChange)
      }
    }

    // Periodic connectivity checks (every 30 seconds when online)
    const interval = setInterval(() => {
      if (status.isOnline) {
        checkConnection()
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [updateConnectionInfo, checkConnection, status.isOnline])

  // Initial connectivity check
  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return {
    ...status,
    checkConnection,
    getConnectionQuality,
  }
}

// Hook for handling offline/online scenarios
export function useOfflineHandler() {
  const { isOnline, checkConnection } = useNetworkStatus()
  const [pendingActions, setPendingActions] = useState<Array<() => Promise<void>>>([])
  const [isProcessingPending, setIsProcessingPending] = useState(false)

  // Queue action for when connection is restored
  const queueAction = useCallback((action: () => Promise<void>) => {
    setPendingActions(prev => [...prev, action])
  }, [])

  // Process pending actions when back online
  const processPendingActions = useCallback(async () => {
    if (isProcessingPending || pendingActions.length === 0) return

    setIsProcessingPending(true)

    try {
      for (const action of pendingActions) {
        await action()
      }
      setPendingActions([])
    } catch (error) {
      console.error('Error processing pending actions:', error)
    } finally {
      setIsProcessingPending(false)
    }
  }, [pendingActions, isProcessingPending])

  // Process pending actions when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      processPendingActions()
    }
  }, [isOnline, pendingActions.length, processPendingActions])

  return {
    isOnline,
    checkConnection,
    queueAction,
    pendingActionsCount: pendingActions.length,
    isProcessingPending,
  }
}

// Hook for optimistic updates with rollback
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>,
  rollbackFn?: (previousData: T) => Promise<void>
) {
  const [data, setData] = useState<T>(initialData)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const update = useCallback(async (newData: T) => {
    const previousData = data
    setIsUpdating(true)
    setError(null)

    // Optimistic update
    setData(newData)

    try {
      const result = await updateFn(newData)
      setData(result)
    } catch (err) {
      // Rollback on error
      setData(previousData)
      setError(err as Error)

      // Call rollback function if provided
      if (rollbackFn) {
        try {
          await rollbackFn(previousData)
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError)
        }
      }
    } finally {
      setIsUpdating(false)
    }
  }, [data, updateFn, rollbackFn])

  return {
    data,
    isUpdating,
    error,
    update,
  }
}