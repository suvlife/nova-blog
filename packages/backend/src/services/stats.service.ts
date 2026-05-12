/**
 * 统计业务逻辑服务
 * 处理站点总览、文章统计、访问趋势等数据聚合
 */

/**
 * 获取站点总览统计
 * @param db - D1 数据库实例
 * @returns 总览统计数据
 */
export async function getOverview(db: D1Database) {
  // 文章总数
  const totalPosts = await db
    .prepare('SELECT COUNT(*) as count FROM posts')
    .first<{ count: number }>()

  // 已发布文章数
  const publishedPosts = await db
    .prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'")
    .first<{ count: number }>()

  // 草稿数
  const draftPosts = await db
    .prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'draft'")
    .first<{ count: number }>()

  // 分类数
  const totalCategories = await db
    .prepare('SELECT COUNT(*) as count FROM categories')
    .first<{ count: number }>()

  // 标签数
  const totalTags = await db
    .prepare('SELECT COUNT(*) as count FROM tags')
    .first<{ count: number }>()

  // 总浏览量
  const totalViews = await db
    .prepare('SELECT COALESCE(SUM(view_count), 0) as total FROM posts')
    .first<{ total: number }>()

  // 用户数
  const totalUsers = await db
    .prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
    .first<{ count: number }>()

  // 附件数
  const totalAttachments = await db
    .prepare('SELECT COUNT(*) as count FROM attachments')
    .first<{ count: number }>()

  return {
    totalPosts: totalPosts?.count ?? 0,
    publishedPosts: publishedPosts?.count ?? 0,
    draftPosts: draftPosts?.count ?? 0,
    totalCategories: totalCategories?.count ?? 0,
    totalTags: totalTags?.count ?? 0,
    totalViews: totalViews?.total ?? 0,
    totalUsers: totalUsers?.count ?? 0,
    totalAttachments: totalAttachments?.count ?? 0,
  }
}

/**
 * 获取文章统计（按月分组、按分类分组）
 * @param db - D1 数据库实例
 * @returns 文章统计数据
 */
export async function getPostStats(db: D1Database) {
  // 按月分组的文章数量（最近 12 个月）
  const monthlyStats = await db
    .prepare(
      `SELECT
         strftime('%Y-%m', created_at) as month,
         COUNT(*) as count,
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_count,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count
       FROM posts
       WHERE created_at >= datetime('now', '-12 months')
       GROUP BY month
       ORDER BY month DESC`
    )
    .all<{ month: string; count: number; published_count: number; draft_count: number }>()

  // 按分类分组的文章数量
  const categoryStats = await db
    .prepare(
      `SELECT
         COALESCE(c.name, '未分类') as category_name,
         c.id as category_id,
         COUNT(p.id) as count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY count DESC`
    )
    .all<{ category_name: string; category_id: string | null; count: number }>()

  // 未分类的文章数
  const uncategorized = await db
    .prepare('SELECT COUNT(*) as count FROM posts WHERE category_id IS NULL')
    .first<{ count: number }>()

  return {
    monthly: (monthlyStats.results || []).map(m => ({
      month: m.month,
      count: m.count,
      publishedCount: m.published_count,
      draftCount: m.draft_count,
    })),
    byCategory: [
      ...(categoryStats.results || []).map(c => ({
        categoryName: c.category_name,
        categoryId: c.category_id,
        count: c.count,
      })),
      // 添加未分类统计
      ...(uncategorized && uncategorized.count > 0 ? [{
        categoryName: '未分类',
        categoryId: null,
        count: uncategorized.count,
      }] : []),
    ],
  }
}

/**
 * 获取访问趋势（最近 N 天的浏览量）
 * 注意：由于 D1 没有按天的浏览量表，这里返回文章的累计浏览量趋势
 * @param db - D1 数据库实例
 * @param days - 天数，默认 30
 * @returns 访问趋势数据
 */
export async function getViewStats(db: D1Database, days: number = 30) {
  // 最近 N 天发布的文章的浏览量汇总
  const dailyViews = await db
    .prepare(
      `SELECT
         strftime('%Y-%m-%d', published_at) as date,
         SUM(view_count) as views,
         COUNT(*) as post_count
       FROM posts
       WHERE status = 'published'
         AND published_at >= datetime('now', '-${days} days')
       GROUP BY date
       ORDER BY date ASC`
    )
    .all<{ date: string; views: number; post_count: number }>()

  // 热门文章 TOP 10
  const topPosts = await db
    .prepare(
      `SELECT id, title, slug, view_count, published_at
       FROM posts
       WHERE status = 'published'
       ORDER BY view_count DESC
       LIMIT 10`
    )
    .all<{ id: string; title: string; slug: string; view_count: number; published_at: string | null }>()

  return {
    daily: (dailyViews.results || []).map(d => ({
      date: d.date,
      views: d.views || 0,
      postCount: d.post_count,
    })),
    topPosts: (topPosts.results || []).map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      viewCount: p.view_count,
      publishedAt: p.published_at,
    })),
  }
}
