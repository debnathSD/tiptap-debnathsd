import { describe, expect, it } from 'vitest'
import { CREDENTIALS } from './credentials'
import { currentSession, digest, signIn } from './verify'

describe('sign-in verifier', () => {
  it('derives the same digest as scripts/hash-credentials.mjs', async () => {
    // Reference: node -e "crypto.pbkdf2Sync('someone:example-only', '0123456789abcdef', 1000, 32, 'sha256').toString('base64')"
    expect(await digest('  someone ', 'example-only', 'MDEyMzQ1Njc4OWFiY2RlZg==', 1000)).toBe('XVmTui7hjSWJDw/2RlLTJ1dAmlHaF2PHpZThMOrAMFE=')
  })

  it('ships one salted verifier per account, not credentials', () => {
    expect(CREDENTIALS.iterations).toBeGreaterThanOrEqual(600_000)
    expect(CREDENTIALS.accounts.length).toBeGreaterThanOrEqual(2)
    for (const account of CREDENTIALS.accounts) expect(Object.keys(account).sort()).toEqual(['hash', 'salt'])
    expect(new Set(CREDENTIALS.accounts.map(a => a.salt)).size).toBe(CREDENTIALS.accounts.length)
  })

  it('rejects wrong credentials and leaves no session behind', async () => {
    expect(await signIn('nobody', 'wrong', true)).toBeNull()
    expect(currentSession()).toBeNull()
  })

  it('ignores a forged session that names no real account', () => {
    sessionStorage.setItem('tiptap-pages:session', JSON.stringify({ user: 'mallory', account: 'not-a-real-digest' }))
    expect(currentSession()).toBeNull()
    sessionStorage.clear()
  })
})
