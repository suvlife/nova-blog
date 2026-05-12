/**
 * Nova Blog - 后台管理页面组件
 */

// ========== 后台布局组件 ==========

/**
 * 后台侧边栏
 */
function renderAdminSidebar(activeMenu = 'dashboard') {
  const menuItems = [
    { section: '概览', items: [
      { id: 'dashboard', path: '/admin', label: '仪表盘', icon: '📊' },
    ]},
    { section: '内容', items: [
      { id: 'posts', path: '/admin/posts', label: '文章管理', icon: '📝' },
      { id: 'new-post', path: '/admin/posts/new', label: '写文章', icon: '✏️' },
      { id: 'categories', path: '/admin/categories', label: '分类管理', icon: '📁' },
      { id: 'tags', path: '/admin/tags', label: '标签管理', icon: '🏷️' },
    ]},
    { section: '资源', items: [
      { id: 'media', path: '/admin/media', label: '附件管理', icon: '🖼️' },
    ]},
    { section: '系统', items: [
      { id: 'settings', path: '/admin/settings', label: '站点设置', icon: '⚙️' },
    ]},
  ];

  const sectionsHtml = menuItems.map(section => {
    const itemsHtml = section.items.map(item => `
      <a href="${item.path}" class="admin-sidebar__item ${activeMenu === item.id ? 'admin-sidebar__item--active' : ''}">
        <span class="admin-sidebar__item-icon">${item.icon}</span>
        <span class="admin-sidebar__item-label">${item.label}</span>
      </a>
    `).join('');

    return `
      <div class="admin-sidebar__section">
        <div class="admin-sidebar__section-title">${section.section}</div>
        ${itemsHtml}
      </div>
    `;
  }).join('');

  return `
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="admin-sidebar__header">
        <a href="/admin" class="admin-sidebar__logo">Nova Admin</a>
        <button class="admin-sidebar__toggle" id="sidebar-toggle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="11 17 6 12 11 7"/>
            <polyline points="18 17 13 12 18 7"/>
          </svg>
        </button>
      </div>
      <nav class="admin-sidebar__nav">
        ${sectionsHtml}
      </nav>
      <div class="admin-sidebar__footer">
        <a href="/" class="admin-sidebar__item">
          <span class="admin-sidebar__item-icon">🌐</span>
          <span class="admin-sidebar__item-label">查看站点</span>
        </a>
        <button class="admin-sidebar__item" onclick="handleLogout()">
          <span class="admin-sidebar__item-icon">🚪</span>
          <span class="admin-sidebar__item-label">退出登录</span>
        </button>
      </div>
    </aside>
  `;
}

/**
 * 后台顶部栏
 */
function renderAdminTopbar(title, breadcrumbs = []) {
  const breadcrumbHtml = breadcrumbs.map((item, i) => {
    if (i === breadcrumbs.length - 1) {
      return `<span class="admin-topbar__breadcrumb-current">${item.label}</span>`;
    }
    return `<a href="${item.path}" style="color:var(--text-tertiary)">${item.label}</a>
            <span class="admin-topbar__breadcrumb-sep">/</span>`;
  }).join('');

  return `
    <div class="admin-topbar">
      <div class="admin-topbar__left">
        <button class="btn btn--icon btn--ghost" id="mobile-sidebar-toggle" style="display:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div class="admin-topbar__breadcrumb">
          <a href="/admin" style="color:var(--text-tertiary)">后台</a>
          <span class="admin-topbar__breadcrumb-sep">/</span>
          ${breadcrumbHtml}
        </div>
      </div>
      <div class="admin-topbar__right">
        <div class="avatar" style="background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:14px;color:white;font-weight:700;">A</div>
      </div>
    </div>
  `;
}

// ========== 后台页面 ==========

/**
 * 仪表盘
 */
