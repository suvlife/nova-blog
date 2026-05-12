/**
 * 后台标签管理路由
 * 处理标签的增删改查请求
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../../types/env.d'
import { authRequired } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/response'
import * as tagService from '../../services/tag.service'

const router = new Hono<AppEnv>()

// 后台路由需要认证
router.use('*', authRequired)

/** 创建标签校验 Schema */
const createTagSchema = z.object({
  name: z.string().min(1, '标签名称不能为空').max(50, '标签名称不能超过 50 字'),
  slug: z.string().max(100, 'Slug 不能超过 100 字').optional(),
})

/** 更新标签校验 Schema */
const updateTagSchema = z.object({
  name: z.string().min(1, '标签名称不能为空').max(50, '标签名称不能超过 50 字').optional(),
  slug: z.string().max(100, 'Slug 不能超过 100 字').optional(),
})

/**
 * GET /api/admin/tags
 * 获取标签列表
 */
router.get('/', async (c) => {
  const tags = await tagService.listTags(c.env.DB)
  return sendSuccess(c, tags)
})

/**
 * GET /api/admin/tags/:id
 * 获取标签详情
 */
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const tag = await tagService.getTagById(c.env.DB, id)
  return sendSuccess(c, tag)
})

/**
 * POST /api/admin/tags
 * 创建标签
 */
router.post('/', validate(createTagSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof createTagSchema>

  const tag = await tagService.createTag(c.env.DB, {
    name: body.name,
    slug: body.slug,
  })

  return sendSuccess(c, tag, 201, '标签创建成功')
})

/**
 * PUT /api/admin/tags/:id
 * 更新标签
 */
router.put('/:id', validate(updateTagSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof updateTagSchema>

  const tag = await tagService.updateTag(c.env.DB, id, {
    name: body.name,
    slug: body.slug,
  })

  return sendSuccess(c, tag, 200, '标签更新成功')
})

/**
 * DELETE /api/admin/tags/:id
 * 删除标签
 */
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await tagService.deleteTag(c.env.DB, c.env.CACHE, id)
  return sendSuccess(c, null, 200, '标签删除成功')
})

export default router
