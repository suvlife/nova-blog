/**
 * 缓存工具函数
 * 提供 KV 缓存的读写和失效策略
 */

import { CACHE_KEYS, CACHE_TTL, AUTH_KEYS } from '../config/constants'
import type { PaginationMeta } from '../types/common'

/**
 * 缓存失效器
 * 当数据变更时，自动清除相关的缓存键
 */
export class CacheInvalidator {
  private kv: KVNamespace

  constructor(kv: KVNamespace) {
    this.kv = kv
  }

  /**
   * 文章变更时清除相关缓存
   * 包括文章列表、文章详情、Sitemap、RSS Feed
   * @param slug - 可选的文章 slug，如果提供则同时清除该文章的详情缓存
   */
  async onPostChanged(slug?: string): Promise<void> {
    const keysToDelete = [
      CACHE_KEYS.POST_LIST,
      CACHE_KEYS.SITEMAP,
      CACHE_KEYS.FEED,
      CACHE_KEYS.STATS,
    ]

    // 如果指定了文章 slug，清除该文章的详情缓存
    if (slug) {
      keysToDelete.push(`posts:detail:${slug}` as any)
    }

    await Promise.allSettled(
      keysToDelete.map(key => this.kv.delete(key))
    )
  }

  /**
   * 分类变更时清除相关缓存
   * 包括分类列表、文章列表（因为文章可能关联分类）
   */
  async onCategoryChanged(): Promise<void> {
    const keysToDelete = [
      CACHE_KEYS.CATEGORIES,
      CACHE_KEYS.POST_LIST,
      CACHE_KEYS.SITEMAP,
    ]

    await Promise.allSettled(
      keysToDelete.map(key => this.kv.delete(key))
    )
  }

  /**
   * 标签变更时清除相关缓存
   * 包括标签列表、文章列表（因为文章可能关联标签）
   */
  async onTagChanged(): Promise<void> {
    const keysToDelete = [
      CACHE_KEYS.TAGS,
      CACHE_KEYS.POST_LIST,
      CACHE_KEYS.SITEMAP,
    ]

    await Promise.allSettled(
      keysToDelete.map(key => this.kv.delete(key))
    )
  }

  /**
   * 站点设置变更时清除相关缓存
   */
  async onSettingsChanged(): Promise<void> {
    const keysToDelete = [
      CACHE_KEYS.SETTINGS,
      CACHE_KEYS.SITEMAP,
      CACHE_KEYS.FEED,
    ]

    await Promise.allSettled(
      keysToDelete.map(key => this.kv.delete(key))
    )
  }

  /**
   * 清除所有缓存
   * 用于紧急情况或全量更新后
   */
  async clearAll(): Promise<void> {
    const allKeys = Object.values(CACHE_KEYS)
    await Promise.allSettled(
      allKeys.map(key => this.kv.delete(key))
    )
  }
}

/**
 * 通用缓存读取模式（Cache-Aside）
 * 先尝试从 KV 读取缓存，未命中则执行数据获取函数并写入缓存
 * @param kv - KV 命名空间实例
 * @param key - 缓存键
 * @param ttl - 缓存过期时间（秒）
 * @param fetcher - 数据获取函数（缓存未命中时调用）
 * @returns 缓存或新获取的数据
 */
export async function cacheAside<T>(
  kv: KVNamespace,
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 尝试从缓存读取
  const cached = await kv.get(key, 'text')
  if (cached) {
    try {
      return JSON.parse(cached) as T
    } catch {
      // 缓存数据损坏，继续获取新数据
    }
  }

  // 缓存未命中，获取新数据
  const data = await fetcher()

  // 异步写入缓存（不阻塞响应）
  kv.put(key, JSON.stringify(data), { expirationTtl: ttl }).catch(() => {
    // 缓存写入失败不影响业务逻辑
  })

  return data
}

/**
 * 构造带分页参数的缓存键
 * 确保不同分页参数有不同的缓存
 * @param prefix - 缓存键前缀
 * @param pagination - 分页参数
 * @param extra - 额外的键组成部分
 * @returns 完整的缓存键
 */
export function buildPaginatedCacheKey(
  prefix: string,
  pagination: { page: number; perPage: number },
  extra?: Record<string, string>
): string {
  const parts = [prefix, `p${pagination.page}`, `s${pagination.perPage}`]

  if (extra) {
    const extraParts = Object.entries(extra)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
    parts.push(...extraParts)
  }

  return parts.join(':')
}

/**
 * 将 Token 加入黑名单
 * @param kv - 认证 KV 命名空间
 * @param jti - Token 的唯一标识
 * @param ttl - 黑名单保留时间（秒），应大于 Token 有效期
 */
export async function blacklistToken(kv: KVNamespace, jti: string, ttl: number): Promise<void> {
  await kv.put(`${AUTH_KEYS.TOKEN_BLACKLIST}:${jti}`, '1', { expirationTtl: ttl })
}

/**
 * 检查 Token 是否在黑名单中
 * @param kv - 认证 KV 命名空间
 * @param jti - Token 的唯一标识
 * @returns 是否已被吊销
 */
export async function isTokenBlacklisted(kv: KVNamespace, jti: string): Promise<boolean> {
  const value = await kv.get(`${AUTH_KEYS.TOKEN_BLACKLIST}:${jti}`)
  return value !== null
}
