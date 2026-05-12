/**
 * Nova Blog - 通用工具函数
 */

/**
 * 防抖
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流
 */
function throttle(fn, interval = 200) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Toast 通知
 */
function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span style="font-size:18px;">${icons[type] || icons.info}</span>
    <span style="flex:1;">${message}</span>
    <button style="color:var(--text-tertiary);font-size:18px;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * 确认对话框
 */
function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal__header">
          <h3 class="modal__title">确认操作</h3>
        </div>
        <p style="color:var(--text-secondary);margin-bottom:var(--space-xl);">${message}</p>
        <div class="modal__footer">
          <button class="btn btn--ghost" id="confirm-cancel">取消</button>
          <button class="btn btn--danger" id="confirm-ok">确认</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-cancel').onclick = () => {
      overlay.remove();
      resolve(false);
    };
    overlay.querySelector('#confirm-ok').onclick = () => {
      overlay.remove();
      resolve(true);
    };
  });
}

/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const map = {
    'YYYY': d.getFullYear(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0'),
  };

  let result = format;
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(key, value);
  }
  return result;
}

/**
 * 生成 Slug
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || Date.now().toString(36);
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制到剪贴板', 'success');
  }
}

/**
 * Intersection Observer - 元素进入视口时触发动画
 */
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('[data-animate]').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// 监听路由变化后初始化动画
window.addEventListener('routeChanged', () => {
  setTimeout(initScrollAnimations, 100);
});

/**
 * Header 滚动效果
 */
function initHeaderScroll() {
  const header = document.getElementById('header');
  if (!header) return;

  const onScroll = throttle(() => {
    if (window.scrollY > 50) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  }, 100);

  window.addEventListener('scroll', onScroll, { passive: true });
}

/**
 * 粒子背景动画
 */
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  resize();
  window.addEventListener('resize', debounce(resize, 250));

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108, 92, 231, ${this.opacity})`;
      ctx.fill();
    }
  }

  // 创建粒子
  const count = Math.min(80, Math.floor(canvas.width * canvas.height / 15000));
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(108, 92, 231, ${0.1 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    drawConnections();
    animationId = requestAnimationFrame(animate);
  }

  animate();

  // 页面离开时停止动画
  window.addEventListener('routeChanged', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
}

/**
 * 主题切换
 */
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const saved = localStorage.getItem('nova_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nova_theme', next);
  });
}

/**
 * 移动端菜单
 */
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');
  const closeBtn = document.getElementById('mobile-menu-close');

  if (!btn || !menu) return;

  const open = () => {
    menu.classList.add('mobile-menu--open');
    if (overlay) overlay.classList.add('mobile-menu__overlay--visible');
  };

  const close = () => {
    menu.classList.remove('mobile-menu--open');
    if (overlay) overlay.classList.remove('mobile-menu__overlay--visible');
  };

  btn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', close);
}

/**
 * 后台侧边栏折叠
 */
function initAdminSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('admin-sidebar--collapsed');
    const collapsed = sidebar.classList.contains('admin-sidebar--collapsed');
    localStorage.setItem('nova_admin_sidebar_collapsed', collapsed);
  });

  // 恢复状态
  const saved = localStorage.getItem('nova_admin_sidebar_collapsed');
  if (saved === 'true') {
    sidebar.classList.add('admin-sidebar--collapsed');
  }
}

/**
 * 文件上传
 */
function initUploadZone() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('upload-zone--dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('upload-zone--dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('upload-zone--dragover');
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  });

  input.addEventListener('change', () => {
    handleFileUpload(input.files);
  });
}

async function handleFileUpload(files) {
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('upload-progress-text');
  const progressContainer = document.getElementById('upload-progress');

  if (!progressContainer) return;

  progressContainer.style.display = 'block';

  for (const file of files) {
    try {
      await api.uploadFile(file, (percent) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `上传中... ${percent}%`;
      });
      showToast(`${file.name} 上传成功`, 'success');
    } catch (e) {
      showToast(`${file.name} 上传失败: ${e.message}`, 'error');
    }
  }

  // 刷新媒体列表
  setTimeout(() => router.navigate('/admin/media', { replace: true }), 1000);
}

/**
 * 页面初始化通用逻辑
 */
function initPageCommon() {
  initHeaderScroll();
  initThemeToggle();
  initMobileMenu();
  initScrollAnimations();

  // 路由变化后重新初始化
  window.addEventListener('routeChanged', () => {
    setTimeout(() => {
      initHeaderScroll();
      initThemeToggle();
      initMobileMenu();
      initAdminSidebar();
      initUploadZone();

      // 初始化编辑器
      if (document.getElementById('editor-content')) {
        markdownEditor.init();
      }

      // 初始化粒子
      if (document.getElementById('particles-canvas')) {
        initParticles();
      }
    }, 50);
  });
}
