/**
 * 前台公开业务逻辑服务
 * 处理前台文章列表、详情、分类、标签、搜索、Feed、Sitemap 等
 * 优先走 KV 缓存（cache-aside 模式）
 */

import { cacheAside, buildPaginatedCacheKey } from '../utils/cache'
import { calculatePagination, calculateOffset } from '../utils/pagination'
import { CACHE_KEYS, CACHE_TTL, PAGINATION_DEFAULTS } from '../config/constants'
import { NotFoundError } from '../middleware/error-handler'
import type { PaginationMeta } from '../types/common'

/** 文章数据库记录类型 */
interface PostRecord {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  content_html: string
  cover_image: string | null
  category_id: string | null
  author_id: string
  status: string
  visibility: string
  is_pinned: number
  view_count: number
  word_count: number
  published_at: string | null
  created_at: string
  updated_at: string
}

/** 标签数据库记录类型 */
interface TagRecord {
  id: string
  name: string
  slug: string
}

/** 分类数据库记录类型 */
interface CategoryRecord {
  id: string
  name: string
  slug: string
  description: string
  parent_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/** 用户简要信息记录 */
interface UserBriefRecord {
  id: string
  display_name: string
  avatar_url: string | null
}

/** 已发布文章列表查询参数 */
export interface ListPublishedPostsParams {
  page?: number
  perPage?: number
  categoryId?: string
  tagId?: string
}

/**
 * 获取已发布文章列表（走 KV 缓存）
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param params - 查询参数
 * @returns 分页文章列表
 */
export async function listPublishedPosts(
  db: D1Database,
  kv: KVNamespace,
  params: ListPublishedPostsParams = {}
) {
  const {
    page = PAGINATION_DEFAULTS.PAGE,
    perPage = PAGINATION_DEFAULTS.PER_PAGE,
    categoryId,
    tagId,
  } = params

  // 构建缓存键
  const cacheKey = buildPaginatedCacheKey(
    CACHE_KEYS.POST_LIST,
    { page, perPage },
    {
      ...(categoryId && { categoryId }),
      ...(tagId && { tagId }),
    }
  )

  return cacheAside(
    kv,
    cacheKey,
    CACHE_TTL.POST_LIST,
    async () => {
      // 构建查询条件
      const conditions: string[] = ["p.status = 'published'"]
      const bindValues: unknown[] = []

      if (categoryId) {
        conditions.push('p.category_id = ?')
        bindValues.push(categoryId)
      }

      if (tagId) {
        conditions.push('EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id = ?)')
        bindValues.push(tagId)
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`

      // 查询总数
      const countQuery = `SELECT COUNT(*) as total FROM posts p ${whereClause}`
      const countResult = await db.prepare(countQuery).bind(...bindValues).first<{ total: number }>()
      const total = countResult?.total ?? 0

      // 计算分页
      const pagination: PaginationMeta = calculatePagination(total, page, perPage)
      const offset = calculateOffset(page, perPage)

      // 查询文章列表（前台不返回完整内容，只返回摘要）
      const listQuery = `
        SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.status, p.is_pinned,
               p.view_count, p.published_at, p.created_at, p.category_id,
               c.id as cat_id, c.name as cat_name, c.slug as cat_slug,
               u.id as author_id, u.display_name as author_name, u.avatar_url as author_avatar
        FROM posts p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.author_id = u.id
        ${whereClause}
        ORDER BY p.is_pinned DESC, p.published_at DESC
        LIMIT ? OFFSET ?
      `
      const posts = await db
        .prepare(listQuery)
        .bind(...bindValues, perPage, offset)
        .all<PostRecord & {
          cat_id: string | null; cat_name: string | null; cat_slug: string | null;
          author_id: string; author_name: string; author_avatar: string | null;
        }>()

      // 为每篇文章查询标签
      const items = await Promise.all(
        (posts.results || []).map(async (post) => {
          const tags = await db
            .prepare(
              `SELECT t.id, t.name, t.slug FROM tags t
               INNER JOIN post_tags pt ON t.id = pt.tag_id
               WHERE pt.post_id = ?`
            )
            .bind(post.id)
            .all<TagRecord>()

          return {
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt || null,
            coverImage: post.cover_image || null,
            isPinned: post.is_pinned === 1,
            viewCount: post.view_count,
            publishedAt: post.published_at || null,
            createdAt: post.created_at,
            category: post.cat_id ? {
              id: post.cat_id,
              name: post.cat_name,
              slug: post.cat_slug,
            } : null,
            tags: (tags.results || []).map(t => ({ id: t.id, name: t.name, slug: t.slug })),
            author: {
              id: post.author_id,
              displayName: post.author_name,
              avatarUrl: post.author_avatar || null,
            },
          }
        })
      )

      return { items, pagination }
    }
  )
}

/**
 * 获取已发布文章详情（走缓存、增加浏览量）
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param slug - 文章 slug
 * @returns 文章详情
 */
export async function getPublishedPost(db: D1Database, kv: KVNamespace, slug: string) {
  const cacheKey = `${CACHE_KEYS.POST_DETAIL}:${slug}`

  const post = await cacheAside(
    kv,
    cacheKey,
    CACHE_TTL.POST_DETAIL,
    async () => {
      // 查询文章
      const post = await db
        .prepare(
          `SELECT p.*, c.name as cat_name, c.slug as cat_slug,
                  u.display_name as author_name, u.avatar_url as author_avatar
           FROM posts p
           LEFT JOIN categories c ON p.category_id = c.id
           LEFT JOIN users u ON p.author_id = u.id
           WHERE p.slug = ? AND p.status = 'published'`
        )
        .bind(slug)
        .first<PostRecord & {
          cat_name: string | null; cat_slug: string | null;
          author_name: string; author_avatar: string | null;
        }>()

      if (!post) {
        throw new NotFoundError('文章')
      }

      // 查询标签
      const tags = await db
        .prepare(
          `SELECT t.id, t.name, t.slug FROM tags t
           INNER JOIN post_tags pt ON t.id = pt.tag_id
           WHERE pt.post_id = ?`
        )
        .bind(post.id)
        .all<TagRecord>()

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || null,
        content: post.content,
        renderedContent: post.content_html || null,
        coverImage: post.cover_image || null,
        isPinned: post.is_pinned === 1,
        viewCount: post.view_count,
        wordCount: post.word_count,
        publishedAt: post.published_at || null,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        category: post.cat_name ? {
          id: post.category_id,
          name: post.cat_name,
          slug: post.cat_slug,
        } : null,
        tags: (tags.results || []).map(t => ({ id: t.id, name: t.name, slug: t.slug })),
        author: {
          id: post.author_id,
          displayName: post.author_name,
          avatarUrl: post.author_avatar || null,
        },
      }
    }
  )

  // 异步增加浏览量（不阻塞响应）
  db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?")
    .bind(post.id)
    .run()
    .catch(() => {
      // 浏览量更新失败不影响业务
    })

  return post
}

/**
 * 获取相关文章推荐
 * @param db - D1 数据库实例
 * @param postId - 当前文章 ID
 * @param categoryId - 当前文章分类 ID
 * @param limit - 返回数量
 * @returns 相关文章列表
 */
export async function getRelatedPosts(
  db: D1Database,
  postId: string,
  categoryId: string | null,
  limit: number = 5
) {
  // 优先推荐同分类的文章
  let query = `
    SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at
    FROM posts p
    WHERE p.status = 'published' AND p.id != ?
  `
  const bindValues: unknown[] = [postId]

  if (categoryId) {
    query += ' AND p.category_id = ?'
    bindValues.push(categoryId)
  }

  query += ' ORDER BY p.view_count DESC LIMIT ?'
  bindValues.push(limit)

  let posts = await db.prepare(query).bind(...bindValues).all<{
    id: string; title: string; slug: string; excerpt: string;
    cover_image: string | null; published_at: string | null;
  }>()

  // 如果同分类文章不足，补充其他文章
  if ((posts.results || []).length < limit) {
    const existingIds = [postId, ...(posts.results || []).map(p => p.id)]
    const placeholders = existingIds.map(() => '?').join(',')
    const remaining = limit - (posts.results || []).length

    const morePosts = await db
      .prepare(
        `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at
         FROM posts p
         WHERE p.status = 'published' AND p.id NOT IN (${placeholders})
         ORDER BY p.view_count DESC
         LIMIT ?`
      )
      .bind(...existingIds, remaining)
      .all<{
        id: string; title: string; slug: string; excerpt: string;
        cover_image: string | null; published_at: string | null;
      }>()

    // 合并结果
    const combinedResults = [...(posts.results || []), ...(morePosts.results || [])]
    posts = { results: combinedResults } as D1Result<typeof combinedResults[number]>
  }

  return (posts.results || []).map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || null,
    coverImage: p.cover_image || null,
    publishedAt: p.published_at || null,
  }))
}

/**
 * 获取分类树（走缓存）
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @returns 分类树
 */
export async function listPublishedCategories(db: D1Database, kv: KVNamespace) {
  return cacheAside(
    kv,
    CACHE_KEYS.CATEGORIES,
    CACHE_TTL.CATEGORIES,
    async () => {
      const categories = await db
        .prepare(
          `SELECT c.*, COUNT(p.id) as post_count
           FROM categories c
           LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
           GROUP BY c.id
           ORDER BY c.sort_order ASC, c.created_at ASC`
        )
        .all<CategoryRecord & { post_count: number }>()

      const allCategories = (categories.results || []).map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        parentId: c.parent_id || null,
        sortOrder: c.sort_order,
        postCount: c.post_count || 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }))

      // 构建树形结构
      const nodeMap = new Map<string, typeof allCategories[number] & { children: any[] }>()
      for (const cat of allCategories) {
        nodeMap.set(cat.id, { ...cat, children: [] })
      }

      const roots: any[] = []
      for (const node of nodeMap.values()) {
        if (node.parentId && nodeMap.has(node.parentId)) {
          nodeMap.get(node.parentId)!.children.push(node)
        } else {
          roots.push(node)
        }
      }

      return roots
    }
  )
}

/**
 * 获取标签列表（走缓存）
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @returns 标签列表
 */
export async function listPublishedTags(db: D1Database, kv: KVNamespace) {
  return cacheAside(
    kv,
    CACHE_KEYS.TAGS,
    CACHE_TTL.TAGS,
    async () => {
      const tags = await db
        .prepare(
          `SELECT t.*, COUNT(pt.post_id) as post_count
           FROM tags t
           LEFT JOIN post_tags pt ON t.id = pt.tag_id
           LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published'
           GROUP BY t.id
           HAVING post_count > 0
           ORDER BY t.name ASC`
        )
        .all<TagRecord & { post_count: number }>()

      return (tags.results || []).map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        postCount: t.post_count || 0,
      }))
    }
  )
}

/**
 * 全文搜索（LIKE 模糊匹配 title/content）
 * @param db - D1 数据库实例
 * @param keyword - 搜索关键词
 * @returns 搜索结果
 */
export async function searchPosts(db: D1Database, keyword: string) {
  if (!keyword || keyword.trim().length === 0) {
    return []
  }

  const likeKeyword = `%${keyword.trim()}%`

  const posts = await db
    .prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.published_at, p.created_at,
              c.id as cat_id, c.name as cat_name, c.slug as cat_slug
       FROM posts p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'published'
         AND (p.title LIKE ? OR p.content LIKE ?)
       ORDER BY p.published_at DESC
       LIMIT 50`
    )
    .bind(likeKeyword, likeKeyword)
    .all<PostRecord & { cat_id: string | null; cat_name: string | null; cat_slug: string | null }>()

  return (posts.results || []).map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || null,
    coverImage: p.cover_image || null,
    publishedAt: p.published_at || null,
    createdAt: p.created_at,
    category: p.cat_id ? {
      id: p.cat_id,
      name: p.cat_name,
      slug: p.cat_slug,
    } : null,
  }))
}

