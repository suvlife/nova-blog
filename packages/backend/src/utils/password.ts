/**
 * 密码工具函数
 * 使用 bcryptjs 实现密码哈希和验证
 */

import bcrypt from 'bcryptjs'

/** bcrypt 哈希轮数（10 轮在安全性和性能之间取得平衡） */
const SALT_ROUNDS = 10

/**
 * 对密码进行哈希处理
 * @param password - 原始密码
 * @returns 哈希后的密码字符串
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS)
  return bcrypt.hash(password, salt)
}

/**
 * 验证密码是否匹配
 * @param password - 待验证的原始密码
 * @param hash - 存储的密码哈希
 * @returns 密码是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
