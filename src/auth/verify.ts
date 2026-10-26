import { CREDENTIALS } from './credentials'

/**
 * Client-side sign-in for the statically hosted build. The bundle only holds
 * salted PBKDF2 digests, one per account; the check keeps casual visitors out
 * but is not a substitute for server-side auth (the JavaScript is public).
 */

export type Session = {
  /** The user ID as typed at sign-in; kept only in this browser. */
  user: string
  /** The matching account's digest — identifies the account for per-user storage. */
  account: string
}

const SESSION_KEY = 'tiptap-pages:session'

const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0))

export async function digest(user: string, password: string, salt: string, iterations = CREDENTIALS.iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${user.trim()}:${password}`), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations }, key, 256)
  return toBase64(bits)
}

/** Length-independent comparison so timing does not reveal how much of a digest matched. */
function same(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

const isAccount = (account: unknown) => typeof account === 'string' && CREDENTIALS.accounts.some(a => same(a.hash, account))

export async function signIn(user: string, password: string, remember: boolean): Promise<Session | null> {
  // Every account is checked (in parallel) so timing doesn't reveal which one matched.
  const results = await Promise.all(CREDENTIALS.accounts.map(async a => same(await digest(user, password, a.salt), a.hash)))
  const index = results.indexOf(true)
  if (index < 0) return null
  const session: Session = { user: user.trim(), account: CREDENTIALS.accounts[index].hash }
  try {
    ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* storage unavailable: signed in for this page load only */
  }
  return session
}

export function currentSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    return typeof parsed.user === 'string' && isAccount(parsed.account) ? (parsed as Session) : null
  } catch {
    return null
  }
}

export function signOut() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
