/**
 * 分类业务逻辑服务
 * 处理分类的 CRUD、树形构建、排序等核心逻辑
 */

import { generateSlug, ensureUniqueSlug } from '../utils'
import { CacheInvalidator } from '../utils/cache'
import { NotFoundError, ValidationError } from '../middleware/error-handler'

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

/** 分类树节点类型 */
export interface CategoryTreeNode {
  id: string
  name: string
  slug: string
  description: string
  parentId: string | null
  sortOrder: number
  postCount: number
  createdAt: string
  updatedAt: string
  children: CategoryTreeNode[]
}

/**
 * 获取所有分类（平铺列表，含文章数统计）
 * @param db - D1 数据库实例
 * @returns 分类列表
 */
export async function listCategories(db: D1Database) {
  const categories = await db
    .prepare(
      `SELECT c.*, COUNT(p.id) as post_count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.created_at ASC`
    )
    .all<CategoryRecord & { post_count: number }>()

  return (categories.results || []).map(c => ({
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
}

/**
 * 获取分类树（递归构建父子关系）
 * @param db - D1 数据库实例
 * @returns 分类树
 */
export async function getCategoryTree(db: D1Database): Promise<CategoryTreeNode[]> {
  const allCategories = await listCategories(db)

  // 构建节点映射
  const nodeMap = new Map<string, CategoryTreeNode>()
  for (const cat of allCategories) {
    nodeMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      postCount: cat.postCount,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      children: [],
    })
  }

  // 构建树形结构
  const roots: CategoryTreeNode[] = []
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * 按 slug 获取分类
 * @param db - D1 数据库实例
 * @param slug - 分类 slug
 * @returns 分类详情
 */
export async function getCategoryBySlug(db: D1Database, slug: string) {
  const category = await db
    .prepare(
      `SELECT c.*, COUNT(p.id) as post_count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
       WHERE c.slug = ?
       GROUP BY c.id`
    )
    .bind(slug)
    .first<CategoryRecord & { post_count: number }>()

  if (!category) {
    throw new NotFoundError('分类')
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    parentId: category.parent_id || null,
    sortOrder: category.sort_order,
    postCount: category.post_count || 0,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  }
}

/**
 * 获取单个分类
 * @param db - D1 数据库实例
 * @param id - 分类 ID
 * @returns 分类详情
 */
export async function getCategoryById(db: D1Database, id: string) {
  const category = await db
    .prepare(
      `SELECT c.*, COUNT(p.id) as post_count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
       WHERE c.id = ?
       GROUP BY c.id`
    )
    .bind(id)
    .first<CategoryRecord & { post_count: number }>()

  if (!category) {
    throw new NotFoundError('分类')
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    parentId: category.parent_id || null,
    sortOrder: category.sort_order,
    postCount: category.post_count || 0,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  }
}

/**
 * 创建分类
 * @param db - D1 数据库实例
 * @param data - 分类数据
 * @returns 创建后的分类
 */
export async function createCategory(
  db: D1Database,
  data: {
    name: string
    slug?: string
    description?: string
    parentId?: string
    sortOrder?: number
  }
) {
  const id = crypto.randomUUID()

  // 生成 slug
  let slug = data.slug || generateSlug(data.name)
  if (!slug) {
    slug = `category-${Date.now()}`
  }

  // 确保 slug 唯一
  const existingSlugs = await db
    .prepare('SELECT slug FROM categories WHERE slug LIKE ?')
    .bind(`${slug}%`)
    .all<{ slug: string }>()
  slug = ensureUniqueSlug(slug, (existingSlugs.results || []).map(r => r.slug))

  // 如果指定了父分类，检查父分类是否存在
  if (data.parentId) {
    const parent = await db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .bind(data.parentId)
      .first<{ id: string }>()

    if (!parent) {
      throw new ValidationError('父分类不存在')
    }
  }

  await db
    .prepare(
      `INSERT INTO categories (id, name, slug, description, parent_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      id,
      data.name,
      slug,
      data.description || '',
      data.parentId || null,
      data.sortOrder || 0
    )
    .run()

  return getCategoryById(db, id)
}

/**
 * 更新分类
 * @param db - D1 数据库实例
 * @param id - 分类 ID
 * @param data - 更新数据
 * @returns 更新后的分类
 */
export async function updateCategory(
  db: D1Database,
  id: string,
  data: {
    name?: string
    slug?: string
    description?: string
    parentId?: string | null
    sortOrder?: number
  }
) {
  // 检查分类是否存在
  const existing = await db
    .prepare('SELECT id, slug FROM categories WHERE id = ?')
    .bind(id)
    .first<{ id: string; slug: string }>()

  if (!existing) {
    throw new NotFoundError('分类')
  }

  // 构建动态更新语句
  const setClauses: string[] = []
  const bindValues: unknown[] = []

  if (data.name !== undefined) {
    setClauses.push('name = ?')
    bindValues.push(data.name)
  }

  if (data.slug !== undefined) {
    // 检查 slug 是否已被其他分类使用
    const slugOwner = await db
      .prepare('SELECT id FROM categories WHERE slug = ? AND id != ?')
      .bind(data.slug, id)
      .first<{ id: string }>()

    if (slugOwner) {
      throw new ValidationError('该 Slug 已被其他分类使用')
    }
    setClauses.push('slug = ?')
    bindValues.push(data.slug)
  }

  if (data.description !== undefined) {
    setClauses.push('description = ?')
    bindValues.push(data.description)
  }

  if (data.parentId !== undefined) {
    // 防止将分类设置为自己的子分类（循环引用）
    if (data.parentId === id) {
      throw new ValidationError('不能将分类设置为自己的子分类')
    }
    setClauses.push('parent_id = ?')
    bindValues.push(data.parentId || null)
  }

  if (data.sortOrder !== undefined) {
    setClauses.push('sort_order = ?')
    bindValues.push(data.sortOrder)
  }

  setClauses.push("updated_at = datetime('now')")

  if (setClauses.length > 1) {
    const updateQuery = `UPDATE categories SET ${setClauses.join(', ')} WHERE id = ?`
    bindValues.push(id)
    await db.prepare(updateQuery).bind(...bindValues).run()
  }

  return getCategoryById(db, id)
}

/**
 * 删除分类
 * 子分类的 parent_id 置 NULL
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param id - 分类 ID
 */
export async function deleteCategory(db: D1Database, kv: KVNamespace, id: string) {
  // 检查分类是否存在
  const existing = await db
    .prepare('SELECT id FROM categories WHERE id = ?')
    .bind(id)
    .first<{ id: string }>()

  if (!existing) {
    throw new NotFoundError('分类')
  }

  // 将子分类的 parent_id 置 NULL
  await db
    .prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?')
    .bind(id)
    .run()

  // 将关联文章的 category_id 置 NULL
  await db
    .prepare('UPDATE posts SET category_id = NULL WHERE category_id = ?')
    .bind(id)
    .run()

  // 删除分类
  await db
    .prepare('DELETE FROM categories WHERE id = ?')
    .bind(id)
    .run()

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onCategoryChanged()
}

/**
 * 批量调整分类排序
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param items - 排序项列表 [{ id, sortOrder }]
 */
export async function batchSortCategories(
  db: D1Database,
  kv: KVNamespace,
  items: Array<{ id: string; sortOrder: number }>
) {
  // 使用事务批量更新排序
  const stmts = items.map(item =>
    db
      .prepare("UPDATE categories SET sort_order = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(item.sortOrder, item.id)
  )

  await db.batch(stmts)

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onCategoryChanged()
}
