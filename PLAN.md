# Nova Blog - 基于 Cloudflare 的博客系统完整规划

## 项目概述

**Nova Blog** 是一个基于 Cloudflare 全家桶的现代化个人博客系统，具备 WordPress 级别的内容管理能力，同时保持静态站的极致性能。前台酷炫科技感设计，后台功能完备。

---

## 一、技术架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                               │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │   前台 (Public)       │  │   后台 (Admin)               │ │
│  │   首页/文章/归档/关于  │  │   仪表盘/编辑器/管理/设置    │ │
│  └──────────┬───────────┘  └──────────────┬───────────────┘ │
└─────────────┼─────────────────────────────┼─────────────────┘
              │ HTTPS                       │ HTTPS + JWT
              ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare 边缘网络                        │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Cloudflare Pages │    │  Cloudflare Workers           │  │
│  │  (前端静态托管)    │    │  (后端 API 服务 - Hono)       │  │
│  │  blog.example.com │    │  api.blog.example.com         │  │
│  └──────────────────┘    └──────┬──────┬──────┬──────────┘  │
│                                 │      │      │              │
│                    ┌────────────┘      │      └──────────┐  │
│                    ▼                   ▼                  ▼  │
│           ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│           │ D1 Database  │  │ R2 Storage   │  │ KV Cache   │ │
│           │ (SQLite)     │  │ (对象存储)    │  │ (边缘缓存) │ │
│           └─────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、Cloudflare 资源清单

| 资源 | 用途 | 绑定名 |
|------|------|--------|
| **Workers** | 后端 API 服务 | - |
| **Pages** | 前端静态托管 | - |
| **D1** | 关系型数据库（文章/分类/标签/用户/附件/配置） | `DB` |
| **R2** | 对象存储（图片/文件附件） | `STORAGE` |
| **KV** | 边缘缓存（文章/分类/标签/RSS/Sitemap） | `CACHE` |
| **KV** | 认证存储（RefreshToken/Token黑名单） | `AUTH` |
| **Cron Triggers** | 定时清理临时文件 | - |

---

## 三、数据库设计（D1 / SQLite）

### 3.1 核心表结构

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 用户 | id, username, email, password_hash, role, status |
| `categories` | 分类（支持嵌套） | id, name, slug, parent_id, sort_order |
| `tags` | 标签 | id, name, slug |
| `posts` | 文章 | id, title, slug, content, content_html, cover_image, category_id, author_id, status, visibility, is_pinned, view_count, published_at |
| `post_tags` | 文章-标签关联 | post_id, tag_id |
| `attachments` | 附件 | id, filename, storage_key, mime_type, size_bytes, width, height, uploader_id |
| `settings` | 站点配置 | key, value(JSON) |

### 3.2 文章状态机

```
draft (草稿) ──发布──▶ published (已发布) ──归档──▶ archived (已归档)
     ▲                    │                          │
     └──────取消发布──────┘                          │
     └──────────────恢复─────────────────────────────┘
```

---

## 四、API 路由设计

### 4.1 认证 `/api/auth`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/login` | 登录 | 无 |
| POST | `/api/auth/refresh` | 刷新Token | 无 |
| POST | `/api/auth/logout` | 登出 | 需认证 |
| GET | `/api/auth/me` | 当前用户 | 需认证 |
| PUT | `/api/auth/password` | 修改密码 | 需认证 |

### 4.2 管理后台 `/api/admin/*`（全部需 JWT 认证）

| 模块 | 端点 | 操作 |
|------|------|------|
| 文章 | `/api/admin/posts` | CRUD + 状态变更 + 置顶 |
| 分类 | `/api/admin/categories` | CRUD + 排序 |
| 标签 | `/api/admin/tags` | CRUD |
| 附件 | `/api/admin/attachments` | 上传 + 批量上传 + 删除 + 更新信息 |
| 用户 | `/api/admin/users` | CRUD + 角色变更 |
| 配置 | `/api/admin/settings` | 读取 + 批量/单项更新 |
| 统计 | `/api/admin/stats` | 总览 + 文章统计 + 访问趋势 |

### 4.3 前台公开 `/api/public/*`（无需认证）

