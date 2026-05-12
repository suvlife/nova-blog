/**
 * Nova Blog - 应用入口
 * 初始化路由、状态管理、全局事件
 */

// ========== 路由配置 ==========

// 前台路由
router.addRoutes([
  {
    path: '/',
    handler: renderHomePage,
    meta: { name: 'home', title: '首页' }
  },
  {
    path: '/posts',
    handler: renderPostsPage,
    meta: { name: 'posts', title: '文章' }
  },
  {
    path: '/posts/:slug',
    handler: renderPostDetailPage,
    meta: { name: 'post-detail', title: '文章详情' }
  },
  {
    path: '/archives',
    handler: renderArchivesPage,
    meta: { name: 'archives', title: '归档' }
  },
  {
    path: '/about',
    handler: renderAboutPage,
    meta: { name: 'about', title: '关于' }
  },
]);

// 后台路由
router.addRoutes([
  {
    path: '/admin',
    handler: renderAdminDashboard,
    meta: { name: 'admin-dashboard', title: '仪表盘', requiresAuth: true }
  },
  {
    path: '/admin/posts',
    handler: renderAdminPosts,
    meta: { name: 'admin-posts', title: '文章管理', requiresAuth: true }
  },
  {
    path: '/admin/posts/new',
    handler: () => renderAdminPostEditor({}),
    meta: { name: 'admin-new-post', title: '写文章', requiresAuth: true }
  },
  {
    path: '/admin/posts/edit/:slug',
    handler: renderAdminPostEditor,
    meta: { name: 'admin-edit-post', title: '编辑文章', requiresAuth: true }
  },
  {
    path: '/admin/categories',
    handler: renderAdminCategories,
    meta: { name: 'admin-categories', title: '分类管理', requiresAuth: true }
  },
  {
    path: '/admin/tags',
    handler: renderAdminTags,
    meta: { name: 'admin-tags', title: '标签管理', requiresAuth: true }
  },
  {
    path: '/admin/media',
    handler: renderAdminMedia,
    meta: { name: 'admin-media', title: '附件管理', requiresAuth: true }
  },
  {
    path: '/admin/settings',
    handler: renderAdminSettings,
    meta: { name: 'admin-settings', title: '站点设置', requiresAuth: true }
  },
  {
    path: '/admin/login',
    handler: renderLoginPage,
    meta: { name: 'admin-login', title: '登录' }
  },
]);

// 404 路由
router.addRoute('*', () => `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;">
    <h1 style="font-size:120px;font-weight:900;background:var(--gradient-accent);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">404</h1>
    <p style="color:var(--text-secondary);margin-bottom:var(--space-xl);">页面未找到</p>
    <a href="/" class="btn btn--primary">返回首页</a>
  </div>
`, { name: 'not-found' });

// ========== 路由守卫 ==========

router.beforeEach((to, from) => {
  // 需要认证的后台页面
  if (to.meta?.requiresAuth) {
    const token = localStorage.getItem('nova_token');
    if (!token) {
      return '/admin/login';
    }
  }

  // 已登录用户访问登录页，重定向到后台
  if (to.name === 'admin-login') {
    const token = localStorage.getItem('nova_token');
    if (token) {
      return '/admin';
    }
  }

  // 更新页面标题
  const siteName = store.getState('site.name') || 'Nova Blog';
  document.title = to.meta?.title ? `${to.meta.title} - ${siteName}` : siteName;

  return true;
});

router.afterEach((to, from) => {
  // 页面切换后滚动到顶部
  window.scrollTo(0, 0);
});

// ========== 全局事件 ==========

// 认证失败处理
window.addEventListener('auth:unauthorized', () => {
  showToast('认证已过期，请重新登录', 'warning');
  setTimeout(() => {
    router.navigate('/admin/login');
  }, 1500);
});

// 编辑器保存快捷键
window.addEventListener('editor:save', () => {
  savePost(false);
});

// ========== 后台操作函数 ==========

async function handleLogin() {
  const username = document.getElementById('login-username')?.value;
  const password = document.getElementById('login-password')?.value;

  if (!username || !password) {
    showToast('请输入用户名和密码', 'warning');
    return;
  }

  try {
    await api.login({ username, password });
    showToast('登录成功', 'success');
    router.navigate('/admin');
  } catch (e) {
    showToast(e.message || '登录失败', 'error');
  }
}

async function handleLogout() {
  try {
    await api.logout();
    showToast('已退出登录', 'success');
    router.navigate('/admin/login');
  } catch (e) {
    showToast('退出失败', 'error');
  }
}

