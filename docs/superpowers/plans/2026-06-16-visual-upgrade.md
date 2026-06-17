# 视觉体验层 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为博客添加暗色模式、杂志排版、丰富动效、全屏沉浸式 Banner

**Architecture:** CSS 自定义属性统管全站色彩，`prefers-color-scheme` 自动切换亮暗；JS 驱动视差滚动、打字机效果、滚动触发动画、staggered 入场

**Tech Stack:** 纯 CSS + 原生 JS，零依赖

---

## File Structure

| 文件 | 职责 |
|---|---|
| `css/theme.css` | CSS 变量定义 + 暗色覆盖 + 全站色彩变量化 + Banner 100vh + 视差 CSS |
| `css/content.css` | 杂志排版（首字下沉、引用块、分割线） + 文章色彩变量化 |
| `css/style.css` | 全局组件色彩变量化（滚动条、进度条、音乐按钮等） |
| `js/script.js` | 视差滚动、打字机、staggered 入场、reveal observer、滚动箭头 |

---

### Task 1: theme.css — CSS 变量定义 + 暗色模式覆盖 + 核心元素变量化

**Files:**
- Modify: `css/theme.css`

**Strategy:** 在文件头部（注释区之后、section 一之前）插入 `:root` 变量块和暗色覆盖，然后对关键硬编码颜色进行变量替换。

- [ ] **Step 1: 在 theme.css 注释区之后、section 一之前插入变量定义**

Insert after line 29 (`=================================== */`) and before line 31 (`/* ==== 一、页面基础设置...`):

```css

/* ==============================================
   零、CSS 自定义属性（全站色彩令牌）
   ============================================== */
:root {
  --bg:            #f7f6f3;
  --card-bg:       #ffffff;
  --text:          #334155;
  --heading:       #1e293b;
  --muted:         #94a3b8;
  --muted-heavy:   #64748b;
  --border:        #e8e5e0;
  --border-light:  #f1f0ed;
  --shadow-sm:     0 1px 3px rgba(0,0,0,0.04);
  --shadow-md:     0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --code-bg:       #1e293b;
  --code-text:     #e2e8f0;
  --accent:        #3b82f6;
  --accent-hover:  #2563eb;
  --accent-light:  #eff6ff;
  --accent-soft:   #eef2ff;
  --tag-bg:        #f1f5f9;
  --footer-bg:     #1e293b;
  --footer-text:   #94a3b8;
  --input-bg:      #ffffff;
  --input-border:  #e2e8f0;
  --nav-text:      #ffffff;
  --overlay:       rgba(15,23,42,0.5);
  --selection-bg:  rgba(59,130,246,0.2);
  --scrollbar-track: #f1f0ed;
  --scrollbar-thumb: #cbd5e1;
}

/* 暗色模式：跟随系统偏好自动切换 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg:            #0f172a;
    --card-bg:       #1e293b;
    --text:          #cbd5e1;
    --heading:       #f1f5f9;
    --muted:         #64748b;
    --muted-heavy:   #94a3b8;
    --border:        #334155;
    --border-light:  #1e293b;
    --shadow-sm:     0 1px 3px rgba(0,0,0,0.2);
    --shadow-md:     0 8px 25px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.2);
    --code-bg:       #020617;
    --code-text:     #e2e8f0;
    --accent:        #60a5fa;
    --accent-hover:  #93bbfd;
    --accent-light:  #1e3a5f;
    --accent-soft:   #1e2a4a;
    --tag-bg:        #1e293b;
    --footer-bg:     #020617;
    --footer-text:   #64748b;
    --input-bg:      #1e293b;
    --input-border:  #475569;
    --nav-text:      #e2e8f0;
    --overlay:       rgba(0,0,0,0.7);
    --selection-bg:  rgba(96,165,250,0.3);
    --scrollbar-track: #1e293b;
    --scrollbar-thumb: #475569;
  }
}
```

- [ ] **Step 2: 替换 body 背景和文字色**

Find `background: #f7f6f3;` → `background: var(--bg);`
Find `color: #334155;` in body → `color: var(--text);`

- [ ] **Step 3: 替换卡片相关颜色**

