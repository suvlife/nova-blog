/**
 * Nova Blog - 后台管理页面渲染函数
 * 每个函数返回完整的酷炫 HTML 字符串
 * 深空赛博风格 - Deep Space Cyber Admin
 */

const NovaAdmin = (() => {
  'use strict';

  const H = window.NovaHelpers;
  const store = window.NovaStore;

  /**
   * 渲染侧边栏
   * 包含：Logo渐变文字、分组菜单（图标）、查看站点链接、退出登录、折叠按钮、激活项高亮
   * @param {string} active - 当前激活的菜单项
   * @returns {string} HTML
   */
  function renderAdminSidebar(active = 'dashboard') {
    const collapsed = store.getState('sidebarCollapsed');

    // 分组菜单配置
    const menuItems = [
      {
        group: '概览',
        items: [
          {
            key: 'dashboard',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
            label: '仪表盘',
            href: '/admin'
          }
        ]
      },
      {
        group: '内容',
        items: [
          {
            key: 'posts',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
            label: '文章管理',
            href: '/admin/posts'
          },
          {
            key: 'categories',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
            label: '分类管理',
            href: '/admin/categories'
          },
          {
            key: 'tags',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
            label: '标签管理',
            href: '/admin/tags'
          }
        ]
      },
      {
        group: '资源',
        items: [
          {
            key: 'media',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
            label: '附件管理',
            href: '/admin/media'
          }
        ]
      },
      {
        group: '系统',
        items: [
          {
            key: 'settings',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
            label: '站点设置',
            href: '/admin/settings'
          }
        ]
      }
    ];

    // 渲染菜单
    const menuHtml = menuItems.map(group => `
      <div class="sidebar-group">
        <div class="sidebar-group-title">${group.group}</div>
        ${group.items.map(item => `
          <a href="${item.href}" class="sidebar-item ${active === item.key ? 'sidebar-item-active' : ''}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </div>
    `).join('');

    return `
      <aside class="admin-sidebar ${collapsed ? 'admin-sidebar-collapsed' : ''}" id="admin-sidebar">
        <!-- Logo: "Nova" 渐变文字 -->
        <div class="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#sidebar-logo-grad)" />
            <path d="M2 17L12 22L22 17" stroke="url(#sidebar-logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="url(#sidebar-logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="sidebar-logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stop-color="#00F5D4"/>
                <stop offset="1" stop-color="#6C5CE7"/>
              </linearGradient>
            </defs>
          </svg>
          <span>Nova</span>
        </div>

        <!-- 导航菜单 -->
        <nav class="sidebar-nav">
          ${menuHtml}
        </nav>

        <!-- 底部操作区 -->
        <div style="border-top: 1px solid var(--color-border); padding: var(--space-md);">
          <!-- 查看站点链接 -->
          <a href="/" target="_blank" class="sidebar-item" style="margin: 0; width: 100%;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>查看站点</span>
          </a>
          <!-- 退出登录按钮 -->
          <button class="sidebar-item" id="admin-logout" style="margin: 2px 0 0; width: 100%; color: var(--color-danger);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>退出登录</span>
          </button>
        </div>

        <!-- 折叠按钮 -->
        <button class="sidebar-toggle" id="sidebar-toggle" title="收起/展开侧边栏">
          ${collapsed
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'
          }
        </button>
      </aside>
    `;
  }

  /**
   * 渲染顶栏
   * 包含：面包屑导航、用户头像+用户名
   * @param {string} breadcrumb - 面包屑文字
   * @returns {string} HTML
   */
  function renderAdminTopbar(breadcrumb = '仪表盘') {
    const user = store.getState('user') || {};
    const username = user.username || '管理员';
    const initial = username[0].toUpperCase();

    return `
      <div class="admin-topbar">
        <!-- 面包屑导航 -->
        <div class="admin-topbar-breadcrumb">
          <a href="/admin" style="color: var(--color-text-muted); text-decoration: none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            管理后台
          </a>
          <span style="color: var(--color-text-muted);">/</span>
          <span>${H.escapeHtml(breadcrumb)}</span>
        </div>

        <!-- 右侧: 用户头像 + 用户名 -->
        <div class="admin-topbar-user">
          <span class="user-name">${H.escapeHtml(username)}</span>
          <div class="user-avatar" style="background: var(--gradient-primary); color: #fff; font-weight: var(--font-weight-bold);">${initial}</div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染后台布局容器
   * 侧边栏 + 顶栏 + 内容区
   * @param {string} content - 页面内容 HTML
   * @param {string} active - 当前激活菜单
   * @param {string} breadcrumb - 面包屑文字
   * @returns {string} HTML
   */
  function renderAdminLayout(content, active = 'dashboard', breadcrumb = '仪表盘') {
    return `
      <div class="admin-layout">
        ${renderAdminSidebar(active)}
        <div class="admin-main">
          ${renderAdminTopbar(breadcrumb)}
          <div class="admin-content">
            ${content}
          </div>
        </div>
      </div>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
    `;
  }

  /**
   * 渲染登录页
   * 包含：居中卡片（毛玻璃效果）、Logo+标题、输入框、渐变登录按钮、底部文字
   * @returns {string} HTML
   */
  function renderLoginPage() {
    return `
      <div class="login-page">
        <!-- 毛玻璃效果登录卡片 -->
        <div class="login-card glass" style="background: rgba(18, 18, 42, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
          <!-- Logo + 标题 -->
          <div style="text-align: center; margin-bottom: var(--space-xl);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin-bottom: var(--space-md);">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#login-logo-grad)" />
              <path d="M2 17L12 22L22 17" stroke="url(#login-logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="url(#login-logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="login-logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#00F5D4"/>
                  <stop offset="1" stop-color="#6C5CE7"/>
                </linearGradient>
              </defs>
            </svg>
            <h1>Nova Blog</h1>
            <p class="login-subtitle">管理后台登录</p>
          </div>

          <!-- 登录表单 -->
          <form id="login-form">
            <!-- 用户名输入框 -->
            <div class="form-group">
              <label for="login-username">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                用户名
              </label>
              <input type="text" id="login-username" class="input" placeholder="请输入用户名" autocomplete="username" required>
            </div>

            <!-- 密码输入框 -->
            <div class="form-group">
              <label for="login-password">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                密码
              </label>
              <input type="password" id="login-password" class="input" placeholder="请输入密码" autocomplete="current-password" required>
            </div>

            <!-- 登录按钮（渐变背景） -->
            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-lg" style="background: var(--gradient-accent); border-color: transparent; color: var(--color-bg-primary); font-weight: var(--font-weight-bold); font-size: var(--font-size-base);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                登录
              </button>
            </div>
          </form>

          <!-- 底部文字 -->
          <p style="text-align: center; color: var(--color-text-muted); font-size: var(--font-size-xs); margin-top: var(--space-xl);">
            Nova Blog 管理后台
          </p>
        </div>
      </div>
    `;
  }

  /**
   * 渲染仪表盘
   * 包含：4个统计卡片（图标+数值+标签+渐变背景）、最近文章表格
   * @returns {string} HTML
   */
  async function renderAdminDashboard() {
    let stats = {};

    try {
      const result = await NovaStats.overview();
      stats = result.data || result;
    } catch {
      // API 不可用时使用默认值
    }

    // 获取最近文章
    let recentPosts = [];
    try {
      const result = await NovaPosts.list({ page: 1, pageSize: 5 });
      recentPosts = result.data?.list || result.list || result.data || [];
    } catch {
      // API 不可用
    }

    const recentRows = recentPosts.length > 0
      ? recentPosts.map(post => `
          <tr class="admin-table-row">
            <td class="admin-table-cell" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <a href="/admin/posts/edit/${H.escapeHtml(post.slug)}" style="color: var(--color-text-primary); text-decoration: none;">${H.escapeHtml(post.title)}</a>
            </td>
            <td class="admin-table-cell">${H.escapeHtml(post.category?.name || post.category || '-')}</td>
            <td class="admin-table-cell">
              <span class="badge ${post.status === 'published' ? 'badge-success' : post.status === 'draft' ? 'badge-warning' : 'badge-primary'}">
                ${post.status === 'published' ? '已发布' : post.status === 'draft' ? '草稿' : H.escapeHtml(post.status || '草稿')}
              </span>
            </td>
            <td class="admin-table-cell">${H.formatDate(post.publishedAt || post.createdAt)}</td>
            <td class="admin-table-cell">
              <div class="admin-table-actions">
                <a href="/admin/posts/edit/${H.escapeHtml(post.slug)}" class="btn btn-sm btn-ghost">编辑</a>
              </div>
            </td>
          </tr>
        `).join('')
      : `
          <tr class="admin-table-row">
            <td class="admin-table-cell" colspan="5" style="text-align: center; color: var(--color-text-muted);">
              暂无文章，<a href="/admin/posts/new">点击创建</a>
            </td>
          </tr>
        `;

    const content = `
      <div class="admin-page-header">
        <h2>仪表盘</h2>
      </div>

      <!-- 4个统计卡片 -->
      <div class="stats-grid">
        <!-- 文章总数 -->
        <div class="stat-card" style="border-top: 3px solid var(--color-primary);">
          <div class="stat-card-icon" style="background: rgba(108, 92, 231, 0.2);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div>
            <div class="stat-card-value">${stats.postCount || 0}</div>
            <div class="stat-card-label">文章总数</div>
          </div>
        </div>

        <!-- 分类数量 -->
        <div class="stat-card" style="border-top: 3px solid var(--color-accent);">
          <div class="stat-card-icon" style="background: rgba(0, 245, 212, 0.15); color: var(--color-accent);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <div class="stat-card-value">${stats.categoryCount || 0}</div>
            <div class="stat-card-label">分类数量</div>
          </div>
        </div>

        <!-- 标签数量 -->
        <div class="stat-card" style="border-top: 3px solid var(--color-secondary);">
          <div class="stat-card-icon" style="background: rgba(253, 121, 168, 0.15); color: var(--color-secondary);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a6 6 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div>
            <div class="stat-card-value">${stats.tagCount || 0}</div>
            <div class="stat-card-label">标签数量</div>
          </div>
        </div>

        <!-- 总浏览量 -->
        <div class="stat-card" style="border-top: 3px solid var(--color-info);">
          <div class="stat-card-icon" style="background: rgba(116, 185, 255, 0.15); color: var(--color-info);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <div class="stat-card-value">${stats.viewCount || 0}</div>
            <div class="stat-card-label">总浏览量</div>
          </div>
        </div>
      </div>

      <!-- 最近文章表格 -->
      <div style="margin-top: var(--space-2xl);">
        <div class="admin-page-header">
          <h3 style="font-size: var(--font-size-lg);">最近文章</h3>
          <a href="/admin/posts" class="btn btn-sm btn-ghost">查看全部</a>
        </div>

        <table class="admin-table">
          <thead class="admin-table-header">
            <tr>
              <th class="admin-table-cell">标题</th>
              <th class="admin-table-cell">分类</th>
              <th class="admin-table-cell">状态</th>
              <th class="admin-table-cell">日期</th>
              <th class="admin-table-cell">操作</th>
            </tr>
          </thead>
          <tbody>
            ${recentRows}
          </tbody>
        </table>
      </div>

      <!-- 快捷操作 -->
      <div style="margin-top: var(--space-2xl);">
        <div class="admin-page-header">
          <h3 style="font-size: var(--font-size-lg);">快捷操作</h3>
        </div>
        <div class="grid grid-3">
          <a href="/admin/posts/new" class="card card-hover" style="text-align: center; text-decoration: none;">
            <div style="font-size: 32px; margin-bottom: var(--space-sm);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <div style="color: var(--color-text-primary); font-weight: 500;">撰写新文章</div>
          </a>
          <a href="/admin/media" class="card card-hover" style="text-align: center; text-decoration: none;">
            <div style="font-size: 32px; margin-bottom: var(--space-sm);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </div>
            <div style="color: var(--color-text-primary); font-weight: 500;">上传附件</div>
          </a>
          <a href="/admin/settings" class="card card-hover" style="text-align: center; text-decoration: none;">
            <div style="font-size: 32px; margin-bottom: var(--space-sm);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <div style="color: var(--color-text-primary); font-weight: 500;">站点设置</div>
          </a>
        </div>
      </div>
    `;

    return renderAdminLayout(content, 'dashboard', '仪表盘');
  }

  /**
   * 渲染文章管理页
   * 包含：标题+新建按钮、状态筛选+搜索框、文章表格、分页
   * @returns {string} HTML
   */
  async function renderAdminPosts() {
    let posts = [];
    let pagination = {};

    try {
      const result = await NovaPosts.list({ page: 1, pageSize: 20 });
      posts = result.data?.list || result.list || result.data || [];
      pagination = result.data?.pagination || result.pagination || {};
    } catch {
      // API 不可用
    }

    const rows = posts.length > 0
      ? posts.map(post => `
          <tr class="admin-table-row">
            <td class="admin-table-cell" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <a href="/admin/posts/edit/${H.escapeHtml(post.slug)}" style="color: var(--color-text-primary); text-decoration: none;">${H.escapeHtml(post.title)}</a>
            </td>
            <td class="admin-table-cell">${H.escapeHtml(post.category?.name || post.category || '-')}</td>
            <td class="admin-table-cell">
              ${(post.tags || []).map(t => `<span class="tag tag-accent" style="margin: 1px;">${H.escapeHtml(t.name || t)}</span>`).join('')}
            </td>
            <td class="admin-table-cell">
              <span class="badge ${post.status === 'published' ? 'badge-success' : post.status === 'draft' ? 'badge-warning' : post.status === 'archived' ? 'badge-primary' : 'badge-warning'}">
                ${post.status === 'published' ? '已发布' : post.status === 'draft' ? '草稿' : post.status === 'archived' ? '已归档' : H.escapeHtml(post.status)}
              </span>
            </td>
            <td class="admin-table-cell">${H.formatDate(post.publishedAt || post.createdAt)}</td>
            <td class="admin-table-cell">
              <div class="admin-table-actions">
                <a href="/admin/posts/edit/${H.escapeHtml(post.slug)}" class="btn btn-sm btn-ghost">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  编辑
                </a>
                <button class="btn btn-sm btn-danger" onclick="deletePost('${post.id || post._id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  删除
                </button>
              </div>
            </td>
          </tr>
        `).join('')
      : `
          <tr class="admin-table-row">
            <td class="admin-table-cell" colspan="6" style="text-align: center;">
              暂无文章，<a href="/admin/posts/new">点击创建</a>
            </td>
          </tr>
        `;

    // 分页
    const paginationHtml = pagination.totalPages > 1 ? `
      <div class="pagination">
        ${pagination.page > 1 ? `<a href="/admin/posts?page=${pagination.page - 1}" class="pagination-item">&laquo;</a>` : ''}
        ${Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
          const pageNum = i + 1;
          return `<a href="/admin/posts?page=${pageNum}" class="pagination-item ${pageNum === pagination.page ? 'pagination-active' : ''}">${pageNum}</a>`;
        }).join('')}
        ${pagination.page < pagination.totalPages ? `<a href="/admin/posts?page=${pagination.page + 1}" class="pagination-item">&raquo;</a>` : ''}
      </div>
    ` : '';

    const content = `
      <!-- 标题 + 新建文章按钮 -->
      <div class="admin-page-header">
        <h2>文章管理</h2>
        <div class="header-actions">
          <a href="/admin/posts/new" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建文章
          </a>
        </div>
      </div>

      <!-- 筛选栏: 状态筛选 + 搜索框 -->
      <div class="admin-filters">
        <select class="select" id="status-filter" style="width: auto; min-width: 140px;">
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
        <div class="search-box" style="flex: 1; min-width: 200px;">
          <svg class="search-box-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="input" id="posts-search" placeholder="搜索文章..." style="padding-left: var(--space-2xl);">
        </div>
      </div>

      <!-- 文章表格 -->
      <table class="admin-table">
        <thead class="admin-table-header">
          <tr>
            <th class="admin-table-cell">标题</th>
            <th class="admin-table-cell">分类</th>
            <th class="admin-table-cell">标签</th>
            <th class="admin-table-cell">状态</th>
            <th class="admin-table-cell">日期</th>
            <th class="admin-table-cell">操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- 分页 -->
      ${paginationHtml}
    `;

    return renderAdminLayout(content, 'posts', '文章管理');
  }

  /**
   * 渲染文章编辑器页
   * 包含：标题输入、Slug输入、Markdown编辑器容器、右侧设置面板
   * @param {string} slug - 文章 Slug（为空则新建）
   * @returns {string} HTML
   */
  async function renderAdminPostEditor(slug) {
    let post = {};
    let categories = [];
    let tags = [];

    if (slug) {
      try {
        const result = await NovaPosts.get(slug);
        post = result.data || result;
      } catch {
        // 文章获取失败
      }
    }

    try {
      const catResult = await NovaCategories.list();
      categories = catResult.data?.list || catResult.list || catResult.data || [];
    } catch {
      // API 不可用
    }

    try {
      const tagResult = await NovaTags.list();
      tags = tagResult.data?.list || tagResult.list || tagResult.data || [];
    } catch {
      // API 不可用
    }

    const categoryOptions = categories.map(cat =>
      `<option value="${H.escapeHtml(cat.id || cat._id)}" ${post.category?.id === (cat.id || cat._id) ? 'selected' : ''}>${H.escapeHtml(cat.name)}</option>`
    ).join('');

    const tagCheckboxes = tags.map(tag =>
      `<label style="display: inline-flex; align-items: center; gap: 4px; margin: 2px var(--space-sm) 2px 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); cursor: pointer;">
        <input type="checkbox" name="tags" value="${H.escapeHtml(tag.id || tag._id)}"
          ${(post.tags || []).some(t => (t.id || t._id) === (tag.id || tag._id)) ? 'checked' : ''}>
        ${H.escapeHtml(tag.name)}
      </label>`
    ).join('');

    const content = `
      <div class="admin-page-header">
        <h2>${slug ? '编辑文章' : '新建文章'}</h2>
        <div class="header-actions">
          <button class="btn btn-ghost" onclick="history.back()">取消</button>
          <button class="btn btn-accent" id="save-draft">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            保存草稿
          </button>
          <button class="btn btn-primary" id="publish-post">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            发布
          </button>
        </div>
      </div>

      <div class="editor-layout">
        <div class="editor-main">
          <!-- 标题输入框（大号） -->
          <div style="padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--color-border);">
            <input type="text" id="post-title" class="input" placeholder="输入文章标题..."
              value="${H.escapeHtml(post.title || '')}"
              style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); border: none; background: transparent; padding: 0; color: var(--color-text-primary);">
          </div>

          <!-- Slug 输入框 -->
          <div style="padding: var(--space-sm) var(--space-lg); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: var(--space-sm);">
            <span style="color: var(--color-text-muted); font-size: var(--font-size-sm); font-family: var(--font-mono);">slug:</span>
            <input type="text" id="post-slug" class="input" placeholder="url-friendly-slug"
              value="${H.escapeHtml(post.slug || '')}"
              style="border: none; background: transparent; padding: 0; font-family: var(--font-mono); font-size: var(--font-size-sm); color: var(--color-accent);">
          </div>

          <!-- Markdown 编辑器容器 -->
          <div id="markdown-editor-container" style="flex: 1;"></div>
        </div>

        <!-- 右侧设置面板 -->
        <div class="editor-sidebar">
          <!-- 发布设置 -->
          <div class="field-group">
            <label class="field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              发布设置
            </label>
            <select id="post-status" class="select">
              <option value="draft" ${post.status === 'draft' ? 'selected' : ''}>草稿</option>
              <option value="published" ${post.status === 'published' ? 'selected' : ''}>已发布</option>
              <option value="archived" ${post.status === 'archived' ? 'selected' : ''}>已归档</option>
            </select>
          </div>

          <!-- 分类选择 -->
          <div class="field-group">
            <label class="field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              分类
            </label>
            <select id="post-category" class="select">
              <option value="">选择分类</option>
              ${categoryOptions}
            </select>
          </div>

          <!-- 标签选择 -->
          <div class="field-group">
            <label class="field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M20.59 13.41l-7.17 7.17a6 6 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              标签
            </label>
            <div style="margin-top: var(--space-sm);">
              ${tagCheckboxes || '<span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">暂无标签</span>'}
            </div>
          </div>

          <!-- 摘要 -->
          <div class="field-group">
            <label class="field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
              摘要
            </label>
            <textarea id="post-excerpt" class="textarea" rows="3" placeholder="文章摘要...">${H.escapeHtml(post.excerpt || '')}</textarea>
          </div>

          <!-- 封面图URL -->
          <div class="field-group">
            <label class="field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              封面图片
            </label>
            <input type="text" id="post-cover" class="input" placeholder="封面图片 URL"
              value="${H.escapeHtml(post.coverImage || '')}">
            <button class="btn btn-sm btn-ghost" style="margin-top: var(--space-sm);" id="select-cover">从附件选择</button>
          </div>
        </div>
      </div>
    `;

    return renderAdminLayout(content, 'posts', slug ? '编辑文章' : '新建文章');
  }

  /**
   * 渲染分类管理页
   * 包含：标题+新建分类按钮、数据表格、新建分类模态框
   * @returns {string} HTML
   */
  async function renderAdminCategories() {
    let categories = [];

    try {
      const result = await NovaCategories.list();
      categories = result.data?.list || result.list || result.data || [];
    } catch {
      // API 不可用
    }

    const rows = categories.length > 0
      ? categories.map(cat => `
          <tr class="admin-table-row">
            <td class="admin-table-cell">
              <span style="color: var(--color-text-primary); font-weight: var(--font-weight-medium);">${H.escapeHtml(cat.name)}</span>
            </td>
            <td class="admin-table-cell"><code style="font-family: var(--font-mono); font-size: var(--font-size-xs); color: var(--color-accent);">${H.escapeHtml(cat.slug)}</code></td>
            <td class="admin-table-cell">
              <span style="font-family: var(--font-mono); color: var(--color-text-primary);">${cat.postCount || 0}</span>
            </td>
            <td class="admin-table-cell">
              <span style="font-family: var(--font-mono); color: var(--color-text-muted);">${cat.sortOrder || 0}</span>
            </td>
            <td class="admin-table-cell">
              <div class="admin-table-actions">
                <button class="btn btn-sm btn-ghost" onclick="editCategory('${cat.id || cat._id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory('${cat.id || cat._id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  删除
                </button>
              </div>
            </td>
          </tr>
        `).join('')
      : `
          <tr class="admin-table-row">
            <td class="admin-table-cell" colspan="5" style="text-align: center; color: var(--color-text-muted);">
              暂无分类，请在下方创建
            </td>
          </tr>
        `;

    const content = `
      <!-- 标题 + 新建分类按钮 -->
      <div class="admin-page-header">
        <h2>分类管理</h2>
        <div class="header-actions">
          <button class="btn btn-primary" id="new-category-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建分类
          </button>
        </div>
      </div>

      <!-- 数据表格 -->
      <table class="admin-table">
        <thead class="admin-table-header">
          <tr>
            <th class="admin-table-cell">名称</th>
            <th class="admin-table-cell">Slug</th>
            <th class="admin-table-cell">文章数</th>
            <th class="admin-table-cell">排序</th>
            <th class="admin-table-cell">操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- 新建分类模态框（内联表单） -->
      <div class="card" style="margin-top: var(--space-xl);">
        <h3 style="margin-bottom: var(--space-md); font-size: var(--font-size-base); color: var(--color-text-primary);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建分类
        </h3>
        <form id="category-form" style="display: flex; gap: var(--space-md); align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 160px;">
            <label class="settings-field-label">名称 <span class="required">*</span></label>
            <input type="text" id="cat-name" class="input" placeholder="分类名称" required>
          </div>
          <div style="flex: 1; min-width: 160px;">
            <label class="settings-field-label">Slug</label>
            <input type="text" id="cat-slug" class="input" placeholder="category-slug">
          </div>
          <div style="flex: 1; min-width: 160px;">
            <label class="settings-field-label">描述</label>
            <input type="text" id="cat-description" class="input" placeholder="分类描述">
          </div>
          <button type="submit" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg>
            创建
          </button>
        </form>
      </div>
    `;

    return renderAdminLayout(content, 'categories', '分类管理');
  }

  /**
   * 渲染标签管理页
   * 包含：标题+新建标签按钮、标签卡片网格、新建标签模态框
   * @returns {string} HTML
   */
  async function renderAdminTags() {
    let tags = [];

    try {
      const result = await NovaTags.list();
      tags = result.data?.list || result.list || result.data || [];
    } catch {
      // API 不可用
    }

    // 标签颜色循环
    const tagColors = ['primary', 'accent', 'secondary', 'info'];

    const tagCards = tags.length > 0
      ? tags.map((tag, index) => {
          const color = tagColors[index % tagColors.length];
          return `
            <div class="card card-hover" style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-md);">
              <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <span class="tag tag-${color}" style="font-size: var(--font-size-sm); padding: var(--space-xs) var(--space-md);">${H.escapeHtml(tag.name)}</span>
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${tag.postCount || 0} 篇文章</span>
              </div>
              <div class="admin-table-actions">
                <button class="btn btn-sm btn-ghost" onclick="editTag('${tag.id || tag._id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTag('${tag.id || tag._id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          `;
        }).join('')
      : `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">&#127991;</div>
          <h3 class="empty-state-title">暂无标签</h3>
          <p class="empty-state-desc">请在下方创建新标签</p>
        </div>
      `;

    const content = `
      <!-- 标题 + 新建标签按钮 -->
      <div class="admin-page-header">
        <h2>标签管理</h2>
        <div class="header-actions">
          <button class="btn btn-primary" id="new-tag-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建标签
          </button>
        </div>
      </div>

      <!-- 标签卡片网格 -->
      <div class="grid grid-3" style="margin-bottom: var(--space-xl);">
        ${tagCards}
      </div>

      <!-- 新建标签模态框（内联表单） -->
      <div class="card">
        <h3 style="margin-bottom: var(--space-md); font-size: var(--font-size-base); color: var(--color-text-primary);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建标签
        </h3>
        <form id="tag-form" style="display: flex; gap: var(--space-md); align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 160px;">
            <label class="settings-field-label">名称 <span class="required">*</span></label>
            <input type="text" id="tag-name" class="input" placeholder="标签名称" required>
          </div>
          <div style="flex: 1; min-width: 160px;">
            <label class="settings-field-label">Slug</label>
            <input type="text" id="tag-slug" class="input" placeholder="tag-slug">
          </div>
          <button type="submit" class="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg>
            创建
          </button>
        </form>
      </div>
    `;

    return renderAdminLayout(content, 'tags', '标签管理');
  }

  /**
   * 渲染附件管理页
   * 包含：标题、拖拽上传区域、上传进度条、媒体网格
   * @returns {string} HTML
   */
  async function renderAdminMedia() {
    let attachments = [];

    try {
      const result = await NovaAttachments.list({ page: 1, pageSize: 50 });
      attachments = result.data?.list || result.list || result.data || [];
    } catch {
      // API 不可用
    }

    const mediaItems = attachments.length > 0
      ? attachments.map(att => {
          // 判断是否为图片
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.originalName || att.filename || att.url || '');
          const fileUrl = H.escapeHtml(att.url || att.thumbnailUrl || '');

          if (isImage) {
            return `
              <div class="media-item" data-id="${att.id || att._id}">
                <img src="${fileUrl}" alt="${H.escapeHtml(att.originalName || att.filename)}" loading="lazy">
                <div class="media-item-actions">
                  <button class="btn btn-icon btn-sm btn-ghost" title="复制链接" onclick="NovaHelpers.copyToClipboard('${fileUrl}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                  <button class="btn btn-icon btn-sm btn-danger" title="删除" onclick="deleteAttachment('${att.id || att._id}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                <!-- 文件名 + 大小 -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: var(--space-xs) var(--space-sm); background: rgba(10,10,26,0.8); font-size: var(--font-size-xs); color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${H.escapeHtml(att.originalName || att.filename)}
                </div>
              </div>
            `;
          }

          // 非图片文件 - 显示文件图标
          return `
            <div class="media-item" data-id="${att.id || att._id}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-sm);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${H.escapeHtml(att.originalName || att.filename)}</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${H.formatBytes(att.size || 0)}</span>
              <div class="media-item-actions" style="position: relative; opacity: 1;">
                <button class="btn btn-icon btn-sm btn-ghost" title="复制链接" onclick="NovaHelpers.copyToClipboard('${fileUrl}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
                <button class="btn btn-icon btn-sm btn-danger" title="删除" onclick="deleteAttachment('${att.id || att._id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          `;
        }).join('')
      : `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">&#128247;</div>
            <h3 class="empty-state-title">暂无附件</h3>
            <p class="empty-state-desc">拖拽文件到下方区域上传</p>
          </div>
        `;

    const content = `
      <div class="admin-page-header">
        <h2>附件管理</h2>
      </div>

      <!-- 拖拽上传区域 -->
      <div class="upload-zone" id="upload-zone">
        <div class="upload-zone-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="upload-zone-text">拖拽文件到此处上传，或点击选择文件</div>
        <div class="upload-zone-hint">支持 JPG、PNG、GIF、WebP、SVG 格式，单文件最大 10MB</div>
        <input type="file" id="file-input" multiple accept="image/*" style="display: none;">
      </div>

      <!-- 上传进度条 -->
      <div id="upload-progress" style="margin-top: var(--space-md); display: none;">
        <div class="progress">
          <div class="progress-bar" id="upload-progress-bar" style="width: 0%;"></div>
        </div>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: var(--space-xs);">
          上传中... <span id="upload-percent">0</span>%
        </p>
      </div>

      <!-- 媒体网格 -->
      <div class="media-grid" style="margin-top: var(--space-xl);">
        ${mediaItems}
      </div>
    `;

    return renderAdminLayout(content, 'media', '附件管理');
  }

  /**
   * 渲染站点设置页
   * 包含：基本设置、个人信息、社交链接、保存按钮
   * @returns {string} HTML
   */
  async function renderAdminSettings() {
    let settings = {};

    try {
      const result = await NovaSettings.get();
      settings = result.data || result;
    } catch {
      settings = store.getState('siteSettings') || {};
    }

    const content = `
      <div class="admin-page-header">
        <h2>站点设置</h2>
        <div class="header-actions">
          <button class="btn btn-primary" id="save-settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            保存设置
          </button>
        </div>
      </div>

      <form id="settings-form">
        <!-- 基本设置 -->
        <div class="settings-group">
          <h3 class="settings-group-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            基本设置
          </h3>

          <div class="settings-field">
            <label class="settings-field-label">站点名称 <span class="required">*</span></label>
            <input type="text" name="siteName" class="input" value="${H.escapeHtml(settings.siteName || '')}" placeholder="Nova Blog">
          </div>

          <div class="settings-field">
            <label class="settings-field-label">站点描述</label>
            <textarea name="siteDescription" class="textarea" rows="3" placeholder="一句话描述你的博客">${H.escapeHtml(settings.siteDescription || '')}</textarea>
          </div>

          <div class="settings-field">
            <label class="settings-field-label">站点 URL</label>
            <input type="url" name="siteUrl" class="input" value="${H.escapeHtml(settings.siteUrl || '')}" placeholder="https://your-blog.com">
            <div class="field-help">用于生成 RSS 和 Sitemap 的基础 URL</div>
          </div>
        </div>

        <!-- 个人信息 -->
        <div class="settings-group">
          <h3 class="settings-group-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            个人信息
          </h3>

          <div class="settings-field">
            <label class="settings-field-label">作者名称</label>
            <input type="text" name="authorName" class="input" value="${H.escapeHtml(settings.authorName || '')}" placeholder="你的名字">
          </div>

          <div class="settings-field">
            <label class="settings-field-label">个人简介</label>
            <textarea name="authorBio" class="textarea" rows="3" placeholder="简单介绍一下自己...">${H.escapeHtml(settings.authorBio || '')}</textarea>
          </div>

          <div class="settings-field">
            <label class="settings-field-label">头像 URL</label>
            <input type="text" name="avatar" class="input" value="${H.escapeHtml(settings.avatar || '')}" placeholder="https://example.com/avatar.jpg">
            <div class="field-help">头像将显示在关于页面</div>
          </div>
        </div>

        <!-- 社交链接 -->
        <div class="settings-group">
          <h3 class="settings-group-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            社交链接
          </h3>

          <div class="settings-field">
            <label class="settings-field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </label>
            <input type="text" name="github" class="input" value="${H.escapeHtml(settings.github || '')}" placeholder="https://github.com/username">
          </div>

          <div class="settings-field">
            <label class="settings-field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              Twitter
            </label>
            <input type="text" name="twitter" class="input" value="${H.escapeHtml(settings.twitter || '')}" placeholder="https://twitter.com/username">
          </div>

          <div class="settings-field">
            <label class="settings-field-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </label>
            <input type="email" name="email" class="input" value="${H.escapeHtml(settings.email || '')}" placeholder="your@email.com">
          </div>
        </div>

        <!-- 保存按钮（底部重复） -->
        <div style="display: flex; justify-content: flex-end; margin-top: var(--space-lg);">
          <button type="button" class="btn btn-primary btn-lg" id="save-settings-bottom">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            保存设置
          </button>
        </div>
      </form>
    `;

    return renderAdminLayout(content, 'settings', '站点设置');
  }

  return {
    renderAdminSidebar,
    renderAdminTopbar,
    renderAdminLayout,
    renderLoginPage,
    renderAdminDashboard,
    renderAdminPosts,
    renderAdminPostEditor,
    renderAdminCategories,
    renderAdminTags,
    renderAdminMedia,
    renderAdminSettings
  };
})();

// 挂载到全局
window.NovaAdmin = NovaAdmin;
