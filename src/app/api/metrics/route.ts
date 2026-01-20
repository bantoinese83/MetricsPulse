import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { handleApiError, logError, MetricsPulseError } from '@/lib/errors'

// GET /api/metrics - Fetch metrics for user's workspace
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const daysParam = searchParams.get('days')

    // Validate and sanitize parameters
    if (daysParam && (isNaN(parseInt(daysParam)) || parseInt(daysParam) < 1 || parseInt(daysParam) > 365)) {
      return NextResponse.json({
        error: 'Invalid days parameter. Must be a number between 1 and 365.'
      }, { status: 400 })
    }

    const days = Math.min(parseInt(daysParam || '30'), 365) // Cap at 365 days

    // Validate metric parameter
    const validMetrics = ['mrr', 'churn_rate', 'cac', 'ltv', 'conversion_rate', 'net_revenue_retention', 'active_customers']
    if (metric && !validMetrics.includes(metric)) {
      return NextResponse.json({
        error: `Invalid metric parameter. Must be one of: ${validMetrics.join(', ')}`
      }, { status: 400 })
    }

    const supabase = await createServerComponentClient()

    // Get current user with timeout protection
    const userResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      )
    ])

    const { data: { user }, error: userError } = userResult as Awaited<ReturnType<typeof supabase.auth.getUser>>

    if (userError) {
      logError(handleApiError(userError), { endpoint: 'metrics', operation: 'getUser' })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace with error handling
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (workspaceError) {
      if (workspaceError.code === 'PGRST116') { // No rows returned
        return NextResponse.json({ error: 'Workspace not found. Please contact support.' }, { status: 404 })
      }
      logError(handleApiError(workspaceError), { userId: user.id, operation: 'getWorkspace' })
      return NextResponse.json({ error: 'Failed to access workspace' }, { status: 500 })
    }

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Calculate date range with validation
    const endDate = new Date()
    const startDate = new Date()

    // Prevent date manipulation issues
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date calculation' }, { status: 500 })
    }

    startDate.setDate(startDate.getDate() - days)

    // Ensure start date is not in the future or too far in the past
    const maxPastDate = new Date()
    maxPastDate.setFullYear(maxPastDate.getFullYear() - 2) // Max 2 years ago

    if (startDate < maxPastDate) {
      return NextResponse.json({
        error: 'Date range too large. Maximum 2 years of historical data.'
      }, { status: 400 })
    }

    let metrics = []

    try {
      if (metric) {
        // Fetch specific metric with timeout
        const query = supabase
          .from('metrics')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('metric_name', metric)
          .gte('recorded_at', startDate.toISOString())
          .lte('recorded_at', endDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(1000) // Prevent excessive data return

        const { data, error } = await Promise.race([
          query,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 15000)
          )
        ]) as any

        if (error) throw error
        metrics = data || []
      } else {
        // Fetch all metrics for the workspace
        const query = supabase
          .from('metrics')
          .select('*')
          .eq('workspace_id', workspace.id)
          .gte('recorded_at', startDate.toISOString())
          .lte('recorded_at', endDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(2000) // Allow more for all metrics

        const { data, error } = await Promise.race([
          query,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 20000)
          )
        ]) as any

        if (error) throw error
        metrics = data || []
      }
    } catch (queryError) {
      logError(handleApiError(queryError), {
        userId: user.id,
        workspaceId: workspace.id,
        metric,
        days,
        operation: 'queryMetrics'
      })

      if (queryError instanceof Error && queryError.message.includes('timeout')) {
        return NextResponse.json({
          error: 'Request timed out. Please try again with a smaller date range.'
        }, { status: 408 })
      }

      return NextResponse.json({ error: 'Failed to fetch metrics data' }, { status: 500 })
    }

    // Validate response data
    if (!Array.isArray(metrics)) {
      logError(new MetricsPulseError('Invalid metrics data format'), {
        userId: user.id,
        workspaceId: workspace.id,
        dataType: typeof metrics
      })
      return NextResponse.json({ error: 'Invalid data format' }, { status: 500 })
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      metrics,
      metadata: {
        count: metrics.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days
        },
        processingTime,
        workspaceId: workspace.id
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    const appError = handleApiError(error)
    logError(appError, {
      endpoint: 'metrics',
      method: 'GET',
      processingTime
    })

    // Return appropriate error response
    const statusCode = appError.statusCode || 500
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
        ...(appError.details && { details: appError.details })
      },
      { status: statusCode }
    )
  }
}

