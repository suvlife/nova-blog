/**
 * Nova Blog - 前台页面组件
 * 每个组件返回 HTML 字符串，支持服务端渲染和客户端渲染
 */

// ========== 通用组件 ==========

/**
 * Header 导航栏
 */
function renderHeader(currentPath = '/') {
  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/posts', label: '文章', icon: '📝' },
    { path: '/archives', label: '归档', icon: '📂' },
    { path: '/about', label: '关于', icon: '👤' },
  ];

  const navLinks = navItems.map(item => {
    const isActive = currentPath === item.path ||
      (item.path !== '/' && currentPath.startsWith(item.path));
    return `<a href="${item.path}" class="header__nav-link ${isActive ? 'header__nav-link--active' : ''}">${item.label}</a>`;
  }).join('');

  return `
    <header class="header" id="header">
      <div class="header__inner">
        <a href="/" class="header__logo">
          <span class="header__logo-icon">N</span>
          <span class="header__logo-text">Nova</span>
        </a>
        <nav class="header__nav">
          ${navLinks}
        </nav>
        <div class="header__actions">
          <button class="btn btn--ghost btn--sm" id="theme-toggle" data-tooltip="切换主题">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <a href="/admin" class="btn btn--ghost btn--sm">管理</a>
          <button class="header__menu-btn" id="mobile-menu-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
    <div class="mobile-menu__overlay" id="mobile-overlay"></div>
    <div class="mobile-menu" id="mobile-menu">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-xl);">
        <span style="font-weight:800;font-size:var(--text-lg);" class="text-gradient">Nova Blog</span>
        <button id="mobile-menu-close" style="color:var(--text-tertiary);font-size:24px;">&times;</button>
      </div>
      <nav style="display:flex;flex-direction:column;gap:var(--space-xs);">
        ${navItems.map(item => `
          <a href="${item.path}" class="admin-sidebar__item ${currentPath === item.path ? 'admin-sidebar__item--active' : ''}">
            <span class="admin-sidebar__item-icon">${item.icon}</span>
            <span class="admin-sidebar__item-label">${item.label}</span>
          </a>
        `).join('')}
      </nav>
    </div>
  `;
}

/**
 * Footer 页脚
 */
function renderFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="footer">
      <div class="footer__inner">
        <div class="footer__links">
          <a href="/" class="footer__link">首页</a>
          <a href="/posts" class="footer__link">文章</a>
          <a href="/archives" class="footer__link">归档</a>
          <a href="/about" class="footer__link">关于</a>
        </div>
        <p>&copy; ${year} Nova Blog. Powered by Cloudflare Pages & Workers.</p>
      </div>
    </footer>
  `;
}

/**
 * 文章卡片
 */
function renderPostCard(post) {
  const tags = (post.tags || []).map(tag =>
    `<span class="tag">${tag}</span>`
  ).join('');

  const date = new Date(post.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `
    <article class="card card--post" onclick="router.navigate('/posts/${post.slug}')">
      ${post.cover ? `<img class="card__cover" src="${post.cover}" alt="${post.title}" loading="lazy">` : ''}
      <h3 class="card__title">${post.title}</h3>
      <p class="card__excerpt">${post.excerpt || ''}</p>
      <div class="card__tags">${tags}</div>
      <div class="card__meta">
        <span>${date}</span>
        ${post.category ? `<span>${post.category}</span>` : ''}
        ${post.readingTime ? `<span>${post.readingTime} min read</span>` : ''}
      </div>
    </article>
  `;
}

/**
 * 加载骨架屏
 */
function renderSkeleton(count = 6) {
  return Array(count).fill('').map(() => `
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="skeleton" style="height:200px;border-radius:var(--radius-md) var(--radius-md) 0 0;"></div>
      <div style="padding:var(--space-lg);">
        <div class="skeleton" style="height:24px;width:70%;margin-bottom:var(--space-md);"></div>
        <div class="skeleton" style="height:16px;width:100%;margin-bottom:var(--space-sm);"></div>
        <div class="skeleton" style="height:16px;width:80%;margin-bottom:var(--space-md);"></div>
        <div style="display:flex;gap:var(--space-sm);">
          <div class="skeleton" style="height:20px;width:60px;"></div>
          <div class="skeleton" style="height:20px;width:60px;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ========== 页面组件 ==========

/**
 * 首页
 */
