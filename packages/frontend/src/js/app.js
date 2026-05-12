/**
 * Nova Blog - 应用入口
 * 初始化 Store、Router，注册路由和守卫，启动应用
 */

(function () {
  'use strict';

  const store = NovaStore;
  const router = NovaRouter;
  const api = NovaApi;
  const H = NovaHelpers;
  const Front = NovaFront;
  const Admin = NovaAdmin;

  // ==================== 1. 初始化 Store ====================

  // 从 localStorage 恢复状态
  store.hydrate();

  // 设置持久化
  store.persist(['user', 'token', 'theme', 'sidebarCollapsed', 'siteSettings']);

  // 如果有 token，设置到 API 客户端
  const token = store.getState('token');
  if (token) {
    api.setToken(token);
  }

  // 监听 token 变化，同步到 API 客户端
  store.subscribe('token', (newToken) => {
    if (newToken) {
      api.setToken(newToken);
    } else {
      api.clearToken();
    }
  });

  // ==================== 2. 注册路由 ====================

  // 前台路由
  router.addRoute('/', async () => {
    return await Front.renderHomePage();
  }, { title: '首页', isHome: true });

  router.addRoute('/posts', async () => {
    return await Front.renderPostsPage();
  }, { title: '文章' });

  router.addRoute('/posts/:slug', async (params) => {
    return await Front.renderPostDetailPage(params.slug);
  }, { title: '文章详情' });

  router.addRoute('/archives', async () => {
    return await Front.renderArchivesPage();
  }, { title: '归档' });

  router.addRoute('/about', async () => {
    return await Front.renderAboutPage();
  }, { title: '关于' });

  // 后台路由
  router.addRoute('/admin', async () => {
    return await Admin.renderAdminDashboard();
  }, { title: '仪表盘', requiresAuth: true });

  router.addRoute('/admin/posts', async () => {
    return await Admin.renderAdminPosts();
  }, { title: '文章管理', requiresAuth: true });

  router.addRoute('/admin/posts/new', async () => {
    return await Admin.renderAdminPostEditor(null);
  }, { title: '新建文章', requiresAuth: true });

  router.addRoute('/admin/posts/edit/:slug', async (params) => {
    return await Admin.renderAdminPostEditor(params.slug);
  }, { title: '编辑文章', requiresAuth: true });

  router.addRoute('/admin/categories', async () => {
    return await Admin.renderAdminCategories();
  }, { title: '分类管理', requiresAuth: true });

  router.addRoute('/admin/tags', async () => {
    return await Admin.renderAdminTags();
  }, { title: '标签管理', requiresAuth: true });

  router.addRoute('/admin/media', async () => {
    return await Admin.renderAdminMedia();
  }, { title: '附件管理', requiresAuth: true });

  router.addRoute('/admin/settings', async () => {
    return await Admin.renderAdminSettings();
  }, { title: '站点设置', requiresAuth: true });

  // 登录页
  router.addRoute('/admin/login', async () => {
    return Admin.renderLoginPage();
  }, { title: '登录' });

  // 404 通配符路由
  router.addRoute('*', async () => {
    return Front.renderNotFoundPage();
  }, { title: '页面未找到' });

  // ==================== 3. 设置路由守卫 ====================

  // 认证守卫 - 需要登录的路由
  router.beforeEach((to, from) => {
    if (to.meta && to.meta.requiresAuth) {
      const token = store.getState('token');
      if (!token) {
        return '/admin/login';
      }
    }

    // 已登录用户访问登录页，重定向到管理后台
    if (to.path === '/admin/login') {
      const token = store.getState('token');
      if (token) {
        return '/admin';
      }
    }
  });

  // 标题守卫 - 更新页面标题
  router.afterEach((to) => {
    const title = to.meta?.title;
    const siteName = store.getState('siteSettings')?.siteName || 'Nova Blog';

    if (title) {
      document.title = `${title} - ${siteName}`;
    } else {
      document.title = siteName;
    }
  });

  // ==================== 4. 注册全局事件监听 ====================

  // 认证失效事件 - 跳转到登录页
  window.addEventListener('auth:unauthorized', () => {
    store.setState('token', null);
    store.setState('user', null);
    H.showToast('认证已过期，请重新登录', 'warning');
    router.navigate('/admin/login', { replace: true });
  });

  // ==================== 5. 页面渲染后初始化 ====================

  // 每次路由切换后执行初始化
  router.afterEach(() => {
    // 延迟执行，确保 DOM 已更新
    requestAnimationFrame(() => {
      // 初始化 Header 滚动效果
      H.initHeaderScroll();

      // 初始化移动端菜单
      H.initMobileMenu();

      // 初始化滚动动画
      H.initScrollAnimations();

      // 初始化首页粒子动画
      const heroCanvas = document.getElementById('hero-canvas');
      if (heroCanvas) {
        H.initParticles(heroCanvas);
      }

      // 初始化后台交互
      initAdminInteractions();

      // 初始化登录表单
      initLoginForm();

      // 高亮当前导航
      highlightCurrentNav();

      // 初始化编辑器
      initEditorIfNeeded();
    });
  });

  // ==================== 6. 后台交互初始化 ====================

  function initAdminInteractions() {
    // 侧边栏折叠
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const collapsed = store.getState('sidebarCollapsed');
        store.setState('sidebarCollapsed', !collapsed);

        const sidebar = document.getElementById('admin-sidebar');
        if (sidebar) {
          sidebar.classList.toggle('admin-sidebar-collapsed');
        }
      });
    }

    // 退出登录
    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        H.showConfirm('确定要退出登录吗？', async () => {
          try {
            await NovaAuth.logout();
          } catch {
            // 即使 API 调用失败也清除本地状态
          }
          store.setState('token', null);
          store.setState('user', null);
          H.showToast('已退出登录', 'success');
          router.navigate('/admin/login', { replace: true });
        });
      });
    }

    // 分类表单提交
    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
      categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('cat-name').value.trim();
        const slug = document.getElementById('cat-slug').value.trim();
        const description = document.getElementById('cat-description').value.trim();

        if (!name) {
          H.showToast('请输入分类名称', 'warning');
          return;
        }

        try {
          await NovaCategories.create({
            name,
            slug: slug || H.generateSlug(name),
            description
          });
          H.showToast('分类创建成功', 'success');
          // 重新加载页面
          router.navigate('/admin/categories', { replace: true });
        } catch (err) {
          H.showToast(err.message || '创建失败', 'error');
        }
      });
    }

    // 标签表单提交
    const tagForm = document.getElementById('tag-form');
    if (tagForm) {
      tagForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('tag-name').value.trim();
        const slug = document.getElementById('tag-slug').value.trim();

        if (!name) {
          H.showToast('请输入标签名称', 'warning');
          return;
        }

        try {
          await NovaTags.create({
            name,
            slug: slug || H.generateSlug(name)
          });
          H.showToast('标签创建成功', 'success');
          router.navigate('/admin/tags', { replace: true });
        } catch (err) {
          H.showToast(err.message || '创建失败', 'error');
        }
      });
    }

    // 文件上传
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    if (uploadZone && fileInput) {
      // 点击上传
      uploadZone.addEventListener('click', () => {
        fileInput.click();
      });

      // 文件选择
      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          await handleFileUpload(files);
        }
      });

      // 拖拽上传
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('upload-zone-dragover');
      });

      uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('upload-zone-dragover');
      });

      uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('upload-zone-dragover');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          await handleFileUpload(files);
        }
      });
    }

    // 设置保存（顶部和底部按钮）
    const saveSettingsHandler = async () => {
      const form = document.getElementById('settings-form');
      if (!form) return;

      const formData = new FormData(form);
      const data = {};
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      try {
        await NovaSettings.update(data);
        store.setState('siteSettings', data);
        H.showToast('设置已保存', 'success');
      } catch (err) {
        H.showToast(err.message || '保存失败', 'error');
      }
    };

    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettingsHandler);
    }

    const saveSettingsBottomBtn = document.getElementById('save-settings-bottom');
    if (saveSettingsBottomBtn) {
      saveSettingsBottomBtn.addEventListener('click', saveSettingsHandler);
    }

    // 文章保存/发布
    const saveDraftBtn = document.getElementById('save-draft');
    const publishBtn = document.getElementById('publish-post');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => savePost('draft'));
    }
    if (publishBtn) {
      publishBtn.addEventListener('click', () => savePost('published'));
    }

    // 自动生成 Slug
    const titleInput = document.getElementById('post-title');
    const slugInput = document.getElementById('post-slug');
    if (titleInput && slugInput) {
      titleInput.addEventListener('input', H.debounce(() => {
        if (!slugInput.value || slugInput.dataset.auto === 'true') {
          slugInput.value = H.generateSlug(titleInput.value);
          slugInput.dataset.auto = 'true';
        }
      }, 500));

      slugInput.addEventListener('input', () => {
        slugInput.dataset.auto = 'false';
      });
    }
  }

  // ==================== 7. 登录表单初始化 ====================

  function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      if (!username || !password) {
        H.showToast('请输入用户名和密码', 'warning');
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '登录中...';
      }

      try {
        const result = await NovaAuth.login(username, password);
        const data = result.data || result;

        // 保存认证信息
        store.setState('token', data.token || data.accessToken);
        store.setState('user', data.user || { username });

        H.showToast('登录成功', 'success');

        // 跳转到管理后台
        router.navigate('/admin', { replace: true });
      } catch (err) {
        H.showToast(err.message || '登录失败', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '登录';
        }
      }
    });
  }

  // ==================== 8. 高亮当前导航 ====================

  function highlightCurrentNav() {
    const currentPath = window.location.pathname;

    // 前台导航
    document.querySelectorAll('.header-nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ==================== 9. 编辑器初始化 ====================

  function initEditorIfNeeded() {
    const editorContainer = document.getElementById('markdown-editor-container');
    if (!editorContainer || editorContainer.dataset.initialized) return;

    // 获取已有内容（编辑模式）
    const slug = router.getParams().slug;
    let initialContent = '';

    // 编辑器会在页面渲染时加载内容，这里初始化编辑器 UI
    const editor = new MarkdownEditor(editorContainer, {
      initialContent: initialContent,
      showPreview: true,
      onChange: (content) => {
        // 内容变化回调
        window._currentEditorContent = content;
      },
      onImageUpload: () => {
        // 图片上传 - 打开附件选择器
        H.showToast('请使用附件管理上传图片，然后插入链接', 'info');
      }
    });

    editor.init();
    editorContainer.dataset.initialized = 'true';

    // 保存编辑器实例到全局
    window._currentEditor = editor;
  }

  // ==================== 10. 文章保存 ====================

  async function savePost(status) {
    const title = document.getElementById('post-title')?.value.trim();
    const slug = document.getElementById('post-slug')?.value.trim();
    const categoryId = document.getElementById('post-category')?.value;
    const excerpt = document.getElementById('post-excerpt')?.value.trim();
    const coverImage = document.getElementById('post-cover')?.value.trim();

    // 获取选中的标签
    const tagElements = document.querySelectorAll('input[name="tags"]:checked');
    const tagIds = Array.from(tagElements).map(el => el.value);

    // 获取编辑器内容
    const content = window._currentEditorContent ||
      window._currentEditor?.getContent() || '';

    if (!title) {
      H.showToast('请输入文章标题', 'warning');
      return;
    }

    const postData = {
      title,
      slug: slug || H.generateSlug(title),
      content,
      excerpt,
      coverImage,
      category: categoryId || null,
      tags: tagIds,
      status
    };

    try {
      const editingSlug = router.getParams().slug;
      if (editingSlug) {
        await NovaPosts.update(editingSlug, postData);
        H.showToast('文章已更新', 'success');
      } else {
        await NovaPosts.create(postData);
        H.showToast(status === 'published' ? '文章已发布' : '草稿已保存', 'success');
      }
      router.navigate('/admin/posts', { replace: true });
    } catch (err) {
      H.showToast(err.message || '保存失败', 'error');
    }
  }

  // ==================== 11. 文件上传处理 ====================

  async function handleFileUpload(files) {
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const percentText = document.getElementById('upload-percent');

    if (progressContainer) {
      progressContainer.style.display = 'block';
    }

    try {
      await NovaAttachments.uploadBatch(files, (percent) => {
        if (progressBar) {
          progressBar.style.width = percent + '%';
        }
        if (percentText) {
          percentText.textContent = percent;
        }
      });

      H.showToast('文件上传成功', 'success');

      // 重新加载附件页面
      router.navigate('/admin/media', { replace: true });
    } catch (err) {
      H.showToast(err.message || '上传失败', 'error');
    } finally {
      if (progressContainer) {
        progressContainer.style.display = 'none';
      }
    }
  }

  // ==================== 12. 全局删除函数 ====================

  // 删除文章
  window.deletePost = async function (id) {
    H.showConfirm('确定要删除这篇文章吗？此操作不可撤销。', async () => {
      try {
        await NovaPosts.delete(id);
        H.showToast('文章已删除', 'success');
        router.navigate('/admin/posts', { replace: true });
      } catch (err) {
        H.showToast(err.message || '删除失败', 'error');
      }
    });
  };

  // 删除分类
  window.deleteCategory = async function (id) {
    H.showConfirm('确定要删除此分类吗？', async () => {
      try {
        await NovaCategories.delete(id);
        H.showToast('分类已删除', 'success');
        router.navigate('/admin/categories', { replace: true });
      } catch (err) {
        H.showToast(err.message || '删除失败', 'error');
      }
    });
  };

  // 删除标签
  window.deleteTag = async function (id) {
    H.showConfirm('确定要删除此标签吗？', async () => {
      try {
        await NovaTags.delete(id);
        H.showToast('标签已删除', 'success');
        router.navigate('/admin/tags', { replace: true });
      } catch (err) {
        H.showToast(err.message || '删除失败', 'error');
      }
    });
  };

  // 删除附件
  window.deleteAttachment = async function (id) {
    H.showConfirm('确定要删除此附件吗？', async () => {
      try {
        await NovaAttachments.delete(id);
        H.showToast('附件已删除', 'success');
        router.navigate('/admin/media', { replace: true });
      } catch (err) {
        H.showToast(err.message || '删除失败', 'error');
      }
    });
  };

  // 编辑分类/标签（弹出模态框）
  window.editCategory = function (id) {
    H.showToast('编辑功能开发中', 'info');
  };

  window.editTag = function (id) {
    H.showToast('编辑功能开发中', 'info');
  };

  // ==================== 13. 启动应用 ====================

  // 设置渲染容器
  router.setContainer('#app');

  // 启动路由
  router.start();

  console.log(
    '%c Nova Blog %c v1.0.0 %c',
    'background: #6C5CE7; color: #fff; padding: 4px 8px; border-radius: 4px 0 0 4px;',
    'background: #00F5D4; color: #0A0A1A; padding: 4px 8px; border-radius: 0 4px 4px 0;',
    ''
  );
  console.log('%c深空赛博风格博客系统已启动', 'color: #A29BFE; font-style: italic;');
})();
