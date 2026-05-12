// Nova Blog - 合并 JS 文件

/**
 * Nova Blog - 状态管理模块
 * 基于发布订阅模式的轻量级状态管理
 */

class Store {
  constructor() {
    // 应用状态
    this.state = {
      user: null,
      token: null,
      theme: 'dark',
      sidebarCollapsed: false,
      siteSettings: {}
    };

    // 状态变化监听器 { key: [callback, ...] }
    this.listeners = {};

    // 中间件列表
    this.middlewares = [];

    // 持久化 key 前缀
    this.storagePrefix = 'nova_blog_';
  }

  /**
   * 获取状态
   * @param {string} key - 状态键名，不传则返回全部状态
   * @returns {*} 状态值
   */
  getState(key) {
    if (key === undefined) {
      return { ...this.state };
    }
    return this.state[key];
  }

  /**
   * 设置状态
   * @param {string} key - 状态键名
   * @param {*} value - 状态值
   */
  setState(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;

    // 执行中间件
    for (const middleware of this.middlewares) {
      try {
        middleware(key, value, oldValue, this.state);
      } catch (err) {
        console.error('[Store] 中间件执行错误:', err);
      }
    }

    // 通知监听器
    if (this.listeners[key]) {
      for (const callback of this.listeners[key]) {
        try {
          callback(value, oldValue, key);
        } catch (err) {
          console.error('[Store] 监听器执行错误:', err);
        }
      }
    }

    // 通知通配符监听器
    if (this.listeners['*']) {
      for (const callback of this.listeners['*']) {
        try {
          callback(value, oldValue, key);
        } catch (err) {
          console.error('[Store] 通配符监听器执行错误:', err);
        }
      }
    }
  }

  /**
   * 订阅状态变化
   * @param {string} key - 状态键名，'*' 表示监听所有变化
   * @param {Function} callback - 回调函数 (newValue, oldValue, key)
   * @returns {Function} 取消订阅函数
   */
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);

    // 返回取消订阅函数
    return () => {
      const index = this.listeners[key].indexOf(callback);
      if (index > -1) {
        this.listeners[key].splice(index, 1);
      }
    };
  }

  /**
   * 添加中间件
   * @param {Function} fn - 中间件函数 (key, value, oldValue, state)
   */
  middleware(fn) {
    this.middlewares.push(fn);
  }

  /**
   * 将指定 key 持久化到 localStorage
   * @param {string[]} keys - 需要持久化的 key 列表
   */
  persist(keys) {
    // 监听变化并保存
    for (const key of keys) {
      this.subscribe(key, (value) => {
        try {
          localStorage.setItem(
            this.storagePrefix + key,
            JSON.stringify(value)
          );
        } catch (err) {
          console.error('[Store] 持久化失败:', err);
        }
      });
    }
  }

  /**
   * 从 localStorage 恢复状态
   */
  hydrate() {
    try {
      const keys = ['user', 'token', 'theme', 'sidebarCollapsed', 'siteSettings'];
      for (const key of keys) {
        const stored = localStorage.getItem(this.storagePrefix + key);
        if (stored !== null) {
          try {
            this.state[key] = JSON.parse(stored);
          } catch {
            this.state[key] = stored;
          }
        }
      }
    } catch (err) {
      console.error('[Store] 状态恢复失败:', err);
    }
  }

  /**
   * 清除所有持久化数据
   */
  clearPersisted() {
    try {
      const keys = ['user', 'token', 'theme', 'sidebarCollapsed', 'siteSettings'];
      for (const key of keys) {
        localStorage.removeItem(this.storagePrefix + key);
      }
    } catch (err) {
      console.error('[Store] 清除持久化数据失败:', err);
    }
  }
}

// 创建全局单例并导出
const store = new Store();
window.NovaStore = store;

/**
 * Nova Blog - API 交互层
 * 封装所有与后端 API 的通信逻辑
 */

