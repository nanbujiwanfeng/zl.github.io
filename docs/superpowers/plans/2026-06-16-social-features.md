# 社交互动层 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为博客添加 Giscus 评论区、RSS 订阅、友情链接、不蒜子访客统计

**Architecture:** 四个模块均通过 `build.js` + `page.ejs` 模板变量注入。评论区和统计在模板中条件渲染；RSS 在构建时生成 XML 文件；友链通过 `friends.json` 驱动侧边栏 widget 和独立页面。

**Tech Stack:** Node.js (fs/path), EJS 模板, Giscus (第三方), 不蒜子 (第三方)

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `friends.json` | 新建 | 友链数据源 |
| `templates/page.ejs` | 修改 | 注入评论容器 + RSS link + 友链 widget + 不蒜子 |
| `build.js` | 修改 | 新增 RSS 生成、友链读取、friends 页面生成、新模板变量 |
| `css/content.css` | 修改 | 评论容器样式 |
| `css/theme.css` | 修改 | 友链卡片样式 |

---

### Task 1: 新建 friends.json 数据文件

**Files:**
- Create: `friends.json`

- [ ] **Step 1: 创建友链数据文件**

```json
[
  {
    "name": "示例博客",
    "url": "https://example.com",
    "description": "这是一个示例友链，请替换为真实链接"
  }
]
```

- [ ] **Step 2: 验证 JSON 格式**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('friends.json','utf8')))"`

- [ ] **Step 3: Commit**

```bash
git add friends.json
git commit -m "feat: 添加友链数据文件 friends.json"
```

---

### Task 2: build.js — 读取友链 + 新增模板变量

**Files:**
- Modify: `build.js` — 在读取数据区添加 friends 读取（约第 37 行后）

- [ ] **Step 1: 添加 friends 数据读取**

在 `const templateFn = ejs.compile(...)` 之后插入：

```javascript
// 读取友链数据
const friendsData = (function() {
  const fp = path.join(BASE_DIR, 'friends.json');
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
})();
```

- [ ] **Step 2: 在各页面循环中为 EJS vars 添加 showComments / isHome / friends / showFriends 字段**

修改首页分页循环（约第 176 行）的 `vars` 对象，增加三个字段：

```javascript
// 在 const vars = { ... } 内部添加:
showComments: false,               // 首页不显示评论
isHome:      page === 1,           // 仅第1页是首页
friends:     friendsData,          // 友链数据
showFriends: page === 1            // 仅首页侧边栏显示友链
```

修改文章详情页循环（约第 267 行）的 `postVars` 对象，增加三个字段：

```javascript
// 在 const postVars = { ... } 内部添加:
showComments: true,                // 详情页显示评论
isHome:       false,               // 详情页不是首页
friends:      friendsData,         // 友链数据
showFriends:  false                // 详情页侧边栏不显示友链
```

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: build.js 支持友链读取 + showComments/isHome/showFriends 模板变量"
```

---

### Task 3: page.ejs — Giscus 评论区

**Files:**
- Modify: `templates/page.ejs` — 在 `<section id="main">` 内、`<%- pageNavHtml %>` 之后插入

- [ ] **Step 1: 在文章区底部添加评论容器**

在 `<%- pageNavHtml %>` 之后（约第 73 行后）插入：

```ejs
          <% if (showComments) { %>
          <!-- ========== Giscus 评论区 ========== -->
          <div id="giscus-container">
            <script src="https://giscus.app/client.js"
              data-repo="nanbujiwanfeng/zl.github.io"
              data-repo-id="R_kg_xxxxxxxxxxx"
              data-category="Announcements"
              data-category-id="DIC_kwxxxxxxxxx"
              data-mapping="pathname"
              data-strict="0"
              data-reactions-enabled="1"
              data-emit-metadata="0"
              data-input-position="bottom"
              data-theme="preferred_color_scheme"
              data-lang="zh-CN"
              crossorigin="anonymous"
              async>
            </script>
          </div>
          <% } %>
```

> 注意：`data-repo-id` 和 `data-category-id` 需要用户从 https://giscus.app 获取后替换。当前为占位值。

- [ ] **Step 2: Commit**

```bash
git add templates/page.ejs
git commit -m "feat: 文章详情页添加 Giscus 评论区"
```

---

### Task 4: page.ejs — 不蒜子访客统计

**Files:**
- Modify: `templates/page.ejs` — 在页脚区域插入

- [ ] **Step 1: 在页脚添加访客统计占位和脚本**

在 `<footer id="footer">` 内的 `#footer-info` 之后（约第 140 行 `</footer>` 之前）插入：

