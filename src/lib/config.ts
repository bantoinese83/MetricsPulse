import { AppConfig } from './types'

// Environment validation and configuration
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value || defaultValue || ''
}

function getOptionalEnvVar(key: string): string | undefined {
  return process.env[key]
}

// Validate required environment variables (skip during build)
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

const missingVars = requiredEnvVars.filter(key => !process.env[key])
const isBuild = process.env.npm_lifecycle_event === 'build'
if (missingVars.length > 0 && process.env.NODE_ENV === 'production' && !isBuild) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

// Application configuration
export const config: AppConfig = {
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder.supabase.co'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-key'),
    serviceKey: getOptionalEnvVar('SUPABASE_SERVICE_KEY'),
  },
  stripe: {
    publishableKey: getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_...'),
    secretKey: getEnvVar('STRIPE_SECRET_KEY', 'sk_test_...'),
    webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', 'whsec_...'),
    clientId: getEnvVar('STRIPE_CLIENT_ID', 'ca_test_...'),
  },
  google: getOptionalEnvVar('GOOGLE_CLIENT_ID') ? {
    clientId: getOptionalEnvVar('GOOGLE_CLIENT_ID')!,
    clientSecret: getOptionalEnvVar('GOOGLE_CLIENT_SECRET'),
  } : undefined,
}

// Environment helpers
export const isProduction = process.env.NODE_ENV === 'production'
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isTest = process.env.NODE_ENV === 'test'

// Feature flags
export const features = {
  enableAnalytics: getOptionalEnvVar('ENABLE_ANALYTICS') === 'true',
  enableErrorReporting: getOptionalEnvVar('ENABLE_ERROR_REPORTING') !== 'false',
  enableStripeConnect: !!config.stripe.clientId && config.stripe.clientId !== 'ca_test_...',
  enableGoogleAnalytics: !!config.google?.clientId,
}

// API configuration
export const apiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE || '',
  timeout: parseInt(getOptionalEnvVar('API_TIMEOUT') || '30000'),
  retries: parseInt(getOptionalEnvVar('API_RETRIES') || '3'),
}

// Database configuration
export const dbConfig = {
  url: getEnvVar('DATABASE_URL', ''),
  maxConnections: parseInt(getOptionalEnvVar('DB_MAX_CONNECTIONS') || '10'),
  ssl: isProduction,
}

// Logging configuration
export const logConfig = {
  level: getOptionalEnvVar('LOG_LEVEL') || (isProduction ? 'warn' : 'debug'),
  enableConsole: getOptionalEnvVar('ENABLE_CONSOLE_LOGGING') !== 'false',
  enableFile: getOptionalEnvVar('ENABLE_FILE_LOGGING') === 'true',
}

// Cache configuration
export const cacheConfig = {
  defaultTTL: parseInt(getOptionalEnvVar('CACHE_TTL') || '300000'), // 5 minutes
  maxSize: parseInt(getOptionalEnvVar('CACHE_MAX_SIZE') || '100'),
}

// Validation helpers
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Supabase validation
  if (!config.supabase.url || !config.supabase.url.includes('supabase.co')) {
    errors.push('Invalid Supabase URL')
  }

  if (!config.supabase.anonKey || config.supabase.anonKey === 'placeholder-key') {
    errors.push('Missing or invalid Supabase anonymous key')
  }

  // Stripe validation (only in production)
  if (isProduction) {
    if (config.stripe.publishableKey.includes('pk_test_')) {
      errors.push('Production environment should not use test Stripe keys')
    }

    if (!config.stripe.clientId || config.stripe.clientId === 'ca_test_...') {
      errors.push('Missing Stripe Connect client ID')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Configuration summary for debugging
export function getConfigSummary() {
  return {
    environment: process.env.NODE_ENV,
    features: Object.entries(features).filter(([, enabled]) => enabled),
    supabaseConfigured: config.supabase.url !== 'https://placeholder.supabase.co',
    stripeConfigured: config.stripe.clientId !== 'ca_test_...',
    googleConfigured: !!config.google?.clientId,
    databaseConfigured: !!config.supabase.serviceKey,
  }
}