/**
 * 统一响应格式工具
 * 提供标准化的 API 响应构造方法
 */

import type { Context } from 'hono'
import type { ApiResponse, PaginatedResponse, PaginationMeta, ErrorResponse, FieldError } from '../types/common'

/**
 * 构造成功响应
 * @param data - 响应数据
 * @param message - 可选提示消息
 * @returns 标准成功响应对象
 */
export function success<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: Date.now(),
  }
}

/**
 * 构造分页响应
 * @param items - 数据列表
 * @param pagination - 分页元数据
 * @returns 标准分页响应对象
 */
export function paginated<T>(items: T[], pagination: PaginationMeta): PaginatedResponse<T> {
  return {
    success: true,
    data: items,
    pagination,
    timestamp: Date.now(),
  }
}

/**
 * 构造错误响应
 * @param code - 错误码（HTTP 状态码）
 * @param message - 错误消息
 * @param errors - 可选的字段级错误列表
 * @returns 标准错误响应对象
 */
export function error(code: number, message: string, errors?: FieldError[]): ErrorResponse {
  return {
    success: false,
    code,
    message,
    ...(errors && { errors }),
    timestamp: Date.now(),
  }
}

/**
 * 在 Hono Context 上返回成功 JSON 响应
 * @param c - Hono 上下文
 * @param data - 响应数据
 * @param statusCode - HTTP 状态码，默认 200
 * @param message - 可选提示消息
 */
export function sendSuccess<T>(c: Context, data: T, statusCode: number = 200, message?: string) {
  const response = success(data, message)
  // 注入请求 ID
  if (c.get('requestId')) {
    response.requestId = c.get('requestId')
  }
  return c.json(response, statusCode as 200)
}

/**
 * 在 Hono Context 上返回分页 JSON 响应
 * @param c - Hono 上下文
 * @param items - 数据列表
 * @param pagination - 分页元数据
 */
export function sendPaginated<T>(c: Context, items: T[], pagination: PaginationMeta) {
  const response = paginated(items, pagination)
  if (c.get('requestId')) {
    response.requestId = c.get('requestId')
  }
  return c.json(response, 200)
}

/**
 * 在 Hono Context 上返回错误 JSON 响应
 * @param c - Hono 上下文
 * @param statusCode - HTTP 状态码
 * @param message - 错误消息
 * @param errors - 可选的字段级错误
 */
export function sendError(c: Context, statusCode: number, message: string, errors?: FieldError[]) {
  const response = error(statusCode, message, errors)
  if (c.get('requestId')) {
    response.requestId = c.get('requestId')
  }
  return c.json(response, statusCode as 400)
}