```ejs
  <div class="container">
    <% if (isHome) { %>
    <div id="busuanzi-stats" style="text-align:center;color:#94a3b8;font-size:0.82em;padding:8px 0;">
      <span>本站总访问量 <span id="busuanzi_value_site_pv">-</span> 次</span>
      <span style="margin:0 12px;">|</span>
      <span>总访客数 <span id="busuanzi_value_site_uv">-</span> 人</span>
    </div>
    <script async src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
    <% } %>
  </div>
```

- [ ] **Step 2: Commit**

```bash
git add templates/page.ejs
git commit -m "feat: 首页页脚添加不蒜子访客统计"
```

---

### Task 5: build.js — RSS Feed 生成

**Files:**
- Modify: `build.js` — 在文件末尾、`console.log` 之前添加 `buildRss()` 函数

- [ ] **Step 1: 添加 buildRss 函数**

在 `console.log('Built ...')` 行之前插入：

```javascript
// ==================== 生成 RSS 2.0 Feed ====================
function buildRss() {
  const rssItems = searchData.map(function(post) {
    const slug    = post.url.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, '');
    const content = extractContent(post.url);
    const excerpt = generateExcerpt(content, 300)         // RSS 摘要稍长
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const url     = SITE_URL + post.url;
    // RFC 2822 日期格式
    const pubDate = new Date(post.date + 'T00:00:00+08:00').toUTCString();

    return [
      '    <item>',
      '      <title>' + post.title + '</title>',
      '      <link>' + url + '</link>',
      '      <guid isPermaLink="true">' + url + '</guid>',
      '      <pubDate>' + pubDate + '</pubDate>',
      '      <description>' + excerpt + '</description>',
      '    </item>'
    ].join('\n');
  }).join('\n');

  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>' + BLOG_TITLE + '</title>',
    '    <link>' + SITE_URL + SITE_ROOT + '/</link>',
    '    <description>张良的技术博客，记录编程学习与思考</description>',
    '    <language>zh-CN</language>',
    '    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>',
    '    <atom:link href="' + SITE_URL + SITE_ROOT + '/rss.xml" rel="self" type="application/rss+xml"/>',
    rssItems,
    '  </channel>',
    '</rss>'
  ].join('\n');

  fs.writeFileSync(path.join(BASE_DIR, 'rss.xml'), rss);
  console.log('RSS feed generated: rss.xml');
}

buildRss();  // 调用
```

- [ ] **Step 2: Commit**

```bash
git add build.js
git commit -m "feat: build.js 生成 RSS 2.0 feed (rss.xml)"
```

---

### Task 6: page.ejs — RSS link + 友链侧边栏 widget

**Files:**
- Modify: `templates/page.ejs` — `<head>` 区 + 侧边栏区

- [ ] **Step 1: 在 head 中添加 RSS 自动发现链接**

在 `<link rel="shortcut icon" ...>` 之后（约第 22 行后）插入：

```html
  <link rel="alternate" type="application/rss+xml" title="南不及晚风的博客 RSS" href="/zl.github.io/rss.xml">
```

- [ ] **Step 2: 在侧边栏添加友链 widget**

在侧边栏「最新文章」widget 之后（`</aside>` 之前，约第 126 行后）插入：

```ejs
  <% if (showFriends && friends && friends.length > 0) { %>
  <div class="widget-wrap">
    <h3 class="widget-title">友链</h3>
    <div class="widget">
      <ul class="friend-list">
        <% friends.forEach(function(f) { %>
        <li class="friend-item">
          <a href="<%= f.url %>" target="_blank" rel="noopener noreferrer" class="friend-link">
            <span class="friend-avatar"></span>
            <span class="friend-info">
              <span class="friend-name"><%= f.name %></span>
              <span class="friend-desc"><%= f.description %></span>
            </span>
          </a>
        </li>
        <% }); %>
      </ul>
      <a href="/zl.github.io/friends/" class="friend-more">查看更多友链 →</a>
    </div>
  </div>
  <% } %>
```

- [ ] **Step 3: Commit**

```bash
git add templates/page.ejs
git commit -m "feat: 侧边栏友链 widget + RSS head link"
```

---

### Task 7: CSS — 友链卡片 + 评论区样式

**Files:**
- Modify: `css/theme.css` — 文件末尾追加友链样式
- Modify: `css/content.css` — 文件末尾追加评论容器样式

- [ ] **Step 1: 在 theme.css 末尾添加友链样式**

```css
/* ==============================================
   十八、友链卡片样式
   ============================================== */
.friend-list { list-style: none; margin: 0; padding: 0; }
.friend-item { margin-bottom: 2px; }
.friend-item + .friend-item { border-top: 1px solid #f1f0ed; }
.friend-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  text-decoration: none;
  color: #475569;
  transition: transform 0.2s;
}
.friend-link:hover {
  transform: translateX(4px);
  color: #1e293b;
}
.friend-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #6366f1;
  font-weight: 700;
}
.friend-avatar::after {
  content: attr(data-initial);
}
.friend-info { min-width: 0; }
.friend-name {
  display: block;
  font-weight: 600;
  font-size: 0.92em;
  line-height: 1.3;
}
.friend-desc {
  display: block;
  font-size: 0.78em;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.friend-more {
  display: block;
  text-align: center;
  font-size: 0.82em;
  color: #3b82f6;
  margin-top: 8px;
  text-decoration: none;
}
.friend-more:hover { text-decoration: underline; }
```

