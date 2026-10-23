import '../styles'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from '../../routing'
import { useAdminAuth } from '../context/useAdminAuth'
import { useAdminTheme } from '../hooks/useAdminTheme'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'

function Login() {
  const { admin, loading, login } = useAdminAuth()
  const [theme] = useAdminTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && admin) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/admin'
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
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-app admin-login" data-theme={theme}>
      <section className="admin-login__card" aria-labelledby="login-title">
        <span className="admin-brand-mark mx-auto mb-6 size-12 rounded-[14px] text-[22px]" aria-hidden="true">B</span>
        <h1 id="login-title" className="text-center text-[26px] font-bold tracking-[-0.03em]">Sign in to Studio</h1>
        <p className="mt-1.5 text-center text-[14px] text-a-ink-2">Use your BRANDWORKS administrator account.</p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && <FormMessage type="error">{error}</FormMessage>}

          <FormField
            id="username"
            label="Login ID"
            type="text"
            autoComplete="username"
            required
            autoFocus
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <AdminButton type="submit" variant="primary" size="lg" disabled={submitting} className="mt-2 w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </AdminButton>
        </form>
      </section>
    </div>
  )
}

export default Login
