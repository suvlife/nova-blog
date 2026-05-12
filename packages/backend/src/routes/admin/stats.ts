/**
 * 后台统计信息路由
 * 处理站点总览、文章统计、访问趋势等请求
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../types/env.d'
import { authRequired } from '../../middleware/auth'
import { sendSuccess } from '../../utils/response'
import * as statsService from '../../services/stats.service'

const router = new Hono<AppEnv>()

// 后台路由需要认证
router.use('*', authRequired)

/**
 * GET /api/admin/stats/overview
 * 获取站点统计总览
 */
router.get('/overview', async (c) => {
  const overview = await statsService.getOverview(c.env.DB)
  return sendSuccess(c, overview)
})

/**
 * GET /api/admin/stats/posts
 * 获取文章统计（按月分组、按分类分组）
 */
router.get('/posts', async (c) => {
  const postStats = await statsService.getPostStats(c.env.DB)
  return sendSuccess(c, postStats)
})

/**
 * GET /api/admin/stats/views
 * 获取访问趋势
 * 支持 ?days=30
 */
router.get('/views', async (c) => {
  const days = parseInt(c.req.query('days') ?? '30', 10) || 30
  const viewStats = await statsService.getViewStats(c.env.DB, days)
  return sendSuccess(c, viewStats)
})

export default router
