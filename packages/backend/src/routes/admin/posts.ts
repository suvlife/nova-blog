/**
 * 后台文章管理路由
 * 处理文章的增删改查、状态变更、置顶切换等请求
 */

import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../../types/env.d'
import { authRequired } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { sendSuccess, sendPaginated } from '../../utils/response'
import * as postService from '../../services/post.service'

const router = new Hono<AppEnv>()

// 后台路由需要认证
router.use('*', authRequired)

/** 创建文章校验 Schema */
const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 字'),
  content: z.string().min(1, '内容不能为空'),
  slug: z.string().max(100, 'Slug 不能超过 100 字').optional(),
  excerpt: z.string().max(500, '摘要不能超过 500 字').optional(),
  coverImage: z.string().url('封面图 URL 格式不正确').optional().or(z.literal('')),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  visibility: z.enum(['public', 'private', 'password']).default('public'),
  password: z.string().optional(),
  isPinned: z.boolean().default(false),
  allowComment: z.boolean().default(true),
  publishedAt: z.string().optional(),
})

/** 更新文章校验 Schema */
const updatePostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 字').optional(),
  content: z.string().min(1, '内容不能为空').optional(),
  slug: z.string().max(100, 'Slug 不能超过 100 字').optional(),
  excerpt: z.string().max(500, '摘要不能超过 500 字').nullable().optional(),
  coverImage: z.string().url('封面图 URL 格式不正确').nullable().optional().or(z.literal('')),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  password: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  allowComment: z.boolean().optional(),
  publishedAt: z.string().nullable().optional(),
})

/** 变更状态校验 Schema */
const changeStatusSchema = z.object({
  status: z.enum(['published', 'draft', 'archived'], { required_error: '状态不能为空' }),
})

/**
 * GET /api/admin/posts
 * 获取文章列表
 * 支持 ?page=1&per_page=10&status=draft&category_id=xxx&tag_id=xxx&keyword=xxx&sort=created_at&order=desc
 */
router.get('/', async (c) => {
  const query = c.req.query()

  const result = await postService.listPosts(c.env.DB, {
    page: parseInt(query.page ?? '1', 10) || 1,
    perPage: parseInt(query.per_page ?? '10', 10) || 10,
    status: query.status,
    categoryId: query.category_id,
    tagId: query.tag_id,
    keyword: query.keyword,
    sortBy: query.sort || 'created_at',
    sortOrder: (query.order as 'asc' | 'desc') || 'desc',
  })

  return sendPaginated(c, result.items, result.pagination)
})

/**
 * GET /api/admin/posts/:id
 * 获取文章详情
 */
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const post = await postService.getPostById(c.env.DB, id)
  return sendSuccess(c, post)
})

/**
 * POST /api/admin/posts
 * 创建文章
 */
router.post('/', validate(createPostSchema), async (c) => {
  const body = c.get('validatedBody') as z.infer<typeof createPostSchema>
  const user = c.get('user')!

  const post = await postService.createPost(
    c.env.DB,
    c.env.CACHE,
    {
      title: body.title,
      content: body.content,
      slug: body.slug,
      excerpt: body.excerpt,
      coverImage: body.coverImage || undefined,
      categoryId: body.categoryId,
      tagIds: body.tagIds,
      status: body.status,
      visibility: body.visibility,
      password: body.password,
      isPinned: body.isPinned,
      allowComment: body.allowComment,
      publishedAt: body.publishedAt,
    },
    String(user.id)
  )

  return sendSuccess(c, post, 201, '文章创建成功')
})

/**
 * PUT /api/admin/posts/:id
 * 更新文章
 */
router.put('/:id', validate(updatePostSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof updatePostSchema>

  const post = await postService.updatePost(c.env.DB, c.env.CACHE, id, {
    title: body.title,
    content: body.content,
    slug: body.slug,
    excerpt: body.excerpt,
    coverImage: body.coverImage,
    categoryId: body.categoryId,
    tagIds: body.tagIds,
    status: body.status,
    visibility: body.visibility,
    password: body.password,
    isPinned: body.isPinned,
    allowComment: body.allowComment,
    publishedAt: body.publishedAt,
  })

  return sendSuccess(c, post, 200, '文章更新成功')
})

/**
 * DELETE /api/admin/posts/:id
 * 删除文章
 */
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await postService.deletePost(c.env.DB, c.env.CACHE, id)
  return sendSuccess(c, null, 200, '文章删除成功')
})

/**
 * PATCH /api/admin/posts/:id/status
 * 变更文章状态
 */
router.patch('/:id/status', validate(changeStatusSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.get('validatedBody') as z.infer<typeof changeStatusSchema>

  const post = await postService.changePostStatus(
    c.env.DB,
    c.env.CACHE,
    id,
    body.status
  )

  return sendSuccess(c, post, 200, '文章状态变更成功')
})

/**
 * PATCH /api/admin/posts/:id/pin
 * 切换文章置顶状态
 */
router.patch('/:id/pin', async (c) => {
  const id = c.req.param('id')
  const post = await postService.togglePostPin(c.env.DB, c.env.CACHE, id)
  return sendSuccess(c, post, 200, '文章置顶状态切换成功')
})

export default router
