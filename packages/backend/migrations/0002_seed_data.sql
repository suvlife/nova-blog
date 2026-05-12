-- D1 数据库迁移：初始种子数据
-- 迁移编号：0002
-- 说明：插入默认管理员、站点配置、示例分类/标签/文章

-- ============================================================
-- 1. 默认管理员用户
-- ============================================================
INSERT INTO users (id, username, email, password_hash, display_name, role, status)
VALUES (
  'admin-001',
  'admin',
  'admin@example.com',
  '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu6GK',
  '管理员',
  'admin',
  'active'
);

-- ============================================================
-- 2. 默认站点配置
-- ============================================================
INSERT INTO settings (key, value) VALUES ('site_title', '"Nova Blog"');
INSERT INTO settings (key, value) VALUES ('site_description', '"一个基于 Cloudflare 的现代化博客系统"');
INSERT INTO settings (key, value) VALUES ('site_url', '"https://blog.example.com"');
INSERT INTO settings (key, value) VALUES ('posts_per_page', '"10"');
INSERT INTO settings (key, value) VALUES ('rss_enabled', '"true"');
INSERT INTO settings (key, value) VALUES ('comment_enabled', '"true"');
INSERT INTO settings (key, value) VALUES ('author_name', '"博主"');
INSERT INTO settings (key, value) VALUES ('author_bio', '"热爱技术，热爱生活"');
INSERT INTO settings (key, value) VALUES ('author_avatar', '""');
INSERT INTO settings (key, value) VALUES ('social_github', '""');
INSERT INTO settings (key, value) VALUES ('social_twitter', '""');
INSERT INTO settings (key, value) VALUES ('social_email', '""');

-- ============================================================
-- 3. 示例分类
-- ============================================================
INSERT INTO categories (id, name, slug, description, sort_order)
VALUES
  ('cat-001', '技术笔记', 'tech-notes', '技术相关的学习笔记和实践总结', 1),
  ('cat-002', '生活随笔', 'life-essays', '生活中的点滴感悟', 2);

-- ============================================================
-- 4. 示例标签
-- ============================================================
INSERT INTO tags (id, name, slug)
VALUES
  ('tag-001', 'Cloudflare', 'cloudflare'),
  ('tag-002', 'TypeScript', 'typescript'),
  ('tag-003', 'JavaScript', 'javascript');

-- ============================================================
-- 5. 示例文章
-- ============================================================
INSERT INTO posts (
  id,
  title,
  slug,
  excerpt,
  content,
  content_html,
  category_id,
  author_id,
  status,
  visibility,
  is_pinned,
  allow_comment,
  view_count,
  word_count,
  published_at
) VALUES (
  'post-001',
  '欢迎来到 Nova Blog',
  'welcome-to-nova-blog',
  'Nova Blog 是一个基于 Cloudflare 全栈技术构建的现代化博客系统，本文将介绍它的核心特性。',
  '# 欢迎来到 Nova Blog

Nova Blog 是一个基于 **Cloudflare 全栈技术**构建的现代化博客系统。它充分利用了 Cloudflare 的边缘计算能力，为读者带来极速的访问体验。

## 核心特性

### 边缘优先架构
- 基于 **Cloudflare Workers** 运行，全球边缘节点部署
- 使用 **D1 数据库**提供低延迟的数据访问
- 通过 **R2 存储**管理媒体资源，零出站流量费用

### 现代化技术栈
- **Hono** - 轻量级、高性能的 Web 框架
- **TypeScript** - 全栈类型安全
- **Markdown** - 支持 Markdown 编写，实时预览

### 功能完备
- 文章发布与管理（草稿、发布、归档）
- 分类与标签系统（支持无限级分类嵌套）
- 媒体资源管理（图片、文件上传至 R2）
- 站点配置管理
- SEO 友好（Slug URL、Open Graph 支持）

## 快速开始

1. 克隆项目仓库
2. 配置 `wrangler.toml` 和 `.dev.vars`
3. 运行 `npm run dev` 启动本地开发
4. 使用默认管理员账号登录（请及时修改密码）

## 致谢

感谢 Cloudflare 提供优秀的开发者平台，感谢开源社区的贡献。

> 用技术记录生活，用文字分享热爱。',
  '<h1>欢迎来到 Nova Blog</h1>
<p>Nova Blog 是一个基于 <strong>Cloudflare 全栈技术</strong>构建的现代化博客系统。它充分利用了 Cloudflare 的边缘计算能力，为读者带来极速的访问体验。</p>
<h2>核心特性</h2>
<h3>边缘优先架构</h3>
<ul>
<li>基于 <strong>Cloudflare Workers</strong> 运行，全球边缘节点部署</li>
<li>使用 <strong>D1 数据库</strong>提供低延迟的数据访问</li>
<li>通过 <strong>R2 存储</strong>管理媒体资源，零出站流量费用</li>
</ul>
<h3>现代化技术栈</h3>
<ul>
<li><strong>Hono</strong> - 轻量级、高性能的 Web 框架</li>
<li><strong>TypeScript</strong> - 全栈类型安全</li>
<li><strong>Markdown</strong> - 支持 Markdown 编写，实时预览</li>
</ul>
<h3>功能完备</h3>
<ul>
<li>文章发布与管理（草稿、发布、归档）</li>
<li>分类与标签系统（支持无限级分类嵌套）</li>
<li>媒体资源管理（图片、文件上传至 R2）</li>
<li>站点配置管理</li>
<li>SEO 友好（Slug URL、Open Graph 支持）</li>
</ul>
<h2>快速开始</h2>
<ol>
<li>克隆项目仓库</li>
<li>配置 <code>wrangler.toml</code> 和 <code>.dev.vars</code></li>
<li>运行 <code>npm run dev</code> 启动本地开发</li>
<li>使用默认管理员账号登录（请及时修改密码）</li>
</ol>
<h2>致谢</h2>
<p>感谢 Cloudflare 提供优秀的开发者平台，感谢开源社区的贡献。</p>
<blockquote>
<p>用技术记录生活，用文字分享热爱。</p>
</blockquote>',
  'cat-001',
  'admin-001',
  'published',
  'public',
  1,
  1,
  0,
  380,
  (datetime('now'))
);

-- ============================================================
-- 6. 文章-标签关联
-- ============================================================
INSERT INTO post_tags (post_id, tag_id)
VALUES ('post-001', 'tag-001');
