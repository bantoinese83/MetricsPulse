import { ApiResponse, MetricsResponse, Metric, Workspace } from './types'
import { handleApiError, createSuccessResponse, createErrorResponse, logError } from './errors'
import { isProduction } from './config'

// API Base Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''
const DEFAULT_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000')
const MAX_RETRIES = parseInt(process.env.API_RETRIES || '3')

// Network status tracking
let isOnline = true
let consecutiveFailures = 0
const MAX_CONSECUTIVE_FAILURES = 5

// Update network status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true
    consecutiveFailures = 0
  })

  window.addEventListener('offline', () => {
    isOnline = false
  })
}

// Enhanced fetch with timeout and retry logic
async function enhancedFetch(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      if (error.message.includes('fetch')) {
        isOnline = false
        consecutiveFailures++
        throw new Error('Network error - please check your connection')
      }
    }

    throw error
  }
}

// Retry logic with exponential backoff
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error

      // Don't retry certain types of errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          // Auth errors - don't retry
          throw error
        }
        if (error.message.includes('400') || error.message.includes('422')) {
          // Client errors - don't retry
          throw error
        }
        if (error.message.includes('429')) {
          // Rate limited - wait longer
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
          continue
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Generic API fetcher with comprehensive error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  customConfig: {
    timeout?: number
    retries?: number
    skipCache?: boolean
    priority?: 'low' | 'normal' | 'high'
  } = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    skipCache = false,
  } = customConfig

  // Check network status
  if (!isOnline && consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
    return createErrorResponse({
      message: 'You appear to be offline. Please check your connection and try again.',
      code: 'NETWORK_OFFLINE',
      statusCode: 0,
    })
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`

    // Add request ID for tracking
    const requestId = Math.random().toString(36).substring(7)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      ...(options.headers as Record<string, string>),
    }

    // Add cache control headers
    if (skipCache) {
      headers['Cache-Control'] = 'no-cache'
      headers['Pragma'] = 'no-cache'
    }

    const response = await retryRequest(async () => {
      return await enhancedFetch(url, {
        headers,
        ...options,
      }, timeout)
    }, retries)

    // Handle different response status codes
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      let errorCode = 'HTTP_ERROR'

      try {
        const errorData = await response.json()

        // Handle specific error types
        switch (response.status) {
          case 400:
            errorMessage = errorData.error || 'Bad request'
            errorCode = 'BAD_REQUEST'
            break
          case 401:
            errorMessage = 'Authentication required'
            errorCode = 'UNAUTHORIZED'
            break
          case 403:
            errorMessage = 'Access denied'
            errorCode = 'FORBIDDEN'
            break
          case 404:
            errorMessage = errorData.error || 'Resource not found'
            errorCode = 'NOT_FOUND'
            break
          case 422:
            errorMessage = errorData.error || 'Validation error'
            errorCode = 'VALIDATION_ERROR'
            break
          case 429:
            errorMessage = 'Too many requests. Please wait and try again.'
            errorCode = 'RATE_LIMITED'
            break
          case 500:
            errorMessage = 'Server error. Please try again later.'
            errorCode = 'SERVER_ERROR'
            break
          case 502:
          case 503:
          case 504:
            errorMessage = 'Service temporarily unavailable. Please try again later.'
            errorCode = 'SERVICE_UNAVAILABLE'
            break
          default:
            errorMessage = errorData.error || errorMessage
        }

        throw new Error(errorMessage)
      } catch (parseError) {
        // If we can't parse the error response, use status text
        throw new Error(response.statusText || errorMessage)
      }
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()

      // Handle API response format
      if (data && typeof data === 'object') {
        if (data.success === false) {
          throw new Error(data.error || 'Request failed')
        }

        // Handle paginated responses
        if (data.data !== undefined) {
          return createSuccessResponse(data.data, data.message)
        }
      }

      return createSuccessResponse(data)
    } else {
      // Handle non-JSON responses
      const text = await response.text()
      return createSuccessResponse(text as any)
    }

  } catch (error) {
    const appError = handleApiError(error)

    // Log error in production
    if (isProduction) {
      logError(appError, {
        endpoint,
        options,
        customConfig,
      })
    }

    return createErrorResponse(appError)
  }
}

// Metrics API
export const metricsApi = {
  async getMetrics(workspaceId?: string, days: number = 30): Promise<ApiResponse<Metric[]>> {
    const params = new URLSearchParams({
      days: days.toString(),
      ...(workspaceId && { workspace_id: workspaceId }),
    })

    return apiRequest<Metric[]>(`/api/metrics?${params}`)
  },

  async calculateMetrics(): Promise<ApiResponse<{ metrics: Metric[] }>> {
    return apiRequest('/api/metrics', {
      method: 'POST',
    })
  },

  async getMetricHistory(
    metricName: string,
    days: number = 30
  ): Promise<ApiResponse<Metric[]>> {
    const params = new URLSearchParams({
      metric: metricName,
      days: days.toString(),
    })

    return apiRequest<Metric[]>(`/api/metrics?${params}`)
  },
}

// Stripe API
export const stripeApi = {
  async getConnectionUrl(userId: string): Promise<ApiResponse<{ url: string }>> {
    return apiRequest(`/api/connections/stripe?user_id=${userId}`)
  },

  async saveConnection(data: {
    userId: string
    accessToken: string
    refreshToken?: string
    stripeUserId: string
  }): Promise<ApiResponse<{ success: boolean; workspaceId: string }>> {
    return apiRequest('/api/connections/stripe', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Workspace API
export const workspaceApi = {
  async getCurrentWorkspace(): Promise<ApiResponse<Workspace>> {
    return apiRequest('/api/workspace')
  },

  async createWorkspace(data: { name?: string }): Promise<ApiResponse<Workspace>> {
    return apiRequest('/api/workspace', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Auth API
export const authApi = {
  async getCurrentUser() {
    return apiRequest('/api/auth/user')
  },
}

// Utility functions
export function isApiError(response: ApiResponse): response is ApiResponse & { success: false } {
  return !response.success
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true } {
  return response.success
}

// Cache utilities for API responses
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear() {
    this.cache.clear()
  }

  delete(key: string) {
    this.cache.delete(key)
  }
}

export const apiCache = new ApiCache()

// Cached API request wrapper
export async function cachedApiRequest<T>(
  key: string,
  requestFn: () => Promise<ApiResponse<T>>,
  ttl: number = 5 * 60 * 1000
): Promise<ApiResponse<T>> {
  const cached = apiCache.get<ApiResponse<T>>(key)
  if (cached) {
    return cached
  }

  const response = await requestFn()
  if (response.success) {
    apiCache.set(key, response, ttl)
  }

  return response
}