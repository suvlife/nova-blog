/**
 * Nova Blog - 前台页面渲染函数
 * 每个函数返回完整的酷炫 HTML 字符串
 * 深空赛博风格 - Deep Space Cyber
 */

const NovaFront = (() => {
  'use strict';

  const H = window.NovaHelpers;
  const store = window.NovaStore;

  /**
   * 渲染导航栏
   * 包含：Logo渐变文字+图标、导航链接、主题切换、管理入口、移动端汉堡菜单、毛玻璃效果
   * @param {boolean} isHome - 是否首页（首页默认透明，滚动后触发毛玻璃）
   * @returns {string} HTML
   */
  function renderHeader(isHome = false) {
    const settings = store.getState('siteSettings') || {};
    const siteName = settings.siteName || 'Nova Blog';

    return `
      <header class="header ${isHome ? '' : 'header-glass'}" id="main-header">
        <div class="header-inner">
          <!-- Logo: 渐变文字 + 小图标 -->
          <a href="/" class="header-logo" aria-label="返回首页">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="vertical-align: middle; margin-right: 6px;">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#logo-grad)" />
              <path d="M2 17L12 22L22 17" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#00F5D4"/>
                  <stop offset="1" stop-color="#6C5CE7"/>
                </linearGradient>
              </defs>
            </svg>
            ${H.escapeHtml(siteName)}
          </a>

          <!-- 导航链接 -->
          <nav class="header-nav" id="main-nav">
            <a href="/" class="header-nav-link" data-nav="home">首页</a>
            <a href="/posts" class="header-nav-link" data-nav="posts">文章</a>
            <a href="/archives" class="header-nav-link" data-nav="archives">归档</a>
            <a href="/about" class="header-nav-link" data-nav="about">关于</a>
          </nav>

          <!-- 右侧操作区 -->
          <div class="header-actions">
            <!-- 主题切换按钮 -->
            <button class="btn btn-icon btn-sm btn-ghost" id="theme-toggle" title="切换主题" aria-label="切换主题">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            <!-- 管理后台入口 -->
            <a href="/admin" class="btn btn-sm btn-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              管理
            </a>
            <!-- 移动端汉堡菜单按钮 -->
            <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="打开菜单">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
    `;
  }

  /**
   * 渲染页脚
   * 三列布局: 关于/链接/联系 + 渐变分割线 + 版权信息
   * @returns {string} HTML
   */
  function renderFooter() {
    const settings = store.getState('siteSettings') || {};
    const siteName = settings.siteName || 'Nova Blog';
    const siteDescription = settings.siteDescription || '探索深空中的赛博世界';
    const year = new Date().getFullYear();

    return `
      <footer class="footer">
        <!-- 渐变分割线 -->
        <div style="height: 2px; background: var(--gradient-border); margin-bottom: var(--space-2xl);"></div>

        <div class="footer-inner" style="max-width: var(--bp-xl); margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2xl);">
          <!-- 关于 -->
          <div>
            <h4 style="color: var(--color-text-primary); margin-bottom: var(--space-md); font-size: var(--font-size-base);">
              <span class="text-gradient">${H.escapeHtml(siteName)}</span>
            </h4>
            <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); line-height: var(--line-height-relaxed);">
              ${H.escapeHtml(siteDescription)}
            </p>
          </div>

          <!-- 链接 -->
          <div>
            <h4 style="color: var(--color-text-primary); margin-bottom: var(--space-md); font-size: var(--font-size-base);">快速链接</h4>
            <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
              <a href="/" style="color: var(--color-text-muted); font-size: var(--font-size-sm);">首页</a>
              <a href="/posts" style="color: var(--color-text-muted); font-size: var(--font-size-sm);">文章</a>
              <a href="/archives" style="color: var(--color-text-muted); font-size: var(--font-size-sm);">归档</a>
              <a href="/about" style="color: var(--color-text-muted); font-size: var(--font-size-sm);">关于</a>
            </div>
          </div>

          <!-- 联系 -->
          <div>
            <h4 style="color: var(--color-text-primary); margin-bottom: var(--space-md); font-size: var(--font-size-base);">联系方式</h4>
            <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
              ${settings.github ? `<a href="${H.escapeHtml(settings.github)}" target="_blank" rel="noopener" style="color: var(--color-text-muted); font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </a>` : ''}
              ${settings.twitter ? `<a href="${H.escapeHtml(settings.twitter)}" target="_blank" rel="noopener" style="color: var(--color-text-muted); font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                Twitter
              </a>` : ''}
              ${settings.email ? `<a href="mailto:${H.escapeHtml(settings.email)}" style="color: var(--color-text-muted); font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                ${H.escapeHtml(settings.email)}
              </a>` : ''}
            </div>
          </div>
        </div>

        <!-- 底部版权信息 -->
        <div style="max-width: var(--bp-xl); margin: var(--space-2xl) auto 0; padding-top: var(--space-lg); border-top: 1px solid var(--color-border); text-align: center;">
          <p class="footer-copyright">
            &copy; ${year} ${H.escapeHtml(siteName)}. All rights reserved. Powered by Nova Blog.
          </p>
        </div>
      </footer>
    `;
  }

  /**
   * 渲染文章卡片（酷炫效果）
   * 包含：封面图区域（渐变占位）、分类标签（霓虹青色）、标题（悬浮变色）、摘要、底部元信息
   * 悬浮效果: 上移 + 辉光边框 + 顶部渐变线
   * @param {Object} post - 文章数据
   * @returns {string} HTML
   */
  function renderPostCard(post) {
    const tags = (post.tags || []).map(tag =>
      `<span class="tag tag-accent">${H.escapeHtml(tag.name || tag)}</span>`
    ).join('');

    // 封面图：有图片则显示，无图片则显示渐变占位
    const coverHtml = post.coverImage
      ? `<img src="${H.escapeHtml(post.coverImage)}" alt="${H.escapeHtml(post.title)}" class="post-card-image" loading="lazy">`
      : `<div class="post-card-image" style="background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
           <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,245,212,0.2));"></div>
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
             <polyline points="14 2 14 8 20 8"/>
             <line x1="16" y1="13" x2="8" y2="13"/>
             <line x1="16" y1="17" x2="8" y2="17"/>
             <polyline points="10 9 9 9 8 9"/>
           </svg>
         </div>`;

    return `
      <a href="/posts/${H.escapeHtml(post.slug)}" class="post-card card-glow" data-animate>
        <!-- 顶部渐变线（悬浮时显示） -->
        <div style="height: 2px; background: var(--gradient-accent); opacity: 0; transition: opacity var(--duration-normal) var(--ease-default);"></div>

        <!-- 封面图区域 -->
        ${coverHtml}

        <div class="post-card-body">
          <!-- 分类标签（霓虹青色小标签） -->
          <span class="post-card-category">${H.escapeHtml(post.category?.name || post.category || '未分类')}</span>

          <!-- 标题（悬浮变色） -->
          <h3 class="post-card-title">${H.escapeHtml(post.title)}</h3>

          <!-- 摘要 -->
          <p class="post-card-excerpt">${H.escapeHtml(post.excerpt || post.summary || '')}</p>

          <!-- 底部元信息: 日期 + 阅读时间 + 浏览数 -->
          <div class="post-card-meta">
            <span style="display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${H.formatDate(post.publishedAt || post.createdAt)}
            </span>
            ${post.readingTime ? `<span style="display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${post.readingTime} 分钟
            </span>` : ''}
            ${post.viewCount ? `<span style="display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${post.viewCount}
            </span>` : ''}
          </div>

          <!-- 标签 -->
          ${tags ? `<div class="post-card-tags">${tags}</div>` : ''}
        </div>
      </a>
    `;
  }

  /**
   * 渲染骨架屏
   * 支持三种类型: post-card / post-detail / list
   * @param {string} type - 骨架屏类型
   * @returns {string} HTML
   */
  function renderSkeleton(type = 'post-card') {
    // 文章卡片骨架屏
    if (type === 'post-card') {
      return `
        <div class="post-card" style="pointer-events: none;">
          <div class="skeleton skeleton-image" style="height: 200px; border-radius: var(--radius-lg) var(--radius-lg) 0 0;"></div>
          <div class="post-card-body">
            <div class="skeleton skeleton-text" style="width: 30%; height: 12px;"></div>
            <div class="skeleton skeleton-text" style="width: 80%; height: 20px; margin-top: var(--space-sm);"></div>
            <div class="skeleton skeleton-text" style="width: 100%;"></div>
            <div class="skeleton skeleton-text" style="width: 90%;"></div>
            <div class="skeleton skeleton-text" style="width: 60%;"></div>
            <div style="display: flex; gap: var(--space-md); margin-top: var(--space-md);">
              <div class="skeleton skeleton-text" style="width: 20%; height: 12px;"></div>
              <div class="skeleton skeleton-text" style="width: 15%; height: 12px;"></div>
            </div>
          </div>
        </div>
      `;
    }

    // 文章详情骨架屏
    if (type === 'post-detail') {
      return `
        <div class="post-detail" style="pointer-events: none;">
          <div class="post-detail-header">
            <div class="skeleton skeleton-text" style="width: 60%; height: 36px; margin-bottom: var(--space-lg);"></div>
            <div style="display: flex; gap: var(--space-md);">
              <div class="skeleton skeleton-text" style="width: 15%; height: 14px;"></div>
              <div class="skeleton skeleton-text" style="width: 20%; height: 14px;"></div>
              <div class="skeleton skeleton-text" style="width: 12%; height: 14px;"></div>
            </div>
          </div>
          <div class="skeleton skeleton-image" style="height: 350px; border-radius: var(--radius-lg); margin: var(--space-2xl) 0;"></div>
          <div class="skeleton skeleton-text" style="width: 100%;"></div>
          <div class="skeleton skeleton-text" style="width: 100%;"></div>
          <div class="skeleton skeleton-text" style="width: 85%;"></div>
          <div class="skeleton skeleton-text" style="width: 100%;"></div>
          <div class="skeleton skeleton-text" style="width: 70%;"></div>
          <div class="skeleton skeleton-text" style="width: 100%;"></div>
          <div class="skeleton skeleton-text" style="width: 90%;"></div>
          <div class="skeleton skeleton-text" style="width: 50%;"></div>
        </div>
      `;
    }

    // 列表骨架屏
    if (type === 'list') {
      return `
        <div style="display: flex; flex-direction: column; gap: var(--space-md); pointer-events: none;">
          ${Array.from({ length: 5 }, () => `
            <div style="display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md) 0; border-bottom: 1px solid var(--color-border);">
              <div class="skeleton" style="width: 80px; height: 14px; flex-shrink: 0;"></div>
              <div class="skeleton skeleton-text" style="width: 60%;"></div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 默认卡片骨架屏
    return `
      <div class="card" style="pointer-events: none;">
        <div class="skeleton skeleton-image"></div>
        <div style="padding: var(--space-lg);">
          <div class="skeleton skeleton-text" style="width: 40%;"></div>
          <div class="skeleton skeleton-text" style="width: 80%;"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染首页
   * 包含：Hero Section（粒子背景+问候语+主标题+副标题+CTA+扫描线）、最新文章、继续探索
   * @returns {string} HTML
   */
  async function renderHomePage() {
    const settings = store.getState('siteSettings') || {};
    const siteName = settings.siteName || 'Nova Blog';
    const siteDescription = settings.siteDescription || '探索深空中的赛博世界';

    // 获取最新文章（前3篇）
    let latestPosts = [];
    try {
      const result = await NovaPublic.posts({ page: 1, pageSize: 3 });
      latestPosts = result.data?.list || result.list || result.data || [];
    } catch {
      // API 不可用时使用空数组
    }

    // 获取更多文章（4-6篇）
    let morePosts = [];
    try {
      const result = await NovaPublic.posts({ page: 2, pageSize: 3 });
      morePosts = result.data?.list || result.list || result.data || [];
    } catch {
      // API 不可用时使用空数组
    }

    // 如果第二页没有数据，尝试从第一页截取
    if (morePosts.length === 0 && latestPosts.length > 3) {
      morePosts = latestPosts.splice(3);
    }

    const latestPostCards = latestPosts.length > 0
      ? latestPosts.map(post => renderPostCard(post)).join('')
      : Array.from({ length: 3 }, () => renderSkeleton('post-card')).join('');

    const morePostCards = morePosts.length > 0
      ? morePosts.map(post => renderPostCard(post)).join('')
      : '';

    return `
      ${renderHeader(true)}
      <main>
        <!-- ====== Hero Section ====== -->
        <section class="hero">
          <!-- Canvas 粒子背景 -->
          <canvas class="hero-canvas" id="hero-canvas"></canvas>

          <!-- 扫描线动画效果 -->
          <div class="hero-scan-line"></div>

          <div class="hero-content">
            <!-- 问候语: 等宽字体, 霓虹青色 -->
            <p class="hero-greeting" style="font-family: var(--font-mono);">// Hello, World</p>

            <!-- 主标题: 渐变文字, "无限可能"用强调色 -->
            <h1 class="hero-title">
              探索 <span style="background: var(--gradient-accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">无限可能</span> 的技术世界
            </h1>

            <!-- 副标题 -->
            <p class="hero-subtitle">${H.escapeHtml(siteDescription)}</p>

            <!-- CTA 按钮 -->
            <div class="hero-cta">
              <a href="/posts" class="btn btn-primary btn-lg" style="background: var(--gradient-accent); border-color: transparent; color: var(--color-bg-primary); font-weight: var(--font-weight-bold);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                开始阅读
              </a>
              <a href="/about" class="btn btn-accent btn-lg" style="border-width: 2px;">
                了解更多
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </a>
            </div>
          </div>
        </section>

        <!-- ====== 最新文章 Section ====== -->
        <section class="section">
          <div class="container">
            <!-- Section 标题: 渐变下划线 -->
            <h2 class="section-title" data-animate>最新发布</h2>
            <div class="grid grid-3">
              ${latestPostCards}
            </div>
            ${latestPosts.length > 0 ? `
              <div style="text-align: center; margin-top: var(--space-2xl);" data-animate>
                <a href="/posts" class="btn btn-ghost btn-lg">
                  查看全部文章
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              </div>
            ` : ''}
          </div>
        </section>

        <!-- ====== 继续探索 Section ====== -->
        ${morePostCards ? `
          <section class="section" style="background: var(--color-bg-secondary);">
            <div class="container">
              <h2 class="section-title" data-animate>继续探索</h2>
              <div class="grid grid-3">
                ${morePostCards}
              </div>
            </div>
          </section>
        ` : ''}
      </main>
      ${renderFooter()}
    `;
  }

  /**
   * 渲染文章列表页
   * 包含：页面标题、搜索框+分类/标签筛选、3列文章卡片网格、分页导航
   * @returns {string} HTML
   */
  async function renderPostsPage() {
    let posts = [];
    let categories = [];
    let tags = [];
    let pagination = {};

    try {
      const result = await NovaPublic.posts({ page: 1, pageSize: 12 });
      posts = result.data?.list || result.list || result.data || [];
      pagination = result.data?.pagination || result.pagination || {};
    } catch {
      // API 不可用
    }

    try {
      const catResult = await NovaPublic.categories();
      categories = catResult.data?.list || catResult.list || catResult.data || [];
    } catch {
      // API 不可用
    }

    try {
      const tagResult = await NovaPublic.tags();
      tags = tagResult.data?.list || tagResult.list || tagResult.data || [];
    } catch {
      // API 不可用
    }

    const postCards = posts.length > 0
      ? posts.map(post => renderPostCard(post)).join('')
      : `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">&#128221;</div>
          <h3 class="empty-state-title">暂无文章</h3>
          <p class="empty-state-desc">还没有发布任何文章</p>
        </div>
      `;

    // 分类筛选标签
    const categoryTags = categories.map(cat =>
      `<a href="/posts?category=${H.escapeHtml(cat.slug)}" class="tag tag-primary">${H.escapeHtml(cat.name)}</a>`
    ).join('');

    // 标签筛选
    const tagFilters = tags.map(tag =>
      `<a href="/posts?tag=${H.escapeHtml(tag.slug)}" class="tag tag-accent">${H.escapeHtml(tag.name)}</a>`
    ).join('');

    // 分页导航
    const paginationHtml = pagination.totalPages > 1 ? `
      <div class="pagination">
        ${pagination.page > 1 ? `<a href="/posts?page=${pagination.page - 1}" class="pagination-item">&laquo; 上一页</a>` : '<span class="pagination-item" disabled>&laquo; 上一页</span>'}
        ${Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
          // 简化分页逻辑：显示前5页
          const pageNum = i + 1;
          return `<a href="/posts?page=${pageNum}" class="pagination-item ${pageNum === pagination.page ? 'pagination-active' : ''}">${pageNum}</a>`;
        }).join('')}
        ${pagination.page < pagination.totalPages ? `<a href="/posts?page=${pagination.page + 1}" class="pagination-item">下一页 &raquo;</a>` : '<span class="pagination-item" disabled>下一页 &raquo;</span>'}
      </div>
    ` : '';

    return `
      ${renderHeader()}
      <main>
        <div class="page-container">
          <!-- 页面标题 -->
          <h1 class="page-title" data-animate>所有文章</h1>

          <!-- 搜索框 + 分类/标签筛选 -->
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-lg); margin-bottom: var(--space-2xl); align-items: center;" data-animate>
            <!-- 搜索框 -->
            <div class="search-box" style="flex: 1; min-width: 240px;">
              <svg class="search-box-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" class="input" id="search-input" placeholder="搜索文章..." style="padding-left: var(--space-2xl);">
            </div>
          </div>

          <!-- 分类筛选 -->
          ${categoryTags ? `
            <div style="margin-bottom: var(--space-md);" data-animate>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-right: var(--space-sm);">分类:</span>
              <span class="tag tag-primary" style="cursor: pointer;">全部</span>
              ${categoryTags}
            </div>
          ` : ''}

          <!-- 标签筛选 -->
          ${tagFilters ? `
            <div style="margin-bottom: var(--space-2xl);" data-animate>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-right: var(--space-sm);">标签:</span>
              ${tagFilters}
            </div>
          ` : ''}

          <!-- 文章卡片网格（3列） -->
          <div class="grid grid-3" id="posts-grid">
            ${postCards}
          </div>

          <!-- 分页导航 -->
          ${paginationHtml}
        </div>
      </main>
      ${renderFooter()}
    `;
  }

  /**
   * 渲染文章详情页
   * 包含：返回按钮、大号渐变标题、元信息、封面图、Markdown渲染内容、上下篇导航
   * @param {string} slug - 文章 Slug
   * @returns {string} HTML
   */
  async function renderPostDetailPage(slug) {
    let post = null;

    try {
      const result = await NovaPublic.post(slug);
      post = result.data || result;
    } catch {
      // 文章获取失败
    }

    if (!post) {
      return renderNotFoundPage();
    }

    // 渲染 Markdown 内容
    let contentHtml = '';
    if (post.content && typeof marked !== 'undefined') {
      try {
        contentHtml = marked.parse(post.content);
      } catch {
        contentHtml = H.escapeHtml(post.content);
      }
    }

    const tags = (post.tags || []).map(tag =>
      `<span class="tag tag-accent">${H.escapeHtml(tag.name || tag)}</span>`
    ).join('');

    return `
      ${renderHeader()}
      <main>
        <article class="post-detail">
          <!-- 返回按钮 -->
          <div style="margin-bottom: var(--space-lg);" data-animate>
            <a href="/posts" class="btn btn-ghost btn-sm" style="display: inline-flex; align-items: center; gap: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              返回文章列表
            </a>
          </div>

          <!-- 文章标题（大号渐变文字） -->
          <div class="post-detail-header" data-animate>
            <h1 class="post-detail-title">${H.escapeHtml(post.title)}</h1>

            <!-- 元信息: 分类 + 标签 + 日期 + 阅读时间 + 浏览数 -->
            <div class="post-detail-meta">
              ${post.category ? `<span style="display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                ${H.escapeHtml(post.category?.name || post.category)}
              </span>` : ''}
              <span style="display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${H.formatDate(post.publishedAt || post.createdAt)}
              </span>
              ${post.readingTime ? `<span style="display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${post.readingTime} 分钟阅读
              </span>` : ''}
              ${post.viewCount ? `<span style="display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ${post.viewCount} 次浏览
              </span>` : ''}
            </div>

            <!-- 标签 -->
            ${tags ? `<div class="post-card-tags" style="margin-top: var(--space-md);">${tags}</div>` : ''}
          </div>

          <!-- 封面图 -->
          ${post.coverImage ? `
            <img src="${H.escapeHtml(post.coverImage)}" alt="${H.escapeHtml(post.title)}" class="post-detail-cover" data-animate>
          ` : ''}

          <!-- Markdown 渲染内容区 -->
          <div class="post-content" data-animate>
            ${contentHtml}
          </div>

          <!-- 上下篇导航 -->
          <nav class="post-nav" data-animate>
            ${post.prevPost ? `
              <a href="/posts/${H.escapeHtml(post.prevPost.slug)}" class="post-nav-item card-glow">
                <div class="nav-label">&larr; 上一篇</div>
                <div class="nav-title">${H.escapeHtml(post.prevPost.title)}</div>
              </a>
            ` : '<div></div>'}
            ${post.nextPost ? `
              <a href="/posts/${H.escapeHtml(post.nextPost.slug)}" class="post-nav-item card-glow">
                <div class="nav-label">下一篇 &rarr;</div>
                <div class="nav-title">${H.escapeHtml(post.nextPost.title)}</div>
              </a>
            ` : '<div></div>'}
          </nav>
        </article>
      </main>
      ${renderFooter()}
    `;
  }

  /**
   * 渲染归档页
   * 包含：页面标题、按年份分组的时间线、悬浮效果
   * @returns {string} HTML
   */
  async function renderArchivesPage() {
    let archives = [];

    try {
      const result = await NovaPublic.archive();
      archives = result.data?.list || result.list || result.data || [];
    } catch {
      // API 不可用
    }

    // 按年份分组
    const grouped = {};
    if (Array.isArray(archives)) {
      for (const item of archives) {
        const year = new Date(item.publishedAt || item.createdAt).getFullYear();
        if (!grouped[year]) {
          grouped[year] = [];
        }
        grouped[year].push(item);
      }
    }

    // 按年份降序排列
    const years = Object.keys(grouped).sort((a, b) => b - a);

    // 统计文章总数
    const totalPosts = archives.length;

    const archiveHtml = years.length > 0
      ? years.map(year => `
          <!-- 年份标题 -->
          <div class="archive-year" data-animate>
            <span style="font-family: var(--font-mono); color: var(--color-accent);">${year}</span>
            <span style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-left: var(--space-sm);">(${grouped[year].length} 篇)</span>
          </div>

          <!-- 该年份下的文章列表 -->
          ${grouped[year].map(post => `
            <div class="archive-item" data-animate>
              <span class="archive-date">${H.formatDate(post.publishedAt || post.createdAt, 'MM-DD')}</span>
              <a href="/posts/${H.escapeHtml(post.slug)}" class="archive-title">${H.escapeHtml(post.title)}</a>
            </div>
          `).join('')}
        `).join('')
      : `
        <div class="empty-state">
          <div class="empty-state-icon">&#128194;</div>
          <h3 class="empty-state-title">暂无归档</h3>
          <p class="empty-state-desc">还没有发布任何文章</p>
        </div>
      `;

    return `
      ${renderHeader()}
      <main>
        <div class="page-container">
          <!-- 页面标题 -->
          <h1 class="page-title" data-animate>文章归档</h1>
          <p style="color: var(--color-text-muted); margin-bottom: var(--space-2xl); font-size: var(--font-size-sm);" data-animate>
            共 <span style="color: var(--color-accent); font-family: var(--font-mono);">${totalPosts}</span> 篇文章
          </p>

          <!-- 时间线 -->
          <div class="archive-list">
            ${archiveHtml}
          </div>
        </div>
      </main>
      ${renderFooter()}
    `;
  }

  /**
   * 渲染关于页
   * 包含：头像（圆形+辉光边框）、姓名+简介、技术栈标签云、社交链接图标组、自定义内容区
   * @returns {string} HTML
   */
  async function renderAboutPage() {
    let aboutContent = '';
    let siteSettings = {};
    const settings = store.getState('siteSettings') || {};

    try {
      const result = await NovaPublic.siteSettings();
      siteSettings = result.data || result;
      aboutContent = siteSettings.aboutContent || settings.aboutContent || '';
    } catch {
      aboutContent = settings.aboutContent || '';
    }

    // 合并设置
    const merged = { ...settings, ...siteSettings };

    // 渲染 Markdown
    let contentHtml = '';
    if (aboutContent && typeof marked !== 'undefined') {
      try {
        contentHtml = marked.parse(aboutContent);
      } catch {
        contentHtml = H.escapeHtml(aboutContent);
      }
    }

    // 技术栈标签云
    const techStack = [
      { name: 'JavaScript', color: 'primary' },
      { name: 'TypeScript', color: 'primary' },
      { name: 'React', color: 'accent' },
      { name: 'Vue', color: 'accent' },
      { name: 'Node.js', color: 'success' },
      { name: 'Python', color: 'primary' },
      { name: 'Docker', color: 'accent' },
      { name: 'Kubernetes', color: 'primary' },
      { name: 'GraphQL', color: 'accent' },
      { name: 'PostgreSQL', color: 'primary' },
      { name: 'Redis', color: 'danger' },
      { name: 'WebAssembly', color: 'accent' }
    ];

    const techTags = techStack.map(tech =>
      `<span class="tag tag-${tech.color}" style="font-size: var(--font-size-sm); padding: var(--space-xs) var(--space-md); animation: float ${2 + Math.random() * 3}s ease-in-out infinite; animation-delay: ${Math.random() * 2}s;">${tech.name}</span>`
    ).join('');

    return `
      ${renderHeader()}
      <main>
        <div class="about-page" data-animate>
          <!-- 头像（圆形 + 辉光边框） -->
          <div style="position: relative; display: inline-block; margin-bottom: var(--space-lg);">
            <img src="${merged.avatar || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 120 120%22><rect fill=%22%231A1A3E%22 width=%22120%22 height=%22120%22 rx=%2260%22/><text x=%2260%22 y=%2275%22 font-size=%2248%22 text-anchor=%22middle%22 fill=%22%236C5CE7%22>N</text></svg>'}"
                 alt="Avatar"
                 class="about-avatar"
                 style="box-shadow: 0 0 20px rgba(108, 92, 231, 0.4), 0 0 40px rgba(108, 92, 231, 0.2), 0 0 60px rgba(0, 245, 212, 0.1);">
            <!-- 在线状态指示器 -->
            <div style="position: absolute; bottom: 4px; right: 4px; width: 16px; height: 16px; background: var(--color-accent); border: 3px solid var(--color-bg-primary); border-radius: 50%; box-shadow: 0 0 8px rgba(0, 245, 212, 0.6);"></div>
          </div>

          <!-- 姓名 + 简介 -->
          <h1 class="text-gradient" style="font-size: var(--font-size-3xl); margin-bottom: var(--space-sm);">
            ${H.escapeHtml(merged.authorName || 'Nova')}
          </h1>
          <p style="color: var(--color-text-secondary); max-width: 600px; margin: 0 auto var(--space-lg); line-height: var(--line-height-relaxed);">
            ${H.escapeHtml(merged.siteDescription || '探索深空中的赛博世界')}
          </p>

          <!-- 社交链接图标组 -->
          <div class="about-social">
            ${merged.github ? `
              <a href="${H.escapeHtml(merged.github)}" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
            ` : ''}
            ${merged.twitter ? `
              <a href="${H.escapeHtml(merged.twitter)}" target="_blank" rel="noopener" title="Twitter" aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
            ` : ''}
            ${merged.email ? `
              <a href="mailto:${H.escapeHtml(merged.email)}" title="Email" aria-label="Email">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </a>
            ` : ''}
          </div>

          <!-- 分割线 -->
          <hr style="width: 60px; margin: var(--space-2xl) auto;">

          <!-- 技术栈标签云 -->
          <div style="margin-bottom: var(--space-2xl);">
            <h3 style="color: var(--color-text-primary); font-size: var(--font-size-lg); margin-bottom: var(--space-lg);">
              <span class="text-gradient">技术栈</span>
            </h3>
            <div class="tag-cloud" style="justify-content: center;">
              ${techTags}
            </div>
          </div>

          <!-- 分割线 -->
          <hr style="width: 60px; margin: var(--space-2xl) auto;">

          <!-- 自定义内容区 -->
          ${contentHtml ? `
            <div class="post-content" style="text-align: left; max-width: 700px; margin: 0 auto;">
              ${contentHtml}
            </div>
          ` : ''}
        </div>
      </main>
      ${renderFooter()}
    `;
  }

  /**
   * 渲染 404 页面
   * 包含：大号"404"渐变文字、"页面未找到"描述、返回首页按钮
   * @returns {string} HTML
   */
  function renderNotFoundPage() {
    return `
      ${renderHeader()}
      <main>
        <div class="not-found-page" data-animate>
          <!-- 大号 "404" 渐变文字 -->
          <div class="not-found-code">404</div>

          <!-- "页面未找到" 描述 -->
          <p class="not-found-text">页面迷失在深空中...</p>
          <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-2xl); max-width: 400px;">
            你所寻找的页面可能已被移动、删除，或者从未存在过。
          </p>

          <!-- 返回首页按钮 -->
          <div style="display: flex; gap: var(--space-md); justify-content: center;">
            <a href="/" class="btn btn-primary btn-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              返回首页
            </a>
            <a href="/posts" class="btn btn-ghost btn-lg">浏览文章</a>
          </div>

          <!-- 装饰性粒子效果提示 -->
          <div style="margin-top: var(--space-4xl); opacity: 0.2;">
            <svg width="200" height="60" viewBox="0 0 200 60" fill="none">
              <circle cx="20" cy="30" r="3" fill="#6C5CE7"/>
              <circle cx="60" cy="15" r="2" fill="#00F5D4"/>
              <circle cx="100" cy="40" r="4" fill="#6C5CE7"/>
              <circle cx="140" cy="20" r="2" fill="#FD79A8"/>
              <circle cx="180" cy="35" r="3" fill="#00F5D4"/>
              <line x1="20" y1="30" x2="60" y2="15" stroke="#6C5CE7" stroke-width="0.5" opacity="0.5"/>
              <line x1="60" y1="15" x2="100" y2="40" stroke="#00F5D4" stroke-width="0.5" opacity="0.5"/>
              <line x1="100" y1="40" x2="140" y2="20" stroke="#6C5CE7" stroke-width="0.5" opacity="0.5"/>
              <line x1="140" y1="20" x2="180" y2="35" stroke="#00F5D4" stroke-width="0.5" opacity="0.5"/>
            </svg>
          </div>
        </div>
      </main>
      ${renderFooter()}
    `;
  }

  return {
    renderHeader,
    renderFooter,
    renderPostCard,
    renderSkeleton,
    renderHomePage,
    renderPostsPage,
    renderPostDetailPage,
    renderArchivesPage,
    renderAboutPage,
    renderNotFoundPage
  };
})();

// 挂载到全局
window.NovaFront = NovaFront;
