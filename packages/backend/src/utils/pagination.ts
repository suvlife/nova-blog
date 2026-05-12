/**
 * 分页工具函数
 * 解析分页参数并计算分页元数据
 */

import { PAGINATION_DEFAULTS } from '../config/constants'
import type { PaginationParams, PaginationMeta } from '../types/common'

/**
 * 从请求查询参数中解析分页参数
 * 提供默认值和边界校验
 * @param params - 查询参数对象
 * @returns 规范化的分页参数
 */
export function parsePagination(params: Record<string, string>): PaginationParams {
  const page = Math.max(
    PAGINATION_DEFAULTS.PAGE,
    parseInt(params.page ?? '', 10) || PAGINATION_DEFAULTS.PAGE
  )

  const perPage = Math.min(
    PAGINATION_DEFAULTS.MAX_PER_PAGE,
    Math.max(
      1,
      parseInt(params.perPage ?? '', 10) || PAGINATION_DEFAULTS.PER_PAGE
    )
  )

  return { page, perPage }
}

/**
 * 根据总数和分页参数计算分页元数据
 * @param total - 数据总条数
 * @param page - 当前页码
 * @param perPage - 每页条数
 * @returns 完整的分页元数据
 */
export function calculatePagination(
  total: number,
  page: number,
  perPage: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // 修正页码不超出范围
  const currentPage = Math.min(page, totalPages)

  return {
    page: currentPage,
    perPage,
    total,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  }
}

/**
 * 计算数据库查询的 OFFSET 值
 * @param page - 当前页码
 * @param perPage - 每页条数
 * @returns SQL OFFSET 值
 */
export function calculateOffset(page: number, perPage: number): number {
  return (page - 1) * perPage
}