/**
 * 获取归档（按年月分组）
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @returns 归档数据
 */
export async function getArchive(db: D1Database, kv: KVNamespace) {
  return cacheAside(
    kv,
    'archive:all',
    CACHE_TTL.POST_LIST,
    async () => {
      const posts = await db
        .prepare(
          `SELECT id, title, slug, published_at
           FROM posts
           WHERE status = 'published' AND published_at IS NOT NULL
           ORDER BY published_at DESC`
        )
        .all<{ id: string; title: string; slug: string; published_at: string }>()

      // 按年月分组
      const archive: Record<string, Record<string, Array<{ id: string; title: string; slug: string; publishedAt: string }>>> = {}

      for (const post of (posts.results || [])) {
        const date = new Date(post.published_at)
        const year = date.getFullYear().toString()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')

        if (!archive[year]) {
          archive[year] = {}
        }
        if (!archive[year][month]) {
          archive[year][month] = []
        }

        archive[year][month].push({
          id: post.id,
          title: post.title,
          slug: post.slug,
          publishedAt: post.published_at,
        })
      }

      return archive
    }
  )
}

/**
 * 生成 RSS 2.0 XML
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param settings - 站点配置
 * @returns RSS XML 字符串
 */
export async function generateRss(
  db: D1Database,
  kv: KVNamespace,
  settings: Record<string, string>
) {
  return cacheAside(
    kv,
    CACHE_KEYS.FEED,
    CACHE_TTL.FEED,
    async () => {
      const siteTitle = settings.site_title || 'Nova Blog'
      const siteUrl = settings.site_url || 'https://example.com'
      const siteDescription = settings.site_description || 'A blog powered by Nova'
      const seoKeywords = settings.seo_keywords || ''

      // 获取最近 20 篇已发布文章
      const posts = await db
        .prepare(
          `SELECT p.id, p.title, p.slug, p.excerpt, p.content_html, p.published_at, p.updated_at,
                  u.display_name as author_name
           FROM posts p
           LEFT JOIN users u ON p.author_id = u.id
           WHERE p.status = 'published'
           ORDER BY p.published_at DESC
           LIMIT 20`
        )
        .all<PostRecord & { author_name: string }>()

      const items = (posts.results || []).map(p => {
        const link = `${siteUrl}/posts/${p.slug}`
        const description = escapeXml(p.excerpt || '')
        const content = escapeXml(p.content_html || '')
        const pubDate = p.published_at ? new Date(p.published_at).toUTCString() : ''

        return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${description}</description>
      <content:encoded><![CDATA[${p.content_html || ''}]]></content:encoded>
      ${p.author_name ? `<dc:creator>${escapeXml(p.author_name)}</dc:creator>` : ''}
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
    </item>`
      }).join('\n')

      return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/feed/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
    }
  )
}

/**
 * 生成 Atom Feed XML
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param settings - 站点配置
 * @returns Atom XML 字符串
 */
export async function generateAtom(
  db: D1Database,
  kv: KVNamespace,
  settings: Record<string, string>
) {
  return cacheAside(
    kv,
    'feed:atom',
    CACHE_TTL.FEED,
    async () => {
      const siteTitle = settings.site_title || 'Nova Blog'
      const siteUrl = settings.site_url || 'https://example.com'
      const siteDescription = settings.site_description || 'A blog powered by Nova'

      // 获取最近 20 篇已发布文章
      const posts = await db
        .prepare(
          `SELECT p.id, p.title, p.slug, p.excerpt, p.content_html, p.published_at, p.updated_at,
                  u.display_name as author_name
           FROM posts p
           LEFT JOIN users u ON p.author_id = u.id
           WHERE p.status = 'published'
           ORDER BY p.published_at DESC
           LIMIT 20`
        )
        .all<PostRecord & { author_name: string }>()

      const entries = (posts.results || []).map(p => {
        const link = `${siteUrl}/posts/${p.slug}`
        const updated = p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString()
        const published = p.published_at ? new Date(p.published_at).toISOString() : ''

        return `  <entry>
    <title>${escapeXml(p.title)}</title>
    <link href="${link}" rel="alternate" type="text/html" />
    <id>${link}</id>
    <updated>${updated}</updated>
    ${published ? `<published>${published}</published>` : ''}
    <summary>${escapeXml(p.excerpt || '')}</summary>
    <content type="html"><![CDATA[${p.content_html || ''}]]></content>
    ${p.author_name ? `<author><name>${escapeXml(p.author_name)}</name></author>` : ''}
  </entry>`
      }).join('\n')

      return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteTitle)}</title>
  <link href="${siteUrl}" rel="alternate" type="text/html" />
  <link href="${siteUrl}/api/feed/atom" rel="self" type="application/atom+xml" />
  <id>${siteUrl}/</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle>${escapeXml(siteDescription)}</subtitle>
${entries}
</feed>`
    }
  )
}

/**
 * 生成 Sitemap XML
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param settings - 站点配置
 * @returns Sitemap XML 字符串
 */
export async function generateSitemap(
  db: D1Database,
  kv: KVNamespace,
  settings: Record<string, string>
) {
  return cacheAside(
    kv,
    CACHE_KEYS.SITEMAP,
    CACHE_TTL.SITEMAP,
    async () => {
      const siteUrl = settings.site_url || 'https://example.com'

      // 获取所有已发布文章
      const posts = await db
        .prepare(
          `SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC`
        )
        .all<{ slug: string; updated_at: string }>()

      // 获取所有分类
      const categories = await db
        .prepare('SELECT slug, updated_at FROM categories ORDER BY sort_order ASC')
        .all<{ slug: string; updated_at: string }>()

      // 获取所有标签
      const tags = await db
        .prepare('SELECT slug, updated_at FROM tags ORDER BY name ASC')
        .all<{ slug: string; updated_at: string }>()

      // 构造 URL 列表
      const urls: string[] = []

      // 首页
      urls.push(`  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`)

      // 文章页
      for (const post of (posts.results || [])) {
        urls.push(`  <url>
    <loc>${siteUrl}/posts/${escapeXml(post.slug)}</loc>
    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
      }

      // 分类页
      for (const cat of (categories.results || [])) {
        urls.push(`  <url>
    <loc>${siteUrl}/categories/${escapeXml(cat.slug)}</loc>
    <lastmod>${new Date(cat.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`)
      }

      // 标签页
      for (const tag of (tags.results || [])) {
        urls.push(`  <url>
    <loc>${siteUrl}/tags/${escapeXml(tag.slug)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`)
      }

      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
    }
  )
}

/**
 * XML 特殊字符转义
 * @param str - 原始字符串
 * @returns 转义后的字符串
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
