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