class ApiClient {
  /**
   * 构造函数
   * @param {string} baseURL - API 基础路径
   */
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
  }

  /**
   * 设置认证 token
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * 清除认证 token
   */
  clearToken() {
    this.token = null;
  }

  /**
   * 通用请求方法
   * @param {string} method - HTTP 方法
   * @param {string} path - 请求路径
   * @param {Object} options - 请求选项
   * @param {Object} options.params - URL 查询参数
   * @param {Object} options.data - 请求体数据
   * @param {Object} options.headers - 自定义请求头
   * @returns {Promise<Object>} 响应数据
   */
  async request(method, path, options = {}) {
    const { params, data, headers: customHeaders } = options;

    // 构建 URL
    let url = this.baseURL + path;

    // 添加查询参数
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    // 自动添加 Authorization header
    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }

    // 构建请求配置
    const config = {
      method,
      headers,
      credentials: 'same-origin'
    };

    // 添加请求体
    if (data && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      // 处理 401 未授权
      if (response.status === 401) {
        this.clearToken();
        // 触发全局未授权事件
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new Error('认证已过期，请重新登录');
      }

      // 处理其他错误状态码
      if (!response.ok) {
        let errorMessage = '请求失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `请求失败 (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // 处理 204 No Content
      if (response.status === 204) {
        return null;
      }

      // 解析 JSON 响应
      const result = await response.json();
      return result;

    } catch (error) {
      // 网络错误处理
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络设置');
      }
      throw error;
    }
  }

  /**
   * GET 请求
   * @param {string} path - 请求路径
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>}
   */
  async get(path, params) {
    return this.request('GET', path, { params });
  }

  /**
   * POST 请求
   * @param {string} path - 请求路径
   * @param {Object} data - 请求体数据
   * @returns {Promise<Object>}
   */
  async post(path, data) {
    return this.request('POST', path, { data });
  }

  /**
   * PUT 请求
   * @param {string} path - 请求路径
   * @param {Object} data - 请求体数据
   * @returns {Promise<Object>}
   */
  async put(path, data) {
    return this.request('PUT', path, { data });
  }

  /**
   * PATCH 请求
   * @param {string} path - 请求路径
   * @param {Object} data - 请求体数据
   * @returns {Promise<Object>}
   */
  async patch(path, data) {
    return this.request('PATCH', path, { data });
  }

  /**
   * DELETE 请求
   * @param {string} path - 请求路径
   * @returns {Promise<Object>}
   */
  async delete(path) {
    return this.request('DELETE', path);
  }

  /**
   * 文件上传
   * @param {string} path - 上传路径
   * @param {File} file - 文件对象
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Object>}
   */
  async upload(path, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // 上传进度监听
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });
      }

      // 请求完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else if (xhr.status === 401) {
          this.clearToken();
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          reject(new Error('认证已过期，请重新登录'));
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || '上传失败'));
          } catch {
            reject(new Error(`上传失败 (${xhr.status})`));
          }
        }
      });

      // 网络错误
      xhr.addEventListener('error', () => {
        reject(new Error('网络连接失败'));
      });

      // 中止
      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'));
      });

      // 设置请求头
      xhr.open('POST', this.baseURL + path);
      if (this.token) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + this.token);
      }

      xhr.send(formData);
    });
  }

  /**
   * 批量上传
   * @param {string} path - 上传路径
   * @param {File[]} files - 文件数组
   * @param {Function} onProgress - 总进度回调
   * @returns {Promise<Object[]>}
   */
  async uploadBatch(path, files, onProgress) {
    const results = [];
    const total = files.length;
    let completed = 0;

    for (const file of files) {
      const result = await this.upload(path, file, (percent) => {
        // 计算总进度
        if (onProgress) {
          const totalPercent = Math.round(((completed + percent / 100) / total) * 100);
          onProgress(totalPercent);
        }
      });
      results.push(result);
      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / total) * 100));
      }
    }

    return results;
  }
}

// 创建默认 API 实例
const API_BASE = '/api';
const api = new ApiClient(API_BASE);
window.NovaApi = api;

// ==================== 认证 API ====================
window.NovaAuth = {
  /**
   * 用户登录
   */
  login: (username, password) => api.post('/auth/login', { username, password }),

  /**
   * 刷新 token
   */
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),

  /**
   * 退出登录
   */
  logout: () => api.post('/auth/logout'),

  /**
   * 获取当前用户信息
   */
  me: () => api.get('/auth/me'),

  /**
   * 修改密码
   */
  changePassword: (data) => api.put('/auth/password', data)
};

// ==================== 文章 API ====================
window.NovaPosts = {
  /**
   * 获取文章列表
   */
  list: (params) => api.get('/admin/posts', params),

  /**
   * 获取文章详情
   */
  get: (id) => api.get(`/admin/posts/${id}`),

  /**
   * 创建文章
   */
  create: (data) => api.post('/admin/posts', data),

  /**
   * 更新文章
   */
  update: (id, data) => api.put(`/admin/posts/${id}`, data),

  /**
   * 删除文章
   */
  delete: (id) => api.delete(`/admin/posts/${id}`),

  /**
   * 修改文章状态
   */
  changeStatus: (id, status) => api.patch(`/admin/posts/${id}/status`, { status }),

  /**
   * 切换文章置顶
   */
  togglePin: (id) => api.patch(`/admin/posts/${id}/pin`)
};

