'use client'

import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { MetricsChart } from '@/components/dashboard/metrics-chart'
import { StripeConnection } from '@/components/dashboard/stripe-connection'
import { useMetrics, useMetricsCalculations, useChartData, useCalculateMetrics } from '@/lib/hooks'
import { Loading, DashboardSkeleton } from '@/components/loading'
import { Metric } from '@/lib/types'

export default function DashboardPage() {
  const { user, signOut } = useAuth()

  // Use React Query hooks for data fetching
  const { data: metrics = [], isLoading, error } = useMetrics(undefined, 30)
  const calculateMetrics = useCalculateMetrics()

  // Use custom hooks for calculations
  const { mrr, churnRate, ltv, activeCustomers, mrrChange, churnChange } = useMetricsCalculations(metrics)
  const chartData = useChartData(metrics)

  const handleSignOut = async () => {
    await signOut()
  }

  const handleCalculateMetrics = () => {
    calculateMetrics.mutate()
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">MetricsPulse</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load dashboard data</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">MetricsPulse</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Your SaaS Dashboard</h2>
            <p className="mt-2 text-sm text-gray-600">
              Track your critical metrics and monitor your SaaS health
            </p>
          </div>

          {/* Stripe Connection */}
          <div className="mb-8">
            <StripeConnection />
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <MetricCard
              title="MRR"
              value={mrr?.value || 0}
              change={mrrChange}
              status={mrrChange >= 0 ? 'healthy' : 'danger'}
              format="currency"
            />
            <MetricCard
              title="Churn Rate"
              value={churnRate?.value || 0}
              change={churnChange}
              status={churnChange <= 0 ? 'healthy' : 'danger'}
              format="percentage"
            />
            <MetricCard
              title="LTV"
              value={ltv?.value || 0}
              status="neutral"
              format="currency"
            />
            <MetricCard
              title="Active Customers"
              value={activeCustomers?.value || 0}
              status="neutral"
              format="number"
            />
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>MRR Trend</CardTitle>
                  <CardDescription>Monthly Recurring Revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart data={chartData} metric="mrr" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Churn Rate Trend</CardTitle>
                  <CardDescription>Customer churn rate over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart data={chartData} metric="churn_rate" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {metrics.length === 0 && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle>No Metrics Yet</CardTitle>
                <CardDescription>
                  Connect your Stripe account and calculate your first metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Once you connect Stripe and calculate metrics, you'll see your MRR, churn rate,
                  LTV, and other key SaaS metrics displayed here with beautiful charts and trends.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}