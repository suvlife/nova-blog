/**
 * 文章相关类型定义
 * 包含文章实体、输入/输出类型、状态枚举等
 */

/** 文章发布状态 */
export type PostStatus = 'draft' | 'published' | 'archived'

/** 文章可见性 */
export type PostVisibility = 'public' | 'private' | 'password_protected'

/** 文章实体 */
export interface Post {
  /** 文章 ID */
  id: number
  /** URL 友好的标识 */
  slug: string
  /** 文章标题 */
  title: string
  /** 文章摘要 */
  excerpt: string | null
  /** 文章内容（Markdown） */
  content: string
  /** 渲染后的 HTML 内容 */
  renderedContent: string | null
  /** 封面图 URL */
  coverImage: string | null
  /** 发布状态 */
  status: PostStatus
  /** 可见性 */
  visibility: PostVisibility
  /** 访问密码（当 visibility 为 password_protected 时） */
  password: string | null
  /** 是否置顶 */
  isPinned: boolean
  /** 允许评论 */
  allowComment: boolean
  /** 浏览次数 */
  viewCount: number
  /** 点赞数 */
  likeCount: number
  /** 排序权重 */
  sortOrder: number
  /** 发布时间 */
  publishedAt: string | null
  /** 作者 ID */
  authorId: number
  /** 分类 ID */
  categoryId: number | null
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 文章（含标签） */
export interface PostWithTags extends Post {
  /** 文章标签列表 */
  tags: Tag[]
}

/** 标签实体 */
export interface Tag {
  /** 标签 ID */
  id: number
  /** 标签名称 */
  name: string
  /** 标签 Slug */
  slug: string
  /** 标签描述 */
  description: string | null
  /** 标签颜色 */
  color: string | null
  /** 文章数量 */
  postCount: number
  /** 创建时间 */
  createdAt: string
}

/** 分类实体 */
export interface Category {
  /** 分类 ID */
  id: number
  /** 分类名称 */
  name: string
  /** 分类 Slug */
  slug: string
  /** 分类描述 */
  description: string | null
  /** 父分类 ID */
  parentId: number | null
  /** 排序权重 */
  sortOrder: number
  /** 文章数量 */
  postCount: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 创建文章输入 */
export interface CreatePostInput {
  /** 文章标题 */
  title: string
  /** 文章内容 */
  content: string
  /** 文章摘要 */
  excerpt?: string
  /** 封面图 URL */
  coverImage?: string
  /** 发布状态 */
  status?: PostStatus
  /** 可见性 */
  visibility?: PostVisibility
  /** 访问密码 */
  password?: string
  /** 是否置顶 */
  isPinned?: boolean
  /** 允许评论 */
  allowComment?: boolean
  /** 分类 ID */
  categoryId?: number
  /** 标签 ID 列表 */
  tagIds?: number[]
  /** 发布时间 */
  publishedAt?: string
}

/** 更新文章输入 */
export interface UpdatePostInput {
  /** 文章标题 */
  title?: string
  /** 文章内容 */
  content?: string
  /** 文章摘要 */
  excerpt?: string | null
  /** 封面图 URL */
  coverImage?: string | null
  /** 发布状态 */
  status?: PostStatus
  /** 可见性 */
  visibility?: PostVisibility
  /** 访问密码 */
  password?: string | null
  /** 是否置顶 */
  isPinned?: boolean
  /** 允许评论 */
  allowComment?: boolean
  /** 分类 ID */
  categoryId?: number | null
  /** 标签 ID 列表 */
  tagIds?: number[]
  /** 发布时间 */
  publishedAt?: string | null
  /** Slug（仅管理员可修改） */
  slug?: string
}

/** 文章列表项（前台展示用，不含完整内容） */
export interface PostListItem {
  id: number
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  status: PostStatus
  isPinned: boolean
  viewCount: number
  likeCount: number
  publishedAt: string | null
  createdAt: string
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
  tags: Pick<Tag, 'id' | 'name' | 'slug' | 'color'>[]
  author: {
    id: number
    displayName: string
    avatarUrl: string | null
  }
}