async function savePost(publish = false) {
  const title = document.getElementById('editor-title')?.value;
  const content = markdownEditor.getContent();
  const category = document.getElementById('editor-category')?.value;
  const tagsStr = document.getElementById('editor-tags')?.value;
  const excerpt = document.getElementById('editor-excerpt')?.value;
  const cover = document.getElementById('editor-cover')?.value;
  const status = publish ? 'published' : (document.getElementById('editor-status')?.value || 'draft');

  if (!title) {
    showToast('请输入文章标题', 'warning');
    return;
  }

  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const postData = { title, content, category, tags, excerpt, cover, status };

  try {
    // 判断是新建还是编辑
    const currentPath = window.location.pathname;
    if (currentPath.includes('/edit/')) {
      const slug = currentPath.split('/edit/')[1];
      await api.updatePost(slug, postData);
      showToast('文章已更新', 'success');
    } else {
      await api.createPost(postData);
      showToast(publish ? '文章已发布' : '草稿已保存', 'success');
      router.navigate('/admin/posts');
    }
  } catch (e) {
    showToast(e.message || '保存失败', 'error');
  }
}

async function deletePost(slug) {
  const confirmed = await showConfirm('确定要删除这篇文章吗？此操作不可撤销。');
  if (!confirmed) return;

  try {
    await api.deletePost(slug);
    showToast('文章已删除', 'success');
    router.navigate('/admin/posts', { replace: true });
  } catch (e) {
    showToast(e.message || '删除失败', 'error');
  }
}

function openCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (modal) modal.style.display = 'flex';
}

function closeCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (modal) modal.style.display = 'none';
}

async function saveCategory() {
  const name = document.getElementById('category-name')?.value;
  const slug = document.getElementById('category-slug')?.value || generateSlug(name);
  const description = document.getElementById('category-desc')?.value;

  if (!name) {
    showToast('请输入分类名称', 'warning');
    return;
  }

  try {
    await api.createCategory({ name, slug, description });
    showToast('分类已创建', 'success');
    closeCategoryModal();
    router.navigate('/admin/categories', { replace: true });
  } catch (e) {
    showToast(e.message || '创建失败', 'error');
  }
}

async function deleteCategory(id) {
  const confirmed = await showConfirm('确定要删除此分类吗？');
  if (!confirmed) return;

  try {
    await api.deleteCategory(id);
    showToast('分类已删除', 'success');
    router.navigate('/admin/categories', { replace: true });
  } catch (e) {
    showToast(e.message || '删除失败', 'error');
  }
}

function openTagModal() {
  const modal = document.getElementById('tag-modal');
  if (modal) modal.style.display = 'flex';
}

function closeTagModal() {
  const modal = document.getElementById('tag-modal');
  if (modal) modal.style.display = 'none';
}

async function saveTag() {
  const name = document.getElementById('tag-name')?.value;

  if (!name) {
    showToast('请输入标签名称', 'warning');
    return;
  }

  try {
    await api.createTag({ name });
    showToast('标签已创建', 'success');
    closeTagModal();
    router.navigate('/admin/tags', { replace: true });
  } catch (e) {
    showToast(e.message || '创建失败', 'error');
  }
}

async function deleteTag(id) {
  const confirmed = await showConfirm('确定要删除此标签吗？');
  if (!confirmed) return;

  try {
    await api.deleteTag(id);
    showToast('标签已删除', 'success');
    router.navigate('/admin/tags', { replace: true });
  } catch (e) {
    showToast(e.message || '删除失败', 'error');
  }
}

async function deleteMedia(id) {
  const confirmed = await showConfirm('确定要删除此文件吗？');
  if (!confirmed) return;

  try {
    await api.deleteMedia(id);
    showToast('文件已删除', 'success');
    router.navigate('/admin/media', { replace: true });
  } catch (e) {
    showToast(e.message || '删除失败', 'error');
  }
}

function copyMediaUrl(url) {
  copyToClipboard(url);
}

function openMediaPicker() {
  // 打开媒体选择器模态框
  showToast('媒体选择器功能开发中', 'info');
}

async function saveSettings() {
  const settings = {
    siteName: document.getElementById('setting-site-name')?.value,
    siteDescription: document.getElementById('setting-site-desc')?.value,
    siteUrl: document.getElementById('setting-site-url')?.value,
    authorName: document.getElementById('setting-author-name')?.value,
    bio: document.getElementById('setting-bio')?.value,
    avatar: document.getElementById('setting-avatar')?.value,
    github: document.getElementById('setting-github')?.value,
    twitter: document.getElementById('setting-twitter')?.value,
    email: document.getElementById('setting-email')?.value,
  };

  try {
    await api.updateSettings(settings);
    showToast('设置已保存', 'success');
  } catch (e) {
    showToast(e.message || '保存失败', 'error');
  }
}

function toggleSwitch(el) {
  el.classList.toggle('switch--active');
}

// ========== 启动应用 ==========

document.addEventListener('DOMContentLoaded', () => {
  // 设置路由容器
  router.setContainer('#app');

  // 初始化通用功能
  initPageCommon();

  // 启动路由
  router.start();
});
