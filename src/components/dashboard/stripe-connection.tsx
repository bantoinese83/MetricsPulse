'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import { CreditCard, RefreshCw } from 'lucide-react'

export function StripeConnection() {
  const { user } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading')

  const connectStripe = async () => {
    if (!user) return

    setIsConnecting(true)
    try {
      const response = await fetch(`/api/connections/stripe?user_id=${user.id}`)
      const { url } = await response.json()

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Failed to connect Stripe:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const calculateMetrics = async () => {
    setIsCalculating(true)
    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh the page to show new metrics
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to calculate metrics:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Integration
        </CardTitle>
        <CardDescription>
          Connect your Stripe account to automatically track revenue metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus === 'connected' ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={connectStripe}
            disabled={isConnecting || connectionStatus === 'connected'}
            variant="outline"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : connectionStatus === 'connected' ? (
              'Connected'
            ) : (
              'Connect Stripe'
            )}
          </Button>

          {connectionStatus === 'connected' && (
            <Button
              onClick={calculateMetrics}
              disabled={isCalculating}
              variant="default"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate Metrics'
              )}
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500">
          <p>⚠️ <strong>Note:</strong> You'll need to set up Stripe Connect in your Stripe dashboard first.</p>
          <p>This requires a Stripe account with Connect enabled.</p>
        </div>
      </CardContent>
    </Card>
  )
}