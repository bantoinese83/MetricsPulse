import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createServerComponentClient()

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
        // Trigger metric recalculation
        await recalculateMetrics(supabase, event.data.object as any)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function recalculateMetrics(supabase: any, eventData: any) {
  try {
    // Find workspace with this Stripe account
    const stripeAccountId = eventData.customer // or however we link it

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