/**
 * Nova Blog - 前端路由系统
 * 基于 History API 的 SPA 路由实现
 * 支持路由参数、嵌套路由、路由守卫、过渡动画
 */

class Router {
  constructor(options = {}) {
    this.routes = [];
    this.currentRoute = null;
    this.previousRoute = null;
    this.guards = { beforeEach: [], afterEach: [] };
    this.container = null;
    this.transitionName = 'fade';
    this.isTransitioning = false;

    this._onPopState = this._onPopState.bind(this);
    window.addEventListener('popstate', this._onPopState);
  }

  /**
   * 注册路由
   * @param {string} path - 路由路径，支持动态参数 :param
   * @param {Function} handler - 路由处理函数，返回 HTML 字符串或 Promise<HTML>
   * @param {Object} meta - 路由元信息
   */
  addRoute(path, handler, meta = {}) {
    const paramNames = [];
    const regexPath = path.replace(/:(\w+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexPath}$`);

    this.routes.push({
      path,
      regex,
      paramNames,
      handler,
      meta,
      name: meta.name || path
    });
    return this;
  }

  /**
   * 批量注册路由
   */
  addRoutes(routes) {
    routes.forEach(route => {
      this.addRoute(route.path, route.handler, route.meta || {});
    });
    return this;
  }

  /**
   * 设置路由容器
   */
  setContainer(selector) {
    this.container = document.querySelector(selector);
    return this;
  }

  /**
   * 注册前置守卫
   */
  beforeEach(guard) {
    this.guards.beforeEach.push(guard);
    return this;
  }

  /**
   * 注册后置守卫
   */
  afterEach(guard) {
    this.guards.afterEach.push(guard);
    return this;
  }

  /**
   * 解析路由，匹配路径并提取参数
   */
  resolve(path) {
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        return { route, params, matched: true };
      }
    }
    return { route: null, params: {}, matched: false };
  }

  /**
   * 导航到指定路径
   */
  async navigate(path, { replace = false, transition = 'fade' } = {}) {
    if (this.isTransitioning) return;

    const resolved = this.resolve(path);
    if (!resolved.matched) {
      // 404 处理
      const notFoundRoute = this.routes.find(r => r.path === '*');
      if (notFoundRoute) {
        resolved.route = notFoundRoute;
        resolved.matched = true;
        resolved.params = {};
      } else {
        console.error(`Route not found: ${path}`);
        return;
      }
    }

    const { route, params } = resolved;
    const to = { path, params, meta: route.meta, name: route.name };
    const from = this.currentRoute
      ? { path: this.currentRoute.path, params: this.currentRoute.params, meta: this.currentRoute.meta, name: this.currentRoute.name }
      : null;

    // 执行前置守卫
    for (const guard of this.guards.beforeEach) {
      const result = await guard(to, from);
      if (result === false) return;
      if (typeof result === 'string') {
        return this.navigate(result, { replace, transition });
      }
    }

    this.previousRoute = this.currentRoute;
    this.currentRoute = { ...to, handler: route.handler };
    this.transitionName = transition;

    // 更新浏览器历史
    if (replace) {
      window.history.replaceState({ path }, '', path);
    } else {
      window.history.pushState({ path }, '', path);
    }

    // 执行页面渲染
    await this._render(route, params);

    // 执行后置守卫
    for (const guard of this.guards.afterEach) {
      await guard(to, from);
    }

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * 渲染页面内容
   */
  async _render(route, params) {
    if (!this.container) {
      console.error('Router container not set. Call setContainer() first.');
      return;
    }

    this.isTransitioning = true;

    // 添加退出动画
    this.container.classList.add(`route-leave-${this.transitionName}`);

    await this._waitForAnimation(this.container, `route-leave-${this.transitionName}`);

    try {
      // 执行路由处理函数
      const html = await route.handler(params);

      // 更新 DOM
      this.container.innerHTML = html;
      this.container.classList.remove(`route-leave-${this.transitionName}`);

      // 添加进入动画
      this.container.classList.add(`route-enter-${this.transitionName}`);

      await this._waitForAnimation(this.container, `route-enter-${this.transitionName}`);
      this.container.classList.remove(`route-enter-${this.transitionName}`);

      // 触发页面加载完成事件
      window.dispatchEvent(new CustomEvent('routeChanged', {
        detail: { route: this.currentRoute, previousRoute: this.previousRoute }
      }));

    } catch (error) {
      console.error('Route render error:', error);
      this.container.innerHTML = `
        <div class="error-page">
          <h1>500</h1>
          <p>页面渲染出错</p>
          <button onclick="router.navigate('/')">返回首页</button>
        </div>
      `;
    }

    this.isTransitioning = false;
  }

  /**
   * 等待动画完成
   */
  _waitForAnimation(element, className) {
    return new Promise(resolve => {
      const handler = (e) => {
        if (e.animationName && e.animationName.includes(this.transitionName)) {
          element.removeEventListener('animationend', handler);
          resolve();
        }
      };
      element.addEventListener('animationend', handler);

      // 超时回退
      setTimeout(() => {
        element.removeEventListener('animationend', handler);
        resolve();
      }, 600);
    });
  }

  /**
   * 监听浏览器前进后退
   */
  _onPopState(event) {
    const path = window.location.pathname;
    this.navigate(path, { replace: true });
  }

  /**
   * 启动路由
   */
  start() {
    // 拦截所有内部链接点击
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

      e.preventDefault();
      this.navigate(href);
    });

    // 加载初始路由
    const path = window.location.pathname;
    this.navigate(path, { replace: true });
  }

  /**
   * 获取当前路由参数
   */
  getParams() {
    return this.currentRoute?.params || {};
  }

  /**
   * 获取当前路由查询参数
   */
  getQuery() {
    const search = window.location.search.substring(1);
    const query = {};
    search.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    return query;
  }

  /**
   * 后退
   */
  back() {
    window.history.back();
  }

  /**
   * 生成路由 URL
   */
  resolveUrl(name, params = {}) {
    const route = this.routes.find(r => r.name === name);
    if (!route) return '/';
    let path = route.path;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    });
    return path;
  }
}

// 导出单例
const router = new Router();