async function renderAdminDashboard() {
  let stats = { posts: 0, categories: 0, tags: 0, views: 0 };
  let recentPosts = [];

  try {
    const [statsRes, postsRes] = await Promise.all([
      api.getStats(),
      api.getPosts({ page: 1, pageSize: 5 })
    ]);
    stats = statsRes || stats;
    recentPosts = postsRes.data || [];
  } catch (e) {
    console.error('Failed to load dashboard data:', e);
  }

  const recentPostsHtml = recentPosts.map(post => `
    <tr>
      <td>
        <a href="/admin/posts/edit/${post.slug}" style="color:var(--text-primary);font-weight:500;">
          ${post.title}
        </a>
      </td>
      <td><span class="badge badge--primary">${post.category || '未分类'}</span></td>
      <td>${post.status === 'published' ? '<span class="badge badge--accent">已发布</span>' : '<span class="badge badge--danger">草稿</span>'}</td>
      <td>${new Date(post.createdAt).toLocaleDateString('zh-CN')}</td>
      <td>
        <div style="display:flex;gap:var(--space-xs);">
          <a href="/admin/posts/edit/${post.slug}" class="btn btn--ghost btn--sm">编辑</a>
          <button class="btn btn--ghost btn--sm" style="color:var(--color-danger);" onclick="deletePost('${post.slug}')">删除</button>
        </div>
      </td>
    </tr>
  `).join('');

  return `
    ${renderAdminSidebar('dashboard')}
    <div class="admin-main">
      ${renderAdminTopbar('仪表盘', [{ label: '仪表盘' }])}
      <div class="admin-content">
        <!-- 统计卡片 -->
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--primary">📝</div>
            <div class="stat-card__value">${stats.posts}</div>
            <div class="stat-card__label">文章总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--accent">📁</div>
            <div class="stat-card__value">${stats.categories}</div>
            <div class="stat-card__label">分类数量</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--secondary">🏷️</div>
            <div class="stat-card__value">${stats.tags}</div>
            <div class="stat-card__label">标签数量</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--info">👁️</div>
            <div class="stat-card__value">${stats.views}</div>
            <div class="stat-card__label">总浏览量</div>
          </div>
        </div>

        <!-- 最近文章 -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
          <h2 style="font-size:var(--text-xl);font-weight:700;">最近文章</h2>
          <a href="/admin/posts/new" class="btn btn--primary btn--sm">
            + 新建文章
          </a>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${recentPostsHtml || '<tr><td colspan="5" style="text-align:center;padding:var(--space-2xl);color:var(--text-tertiary);">暂无文章</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 文章管理列表
 */
async function renderAdminPosts() {
  const query = router.getQuery();
  const page = parseInt(query.page) || 1;
  let posts = [];
  let total = 0;

  try {
    const res = await api.getPosts({ page, pageSize: 20 });
    posts = res.data || [];
    total = res.total || 0;
  } catch (e) {
    console.error('Failed to load posts:', e);
  }

  const postsHtml = posts.map(post => `
    <tr>
      <td>
        <a href="/admin/posts/edit/${post.slug}" style="color:var(--text-primary);font-weight:500;">
          ${post.title}
        </a>
      </td>
      <td><span class="badge badge--primary">${post.category || '未分类'}</span></td>
      <td>${post.status === 'published' ? '<span class="badge badge--accent">已发布</span>' : '<span class="badge badge--danger">草稿</span>'}</td>
      <td style="font-family:var(--font-mono);font-size:var(--text-xs);">${new Date(post.createdAt).toLocaleDateString('zh-CN')}</td>
      <td>
        <div style="display:flex;gap:var(--space-xs);">
          <a href="/posts/${post.slug}" class="btn btn--ghost btn--sm" target="_blank">查看</a>
          <a href="/admin/posts/edit/${post.slug}" class="btn btn--ghost btn--sm">编辑</a>
          <button class="btn btn--ghost btn--sm" style="color:var(--color-danger);" onclick="deletePost('${post.slug}')">删除</button>
        </div>
      </td>
    </tr>
  `).join('');

  return `
    ${renderAdminSidebar('posts')}
    <div class="admin-main">
      ${renderAdminTopbar('文章管理', [{ label: '文章管理' }])}
      <div class="admin-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
          <div>
            <h2 style="font-size:var(--text-xl);font-weight:700;">全部文章</h2>
            <span style="font-size:var(--text-sm);color:var(--text-tertiary);">共 ${total} 篇</span>
          </div>
          <div style="display:flex;gap:var(--space-sm);">
            <input class="input" style="width:240px;" placeholder="搜索文章..." id="post-search">
            <a href="/admin/posts/new" class="btn btn--primary">
              + 新建文章
            </a>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${postsHtml || '<tr><td colspan="5" style="text-align:center;padding:var(--space-2xl);color:var(--text-tertiary);">暂无文章</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 文章编辑器页面
 */
async function renderAdminPostEditor(params = {}) {
  const isEdit = params.slug && params.slug !== 'new';
  let post = {
    title: '',
    content: '',
    category: '',
    tags: [],
    status: 'draft',
    cover: '',
    excerpt: '',
  };

  let categories = [];

  try {
    const [catRes] = await Promise.all([
      api.getCategories(),
    ]);
    categories = catRes.data || [];

    if (isEdit) {
      const postRes = await api.getPost(params.slug);
      post = { ...post, ...postRes };
    }
  } catch (e) {
    console.error('Failed to load editor data:', e);
  }

  const categoryOptions = categories.map(cat =>
    `<option value="${cat.name}" ${cat.name === post.category ? 'selected' : ''}>${cat.name}</option>`
  ).join('');

  const tagsStr = (post.tags || []).join(', ');

  return `
    ${renderAdminSidebar('new-post')}
    <div class="admin-main">
      ${renderAdminTopbar(isEdit ? '编辑文章' : '写文章', [
        { label: '文章管理', path: '/admin/posts' },
        { label: isEdit ? '编辑' : '新建' }
      ])}
      <div class="admin-content">
        <div class="editor-layout">
          <!-- 编辑器主体 -->
          <div class="editor-main">
            <input
              class="editor-title-input"
              id="editor-title"
              placeholder="输入文章标题..."
              value="${isEdit ? post.title : ''}"
            >

            <!-- 工具栏 -->
            <div class="editor-toolbar" id="editor-toolbar">
              <button class="editor-toolbar__btn" data-action="bold" data-tooltip="粗体"><b>B</b></button>
              <button class="editor-toolbar__btn" data-action="italic" data-tooltip="斜体"><i>I</i></button>
              <button class="editor-toolbar__btn" data-action="strikethrough" data-tooltip="删除线"><s>S</s></button>
              <div class="editor-toolbar__sep"></div>
              <button class="editor-toolbar__btn" data-action="h2" data-tooltip="标题2">H2</button>
              <button class="editor-toolbar__btn" data-action="h3" data-tooltip="标题3">H3</button>
              <div class="editor-toolbar__sep"></div>
              <button class="editor-toolbar__btn" data-action="link" data-tooltip="链接">&#128279;</button>
              <button class="editor-toolbar__btn" data-action="image" data-tooltip="图片">&#128247;</button>
              <button class="editor-toolbar__btn" data-action="code" data-tooltip="代码">&lt;/&gt;</button>
              <button class="editor-toolbar__btn" data-action="codeblock" data-tooltip="代码块">{ }</button>
              <div class="editor-toolbar__sep"></div>
              <button class="editor-toolbar__btn" data-action="quote" data-tooltip="引用">&#8220;</button>
              <button class="editor-toolbar__btn" data-action="ul" data-tooltip="无序列表">&#8226;</button>
              <button class="editor-toolbar__btn" data-action="ol" data-tooltip="有序列表">1.</button>
              <button class="editor-toolbar__btn" data-action="table" data-tooltip="表格">&#9638;</button>
              <div class="editor-toolbar__sep"></div>
              <button class="editor-toolbar__btn" data-action="hr" data-tooltip="分割线">&#8213;</button>
            </div>

            <!-- 编辑器分屏 -->
            <div class="editor-body" id="editor-body">
              <div class="editor-pane">
                <div class="editor-pane__header">Markdown</div>
                <textarea
                  class="editor-textarea"
                  id="editor-content"
                  placeholder="开始写作..."
                >${isEdit ? post.content : ''}</textarea>
              </div>
              <div class="editor-divider" id="editor-divider"></div>
              <div class="editor-pane">
                <div class="editor-pane__header">预览</div>
                <div class="editor-preview post-content" id="editor-preview">
                  <p style="color:var(--text-tertiary);text-align:center;padding-top:var(--space-2xl);">预览区域</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 侧边栏设置 -->
          <div class="editor-sidebar">
            <!-- 发布设置 -->
            <div class="editor-panel">
              <div class="editor-panel__title">
                <span>📢</span> 发布设置
              </div>
              <div class="form-group">
                <label class="form-group__label">状态</label>
                <select class="input" id="editor-status">
                  <option value="draft" ${post.status === 'draft' ? 'selected' : ''}>草稿</option>
                  <option value="published" ${post.status === 'published' ? 'selected' : ''}>已发布</option>
                </select>
              </div>
              <div style="display:flex;gap:var(--space-sm);">
                <button class="btn btn--primary" style="flex:1;" onclick="savePost(false)">保存</button>
                <button class="btn btn--accent" style="flex:1;" onclick="savePost(true)">发布</button>
              </div>
            </div>

            <!-- 分类标签 -->
            <div class="editor-panel">
              <div class="editor-panel__title">
                <span>📁</span> 分类与标签
              </div>
              <div class="form-group">
                <label class="form-group__label">分类</label>
                <select class="input" id="editor-category">
                  <option value="">选择分类</option>
                  ${categoryOptions}
                </select>
              </div>
              <div class="form-group">
                <label class="form-group__label">标签（逗号分隔）</label>
                <input class="input" id="editor-tags" value="${tagsStr}" placeholder="标签1, 标签2">
              </div>
            </div>

            <!-- 摘要 -->
            <div class="editor-panel">
              <div class="editor-panel__title">
                <span>📋</span> 摘要
              </div>
              <textarea class="input textarea" id="editor-excerpt" rows="4" placeholder="文章摘要...">${post.excerpt || ''}</textarea>
            </div>

            <!-- 封面图 -->
            <div class="editor-panel">
              <div class="editor-panel__title">
                <span>🖼️</span> 封面图
              </div>
              <input class="input" id="editor-cover" value="${post.cover || ''}" placeholder="图片 URL">
              <button class="btn btn--ghost btn--sm" style="margin-top:var(--space-sm);width:100%;" onclick="openMediaPicker()">从媒体库选择</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 分类管理
 */
async function renderAdminCategories() {
  let categories = [];
  try {
    const res = await api.getCategories();
    categories = res.data || [];
  } catch (e) {
    console.error('Failed to load categories:', e);
  }

  const itemsHtml = categories.map(cat => `
    <tr>
      <td style="font-weight:500;color:var(--text-primary);">${cat.name}</td>
      <td>${cat.slug}</td>
      <td>${cat.postCount || 0}</td>
      <td>
        <div style="display:flex;gap:var(--space-xs);">
          <button class="btn btn--ghost btn--sm" onclick="editCategory(${cat.id})">编辑</button>
          <button class="btn btn--ghost btn--sm" style="color:var(--color-danger);" onclick="deleteCategory(${cat.id})">删除</button>
        </div>
      </td>
    </tr>
  `).join('');

  return `
    ${renderAdminSidebar('categories')}
    <div class="admin-main">
      ${renderAdminTopbar('分类管理', [{ label: '分类管理' }])}
      <div class="admin-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
          <h2 style="font-size:var(--text-xl);font-weight:700;">分类列表</h2>
          <button class="btn btn--primary" onclick="openCategoryModal()">+ 新建分类</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>Slug</th>
              <th>文章数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="4" style="text-align:center;padding:var(--space-2xl);color:var(--text-tertiary);">暂无分类</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新建/编辑分类模态框 -->
    <div class="modal-overlay" id="category-modal" style="display:none;">
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title" id="category-modal-title">新建分类</h3>
          <button class="modal__close" onclick="closeCategoryModal()">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-group__label">分类名称</label>
          <input class="input" id="category-name" placeholder="输入分类名称">
        </div>
        <div class="form-group">
          <label class="form-group__label">Slug</label>
          <input class="input" id="category-slug" placeholder="输入 Slug（留空自动生成）">
        </div>
        <div class="form-group">
          <label class="form-group__label">描述</label>
          <textarea class="input textarea" id="category-desc" rows="3" placeholder="分类描述"></textarea>
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" onclick="closeCategoryModal()">取消</button>
          <button class="btn btn--primary" onclick="saveCategory()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 标签管理
 */
async function renderAdminTags() {
  let tags = [];
  try {
    const res = await api.getTags();
    tags = res.data || [];
  } catch (e) {
    console.error('Failed to load tags:', e);
  }

  const itemsHtml = tags.map(tag => `
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-md) var(--space-lg);">
      <div style="display:flex;align-items:center;gap:var(--space-md);">
        <span class="tag tag--active">${tag.name}</span>
        <span style="font-size:var(--text-xs);color:var(--text-tertiary);">${tag.postCount || 0} 篇文章</span>
      </div>
      <button class="btn btn--ghost btn--sm" style="color:var(--color-danger);" onclick="deleteTag(${tag.id})">删除</button>
    </div>
  `).join('');

  return `
    ${renderAdminSidebar('tags')}
    <div class="admin-main">
      ${renderAdminTopbar('标签管理', [{ label: '标签管理' }])}
      <div class="admin-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
          <h2 style="font-size:var(--text-xl);font-weight:700;">标签列表</h2>
          <button class="btn btn--primary" onclick="openTagModal()">+ 新建标签</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-md);">
          ${itemsHtml || '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state__icon">🏷️</div><h3 class="empty-state__title">暂无标签</h3></div>'}
        </div>
      </div>
    </div>

    <!-- 新建标签模态框 -->
    <div class="modal-overlay" id="tag-modal" style="display:none;">
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">新建标签</h3>
          <button class="modal__close" onclick="closeTagModal()">&times;</button>
        </div>
        <div class="form-group">
          <label class="form-group__label">标签名称</label>
          <input class="input" id="tag-name" placeholder="输入标签名称">
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" onclick="closeTagModal()">取消</button>
          <button class="btn btn--primary" onclick="saveTag()">保存</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 附件管理
 */
async function renderAdminMedia() {
  let media = [];
  try {
    const res = await api.getMedia({ page: 1, pageSize: 50 });
    media = res.data || [];
  } catch (e) {
    console.error('Failed to load media:', e);
  }

  const itemsHtml = media.map(item => `
    <div class="media-item" onclick="selectMedia(${item.id})">
      <img class="media-item__img" src="${item.url}" alt="${item.name}" loading="lazy">
      <div class="media-item__overlay">
        <button class="btn btn--ghost btn--sm" onclick="event.stopPropagation();copyMediaUrl('${item.url}')">复制链接</button>
        <button class="btn btn--ghost btn--sm" style="color:var(--color-danger);" onclick="event.stopPropagation();deleteMedia(${item.id})">删除</button>
      </div>
      <div class="media-item__name">${item.name}</div>
    </div>
  `).join('');

  return `
    ${renderAdminSidebar('media')}
    <div class="admin-main">
      ${renderAdminTopbar('附件管理', [{ label: '附件管理' }])}
      <div class="admin-content">
        <!-- 上传区域 -->
        <div class="upload-zone" id="upload-zone">
          <div class="upload-zone__icon">☁️</div>
          <p class="upload-zone__text">拖拽文件到此处或点击上传</p>
          <p class="upload-zone__hint">支持 JPG、PNG、GIF、WebP、SVG 格式，单文件最大 5MB</p>
          <input type="file" id="file-input" multiple accept="image/*" style="display:none;">
        </div>

        <!-- 上传进度 -->
        <div id="upload-progress" style="display:none;margin-top:var(--space-lg);">
          <div class="progress">
            <div class="progress__bar" id="upload-progress-bar" style="width:0%"></div>
          </div>
          <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-xs);" id="upload-progress-text">上传中...</p>
        </div>

        <div class="divider"></div>

        <!-- 文件网格 -->
        <h3 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-lg);">媒体库</h3>
        <div class="media-grid">
          ${itemsHtml || '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state__icon">🖼️</div><h3 class="empty-state__title">暂无附件</h3><p class="empty-state__desc">上传你的第一张图片</p></div>'}
        </div>
      </div>
    </div>
  `;
}

/**
 * 站点设置
 */
async function renderAdminSettings() {
  let settings = {};
  try {
    settings = await api.getSettings();
  } catch (e) {
    console.error('Failed to load settings:', e);
  }

  return `
    ${renderAdminSidebar('settings')}
    <div class="admin-main">
      ${renderAdminTopbar('站点设置', [{ label: '站点设置' }])}
      <div class="admin-content">
        <!-- 基本设置 -->
        <div class="settings-section">
          <h3 class="settings-section__title">🌐 基本设置</h3>
          <div class="form-group">
            <label class="form-group__label">站点名称</label>
            <input class="input input--lg" id="setting-site-name" value="${settings.siteName || 'Nova Blog'}">
          </div>
          <div class="form-group">
            <label class="form-group__label">站点描述</label>
            <textarea class="input textarea" id="setting-site-desc" rows="3">${settings.siteDescription || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-group__label">站点 URL</label>
            <input class="input" id="setting-site-url" value="${settings.siteUrl || ''}" placeholder="https://example.com">
          </div>
        </div>

        <!-- 个人信息 -->
        <div class="settings-section">
          <h3 class="settings-section__title">👤 个人信息</h3>
          <div class="form-group">
            <label class="form-group__label">作者名称</label>
            <input class="input" id="setting-author-name" value="${settings.authorName || ''}">
          </div>
          <div class="form-group">
            <label class="form-group__label">个人简介</label>
            <textarea class="input textarea" id="setting-bio" rows="3">${settings.bio || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-group__label">头像 URL</label>
            <input class="input" id="setting-avatar" value="${settings.avatar || ''}">
          </div>
        </div>

        <!-- 社交链接 -->
        <div class="settings-section">
          <h3 class="settings-section__title">🔗 社交链接</h3>
          <div class="form-group">
            <label class="form-group__label">GitHub</label>
            <input class="input" id="setting-github" value="${settings.github || ''}" placeholder="用户名">
          </div>
          <div class="form-group">
            <label class="form-group__label">Twitter</label>
            <input class="input" id="setting-twitter" value="${settings.twitter || ''}" placeholder="用户名">
          </div>
          <div class="form-group">
            <label class="form-group__label">Email</label>
            <input class="input" id="setting-email" value="${settings.email || ''}" placeholder="email@example.com">
          </div>
        </div>

        <!-- 外观设置 -->
        <div class="settings-section">
          <h3 class="settings-section__title">🎨 外观设置</h3>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">深色模式</div>
              <div class="settings-row__desc">默认使用深色主题</div>
            </div>
            <div class="switch switch--active" id="setting-dark-mode" onclick="toggleSwitch(this)">
              <div class="switch__thumb"></div>
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label">文章列表动画</div>
              <div class="settings-row__desc">启用文章卡片入场动画</div>
            </div>
            <div class="switch switch--active" id="setting-animation" onclick="toggleSwitch(this)">
              <div class="switch__thumb"></div>
            </div>
          </div>
        </div>

        <!-- 保存按钮 -->
        <div style="display:flex;justify-content:flex-end;gap:var(--space-sm);margin-top:var(--space-xl);">
          <button class="btn btn--ghost">重置</button>
          <button class="btn btn--primary" onclick="saveSettings()">保存设置</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 登录页
 */
function renderLoginPage() {
  return `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:var(--space-lg);">
      <div style="width:100%;max-width:400px;">
        <div style="text-align:center;margin-bottom:var(--space-2xl);">
          <span class="header__logo-icon" style="width:56px;height:56px;font-size:24px;display:inline-flex;margin-bottom:var(--space-md);">N</span>
          <h1 style="font-size:var(--text-2xl);font-weight:800;">登录 Nova Blog</h1>
          <p style="color:var(--text-tertiary);margin-top:var(--space-sm);">输入你的凭据以访问管理后台</p>
        </div>
        <div class="card" style="padding:var(--space-2xl);">
          <div class="form-group">
            <label class="form-group__label">用户名</label>
            <input class="input input--lg" id="login-username" placeholder="输入用户名" autocomplete="username">
          </div>
          <div class="form-group">
            <label class="form-group__label">密码</label>
            <input class="input input--lg" type="password" id="login-password" placeholder="输入密码" autocomplete="current-password">
          </div>
          <button class="btn btn--primary btn--lg" style="width:100%;margin-top:var(--space-md);" onclick="handleLogin()">
            登录
          </button>
        </div>
      </div>
    </div>
  `;
}
