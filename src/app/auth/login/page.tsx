'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email'
    return ''
  }

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')

    const emailErr = validateEmail(email)
    const passwordErr = validatePassword(password)

    setEmailError(emailErr)
    setPasswordError(passwordErr)

    if (emailErr || passwordErr) return

    try {
      const { error } = await signIn(email.trim().toLowerCase(), password)
      if (error) {
        setGeneralError(error)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in to MetricsPulse</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {generalError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                className={emailError ? 'border-red-500' : ''}
                required
              />
              {emailError && (
                <p className="text-sm text-red-600">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                className={passwordError ? 'border-red-500' : ''}
                required
              />
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}