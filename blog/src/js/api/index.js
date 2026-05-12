/**
 * Nova Blog - API 交互层
 * 与 Cloudflare Workers API 通信的封装
 */

const API_BASE = '/api/v1';

class ApiClient {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('nova_token') || '';
  }

  /**
   * 设置认证令牌
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('nova_token', token);
  }

  /**
   * 清除认证令牌
   */
  clearToken() {
    this.token = '';
    localStorage.removeItem('nova_token');
  }

  /**
   * 通用请求方法
   */
  async request(method, path, data = null, options = {}) {
    const url = `${this.baseURL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      method,
      headers: { ...headers, ...options.headers },
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.clearToken();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new ApiError('认证已过期，请重新登录', 401);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `请求失败: ${response.status}`,
          response.status,
          errorData
        );
      }

      // 处理无内容响应
      if (response.status === 204) return null;

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('网络连接异常，请检查网络设置', 0, error);
    }
  }

  // ============ 文章 API ============

  async getPosts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/posts${query ? '?' + query : ''}`);
  }

  async getPost(slug) {
    return this.request('GET', `/posts/${slug}`);
  }

  async createPost(data) {
    return this.request('POST', '/posts', data);
  }

  async updatePost(slug, data) {
    return this.request('PUT', `/posts/${slug}`, data);
  }

  async deletePost(slug) {
    return this.request('DELETE', `/posts/${slug}`);
  }

  // ============ 分类 API ============

  async getCategories() {
    return this.request('GET', '/categories');
  }

  async createCategory(data) {
    return this.request('POST', '/categories', data);
  }

  async updateCategory(id, data) {
    return this.request('PUT', `/categories/${id}`, data);
  }

  async deleteCategory(id) {
    return this.request('DELETE', `/categories/${id}`);
  }

  // ============ 标签 API ============

  async getTags() {
    return this.request('GET', '/tags');
  }

  async createTag(data) {
    return this.request('POST', '/tags', data);
  }

  async deleteTag(id) {
    return this.request('DELETE', `/tags/${id}`);
  }

  // ============ 附件/媒体 API ============

  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseURL}/media/upload`);

      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new ApiError('响应解析失败', xhr.status));
          }
        } else if (xhr.status === 401) {
          this.clearToken();
          reject(new ApiError('认证已过期', 401));
        } else {
          reject(new ApiError('上传失败', xhr.status));
        }
      };

      xhr.onerror = () => reject(new ApiError('网络连接异常', 0));
      xhr.send(formData);
    });
  }

  async getMedia(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/media${query ? '?' + query : ''}`);
  }

  async deleteMedia(id) {
    return this.request('DELETE', `/media/${id}`);
  }

  // ============ 站点设置 API ============

  async getSettings() {
    return this.request('GET', '/settings');
  }

  async updateSettings(data) {
    return this.request('PUT', '/settings', data);
  }

  // ============ 认证 API ============

  async login(credentials) {
    const data = await this.request('POST', '/auth/login', credentials);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async logout() {
    try {
      await this.request('POST', '/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  // ============ 统计 API ============

  async getStats() {
    return this.request('GET', '/stats');
  }
}

/**
 * API 错误类
 */
class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// 导出单例
const api = new ApiClient();
