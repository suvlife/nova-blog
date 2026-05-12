/**
 * 后台站点设置路由
 * 处理站点配置的读写请求
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../../types/env.d'
import { authRequired } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/response'
import * as settingService from '../../services/setting.service'

const router = new Hono<AppEnv>()

// 后台路由需要认证
router.use('*', authRequired)

/** 批量更新配置校验 Schema */
const batchUpdateSchema = z.record(z.string(), z.string())

/** 单项更新配置校验 Schema */
const singleUpdateSchema = z.object({
  value: z.string().min(1, '配置值不能为空'),
})

/**
 * GET /api/admin/settings
 * 获取全部配置
 */
router.get('/', async (c) => {
  const settings = await settingService.getAllSettings(c.env.DB)
  return sendSuccess(c, settings)
})

/**
 * GET /api/admin/settings/:key
 * 获取单项配置
 */
router.get('/:key', async (c) => {
  const key = c.req.param('key')
  const setting = await settingService.getSetting(c.env.DB, key)
  return sendSuccess(c, setting)
})

/**
 * PUT /api/admin/settings
 * 批量更新配置
 */
router.put('/', validate(batchUpdateSchema), async (c) => {
  const data = c.get('validatedBody') as Record<string, string>

  const settings = await settingService.updateSettings(
    c.env.DB,
    c.env.CACHE,
    data
  )

  return sendSuccess(c, settings, 200, '配置更新成功')
})

/**
 * PUT /api/admin/settings/:key
 * 更新单项配置
 */
router.put('/:key', validate(singleUpdateSchema), async (c) => {
  const key = c.req.param('key')
  const body = c.get('validatedBody') as z.infer<typeof singleUpdateSchema>

  const setting = await settingService.updateSetting(
    c.env.DB,
    c.env.CACHE,
    key,
    body.value
  )

  return sendSuccess(c, setting, 200, '配置更新成功')
})

export default router
