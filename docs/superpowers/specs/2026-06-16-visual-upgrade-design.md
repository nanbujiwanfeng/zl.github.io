# 视觉体验层 — 设计文档

## 概述

为博客添加暗色模式、杂志排版、丰富动效、全屏沉浸式 Banner，全部通过纯 CSS + JS 前端实现。

**技术路线**：CSS 自定义属性 + 原生 JS，不引入第三方依赖。

## 一、暗色模式

### 实现
- 在 `css/theme.css` 文件头部新增 `:root` CSS 自定义属性块，定义全站色板：
  - `--bg` 页面背景、`--card-bg` 卡片、`--text` 正文、`--heading` 标题、`--muted` 辅助文字
  - `--border` 边框、`--shadow` 阴影、`--code-bg` 代码块背景、`--accent` 强调色
- 在 `@media (prefers-color-scheme: dark)` 中覆盖暗色值
- 逐步将现有文件中的硬编码颜色替换为 `var(--xxx)` 引用
- 影响文件：`theme.css`（主要）、`content.css`（代码块）、`style.css`（滚动条等）

### 色板
| Token | 亮色 | 暗色 |
|---|---|---|
| `--bg` | `#f7f6f3` | `#0f172a` |
| `--card-bg` | `#fff` | `#1e293b` |
| `--text` | `#334155` | `#cbd5e1` |
| `--heading` | `#1e293b` | `#f1f5f9` |
| `--muted` | `#94a3b8` | `#64748b` |
| `--border` | `#e8e5e0` | `#334155` |
| `--code-bg` | `#1e293b` | `#0f172a` |
| `--accent` | `#3b82f6` | `#60a5fa` |

## 二、杂志感排版

### 首字下沉
- `.article-entry > p:first-of-type::first-letter`：`font-size: 3.5em; float: left; line-height: 0.8; margin-right: 0.15em`
- 暗色模式自动适配颜色
- 仅文章详情页正文首段生效（首页摘要跳过）

### 标题装饰
- h2 左带蓝色细竖线：`::before { content:''; width: 4px; height: 1em; background: var(--accent) }`
- 标题字间距增大：`letter-spacing: 0.03em`

### 引用块
- 居中、衬线体、大号：`font-family: Georgia, serif; font-size: 1.15em; text-align: center`
- 两侧装饰引号 via `::before`/`::after`
- 去掉左边框，改用上下细线

### 分割线
- `hr` 替换为装饰符号：`content: '· · ·'` 居中显示
- 字号放大、颜色柔和

### 留白
- 文章段落间距从 `1.3em` 增至 `1.6em`
- 卡片内边距从 `24px` 增至 `32px`

## 三、丰富动效

### 页面加载 Staggered Entrance
- 首页每个 `.article` 卡片依次延迟淡入（`animation-delay: n*0.1s`）
- 通过 JS 动态设置 delay 或纯 CSS nth-child 实现

### 滚动触发 Reveal
- 使用 IntersectionObserver 监听 `.article-entry` 内元素
- 进入视口时添加 `is-revealed` class，触发 `opacity + translateY` 过渡
- `rootMargin: 0px 0px -60px 0px`

### 链接下划线动画
- 正文链接 `::after` 伪元素画线，`transform: scaleX(0)` → hover `scaleX(1)`
- `transform-origin: left`，`transition: transform 0.3s`

### 打字机效果（首页副标题）
- JS 逐字输出，每字 ~80ms
- 光标闪烁效果（`|` 字符 + CSS blink animation）
- 仅在首页执行

### 卡片光晕 Hover
- `.article-inner:hover` 时 box-shadow 添加蓝色光晕
- `transition: box-shadow 0.4s`

## 四、全屏沉浸式 Banner

### 高度
- 桌面端 `100vh`（替代当前 36vh）
- 平板 `70vh`，手机 `60vh`

### 视差滚动
- JS 监听 scroll，banner 背景 `transform: translateY(scrollTop * 0.4)`
- 标题 `translateY(scrollTop * 0.2)` 产生分层视差
- 使用 `requestAnimationFrame` 节流

### 滚动指示箭头
- Banner 底部居中：向下双箭头 `‹ ‹`
- CSS `@keyframes` 上下浮动动画
- 滚动超过 100px 后淡出

### 渐变遮罩
- 底部加深渐变，确保白色标题在任何背景图上清晰可见

## 涉及文件

| 文件 | 操作 | 说明 |
|---|---|---|
| `css/theme.css` | 重写 | 新增 :root 变量、暗色覆盖、Banner 100vh、卡片光晕 |
| `css/content.css` | 修改 | 首字下沉、引用块改版、标题装饰、分割线、链接动画 |
| `css/style.css` | 修改 | 适配 CSS 变量、暗色滚动条 |
| `js/script.js` | 修改 | 视差滚动、打字机、staggered entrance、reveal observer |
