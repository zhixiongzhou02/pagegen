import { describe, it, expect } from 'vitest'
import { isStorageError, type StorageError } from './storage'

describe('Storage utilities', () => {
  describe('isStorageError', () => {
    it('should return true for valid storage errors', () => {
      const error: StorageError = { type: 'ProjectNotFound', id: '123' }

      expect(isStorageError(error)).toBe(true)
    })

    it('should return false for regular errors', () => {
      const error = new Error('Regular error')

      expect(isStorageError(error)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isStorageError(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isStorageError(undefined)).toBe(false)
    })

    it('should return false for plain objects without type', () => {
      expect(isStorageError({ id: '123' })).toBe(false)
    })

    it('should return false for objects with non-string type', () => {
      expect(isStorageError({ type: 123 })).toBe(false)
    })
  })
})
