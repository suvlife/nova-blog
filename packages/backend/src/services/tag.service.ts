/**
 * 标签业务逻辑服务
 * 处理标签的 CRUD、文章数统计等核心逻辑
 */

import { generateSlug, ensureUniqueSlug } from '../utils'
import { CacheInvalidator } from '../utils/cache'
import { NotFoundError, ValidationError } from '../middleware/error-handler'

/** 标签数据库记录类型 */
interface TagRecord {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

/** 标签（含文章数） */
interface TagWithCount extends TagRecord {
  post_count: number
}

/**
 * 获取所有标签（含文章数统计）
 * @param db - D1 数据库实例
 * @returns 标签列表
 */
export async function listTags(db: D1Database) {
  const tags = await db
    .prepare(
      `SELECT t.*, COUNT(pt.post_id) as post_count
       FROM tags t
       LEFT JOIN post_tags pt ON t.id = pt.tag_id
       LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published'
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    )
    .all<TagWithCount>()

  return (tags.results || []).map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    postCount: t.post_count || 0,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }))
}

/**
 * 获取单个标签
 * @param db - D1 数据库实例
 * @param id - 标签 ID
 * @returns 标签详情
 */
export async function getTagById(db: D1Database, id: string) {
  const tag = await db
    .prepare(
      `SELECT t.*, COUNT(pt.post_id) as post_count
       FROM tags t
       LEFT JOIN post_tags pt ON t.id = pt.tag_id
       LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published'
       WHERE t.id = ?
       GROUP BY t.id`
    )
    .bind(id)
    .first<TagWithCount>()

  if (!tag) {
    throw new NotFoundError('标签')
  }

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    postCount: tag.post_count || 0,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  }
}

/**
 * 按 slug 获取标签
 * @param db - D1 数据库实例
 * @param slug - 标签 slug
 * @returns 标签详情
 */
export async function getTagBySlug(db: D1Database, slug: string) {
  const tag = await db
    .prepare(
      `SELECT t.*, COUNT(pt.post_id) as post_count
       FROM tags t
       LEFT JOIN post_tags pt ON t.id = pt.tag_id
       LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published'
       WHERE t.slug = ?
       GROUP BY t.id`
    )
    .bind(slug)
    .first<TagWithCount>()

  if (!tag) {
    throw new NotFoundError('标签')
  }

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    postCount: tag.post_count || 0,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  }
}

/**
 * 创建标签
 * @param db - D1 数据库实例
 * @param data - 标签数据
 * @returns 创建后的标签
 */
export async function createTag(
  db: D1Database,
  data: {
    name: string
    slug?: string
  }
) {
  const id = crypto.randomUUID()

  // 生成 slug
  let slug = data.slug || generateSlug(data.name)
  if (!slug) {
    slug = `tag-${Date.now()}`
  }

  // 确保 slug 唯一
  const existingSlugs = await db
    .prepare('SELECT slug FROM tags WHERE slug LIKE ?')
    .bind(`${slug}%`)
    .all<{ slug: string }>()
  slug = ensureUniqueSlug(slug, (existingSlugs.results || []).map(r => r.slug))

  await db
    .prepare(
      `INSERT INTO tags (id, name, slug, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(id, data.name, slug)
    .run()

  return getTagById(db, id)
}

/**
 * 更新标签
 * @param db - D1 数据库实例
 * @param id - 标签 ID
 * @param data - 更新数据
 * @returns 更新后的标签
 */
export async function updateTag(
  db: D1Database,
  id: string,
  data: {
    name?: string
    slug?: string
  }
) {
  // 检查标签是否存在
  const existing = await db
    .prepare('SELECT id, slug FROM tags WHERE id = ?')
    .bind(id)
    .first<{ id: string; slug: string }>()

  if (!existing) {
    throw new NotFoundError('标签')
  }

  // 构建动态更新语句
  const setClauses: string[] = []
  const bindValues: unknown[] = []

  if (data.name !== undefined) {
    setClauses.push('name = ?')
    bindValues.push(data.name)
  }

  if (data.slug !== undefined) {
    // 检查 slug 是否已被其他标签使用
    const slugOwner = await db
      .prepare('SELECT id FROM tags WHERE slug = ? AND id != ?')
      .bind(data.slug, id)
      .first<{ id: string }>()

    if (slugOwner) {
      throw new ValidationError('该 Slug 已被其他标签使用')
    }
    setClauses.push('slug = ?')
    bindValues.push(data.slug)
  }

  setClauses.push("updated_at = datetime('now')")

  if (setClauses.length > 1) {
    const updateQuery = `UPDATE tags SET ${setClauses.join(', ')} WHERE id = ?`
    bindValues.push(id)
    await db.prepare(updateQuery).bind(...bindValues).run()
  }

  return getTagById(db, id)
}

/**
 * 删除标签
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param id - 标签 ID
 */
export async function deleteTag(db: D1Database, kv: KVNamespace, id: string) {
  // 检查标签是否存在
  const existing = await db
    .prepare('SELECT id FROM tags WHERE id = ?')
    .bind(id)
    .first<{ id: string }>()

  if (!existing) {
    throw new NotFoundError('标签')
  }

  // 删除标签关联（post_tags 的 ON DELETE CASCADE 应该会自动处理）
  await db.prepare('DELETE FROM post_tags WHERE tag_id = ?').bind(id).run()

  // 删除标签
  await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run()

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onTagChanged()
}
