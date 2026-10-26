import { CREDENTIALS } from './credentials'

/**
 * Client-side sign-in for the statically hosted build. The bundle only holds a
 * salted PBKDF2 digest; the check keeps casual visitors out but is not a
 * substitute for server-side auth (anyone can read the shipped JavaScript).
 */

const SESSION_KEY = 'tiptap-pages:session'

const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0))

export async function digest(user: string, password: string, salt = CREDENTIALS.salt, iterations = CREDENTIALS.iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${user.trim()}:${password}`), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations }, key, 256)
  return toBase64(bits)
}

/** Length-independent comparison so timing does not reveal how much of the digest matched. */
function same(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export async function signIn(user: string, password: string, remember: boolean) {
  const ok = same(await digest(user, password), CREDENTIALS.hash)
  if (ok) {
    try {
      ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, CREDENTIALS.hash)
    } catch {
      /* storage unavailable: signed in for this page load only */
    }
  }
  return ok
}

export function hasSession() {
  try {
    const token = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY)
    return token !== null && same(token, CREDENTIALS.hash)
  } catch {
    return false
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
