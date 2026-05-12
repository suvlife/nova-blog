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
