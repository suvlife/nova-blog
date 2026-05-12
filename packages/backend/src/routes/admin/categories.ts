/**
 * 后台分类管理路由
 * 处理分类的增删改查、树形列表、批量排序等请求
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../../types/env.d'
import { authRequired } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess } from '../../utils/response'
import * as categoryService from '../../services/category.service'

const router = new Hono<AppEnv>()

// 后台路由需要认证
router.use('*', authRequired)

/** 创建分类校验 Schema */
const createCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称不能超过 50 字'),
  slug: z.string().max(100, 'Slug 不能超过 100 字').optional(),
  description: z.string().max(500, '描述不能超过 500 字').optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
})

/** 更新分类校验 Schema */
const updateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称不能超过 50 字').optional(),
  slug: z.string().max(100, 'Slug 不能超过 100 字').optional(),
  description: z.string().max(500, '描述不能超过 500 字').optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

/** 批量排序校验 Schema */
const batchSortSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1, '分类 ID 不能为空'),
    sortOrder: z.number().int().min(0),
  })).min(1, '排序项不能为空'),
})

/**
 * GET /api/admin/categories
 * 获取分类列表（树形结构）
 */
router.get('/', async (c) => {
  const tree = await categoryService.getCategoryTree(c.env.DB)
  return sendSuccess(c, tree)
})

/**
 * GET /api/admin/categories/:id
 * 获取分类详情
 */
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const category = await categoryService.getCategoryById(c.env.DB, id)
  return sendSuccess(c, category)
})

/**
 * POST /api/admin/categories
 * 创建分类
 */
router.post('/', validate(createCategorySchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof createCategorySchema>

  const category = await categoryService.createCategory(c.env.DB, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    parentId: body.parentId,
    sortOrder: body.sortOrder,
  })

  return sendSuccess(c, category, 201, '分类创建成功')
})

/**
 * PUT /api/admin/categories/:id
 * 更新分类
 */
router.put('/:id', validate(updateCategorySchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof updateCategorySchema>

  const category = await categoryService.updateCategory(c.env.DB, id, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    parentId: body.parentId,
    sortOrder: body.sortOrder,
  })

  return sendSuccess(c, category, 200, '分类更新成功')
})

/**
 * DELETE /api/admin/categories/:id
 * 删除分类
 */
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await categoryService.deleteCategory(c.env.DB, c.env.CACHE, id)
  return sendSuccess(c, null, 200, '分类删除成功')
})

/**
 * PATCH /api/admin/categories/sort
 * 批量调整排序
 */
router.patch('/sort', validate(batchSortSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof batchSortSchema>

  await categoryService.batchSortCategories(c.env.DB, c.env.CACHE, body.items)
  return sendSuccess(c, null, 200, '分类排序更新成功')
})

export default router
