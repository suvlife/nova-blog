/**
 * RSS Feed 路由
 * 处理 RSS 2.0 和 Atom 1.0 Feed 生成请求
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../types/env.d'
import * as publicService from '../../services/public.service'
import * as settingService from '../../services/setting.service'

const router = new Hono<AppEnv>()

/**
 * GET /api/feed/rss
 * 获取 RSS 2.0 Feed
 */
router.get('/rss', async (c) => {
  // 获取站点配置
  const settings = await settingService.getPublicSettings(c.env.DB)

  const xml = await publicService.generateRss(c.env.DB, c.env.CACHE, settings)

  return c.body(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=600',
  })
})

/**
 * GET /api/feed/atom
 * 获取 Atom 1.0 Feed
 */
router.get('/atom', async (c) => {
  // 获取站点配置
  const settings = await settingService.getPublicSettings(c.env.DB)

  const xml = await publicService.generateAtom(c.env.DB, c.env.CACHE, settings)

  return c.body(xml, 200, {
    'Content-Type': 'application/atom+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=600',
  })
})

export default router
