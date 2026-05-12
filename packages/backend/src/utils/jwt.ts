/**
 * JWT 工具函数
 * 使用 jose 库实现 Token 的签发和验证
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { TOKEN_EXPIRY, JWT } from '../config/constants'
import type { AccessPayload, RefreshPayload } from '../types/auth'

/**
 * 签发 Access Token
 * @param payload - Access Token 的负载数据
 * @param secret - JWT 密钥
 * @returns 签名后的 JWT 字符串
 */
export async function signAccessToken(
  payload: Omit<AccessPayload, 'iat' | 'exp' | 'type'>,
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)

  return new SignJWT({
    sub: String(payload.sub),
    username: payload.username,
    role: payload.role,
    jti: payload.jti,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT.ISSUER)
    .setAudience(JWT.AUDIENCE)
    .setJti(payload.jti)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY.ACCESS} seconds`)
    .sign(secretKey)
}

/**
 * 签发 Refresh Token
 * @param payload - Refresh Token 的负载数据
 * @param secret - JWT 密钥
 * @returns 签名后的 JWT 字符串
 */
export async function signRefreshToken(
  payload: Omit<RefreshPayload, 'iat' | 'exp' | 'type'>,
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)

  return new SignJWT({
    sub: String(payload.sub),
    username: payload.username,
    jti: payload.jti,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT.ISSUER)
    .setAudience(JWT.AUDIENCE)
    .setJti(payload.jti)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY.REFRESH} seconds`)
    .sign(secretKey)
}

/**
 * 验证 Token 有效性
 * @param token - 待验证的 JWT 字符串
 * @param secret - JWT 密钥
 * @returns 解码后的 Payload
 * @throws Token 过期或无效时抛出异常
 */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const secretKey = new TextEncoder().encode(secret)

  const { payload } = await jwtVerify(token, secretKey, {
    issuer: JWT.ISSUER,
    audience: JWT.AUDIENCE,
  })

  return payload
}

/**
 * 从 Authorization 请求头中提取 Token
 * @param header - Authorization 头的值
 * @returns 提取出的 Token 字符串，格式不正确时返回 null
 */
export function extractTokenFromHeader(header: string): string | null {
  if (!header) return null

  // 支持 Bearer <token> 格式
  const parts = header.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  const token = parts[1].trim()
  return token || null
}

/**
 * 生成唯一的 Token 标识符（JTI）
 * 使用 crypto.randomUUID 生成
 * @returns 唯一标识字符串
 */
export function generateJti(): string {
  return crypto.randomUUID()
}
