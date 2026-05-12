/**
 * 后台附件管理路由
 * 处理文件上传、附件列表、删除、更新等请求
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../../types/env.d'
import { authRequired } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess, sendPaginated, sendError } from '../../utils/response'
import * as attachmentService from '../../services/attachment.service'

const router = new Hono<AppEnv>()

// 后台路由需要认证
router.use('*', authRequired)

/** 更新附件信息校验 Schema */
const updateAttachmentSchema = z.object({
  altText: z.string().max(200, '替代文本不能超过 200 字').optional(),
  description: z.string().max(500, '描述不能超过 500 字').optional(),
})

/**
 * GET /api/admin/attachments
 * 获取附件列表
 * 支持 ?page=1&per_page=20&mimeType=image
 */
router.get('/', async (c) => {
  const query = c.req.query()

  const result = await attachmentService.listAttachments(c.env.DB, {
    page: parseInt(query.page ?? '1', 10) || 1,
    perPage: parseInt(query.per_page ?? '20', 10) || 20,
    mimeType: query.mimeType,
  })

  return sendPaginated(c, result.items, result.pagination)
})

/**
 * POST /api/admin/attachments/upload
 * 上传单个文件（multipart/form-data，字段名 file）
 */
router.post('/upload', async (c) => {
  const user = c.get('user')!

  // 解析 multipart/form-data
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return sendError(c, 400, '请选择要上传的文件，字段名为 file')
  }

  const attachment = await attachmentService.uploadFile(
    c.env.DB,
    c.env.STORAGE,
    file,
    String(user.id)
  )

  return sendSuccess(c, attachment, 201, '文件上传成功')
})

/**
 * POST /api/admin/attachments/batch-upload
 * 批量上传文件（字段名 files，最多 10 个）
 */
router.post('/batch-upload', async (c) => {
  const user = c.get('user')!

  // 解析 multipart/form-data
  const body = await c.req.parseBody()

  // files 可能是单个 File 或 File 数组
  let files: File[] = []
  const rawFiles = body['files']

  if (rawFiles instanceof File) {
    files = [rawFiles]
  } else if (Array.isArray(rawFiles)) {
    files = rawFiles.filter(f => f instanceof File) as File[]
  }

  if (files.length === 0) {
    return sendError(c, 400, '请选择要上传的文件，字段名为 files')
  }

  const attachments = await attachmentService.batchUploadFiles(
    c.env.DB,
    c.env.STORAGE,
    files,
    String(user.id)
  )

  return sendSuccess(c, attachments, 201, '批量上传成功')
})

/**
 * DELETE /api/admin/attachments/:id
 * 删除附件
 */
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await attachmentService.deleteAttachment(c.env.DB, c.env.STORAGE, id)
  return sendSuccess(c, null, 200, '附件删除成功')
})

/**
 * PATCH /api/admin/attachments/:id
 * 更新附件信息（altText, description）
 */
router.patch('/:id', validate(updateAttachmentSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof updateAttachmentSchema>

  const attachment = await attachmentService.updateAttachment(c.env.DB, id, {
    altText: body.altText,
    description: body.description,
  })

  return sendSuccess(c, attachment, 200, '附件信息更新成功')
})

export default router
