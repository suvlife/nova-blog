/**
 * 认证业务逻辑服务
 * 处理用户登录、Token 刷新、登出、密码修改等核心认证逻辑
 */

import type { Bindings } from '../types/env.d'
import type {
  LoginResponse,
  AuthUserResponse,
  RefreshResponse,
} from '../types/auth'
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  generateJti,
  hashPassword,
  verifyPassword,
  blacklistToken,
  isTokenBlacklisted,
} from '../utils'
import { TOKEN_EXPIRY, AUTH_KEYS } from '../config/constants'
import { AppError, UnauthorizedError, ValidationError } from '../middleware/error-handler'

/**
 * 用户数据库记录类型
 */
interface UserRecord {
  id: number
  username: string
  password_hash: string
  role: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

/**
 * 用户登录
 * 验证用户名和密码，生成双 Token（Access + Refresh）
 * @param db - D1 数据库实例
 * @param authKv - 认证 KV 命名空间
 * @param jwtSecret - JWT 密钥
 * @param username - 用户名
 * @param password - 密码
 * @returns 登录响应（含 Token 和用户信息）
 */
export async function login(
  db: D1Database,
  authKv: KVNamespace,
  jwtSecret: string,
  username: string,
  password: string
): Promise<LoginResponse> {
  // 参数校验
  if (!username || !password) {
    throw new ValidationError('用户名和密码不能为空')
  }

  // 查询用户（支持用户名登录）
  const user = await db
    .prepare('SELECT id, username, password_hash, role, display_name, avatar_url FROM users WHERE username = ?')
    .bind(username)
    .first<UserRecord>()

  if (!user) {
    throw new UnauthorizedError('用户名或密码错误')
  }

  // 验证密码
  const isPasswordValid = await verifyPassword(password, user.password_hash)
  if (!isPasswordValid) {
    throw new UnauthorizedError('用户名或密码错误')
  }

  // 生成 Token 标识
  const accessJti = generateJti()
  const refreshJti = generateJti()

  // 签发双 Token
  const accessToken = await signAccessToken(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti: accessJti,
    },
    jwtSecret
  )

  const refreshToken = await signRefreshToken(
    {
      sub: user.id,
      username: user.username,
      jti: refreshJti,
    },
    jwtSecret
  )

  // 在 AUTH KV 中记录用户会话（用于后续批量吊销）
  await authKv.put(
    `${AUTH_KEYS.USER_SESSION}:${user.id}:${refreshJti}`,
    JSON.stringify({
      accessJti,
      refreshJti,
      createdAt: Date.now(),
    }),
    { expirationTtl: TOKEN_EXPIRY.REFRESH }
  )

  return {
    accessToken,
    refreshToken,
    expiresIn: TOKEN_EXPIRY.ACCESS,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    },
  }
}

/**
 * 刷新 Token
 * 验证 Refresh Token 的有效性，生成新的双 Token
 * @param db - D1 数据库实例
 * @param authKv - 认证 KV 命名空间
 * @param jwtSecret - JWT 密钥
 * @param refreshTokenString - Refresh Token 字符串
 * @returns 新的 Token 对
 */
