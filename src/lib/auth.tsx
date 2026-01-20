'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { handleApiError, logError } from './errors'

type AuthState = {
  user: User | null
  loading: boolean
  initialized: boolean
  error: string | null
}

type AuthContextType = AuthState & {
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  refreshSession: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
    error: null,
  })

  // Helper function to update state safely
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Retry helper for network operations
  const retryOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    maxAttempts = MAX_RETRY_ATTEMPTS
  ): Promise<T> => {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Don't retry for authentication errors (wrong credentials, etc.)
        if (error instanceof AuthError) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === maxAttempts) {
          break
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt - 1)))
      }
    }

    throw lastError!
  }, [])

  // Get initial session with retry logic
  const getInitialSession = useCallback(async () => {
    try {
      const result = await retryOperation(async () => {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        return data
      })

      updateState({
        user: result.session?.user ?? null,
        loading: false,
        initialized: true,
        error: null,
      })
    } catch (error) {
      const appError = handleApiError(error)
      logError(appError, { context: 'getInitialSession' })

      updateState({
        user: null,
        loading: false,
        initialized: true,
        error: 'Failed to initialize authentication. Please refresh the page.',
      })
    }
  }, [retryOperation, updateState])

  // Handle auth state changes
  useEffect(() => {
    let mounted = true

    // Get initial session
    getInitialSession()

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        try {
          // Handle specific auth events
          switch (event) {
            case 'SIGNED_IN':
              updateState({
                user: session?.user ?? null,
                loading: false,
                error: null,
              })
              break

            case 'SIGNED_OUT':
              updateState({
                user: null,
                loading: false,
                error: null,
              })
              break

            case 'TOKEN_REFRESHED':
              updateState({
                user: session?.user ?? null,
                error: null,
              })
              break

            case 'USER_UPDATED':
              updateState({
                user: session?.user ?? null,
                error: null,
              })
              break

            default:
              updateState({
                user: session?.user ?? null,
                loading: false,
                error: null,
              })
          }
        } catch (error) {
          const appError = handleApiError(error)
          logError(appError, { context: 'authStateChange', event })

          updateState({
            error: 'Authentication state changed unexpectedly. Please refresh the page.',
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [getInitialSession, updateState])

  // Sign up with comprehensive error handling
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      updateState({ loading: true, error: null })

      const result = await retryOperation(async () => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error
        return data
      })

      // Handle different signup scenarios
      if (result.user && !result.user.email_confirmed_at) {
        return {
          success: true,
          message: 'Please check your email to confirm your account.',
        }
      }

      return { success: true }
    } catch (error) {
      const appError = handleApiError(error)
      logError(appError, { context: 'signUp', email })

      let errorMessage = 'Failed to create account. Please try again.'

      // Handle specific error cases
      if (appError.code === 'user_already_registered') {
        errorMessage = 'An account with this email already exists. Try signing in instead.'
      } else if (appError.code === 'invalid_email') {
        errorMessage = 'Please enter a valid email address.'
      } else if (appError.code === 'weak_password') {
        errorMessage = 'Password must be at least 6 characters long.'
      } else if (appError.message.includes('rate limit')) {
        errorMessage = 'Too many attempts. Please wait a few minutes and try again.'
      }

      updateState({ error: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      updateState({ loading: false })
    }
  }, [retryOperation, updateState])

  // Sign in with comprehensive error handling
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      updateState({ loading: true, error: null })

      await retryOperation(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        })

        if (error) throw error
        return data
      })

      return { success: true }
    } catch (error) {
      const appError = handleApiError(error)
      logError(appError, { context: 'signIn', email })

      let errorMessage = 'Failed to sign in. Please check your credentials and try again.'

      // Handle specific error cases
      if (appError.code === 'invalid_credentials') {
        errorMessage = 'Invalid email or password.'
      } else if (appError.code === 'email_not_confirmed') {
        errorMessage = 'Please confirm your email address before signing in.'
      } else if (appError.code === 'too_many_requests') {
        errorMessage = 'Too many sign-in attempts. Please wait and try again.'
      } else if (appError.message.includes('network') || appError.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      }

      updateState({ error: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      updateState({ loading: false })
    }
  }, [retryOperation, updateState])

  // Sign out with error handling
  const signOut = useCallback(async () => {
    try {
      updateState({ loading: true, error: null })

      await retryOperation(async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      })

      return { success: true }
    } catch (error) {
      const appError = handleApiError(error)
      logError(appError, { context: 'signOut' })

      // Even if sign out fails on the server, clear local state
      updateState({
        user: null,
        error: 'Signed out locally. Some data may still be cached.',
      })

      return { success: true } // Consider it successful since we cleared local state
    } finally {
      updateState({ loading: false })
    }
  }, [retryOperation, updateState])

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error

      updateState({
        user: data.session?.user ?? null,
        error: null,
      })
    } catch (error) {
      const appError = handleApiError(error)
      logError(appError, { context: 'refreshSession' })

      // If refresh fails, sign out user
      updateState({
        user: null,
        error: 'Session expired. Please sign in again.',
      })
    }
  }, [updateState])

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      // If we were offline and just came back online, try to refresh session
      if (state.user) {
        refreshSession()
      }
    }

    const handleOffline = () => {
      updateState({
        error: 'You appear to be offline. Some features may not work properly.',
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [state.user, refreshSession, updateState])

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!state.user) return

    const refreshInterval = setInterval(() => {
      refreshSession()
    }, 50 * 60 * 1000) // Refresh every 50 minutes

    return () => clearInterval(refreshInterval)
  }, [state.user, refreshSession])

  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    refreshSession,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}