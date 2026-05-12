/**
 * 全局错误处理中间件
 * 捕获所有异常，返回统一错误格式，记录错误日志
 */

import type { Context } from 'hono'
import type { AppEnv } from '../types/env.d'
import { error, sendError } from '../utils/response'
import type { ErrorResponse } from '../types/common'

/**
 * 自定义业务错误类
 * 用于在业务逻辑中抛出可识别的错误
 */
export class AppError extends Error {
  /** HTTP 状态码 */
  public readonly statusCode: number
  /** 错误码 */
  public readonly code: number
  /** 是否为业务错误（可预期的） */
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = statusCode
    this.isOperational = isOperational

    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * 404 未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(`${resource}不存在`, 404)
    this.name = 'NotFoundError'
  }
}

/**
 * 403 权限不足错误
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * 400 参数错误
 */
export class ValidationError extends AppError {
  constructor(message: string = '请求参数错误') {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

/**
 * 401 未认证错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未认证，请先登录') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

/**
 * 全局错误处理中间件
 * 捕获路由处理中抛出的所有异常
 */
export const errorHandler = async (err: Error, c: Context<AppEnv>) => {
  // 获取请求 ID
  const requestId = c.get('requestId') ?? ''

  // 记录错误日志
  const logLevel = err instanceof AppError && err.isOperational ? 'warn' : 'error'
  if (logLevel === 'error') {
    console.error('[未预期错误]', {
      requestId,
      method: c.req.method,
      path: c.req.path,
      error: err.message,
      stack: err.stack,
    })
  } else {
    console.warn('[业务错误]', {
      requestId,
      method: c.req.method,
      path: c.req.path,
      error: err.message,
    })
  }

  // 根据错误类型返回不同的响应
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      code: err.code,
      message: err.message,
      requestId,
      timestamp: Date.now(),
    }
    return c.json(response, err.statusCode as 400)
  }

  // Zod 校验错误（未被 validate 中间件捕获的情况）
  if (err.name === 'ZodError') {
    const response: ErrorResponse = {
      success: false,
      code: 400,
      message: '请求参数校验失败',
      requestId,
      timestamp: Date.now(),
    }
    return c.json(response, 400)
  }

  // JWT 相关错误
  if (err.name === 'JWTExpired' || err.message?.includes('exp')) {
    const response: ErrorResponse = {
      success: false,
      code: 401,
      message: '认证令牌已过期，请重新登录',
      requestId,
      timestamp: Date.now(),
    }
    return c.json(response, 401)
  }

  if (err.name === 'JWSSignatureVerificationFailed' || err.name === 'JWSInvalid') {
    const response: ErrorResponse = {
      success: false,
      code: 401,
      message: '认证令牌无效，请重新登录',
      requestId,
      timestamp: Date.now(),
    }
    return c.json(response, 401)
  }

  // 其他未预期的错误 - 返回 500，不暴露内部细节
  const response: ErrorResponse = {
    success: false,
    code: 500,
    message: c.env.ENVIRONMENT === 'production'
      ? '服务器内部错误，请稍后重试'
      : err.message || '服务器内部错误',
    requestId,
    timestamp: Date.now(),
  }
  return c.json(response, 500)
}
