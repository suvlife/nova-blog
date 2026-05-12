/**
 * Nova Blog API - Cloudflare Worker 入口
 * Hono 应用主入口，注册全局中间件和路由
 */

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import type { AppEnv, Bindings } from './types/env.d'
import { corsMiddleware } from './middleware/cors'
import { errorHandler } from './middleware/error-handler'
import { apiRateLimit } from './middleware/rate-limit'

// 导入路由
import authRoutes from './routes/auth'
import adminPostsRoutes from './routes/admin/posts'
import adminCategoriesRoutes from './routes/admin/categories'
import adminTagsRoutes from './routes/admin/tags'
import adminAttachmentsRoutes from './routes/admin/attachments'
import adminUsersRoutes from './routes/admin/users'
import adminSettingsRoutes from './routes/admin/settings'
import adminStatsRoutes from './routes/admin/stats'
import publicPostsRoutes from './routes/public/posts'
import publicCategoriesRoutes from './routes/public/categories'
import publicTagsRoutes from './routes/public/tags'
import publicSearchRoutes from './routes/public/search'
import publicFeedRoutes from './routes/public/feed'
import publicSitemapRoutes from './routes/public/sitemap'

// 创建 Hono 应用实例
const app = new Hono<AppEnv>()

// ==================== 全局中间件 ====================

// 请求 ID 生成中间件
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-ID', requestId)
  await next()
})

// 请求日志中间件（开发环境）
app.use('*', logger())

// CORS 中间件
app.use('*', corsMiddleware)

// 全局 API 速率限制
app.use('/api/*', apiRateLimit)

// Pretty JSON 响应（开发环境便于调试）
app.use('*', prettyJSON())

// ==================== 健康检查 ====================

/**
 * GET /health
 * 健康检查端点，用于监控和负载均衡
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'nova-blog-api',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT ?? 'development',
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /api
 * API 根路径，返回 API 信息
 */
app.get('/api', (c) => {
  return c.json({
    name: 'Nova Blog API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      public: '/api/posts, /api/categories, /api/tags, /api/search, /api/feed, /api/sitemap',
    },
  })
})

// ==================== 认证路由 ====================

app.route('/api/auth', authRoutes)

// ==================== 后台管理路由 ====================

app.route('/api/admin/posts', adminPostsRoutes)
app.route('/api/admin/categories', adminCategoriesRoutes)
app.route('/api/admin/tags', adminTagsRoutes)
app.route('/api/admin/attachments', adminAttachmentsRoutes)
app.route('/api/admin/users', adminUsersRoutes)
app.route('/api/admin/settings', adminSettingsRoutes)
app.route('/api/admin/stats', adminStatsRoutes)

// ==================== 前台公开路由 ====================

app.route('/api/posts', publicPostsRoutes)
app.route('/api/categories', publicCategoriesRoutes)
app.route('/api/tags', publicTagsRoutes)
app.route('/api/search', publicSearchRoutes)
app.route('/api/feed', publicFeedRoutes)
app.route('/api/sitemap', publicSitemapRoutes)

// ==================== 404 处理 ====================

app.notFound((c) => {
  return c.json(
    {
      success: false,
      code: 404,
      message: `接口不存在: ${c.req.method} ${c.req.path}`,
      timestamp: Date.now(),
    },
    404
  )
})

// ==================== 全局错误处理 ====================

app.onError(errorHandler)

// ==================== Cron Trigger 处理 ====================

/**
 * 定时任务处理器
 * 每天凌晨 3 点执行，清理临时文件和过期数据
 */
const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (event, env, ctx) => {
  console.log('[Cron] 开始执行定时清理任务', new Date().toISOString())

  try {
    // 1. 清理 R2 中的临时文件（超过 24 小时的临时上传）
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const tempObjects = await env.STORAGE.list({
      prefix: 'temp/',
      limit: 100,
    })

    let deletedCount = 0
    for (const obj of tempObjects.objects) {
      if (obj.uploaded < oneDayAgo) {
        await env.STORAGE.delete(obj.key)
        deletedCount++
      }
    }
    console.log(`[Cron] 清理临时文件: 删除 ${deletedCount} 个过期文件`)

    // 2. 清理 KV 中的过期速率限制记录
    const rateLimitKeys = await env.AUTH.list({
      prefix: 'ratelimit:',
      limit: 100,
    })
    // KV 的 expirationTtl 会自动清理过期键，这里仅记录数量
    console.log(`[Cron] 速率限制记录数: ${rateLimitKeys.keys.length}`)

    // 3. 清理过期的 Token 黑名单记录
    const blacklistKeys = await env.AUTH.list({
      prefix: 'blacklist:token:',
      limit: 100,
    })
    console.log(`[Cron] Token 黑名单记录数: ${blacklistKeys.keys.length}`)

    console.log('[Cron] 定时清理任务完成')
  } catch (err) {
    console.error('[Cron] 定时任务执行失败:', err)
  }
}

// ==================== 导出 ====================

export default {
  fetch: app.fetch,
  scheduled,
}
