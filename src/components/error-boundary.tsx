'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
  retryCount: number
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error: Error
    resetError: () => void
    errorId: string
    retryCount: number
  }>
  maxRetries?: number
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = []
  private maxRetries: number

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.maxRetries = props.maxRetries || 3
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId,
      retryCount: 0,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.setState({
      error,
      errorInfo,
      errorId,
    })

    // Log error with comprehensive context
    const errorContext = {
      errorId,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    }

    console.error('Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      ...errorContext,
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId)
    }

    // Send to error monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // Sentry.captureException(error, {
      //   contexts: {
      //     react: errorInfo,
      //     custom: errorContext,
      //   },
      //   tags: {
      //     errorId,
      //     component: 'ErrorBoundary',
      //   },
      // })
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    })
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount <= this.maxRetries) {
      this.setState({ retryCount: newRetryCount })

      // Exponential backoff for retries
      const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 10000)

      const timeout = setTimeout(() => {
        this.resetError()
      }, delay)

      this.retryTimeouts.push(timeout)
    } else {
      // Max retries reached, force reload
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
            errorId={this.state.errorId}
            retryCount={this.state.retryCount}
          />
        )
      }

      return (
        <DefaultErrorFallback
          error={this.state.error!}
          resetError={this.resetError}
          errorId={this.state.errorId}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  errorId: string
  retryCount: number
  maxRetries?: number
  onRetry?: () => void
}

function DefaultErrorFallback({
  error,
  resetError,
  errorId,
  retryCount,
  maxRetries = 3,
  onRetry
}: ErrorFallbackProps) {
  const router = useRouter()
  const isOnline = useOnlineStatus()

  const handleReload = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  // Determine error type and appropriate actions
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network')
  const isAuthError = error.message.includes('auth') || error.message.includes('unauthorized')
  const canRetry = retryCount < maxRetries

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            {isNetworkError ? (
              isOnline ? <Wifi className="h-6 w-6 text-red-600" /> : <WifiOff className="h-6 w-6 text-red-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {isNetworkError
              ? (isOnline ? 'Connection Error' : 'You\'re Offline')
              : 'Something went wrong'
            }
          </CardTitle>
          <CardDescription>
            {isNetworkError
              ? (isOnline
                  ? 'We encountered a network error. Please check your connection and try again.'
                  : 'You appear to be offline. Please check your internet connection.'
                )
              : 'We encountered an unexpected error. Our team has been notified.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error ID for support */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded font-mono text-center">
            Error ID: {errorId}
          </div>

          {/* Error message */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            {error.message}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {canRetry && onRetry && (
              <Button onClick={onRetry} variant="default" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again ({maxRetries - retryCount} attempts left)
              </Button>
            )}

            <div className="flex gap-2">
              <Button onClick={handleGoBack} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>

            <Button onClick={handleReload} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>

          {/* Additional help */}
          {!isNetworkError && (
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              If this problem persists, please contact support with the error ID above.
            </div>
          )}

          {/* Development error details */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                Error Details (Development Only)
              </summary>
              <div className="mt-2 space-y-2">
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Retry Count:</strong> {retryCount}/{maxRetries}
                </div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for functional components to catch errors
export function useErrorHandler() {
  const router = useRouter()

  return React.useCallback((error: Error, errorInfo?: { componentStack?: string }) => {
    console.error('Caught error:', error, errorInfo)

    // Handle specific error types
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      // Redirect to login for auth errors
      router.push('/auth/login?error=session_expired')
      return
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      // Network errors are handled by the error boundary
      return
    }

    // For other errors, you could show a toast notification
    // Example: toast.error('An unexpected error occurred')
  }, [router])
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{
    error: Error
    resetError: () => void
    errorId: string
    retryCount: number
  }>,
  options?: {
    maxRetries?: number
    onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void
  }
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary
      fallback={fallback}
      maxRetries={options?.maxRetries}
      onError={options?.onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Suspense boundary for async components
export function AsyncErrorBoundary({
  children,
  fallback
}: {
  children: React.ReactNode
  fallback?: React.ComponentType<any>
}) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ErrorBoundary fallback={fallback}>
        {children}
      </ErrorBoundary>
    </React.Suspense>
  )
}

export default ErrorBoundary