# 社交互动层 — 设计文档

## 概述

为博客添加评论区、RSS 订阅、友情链接、访客统计四个功能模块，增强读者互动和内容分发能力。

**方案**：第三方集成优先（Giscus 评论 + 不蒜子统计），零服务器成本，与 GitHub Pages 天然契合。

## 一、评论区（Giscus）

### 触发条件
- 仅文章详情页加载（`ogUrlFile` 含 `posts/`），首页和列表页不加载
- EJS 模板通过条件判断注入 `<script>`

### 实现
- 在 `templates/page.ejs` 的 `<section id="main">` 底部、`#article-nav` 之前插入占位容器
- 模板新增变量 `showComments`：详情页为 `true`，列表页为 `false`
- Giscus 配置：
  - `data-repo="nanbujiwanfeng/zl.github.io"`
  - `data-repo-id` / `data-category-id`：硬编码（用户需从 Giscus 官网获取）
  - `data-mapping="pathname"`
  - `data-theme="preferred_color_scheme"`（跟随系统亮暗）
- CSS 在 `content.css` 添加评论容器样式

### 前置条件
- 用户在 GitHub 仓库开启 Discussions
- 安装 [Giscus App](https://github.com/apps/giscus)
- 在 Giscus 官网获取 repo-id 和 category-id，填入模板

## 二、RSS 订阅

### 实现
- `build.js` 新增 `buildRss()` 函数
- 构建时生成 `rss.xml` 到项目根目录
- XML 结构遵循 RSS 2.0 规范：`<channel>` + 各文章 `<item>`
- 文章内容使用纯文本摘要（复用 `generateExcerpt`），200 字符
- 在 `templates/page.ejs` 的 `<head>` 添加 `<link rel="alternate" type="application/rss+xml">`

## 三、友情链接

### 数据来源
- 新建 `friends.json`：`[{ "name": "博客名", "url": "https://...", "description": "简介" }]`

### 构建集成
- `build.js` 读取 `friends.json`，传入 EJS 模板变量 `friends`
- 模板新增变量 `isHome`：首页为 `true`（侧边栏显示友链 widget），详情页为 `false`

### 展示位置
- 首页侧边栏：显示前 5 条友链（widget 卡片）
- 独立友链页 `/friends/`：显示完整列表 + 申请说明
- `build.js` 还需生成 `friends/index.html`

### CSS
- `.friend-link` 卡片：左侧头像占位圆、右侧名称 + 简介
- 悬停轻微上浮效果

## 四、访客统计（不蒜子）

### 实现
- `templates/page.ejs` 页脚区域插入不蒜子脚本标签
- 两个占位元素：`<span id="busuanzi_value_site_pv">`（总访问量）、`<span id="busuanzi_value_site_uv">`（总访客数）
- 脚本 async 加载：`//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js`
- 仅首页页脚显示站点总统计
- 文章详情页（可选）显示单篇阅读量：`<span id="busuanzi_value_page_pv">`

## 涉及文件

| 文件 | 操作 | 说明 |
|---|---|---|
| `templates/page.ejs` | 修改 | 插入评论容器 + RSS link + 不蒜子占位 + 友链 widget |
| `build.js` | 修改 | 新增 RSS 生成、友链数据读取、新模板变量 |
| `css/content.css` | 修改 | 评论容器样式 |
| `css/theme.css` | 修改 | 友链卡片样式 |
| `friends.json` | 新建 | 友链数据 |
| `rss.xml` | 生成 | RSS feed（构建产物） |
| `friends/index.html` | 生成 | 友链独立页（构建产物） |
