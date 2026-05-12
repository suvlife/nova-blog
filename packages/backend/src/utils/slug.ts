/**
 * Slug 生成工具
 * 将标题转换为 URL 友好的 slug 格式
 */

/**
 * 将标题转换为 URL 友好的 slug
 * 处理中文、特殊字符、空格等
 * @param title - 原始标题
 * @returns URL 安全的 slug 字符串
 */
export function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    // 将中文之间的空格替换为连字符
    .replace(/\s+/g, '-')
    // 移除特殊字符，只保留字母、数字、中文和连字符
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
    // 将多个连续连字符合并为一个
    .replace(/-+/g, '-')
    // 移除首尾的连字符
    .replace(/^-+|-+$/g, '')
    // 限制长度为 100 个字符
    .slice(0, 100)
}

/**
 * 确保 Slug 在已有 Slug 列表中唯一
 * 如果冲突则追加数字后缀
 * @param baseSlug - 基础 slug
 * @param existingSlugs - 已存在的 slug 列表
 * @returns 唯一的 slug 字符串
 */
export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  // 如果基础 slug 不存在冲突，直接返回
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  // 尝试追加数字后缀，从 1 开始递增
  let counter = 1
  let candidate = `${baseSlug}-${counter}`

  while (existingSlugs.includes(candidate)) {
    counter++
    candidate = `${baseSlug}-${counter}`

    // 安全阀：防止无限循环
    if (counter > 10000) {
      // 追加时间戳确保唯一性
      return `${baseSlug}-${Date.now()}`
    }
  }

  return candidate
}
