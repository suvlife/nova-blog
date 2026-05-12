/**
 * 应用常量配置
 * 包含 Token 过期时间、文件上传限制、分页默认值等
 */

/** Token 过期时间配置 */
export const TOKEN_EXPIRY = {
  /** Access Token 有效期：15 分钟（单位：秒） */
  ACCESS: 15 * 60,
  /** Refresh Token 有效期：7 天（单位：秒） */
  REFRESH: 7 * 24 * 60 * 60,
} as const

/** 允许上传的图片 MIME 类型 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
] as const

/** 允许上传的文件 MIME 类型（包含图片和文档） */
export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/zip',
  'text/markdown',
  'text/plain',
] as const

/** 最大上传文件大小（字节），默认 10MB */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

/** 分页默认值 */
export const PAGINATION_DEFAULTS = {
  /** 默认页码 */
  PAGE: 1,
  /** 默认每页条数 */
  PER_PAGE: 10,
  /** 最大每页条数 */
  MAX_PER_PAGE: 100,
} as const

/** 缓存 TTL 配置（单位：秒） */
export const CACHE_TTL = {
  /** 文章列表缓存：5 分钟 */
  POST_LIST: 5 * 60,
  /** 文章详情缓存：10 分钟 */
  POST_DETAIL: 10 * 60,
  /** 分类列表缓存：30 分钟 */
  CATEGORIES: 30 * 60,
  /** 标签列表缓存：30 分钟 */
  TAGS: 30 * 60,
  /** 站点设置缓存：1 小时 */
  SETTINGS: 60 * 60,
  /** 站点统计缓存：5 分钟 */
  STATS: 5 * 60,
  /** Sitemap 缓存：1 小时 */
  SITEMAP: 60 * 60,
  /** RSS Feed 缓存：10 分钟 */
  FEED: 10 * 60,
} as const

/** 速率限制配置 */
export const RATE_LIMIT = {
  /** 登录接口：5 次/分钟 */
  LOGIN_MAX: 5,
  LOGIN_WINDOW: 60,
  /** API 全局：100 次/10 秒 */
  API_MAX: 100,
  API_WINDOW: 10,
} as const

/** JWT 相关常量 */
export const JWT = {
  /** JWT 签发者 */
  ISSUER: 'nova-blog-api',
  /** JWT 受众 */
  AUDIENCE: 'nova-blog',
} as const

/** 缓存键前缀 */
export const CACHE_KEYS = {
  /** 文章列表缓存键前缀 */
  POST_LIST: 'posts:list',
  /** 文章详情缓存键前缀 */
  POST_DETAIL: 'posts:detail',
  /** 分类列表缓存键 */
  CATEGORIES: 'categories:all',
  /** 标签列表缓存键 */
  TAGS: 'tags:all',
  /** 站点设置缓存键 */
  SETTINGS: 'settings:site',
  /** 站点统计缓存键 */
  STATS: 'stats:overview',
  /** Sitemap 缓存键 */
  SITEMAP: 'sitemap:xml',
  /** RSS Feed 缓存键 */
  FEED: 'feed:rss',
} as const

/** Token 黑名单 KV 键前缀 */
export const AUTH_KEYS = {
  /** Token 黑名单前缀 */
  TOKEN_BLACKLIST: 'blacklist:token',
  /** 用户会话前缀 */
  USER_SESSION: 'session:user',
  /** 登录失败计数前缀 */
  LOGIN_ATTEMPTS: 'login:attempts',
} as const
