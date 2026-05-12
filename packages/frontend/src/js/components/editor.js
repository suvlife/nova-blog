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