| 端点 | 说明 |
|------|------|
| `/api/public/posts` | 已发布文章列表（分页/筛选） |
| `/api/public/posts/:slug` | 文章详情 |
| `/api/public/posts/:slug/related` | 相关文章 |
| `/api/public/categories` | 分类树 |
| `/api/public/categories/:slug/posts` | 分类文章 |
| `/api/public/tags` | 标签列表 |
| `/api/public/tags/:slug/posts` | 标签文章 |
| `/api/public/search?keyword=xxx` | 全文搜索 |
| `/api/public/archive` | 归档（按年月） |
| `/api/public/rss` | RSS 2.0 |
| `/api/public/atom` | Atom Feed |
| `/api/public/sitemap` | Sitemap XML |
| `/api/public/settings` | 前台配置 |

---

## 五、认证与安全方案

### 5.1 JWT 双 Token 机制

- **AccessToken**: 15分钟有效期，存于 localStorage，每次请求通过 `Authorization: Bearer` 携带
- **RefreshToken**: 7天有效期，存于 KV + localStorage，用于无感刷新

### 5.2 安全措施

| 层面 | 措施 |
|------|------|
| 密码 | bcrypt 哈希（cost=12） |
| JWT | HS256 签名，密钥存于 Worker Secrets |
| 速率限制 | 登录 5次/分钟，API 全局 100次/10秒，上传 10次/分钟 |
| CORS | 白名单域名 |
| 输入校验 | Zod schema |
| SQL注入 | 参数化查询 |
| XSS | DOMPurify 清理 HTML |
| 文件上传 | MIME 校验 + 大小限制 + 文件头验证 |
| HTTPS | Cloudflare 强制 HTTPS + HSTS |
| WAF | Cloudflare 托管规则 + OWASP 规则集 |

---

## 六、R2 存储策略

### 目录结构

```
blog-assets/
├── images/
│   ├── posts/{year}/{month}/{uuid}.{ext}       -- 文章图片
│   ├── covers/{year}/{month}/{uuid}.{ext}      -- 封面图
│   └── avatars/{userId}/{uuid}.{ext}           -- 头像
├── files/{year}/{month}/{uuid}.{ext}           -- 通用文件
└── temp/{sessionId}/{uuid}.{ext}               -- 临时文件(24h清理)
```

### 上传限制

- 图片: 最大 10MB，支持 jpeg/png/gif/webp/svg
- 文件: 最大 50MB，支持 pdf/zip/markdown
- 批量: 单次最多 10 个文件

### 访问方式

- 公开读取: `assets.blog.example.com/{key}` → Worker 代理 R2
- 上传/删除: 仅管理 API，需 JWT 认证

---

## 七、KV 缓存策略

| 缓存项 | TTL | 失效触发 |
|--------|-----|----------|
| 文章列表 | 5min | 文章增删改/状态变更 |
| 文章详情 | 10min | 文章更新/删除 |
| 分类树 | 30min | 分类增删改 |
| 标签列表 | 30min | 标签增删改 |
| 搜索结果 | 5min | 文章更新 |
| RSS Feed | 30min | 文章发布/更新 |
| Sitemap | 1h | 文章发布/删除 |
| 前台配置 | 1h | 配置更新 |

---

## 八、前端设计

### 8.1 设计风格：深空赛博 (Deep Space Cyber)

| 角色 | 色值 | 用途 |
|------|------|------|
| 主色 | `#6C5CE7` 赛博紫 | 品牌、按钮、链接 |
| 强调色 | `#00F5D4` 霓虹青 | 关键操作、活跃状态 |
| 次要色 | `#FD79A8` 霓虹粉 | 装饰、警告 |
| 背景主 | `#0A0A1A` 深空黑 | 页面背景 |
| 背景次 | `#12122A` | 卡片背景 |
| 文字主 | `#EAEAFF` | 标题正文 |

### 8.2 视觉特效

- **毛玻璃**: 导航栏、模态框 `backdrop-filter: blur(20px)`
- **辉光边框**: 卡片悬浮时渐变边框发光
- **粒子网络**: 首页 Hero 区域 Canvas 粒子动画
- **扫描线**: Hero 区域水平扫描线
- **网格背景**: 全局淡紫色网格线

### 8.3 前台页面