// ==================== 分类 API ====================
window.NovaCategories = {
  list: () => api.get('/admin/categories'),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`)
};

// ==================== 标签 API ====================
window.NovaTags = {
  list: () => api.get('/admin/tags'),
  create: (data) => api.post('/admin/tags', data),
  update: (id, data) => api.put(`/admin/tags/${id}`, data),
  delete: (id) => api.delete(`/admin/tags/${id}`)
};

// ==================== 附件 API ====================
window.NovaAttachments = {
  list: (params) => api.get('/admin/attachments', params),
  upload: (file, onProgress) => api.upload('/admin/attachments/upload', file, onProgress),
  uploadBatch: (files, onProgress) => api.uploadBatch('/admin/attachments/batch-upload', files, onProgress),
  delete: (id) => api.delete(`/admin/attachments/${id}`),
  update: (id, data) => api.patch(`/admin/attachments/${id}`, data)
};

// ==================== 设置 API ====================
window.NovaSettings = {
  get: () => api.get('/admin/settings'),
  update: (data) => api.put('/admin/settings', data)
};

// ==================== 统计 API ====================
window.NovaStats = {
  overview: () => api.get('/admin/stats/overview')
};

// ==================== 公开 API ====================
window.NovaPublic = {
  posts: (params) => api.get('/public/posts', params),
  post: (slug) => api.get(`/public/posts/${slug}`),
  categories: () => api.get('/public/categories'),
  categoryPosts: (slug, params) => api.get(`/public/categories/${slug}/posts`, params),
  tags: () => api.get('/public/tags'),
  tagPosts: (slug, params) => api.get(`/public/tags/${slug}/posts`, params),
  search: (keyword) => api.get('/public/search', { keyword }),
  archive: () => api.get('/public/archive'),
  rss: () => api.get('/public/rss'),
  sitemap: () => api.get('/public/sitemap'),
  siteSettings: () => api.get('/public/settings')
};

/**
 * Nova Blog - SPA 路由系统
 * 基于 History API 的客户端路由
 */

class Router {
  constructor() {
    // 路由表
    this.routes = [];
    // 路由守卫
    this.beforeGuards = [];
    this.afterGuards = [];
    // 渲染容器
    this.container = null;
    // 当前路由信息
    this.currentRoute = null;
    this.currentParams = {};
    this.currentQuery = {};
  }

  /**
   * 注册路由
   * @param {string} path - 路由路径（支持 :param 动态参数）
   * @param {Function} handler - 路由处理函数
   * @param {Object} meta - 路由元信息
   */
  addRoute(path, handler, meta = {}) {
    const paramNames = [];

    if (path === '*') {
      this.routes.push({
        path,
        regex: null,
        paramNames: [],
        handler,
        meta,
        isWildcard: true
      });
      return;
    }

    const regexPath = path.replace(/:(\w+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp('^' + regexPath + '$');

    this.routes.push({
      path,
      regex,
      paramNames,
      handler,
      meta
    });
  }

  /**
   * 批量注册路由
   * @param {Array} routes - 路由配置数组
   */
  addRoutes(routes) {
    for (const route of routes) {
      this.addRoute(route.path, route.handler, route.meta || {});
    }
  }

  /**
   * 设置渲染容器
   * @param {string} selector - CSS 选择器
   */
  setContainer(selector) {
    this.container = document.querySelector(selector);
    if (!this.container) {
      console.error('[Router] 找不到容器元素:', selector);
    }
  }

  /**
   * 编程式导航
   * @param {string} path - 目标路径
   * @param {Object} options - 导航选项
   * @param {boolean} options.replace - 是否替换当前历史记录
   */
  navigate(path, options = {}) {
    // 执行前置守卫
    for (const guard of this.beforeGuards) {
      const result = guard(this.currentRoute, { path, meta: {} });
      if (result === false) {
        return; // 守卫拒绝导航
      }
      if (typeof result === 'string') {
        path = result; // 守卫重定向
        break;
      }
    }

    // 更新浏览器历史
    if (options.replace) {
      history.replaceState(null, '', path);
    } else {
      history.pushState(null, '', path);
    }

    // 解析并执行路由
    this._handleRoute(path);
  }

  /**
   * 路径匹配与参数提取
   * @param {string} path - 请求路径
   * @returns {Object|null} 匹配的路由信息
   */
  resolve(path) {
    // 移除查询字符串
    const [pathname, search] = path.split('?');

    // 解析查询参数
    const query = {};
    if (search) {
      const params = new URLSearchParams(search);
      for (const [key, value] of params.entries()) {
        query[key] = value;
      }
    }

    // 遍历路由表进行匹配
    for (const route of this.routes) {
      if (route.isWildcard) {
        return {
          route,
          params: {},
          query,
          path: pathname
        };
      }

      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });

        return {
          route,
          params,
          query,
          path: pathname
        };
      }
    }

    return null;
  }

  /**
   * 注册前置守卫
   * @param {Function} guard - 守卫函数 (to, from) => boolean | string | undefined
   */
  beforeEach(guard) {
    this.beforeGuards.push(guard);
  }

  /**
   * 注册后置守卫
   * @param {Function} guard - 守卫函数 (to, from) => void
   */
  afterEach(guard) {
    this.afterGuards.push(guard);
  }

  /**
   * 启动路由系统
   */
  start() {
    // 拦截链接点击
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');

      // 忽略外部链接、锚点、特殊协议
      if (!href ||
          href.startsWith('http') ||
          href.startsWith('//') ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          link.target === '_blank' ||
          e.ctrlKey || e.metaKey || e.shiftKey) {
        return;
      }

      // 阻止默认行为并导航
      e.preventDefault();
      this.navigate(href);
    });

    // 监听浏览器前进/后退
    window.addEventListener('popstate', () => {
      this._handleRoute(location.pathname + location.search);
    });

    // 加载初始路由
    this._handleRoute(location.pathname + location.search);
  }

  /**
   * 获取当前路由参数
   * @returns {Object} 路由参数
   */
  getParams() {
    return { ...this.currentParams };
  }

  /**
   * 获取查询参数
   * @returns {Object} 查询参数
   */
  getQuery() {
    return { ...this.currentQuery };
  }

  /**
   * 后退
   */
  back() {
    history.back();
  }

  /**
   * 内部路由处理
   * @private
   */
  async _handleRoute(path) {
    const resolved = this.resolve(path);

    if (!resolved) {
      // 404 处理 - 查找通配符路由
      const notFoundRoute = this.routes.find(r => r.path === '*');
      if (notFoundRoute) {
        this.currentRoute = { path: '*', meta: notFoundRoute.meta };
        this.currentParams = {};
        this.currentQuery = {};
        await this._render(notFoundRoute.handler, {}, {});
      }
      return;
    }

    const { route, params, query } = resolved;
    const from = this.currentRoute;
    const to = { path: resolved.path, meta: route.meta, params, query };

    // 执行前置守卫
    for (const guard of this.beforeGuards) {
      const result = guard(to, from);
      if (result === false) {
        return;
      }
      if (typeof result === 'string') {
        this.navigate(result, { replace: true });
        return;
      }
    }

    // 更新当前路由状态
    this.currentRoute = to;
    this.currentParams = params;
    this.currentQuery = query;

    // 渲染页面
    await this._render(route.handler, params, query);

    // 执行后置守卫
    for (const guard of this.afterGuards) {
      try {
        guard(to, from);
      } catch (err) {
        console.error('[Router] 后置守卫执行错误:', err);
      }
    }
  }

  /**
   * 渲染页面
   * @private
   */
  async _render(handler, params, query) {
    if (!this.container) {
      console.error('[Router] 渲染容器未设置');
      return;
    }

    try {
      // 执行路由处理函数
      const html = await handler(params, query);

      if (typeof html === 'string') {
        // 添加路由切换动画
        this.container.style.animation = 'route-leave-fade 0.15s ease forwards';

        await new Promise(resolve => {
          setTimeout(resolve, 150);
        });

        this.container.innerHTML = html;
        this.container.setAttribute('data-rendered', 'true');
        this.container.style.animation = 'route-enter-fade 0.3s ease forwards';

        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } catch (err) {
      console.error('[Router] 渲染错误:', err);
      this.container.innerHTML = `
        <div class="not-found-page">
          <div class="not-found-code">500</div>
          <p class="not-found-text">页面渲染出错</p>
          <button class="btn btn-primary" onclick="location.reload()">刷新页面</button>
        </div>
      `;
    }
  }
}

// 创建全局单例并导出
const router = new Router();
window.NovaRouter = router;

/**
 * Nova Blog - 工具函数集合
 * 提供全局可复用的工具方法
 */

const NovaHelpers = (() => {
  'use strict';

  /**
   * 防抖函数
   * @param {Function} fn - 需要防抖的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  function debounce(fn, delay = 300) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }

  /**
   * 节流函数
   * @param {Function} fn - 需要节流的函数
   * @param {number} limit - 间隔时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  function throttle(fn, limit = 300) {
    let inThrottle = false;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * 显示 Toast 通知
   * @param {string} message - 通知消息
   * @param {string} type - 通知类型：success, error, warning, info
   * @param {number} duration - 显示时长（毫秒）
   */
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // 自动消失
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  /**
   * 显示确认对话框
   * @param {string} message - 确认消息
   * @param {Function} onConfirm - 确认回调
   * @param {string} title - 对话框标题
   */
  function showConfirm(message, onConfirm, title = '确认操作') {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" id="confirm-cancel">取消</button>
          <button class="btn btn-danger" id="confirm-ok">确认</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 绑定事件
    const close = () => {
      document.body.removeChild(overlay);
    };

    overlay.querySelector('#confirm-cancel').addEventListener('click', close);
    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
      close();
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  /**
   * 日期格式化
   * @param {string} dateStr - 日期字符串
   * @param {string} format - 格式模板（YYYY-MM-DD HH:mm:ss）
   * @returns {string} 格式化后的日期
   */
  function formatDate(dateStr, format = 'YYYY-MM-DD') {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 生成 URL 友好的 Slug
   * @param {string} title - 标题文本
   * @returns {string} Slug 字符串
   */
  function generateSlug(title) {
    if (!title) return '';

    // 中文标题使用拼音或直接编码
    return title
      .toLowerCase()
      .trim()
      // 移除特殊字符
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
      // 将空格和连续短横线替换为单个短横线
      .replace(/[\s_]+/g, '-')
      // 移除首尾短横线
      .replace(/^-+|-+$/g, '')
      // 对中文字符进行编码
      .replace(/[\u4e00-\u9fa5]/g, (match) => {
        return encodeURIComponent(match);
      });
  }

  /**
   * 复制文本到剪贴板
   * @param {string} text - 要复制的文本
   * @returns {Promise<boolean>} 是否成功
   */
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板', 'success');
        return true;
      }

      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('已复制到剪贴板', 'success');
      return true;
    } catch {
      showToast('复制失败', 'error');
      return false;
    }
  }

  /**
   * 初始化滚动动画（IntersectionObserver）
   */
  function initScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    // 观察所有带 data-animate 属性的元素
    document.querySelectorAll('[data-animate]').forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });

    // 添加 animate-in 样式
    const style = document.createElement('style');
    style.textContent = `
      .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 初始化 Header 滚动毛玻璃效果
   */
  function initHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;

    const handleScroll = throttle(() => {
      if (window.scrollY > 50) {
        header.classList.add('header-glass');
      } else {
        header.classList.remove('header-glass');
      }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * 初始化 Canvas 粒子网络动画
   * @param {HTMLCanvasElement} canvas - Canvas 元素
   */
  function initParticles(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId = null;
    let particles = [];

    // 粒子数量
    const PARTICLE_COUNT = 80;
    // 连线距离
    const LINK_DISTANCE = 150;
    // 鼠标交互距离
    const MOUSE_DISTANCE = 200;

    let mouse = { x: null, y: null };

    // 调整画布尺寸
    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    // 创建粒子
    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      };
    }

    // 初始化粒子
    function initParticleArray() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
      }
    }

    // 绘制帧
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新和绘制粒子
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 更新位置
        p.x += p.vx;
        p.y += p.vy;

        // 边界反弹
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // 绘制粒子
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(108, 92, 231, ${p.opacity})`;
        ctx.fill();

        // 粒子间连线
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < LINK_DISTANCE) {
            const opacity = (1 - dist / LINK_DISTANCE) * 0.3;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(108, 92, 231, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // 鼠标交互连线
        if (mouse.x !== null && mouse.y !== null) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_DISTANCE) {
            const opacity = (1 - dist / MOUSE_DISTANCE) * 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(0, 245, 212, ${opacity})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    // 鼠标事件
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });

    // 窗口大小变化
    window.addEventListener('resize', debounce(() => {
      resize();
    }, 200));

    // 启动动画
    resize();
    initParticleArray();
    draw();

    // 返回销毁函数
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * 初始化主题切换
   */
  function initThemeToggle() {
    const store = window.NovaStore;
    const theme = store.getState('theme');

    // 应用主题
    document.documentElement.setAttribute('data-theme', theme);

    // 监听主题变化
    store.subscribe('theme', (newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme);
    });
  }

  /**
   * 初始化移动端菜单
   */
  function initMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.header-nav');

    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      nav.classList.toggle('mobile-open');
    });

    // 点击导航链接后关闭菜单
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('mobile-open');
      });
    });
  }

  /**
   * HTML 转义
   * @param {string} str - 需要转义的字符串
   * @returns {string} 转义后的安全字符串
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 文件大小格式化
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取相对时间
   * @param {string} dateStr - 日期字符串
   * @returns {string} 相对时间描述
   */
  function getTimeAgo(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return years + ' 年前';
    if (months > 0) return months + ' 个月前';
    if (days > 0) return days + ' 天前';
    if (hours > 0) return hours + ' 小时前';
    if (minutes > 0) return minutes + ' 分钟前';
    return '刚刚';
  }

  // 暴露到全局
  return {
    debounce,
    throttle,
    showToast,
    showConfirm,
    formatDate,
    generateSlug,
    copyToClipboard,
    initScrollAnimations,
    initHeaderScroll,
    initParticles,
    initThemeToggle,
    initMobileMenu,
    escapeHtml,
    formatBytes,
    getTimeAgo
  };
})();

// 挂载到全局
window.NovaHelpers = NovaHelpers;

/**
 * Nova Blog - Markdown 编辑器组件
 * 支持实时预览、工具栏操作、分屏拖拽
 */

class MarkdownEditor {
  /**
   * 构造函数
   * @param {HTMLElement} container - 编辑器容器元素
   * @param {Object} options - 配置选项
   * @param {string} options.initialContent - 初始内容
   * @param {Function} options.onChange - 内容变化回调
   * @param {boolean} options.showPreview - 是否显示预览
   * @param {Function} options.onImageUpload - 图片上传回调
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      initialContent: '',
      showPreview: true,
      onChange: null,
      onImageUpload: null,
      ...options
    };

    this.content = this.options.initialContent;
    this.textarea = null;
    this.previewPane = null;
    this.divider = null;
    this.isDragging = false;
    this._debouncedInput = null;
  }

  /**
   * 初始化编辑器
   */
  init() {
    // 配置 marked.js
    this._configureMarked();

    // 渲染编辑器 UI
    this.container.innerHTML = this._renderTemplate();

    // 获取 DOM 引用
    this.textarea = this.container.querySelector('.editor-textarea');
    this.previewPane = this.container.querySelector('.editor-preview');
    this.divider = this.container.querySelector('.editor-divider');

    // 绑定事件
    this._bindEvents();

    // 设置初始内容
    if (this.content) {
      this.textarea.value = this.content;
      this._updatePreview();
    }

    return this;
  }

  /**
   * 配置 marked.js 和 highlight.js
   * @private
   */
  _configureMarked() {
    if (typeof marked === 'undefined') return;

    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight: function (code, lang) {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch {
            // 高亮失败时返回原文
          }
        }
        if (typeof hljs !== 'undefined') {
          try {
            return hljs.highlightAuto(code).value;
          } catch {
            // 自动高亮失败时返回原文
          }
        }
        return code;
      }
    });
  }

  /**
   * 渲染编辑器模板
   * @private
   * @returns {string} HTML 模板
   */
  _renderTemplate() {
    return `
      <div class="editor-toolbar">
        <button class="editor-toolbar-btn" data-action="bold" title="粗体 (Ctrl+B)">B</button>
        <button class="editor-toolbar-btn" data-action="italic" title="斜体 (Ctrl+I)">I</button>
        <button class="editor-toolbar-btn" data-action="strikethrough" title="删除线">S</button>
        <div class="editor-toolbar-separator"></div>
        <button class="editor-toolbar-btn" data-action="h1" title="标题1">H1</button>
        <button class="editor-toolbar-btn" data-action="h2" title="标题2">H2</button>
        <button class="editor-toolbar-btn" data-action="h3" title="标题3">H3</button>
        <div class="editor-toolbar-separator"></div>
        <button class="editor-toolbar-btn" data-action="ul" title="无序列表">&#8226;</button>
        <button class="editor-toolbar-btn" data-action="ol" title="有序列表">1.</button>
        <button class="editor-toolbar-btn" data-action="quote" title="引用">&#8250;</button>
        <div class="editor-toolbar-separator"></div>
        <button class="editor-toolbar-btn" data-action="link" title="链接">&#128279;</button>
        <button class="editor-toolbar-btn" data-action="image" title="图片">&#128247;</button>
        <button class="editor-toolbar-btn" data-action="code" title="行内代码">&lt;/&gt;</button>
        <button class="editor-toolbar-btn" data-action="codeblock" title="代码块">{ }</button>
        <button class="editor-toolbar-btn" data-action="table" title="表格">&#9638;</button>
        <button class="editor-toolbar-btn" data-action="hr" title="分割线">&#8213;</button>
      </div>
      <div class="editor-content">
        <div class="editor-pane">
          <textarea class="editor-textarea" placeholder="在此输入 Markdown 内容..."></textarea>
        </div>
        ${this.options.showPreview ? `
          <div class="editor-divider"></div>
          <div class="editor-pane">
            <div class="editor-preview post-content"></div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 防抖输入处理
    this._debouncedInput = NovaHelpers.debounce(() => this._onInput(), 300);

    // 文本输入
    this.textarea.addEventListener('input', this._debouncedInput);

    // 工具栏按钮
    this.container.querySelectorAll('.editor-toolbar-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        if (action) {
          this._executeAction(action);
        }
      });
    });

    // 键盘快捷键
    this.textarea.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + B: 粗体
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this._executeAction('bold');
      }
      // Ctrl/Cmd + I: 斜体
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        this._executeAction('italic');
      }
      // Ctrl/Cmd + K: 链接
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this._executeAction('link');
      }
      // Tab: 缩进
      if (e.key === 'Tab') {
        e.preventDefault();
        this._wrapSelection('  ', '');
      }
    });

    // 分屏拖拽
    if (this.divider) {
      this._initDivider();
    }
  }

  /**
   * 输入处理
   * @private
   */
  _onInput() {
    this.content = this.textarea.value;
    this._updatePreview();

    // 触发 onChange 回调
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(this.content);
    }
  }

  /**
   * 更新预览
   * @private
   */
  _updatePreview() {
    if (!this.previewPane || typeof marked === 'undefined') return;

    try {
      this.previewPane.innerHTML = marked.parse(this.content);
    } catch (err) {
      this.previewPane.innerHTML = '<p style="color: var(--color-danger);">预览渲染出错</p>';
    }

    // 代码高亮
    if (typeof hljs !== 'undefined') {
      this.previewPane.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }

  /**
   * 执行工具栏动作
   * @private
   * @param {string} action - 动作名称
   */
  _executeAction(action) {
    this.textarea.focus();

    const actions = {
      bold: () => this._wrapSelection('**', '**'),
      italic: () => this._wrapSelection('*', '*'),
      strikethrough: () => this._wrapSelection('~~', '~~'),
      h1: () => this._prependLine('# '),
      h2: () => this._prependLine('## '),
      h3: () => this._prependLine('### '),
      ul: () => this._prependLine('- '),
      ol: () => this._prependLine('1. '),
      quote: () => this._prependLine('> '),
      link: () => this._insertLink(),
      image: () => this._insertImage(),
      code: () => this._wrapSelection('`', '`'),
      codeblock: () => this._insertCodeBlock(),
      table: () => this._insertTable(),
      hr: () => this._prependLine('\n---\n')
    };

    if (actions[action]) {
      actions[action]();
    }
  }

  /**
   * 包裹选中文本
   * @private
   * @param {string} before - 前缀
   * @param {string} after - 后缀
   */
  _wrapSelection(before, after) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);
    const replacement = before + (selectedText || '文本') + after;

    this.textarea.setRangeText(replacement, start, end, 'select');

    // 如果没有选中文本，将光标放在包裹文本内
    if (!selectedText) {
      this.textarea.selectionStart = start + before.length;
      this.textarea.selectionEnd = start + before.length + (selectedText || '文本').length;
    }

    this._onInput();
  }

  /**
   * 行首插入
   * @private
   * @param {string} prefix - 行首前缀
   */
  _prependLine(prefix) {
    const start = this.textarea.selectionStart;
    const value = this.textarea.value;

    // 找到当前行的起始位置
    let lineStart = value.lastIndexOf('\n', start - 1) + 1;

    // 在行首插入前缀
    this.textarea.setRangeText(prefix, lineStart, lineStart, 'end');

    this._onInput();
  }

  /**
   * 插入链接
   * @private
   */
  _insertLink() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);

    if (selectedText) {
      // 如果有选中文本，将其作为链接文字
      this._wrapSelection('[', '](url)');
    } else {
      // 没有选中文本，插入完整链接
      const link = '[链接文字](url)';
      this.textarea.setRangeText(link, start, end, 'select');
      this.textarea.selectionStart = start + 1;
      this.textarea.selectionEnd = start + 5;
    }

    this._onInput();
  }

  /**
   * 插入图片
   * @private
   */
  _insertImage() {
    // 如果有自定义图片上传回调
    if (typeof this.options.onImageUpload === 'function') {
      this.options.onImageUpload();
      return;
    }

    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const image = '![图片描述](url)';
    this.textarea.setRangeText(image, start, end, 'select');
    this.textarea.selectionStart = start + 2;
    this.textarea.selectionEnd = start + 6;
    this._onInput();
  }

  /**
   * 插入代码块
   * @private
   */
  _insertCodeBlock() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selectedText = this.textarea.value.substring(start, end);
    const codeBlock = '\n```javascript\n' + (selectedText || '// 代码') + '\n```\n';

    this.textarea.setRangeText(codeBlock, start, end, 'end');
    this._onInput();
  }

  /**
   * 插入表格
   * @private
   */
  _insertTable() {
    const start = this.textarea.selectionStart;
    const table = '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n';

    this.textarea.setRangeText(table, start, start, 'end');
    this._onInput();
  }

  /**
   * 初始化分屏拖拽
   * @private
   */
  _initDivider() {
    const content = this.container.querySelector('.editor-content');
    const panes = content.querySelectorAll('.editor-pane');

    if (panes.length < 2) return;

    const leftPane = panes[0];
    const rightPane = panes[1];

    const onMouseDown = (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e) => {
      if (!this.isDragging) return;

      const rect = content.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const totalWidth = rect.width;
      const percent = Math.max(20, Math.min(80, (x / totalWidth) * 100));

      leftPane.style.flex = `0 0 ${percent}%`;
      rightPane.style.flex = `0 0 ${100 - percent}%`;
    };

    const onMouseUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.divider.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    this.divider.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // 触摸支持
    this.divider.addEventListener('touchstart', (e) => {
      onMouseDown(e.touches[0]);
    });
    document.addEventListener('touchmove', (e) => {
      onMouseMove(e.touches[0]);
    });
    document.addEventListener('touchend', onMouseUp);
  }

  /**
   * 外部插入图片
   * @param {string} url - 图片 URL
   * @param {string} alt - 图片描述
   */
  insertImage(url, alt = '图片') {
    if (!this.textarea) return;

    const start = this.textarea.selectionStart;
    const image = `![${alt}](${url})`;

    this.textarea.setRangeText(image, start, start, 'end');
    this._onInput();
  }

  /**
   * 获取编辑器内容
   * @returns {string} Markdown 内容
   */
  getContent() {
    return this.content;
  }

  /**
   * 设置编辑器内容
   * @param {string} content - Markdown 内容
   */
  setContent(content) {
    this.content = content;
    if (this.textarea) {
      this.textarea.value = content;
      this._updatePreview();
    }
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.textarea = null;
    this.previewPane = null;
    this.divider = null;
  }
}