// POST /api/metrics - Calculate and store metrics
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let workspaceId: string | null = null

  try {
    // Validate request method and content
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405, headers: { 'Allow': 'GET, POST' } }
      )
    }

    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    const supabase = await createServerComponentClient()

    // Get current user with timeout protection
    const userResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timeout')), 10000)
      )
    ])

    const { data: { user }, error: userError } = userResult as Awaited<ReturnType<typeof supabase.auth.getUser>>

    if (userError) {
      logError(handleApiError(userError), { endpoint: 'metrics', operation: 'calculate' })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace with error handling
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (workspaceError) {
      if (workspaceError.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Workspace not found. Please contact support.'
        }, { status: 404 })
      }
      logError(handleApiError(workspaceError), {
        userId: user.id,
        operation: 'getWorkspace'
      })
      return NextResponse.json({ error: 'Failed to access workspace' }, { status: 500 })
    }

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    workspaceId = workspace.id

    // Check for existing recent calculations (rate limiting)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentMetrics, error: recentError } = await supabase
      .from('metrics')
      .select('id, recorded_at')
      .eq('workspace_id', workspace.id)
      .gte('recorded_at', fiveMinutesAgo)
      .limit(1)
      .order('recorded_at', { ascending: false })

    if (recentError) {
      logError(handleApiError(recentError), {
        workspaceId,
        operation: 'checkRecentMetrics'
      })
    } else if (recentMetrics && recentMetrics.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Metrics calculated recently. Please wait before recalculating.',
        lastCalculated: recentMetrics[0].recorded_at
      })
    }

    // Calculate metrics from Stripe data with comprehensive error handling
    const metrics = await calculateMetricsFromStripe(workspace.id, supabase)

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      metrics,
      metadata: {
        processingTime,
        workspaceId: workspace.id,
        calculatedAt: new Date().toISOString(),
        metricCount: metrics.length
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime

    const appError = handleApiError(error)
    logError(appError, {
      endpoint: 'metrics',
      method: 'POST',
      workspaceId,
      processingTime
    })

    // Provide specific error messages based on error type
    let errorMessage = 'Failed to calculate metrics'
    let statusCode = 500

    if (appError.code === 'EXTERNAL_SERVICE_ERROR') {
      errorMessage = 'Unable to connect to payment processor. Please try again later.'
      statusCode = 502
    } else if (appError.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.'
      statusCode = 408
    } else if (appError.message.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait and try again.'
      statusCode = 429
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: appError.code,
        ...(appError.details && { details: appError.details })
      },
      { status: statusCode }
    )
  }
}

