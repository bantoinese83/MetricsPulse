'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">MetricsPulse</div>
          <div className="space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Get started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Track Your SaaS Health in{' '}
            <span className="text-blue-600">One Dashboard</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            MetricsPulse answers: <strong>"What are my 3 numbers TODAY that tell me if my SaaS is healthy?"</strong>
          </p>

          {/* Key Metrics Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-green-600">$12,450</CardTitle>
                <CardDescription>Monthly Recurring Revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-green-600 font-medium">+8.2% from yesterday</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-yellow-600">3.2%</CardTitle>
                <CardDescription>Churn Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-600 font-medium">+0.5% from yesterday</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-blue-600">$89</CardTitle>
                <CardDescription>Customer Acquisition Cost</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-green-600 font-medium">-12% from yesterday</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-x-4">
            <Button size="lg" asChild>
              <Link href="/auth/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Why SaaS Founders Choose MetricsPulse</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>⚡ Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Get your critical metrics in under 500ms. No complex dashboards with 50+ charts.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔗 Easy Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Connect Stripe, Google Analytics, and manual inputs in minutes. OAuth flows handle the complexity.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💰 Built for Founders</CardTitle>
              </CardHeader>
              <CardContent>
                <p>$39/month vs competitors' $99+. Built by founders who understand what really matters.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 MetricsPulse. Built for SaaS founders, by SaaS founders.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
