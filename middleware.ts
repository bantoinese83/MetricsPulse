import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // requests per window

// Bot detection patterns
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /headless/i,
  /selenium/i,
  /puppeteer/i,
]

// Suspicious request patterns
const SUSPICIOUS_PATTERNS = [
  /\.\./, // directory traversal
  /<script/i, // potential XSS
  /union.*select/i, // SQL injection
  /eval\(/i, // code injection
  /javascript:/i, // javascript protocol
]

function isRateLimited(identifier: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  record.count++
  return false
}

function isBot(userAgent: string): boolean {
  if (!userAgent) return false
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent))
}

function isSuspiciousRequest(request: NextRequest): boolean {
  const url = request.url
  const userAgent = request.headers.get('user-agent') || ''

  // Check for suspicious patterns in URL
  if (SUSPICIOUS_PATTERNS.some(pattern => pattern.test(url))) {
    return true
  }

  // Check for unusual user agents
  if (isBot(userAgent)) {
    return false // Bots are allowed, just not rate limited as strictly
  }

  // Check for too many query parameters (potential DoS)
  const urlObj = new URL(url)
  if (urlObj.searchParams.toString().length > 2000) {
    return true
  }

  return false
}

function getClientIdentifier(request: NextRequest): string {
  // Use forwarded IP for rate limiting (in production, use a more sophisticated method)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

  // Add user agent to make it more unique
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return `${ip}:${userAgent.slice(0, 50)}`
}

function addSecurityHeaders(response: NextResponse) {
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Content Security Policy (customize as needed)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const clientId = getClientIdentifier(request)

  // Skip middleware for static files and API routes (handled separately)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // Rate limiting
  if (isRateLimited(clientId)) {
    const response = new NextResponse(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(RATE_LIMIT_WINDOW / 1000).toString(),
        },
      }
    )
    return addSecurityHeaders(response)
  }

  // Security checks
  if (isSuspiciousRequest(request)) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Bad request' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
    return addSecurityHeaders(response)
  }

  // Create response with security headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabase auth setup
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // Refresh session if expired - required for Server Components
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.warn('Auth session refresh error:', error.message)
    }

    // Protect dashboard routes
    if (pathname.startsWith('/dashboard')) {
      if (!user) {
        // Clear any potentially invalid cookies
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')

        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    // Redirect authenticated users away from auth pages
    if (pathname.startsWith('/auth') &&
        pathname !== '/auth/login' &&
        pathname !== '/auth/signup' &&
        pathname !== '/auth/callback') {
      if (user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Handle auth callback
    if (pathname === '/auth/callback') {
      // Allow callback processing
      return addSecurityHeaders(response)
    }

  } catch (error) {
    console.error('Middleware error:', error)

    // On middleware errors, redirect to login for protected routes
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/login?error=auth_error', request.url))
    }
  }

  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (handled separately for rate limiting)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}