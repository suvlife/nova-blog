/**
 * 站点配置业务逻辑服务
 * 处理站点设置的读写和缓存失效
 */

import { CacheInvalidator } from '../utils/cache'
import { CACHE_KEYS, CACHE_TTL } from '../config/constants'
import { NotFoundError } from '../middleware/error-handler'

/** 设置数据库记录类型 */
interface SettingRecord {
  key: string
  value: string
  updated_at: string
}

/**
 * 获取全部配置
 * @param db - D1 数据库实例
 * @returns 配置键值对对象
 */
export async function getAllSettings(db: D1Database) {
  const settings = await db
    .prepare('SELECT key, value, updated_at FROM settings ORDER BY key')
    .all<SettingRecord>()

  // 转为键值对对象
  const result: Record<string, { value: string; updatedAt: string }> = {}
  for (const s of (settings.results || [])) {
    result[s.key] = {
      value: s.value,
      updatedAt: s.updated_at,
    }
  }

  return result
}

/**
 * 获取单项配置
 * @param db - D1 数据库实例
 * @param key - 配置键
 * @returns 配置值
 */
export async function getSetting(db: D1Database, key: string) {
  const setting = await db
    .prepare('SELECT key, value, updated_at FROM settings WHERE key = ?')
    .bind(key)
    .first<SettingRecord>()

  if (!setting) {
    throw new NotFoundError('配置项')
  }

  return {
    key: setting.key,
    value: setting.value,
    updatedAt: setting.updated_at,
  }
}

/**
 * 批量更新配置
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param data - 配置键值对
 * @returns 更新后的全部配置
 */
export async function updateSettings(
  db: D1Database,
  kv: KVNamespace,
  data: Record<string, string>
) {
  // 使用 INSERT OR REPLACE 逐项更新
  const stmts = Object.entries(data).map(([key, value]) =>
    db
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .bind(key, value)
  )

  if (stmts.length > 0) {
    await db.batch(stmts)
  }

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onSettingsChanged()

  return getAllSettings(db)
}

/**
 * 更新单项配置
 * @param db - D1 数据库实例
 * @param kv - 缓存 KV 命名空间
 * @param key - 配置键
 * @param value - 配置值
 * @returns 更新后的配置
 */
export async function updateSetting(
  db: D1Database,
  kv: KVNamespace,
  key: string,
  value: string
) {
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(key, value)
    .run()

  // 失效缓存
  const invalidator = new CacheInvalidator(kv)
  await invalidator.onSettingsChanged()

  return getSetting(db, key)
}

/**
 * 获取前台需要的配置（过滤敏感信息）
 * 只返回前台展示所需的配置项
 * @param db - D1 数据库实例
 * @returns 前台配置
 */
export async function getPublicSettings(db: D1Database) {
  // 前台允许暴露的配置键
  const publicKeys = [
    'site_title',
    'site_description',
    'site_url',
    'site_logo',
    'site_favicon',
    'site_footer',
    'post_per_page',
    'seo_keywords',
    'seo_description',
    'social_github',
    'social_twitter',
    'social_weibo',
    'social_email',
    'comment_enabled',
    'analytics_code',
  ]

  const placeholders = publicKeys.map(() => '?').join(',')
  const settings = await db
    .prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`)
    .bind(...publicKeys)
    .all<SettingRecord>()

  // 转为键值对对象
  const result: Record<string, string> = {}
  for (const s of (settings.results || [])) {
    result[s.key] = s.value
  }

  return result
}
