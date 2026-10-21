import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from '../../routing'
import { useAdminAuth } from '../context/useAdminAuth'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
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
    <div className="admin-app admin-theme-light admin-login">
      <section className="admin-login__card" aria-labelledby="login-title">
        <div className="admin-login__brand">
          <span className="admin-brand-mark" aria-hidden="true">B</span>
          <div>
            <p className="admin-eyebrow mb-0">BRANDWORKS</p>
            <p className="text-[12px] font-semibold tracking-[0.08em] text-neutral-500">CONTENT STUDIO</p>
          </div>
        </div>

        <h1 id="login-title" className="admin-login__title">Welcome back.</h1>
        <p className="admin-login__subtitle">Sign in to continue shaping the editorial workspace.</p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
          {error && <FormMessage type="error">{error}</FormMessage>}

          <FormField
            id="username"
            label="Login ID"
            type="text"
            autoComplete="username"
            required
            autoFocus
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

          <AdminButton type="submit" variant="primary" disabled={submitting} className="mt-2 w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </AdminButton>
        </form>
      </section>
    </div>
  )
}

export default Login
