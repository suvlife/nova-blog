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
