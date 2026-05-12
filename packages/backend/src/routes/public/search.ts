/**
 * 前台搜索路由
 * 处理文章全文搜索请求
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../types/env.d'
import { sendSuccess } from '../../utils/response'
import * as publicService from '../../services/public.service'

const router = new Hono<AppEnv>()

/**
 * GET /api/search
 * 搜索文章（支持关键词筛选）
 * 支持 ?keyword=xxx
 */
router.get('/', async (c) => {
  const keyword = c.req.query('keyword') || ''

  const results = await publicService.searchPosts(c.env.DB, keyword)
  return sendSuccess(c, results)
})

export default router
