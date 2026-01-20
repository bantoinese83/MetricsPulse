// Core application types for MetricsPulse

// Database Types (matching Prisma schema)
export interface User {
  id: string
  email: string
  createdAt: Date
}

export interface Workspace {
  id: string
  userId: string
  name: string | null
  createdAt: Date
  user: User
  connections: Connection[]
  metrics: Metric[]
  thresholds: AlertThreshold[]
}

export interface Connection {
  id: string
  workspaceId: string
  provider: 'stripe' | 'google_analytics' | 'manual'
  accessToken: string | null
  refreshToken: string | null
  connectedAt: Date | null
  expiresAt: Date | null
  metadata: Record<string, any> | null
  workspace: Workspace
}

export interface Metric {
  id: string
  workspaceId: string
  metricName: MetricName
  value: number | null
  recordedAt: Date
  workspace: Workspace
}

export interface AlertThreshold {
  id: string
  workspaceId: string
  metricName: MetricName
  minValue: number | null
  maxValue: number | null
  alertChannel: 'email' | 'slack'
  createdAt: Date
  workspace: Workspace
}

export interface Subscription {
  id: string
  userId: string
  stripeSubscriptionId: string | null
  plan: PlanType
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  createdAt: Date
  user: User
}

// Enums and Constants
export type MetricName =
  | 'mrr'
  | 'churn_rate'
  | 'cac'
  | 'ltv'
  | 'conversion_rate'
  | 'net_revenue_retention'
  | 'active_customers'

export type PlanType = 'free' | 'pro' | 'enterprise'

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'

export type MetricStatus = 'healthy' | 'warning' | 'danger' | 'neutral'

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface MetricsResponse {
  metrics: Metric[]
}

export interface StripeConnectionResponse {
  url: string
}

export interface StripeCallbackResponse {
  success: boolean
  workspaceId: string
}

// UI Component Props
export interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  status?: MetricStatus
  format?: 'currency' | 'percentage' | 'number'
}

export interface MetricsChartProps {
  data: Array<{
    date: string
    [key: string]: number | string
  }>
  metric: MetricName
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
}

export interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
}

// Error Types
export interface AppError {
  code: string
  message: string
  statusCode?: number
  details?: Record<string, any>
}

// Environment Configuration
export interface AppConfig {
  supabase: {
    url: string
    anonKey: string
    serviceKey?: string
  }
  stripe: {
    publishableKey: string
    secretKey: string
    webhookSecret: string
    clientId: string
  }
  google?: {
    clientId: string
    clientSecret?: string
  }
}

// Utility Types
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Keys>> }[Keys]

// Loading States
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

// Pagination Types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Webhook Types
export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
  created: number
}

// Cache Types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Maximum cache size
}