// 挂载到全局
window.MarkdownEditor = MarkdownEditor;

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

/**
 * Nova Blog - 应用入口
 * 初始化 Store、Router，注册路由和守卫，启动应用
 */

(function () {
  'use strict';

  try {

  const store = window.NovaStore;
  const router = window.NovaRouter;
  const api = window.NovaApi;
  const H = window.NovaHelpers;
  const Front = window.NovaFront;
  const Admin = window.NovaAdmin;

  if (!store || !router || !api || !H || !Front || !Admin) {
    throw new Error('核心模块加载失败: store=' + !!store + ' router=' + !!router + ' api=' + !!api + ' helpers=' + !!H + ' front=' + !!Front + ' admin=' + !!Admin);
  }

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
            await window.NovaAuth.logout();
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
          await window.NovaCategories.create({
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
          await window.NovaTags.create({
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
        await window.NovaSettings.update(data);
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
        const result = await window.NovaAuth.login(username, password);
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
        await window.NovaPosts.update(editingSlug, postData);
        H.showToast('文章已更新', 'success');
      } else {
        await window.NovaPosts.create(postData);
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
      await window.NovaAttachments.uploadBatch(files, (percent) => {
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
        await window.NovaPosts.delete(id);
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
        await window.NovaCategories.delete(id);
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
        await window.NovaTags.delete(id);
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
        await window.NovaAttachments.delete(id);
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

  } catch (err) {
    console.error('[Nova Blog] 初始化失败:', err);
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:#EAEAFF;font-family:sans-serif;text-align:center;padding:20px;"><div><h1 style="font-size:48px;background:linear-gradient(135deg,#6C5CE7,#00F5D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Nova Blog</h1><p style="color:#9D9DBF;margin:16px 0;">系统初始化失败</p><p style="color:#6C6C8A;font-size:14px;max-width:400px;">' + err.message + '</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:linear-gradient(135deg,#6C5CE7,#A29BFE);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;">重新加载</button></div></div>';
    }
  }
})();
