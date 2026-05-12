/**
 * 前台文章路由
 * 处理已发布文章的列表、详情、相关文章等公开请求
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../types/env.d'
import { authOptional } from '../../middleware/auth'
import { sendSuccess, sendPaginated } from '../../utils/response'
import * as publicService from '../../services/public.service'

const router = new Hono<AppEnv>()

// 前台文章接口支持可选认证
router.use('*', authOptional)

/**
 * GET /api/posts
 * 获取已发布文章列表（分页）
 * 支持 ?page=1&per_page=10&category_id=xxx&tag_id=xxx
 */
router.get('/', async (c) => {
  const query = c.req.query()

  const result = await publicService.listPublishedPosts(c.env.DB, c.env.CACHE, {
    page: parseInt(query.page ?? '1', 10) || 1,
    perPage: parseInt(query.per_page ?? '10', 10) || 10,
    categoryId: query.category_id,
    tagId: query.tag_id,
  })

  return sendPaginated(c, result.items, result.pagination)
})

/**
 * GET /api/posts/:slug
 * 获取文章详情（按 slug）
 */
router.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const post = await publicService.getPublishedPost(c.env.DB, c.env.CACHE, slug)
  return sendSuccess(c, post)
})

/**
 * GET /api/posts/:slug/related
 * 获取相关文章推荐
 */
router.get('/:slug/related', async (c) => {
  const slug = c.req.param('slug')
  const limit = parseInt(c.req.query('limit') ?? '5', 10) || 5

  // 先获取当前文章以确定分类
  const post = await publicService.getPublishedPost(c.env.DB, c.env.CACHE, slug)
  const categoryId = post.category?.id || null

  const related = await publicService.getRelatedPosts(
    c.env.DB,
    post.id,
    categoryId,
    limit
  )

  return sendSuccess(c, related)
})

export default router
