/**
 * HTML 清理和 Markdown 渲染工具
 * 使用 sanitize-html 防止 XSS 攻击
 * 提供简单的 Markdown 转 HTML 功能
 */

import sanitizeHtml from 'sanitize-html'

/** sanitize-html 默认配置 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // 允许的标签
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'blockquote', 'pre', 'code',
    'ul', 'ol', 'li',
    'a', 'strong', 'em', 'del', 'ins',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption',
    'div', 'span',
  ],
  // 允许的属性
  allowedAttributes: {
    '*': ['class', 'id'],
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
    'code': ['language', 'class'],
    'pre': ['class'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
  },
  // 自动为链接添加 rel="noopener noreferrer"
  transformTags: {
    'a': sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
  // 允许协议
  allowedSchemes: ['http', 'https', 'mailto'],
}

/**
 * 清理 HTML 内容，防止 XSS 攻击
 * @param html - 原始 HTML 字符串
 * @returns 清理后的安全 HTML
 */
export function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

/**
 * 简单的 Markdown 转 HTML 渲染器
 * 使用正则表达式实现基础 Markdown 语法转换
 * 后续可替换为 marked 等专业库
 * @param content - Markdown 文本
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdown(content: string): string {
  if (!content) return ''

  let html = content

  // 转义 HTML 特殊字符（保留 Markdown 语法）
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 代码块（三个反引号包裹）- 需在其他规则之前处理
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : ''
    return `<pre><code${langClass}>${code.trim()}</code></pre>`
  })

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 标题（h1-h6）
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // 引用块
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // 删除线
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')

  // 水平线
  html = html.replace(/^---$/gm, '<hr>')

  // 无序列表
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // 有序列表
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')

  // 段落（连续非空行）
  html = html.replace(/^(?!<[a-z])((?!<[a-z]).+)$/gm, '<p>$1</p>')

  // 清理多余的空段落
  html = html.replace(/<p>\s*<\/p>/g, '')

  // 清理段落内的嵌套块级元素
  html = html.replace(/<p>(<(?:h[1-6]|pre|blockquote|ul|ol|hr)[^>]*>)/g, '$1')
  html = html.replace(/(<\/(?:h[1-6]|pre|blockquote|ul|ol|hr)>)<\/p>/g, '$1')

  // 最后通过 sanitize-html 进行安全清理
  return sanitizeHtmlContent(html)
}
