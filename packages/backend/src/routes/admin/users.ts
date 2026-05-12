/**
 * 后台用户管理路由
 * 处理用户的增删改查、角色变更等请求（仅管理员可访问）
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../../types/env.d'
import { authRequired, roleRequired } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/response'
import * as userService from '../../services/user.service'

const router = new Hono<AppEnv>()

// 后台路由需要认证，仅管理员可管理用户
router.use('*', authRequired, roleRequired('admin'))

/** 创建用户校验 Schema */
const createUserSchema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符').max(50, '用户名不能超过 50 字'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码长度不能少于 6 位').max(100, '密码过长'),
  displayName: z.string().max(50, '显示名称不能超过 50 字').optional(),
  role: z.enum(['admin', 'editor', 'author']).default('author'),
})

/** 更新用户校验 Schema */
const updateUserSchema = z.object({
  email: z.string().email('邮箱格式不正确').optional(),
  displayName: z.string().max(50, '显示名称不能超过 50 字').optional(),
  avatarUrl: z.string().url('头像 URL 格式不正确').optional().or(z.literal('')),
})

/** 变更角色校验 Schema */
const changeRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'author'], { required_error: '角色不能为空' }),
})

/**
 * GET /api/admin/users
 * 获取用户列表
 */
router.get('/', async (c) => {
  const users = await userService.listUsers(c.env.DB)
  return sendSuccess(c, users)
})

/**
 * GET /api/admin/users/:id
 * 获取用户详情
 */
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const user = await userService.getUserById(c.env.DB, id)
  return sendSuccess(c, user)
})

/**
 * POST /api/admin/users
 * 创建用户
 */
router.post('/', validate(createUserSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof createUserSchema>

  const user = await userService.createUser(c.env.DB, {
    username: body.username,
    email: body.email,
    password: body.password,
    displayName: body.displayName,
    role: body.role,
  })

  return sendSuccess(c, user, 201, '用户创建成功')
})

/**
 * PUT /api/admin/users/:id
 * 更新用户信息
 */
router.put('/:id', validate(updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof updateUserSchema>

  const user = await userService.updateUser(c.env.DB, id, {
    email: body.email,
    displayName: body.displayName,
    avatarUrl: body.avatarUrl,
  })

  return sendSuccess(c, user, 200, '用户信息更新成功')
})

/**
 * DELETE /api/admin/users/:id
 * 禁用用户（软删除）
 */
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await userService.deleteUser(c.env.DB, id)
  return sendSuccess(c, null, 200, '用户已禁用')
})

/**
 * PATCH /api/admin/users/:id/role
 * 变更用户角色
 */
router.patch('/:id/role', validate(changeRoleSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof changeRoleSchema>

  const user = await userService.changeUserRole(c.env.DB, id, body.role)
  return sendSuccess(c, user, 200, '用户角色变更成功')
})

export default router
