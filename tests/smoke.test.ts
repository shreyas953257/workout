import { describe, expect, it } from 'vitest'

describe('toolchain smoke test', () => {
  it('runs assertions', () => {
    expect(1 + 1).toBe(2)
  })

  it('has a DOM environment', () => {
    expect(typeof document).toBe('object')
    const el = document.createElement('div')
    el.textContent = 'forge'
    expect(el.textContent).toBe('forge')
  })

  it('has localStorage', () => {
    localStorage.setItem('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
    localStorage.clear()
    expect(localStorage.getItem('k')).toBeNull()
  })
})
