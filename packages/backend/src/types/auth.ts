/**
 * 认证相关类型定义
 * 包含 JWT Payload、Token 对、登录请求/响应等类型
 */

/** Access Token 的 Payload 结构 */
export interface AccessPayload {
  /** 用户 ID */
  sub: number
  /** 用户名 */
  username: string
  /** 用户角色 */
  role: string
  /** Token 唯一标识（用于吊销） */
  jti: string
  /** 签发时间 */
  iat: number
  /** 过期时间 */
  exp: number
  /** Token 类型标识 */
  type: 'access'
}

/** Refresh Token 的 Payload 结构 */
export interface RefreshPayload {
  /** 用户 ID */
  sub: number
  /** 用户名 */
  username: string
  /** Token 唯一标识（用于吊销） */
  jti: string
  /** 签发时间 */
  iat: number
  /** 过期时间 */
  exp: number
  /** Token 类型标识 */
  type: 'refresh'
}

/** 登录请求参数 */
export interface LoginRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/** 登录成功响应 */
export interface LoginResponse {
  /** Access Token */
  accessToken: string
  /** Refresh Token */
  refreshToken: string
  /** Access Token 过期时间（秒） */
  expiresIn: number
  /** 用户信息 */
  user: AuthUserResponse
}

/** 认证用户响应 */
export interface AuthUserResponse {
  /** 用户 ID */
  id: number
  /** 用户名 */
  username: string
  /** 角色 */
  role: string
  /** 显示名称 */
  displayName: string
  /** 头像 URL */
  avatarUrl: string | null
}

/** 刷新 Token 请求参数 */
export interface RefreshRequest {
  /** Refresh Token */
  refreshToken: string
}

/** 刷新 Token 响应 */
export interface RefreshResponse {
  /** 新的 Access Token */
  accessToken: string
  /** 新的 Refresh Token */
  refreshToken: string
  /** Access Token 过期时间（秒） */
  expiresIn: number
}

/** 修改密码请求参数 */
export interface ChangePasswordRequest {
  /** 旧密码 */
  oldPassword: string
  /** 新密码 */
  newPassword: string
}