async function renderHomePage() {
  let posts = [];
  try {
    const res = await api.getPosts({ page: 1, pageSize: 6 });
    posts = res.data || [];
  } catch (e) {
    console.error('Failed to load posts:', e);
  }

  const featuredPosts = posts.slice(0, 3).map(p => renderPostCard(p)).join('');
  const recentPosts = posts.slice(3).map(p => renderPostCard(p)).join('');

  return `
    ${renderHeader('/')}

    <!-- Hero 区域 -->
    <section class="hero">
      <div class="hero__bg"></div>
      <canvas class="hero__particles" id="particles-canvas"></canvas>
      <div class="hero__scanline"></div>
      <div class="hero__content">
        <p class="hero__greeting">// Hello, World</p>
        <h1 class="hero__title">
          探索 <span class="hero__title-accent text-gradient">无限可能</span><br>
          的技术世界
        </h1>
        <p class="hero__subtitle">
          记录前端开发、系统架构与技术思考。<br>
          在代码与创意之间，构建数字世界的每一块基石。
        </p>
        <div class="hero__actions">
          <a href="/posts" class="btn btn--accent btn--lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            开始阅读
          </a>
          <a href="/about" class="btn btn--ghost btn--lg">了解更多</a>
        </div>
      </div>
    </section>

    <!-- 最新文章 -->
    <section class="section">
      <div class="container">
        <div class="section__header">
          <h2 class="section__title">
            <span class="section__title-icon">✦</span>
            最新文章
          </h2>
          <a href="/posts" class="section__more">
            查看全部
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>
        <div class="posts-grid">
          ${featuredPosts || '<div class="empty-state"><p class="empty-state__desc">暂无文章</p></div>'}
        </div>
      </div>
    </section>

    <!-- 更多文章 -->
    ${recentPosts ? `
    <section class="section" style="padding-top:0;">
      <div class="container">
        <div class="section__header">
          <h2 class="section__title">
            <span class="section__title-icon">◈</span>
            继续阅读
          </h2>
        </div>
        <div class="posts-grid">
          ${recentPosts}
        </div>
      </div>
    </section>
    ` : ''}

    ${renderFooter()}
  `;
}

/**
 * 文章列表页
 */
async function renderPostsPage(params = {}) {
  const query = router.getQuery();
  const page = parseInt(query.page) || 1;
  const category = query.category || '';
  const tag = query.tag || '';

  let posts = [];
  let total = 0;
  try {
    const res = await api.getPosts({ page, pageSize: 12, category, tag });
    posts = res.data || [];
    total = res.total || 0;
  } catch (e) {
    console.error('Failed to load posts:', e);
  }

  const totalPages = Math.ceil(total / 12);
  const postsHtml = posts.map(p => renderPostCard(p)).join('');

  const paginationHtml = totalPages > 1 ? `
    <div class="pagination">
      ${page > 1 ? `<a href="/posts?page=${page - 1}" class="pagination__item">&lt;</a>` : ''}
      ${Array.from({ length: totalPages }, (_, i) => `
        <a href="/posts?page=${i + 1}" class="pagination__item ${i + 1 === page ? 'pagination__item--active' : ''}">${i + 1}</a>
      `).join('')}
      ${page < totalPages ? `<a href="/posts?page=${page + 1}" class="pagination__item">&gt;</a>` : ''}
    </div>
  ` : '';

  return `
    ${renderHeader('/posts')}

    <main style="padding-top:var(--header-height);">
      <section class="section">
        <div class="container">
          <div class="section__header">
            <h1 class="section__title">
              <span class="section__title-icon">📝</span>
              ${category ? `分类: ${category}` : tag ? `标签: ${tag}` : '全部文章'}
            </h1>
            <span style="color:var(--text-tertiary);font-size:var(--text-sm);">共 ${total} 篇</span>
          </div>
          <div class="posts-grid">
            ${postsHtml || '<div class="empty-state"><div class="empty-state__icon">📭</div><h3 class="empty-state__title">暂无文章</h3><p class="empty-state__desc">还没有发布任何文章</p></div>'}
          </div>
          ${paginationHtml}
        </div>
      </section>
    </main>

    ${renderFooter()}
  `;
}

/**
 * 文章详情页
 */
