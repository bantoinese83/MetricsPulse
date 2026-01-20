import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is our userId
    const error = searchParams.get('error')

    if (error) {
      console.error('Stripe OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard?error=stripe_oauth_failed', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard?error=missing_oauth_params', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    })

    const { access_token, refresh_token, stripe_user_id } = tokenResponse

    // Make API call to save connection
    const saveResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/connections/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: state,
        accessToken: access_token,
        refreshToken: refresh_token,
        stripeUserId: stripe_user_id,
      }),
    })

    if (!saveResponse.ok) {
      console.error('Failed to save Stripe connection')
      return NextResponse.redirect(new URL('/dashboard?error=connection_save_failed', request.url))
    }

    // Redirect to dashboard with success
    return NextResponse.redirect(new URL('/dashboard?success=stripe_connected', request.url))
  } catch (error) {
    console.error('Stripe OAuth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=oauth_callback_failed', request.url))
  }
}