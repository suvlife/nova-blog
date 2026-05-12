/**
 * 前台分类路由
 * 处理分类列表、分类下的文章等公开请求
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../types/env.d'
import { sendSuccess, sendPaginated } from '../../utils/response'
import * as publicService from '../../services/public.service'
import * as categoryService from '../../services/category.service'
import { NotFoundError } from '../../middleware/error-handler'

const router = new Hono<AppEnv>()

/**
 * GET /api/categories
 * 获取所有分类列表（树形结构）
 */
router.get('/', async (c) => {
  const categories = await publicService.listPublishedCategories(c.env.DB, c.env.CACHE)
  return sendSuccess(c, categories)
})

/**
 * GET /api/categories/:slug/posts
 * 获取分类下的文章列表
 */
router.get('/:slug/posts', async (c) => {
  const slug = c.req.param('slug')
  const query = c.req.query()

  // 通过 slug 获取分类
  let categoryId: string
  try {
    const category = await categoryService.getCategoryBySlug(c.env.DB, slug)
    categoryId = category.id
  } catch {
    // 分类不存在，返回空列表
    return sendPaginated(c, [], {
      page: 1,
      perPage: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    })
  }

  const result = await publicService.listPublishedPosts(c.env.DB, c.env.CACHE, {
    page: parseInt(query.page ?? '1', 10) || 1,
    perPage: parseInt(query.per_page ?? '10', 10) || 10,
    categoryId,
  })

  return sendPaginated(c, result.items, result.pagination)
})

export default router
