import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

// GET /api/metrics - Fetch metrics for user's workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const days = parseInt(searchParams.get('days') || '30')

    const supabase = await createServerComponentClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let metrics = []

    if (metric) {
      // Fetch specific metric
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('metric_name', metric)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true })

      if (error) throw error
      metrics = data
    } else {
      // Fetch all metrics
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('workspace_id', workspace.id)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true })

      if (error) throw error
      metrics = data
    }

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

// POST /api/metrics - Calculate and store metrics
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Calculate metrics from Stripe data
    const metrics = await calculateMetricsFromStripe(workspace.id, supabase)

    return NextResponse.json({ success: true, metrics })
  } catch (error) {
    console.error('Error calculating metrics:', error)
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 })
  }
}

async function calculateMetricsFromStripe(workspaceId: string, supabase: any) {
  try {
    // Get Stripe connection
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'stripe')
      .single()

    if (connectionError || !connection) {
      throw new Error('No Stripe connection found')
    }

    // Create Stripe client with connected account
    const connectedStripe = new Stripe(connection.access_token, {
      apiVersion: '2024-12-18.acacia'
    })

    // Get subscriptions for MRR calculation
    const subscriptions = await connectedStripe.subscriptions.list({
      limit: 100,
      status: 'active'
    })

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = subscriptions.data.reduce((total, sub) => {
      return total + (sub.items.data[0]?.price.unit_amount || 0) / 100
    }, 0)

    // Get customers for churn calculation
    const customers = await connectedStripe.customers.list({ limit: 1000 })

    // Simple churn calculation (this should be more sophisticated)
    const activeCustomers = customers.data.length
    const churnRate = activeCustomers > 0 ? (Math.random() * 0.1) : 0 // Placeholder

    // Calculate LTV
    const ltv = churnRate > 0 ? mrr / churnRate : 0

    const metrics = [
      { metric_name: 'mrr', value: mrr },
      { metric_name: 'churn_rate', value: churnRate },
      { metric_name: 'ltv', value: ltv },
      { metric_name: 'active_customers', value: activeCustomers }
    ]

    // Store metrics
    const metricsToInsert = metrics.map(metric => ({
      workspace_id: workspaceId,
      metric_name: metric.metric_name,
      value: metric.value,
      recorded_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('metrics')
      .insert(metricsToInsert)

    if (insertError) throw insertError

    return metrics
  } catch (error) {
    console.error('Error calculating metrics from Stripe:', error)
    throw error
  }
}