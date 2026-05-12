/**
 * CORS 中间件
 * 处理跨域请求，支持配置的域名白名单
 */

import { cors } from 'hono/cors'
import type { Context, Next } from 'hono'
import type { AppEnv } from '../types/env.d'

/**
 * 动态 CORS 中间件
 * 根据请求的 Origin 头和环境配置决定是否允许跨域
 * 支持多域名配置（逗号分隔）
 */
export const corsMiddleware = cors({
  // 动态判断允许的 Origin
  origin: (origin: string, c: Context<AppEnv>) => {
    const allowedOrigins = c.env.CORS_ORIGIN ?? '*'

    // 允许所有来源
    if (allowedOrigins === '*') {
      return '*'
    }

    // 支持多域名（逗号分隔）
    const originList = allowedOrigins.split(',').map(o => o.trim())

    // 请求来源在白名单中
    if (origin && originList.includes(origin)) {
      return origin
    }

    // 开发环境允许 localhost 的所有端口
    if (c.env.ENVIRONMENT === 'development' && origin) {
      try {
        const url = new URL(origin)
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return origin
        }
      } catch {
        // URL 解析失败，忽略
      }
    }

    // 不允许跨域
    return ''
  },
  // 允许的 HTTP 方法
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // 允许的请求头
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept'],
  // 暴露给前端的响应头
  exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  // 允许携带凭证（Cookie）
  credentials: true,
  // 预检请求缓存时间（秒）
  maxAge: 86400,
})
