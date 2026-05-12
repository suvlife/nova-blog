/**
 * Cloudflare Worker 环境绑定类型定义
 * 包含 D1 数据库、R2 存储、KV 命名空间以及所有环境变量
 */
export interface Bindings {
  // D1 数据库绑定
  DB: D1Database

  // R2 对象存储绑定（用于文件上传）
  STORAGE: R2Bucket

  // 缓存 KV 命名空间（用于 API 响应缓存）
  CACHE: KVNamespace

  // 认证 KV 命名空间（用于 Token 黑名单和会话管理）
  AUTH: KVNamespace

  // 环境变量
  ENVIRONMENT: 'development' | 'staging' | 'production'
  CORS_ORIGIN: string
  MAX_UPLOAD_SIZE_MB: string

  // 敏感配置（从 .dev.vars 或 Secrets 读取）
  JWT_SECRET: string
  ADMIN_PASSWORD: string
}

/**
 * Hono 应用的变量类型
 * 在中间件中注入的上下文变量
 */
export interface Variables {
  user: AuthUser | null
  requestId: string
  /** 校验后的请求体数据（由 validate 中间件注入） */
  validatedBody: unknown
  /** 校验后的查询参数（由 validateQuery 中间件注入） */
  validatedQuery: unknown
}

/**
 * 认证用户信息（从 JWT 解析后注入到上下文）
 */
export interface AuthUser {
  id: number
  username: string
  role: UserRole
  jti?: string
}

/**
 * 用户角色枚举
 */
export type UserRole = 'admin' | 'editor' | 'author'

/**
 * Hono 应用环境类型
 */
export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