Find `background: #fff;` in `.article-inner` / `.archive-article-inner` / `.widget` / `#comments` / `#page-nav` → `background: var(--card-bg);`

Find `border: 1px solid #e8e5e0;` → `border: 1px solid var(--border);`

Find `box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03);` in `.article-inner` → `box-shadow: var(--shadow-sm);`

Find `.article-inner:hover` box-shadow → `box-shadow: var(--shadow-md);`

- [ ] **Step 4: 替换导航/标题/页脚**

Replace nav colors:
- `#1e293b` → `var(--footer-bg)` (footer, mobile-nav bg)
- `#94a3b8` → `var(--footer-text)` (footer text)
- `#fff` in nav areas → `var(--nav-text)`

Replace heading/title colors:
- `color: #1e293b;` in heading contexts → `color: var(--heading);`

- [ ] **Step 5: 替换其他关键颜色**

- `.article-date` `color: #94a3b8` → `color: var(--muted)`; `background: #eef2ff` → `background: var(--accent-soft)`; `color: #4f46e5` → `color: var(--accent)`
- `.widget-title` / `.article-nav-caption` `color: #94a3b8` → `color: var(--muted)`
- `.widget a` / `.article-footer a` / `.archive-article-date` / `#page-nav a` `color: #64748b` → `color: var(--muted-heavy)`
- `.article-footer` `border-top: 1px solid #f1f0ed` → `border-top: 1px solid var(--border-light)`
- `.widget > ul > li + li` border-color → `var(--border-light)`
- `#page-nav` border-color → `var(--border)`
- `.search-form` border-color → `var(--border)`
- `.tag-list-link` / `.tagcloud a` background → `var(--tag-bg)`; color → `var(--muted-heavy)`
- `.tag-list-link:hover` / `.tagcloud a:hover` background → `var(--accent)`; color → `#fff`
- `.article-share-box` background → `var(--card-bg)`; border → `var(--border)`
- `.article-share-input` border-bottom → `var(--border)`
- `.article-share-links` background → `var(--tag-bg)`
- `#article-nav:before` (dot) background → `var(--border)`
- `.archive-year` color → `var(--muted-heavy)`
- `#wrap` background → `var(--bg)`

- [ ] **Step 6: 替换搜索框颜色**

- `.search-form-input` color → `var(--text)`
- `.search-form` background → `var(--input-bg)`
- `#search-results` background → `var(--input-bg)`; border → `var(--border)`
- `.search-result-item` color → `var(--text)`; border-bottom → `var(--border-light)`
- `.search-result-item:hover` background → `var(--accent-light)`

- [ ] **Step 7: Commit**

```bash
git add css/theme.css
git commit -m "feat: CSS 变量全站色彩系统 + 暗色模式自动切换"
```

---

### Task 2: content.css — 文章区色彩变量化

**Files:**
- Modify: `css/content.css`

Replace all hardcoded `#334155` (text) → `var(--text)`
Replace all hardcoded `#1e293b` (headings/bg) → `var(--heading)` in text contexts, `var(--code-bg)` in code contexts
Replace `#64748b` (muted-heavy) → `var(--muted-heavy)`
Replace `#94a3b8` (muted) → `var(--muted)`
Replace `#3b82f6` (accent) → `var(--accent)`
Replace `#e2e8f0` (borders) → `var(--border)`
Replace `#1e293b` in pre/highlight/gist backgrounds → `var(--code-bg)`
Replace `#e2e8f0` in pre/highlight color → `var(--code-text)`

Key replacements summary (use `replace_all` where possible):
- [ ] `color: #334155` → `color: var(--text)`
- [ ] `color: #1e293b` → `color: var(--heading)`
- [ ] `color: #64748b` → `color: var(--muted-heavy)`
- [ ] `color: #94a3b8` → `color: var(--muted)`
- [ ] `color: #3b82f6` → `color: var(--accent)`
- [ ] `background: #1e293b` → `background: var(--code-bg)`
- [ ] `color: #e2e8f0` → `color: var(--code-text)`
- [ ] `border-bottom: 2px solid #cbd5e1` → `border-bottom: 2px solid var(--scrollbar-thumb)`
- [ ] `border-bottom: 1px solid #e2e8f0` → `border-bottom: 1px solid var(--border)`
- [ ] `background: #f8fafc` → `background: var(--tag-bg)`
- [ ] `color: #475569` → `color: var(--muted-heavy)`
- [ ] `border: 1px dashed #e2e8f0` → `border: 1px dashed var(--border)`
- [ ] `background: #f1f5f9` → `background: var(--tag-bg)`
- [ ] `color: #e11d48` → leave as-is (inline code accent, works in both modes)

