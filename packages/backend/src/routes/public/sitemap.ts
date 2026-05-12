/**
 * Sitemap 路由
 * 处理 XML Sitemap 生成请求
 */

import { Hono } from 'hono'
import type { AppEnv } from '../../types/env.d'
import * as publicService from '../../services/public.service'
import * as settingService from '../../services/setting.service'

const router = new Hono<AppEnv>()

/**
 * GET /api/sitemap
 * 获取 XML Sitemap
 */
router.get('/', async (c) => {
  // 获取站点配置
  const settings = await settingService.getPublicSettings(c.env.DB)

  const xml = await publicService.generateSitemap(c.env.DB, c.env.CACHE, settings)

  return c.body(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  })
})

export default router
