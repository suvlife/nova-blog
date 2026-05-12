/**
 * Nova Blog - 轻量级状态管理
 * 基于发布订阅模式的响应式状态管理
 */

class Store {
  constructor(initialState = {}) {
    this._state = { ...initialState };
    this._subscribers = new Map();
    this._computed = new Map();
    this._middleware = [];
  }

  /**
   * 获取状态
   */
  getState(path) {
    if (!path) return { ...this._state };

    return path.split('.').reduce((obj, key) => {
      return obj?.[key];
    }, this._state);
  }

  /**
   * 设置状态
   */
  setState(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this._state;

    for (const key of keys) {
      if (!(key in target)) target[key] = {};
      target = target[key];
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;

    // 执行中间件
    this._middleware.forEach(mw => mw(path, value, oldValue));

    // 通知订阅者
    this._notify(path, value, oldValue);

    return this;
  }

  /**
   * 批量更新状态
   */
  batchUpdate(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      this.setState(path, value);
    });
    return this;
  }

  /**
   * 订阅状态变化
   */
  subscribe(path, callback) {
    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, new Set());
    }
    this._subscribers.get(path).add(callback);

    // 返回取消订阅函数
    return () => {
      const subs = this._subscribers.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this._subscribers.delete(path);
      }
    };
  }

  /**
   * 通知订阅者
   */
  _notify(path, newValue, oldValue) {
    // 通知精确路径的订阅者
    const subs = this._subscribers.get(path);
    if (subs) {
      subs.forEach(cb => cb(newValue, oldValue, path));
    }

    // 通知父路径的订阅者
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentSubs = this._subscribers.get(parentPath);
      if (parentSubs) {
        parentSubs.forEach(cb => cb(this.getState(parentPath), null, parentPath));
      }
    }

    // 通知全局订阅者
    const globalSubs = this._subscribers.get('*');
    if (globalSubs) {
      globalSubs.forEach(cb => cb(this._state, null, '*'));
    }
  }

  /**
   * 注册中间件
   */
  use(middleware) {
    this._middleware.push(middleware);
    return this;
  }

  /**
   * 持久化到 localStorage
   */
  persist(keys = []) {
    // 加载已保存的状态
    keys.forEach(key => {
      const saved = localStorage.getItem(`nova_store_${key}`);
      if (saved) {
        try {
          this.setState(key, JSON.parse(saved));
        } catch (e) {
          console.warn(`Failed to restore state for ${key}:`, e);
        }
      }
    });

    // 监听变化并保存
    keys.forEach(key => {
      this.subscribe(key, (value) => {
        try {
          localStorage.setItem(`nova_store_${key}`, JSON.stringify(value));
        } catch (e) {
          console.warn(`Failed to persist state for ${key}:`, e);
        }
      });
    });

    return this;
  }
}

// 创建全局 Store 实例
const store = new Store({
  // 用户认证状态
  auth: {
    isAuthenticated: false,
    user: null,
    token: null,
  },
  // 站点配置
  site: {
    name: 'Nova Blog',
    description: '',
    logo: '',
    theme: 'dark',
  },
  // 文章列表缓存
  posts: {
    list: [],
    total: 0,
    page: 1,
    loading: false,
  },
  // 当前文章
  currentPost: null,
  // 分类标签
  categories: [],
  tags: [],
  // 后台侧边栏状态
  admin: {
    sidebarCollapsed: false,
    activeMenu: '',
  },
  // UI 状态
  ui: {
    loading: false,
    notification: null,
    modal: null,
  },
});

// 持久化关键状态
store.persist(['auth', 'site', 'admin']);