| 页面 | 路由 | 核心特性 |
|------|------|----------|
| 首页 | `/` | 粒子背景 + 打字机标题 + 文章卡片网格 |
| 文章列表 | `/posts` | 筛选栏 + 卡片网格 + 分页 + 搜索 |
| 文章详情 | `/posts/:slug` | Markdown渲染 + 代码高亮 + 上下篇 |
| 归档 | `/archives` | 按年月分组时间线 |
| 关于 | `/about` | 头像 + 简介 + 社交链接 |

### 8.4 后台页面

| 页面 | 路由 | 核心特性 |
|------|------|----------|
| 登录 | `/admin/login` | 居中卡片 |
| 仪表盘 | `/admin` | 统计卡片 + 最近文章 |
| 文章管理 | `/admin/posts` | 数据表格 + 筛选 |
| 文章编辑 | `/admin/posts/new`, `/admin/posts/edit/:slug` | Markdown编辑器 + 实时预览 + 侧边栏设置 |
| 分类管理 | `/admin/categories` | 表格 + 模态框 |
| 标签管理 | `/admin/tags` | 卡片网格 + 模态框 |
| 附件管理 | `/admin/media` | 拖拽上传 + 媒体网格 |
| 站点设置 | `/admin/settings` | 表单分组 |

### 8.5 Markdown 编辑器

- 工具栏: 16个快捷按钮（加粗/斜体/标题/链接/图片/代码等）
- 快捷键: Ctrl+B/I/K/S
- 分屏: 左侧Markdown + 右侧实时预览，可拖拽调整比例
- 渲染: marked.js + highlight.js 代码高亮
- 防抖: 300ms 预览更新

### 8.6 前端技术栈

- **零框架**: 纯 HTML/CSS/JS，无 React/Vue 运行时开销
- **路由**: 基于 History API 的 SPA 路由系统
- **状态**: 发布订阅模式轻量状态管理
- **渲染**: marked.js + highlight.js（CDN加载）
- **部署**: Cloudflare Pages

---

## 九、项目目录结构（Monorepo）

```
cloudflare-blog/
├── .github/workflows/           # CI/CD
│   ├── ci.yml                   # PR 检查
│   ├── deploy-production.yml    # 生产部署
│   └── deploy-staging.yml       # 预发布部署
├── packages/
│   ├── frontend/                # 前端（Cloudflare Pages）
│   │   ├── src/
│   │   │   ├── css/             # 样式系统
│   │   │   │   ├── variables.css
│   │   │   │   ├── base.css
│   │   │   │   ├── components.css
│   │   │   │   └── layout.css
│   │   │   └── js/              # 逻辑层
│   │   │       ├── app.js       # 应用入口
│   │   │       ├── router/      # SPA 路由
│   │   │       ├── api/         # API 交互
│   │   │       ├── store/       # 状态管理
│   │   │       ├── pages/       # 页面组件
│   │   │       ├── components/  # 通用组件
│   │   │       └── utils/       # 工具函数
│   │   ├── admin/css/           # 后台专用样式
│   │   ├── public/              # 静态资源
│   │   ├── index.html           # SPA 入口
│   │   ├── wrangler.toml        # Pages 配置
│   │   └── package.json
│   └── backend/                 # 后端（Cloudflare Workers）
│       ├── src/
│       │   ├── index.ts         # Worker 入口 + 路由注册
│       │   ├── config/          # 常量 + 环境变量
│       │   ├── middleware/      # 认证/CORS/限流/校验/错误处理
│       │   ├── routes/          # API 路由
│       │   │   ├── auth.ts
│       │   │   ├── admin/       # 管理端路由
│       │   │   └── public/      # 公开路由
│       │   ├── services/        # 业务逻辑
│       │   ├── repositories/    # 数据访问
│       │   ├── storage/         # R2/KV 封装
│       │   ├── utils/           # 工具函数
│       │   └── types/           # TypeScript 类型
│       ├── migrations/          # D1 迁移脚本
│       ├── wrangler.toml        # Worker 配置
│       └── package.json
├── scripts/
│   └── init-cloudflare.sh      # 资源资源初始化脚本
└── package.json                 # Monorepo 根配置
```

---

## 十、DevOps 与部署

### 10.1 域名架构

