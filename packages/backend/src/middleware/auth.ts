/**
 * JWT 认证中间件
 * 验证 Bearer Token，注入用户信息到上下文
 */

import { createMiddleware } from 'hono/factory'
import type { AppEnv, AuthUser, UserRole } from '../types/env.d'
import { verifyToken, extractTokenFromHeader } from '../utils/jwt'
import { isTokenBlacklisted } from '../utils/cache'
import { sendError } from '../utils/response'
import { TOKEN_EXPIRY } from '../config/constants'

/**
 * 必须认证中间件
 * 验证请求中的 Bearer Token，解析用户信息并注入到上下文
 * 未提供 Token 或 Token 无效时返回 401
 */
export const authRequired = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  // 提取 Token
  const token = extractTokenFromHeader(authHeader ?? '')
  if (!token) {
    return sendError(c, 401, '未提供认证令牌，请先登录')
  }

  try {
    // 验证 Token
    const secret = c.env.JWT_SECRET
    const payload = await verifyToken(token, secret)

    // 检查 Token 类型
    if (payload.type === 'refresh') {
      return sendError(c, 401, '请使用 Access Token 而非 Refresh Token')
    }

    // 检查 Token 是否已被吊销
    const jti = payload.jti as string
    if (jti && await isTokenBlacklisted(c.env.AUTH, jti)) {
      return sendError(c, 401, '认证令牌已失效，请重新登录')
    }

    // 构造用户信息并注入上下文
    const user: AuthUser = {
      id: Number(payload.sub),
      username: payload.username as string,
      role: (payload.role as UserRole) ?? 'author',
      jti,
    }

    c.set('user', user)

    await next()
  } catch (err) {
    const message = err instanceof Error && err.name === 'JWTExpired'
      ? '认证令牌已过期，请重新登录'
      : '认证令牌无效，请重新登录'

    return sendError(c, 401, message)
  }
})

/**
 * 可选认证中间件
 * 如果请求中包含有效 Token 则解析用户信息，否则跳过
 * 用于同时支持认证和未认证访问的接口
 */
export const authOptional = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = extractTokenFromHeader(authHeader ?? '')

  if (token) {
    try {
      const secret = c.env.JWT_SECRET
      const payload = await verifyToken(token, secret)

      // Refresh Token 不用于接口认证
      if (payload.type !== 'refresh') {
        const jti = payload.jti as string

        // 检查是否已被吊销
        const isRevoked = jti ? await isTokenBlacklisted(c.env.AUTH, jti) : false

        if (!isRevoked) {
          const user: AuthUser = {
            id: Number(payload.sub),
            username: payload.username as string,
            role: (payload.role as UserRole) ?? 'author',
            jti,
          }
          c.set('user', user)
        }
      }
    } catch {
      // 可选认证，Token 无效时不报错，仅不注入用户信息
    }
  }

  // 确保用户信息有默认值
  if (!c.get('user')) {
    c.set('user', null)
  }

  await next()
})

/**
 * 角色校验中间件
 * 必须在 authRequired 之后使用
 * @param roles - 允许访问的角色列表
 * @returns 中间件函数
 */
export function roleRequired(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      return sendError(c, 401, '未认证，请先登录')
    }

    if (!roles.includes(user.role as UserRole)) {
      return sendError(c, 403, '权限不足，无法访问该资源')
    }

    await next()
  })
}
