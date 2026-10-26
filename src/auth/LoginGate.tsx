import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { currentSession, signIn, type Session } from './verify'

/** Sign-in screen shown before the editor loads. */
export function LoginGate({ children }: { children: (session: Session) => ReactNode }) {
  const [session, setSession] = useState(currentSession)
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) return <>{children(session)}</>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user.trim() || !password) {
      setError('Enter your user ID and password.')
      return
    }
    setBusy(true)
    setError(null)
    const signedIn = await signIn(user, password, remember)
    setBusy(false)
    if (signedIn) setSession(signedIn)
    else {
      setPassword('')
      setError("That user ID and password don't match.")
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit} aria-labelledby="login-title" noValidate>
        <div className="login__brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={40} height={40} />
          <span>Pages</span>
        </div>
        <h1 id="login-title">Sign in</h1>
        <p className="login__lead">This workspace is private. Sign in to view and edit pages.</p>

        <label className="login__field">
          <span>User ID</span>
          <input
            className="input"
            name="username"
            autoComplete="username"
            autoFocus
            value={user}
            onChange={e => setUser(e.target.value)}
            aria-invalid={!!error}
          />
        </label>
        <label className="login__field">
          <span>Password</span>
          <span className="login__password">
            <input
              className="input"
              name="password"
              type={reveal ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              aria-invalid={!!error}
            />
            <button type="button" className="icon-btn" aria-label={reveal ? 'Hide password' : 'Show password'} onClick={() => setReveal(v => !v)}>
              {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        <label className="login__remember">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Keep me signed in on this device
        </label>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary login__submit" disabled={busy}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <LockKeyhole size={16} />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