- [ ] **Step 2: 在 content.css 末尾添加评论容器样式**

```css
/* ==============================================
   十七、评论区容器
   ============================================== */
#giscus-container {
  margin: 50px 0 20px;
  padding: 0 24px;
}
```

- [ ] **Step 3: Commit**

```bash
git add css/theme.css css/content.css
git commit -m "feat: 友链卡片 + 评论容器 CSS 样式"
```

---

### Task 8: build.js — 生成友链独立页

**Files:**
- Modify: `build.js` — 在 RSS 生成之后添加 friends 页面生成

- [ ] **Step 1: 添加 friends 页面生成代码**

在 `buildRss()` 调用之后、`console.log` 之前插入：

```javascript
// ==================== 生成友链独立页 ====================
(function() {
  const friendsDir = path.join(BASE_DIR, 'friends');
  fs.mkdirSync(friendsDir, { recursive: true });

  const friendsItems = friendsData.map(function(f) {
    return [
      '<li class="friend-item friend-page-item">',
      '  <a href="' + f.url + '" target="_blank" rel="noopener noreferrer" class="friend-link">',
      '    <span class="friend-avatar"></span>',
      '    <span class="friend-info">',
      '      <span class="friend-name">' + f.name + '</span>',
      '      <span class="friend-desc">' + f.description + '</span>',
      '    </span>',
      '  </a>',
      '</li>'
    ].join('\n');
  }).join('\n');

  const friendsHtml = [
    '<article class="h-entry article article-type-page">',
    '  <div class="article-meta"></div>',
    '  <div class="article-inner">',
    '    <header class="article-header">',
    '      <h1 itemprop="name">',
    '        <span class="p-name article-title">友情链接</span>',
    '      </h1>',
    '    </header>',
    '    <div class="e-content article-entry">',
    '      <p>以下是一些优秀的技术博客和朋友站点。</p>',
    '      <p>想交换友链？在 <a href="https://github.com/nanbujiwanfeng/zl.github.io" target="_blank" rel="noopener noreferrer">GitHub</a> 提交 PR 修改 friends.json 即可。</p>',
    '      <ul class="friend-list friend-page-list">',
    friendsItems,
    '      </ul>',
    '    </div>',
    '  </div>',
    '</article>'
  ].join('\n');

  const friendsVars = {
    version:      VERSION,
    title:        '友情链接 | ' + BLOG_TITLE,
    ogUrlFile:    'friends/index.html',
    articlesHtml: friendsHtml,
    pageNavHtml:  '',
    showComments: false,
    isHome:       false,
    friends:      friendsData,
    showFriends:  false,
    recentPosts:  buildRecentPosts()
  };

  const friendsPageHtml = templateFn(friendsVars);
  fs.writeFileSync(path.join(friendsDir, 'index.html'), friendsPageHtml);
  console.log('Friends page generated: friends/index.html');
})();
```

- [ ] **Step 2: Commit**

```bash
git add build.js
git commit -m "feat: build.js 生成友链独立页 friends/index.html"
```

---

### Task 9: 构建验证

- [ ] **Step 1: 运行构建**

```bash
node build.js
```

Expected output:
```
RSS feed generated: rss.xml
Friends page generated: friends/index.html
Built 1 page(s) + inverted search index.  Version: xxxxxxxxxxxxx
```

- [ ] **Step 2: 验证生成文件**

```bash
# 验证 RSS XML 格式
node -e "const fs=require('fs'); const xml=fs.readFileSync('rss.xml','utf8'); console.log(xml.substring(0,200));"

# 验证友链页
ls friends/index.html && echo "friends page exists"

# 验证首页包含友链 widget
grep -c "friend-list" index.html
```

- [ ] **Step 3: Commit 并推送**

```bash
git add -A
git commit -m "chore: 构建产物 — RSS + 友链页面 + 版本号更新"
git push origin source
```

---

### Giscus 手动配置步骤（构建完成后）

1. 确保 GitHub 仓库 `nanbujiwanfeng/zl.github.io` 已开启 **Discussions** 功能
2. 安装 [Giscus GitHub App](https://github.com/apps/giscus) 到该仓库
3. 访问 https://giscus.app/zh-CN 填写仓库信息
4. 将获取到的 `data-repo-id` 和 `data-category-id` 替换到 `templates/page.ejs` 中
5. 重新运行 `node build.js` 并推送
