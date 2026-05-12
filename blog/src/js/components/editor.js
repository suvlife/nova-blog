/**
 * Nova Blog - Markdown 编辑器
 * 基于 marked.js 的实时预览编辑器
 * 支持工具栏快捷操作、分屏预览、代码高亮
 */

class MarkdownEditor {
  constructor(options = {}) {
    this.textarea = null;
    this.preview = null;
    this.toolbar = null;
    this.debounceTimer = null;
    this.debounceDelay = options.debounceDelay || 300;
    this.isSyncing = true;

    this._onInput = this._onInput.bind(this);
    this._onToolbarClick = this._onToolbarClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /**
   * 初始化编辑器
   */
  init() {
    this.textarea = document.getElementById('editor-content');
    this.preview = document.getElementById('editor-preview');
    this.toolbar = document.getElementById('editor-toolbar');

    if (!this.textarea || !this.preview) return;

    // 配置 marked.js
    this._configureMarked();

    // 绑定事件
    this.textarea.addEventListener('input', this._onInput);
    this.textarea.addEventListener('keydown', this._onKeyDown);

    if (this.toolbar) {
      this.toolbar.addEventListener('click', this._onToolbarClick);
    }

    // 初始化预览
    this._updatePreview();

    // 初始化分屏拖拽
    this._initDivider();

    // Tab 键支持
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this._insertAtCursor('  ');
      }
    });
  }

  /**
   * 配置 marked.js
   */
  _configureMarked() {
    if (typeof marked === 'undefined') return;

    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight: (code, lang) => {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) { /* fallback */ }
        }
        if (typeof hljs !== 'undefined') {
          try {
            return hljs.highlightAuto(code).value;
          } catch (e) { /* fallback */ }
        }
        return code;
      }
    });
  }

  /**
   * 输入事件处理（防抖）
   */
  _onInput() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this._updatePreview();
    }, this.debounceDelay);
  }

  /**
   * 更新预览
   */
  _updatePreview() {
    if (!this.preview || !this.textarea) return;

    const content = this.textarea.value;

    if (typeof marked !== 'undefined') {
      this.preview.innerHTML = marked.parse(content);
    } else {
      this.preview.textContent = content;
    }

    // 代码块样式
    this.preview.querySelectorAll('pre code').forEach(block => {
      if (typeof hljs !== 'undefined') {
        hljs.highlightElement(block);
      }
    });
  }

  /**
   * 工具栏点击
   */
  _onToolbarClick(e) {
    const btn = e.target.closest('.editor-toolbar__btn');
    if (!btn) return;

    const action = btn.dataset.action;
    if (!action) return;

    this._executeAction(action);
    this.textarea.focus();
  }

  /**
   * 快捷键
   */
  _onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      this._executeAction('bold');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      this._executeAction('italic');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this._executeAction('link');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      // 触发保存
      window.dispatchEvent(new CustomEvent('editor:save'));
    }
  }

  /**
   * 执行编辑动作
   */
  _executeAction(action) {
    const actions = {
      bold: () => this._wrapSelection('**', '**'),
      italic: () => this._wrapSelection('*', '*'),
      strikethrough: () => this._wrapSelection('~~', '~~'),
      h2: () => this._prependLine('## '),
      h3: () => this._prependLine('### '),
      link: () => this._insertLink(),
      image: () => this._insertImage(),
      code: () => this._wrapSelection('`', '`'),
      codeblock: () => this._insertCodeBlock(),
      quote: () => this._prependLine('> '),
      ul: () => this._prependLine('- '),
      ol: () => this._prependLine('1. '),
      table: () => this._insertTable(),
      hr: () => this._prependLine('\n---\n'),
    };

    if (actions[action]) {
      actions[action]();
      this._updatePreview();
    }
  }

  /**
   * 包裹选中文本
   */
  _wrapSelection(before, after) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selected = this.textarea.value.substring(start, end);
    const replacement = `${before}${selected || '文本'}${after}`;

    this.textarea.setRangeText(replacement, start, end, 'select');
    this.textarea.setSelectionRange(start + before.length, start + before.length + (selected || '文本').length);
  }

  /**
   * 在行首插入
   */
  _prependLine(prefix) {
    const start = this.textarea.selectionStart;
    const value = this.textarea.value;

    // 找到当前行的起始位置
    let lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);

    const newLine = prefix + currentLine;
    this.textarea.setRangeText(newLine, lineStart, lineEnd === -1 ? value.length : lineEnd, 'end');
  }

  /**
   * 在光标处插入文本
   */
  _insertAtCursor(text) {
    const start = this.textarea.selectionStart;
    this.textarea.setRangeText(text, start, start, 'end');
  }

  /**
   * 插入链接
   */
  _insertLink() {
    const selected = this.textarea.value.substring(
      this.textarea.selectionStart,
      this.textarea.selectionEnd
    );
    const linkText = selected || '链接文本';
    const markdown = `[${linkText}](url)`;
    this._insertAtCursor(markdown);
  }

  /**
   * 插入图片
   */
  _insertImage() {
    const markdown = `![图片描述](url)`;
    this._insertAtCursor(markdown);
  }

  /**
   * 插入代码块
   */
  _insertCodeBlock() {
    const selected = this.textarea.value.substring(
      this.textarea.selectionStart,
      this.textarea.selectionEnd
    );
    const code = selected || '// 代码';
    const markdown = `\n\`\`\`javascript\n${code}\n\`\`\`\n`;
    this._insertAtCursor(markdown);
  }

  /**
   * 插入表格
   */
  _insertTable() {
    const table = `
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| 内容 | 内容 | 内容 |
`;
    this._insertAtCursor(table);
  }

  /**
   * 初始化分屏拖拽
   */
  _initDivider() {
    const divider = document.getElementById('editor-divider');
    if (!divider) return;

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    const editorBody = document.getElementById('editor-body');

    if (!editorBody) return;

    const leftPane = editorBody.querySelector('.editor-pane');

    divider.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = leftPane.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const diff = e.clientX - startX;
      const newWidth = startWidth + diff;
      const containerWidth = editorBody.offsetWidth;
      const percent = (newWidth / containerWidth) * 100;

      if (percent > 20 && percent < 80) {
        leftPane.style.flex = 'none';
        leftPane.style.width = `${percent}%`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  /**
   * 获取内容
   */
  getContent() {
    return this.textarea ? this.textarea.value : '';
  }

  /**
   * 设置内容
   */
  setContent(content) {
    if (this.textarea) {
      this.textarea.value = content;
      this._updatePreview();
    }
  }

  /**
   * 在光标处插入图片（供外部调用）
   */
  insertImage(url, alt = '图片') {
    const markdown = `![${alt}](${url})`;
    this._insertAtCursor(markdown);
    this._updatePreview();
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    if (this.textarea) {
      this.textarea.removeEventListener('input', this._onInput);
      this.textarea.removeEventListener('keydown', this._onKeyDown);
    }
    if (this.toolbar) {
      this.toolbar.removeEventListener('click', this._onToolbarClick);
    }
  }
}

// 导出单例
const markdownEditor = new MarkdownEditor();
