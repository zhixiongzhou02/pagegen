import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', true && 'visible')
    expect(result).toBe('base visible')
  })

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    // tailwind-merge should resolve conflicting classes
    expect(result).toContain('px-4')
    expect(result).not.toContain('px-2')
  })
})
