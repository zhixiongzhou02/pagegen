import { describe, it, expect } from 'vitest'
import {
  validateApiKey,
  buildPrompt,
  extractCodeFromChunk,
  DEFAULT_SYSTEM_PROMPT,
} from './ai'

describe('AI Service', () => {
  describe('validateApiKey', () => {
    it('should accept valid API key', () => {
      const result = validateApiKey('sk-test-valid-key')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty API key', () => {
      const result = validateApiKey('')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('API key cannot be empty')
    })

    it('should reject whitespace-only API key', () => {
      const result = validateApiKey('   ')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('API key cannot be empty')
    })
  })

  describe('buildPrompt', () => {
    it('should create request with system prompt', () => {
      const request = buildPrompt('Create a landing page')

      expect(request.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT)
      expect(request.messages).toHaveLength(1)
      expect(request.messages[0].role).toBe('user')
      expect(request.messages[0].content).toBe('Create a landing page')
    })

    it('should include context when provided', () => {
      const request = buildPrompt(
        'Make it blue',
        '<html>Previous code</html>'
      )

      expect(request.messages[0].content).toContain('Make it blue')
      expect(request.messages[0].content).toContain('Previous context:')
      expect(request.messages[0].content).toContain('<html>Previous code</html>')
    })

    it('should not include context when not provided', () => {
      const request = buildPrompt('Simple request')

      expect(request.messages[0].content).toBe('Simple request')
      expect(request.messages[0].content).not.toContain('Previous context:')
    })
  })

  describe('extractCodeFromChunk', () => {
    it('should extract text from valid SSE chunk', () => {
      const chunk =
        'data: {"delta": {"text": "<div>Hello</div>"}}'

      const result = extractCodeFromChunk(chunk)

      expect(result).toBe('<div>Hello</div>')
    })

    it('should return null for [DONE] signal', () => {
      const chunk = 'data: [DONE]'

      const result = extractCodeFromChunk(chunk)

      expect(result).toBeNull()
    })

    it('should return null for invalid format', () => {
      const chunk = 'not a valid sse format'

      const result = extractCodeFromChunk(chunk)

      expect(result).toBeNull()
    })

    it('should return null for invalid JSON', () => {
      const chunk = 'data: {invalid json}'

      const result = extractCodeFromChunk(chunk)

      expect(result).toBeNull()
    })

    it('should return null for missing text field', () => {
      const chunk = 'data: {"delta": {"type": "text_delta"}}'

      const result = extractCodeFromChunk(chunk)

      expect(result).toBeNull()
    })

    it('should handle empty text content', () => {
      const chunk = 'data: {"delta": {"text": ""}}'

      const result = extractCodeFromChunk(chunk)

      expect(result).toBe('')
    })
  })
})
