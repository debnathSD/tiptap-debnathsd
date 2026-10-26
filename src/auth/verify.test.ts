import { describe, expect, it } from 'vitest'
import { CREDENTIALS } from './credentials'
import { digest, hasSession, signIn } from './verify'

describe('sign-in verifier', () => {
  it('derives the same digest as scripts/hash-credentials.mjs', async () => {
    // Reference: node -e "crypto.pbkdf2Sync('someone:example-only', '0123456789abcdef', 1000, 32, 'sha256').toString('base64')"
    expect(await digest('  someone ', 'example-only', 'MDEyMzQ1Njc4OWFiY2RlZg==', 1000)).toBe('XVmTui7hjSWJDw/2RlLTJ1dAmlHaF2PHpZThMOrAMFE=')
  })

  it('ships a verifier, not credentials', () => {
    expect(CREDENTIALS.iterations).toBeGreaterThanOrEqual(600_000)
    expect(Object.keys(CREDENTIALS).sort()).toEqual(['hash', 'iterations', 'salt'])
  })

  it('rejects wrong credentials and leaves no session behind', async () => {
    expect(await signIn('nobody', 'wrong', true)).toBe(false)
    expect(hasSession()).toBe(false)
  })
})
