/**
 * 速率限制中间件
 * 基于 KV 实现请求频率限制
 */

import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types/env.d'
import { RATE_LIMIT, AUTH_KEYS } from '../config/constants'
import { sendError } from '../utils/response'

/** 速率限制配置 */
interface RateLimitOptions {
  /** 时间窗口内允许的最大请求数 */
  maxRequests: number
  /** 时间窗口（秒） */
  windowSeconds: number
  /** 生成限制键的函数 */
  keyGenerator: (c: any) => string
  /** 超出限制时的错误消息 */
  errorMessage?: string
}

/**
 * 通用速率限制中间件
 * 使用 KV 存储请求计数，滑动窗口算法
 * @param options - 速率限制配置
 */
export function rateLimit(options: RateLimitOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const key = options.keyGenerator(c as any)
    const kvKey = `ratelimit:${key}`

    try {
      // 获取当前窗口的请求计数
      const current = await c.env.AUTH.get(kvKey)
      const count = current ? parseInt(current, 10) : 0

      // 设置速率限制响应头
      c.header('X-RateLimit-Limit', String(options.maxRequests))
      c.header('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - count - 1)))

      // 超出限制
      if (count >= options.maxRequests) {
        c.header('Retry-After', String(options.windowSeconds))
        return sendError(
          c,
          429,
          options.errorMessage ?? '请求过于频繁，请稍后再试'
        )
      }

      // 递增计数
      await c.env.AUTH.put(kvKey, String(count + 1), {
        expirationTtl: options.windowSeconds,
      })

      await next()
    } catch (err) {
      // KV 异常不应阻塞请求，放行但记录日志
      console.error('速率限制检查失败:', err)
      await next()
    }
  })
}

/**
 * 登录接口专用速率限制
 * 限制：5 次/分钟（按 IP 地址）
 */
export const loginRateLimit = rateLimit({
  maxRequests: RATE_LIMIT.LOGIN_MAX,
  windowSeconds: RATE_LIMIT.LOGIN_WINDOW,
  keyGenerator: (c) => {
    // 使用 IP 地址作为限制键
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
    return `${AUTH_KEYS.LOGIN_ATTEMPTS}:${ip}`
  },
  errorMessage: '登录尝试次数过多，请 1 分钟后再试',
})

/**
 * API 全局速率限制
 * 限制：100 次/10 秒（按 IP 地址）
 */
export const apiRateLimit = rateLimit({
  maxRequests: RATE_LIMIT.API_MAX,
  windowSeconds: RATE_LIMIT.API_WINDOW,
  keyGenerator: (c) => {
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
    return `api:${ip}`
  },
  errorMessage: 'API 请求过于频繁，请稍后再试',
})