```
example.com
├── blog.example.com          → Cloudflare Pages（前端）
├── api.blog.example.com      → Cloudflare Worker（后端API）
├── assets.blog.example.com   → Worker 代理 R2（附件访问）
├── staging.blog.example.com  → Pages 预发布
└── staging-api.blog.example.com → Worker 预发布
```

### 10.2 CI/CD 流水线

| 工作流 | 触发 | 动作 |
|--------|------|------|
| ci.yml | PR → main/develop | Lint + 类型检查 + 测试 + 构建验证 + 安全扫描 |
| deploy-staging.yml | push → develop | 部署后端到 Staging Worker + 前端到 Staging Pages |
| deploy-production.yml | push → main | D1迁移 + 部署后端 + 部署前端 + 健康检查 |

### 10.3 环境变量管理

| 层级 | 内容 | 示例 |
|------|------|------|
| wrangler.toml [vars] | 非敏感配置 | ENVIRONMENT, CORS_ORIGIN |
| wrangler secret | 敏感密钥 | JWT_SECRET, ADMIN_PASSWORD |
| GitHub Secrets | CI/CD 专用 | CLOUDFLARE_API_TOKEN |

### 10.4 SSL/HTTPS

- Cloudflare Universal SSL（免费）
- Full (Strict) 模式
- HSTS 开启 + 最低 TLS 1.2

---

## 十一、成本估算

| 日活 | 月费用 |
|------|--------|
| ≤ 1,000 | **$0**（免费额度内） |
| ~10,000 | ~$10 |
| ~100,000 | ~$11 |
| ~1,000,000 | ~$18 |

> Cloudflare 免费额度对中小型博客极其友好，核心服务全部免费。

---

## 十二、开发阶段规划

### Phase 1: 基础设施搭建
- [ ] 初始化 Monorepo 项目结构
- [ ] 配置 Cloudflare 资源（D1/R2/KV/Worker/Pages）
- [ ] 搭建后端骨架（Hono + 路由 + 中间件）
- [ ] 数据库迁移脚本
- [ ] JWT 认证系统

### Phase 2: 后端核心 API
- [ ] 文章 CRUD + 状态管理
- [ ] 分类/标签管理
- [ ] 附件上传（R2）
- [ ] 站点配置
- [ ] 前台公开 API
- [ ] RSS/Sitemap/搜索

### Phase 3: 前端前台
- [ ] CSS 设计系统（变量/组件/布局）
- [ ] SPA 路由系统
- [ ] 首页（粒子背景 + 文章卡片）
- [ ] 文章列表/详情页
- [ ] 归档/关于页
- [ ] Markdown 渲染 + 代码高亮

### Phase 4: 前端后台
- [ ] 登录页 + 认证流程
- [ ] 后台布局（侧边栏 + 顶栏）
- [ ] 仪表盘
- [ ] Markdown 编辑器（工具栏 + 实时预览）
- [ ] 文章/分类/标签管理
- [ ] 附件管理（拖拽上传）
- [ ] 站点设置

### Phase 5: 部署与优化
- [ ] GitHub Actions CI/CD
- [ ] 自定义域名 + SSL
- [ ] WAF + 速率限制
- [ ] KV 缓存优化
- [ ] 性能优化（CDN/懒加载/骨架屏）
- [ ] 监控与日志

---

## 十三、技术选型汇总

| 层面 | 选型 | 理由 |
|------|------|------|
| 运行时 | Cloudflare Workers | 全球边缘部署，冷启动 <5ms |
| 路由框架 | Hono | 专为 Workers 设计，14KB，TS 优先 |
| 数据库 | Cloudflare D1 | Workers 原生集成，SQLite 兼容 |
| 对象存储 | Cloudflare R2 | 无出口流量费，零延迟集成 |
| 缓存 | Cloudflare KV | 边缘读取极快，读多写少场景 |
| 参数校验 | Zod | TS 类型推导，与 Hono 深度集成 |
| JWT | jose | Workers 兼容，支持 HS256 |
| 密码哈希 | bcryptjs | 纯 JS，兼容 Workers 运行时 |
| HTML清理 | sanitize-html | 防 XSS |
| Markdown | marked + highlight.js | 预渲染 HTML，前台直接输出 |
| 前端 | 纯 HTML/CSS/JS | 零框架，极致性能 |
| CI/CD | GitHub Actions | 免费，与 Cloudflare 深度集成 |