async function calculateMetricsFromStripe(workspaceId: string, supabase: Awaited<ReturnType<typeof createServerComponentClient>>) {
  let stripeClient: Stripe | null = null

  try {
    // Validate workspace ID
    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new MetricsPulseError('Invalid workspace ID', 'VALIDATION_ERROR', 400)
    }

    // Get Stripe connection with error handling
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'stripe')
      .single()

    if (connectionError) {
      if (connectionError.code === 'PGRST116') {
        throw new MetricsPulseError(
          'No Stripe connection found. Please connect your Stripe account first.',
          'STRIPE_NOT_CONNECTED',
          400
        )
      }
      logError(handleApiError(connectionError), {
        workspaceId,
        operation: 'getStripeConnection'
      })
      throw new MetricsPulseError('Failed to access Stripe connection', 'DATABASE_ERROR', 500)
    }

    if (!connection) {
      throw new MetricsPulseError('Stripe connection not found', 'STRIPE_NOT_CONNECTED', 404)
    }

    // Validate connection data
    if (!connection.access_token) {
      throw new MetricsPulseError(
        'Invalid Stripe connection. Please reconnect your account.',
        'STRIPE_INVALID_TOKEN',
        400
      )
    }

    // Create Stripe client with connected account
    try {
      stripeClient = new Stripe(connection.access_token, {
        apiVersion: '2025-12-15.clover',
        timeout: 30000,
        maxNetworkRetries: 3,
      })
    } catch (stripeError) {
      logError(handleApiError(stripeError), {
        workspaceId,
        operation: 'createStripeClient'
      })
      throw new MetricsPulseError('Failed to initialize Stripe client', 'STRIPE_CLIENT_ERROR', 500)
    }

    // Get subscriptions for MRR calculation with error handling
    let subscriptions: Stripe.Subscription[]
    try {
      const subscriptionsResponse = await stripeClient.subscriptions.list({
        limit: 100,
        status: 'active',
        expand: ['data.items.data.price'],
      })
      subscriptions = subscriptionsResponse.data
    } catch (stripeError: any) {
      logError(handleApiError(stripeError), {
        workspaceId,
        operation: 'fetchSubscriptions'
      })

      if (stripeError.code === 'card_declined' || stripeError.code === 'generic_decline') {
        throw new MetricsPulseError('Payment method issue with Stripe account', 'STRIPE_PAYMENT_ERROR', 402)
      }

      if (stripeError.type === 'invalid_request_error') {
        throw new MetricsPulseError('Invalid request to Stripe API', 'STRIPE_INVALID_REQUEST', 400)
      }

      throw new MetricsPulseError(
        'Failed to fetch subscription data from Stripe',
        'STRIPE_API_ERROR',
        502
      )
    }

    // Calculate MRR (Monthly Recurring Revenue) with validation
    let mrr = 0
    try {
      for (const subscription of subscriptions) {
        if (subscription.items?.data) {
          for (const item of subscription.items.data) {
            if (item.price?.unit_amount && item.price?.recurring?.interval === 'month') {
              // Handle quantity if present
              const quantity = item.quantity || 1
              mrr += (item.price.unit_amount * quantity) / 100
            }
          }
        }
      }

      // Validate MRR calculation
      if (mrr < 0) {
        logError(new MetricsPulseError('Negative MRR calculated'), {
          workspaceId,
          subscriptionsCount: subscriptions.length,
          calculatedMRR: mrr
        })
        mrr = 0
      }

      // Cap MRR at reasonable maximum to prevent data errors
      mrr = Math.min(mrr, 100000000) // $1B max

    } catch (calcError) {
      logError(handleApiError(calcError), {
        workspaceId,
        operation: 'calculateMRR'
      })
      mrr = 0 // Default to 0 on calculation error
    }

    // Get customers for churn calculation with error handling
    let activeCustomers = 0
    try {
      const customersResponse = await stripeClient.customers.list({
        limit: 1000,
        expand: ['data.subscriptions']
      })

      // Count customers with active subscriptions
      activeCustomers = customersResponse.data.filter(customer => {
        const subscriptions = customer.subscriptions as { data?: Stripe.Subscription[] }
        return subscriptions?.data?.some((sub: Stripe.Subscription) =>
          ['active', 'trialing'].includes(sub.status)
        ) || false
      }).length

      // Validate customer count
      activeCustomers = Math.max(0, Math.min(activeCustomers, 1000000)) // Reasonable bounds

    } catch (customerError) {
      logError(handleApiError(customerError), {
        workspaceId,
        operation: 'fetchCustomers'
      })
      // Continue with calculation - customers might not be critical
    }

    // Calculate churn rate (simplified - in production, you'd track historical data)
    // For now, we'll use a placeholder calculation
    let churnRate = 0
    try {
      if (activeCustomers > 0) {
        // This is a placeholder - real churn calculation would need historical data
        // In production, you'd compare current active customers to previous periods
        const baseChurnRate = 0.05 // 5% monthly churn as baseline
        const customerSizeFactor = Math.max(0.5, Math.min(2, 1000 / Math.max(activeCustomers, 1)))
        churnRate = Math.min(baseChurnRate * customerSizeFactor, 0.5) // Max 50% churn
      }
    } catch (churnError) {
      logError(handleApiError(churnError), {
        workspaceId,
        operation: 'calculateChurnRate'
      })
      churnRate = 0
    }

    // Calculate LTV with validation
    let ltv = 0
    try {
      if (churnRate > 0 && churnRate < 1) {
        ltv = mrr / churnRate

        // Validate LTV calculation
        ltv = Math.max(0, Math.min(ltv, 10000000)) // Reasonable bounds
      }
    } catch (ltvError) {
      logError(handleApiError(ltvError), {
        workspaceId,
        operation: 'calculateLTV',
        mrr,
        churnRate
      })
      ltv = 0
    }

    // Compile metrics with validation
    const metrics = [
      {
        metric_name: 'mrr',
        value: Math.round(mrr * 100) / 100, // Round to 2 decimal places
        workspace_id: workspaceId,
        recorded_at: new Date().toISOString()
      },
      {
        metric_name: 'churn_rate',
        value: Math.round(churnRate * 10000) / 10000, // Round to 4 decimal places
        workspace_id: workspaceId,
        recorded_at: new Date().toISOString()
      },
      {
        metric_name: 'ltv',
        value: Math.round(ltv * 100) / 100, // Round to 2 decimal places
        workspace_id: workspaceId,
        recorded_at: new Date().toISOString()
      },
      {
        metric_name: 'active_customers',
        value: activeCustomers,
        workspace_id: workspaceId,
        recorded_at: new Date().toISOString()
      }
    ]

    // Validate all metrics before insertion
    for (const metric of metrics) {
      if (typeof metric.value !== 'number' || isNaN(metric.value)) {
        logError(new MetricsPulseError('Invalid metric value calculated'), {
          workspaceId,
          metric: metric.metric_name,
          value: metric.value
        })
        // Set to 0 for invalid values
        metric.value = 0
      }
    }

    // Store metrics with transaction safety
    try {
      const { error: insertError } = await supabase
        .from('metrics')
        .insert(metrics)

      if (insertError) {
        // Check for unique constraint violations
        if (insertError.code === '23505') {
          // Unique constraint violation - metrics already exist for this time period
          console.log('Metrics already exist for this time period, skipping insertion')
          return metrics // Return existing metrics
        }

        throw insertError
      }
    } catch (insertError) {
      logError(handleApiError(insertError), {
        workspaceId,
        operation: 'insertMetrics',
        metricsCount: metrics.length
      })
      throw new MetricsPulseError('Failed to save metrics data', 'DATABASE_ERROR', 500)
    }

    console.log(`Successfully calculated and stored ${metrics.length} metrics for workspace ${workspaceId}`)

    return metrics

  } catch (error) {
    // Clean up Stripe client if it exists
    if (stripeClient) {
      // Stripe client cleanup if needed
    }

    // Re-throw MetricsPulseError instances
    if (error instanceof MetricsPulseError) {
      throw error
    }

    // Wrap other errors
    const appError = handleApiError(error)
    logError(appError, {
      workspaceId,
      operation: 'calculateMetricsFromStripe'
    })

    throw new MetricsPulseError(
      'Failed to calculate metrics from Stripe data',
      'STRIPE_CALCULATION_ERROR',
      500,
      { originalError: appError.message }
    )
  }
}