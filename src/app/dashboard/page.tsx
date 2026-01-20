'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { MetricsChart } from '@/components/dashboard/metrics-chart'
import { StripeConnection } from '@/components/dashboard/stripe-connection'

interface Metric {
  id: string
  metric_name: string
  value: number
  recorded_at: string
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)

  const handleSignOut = async () => {
    await signOut()
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics?days=30')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics || [])
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate current values and changes
  const getLatestMetric = (metricName: string) => {
    const metricData = metrics.filter(m => m.metric_name === metricName)
    return metricData[metricData.length - 1]
  }

  const getPreviousMetric = (metricName: string) => {
    const metricData = metrics.filter(m => m.metric_name === metricName)
    return metricData[metricData.length - 2]
  }

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0
    return ((current - previous) / previous) * 100
  }

  const mrr = getLatestMetric('mrr')
  const churnRate = getLatestMetric('churn_rate')
  const ltv = getLatestMetric('ltv')
  const activeCustomers = getLatestMetric('active_customers')

  const mrrChange = calculateChange(mrr?.value || 0, getPreviousMetric('mrr')?.value || 0)
  const churnChange = calculateChange(churnRate?.value || 0, getPreviousMetric('churn_rate')?.value || 0)

  // Prepare chart data
  const chartData = metrics.reduce((acc, metric) => {
    const date = new Date(metric.recorded_at).toISOString().split('T')[0]
    const existing = acc.find(item => item.date === date)
    if (existing) {
      existing[metric.metric_name] = metric.value
    } else {
      acc.push({ date, [metric.metric_name]: metric.value })
    }
    return acc
  }, [] as any[])

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
          {metrics.length === 0 && !loading && (
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