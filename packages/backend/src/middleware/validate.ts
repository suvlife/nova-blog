/**
 * 请求校验中间件
 * 使用 Zod 进行请求体和查询参数的校验
 */

import { createMiddleware } from 'hono/factory'
import type { ZodSchema, ZodError } from 'zod'
import type { AppEnv } from '../types/env.d'
import { sendError } from '../utils/response'
import type { FieldError } from '../types/common'

/**
 * 将 Zod 错误转换为字段错误列表
 * @param zodError - Zod 校验错误对象
 * @returns 字段错误数组
 */
function formatZodErrors(zodError: ZodError): FieldError[] {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))
}

/**
 * 请求体校验中间件
 * 校验 JSON 请求体是否符合 Zod Schema
 * @param schema - Zod 校验 Schema
 */
export function validate(schema: ZodSchema) {
  return createMiddleware<AppEnv>(async (c, next) => {
    try {
      const body = await c.req.json()
      const result = schema.safeParse(body)

      if (!result.success) {
        const errors = formatZodErrors(result.error)
        return sendError(c, 400, '请求参数校验失败', errors)
      }

      // 将校验后的数据挂载到上下文，供后续处理使用
      c.set('validatedBody', result.data)

      await next()
    } catch (err) {
      // 请求体不是有效的 JSON
      if (err instanceof SyntaxError) {
        return sendError(c, 400, '请求体不是有效的 JSON 格式')
      }
      throw err
    }
  })
}

/**
 * 查询参数校验中间件
 * 校验 URL 查询参数是否符合 Zod Schema
 * @param schema - Zod 校验 Schema
 */
export function validateQuery(schema: ZodSchema) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const query = c.req.query()
    const result = schema.safeParse(query)

    if (!result.success) {
      const errors = formatZodErrors(result.error)
      return sendError(c, 400, '查询参数校验失败', errors)
    }

    // 将校验后的查询参数挂载到上下文
    c.set('validatedQuery', result.data)

    await next()
  })
}
