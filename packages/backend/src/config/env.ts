/**
 * 环境变量安全访问工具
 * 从 Cloudflare Worker env 中获取配置，提供类型安全的访问方式
 */

import type { Bindings } from '../types/env.d'

/**
 * 获取环境配置对象
 * 对 Worker env 进行封装，提供类型安全的配置访问
 * @param env - Cloudflare Worker 环境绑定
 * @returns 类型安全的配置对象
 */
export function getEnv(env: Bindings) {
  return {
    /** 当前运行环境 */
    environment: env.ENVIRONMENT ?? 'development',

    /** 是否为生产环境 */
    isProduction: env.ENVIRONMENT === 'production',

    /** 是否为开发环境 */
    isDevelopment: env.ENVIRONMENT === 'development',

    /** JWT 密钥 */
    jwtSecret: env.JWT_SECRET,

    /** 管理员初始密码 */
    adminPassword: env.ADMIN_PASSWORD,

    /** CORS 允许的来源域名 */
    corsOrigin: env.CORS_ORIGIN ?? '*',

    /** 最大上传文件大小（MB） */
    maxUploadSizeMB: parseInt(env.MAX_UPLOAD_SIZE_MB ?? '10', 10),

    /** 最大上传文件大小（字节） */
    maxUploadSizeBytes: parseInt(env.MAX_UPLOAD_SIZE_MB ?? '10', 10) * 1024 * 1024,

    /** D1 数据库实例 */
    db: env.DB,

    /** R2 存储桶实例 */
    storage: env.STORAGE,

    /** 缓存 KV 命名空间 */
    cache: env.CACHE,

    /** 认证 KV 命名空间 */
    auth: env.AUTH,
  }
}

/** 环境配置对象类型 */
export type EnvConfig = ReturnType<typeof getEnv>
