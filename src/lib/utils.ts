import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { UserFacingError } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.trim()
  }

  if (typeof error === 'string') {
    return error.trim()
  }

  return ''
}

function extractBackendCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined
  }

  const { code } = error as { code?: unknown }
  return typeof code === 'string' && code.trim() ? code : undefined
}

export function createUserFacingError(title: string, detail: string, suggestion?: string): UserFacingError {
  return {
    title,
    detail,
    suggestion,
  }
}

export function formatUserFacingError(action: string, error: unknown): UserFacingError {
  const normalized = normalizeErrorMessage(error)
  const lower = normalized.toLowerCase()
  const backendCode = extractBackendCode(error)

  if (!normalized) {
    return createUserFacingError(`${action}失败`, '暂时无法完成当前操作。', '请稍后重试。')
  }

  if (lower.includes('timed out') || normalized.includes('超时')) {
    return createUserFacingError(
      `${action}失败`,
      '请求超时，服务在限定时间内没有返回结果。',
      '你可以重试一次，或切换到更快的模型。',
    )
  }

  if (backendCode === 'InvalidApiKey' || lower.includes('api key') || normalized.includes('API key')) {
    return createUserFacingError(
      `${action}失败`,
      'API Key 无效或未配置。',
      '请打开设置检查 API Provider、API Key 和模型配置。',
    )
  }

  if (normalized.includes('model_not_supported') || normalized.includes('模型') && normalized.includes('不受支持')) {
    return createUserFacingError(
      `${action}失败`,
      '当前模型不可用或不受支持。',
      '请在设置中切换模型后重试。',
    )
  }

  if (lower.includes('did not contain a valid html document') || normalized.includes('valid HTML document')) {
    return createUserFacingError(
      `${action}失败`,
      '模型返回的内容不是有效 HTML。',
      '请重试一次，或缩短提示词后再生成。',
    )
  }

  if (lower.includes('fallback generation failed')) {
    return createUserFacingError(
      `${action}失败`,
      '主生成和降级生成都没有成功。',
      '请稍后重试，或检查当前模型与网络状态。',
    )
  }

  if (backendCode === 'ApiError' || lower.includes('request failed') || lower.includes('response parsing failed')) {
    return createUserFacingError(
      `${action}失败`,
      normalized,
      '请检查网络、模型服务状态，或稍后重试。',
    )
  }

  return createUserFacingError(`${action}失败`, normalized, '请检查当前输入或配置后重试。')
}
