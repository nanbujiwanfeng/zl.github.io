# 视觉升级修补 — Design Spec

> 修复 visual-upgrade 完成后的 5 个问题。

## 修复清单

### 1. 删除首字下沉

**问题:** `.article-entry > p:first-of-type::first-letter` 对全中文文章不协调，中文等宽字符做 drop cap 突兀。

**方案:** 删除 content.css 第十八段整段（首字下沉规则 + `.article-excerpt` 覆盖）。

### 2. 修复 Staggered 动画冲突

**问题:** 旧"六"模块（script.js 行626-656）和新的"十七"模块同时监听 `.article` 元素。旧 Observer 先触发且无延迟，直接设置 `opacity:1`，导致新模块的 staggered delay 失效。

**方案:** 旧"六"模块的 `querySelectorAll` 从 `.article, .widget-wrap` 改为只监听 `.widget-wrap`。文章卡片动画完全交给新"十七"模块。

### 3. 标题渐变尾色变量化

**问题:** theme.css 行922 `.article-title` 渐变 `linear-gradient(to right, var(--accent), #6366f1)`，尾色硬编码在暗色模式下不协调。

**方案:** `#6366f1` → `var(--accent-hover)`，亮色模式 `#2563eb`（蓝），暗色模式 `#93bbfd`（浅蓝），渐变自然过渡。

### 4. 卡片光晕变量化

**问题:** content.css 行512 `.article-inner:hover` box-shadow 用 `rgba(59,130,246,0.1)` 硬编码，暗色模式下蓝调不协调。

**方案:** 缺乏拆分 CSS 变量 RGBA 分量的机制，改为平台无关阴影方案：
```css
box-shadow: 0 12px 40px rgba(0,0,0,0.08), 0 0 0 1px var(--accent);
```
黑色半透明阴影 + accent 色 1px 内发光环，亮暗模式均自然。

### 5. 删除 HR 死代码

**问题:** content.css 行63 `.article-entry hr { border: 1px dashed var(--border); }` 被行463的杂志分割线覆盖，是死代码。

**方案:** 删除行63的旧 hr 定义。

## 影响范围

| 文件 | 改动 |
|---|---|
| `css/content.css` | 删首字下沉段、删死 hr、改光晕阴影 |
| `css/theme.css` | 改标题渐变尾色 |
| `js/script.js` | 旧 Observer 限定 `.widget-wrap` |
