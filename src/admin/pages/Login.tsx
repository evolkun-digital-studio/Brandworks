import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'

function Login() {
  const { admin, loading, login } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in — no reason to show the login form again.
  if (!loading && admin) {
    const from =
      (location.state as { from?: { pathname: string } } | null)?.from
        ?.pathname ?? '/admin'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-[400px] rounded-[16px] border border-neutral-200 bg-white p-8">
        <div className="mb-8 text-center">
          <div className="text-[20px] font-medium text-neutral-900">
            BRANDWORKS
          </div>
          <div className="mt-1 text-[13px] uppercase tracking-wide text-neutral-500">
            Admin Panel
          </div>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {error && <FormMessage type="error">{error}</FormMessage>}

          <FormField
            id="username"
            label="Login ID"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex h-[44px] w-full items-center justify-center rounded-[6px] bg-neutral-900 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