- [ ] **Commit**

```bash
git add css/content.css
git commit -m "feat: content.css 文章区色彩变量化，暗色模式适配"
```

---

### Task 3: content.css — 杂志感排版

**Files:**
- Modify: `css/content.css`

- [ ] **Step 1: 首字下沉**

Append to content.css:

```css
/* ==============================================
   十八、杂志排版 — 首字下沉
   ============================================== */
.article-entry > p:first-of-type::first-letter {
  float: left;
  font-size: 3.8em;
  font-weight: 700;
  line-height: 0.75;
  margin-right: 0.12em;
  color: var(--heading);
  font-family: Georgia, 'Times New Roman', serif;
}
/* 首页摘要卡片不启用首字下沉 */
.article-excerpt::first-letter {
  float: none;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  color: inherit;
  font-family: inherit;
}
```

- [ ] **Step 2: 标题装饰线**

```css
/* ==============================================
   十九、杂志排版 — 标题装饰
   ============================================== */
.article-entry h2 {
  display: flex;
  align-items: center;
  gap: 12px;
}
.article-entry h2::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 1.1em;
  background: var(--accent);
  border-radius: 2px;
  flex-shrink: 0;
}
.article-entry h1, .article-entry h2, .article-entry h3 {
  letter-spacing: 0.03em;
}
```

- [ ] **Step 3: 引用块杂志化**

Change blockquote styles — replace the existing `.article-entry blockquote` rules with:

```css
/* 覆盖原 blockquote 样式 */
.article-entry blockquote {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.1em;
  text-align: center;
  border: none;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: transparent;
  padding: 1.5em 2em;
  margin: 2em 0;
  color: var(--muted-heavy);
  position: relative;
  border-radius: 0;
}
.article-entry blockquote::before {
  content: '\201C';
  position: absolute;
  top: -0.3em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 3em;
  color: var(--accent);
  font-family: Georgia, serif;
  line-height: 1;
  background: var(--card-bg);
  padding: 0 0.3em;
}
```

- [ ] **Step 4: 分割线装饰化**

```css
/* ==============================================
   二十、杂志排版 — 装饰分割线
   ============================================== */
.article-entry hr {
  border: none;
  text-align: center;
  margin: 2.2em 0;
}
.article-entry hr::after {
  content: '·  ·  ·';
  font-size: 1.2em;
  color: var(--muted);
  letter-spacing: 0.5em;
}
```

- [ ] **Step 5: 段落间距加大**

```css
/* ==============================================
   二十一、杂志排版 — 宽松留白
   ============================================== */
.article-entry p { margin: 1.6em 0; }
.article-entry { padding: 0 32px; }
```

- [ ] **Commit**

```bash
git add css/content.css
git commit -m "feat: 杂志感排版 — 首字下沉、引号装饰、分割线、宽松留白"
```

---

### Task 4: Banner 全屏 + 视差 CSS

**Files:**
- Modify: `css/theme.css`

- [ ] **Step 1: 将 #header 高度改为 100vh（桌面端）**

Find existing `#header { height: 50vh; ... }` and `@media (min-width: 768px) { #header { height: 42vh; } }` and `@media (min-width: 1024px) { #header { height: 36vh; } }` — replace with:

```css
#header {
  height: 60vh;
  min-height: 320px;
  position: relative;
  overflow: hidden;
}
@media screen and (min-width: 768px) {
  #header { height: 80vh; }
}
@media screen and (min-width: 1024px) {
  #header { height: 100vh; }
}
```

- [ ] **Step 2: 添加滚动指示箭头 CSS**

Append to theme.css:

