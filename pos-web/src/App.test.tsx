import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from './App'

describe('App scaffold', () => {
  it('renders the Vite React starter content', () => {
    const html = renderToString(<App />)

    expect(html).toContain('Get started')
    expect(html).toContain('Count is')
  })
})
