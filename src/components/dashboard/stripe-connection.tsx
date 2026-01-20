'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import { useStripeConnection, useCalculateMetrics } from '@/lib/hooks'
import { CreditCard, RefreshCw, AlertCircle } from 'lucide-react'
import { useWorkspace } from '@/lib/hooks'

export function StripeConnection() {
  const { user } = useAuth()
  const { data: workspace } = useWorkspace()
  const { connectStripe, isConnecting, error: connectionError } = useStripeConnection()
  const calculateMetrics = useCalculateMetrics()

  const handleConnectStripe = () => {
    if (user?.id) {
      connectStripe(user.id)
    }
  }

  const handleCalculateMetrics = () => {
    calculateMetrics.mutate()
  }

  // Check if Stripe is connected (simplified - you might want to query connections)
  const isConnected = workspace?.connections?.some(c => c.provider === 'stripe') || false

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
        {(connectionError || calculateMetrics.isError) && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700">
              {connectionError || 'Failed to calculate metrics'}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleConnectStripe}
            disabled={isConnecting || isConnected}
            variant="outline"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : isConnected ? (
              'Connected'
            ) : (
              'Connect Stripe'
            )}
          </Button>

          {isConnected && (
            <Button
              onClick={handleCalculateMetrics}
              disabled={calculateMetrics.isPending}
              variant="default"
            >
              {calculateMetrics.isPending ? (
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

        <div className="text-xs text-gray-500 space-y-1">
          <p>⚠️ <strong>Note:</strong> You&apos;ll need to set up Stripe Connect in your Stripe dashboard first.</p>
          <p>This requires a Stripe account with Connect enabled.</p>
        </div>
      </CardContent>
    </Card>
  )
}