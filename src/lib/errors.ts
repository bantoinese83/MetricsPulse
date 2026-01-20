import { AppError } from './types'

// Custom error classes for better error handling
export class MetricsPulseError extends Error implements AppError {
  code: string
  statusCode: number
  details?: Record<string, any>

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = 'MetricsPulseError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class AuthenticationError extends MetricsPulseError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
  }
}

export class AuthorizationError extends MetricsPulseError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403)
  }
}

export class ValidationError extends MetricsPulseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class NotFoundError extends MetricsPulseError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class ExternalServiceError extends MetricsPulseError {
  constructor(service: string, message: string) {
    super(`External service error: ${service} - ${message}`, 'EXTERNAL_SERVICE_ERROR', 502)
  }
}

// Error handling utilities
export function handleApiError(error: unknown): AppError {
  if (error instanceof MetricsPulseError) {
    return error
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('JWT')) {
      return new AuthenticationError()
    }

    if (error.message.includes('permission denied')) {
      return new AuthorizationError()
    }

    if (error.message.includes('violates check constraint')) {
      return new ValidationError('Invalid data provided')
    }

    // Generic error
    return new MetricsPulseError(error.message, 'INTERNAL_ERROR', 500)
  }

  return new MetricsPulseError('An unexpected error occurred', 'INTERNAL_ERROR', 500)
}

export function logError(error: AppError, context?: Record<string, any>) {
  const logData = {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    context,
    timestamp: new Date().toISOString(),
  }

  console.error('[MetricsPulse Error]', logData)

  // In production, you might want to send this to a logging service
  // like Sentry, LogRocket, or similar
}

export function createErrorResponse(error: AppError) {
  return {
    success: false,
    error: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
  }
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

// API response helpers
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
  }
}

export function createApiErrorResponse(error: string | AppError, code?: string) {
  if (typeof error === 'string') {
    return {
      success: false,
      error,
      code: code || 'INTERNAL_ERROR',
    }
  }

  return {
    success: false,
    error: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
  }
}