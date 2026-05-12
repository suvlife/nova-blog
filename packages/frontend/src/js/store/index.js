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