```css
/* ==============================================
   十九、Banner 底部滚动指示箭头
   ============================================== */
.scroll-indicator {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255,255,255,0.7);
  font-size: 20px;
  animation: scroll-bounce 2s ease-in-out infinite;
  pointer-events: none;
  transition: opacity 0.4s;
}
.scroll-indicator.is-hidden { opacity: 0; }
@keyframes scroll-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%      { transform: translateX(-50%) translateY(8px); }
}
```

- [ ] **Commit**

```bash
git add css/theme.css
git commit -m "feat: Banner 全屏 100vh + 滚动指示箭头 CSS"
```

---

### Task 5: style.css — 全局组件色彩变量化

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: 替换所有硬编码颜色为变量**

Key replacements (use `replace_all`):
- [ ] `background: #f1f0ed` (scrollbar track) → `background: var(--scrollbar-track)`
- [ ] `background: #cbd5e1` (scrollbar thumb) → `background: var(--scrollbar-thumb)`
- [ ] `background: #94a3b8` (scrollbar thumb hover) → `background: var(--muted)`
- [ ] `background: rgba(30,41,59,0.85)` (music btn) → `background: var(--card-bg)` — actually leave this, it's a special case
- [ ] `color: #64748b` in `.article-share-*` → `color: var(--muted-heavy)`
- [ ] `background: #f8fafc` in `.article-share-links` → `background: var(--tag-bg)`
- [ ] `background: #fff` in search/lightbox contexts → `background: var(--input-bg)` — leave lightbox as-is
- [ ] `background: rgba(59,130,246,0.9)` (back-to-top) → leave as-is (always blue)
- [ ] `background: #1e293b` in footer/mobile-nav → `background: var(--footer-bg)`
- [ ] `color: #94a3b8` in footer/mobile-nav → `color: var(--footer-text)`
- [ ] `border-bottom: 1px solid #e8e5e0` → `border-bottom: 1px solid var(--border)`
- [ ] `#search-form-wrap` `background: #fff` → `background: var(--input-bg)`
- [ ] `.search-form-input` `color: #334155` → `color: var(--text)`
- [ ] `::selection` `color: #1e293b` → `color: var(--heading)`; `background: rgba(59,130,246,0.2)` → `background: var(--selection-bg)`

- [ ] **Commit**

```bash
git add css/style.css
git commit -m "feat: style.css 全局组件色彩变量化"
```

---

### Task 6: script.js — 视差滚动 + 打字机 + Staggered 入场 + Reveal

**Files:**
- Modify: `js/script.js`

Add new modules before the closing `})();` of the IIFE (before 十二、移动端菜单).

- [ ] **Step 1: 插入 Banner 视差滚动模块**

Insert as new section before 十二、移动端菜单:

```javascript
  // ==============================================
  // 十五、Banner 视差滚动 + 滚动指示箭头
  // ==============================================
  (function() {
    var header = document.getElementById('header');
    var banner = document.getElementById('banner');
    var title  = document.getElementById('header-title');
    if (!header || !banner) return;

    // 添加滚动指示箭头
    var indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.innerHTML = '&#8964;<br>&#8964;';
    indicator.setAttribute('aria-hidden', 'true');
    header.appendChild(indicator);

    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          var scrollTop = window.scrollY || document.documentElement.scrollTop;
          if (scrollTop <= header.offsetHeight) {
            banner.style.transform = 'translateY(' + (scrollTop * 0.35) + 'px)';
            if (title) title.style.transform = 'translateY(-50%) translateY(' + (scrollTop * 0.15) + 'px)';
          }
          // 滚动超过 100px 后隐藏指示箭头
          if (scrollTop > 100) {
            indicator.classList.add('is-hidden');
          } else {
            indicator.classList.remove('is-hidden');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  })();
```

- [ ] **Step 2: 插入打字机效果模块**

