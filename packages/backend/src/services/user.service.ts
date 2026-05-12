/**
 * 用户业务逻辑服务
 * 处理用户的 CRUD、密码哈希、角色变更等核心逻辑
 */

import { hashPassword } from '../utils/password'
import { NotFoundError, ValidationError, ForbiddenError } from '../middleware/error-handler'

/** 用户数据库记录类型 */
interface UserRecord {
  id: string
  username: string
  email: string
  password_hash: string
  display_name: string
  avatar_url: string | null
  role: string
  status: string
  last_login_at: string | null
  created_at: string
  updated_at: string
}

/**
 * 获取用户列表
 * @param db - D1 数据库实例
 * @returns 用户列表（不含密码哈希）
 */
export async function listUsers(db: D1Database) {
  const users = await db
    .prepare(
      `SELECT id, username, email, display_name, avatar_url, role, status, last_login_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    )
    .all<Omit<UserRecord, 'password_hash'>>()

  return (users.results || []).map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.display_name,
    avatarUrl: u.avatar_url || null,
    role: u.role,
    status: u.status,
    lastLoginAt: u.last_login_at || null,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }))
}

/**
 * 获取单个用户
 * @param db - D1 数据库实例
 * @param id - 用户 ID
 * @returns 用户详情（不含密码哈希）
 */
export async function getUserById(db: D1Database, id: string) {
  const user = await db
    .prepare(
      `SELECT id, username, email, display_name, avatar_url, role, status, last_login_at, created_at, updated_at
       FROM users WHERE id = ?`
    )
    .bind(id)
    .first<Omit<UserRecord, 'password_hash'>>()

  if (!user) {
    throw new NotFoundError('用户')
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url || null,
    role: user.role,
    status: user.status,
    lastLoginAt: user.last_login_at || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }
}

/**
 * 创建用户
 * @param db - D1 数据库实例
 * @param data - 用户数据
 * @returns 创建后的用户
 */
export async function createUser(
  db: D1Database,
  data: {
    username: string
    email: string
    password: string
    displayName?: string
    role?: string
  }
) {
  // 检查用户名是否已存在
  const existingUsername = await db
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind(data.username)
    .first<{ id: string }>()

  if (existingUsername) {
    throw new ValidationError('用户名已存在')
  }

  // 检查邮箱是否已存在
  const existingEmail = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(data.email)
    .first<{ id: string }>()

  if (existingEmail) {
    throw new ValidationError('邮箱已存在')
  }

  // 哈希密码
  const passwordHash = await hashPassword(data.password)

  const id = crypto.randomUUID()
  const role = data.role || 'author'

  await db
    .prepare(
      `INSERT INTO users (id, username, email, password_hash, display_name, avatar_url, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', ?, 'active', datetime('now'), datetime('now'))`
    )
    .bind(id, data.username, data.email, passwordHash, data.displayName || data.username, role)
    .run()

  return getUserById(db, id)
}

/**
 * 更新用户
 * @param db - D1 数据库实例
 * @param id - 用户 ID
 * @param data - 更新数据
 * @returns 更新后的用户
 */
export async function updateUser(
  db: D1Database,
  id: string,
  data: {
    email?: string
    displayName?: string
    avatarUrl?: string
  }
) {
  // 检查用户是否存在
  const existing = await db
    .prepare('SELECT id FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: string }>()

  if (!existing) {
    throw new NotFoundError('用户')
  }

  // 构建动态更新语句
  const setClauses: string[] = []
  const bindValues: unknown[] = []

  if (data.email !== undefined) {
    // 检查邮箱是否已被其他用户使用
    const emailOwner = await db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(data.email, id)
      .first<{ id: string }>()

    if (emailOwner) {
      throw new ValidationError('该邮箱已被其他用户使用')
    }
    setClauses.push('email = ?')
    bindValues.push(data.email)
  }

  if (data.displayName !== undefined) {
    setClauses.push('display_name = ?')
    bindValues.push(data.displayName)
  }

  if (data.avatarUrl !== undefined) {
    setClauses.push('avatar_url = ?')
    bindValues.push(data.avatarUrl)
  }

  setClauses.push("updated_at = datetime('now')")

  if (setClauses.length > 1) {
    const updateQuery = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    bindValues.push(id)
    await db.prepare(updateQuery).bind(...bindValues).run()
  }

  return getUserById(db, id)
}

/**
 * 删除用户（软删除，将 status 设为 disabled）
 * @param db - D1 数据库实例
 * @param id - 用户 ID
 */
export async function deleteUser(db: D1Database, id: string) {
  // 检查用户是否存在
  const existing = await db
    .prepare('SELECT id, role, status FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: string; role: string; status: string }>()

  if (!existing) {
    throw new NotFoundError('用户')
  }

  // 不允许禁用自己
  if (existing.status === 'disabled') {
    throw new ValidationError('该用户已被禁用')
  }

  // 软删除：设置 status 为 disabled
  await db
    .prepare("UPDATE users SET status = 'disabled', updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run()
}

/**
 * 变更用户角色
 * @param db - D1 数据库实例
 * @param id - 用户 ID
 * @param role - 新角色
 * @returns 更新后的用户
 */
export async function changeUserRole(db: D1Database, id: string, role: string) {
  // 检查用户是否存在
  const existing = await db
    .prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(id)
    .first<{ id: string; role: string }>()

  if (!existing) {
    throw new NotFoundError('用户')
  }

  // 校验角色值
  const validRoles = ['admin', 'editor', 'author']
  if (!validRoles.includes(role)) {
    throw new ValidationError(`无效的角色: ${role}，允许的角色: ${validRoles.join(', ')}`)
  }

  await db
    .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(role, id)
    .run()

  return getUserById(db, id)
}
