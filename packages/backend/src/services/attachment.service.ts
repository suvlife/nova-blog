/**
 * 附件业务逻辑服务
 * 处理文件上传到 R2、附件记录管理、图片尺寸获取等核心逻辑
 */

import { calculatePagination, calculateOffset } from '../utils/pagination'
import { NotFoundError, ValidationError } from '../middleware/error-handler'
import { ALLOWED_FILE_TYPES, MAX_UPLOAD_SIZE, PAGINATION_DEFAULTS } from '../config/constants'
import type { PaginationMeta } from '../types/common'

/** 附件列表查询参数 */
export interface ListAttachmentsParams {
  page?: number
  perPage?: number
  mimeType?: string
}

/** 附件数据库记录类型 */
interface AttachmentRecord {
  id: string
  filename: string
  storage_key: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  r2_bucket: string
  uploader_id: string | null
  alt_text: string
  description: string
  created_at: string
}

/**
 * 获取附件列表（分页、按类型筛选）
 * @param db - D1 数据库实例
 * @param params - 查询参数
 * @returns 分页附件列表
 */
export async function listAttachments(db: D1Database, params: ListAttachmentsParams = {}) {
  const {
    page = PAGINATION_DEFAULTS.PAGE,
    perPage = PAGINATION_DEFAULTS.PER_PAGE,
    mimeType,
  } = params

  // 构建查询条件
  const conditions: string[] = []
  const bindValues: unknown[] = []

  if (mimeType) {
    conditions.push('mime_type LIKE ?')
    bindValues.push(`${mimeType}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 查询总数
  const countQuery = `SELECT COUNT(*) as total FROM attachments ${whereClause}`
  const countResult = await db.prepare(countQuery).bind(...bindValues).first<{ total: number }>()
  const total = countResult?.total ?? 0

  // 计算分页
  const pagination: PaginationMeta = calculatePagination(total, page, perPage)
  const offset = calculateOffset(page, perPage)

  // 查询附件列表
  const listQuery = `
    SELECT * FROM attachments
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
  const attachments = await db
    .prepare(listQuery)
    .bind(...bindValues, perPage, offset)
    .all<AttachmentRecord>()

  const items = (attachments.results || []).map(a => ({
    id: a.id,
    filename: a.filename,
    storageKey: a.storage_key,
    mimeType: a.mime_type,
    sizeBytes: a.size_bytes,
    width: a.width,
    height: a.height,
    r2Bucket: a.r2_bucket,
    uploaderId: a.uploader_id,
    altText: a.alt_text || '',
    description: a.description || '',
    createdAt: a.created_at,
  }))

  return { items, pagination }
}

/**
 * 获取单个附件
 * @param db - D1 数据库实例
 * @param id - 附件 ID
 * @returns 附件详情
 */
export async function getAttachmentById(db: D1Database, id: string) {
  const attachment = await db
    .prepare('SELECT * FROM attachments WHERE id = ?')
    .bind(id)
    .first<AttachmentRecord>()

  if (!attachment) {
    throw new NotFoundError('附件')
  }

  return {
    id: attachment.id,
    filename: attachment.filename,
    storageKey: attachment.storage_key,
    mimeType: attachment.mime_type,
    sizeBytes: attachment.size_bytes,
    width: attachment.width,
    height: attachment.height,
    r2Bucket: attachment.r2_bucket,
    uploaderId: attachment.uploader_id,
    altText: attachment.alt_text || '',
    description: attachment.description || '',
    createdAt: attachment.created_at,
  }
}

/**
 * 获取图片尺寸（从 ArrayBuffer 解析）
 * 仅支持 JPEG 和 PNG 的简单尺寸获取
 * @param buffer - 文件数据
 * @param mimeType - MIME 类型
 * @returns 图片尺寸 { width, height } 或 null
 */
function getImageDimensions(buffer: ArrayBuffer, mimeType: string): { width: number; height: number } | null {
  try {
    const view = new DataView(buffer)

    if (mimeType === 'image/png') {
      // PNG: 宽高在第 16-23 字节
      const width = view.getUint32(16)
      const height = view.getUint32(20)
      return { width, height }
    }

    if (mimeType === 'image/jpeg') {
      // JPEG: 需要查找 SOF 标记
      let offset = 2
      while (offset < buffer.byteLength - 1) {
        const marker = view.getUint16(offset)
        // SOF0 (0xFFC0) 到 SOF15 (0xFFCF)，排除 SOF4, SOF8, SOF12
        if ((marker & 0xFFC0) === 0xFFC0 && marker !== 0xFFC4 && marker !== 0xFFC8 && marker !== 0xFFCC) {
          const height = view.getUint16(offset + 5)
          const width = view.getUint16(offset + 7)
          return { width, height }
        }
        offset += 2 + view.getUint16(offset + 2)
      }
    }

    // 其他格式暂不支持自动获取尺寸
    return null
  } catch {
    return null
  }
}

/**
 * 上传文件到 R2 并写入 D1 记录
 * @param db - D1 数据库实例
 * @param r2 - R2 存储桶实例
 * @param file - 上传的文件对象
 * @param uploaderId - 上传者 ID
 * @returns 创建的附件记录
 */
export async function uploadFile(
  db: D1Database,
  r2: R2Bucket,
  file: File,
  uploaderId: string
) {
  // 校验 MIME 类型
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    throw new ValidationError(`不支持的文件类型: ${file.type}，允许的类型: ${ALLOWED_FILE_TYPES.join(', ')}`)
  }

  // 校验文件大小
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new ValidationError(`文件大小超过限制，最大允许 ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`)
  }

  // 读取文件内容
  const arrayBuffer = await file.arrayBuffer()

  // 生成存储键：按日期分目录 + UUID 文件名
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  const ext = file.name.split('.').pop() || 'bin'
  const storageKey = `uploads/${datePrefix}/${crypto.randomUUID()}.${ext}`

  // 上传到 R2
  await r2.put(storageKey, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      originalFilename: file.name,
      uploaderId,
    },
  })

  // 获取图片尺寸（仅图片类型）
  let width: number | null = null
  let height: number | null = null
  if (file.type.startsWith('image/')) {
    const dimensions = getImageDimensions(arrayBuffer, file.type)
    if (dimensions) {
      width = dimensions.width
      height = dimensions.height
    }
  }

  // 写入 D1 记录
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO attachments (id, filename, storage_key, mime_type, size_bytes, width, height, r2_bucket, uploader_id, alt_text, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'blog-assets', ?, '', '', datetime('now'))`
    )
    .bind(id, file.name, storageKey, file.type, file.size, width, height, uploaderId)
    .run()

  return getAttachmentById(db, id)
}

/**
 * 批量上传文件
 * @param db - D1 数据库实例
 * @param r2 - R2 存储桶实例
 * @param files - 上传的文件数组
 * @param uploaderId - 上传者 ID
 * @returns 创建的附件记录数组
 */
export async function batchUploadFiles(
  db: D1Database,
  r2: R2Bucket,
  files: File[],
  uploaderId: string
) {
  // 最多允许 10 个文件
  if (files.length > 10) {
    throw new ValidationError('批量上传最多允许 10 个文件')
  }

  const results = await Promise.all(
    files.map(file => uploadFile(db, r2, file, uploaderId))
  )

  return results
}

/**
 * 删除附件（R2 + D1）
 * @param db - D1 数据库实例
 * @param r2 - R2 存储桶实例
 * @param id - 附件 ID
 */
export async function deleteAttachment(db: D1Database, r2: R2Bucket, id: string) {
  // 检查附件是否存在
  const existing = await db
    .prepare('SELECT id, storage_key FROM attachments WHERE id = ?')
    .bind(id)
    .first<{ id: string; storage_key: string }>()

  if (!existing) {
    throw new NotFoundError('附件')
  }

  // 从 R2 删除文件
  await r2.delete(existing.storage_key)

  // 从 D1 删除记录
  await db.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run()
}

/**
 * 更新附件信息
 * @param db - D1 数据库实例
 * @param id - 附件 ID
 * @param data - 更新数据
 * @returns 更新后的附件
 */
export async function updateAttachment(
  db: D1Database,
  id: string,
  data: {
    altText?: string
    description?: string
  }
) {
  // 检查附件是否存在
  const existing = await db
    .prepare('SELECT id FROM attachments WHERE id = ?')
    .bind(id)
    .first<{ id: string }>()

  if (!existing) {
    throw new NotFoundError('附件')
  }

  // 构建动态更新语句
  const setClauses: string[] = []
  const bindValues: unknown[] = []

  if (data.altText !== undefined) {
    setClauses.push('alt_text = ?')
    bindValues.push(data.altText)
  }

  if (data.description !== undefined) {
    setClauses.push('description = ?')
    bindValues.push(data.description)
  }

  if (setClauses.length > 0) {
    const updateQuery = `UPDATE attachments SET ${setClauses.join(', ')} WHERE id = ?`
    bindValues.push(id)
    await db.prepare(updateQuery).bind(...bindValues).run()
  }

  return getAttachmentById(db, id)
}
