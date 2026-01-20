import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

// GET /api/connections/stripe - Start OAuth flow
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Generate Stripe OAuth URL
    const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${encodeURIComponent(`${process.env.NEXTAUTH_URL}/api/connections/stripe/callback`)}&state=${userId}`

    return NextResponse.json({ url: oauthUrl })
  } catch (error) {
    console.error('Error generating Stripe OAuth URL:', error)
    return NextResponse.json({ error: 'Failed to generate OAuth URL' }, { status: 500 })
  }
}

// POST /api/connections/stripe - Save connection after OAuth
export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken, stripeUserId, refreshToken } = await request.json()

    if (!userId || !accessToken || !stripeUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createServerComponentClient()

    // Get or create workspace for user
    let { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (workspaceError && workspaceError.code !== 'PGRST116') {
      throw workspaceError
    }

    if (!workspace) {
      // Create workspace if it doesn't exist
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert([{ user_id: userId, name: 'My Workspace' }])
        .select('id')
        .single()

      if (createError) throw createError
      workspace = newWorkspace
    }

    // Save or update Stripe connection
    const { error: connectionError } = await supabase
      .from('connections')
      .upsert({
        workspace_id: workspace.id,
        provider: 'stripe',
        access_token: accessToken,
        refresh_token: refreshToken,
        connected_at: new Date().toISOString(),
        metadata: { stripe_user_id: stripeUserId }
      })

    if (connectionError) throw connectionError

    return NextResponse.json({ success: true, workspaceId: workspace.id })
  } catch (error) {
    console.error('Error saving Stripe connection:', error)
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
  }
}