```javascript
  // ==============================================
  // 十六、打字机效果（首页副标题）
  // 仅在首页执行，逐字打出副标题文字
  // ==============================================
  (function() {
    var subtitleWrap = document.getElementById('subtitle-wrap');
    if (!subtitleWrap) return;
    var text = subtitleWrap.textContent.trim();
    if (!text) return;
    subtitleWrap.textContent = '';
    subtitleWrap.style.borderRight = '2px solid #fff';

    var i = 0;
    function type() {
      if (i < text.length) {
        subtitleWrap.textContent += text.charAt(i);
        i++;
        setTimeout(type, 80 + Math.random() * 60);
      } else {
        subtitleWrap.style.borderRight = 'none';
      }
    }
    setTimeout(type, 600);  // 页面加载后 600ms 开始
  })();
```

- [ ] **Step 3: 插入 Staggered 卡片入场 + Scroll Reveal 模块**

```javascript
  // ==============================================
  // 十七、Staggered 入场 + 滚动触发 Reveal
  // ==============================================
  (function() {
    // Staggered 卡片入场（首页）
    var cards = document.querySelectorAll('.article');
    if (cards.length > 0 && 'IntersectionObserver' in window) {
      cards.forEach(function(card, i) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        card.style.transitionDelay = (i * 0.1) + 's';
      });

      var cardObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            cardObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05 });

      cards.forEach(function(card) { cardObserver.observe(card); });
    }

    // 滚动 Reveal：文章内段落/图片/引用块依次淡入
    var revealEls = document.querySelectorAll('.article-entry > p, .article-entry > pre, .article-entry > blockquote, .article-entry > ul, .article-entry > ol, .article-entry img');
    if (revealEls.length > 0 && 'IntersectionObserver' in window) {
      revealEls.forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      });

      var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      revealEls.forEach(function(el) { revealObserver.observe(el); });
    }
  })();
```

- [ ] **Step 4: Commit**

```bash
git add js/script.js
git commit -m "feat: 视差滚动 + 打字机 + staggered 入场 + scroll reveal"
```

---

### Task 7: CSS — 链接下划线动画 + 卡片光晕 Hover

**Files:**
- Modify: `css/content.css`

- [ ] **Step 1: 追加链接动画和卡片光晕样式**

```css
/* ==============================================
   二十二、链接下划线滑动动画
   ============================================== */
.article-entry a:not(.article-share-link):not(.tag-list-link):not([rel="tag"]) {
  position: relative;
  text-decoration: none;
}
.article-entry a:not(.article-share-link):not(.tag-list-link):not([rel="tag"])::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 1.5px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}
.article-entry a:not(.article-share-link):not(.tag-list-link):not([rel="tag"]):hover::after {
  transform: scaleX(1);
}

/* ==============================================
   二十三、卡片悬停光晕增强
   ============================================== */
.article-inner {
  transition: transform 0.3s ease, box-shadow 0.4s ease, border-color 0.4s ease;
}
.article-inner:hover {
  border-color: var(--accent);
  box-shadow: 0 12px 40px rgba(59,130,246,0.1), 0 4px 15px rgba(59,130,246,0.06);
}
```

- [ ] **Commit**

```bash
git add css/content.css
git commit -m "feat: 链接下划线滑动动画 + 卡片光晕 hover"
```

---

### Task 8: 构建验证 + 推送

- [ ] **Step 1: 运行构建**

```bash
cd "C:/Users/ASUS/OneDrive/Desktop/my-blog" && node build.js
```

Expected: `Built 1 page(s) + inverted search index.`

- [ ] **Step 2: 验证关键文件**

```bash
# 确认 CSS 变量存在
grep -c '\-\-bg:' css/theme.css        # should be 2 (light + dark)

# 确认暗色模式媒体查询存在
grep -c 'prefers-color-scheme' css/theme.css  # should be 1

# 确认新 JS 模块存在
grep -c 'scroll-bounce' js/script.js     # should be 1
grep -c 'typewriter\|打字机' js/script.js # should be > 0
grep -c 'scroll.indicator' js/script.js  # should be 2 (create + hide)
grep -c 'staggered\|Staggered' js/script.js # should be > 0
```

- [ ] **Step 3: Commit 构建产物并推送**

```bash
cd "C:/Users/ASUS/OneDrive/Desktop/my-blog"
git add -A
git commit -m "chore: 视觉升级构建产物 + 版本号更新"
git push origin source
git checkout main && git merge source && git push origin main && git checkout source
```
