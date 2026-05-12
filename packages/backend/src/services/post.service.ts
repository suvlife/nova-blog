/**
 * 文章业务逻辑服务
 * 处理文章的 CRUD、状态变更、置顶切换等核心逻辑
 */

import { generateSlug, ensureUniqueSlug, renderMarkdown } from '../utils'
import { CacheInvalidator } from '../utils/cache'
import { calculatePagination, calculateOffset } from '../utils/pagination'
import { NotFoundError, ValidationError, AppError } from '../middleware/error-handler'
import { PAGINATION_DEFAULTS } from '../config/constants'
import type { PaginationMeta } from '../types/common'

/** 文章列表查询参数 */
export interface ListPostsParams {
  page?: number
  perPage?: number
  status?: string
  categoryId?: string
  tagId?: string
  keyword?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

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
  password: string | null
  is_pinned: number
  allow_comment: number
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

/**
 * 计算文本字数（中文按字符计，英文按单词计）
 * @param text - 待计算文本
 * @returns 字数
 */
function countWords(text: string): number {
  if (!text) return 0
  // 移除 Markdown 语法标记
  const plainText = text
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]+`/g, '')         // 移除行内代码
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // 移除图片
    .replace(/\[[^\]]+\]\([^)]+\)/g, '$1') // 链接只保留文字
    .replace(/[#*_~>|`\-]/g, '')     // 移除 Markdown 符号
    .trim()

  // 统计中文字符数
  const chineseChars = (plainText.match(/[\u4e00-\u9fff]/g) || []).length
  // 统计英文单词数（去除中文后的部分按空格分词）
  const withoutChinese = plainText.replace(/[\u4e00-\u9fff]/g, ' ')
  const englishWords = withoutChinese.split(/\s+/).filter(w => w.length > 0).length

  return chineseChars + englishWords
}

/**
 * 获取文章列表（后台管理用，支持多条件筛选）
 * @param db - D1 数据库实例
 * @param params - 查询参数
 * @returns 分页文章列表
 */
export async function listPosts(db: D1Database, params: ListPostsParams = {}) {
  const {
    page = PAGINATION_DEFAULTS.PAGE,
    perPage = PAGINATION_DEFAULTS.PER_PAGE,
    status,
    categoryId,
    tagId,
    keyword,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params

  // 构建查询条件
  const conditions: string[] = []
  const bindValues: unknown[] = []

  if (status) {
    conditions.push('p.status = ?')
    bindValues.push(status)
  }

  if (categoryId) {
    conditions.push('p.category_id = ?')
    bindValues.push(categoryId)
  }

  if (tagId) {
    conditions.push('EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id = ?)')
    bindValues.push(tagId)
  }

  if (keyword) {
    conditions.push('(p.title LIKE ? OR p.content LIKE ?)')
    const likeKeyword = `%${keyword}%`
    bindValues.push(likeKeyword, likeKeyword)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 校验排序字段，防止 SQL 注入
  const allowedSortFields = ['created_at', 'updated_at', 'published_at', 'view_count', 'title', 'is_pinned']
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  // 查询总数
  const countQuery = `SELECT COUNT(*) as total FROM posts p ${whereClause}`
  const countResult = await db.prepare(countQuery).bind(...bindValues).first<{ total: number }>()
  const total = countResult?.total ?? 0

  // 计算分页
  const pagination: PaginationMeta = calculatePagination(total, page, perPage)
  const offset = calculateOffset(page, perPage)

  // 查询文章列表
  const listQuery = `
    SELECT p.* FROM posts p
    ${whereClause}
    ORDER BY p.is_pinned DESC, p.${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `
  const posts = await db
    .prepare(listQuery)
    .bind(...bindValues, perPage, offset)
    .all<PostRecord>()

  // 为每篇文章查询标签
  const postsWithTags = await Promise.all(
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
        content: post.content,
        renderedContent: post.content_html || null,
        coverImage: post.cover_image || null,
        status: post.status,
        visibility: post.visibility,
        password: post.password || null,
        isPinned: post.is_pinned === 1,
        allowComment: post.allow_comment === 1,
        viewCount: post.view_count,
        wordCount: post.word_count,
        publishedAt: post.published_at || null,
        categoryId: post.category_id || null,
        authorId: post.author_id,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        tags: (tags.results || []).map(t => ({ id: t.id, name: t.name, slug: t.slug })),
      }
    })
  )

  return { items: postsWithTags, pagination }
}

/**
 * 获取单篇文章（含标签）
 * @param db - D1 数据库实例
 * @param id - 文章 ID
 * @returns 文章详情
 */
export async function getPostById(db: D1Database, id: string) {
  const post = await db
    .prepare('SELECT * FROM posts WHERE id = ?')
    .bind(id)
    .first<PostRecord>()

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
    status: post.status,
    visibility: post.visibility,
    password: post.password || null,
    isPinned: post.is_pinned === 1,
    allowComment: post.allow_comment === 1,
    viewCount: post.view_count,
    wordCount: post.word_count,
    publishedAt: post.published_at || null,
    categoryId: post.category_id || null,
    authorId: post.author_id,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    tags: (tags.results || []).map(t => ({ id: t.id, name: t.name, slug: t.slug })),
  }
}