async function renderPostDetailPage(params) {
  const { slug } = params;

  let post = null;
  try {
    post = await api.getPost(slug);
  } catch (e) {
    console.error('Failed to load post:', e);
  }

  if (!post) {
    return `
      ${renderHeader('/posts')}
      <main style="padding-top:var(--header-height);">
        <div class="container container--narrow" style="padding:var(--space-4xl) 0;text-align:center;">
          <h1 style="font-size:var(--text-6xl);margin-bottom:var(--space-md);">404</h1>
          <p style="color:var(--text-secondary);margin-bottom:var(--space-xl);">文章不存在或已被删除</p>
          <a href="/posts" class="btn btn--primary">返回文章列表</a>
        </div>
      </main>
      ${renderFooter()}
    `;
  }

  const date = new Date(post.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const tags = (post.tags || []).map(tag =>
    `<a href="/posts?tag=${encodeURIComponent(tag)}" class="tag">${tag}</a>`
  ).join('');

  // 使用 marked.js 渲染 Markdown
  const contentHtml = typeof marked !== 'undefined'
    ? marked.parse(post.content || '')
    : post.content || '';

  return `
    ${renderHeader('/posts')}

    <main class="post-detail">
      <article>
        <header class="post-detail__header">
          ${post.category ? `<span class="badge badge--primary" style="margin-bottom:var(--space-md);">${post.category}</span>` : ''}
          <h1 class="post-detail__title">${post.title}</h1>
          <div class="post-detail__meta">
            <span>${date}</span>
            ${post.readingTime ? `<span>${post.readingTime} min read</span>` : ''}
            ${post.views ? `<span>${post.views} views</span>` : ''}
          </div>
          <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md);">
            ${tags}
          </div>
        </header>

        ${post.cover ? `<img class="post-detail__cover" src="${post.cover}" alt="${post.title}">` : ''}

        <div class="post-content" id="post-content">
          ${contentHtml}
        </div>
      </article>

      <div class="divider"></div>

      <!-- 文章导航 -->
      <nav style="display:flex;justify-content:space-between;gap:var(--space-lg);">
        ${post.prev ? `<a href="/posts/${post.prev.slug}" class="card" style="flex:1;padding:var(--space-md);">
          <span style="font-size:var(--text-xs);color:var(--text-tertiary);">上一篇</span>
          <p style="font-size:var(--text-sm);color:var(--text-primary);margin:0;">${post.prev.title}</p>
        </a>` : '<div></div>'}
        ${post.next ? `<a href="/posts/${post.next.slug}" class="card" style="flex:1;padding:var(--space-md);text-align:right;">
          <span style="font-size:var(--text-xs);color:var(--text-tertiary);">下一篇</span>
          <p style="font-size:var(--text-sm);color:var(--text-primary);margin:0;">${post.next.title}</p>
        </a>` : '<div></div>'}
      </nav>
    </main>

    ${renderFooter()}
  `;
}

/**
 * 归档页
 */
async function renderArchivesPage() {
  let posts = [];
  try {
    const res = await api.getPosts({ pageSize: 1000 });
    posts = res.data || [];
  } catch (e) {
    console.error('Failed to load archives:', e);
  }

  // 按年份分组
  const grouped = {};
  posts.forEach(post => {
    const year = new Date(post.createdAt).getFullYear();
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(post);
  });

  // 按年份降序排列
  const years = Object.keys(grouped).sort((a, b) => b - a);

  const archivesHtml = years.map(year => {
    const items = grouped[year].map(post => {
      const date = new Date(post.createdAt).toLocaleDateString('zh-CN', {
        month: '2-digit', day: '2-digit'
      });
      return `
        <a href="/posts/${post.slug}" class="archive__item">
          <span class="archive__date">${date}</span>
          <span class="archive__title">${post.title}</span>
        </a>
      `;
    }).join('');

    return `
      <div class="archive__year">
        <h2 class="archive__year-title">${year}</h2>
        ${items}
      </div>
    `;
  }).join('');

  return `
    ${renderHeader('/archives')}

    <main class="archive">
      <h1 style="font-size:var(--text-4xl);font-weight:900;margin-bottom:var(--space-2xl);">
        <span class="text-gradient">归档</span>
      </h1>
      <p style="color:var(--text-tertiary);margin-bottom:var(--space-2xl);">共 ${posts.length} 篇文章</p>
      ${archivesHtml || '<div class="empty-state"><div class="empty-state__icon">📂</div><h3 class="empty-state__title">暂无归档</h3></div>'}
    </main>

    ${renderFooter()}
  `;
}

/**
 * 关于页
 */
async function renderAboutPage() {
  let settings = {};
  try {
    settings = await api.getSettings();
  } catch (e) {
    console.error('Failed to load settings:', e);
  }

  return `
    ${renderHeader('/about')}

    <main class="about">
      <img class="about__avatar" src="${settings.avatar || '/images/avatar.png'}" alt="Avatar">
      <h1 class="about__name">${settings.authorName || 'Nova'}</h1>
      <p class="about__bio">${settings.bio || 'A developer who loves building things.'}</p>

      <div class="about__social">
        ${settings.github ? `<a href="https://github.com/${settings.github}" class="about__social-link" target="_blank" rel="noopener" data-tooltip="GitHub">GH</a>` : ''}
        ${settings.twitter ? `<a href="https://twitter.com/${settings.twitter}" class="about__social-link" target="_blank" rel="noopener" data-tooltip="Twitter">TW</a>` : ''}
        ${settings.email ? `<a href="mailto:${settings.email}" class="about__social-link" data-tooltip="Email">@</a>` : ''}
      </div>

      <div class="divider"></div>

      <div class="post-content">
        ${settings.aboutContent || '<p>暂无介绍</p>'}
      </div>
    </main>

    ${renderFooter()}
  `;
}
