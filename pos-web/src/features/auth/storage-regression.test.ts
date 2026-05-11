import { describe, expect, it } from 'vitest'
import apiClientSource from '../../shared/lib/api-client.ts?raw'
import interceptorSource from './interceptor.ts?raw'
import tokenStoreSource from './token-store.ts?raw'
import loginFormSource from '../../routes/login/login-form.tsx?raw'

describe('token storage regression', () => {
  it('does not persist tokens through localStorage or sessionStorage setters', () => {
    const source = [apiClientSource, interceptorSource, tokenStoreSource, loginFormSource].join('\n')
    expect(source).not.toMatch(/localStorage\.setItem/)
    expect(source).not.toMatch(/sessionStorage\.setItem/)
  })
})