/**
 * 按 slug 获取文章
 * @param db - D1 数据库实例
 * @param slug - 文章 slug
 * @returns 文章详情
 */
export async function getPostBySlug(db: D1Database, slug: string) {
  const post = await db
    .prepare('SELECT * FROM posts WHERE slug = ?')
    .bind(slug)
    .first<PostRecord>()

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
    status: post.status,
    visibility: post.visibility,
    password: post.password || null,
    isPinned: post.is_pinned === 1,
    allowComment: post.allow_comment === 1,
    viewCount: post.view_count,
    wordCount: post.word_count,
    publishedAt: post.published_at || null,
    categoryId: post.category_id || null,
    authorId: post.author_id,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    tags: (tags.results || []).map(t => ({ id: t.id, name: t.name, slug: t.slug })),
  }
}

/**
 * 创建文章
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param data - 文章数据
 * @param authorId - 作者 ID
 * @returns 创建后的文章
 */
export async function createPost(
  db: D1Database,
  kv: KVNamespace,
  data: {
    title: string
    content: string
    slug?: string
    excerpt?: string
    coverImage?: string
    categoryId?: string
    tagIds?: string[]
    status?: string
    visibility?: string
    password?: string
    isPinned?: boolean
    allowComment?: boolean
    publishedAt?: string
  },
  authorId: string
) {
  const id = crypto.randomUUID()

  // 生成 slug：优先使用传入值，否则从标题生成
  let slug = data.slug || generateSlug(data.title)
  if (!slug) {
    slug = `post-${Date.now()}`
  }

  // 确保 slug 唯一
  const existingSlugs = await db
    .prepare('SELECT slug FROM posts WHERE slug LIKE ?')
    .bind(`${slug}%`)
    .all<{ slug: string }>()
  slug = ensureUniqueSlug(slug, (existingSlugs.results || []).map(r => r.slug))

  // 渲染 Markdown 为 HTML
  const contentHtml = renderMarkdown(data.content)

  // 计算字数
  const wordCount = countWords(data.content)

  // 确定发布时间：如果状态为 published 且未指定发布时间，则使用当前时间
  const status = data.status || 'draft'
  const publishedAt = status === 'published'
    ? (data.publishedAt || new Date().toISOString())
    : data.publishedAt || null

  // 自动生成摘要（如果未提供）
  const excerpt = data.excerpt || data.content.replace(/```[\s\S]*?```/g, '').replace(/[#*_~>|`\-]/g, '').trim().slice(0, 200)

  // 插入文章记录
  await db
    .prepare(
      `INSERT INTO posts (id, title, slug, excerpt, content, content_html, cover_image, category_id, author_id, status, visibility, password, is_pinned, allow_comment, view_count, word_count, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      id,
      data.title,
      slug,
      excerpt,
      data.content,
      contentHtml,
      data.coverImage || null,
      data.categoryId || null,
      authorId,
      status,
      data.visibility || 'public',
      data.password || null,
      data.isPinned ? 1 : 0,
      data.allowComment !== false ? 1 : 0,
      wordCount,
      publishedAt
    )
    .run()

  // 处理标签关联
  if (data.tagIds && data.tagIds.length > 0) {
    for (const tagId of data.tagIds) {
      await db
        .prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)')
        .bind(id, tagId)
        .run()
    }
  }

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onPostChanged(slug)

  return getPostById(db, id)
}

/**
 * 更新文章
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param id - 文章 ID
 * @param data - 更新数据
 * @returns 更新后的文章
 */
export async function updatePost(
  db: D1Database,
  kv: KVNamespace,
  id: string,
  data: {
    title?: string
    content?: string
    slug?: string
    excerpt?: string | null
    coverImage?: string | null
    categoryId?: string | null
    tagIds?: string[]
    status?: string
    visibility?: string
    password?: string | null
    isPinned?: boolean
    allowComment?: boolean
    publishedAt?: string | null
  }
) {
  // 检查文章是否存在
  const existing = await db
    .prepare('SELECT id, slug, status FROM posts WHERE id = ?')
    .bind(id)
    .first<{ id: string; slug: string; status: string }>()

  if (!existing) {
    throw new NotFoundError('文章')
  }

  // 构建动态更新语句
  const setClauses: string[] = []
  const bindValues: unknown[] = []

  if (data.title !== undefined) {
    setClauses.push('title = ?')
    bindValues.push(data.title)
  }

  if (data.content !== undefined) {
    setClauses.push('content = ?')
    bindValues.push(data.content)
    // 重新渲染 HTML
    setClauses.push('content_html = ?')
    bindValues.push(renderMarkdown(data.content))
    // 重新计算字数
    setClauses.push('word_count = ?')
    bindValues.push(countWords(data.content))
  }

  if (data.slug !== undefined) {
    // 检查 slug 是否已被其他文章使用
    const slugOwner = await db
      .prepare('SELECT id FROM posts WHERE slug = ? AND id != ?')
      .bind(data.slug, id)
      .first<{ id: string }>()

    if (slugOwner) {
      throw new ValidationError('该 Slug 已被其他文章使用')
    }
    setClauses.push('slug = ?')
    bindValues.push(data.slug)
  }

  if (data.excerpt !== undefined) {
    setClauses.push('excerpt = ?')
    bindValues.push(data.excerpt || '')
  }

  if (data.coverImage !== undefined) {
    setClauses.push('cover_image = ?')
    bindValues.push(data.coverImage || null)
  }

  if (data.categoryId !== undefined) {
    setClauses.push('category_id = ?')
    bindValues.push(data.categoryId || null)
  }

  if (data.status !== undefined) {
    setClauses.push('status = ?')
    bindValues.push(data.status)

    // 如果从非发布状态变为发布状态，且没有发布时间，则设置当前时间
    if (data.status === 'published' && existing.status !== 'published') {
      setClauses.push('published_at = ?')
      bindValues.push(data.publishedAt || new Date().toISOString())
    }
  }

  if (data.visibility !== undefined) {
    setClauses.push('visibility = ?')
    bindValues.push(data.visibility)
  }

  if (data.password !== undefined) {
    setClauses.push('password = ?')
    bindValues.push(data.password || null)
  }

  if (data.isPinned !== undefined) {
    setClauses.push('is_pinned = ?')
    bindValues.push(data.isPinned ? 1 : 0)
  }

  if (data.allowComment !== undefined) {
    setClauses.push('allow_comment = ?')
    bindValues.push(data.allowComment ? 1 : 0)
  }

  if (data.publishedAt !== undefined) {
    setClauses.push('published_at = ?')
    bindValues.push(data.publishedAt || null)
  }

  // 总是更新 updated_at
  setClauses.push("updated_at = datetime('now')")

  if (setClauses.length > 1) { // 至少有 updated_at 之外的字段
    const updateQuery = `UPDATE posts SET ${setClauses.join(', ')} WHERE id = ?`
    bindValues.push(id)
    await db.prepare(updateQuery).bind(...bindValues).run()
  }

  // 处理标签关联更新
  if (data.tagIds !== undefined) {
    // 先删除旧的标签关联
    await db.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run()

    // 插入新的标签关联
    for (const tagId of data.tagIds) {
      await db
        .prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)')
        .bind(id, tagId)
        .run()
    }
  }

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onPostChanged(data.slug || existing.slug)

  return getPostById(db, id)
}

/**
 * 删除文章
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param id - 文章 ID
 */
export async function deletePost(db: D1Database, kv: KVNamespace, id: string) {
  // 检查文章是否存在
  const existing = await db
    .prepare('SELECT id, slug FROM posts WHERE id = ?')
    .bind(id)
    .first<{ id: string; slug: string }>()

  if (!existing) {
    throw new NotFoundError('文章')
  }

  // 删除标签关联（post_tags 的 ON DELETE CASCADE 应该会自动处理，但显式删除更安全）
  await db.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run()

  // 删除文章
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onPostChanged(existing.slug)
}

/**
 * 变更文章状态
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param id - 文章 ID
 * @param status - 新状态
 * @returns 更新后的文章
 */
export async function changePostStatus(
  db: D1Database,
  kv: KVNamespace,
  id: string,
  status: 'published' | 'draft' | 'archived'
) {
  const existing = await db
    .prepare('SELECT id, slug, status, published_at FROM posts WHERE id = ?')
    .bind(id)
    .first<{ id: string; slug: string; status: string; published_at: string | null }>()

  if (!existing) {
    throw new NotFoundError('文章')
  }

  // 如果从非发布状态变为发布状态，设置发布时间
  const publishedAt = status === 'published' && existing.status !== 'published' && !existing.published_at
    ? new Date().toISOString()
    : existing.published_at

  await db
    .prepare('UPDATE posts SET status = ?, published_at = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(status, publishedAt, id)
    .run()

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onPostChanged(existing.slug)

  return getPostById(db, id)
}

/**
 * 切换文章置顶状态
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param id - 文章 ID
 * @returns 更新后的文章
 */
export async function togglePostPin(db: D1Database, kv: KVNamespace, id: string) {
  const existing = await db
    .prepare('SELECT id, slug, is_pinned FROM posts WHERE id = ?')
    .bind(id)
    .first<{ id: string; slug: string; is_pinned: number }>()

  if (!existing) {
    throw new NotFoundError('文章')
  }

  const newPinned = existing.is_pinned === 1 ? 0 : 1

  await db
    .prepare("UPDATE posts SET is_pinned = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(newPinned, id)
    .run()

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onPostChanged(existing.slug)

  return getPostById(db, id)
}