export async function refreshToken(
  db: D1Database,
  authKv: KVNamespace,
  jwtSecret: string,
  refreshTokenString: string
): Promise<RefreshResponse> {
  if (!refreshTokenString) {
    throw new ValidationError('Refresh Token 不能为空')
  }

  try {
    // 验证 Refresh Token
    const payload = await verifyToken(refreshTokenString, jwtSecret)

    // 确认是 Refresh Token
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('请使用 Refresh Token 进行刷新')
    }

    const jti = payload.jti as string
    const userId = Number(payload.sub)
    const username = payload.username as string

    // 检查 Refresh Token 是否已被吊销
    if (jti && await isTokenBlacklisted(authKv, jti)) {
      throw new UnauthorizedError('Refresh Token 已失效，请重新登录')
    }

    // 查询用户是否存在且状态正常
    const user = await db
      .prepare('SELECT id, role FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: number; role: string }>()

    if (!user) {
      throw new UnauthorizedError('用户不存在')
    }

    // 吊销旧的 Refresh Token
    if (jti) {
      await blacklistToken(authKv, jti, TOKEN_EXPIRY.REFRESH)
    }

    // 清除旧的会话记录
    await authKv.delete(`${AUTH_KEYS.USER_SESSION}:${userId}:${jti}`)

    // 生成新的 Token
    const newAccessJti = generateJti()
    const newRefreshJti = generateJti()

    const newAccessToken = await signAccessToken(
      {
        sub: userId,
        username,
        role: user.role,
        jti: newAccessJti,
      },
      jwtSecret
    )

    const newRefreshToken = await signRefreshToken(
      {
        sub: userId,
        username,
        jti: newRefreshJti,
      },
      jwtSecret
    )

    // 记录新的会话
    await authKv.put(
      `${AUTH_KEYS.USER_SESSION}:${userId}:${newRefreshJti}`,
      JSON.stringify({
        accessJti: newAccessJti,
        refreshJti: newRefreshJti,
        createdAt: Date.now(),
      }),
      { expirationTtl: TOKEN_EXPIRY.REFRESH }
    )

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: TOKEN_EXPIRY.ACCESS,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new UnauthorizedError('Refresh Token 无效，请重新登录')
  }
}

/**
 * 用户登出
 * 将当前 Token 加入黑名单
 * @param authKv - 认证 KV 命名空间
 * @param userId - 用户 ID
 * @param jti - Token 的唯一标识
 */
export async function logout(
  authKv: KVNamespace,
  userId: number,
  jti?: string
): Promise<void> {
  if (jti) {
    // 将 Access Token 加入黑名单
    await blacklistToken(authKv, jti, TOKEN_EXPIRY.ACCESS)

    // 清除该 Refresh Token 对应的会话记录
    // 需要遍历该用户的所有会话来找到对应的记录
    const listResult = await authKv.list({
      prefix: `${AUTH_KEYS.USER_SESSION}:${userId}:`,
    })

    for (const key of listResult.keys) {
      const sessionData = await authKv.get(key.name, 'text')
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData)
          if (session.accessJti === jti) {
            // 吊销关联的 Refresh Token
            if (session.refreshJti) {
              await blacklistToken(authKv, session.refreshJti, TOKEN_EXPIRY.REFRESH)
            }
            // 删除会话记录
            await authKv.delete(key.name)
          }
        } catch {
          // 会话数据损坏，删除该记录
          await authKv.delete(key.name)
        }
      }
    }
  }
}

/**
 * 获取当前用户信息
 * @param db - D1 数据库实例
 * @param userId - 用户 ID
 * @returns 用户信息
 */
export async function getCurrentUser(
  db: D1Database,
  userId: number
): Promise<AuthUserResponse> {
  const user = await db
    .prepare('SELECT id, username, role, display_name, avatar_url FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRecord>()

  if (!user) {
    throw new UnauthorizedError('用户不存在')
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
  }
}

/**
 * 修改密码
 * @param db - D1 数据库实例
 * @param userId - 用户 ID
 * @param oldPassword - 旧密码
 * @param newPassword - 新密码
 */
export async function changePassword(
  db: D1Database,
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // 参数校验
  if (!oldPassword || !newPassword) {
    throw new ValidationError('旧密码和新密码不能为空')
  }

  if (newPassword.length < 6) {
    throw new ValidationError('新密码长度不能少于 6 位')
  }

  // 查询用户当前密码
  const user = await db
    .prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .bind(userId)
    .first<Pick<UserRecord, 'id' | 'password_hash'>>()

  if (!user) {
    throw new UnauthorizedError('用户不存在')
  }

  // 验证旧密码
  const isOldPasswordValid = await verifyPassword(oldPassword, user.password_hash)
  if (!isOldPasswordValid) {
    throw new ValidationError('旧密码错误')
  }

  // 哈希新密码
  const newPasswordHash = await hashPassword(newPassword)

  // 更新密码
  await db
    .prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
    .bind(newPasswordHash, userId)
    .run()
}
