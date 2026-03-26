import { describe, it, expect } from 'vitest'
import { BackendCommandError } from '../services/ipc'
import { cn, formatUserFacingError } from './utils'

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

  it('should format timeout errors with details and suggestion', () => {
    const result = formatUserFacingError('页面生成', new Error('timed out'))

    expect(result).toEqual({
      title: '页面生成失败',
      detail: '请求超时，服务在限定时间内没有返回结果。',
      suggestion: '你可以重试一次，或切换到更快的模型。',
    })
  })

  it('should use backend error code when formatting invalid api key errors', () => {
    const result = formatUserFacingError('页面生成', new BackendCommandError('配置缺失', 'InvalidApiKey'))

    expect(result).toEqual({
      title: '页面生成失败',
      detail: 'API Key 无效或未配置。',
      suggestion: '请打开设置检查 API Provider、API Key 和模型配置。',
    })
  })
})
