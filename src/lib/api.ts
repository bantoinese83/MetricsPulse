import { ApiResponse, MetricsResponse, Metric, Workspace } from './types'
import { handleApiError, createSuccessResponse, createErrorResponse } from './errors'

// API Base Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

// Generic API fetcher with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return createSuccessResponse(data)
  } catch (error) {
    const appError = handleApiError(error)
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