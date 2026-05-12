/**
 * 通用类型定义
 * 包含 API 响应、分页、错误等通用类型
 */

/** 统一 API 成功响应格式 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: true
  /** 响应数据 */
  data: T
  /** 提示消息 */
  message?: string
  /** 请求 ID */
  requestId?: string
  /** 响应时间戳 */
  timestamp: number
}

/** 分页元数据 */
export interface PaginationMeta {
  /** 当前页码（从 1 开始） */
  page: number
  /** 每页条数 */
  perPage: number
  /** 总条数 */
  total: number
  /** 总页数 */
  totalPages: number
  /** 是否有下一页 */
  hasNext: boolean
  /** 是否有上一页 */
  hasPrev: boolean
}

/** 分页响应格式 */
export interface PaginatedResponse<T> {
  /** 是否成功 */
  success: true
  /** 数据列表 */
  data: T[]
  /** 分页信息 */
  pagination: PaginationMeta
  /** 请求 ID */
  requestId?: string
  /** 响应时间戳 */
  timestamp: number
}

/** 分页查询参数 */
export interface PaginationParams {
  /** 当前页码（从 1 开始） */
  page: number
  /** 每页条数 */
  perPage: number
}

/** 错误响应格式 */
export interface ErrorResponse {
  /** 是否成功 */
  success: false
  /** 错误码 */
  code: number
  /** 错误消息 */
  message: string
  /** 详细错误信息（如校验错误） */
  errors?: FieldError[]
  /** 请求 ID */
  requestId?: string
  /** 响应时间戳 */
  timestamp: number
}

/** 字段级错误 */
export interface FieldError {
  /** 字段名 */
  field: string
  /** 错误消息 */
  message: string
}

/** 排序参数 */
export interface SortParams {
  /** 排序字段 */
  sortBy: string
  /** 排序方向 */
  sortOrder: 'asc' | 'desc'
}

/** 通用列表查询参数（含分页和排序） */
export interface ListQueryParams extends PaginationParams, SortParams {
  /** 搜索关键词 */
  keyword?: string
}
