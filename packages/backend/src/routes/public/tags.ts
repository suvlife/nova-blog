/**
 * 前台标签路由
 * 处理标签列表、标签下的文章等公开请求
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../types/env.d'
import { sendSuccess, sendPaginated } from '../../utils/response'
import * as publicService from '../../services/public.service'
import * as tagService from '../../services/tag.service'

const router = new Hono<AppEnv>()

/**
 * GET /api/tags
 * 获取所有标签列表
 */
router.get('/', async (c) => {
  const tags = await publicService.listPublishedTags(c.env.DB, c.env.CACHE)
  return sendSuccess(c, tags)
})

/**
 * GET /api/tags/:slug/posts
 * 获取标签下的文章列表
 */
router.get('/:slug/posts', async (c) => {
  const slug = c.req.param('slug')
  const query = c.req.query()

  // 通过 slug 获取标签 ID
  let tagId: string
  try {
    const tag = await tagService.getTagBySlug(c.env.DB, slug)
    tagId = tag.id
  } catch {
    // 标签不存在，返回空列表
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
    tagId,
  })

  return sendPaginated(c, result.items, result.pagination)
})

export default router
