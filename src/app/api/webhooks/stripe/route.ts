import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { handleApiError, logError } from '@/lib/errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

// Webhook event processing limits
const MAX_PROCESSING_TIME = 30000 // 30 seconds
const MAX_RETRY_ATTEMPTS = 3
const WEBHOOK_IDEMPOTENCY_WINDOW = 24 * 60 * 60 * 1000 // 24 hours

// In-memory idempotency store (use Redis in production)
const processedEvents = new Map<string, number>()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let eventId = 'unknown'
  let eventType = 'unknown'

  try {
    // Validate request method
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405, headers: { 'Allow': 'POST' } }
      )
    }

    // Get and validate headers
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')
    const userAgent = headersList.get('user-agent')
    const contentType = headersList.get('content-type')

    // Basic security checks
    if (!userAgent || !userAgent.includes('Stripe/')) {
      console.warn('Suspicious webhook request: invalid user agent')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Suspicious webhook request: invalid content type')
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    if (!sig) {
      console.error('Webhook signature missing')
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    // Get raw body for signature verification
    let body: string
    try {
      body = await request.text()
    } catch (error) {
      console.error('Failed to read request body:', error)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Verify body size (prevent DoS)
    if (body.length > 1024 * 1024) { // 1MB limit
      console.warn('Webhook body too large:', body.length)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

      // Store event details for logging
      eventId = event.id
      eventType = event.type

      // Check for duplicate events (idempotency)
      const lastProcessed = processedEvents.get(eventId)
      if (lastProcessed && (Date.now() - lastProcessed) < WEBHOOK_IDEMPOTENCY_WINDOW) {
        console.log(`Duplicate webhook event ignored: ${eventId}`)
        return NextResponse.json({ received: true, status: 'duplicate' })
      }

      processedEvents.set(eventId, Date.now())

      // Clean up old entries periodically
      if (processedEvents.size > 1000) {
        const cutoff = Date.now() - WEBHOOK_IDEMPOTENCY_WINDOW
        for (const [id, timestamp] of processedEvents.entries()) {
          if (timestamp < cutoff) {
            processedEvents.delete(id)
          }
        }
      }

    } catch (err: unknown) {
      console.error('Webhook signature verification failed:', {
        error: err instanceof Error ? err.message : String(err),
        eventId: eventId,
        signature: sig.substring(0, 50) + '...',
      })

      // Log security event
      logError({
        message: 'Invalid webhook signature',
        code: 'WEBHOOK_SIGNATURE_INVALID',
        statusCode: 400,
        details: { eventId, signatureLength: sig.length }
      })

      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Validate event structure
    if (!event.data || !event.data.object) {
      console.error('Invalid webhook event structure:', eventId)
      return NextResponse.json({ error: 'Invalid event structure' }, { status: 400 })
    }

    // Check processing timeout
    if (Date.now() - startTime > MAX_PROCESSING_TIME) {
      console.warn(`Webhook processing timeout: ${eventId}`)
      return NextResponse.json({ error: 'Processing timeout' }, { status: 408 })
    }

    const supabase = await createServerComponentClient()

    // Process event with retry logic
    let retryCount = 0
    while (retryCount < MAX_RETRY_ATTEMPTS) {
      try {
        await processWebhookEvent(supabase, event)

        // Log successful processing
        console.log(`Webhook processed successfully: ${eventId} (${eventType})`)

        return NextResponse.json({
          received: true,
          eventId,
          eventType,
          processingTime: Date.now() - startTime
        })
      } catch (error) {
        retryCount++
        console.error(`Webhook processing failed (attempt ${retryCount}):`, error)

        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          // Log final failure
          logError(handleApiError(error), {
            eventId,
            eventType,
            retryCount,
            processingTime: Date.now() - startTime,
          })

          // Return success to Stripe to avoid retries, but log the error
          return NextResponse.json({
            received: true,
            eventId,
            status: 'processing_failed',
            error: 'Failed to process event after retries'
          })
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)))
      }
    }

  } catch (error) {
    const processingTime = Date.now() - startTime

    console.error('Unexpected webhook error:', {
      eventId,
      eventType,
      processingTime,
      error,
    })

    logError(handleApiError(error), {
      eventId,
      eventType,
      processingTime,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processWebhookEvent(supabase: Awaited<ReturnType<typeof createServerComponentClient>>, event: Stripe.Event) {
  const eventData = event.data.object as any

  // Validate event data structure
  if (!eventData || typeof eventData !== 'object') {
    throw new Error('Invalid event data structure')
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      await handleSubscriptionEvent(supabase, eventData)
      break

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
    case 'invoice.finalized':
      await handleInvoiceEvent(supabase, event.data.object as Stripe.Invoice, event.type)
      break

    case 'customer.created':
    case 'customer.updated':
    case 'customer.deleted':
      await handleCustomerEvent(supabase, event.data.object as Stripe.Customer, event.type)
      break

    case 'price.created':
    case 'price.updated':
    case 'price.deleted':
      await handlePriceEvent(supabase, event.data.object as Stripe.Price, event.type)
      break

    default:
      // Log unhandled events for monitoring
      console.log(`Unhandled webhook event type: ${event.type}`, {
        eventId: event.id,
        objectId: eventData.id,
      })
  }

  // Always recalculate metrics after subscription/invoice events
  if (event.type.includes('subscription') || event.type.includes('invoice')) {
    await recalculateMetrics(supabase, eventData)
  }
}

async function handleSubscriptionEvent(supabase: Awaited<ReturnType<typeof createServerComponentClient>>, subscription: Stripe.Subscription) {
  try {
    // Validate subscription data
    if (!subscription.id || !subscription.customer) {
      throw new Error('Invalid subscription data')
    }

    // Find workspace by Stripe customer ID
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('workspace_id')
      .eq('provider', 'stripe')
      .eq('metadata->>stripe_user_id', subscription.customer)
      .single()

    if (connectionError || !connection) {
      console.warn(`No workspace found for Stripe customer: ${subscription.customer}`)
      return
    }

    // Update subscription data in database
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: subscription.customer, // This should be mapped properly
        stripe_subscription_id: subscription.id,
        status: mapStripeStatus(subscription.status),
        current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
      })

    if (upsertError) {
      throw upsertError
    }

  } catch (error) {
    console.error('Error handling subscription event:', error)
    throw error
  }
}

async function handleInvoiceEvent(supabase: Awaited<ReturnType<typeof createServerComponentClient>>, invoice: Stripe.Invoice, eventType: string) {
  try {
    // Validate invoice data
    if (!invoice.id || !invoice.customer) {
      throw new Error('Invalid invoice data')
    }

    // Log invoice events for monitoring
    console.log(`Invoice event: ${eventType}`, {
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      status: invoice.status,
    })

  } catch (error) {
    console.error('Error handling invoice event:', error)
    throw error
  }
}

async function handleCustomerEvent(supabase: Awaited<ReturnType<typeof createServerComponentClient>>, customer: Stripe.Customer, eventType: string) {
  try {
    // Validate customer data
    if (!customer.id) {
      throw new Error('Invalid customer data')
    }

    console.log(`Customer event: ${eventType}`, {
      customerId: customer.id,
      email: customer.email,
    })

  } catch (error) {
    console.error('Error handling customer event:', error)
    throw error
  }
}

async function handlePriceEvent(supabase: Awaited<ReturnType<typeof createServerComponentClient>>, price: Stripe.Price, eventType: string) {
  try {
    // Validate price data
    if (!price.id) {
      throw new Error('Invalid price data')
    }

    console.log(`Price event: ${eventType}`, {
      priceId: price.id,
      amount: price.unit_amount,
      currency: price.currency,
    })

  } catch (error) {
    console.error('Error handling price event:', error)
    throw error
  }
}


function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'canceled': 'cancelled',
    'incomplete': 'incomplete',
    'incomplete_expired': 'incomplete_expired',
    'past_due': 'past_due',
    'trialing': 'trialing',
    'unpaid': 'unpaid',
  }

  return statusMap[stripeStatus] || 'unknown'
}

async function recalculateMetrics(supabase: Awaited<ReturnType<typeof createServerComponentClient>>, eventData: Record<string, unknown>) {
  try {
    // Find workspace with this Stripe account
    // For now, we'll need to implement logic to find the workspace
    // based on the Stripe customer/account ID

    // This is a placeholder - we'll implement the actual logic
    console.log('Recalculating metrics for event:', eventData.id)

    // TODO: Implement actual metric calculation
    // - Fetch subscription data from Stripe
    // - Calculate MRR, churn rate, etc.
    // - Store in metrics table

  } catch (error) {
    console.error('Error recalculating metrics:', error)
  }
}