/**
 * 认证路由
 * 处理登录、Token 刷新、登出、获取当前用户信息、修改密码等请求
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types/env.d'
import { authRequired } from '../middleware/auth'
import { loginRateLimit } from '../middleware/rate-limit'
import { validate } from '../middleware/validate'
import { sendSuccess, sendError } from '../utils/response'
import * as authService from '../services/auth.service'

const router = new Hono<AppEnv>()

/** 登录请求校验 Schema */
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名过长'),
  password: z.string().min(1, '密码不能为空').max(100, '密码过长'),
})

/** 刷新 Token 请求校验 Schema */
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh Token 不能为空'),
})

/** 修改密码请求校验 Schema */
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(6, '新密码长度不能少于 6 位').max(100, '新密码过长'),
})

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', loginRateLimit, validate(loginSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof loginSchema>

  const result = await authService.login(
    c.env.DB,
    c.env.AUTH,
    c.env.JWT_SECRET,
    body.username,
    body.password
  )

  return sendSuccess(c, result, 200, '登录成功')
})

/**
 * POST /api/auth/refresh
 * 刷新 Token
 */
router.post('/refresh', validate(refreshSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof refreshSchema>

  const result = await authService.refreshToken(
    c.env.DB,
    c.env.AUTH,
    c.env.JWT_SECRET,
    body.refreshToken
  )

  return sendSuccess(c, result, 200, 'Token 刷新成功')
})

/**
 * POST /api/auth/logout
 * 用户登出（需要认证）
 */
router.post('/logout', authRequired, async (c) => {
  const user = c.get('user')!

  await authService.logout(c.env.AUTH, user.id, user.jti)

  return sendSuccess(c, null, 200, '登出成功')
})

/**
 * GET /api/auth/me
 * 获取当前用户信息（需要认证）
 */
router.get('/me', authRequired, async (c) => {
  const user = c.get('user')!

  const userInfo = await authService.getCurrentUser(c.env.DB, user.id)

  return sendSuccess(c, userInfo)
})

/**
 * PUT /api/auth/password
 * 修改密码（需要认证）
 */
router.put('/password', authRequired, validate(changePasswordSchema), async (c) => {
  const user = c.get('user')!
  const body = c.get('validatedBody') as z.infer<typeof changePasswordSchema>

  await authService.changePassword(
    c.env.DB,
    user.id,
    body.oldPassword,
    body.newPassword
  )

  return sendSuccess(c, null, 200, '密码修改成功')
})

export default router
