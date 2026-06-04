/* ===================================
   静态博客构建脚本 — EJS 模板引擎驱动

   运行时机：
     每次新增/修改文章后，运行 `node build.js`
     或在 deploy.sh 中自动调用

   工作流程：
     1. 读取 search.json（文章元数据列表）
     2. 逐个打开 posts/文章名/index.html，提取文章正文 HTML
     3. 用 EJS 渲染 templates/page.ejs 模板
     4. 按 POSTS_PER_PAGE 分页，生成 index.html + page/N/index.html
     5. 自动更新侧边栏"最新文章"列表

   依赖：
     Node.js 内置模块：fs、path
     npm 包：ejs（npm install ejs）
   =================================== */

const fs   = require('fs');                             // 文件系统：读写文件
const path = require('path');                            // 路径处理：拼接路径
const ejs  = require('ejs');                             // EJS 模板引擎：将数据注入 HTML 模板

// ==================== 配置项 ====================
const POSTS_PER_PAGE = 5;                                // 每页显示的文章数量
const SITE_ROOT      = '/zl.github.io';                  // 站点根路径（GitHub Pages 子目录）
const SITE_URL       = 'https://nanbujiwanfeng.github.io'; // 站点完整域名
const BASE_DIR       = __dirname;                         // 项目根目录
const BLOG_TITLE     = '南不及晚风的博客';                  // 博客名称
const TEMPLATE_FILE  = path.join(BASE_DIR, 'templates', 'page.ejs'); // EJS 模板路径
const VERSION        = String(Date.now());                // 每次构建生成唯一版本号，用于缓存失效

// ==================== 读取数据 ====================
const templateStr = fs.readFileSync(TEMPLATE_FILE, 'utf8');       // 读取 EJS 模板文件
const searchData  = JSON.parse(                                    // 解析文章元数据
  fs.readFileSync(path.join(BASE_DIR, 'search.json'), 'utf8')     // 按日期从新到旧排列
);
const templateFn  = ejs.compile(templateStr, { filename: TEMPLATE_FILE }); // 编译模板（缓存函数，多次调用高效）

// ==================== 从文章详情页提取正文 HTML ====================
// 用深度计数法精确匹配 <div class="e-content article-entry"> 的闭合标签
// 正确处理正文内可能嵌套的 <div>（如登录页面嵌入的完整 HTML）
function extractContent(postUrl) {
  const slug = postUrl.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, '');
  const filePath = path.join(BASE_DIR, 'posts', slug, 'index.html');
  if (!fs.existsSync(filePath)) return '';             // 文章文件不存在

  const html = fs.readFileSync(filePath, 'utf8');
  const startMarker = '<div class="e-content article-entry"';
  const idx = html.indexOf(startMarker);
  if (idx === -1) return '';                           // 找不到正文容器

  let pos   = html.indexOf('>', idx) + 1;              // 跳过开始标签
  let depth = 1;                                       // 嵌套深度计数器

  while (depth > 0 && pos < html.length) {
    const nextDiv   = html.indexOf('<div', pos);        // 下一个 <div 的位置
    const nextClose = html.indexOf('</div>', pos);      // 下一个 </div> 的位置

    if (nextClose === -1) return '';                    // HTML 结构异常

    if (nextDiv !== -1 && nextDiv < nextClose) {
      depth++;            // 嵌套子 <div>：层级 +1
      pos = nextDiv + 4;
    } else {
      depth--;              // 闭合 </div>：层级 -1
      pos = nextClose + 6;
    }
  }

  return html.substring(html.indexOf('>', idx) + 1, pos - 6).trim(); // 提取正文内容
}

// ==================== 构建单篇文章的列表卡片 HTML ====================
function buildArticle(post) {
  const slug    = post.url.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, '');
  const content = extractContent(post.url);

  // 构建标签列表
  let tagsHtml = '';
  if (post.tags && post.tags.length > 0) {
    tagsHtml = '\n  <ul class="article-tag-list" itemprop="keywords">' +
      post.tags.map(t => '<li class="article-tag-list-item"><a class="article-tag-list-link" href="' +
        SITE_ROOT + '/tags/' + t + '/" rel="tag">' + t + '</a></li>').join('') +
      '</ul>\n';
  }

  return [
    '<article id="post-' + slug + '" class="h-entry article article-type-post" itemprop="blogPost" itemscope itemtype="https://schema.org/BlogPosting">',
    '  <div class="article-meta">',
    '    <a href="' + post.url + '" class="article-date">',
    '      <time class="dt-published" datetime="' + post.date + '" itemprop="datePublished">' + post.date + '</time>',
    '    </a>',
    '  </div>',
    '  <div class="article-inner">',
    '    <header class="article-header">',
    '      <h1 itemprop="name">',
    '        <a class="p-name article-title" href="' + post.url + '">' + post.title + '</a>',
    '      </h1>',
    '    </header>',
    '    <div class="e-content article-entry" itemprop="articleBody">',
    '      ' + content,
    '    </div>',
    '    <footer class="article-footer">',
    '      <a data-url="' + SITE_URL + post.url + '" data-title="' + post.title + '" class="article-share-link"><span class="fa fa-share">分享</span></a>',
    tagsHtml,
    '    </footer>',
    '  </div>',
    '</article>'
  ].join('\n');
}

// ==================== 构建分页导航栏 HTML ====================
function buildPageNav(page, total) {
  if (total <= 1) return '';

  function url(n) { return n === 1 ? SITE_ROOT + '/' : SITE_ROOT + '/page/' + n + '/'; }

  let html = '<nav id="page-nav">\n';
  if (page > 1) {
    html += '  <a class="extend prev" rel="prev" href="' + url(page - 1) + '">上一页</a>\n';
  }
  for (let i = 1; i <= total; i++) {
    if (i === page) {
      html += '  <span class="page-number current">' + i + '</span>\n';
    } else {
      html += '  <a class="page-number" href="' + url(i) + '">' + i + '</a>\n';
    }
  }
  if (page < total) {
    html += '  <a class="extend next" rel="next" href="' + url(page + 1) + '">下一页</a>\n';
  }
  html += '</nav>';
  return html;
}

// ==================== 构建侧边栏"最新文章"数组 ====================
function buildRecentPosts() {
  return searchData.slice(0, 5).map(p => ({ url: p.url, title: p.title }));
}

// ==================== 构建倒排索引 ====================
// 将文本拆分为搜索 token：
//   - 中文单字 + 相邻二字组合（bigram），兼顾单字查询和精确匹配
//   - 英文/数字连续串（2 字符以上），转小写
// 返回去重后的 token 数组
// 示例："C语言游戏" → ["c","语","言","游","戏","语言","言游","游戏","c语","语言"]
function tokenize(text) {
  const tokens = new Set();               // Set 自动去重：同一个 token 只存一份
  const lower  = text.toLowerCase();      // 统一转小写：英文不区分大小写

  // 提取所有 CJK 字符，生成单字 token + 相邻 bigram
  const cjkChars = [];                    // 按原文顺序收集所有中文字符
  const cjkRe    = /[一-鿿㐀-䶿]/g;       // 匹配基本汉字块 + 扩展A区
  let m;
  while ((m = cjkRe.exec(lower)) !== null) cjkChars.push(m[0]); // 逐个提取
  cjkChars.forEach(c => tokens.add(c));   // 单字 token：支持单字查询
  for (let i = 0; i < cjkChars.length - 1; i++) {
    tokens.add(cjkChars[i] + cjkChars[i + 1]); // 相邻二字 bigram：提高精确度
  }

  // 提取英文/数字 token（2 字符以上，如 "html" "malloc" "2026"）
  const words = lower.match(/[a-z0-9]{2,}/g);  // 全局匹配连续字母数字
  if (words) words.forEach(w => tokens.add(w));

  return Array.from(tokens);              // Set → Array
}

// 遍历所有文章，生成倒排索引结构：
// { a: { slug: {t:标题, d:日期, g:[标签]} }, i: { token: [slug1, slug2] } }
//   ↑ 文章元数据表                    ↑ 倒排索引：词 → 匹配文章列表
function buildSearchIndex(posts) {
  const articles = {};                    // { slug: {t, d, g} }
  const index    = {};                    // { token: [slug1, slug2, ...] }

  posts.forEach(post => {                 // 遍历每篇文章
    const slug = post.url.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, ''); // 提取 URL slug：/posts/xxx/ → xxx
    articles[slug] = { t: post.title, d: post.date }; // 存储元数据（短键名省体积）
    if (post.tags && post.tags.length > 0) articles[slug].g = post.tags; // 有标签才存 g 字段

    const text   = post.title + ' ' + post.tags.join(' ') + ' ' + post.content; // 合并所有可搜索文本
    const tokens = tokenize(text);        // 分词
    tokens.forEach(token => {             // 每个 token 映射到当前文章
      if (!index[token]) index[token] = [];         // 首次出现的 token，初始化数组
      if (index[token].indexOf(slug) === -1) index[token].push(slug); // 去重追加
    });
  });

  return { a: articles, i: index };       // 一份 JSON 同时包含元数据和索引
}

// ==================== 生成所有分页 ====================
const totalPages = Math.ceil(searchData.length / POSTS_PER_PAGE);

for (let page = 1; page <= totalPages; page++) {
  const start     = (page - 1) * POSTS_PER_PAGE;         // 当前页起始索引
  const pagePosts = searchData.slice(start, start + POSTS_PER_PAGE); // 当前页文章数组

  // EJS 模板变量
  const vars = {
    version:      VERSION,                                                       // 缓存破坏版本号
    title:        page === 1 ? BLOG_TITLE : '第' + page + '页 | ' + BLOG_TITLE, // 页面标题
    ogUrlFile:    page === 1 ? 'index.html' : 'page/' + page + '/index.html',   // OG URL 文件名
    articlesHtml: pagePosts.map(buildArticle).join('\n\n'),                      // 当前页文章卡片 HTML
    pageNavHtml:  buildPageNav(page, totalPages),                                // 分页导航 HTML
    recentPosts:  buildRecentPosts()                                             // 侧边栏"最新文章" [{url, title}, ...]
  };

  const html = templateFn(vars); // EJS 渲染：数据 + 模板 → 完整 HTML

  // 写入文件
  if (page === 1) {
    fs.writeFileSync(path.join(BASE_DIR, 'index.html'), html);
  } else {
    const dir = path.join(BASE_DIR, 'page', String(page));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }
}

// ==================== 生成倒排索引文件 ====================
const searchIndex = buildSearchIndex(searchData);         // 从所有文章构建倒排索引
fs.writeFileSync(                                         // 写入 JSON 文件
  path.join(BASE_DIR, 'search-index.json'),
  JSON.stringify(searchIndex)                             // 紧凑格式（无缩进，省体积）
);

// ==================== 更新非生成 HTML 文件的版本号 ====================
// 文章、标签、归档这些页面不经过 EJS，需要手动替换 ?v= 参数
// 每次构建生成新版本号，浏览器视为新文件重新请求
function stampVersion(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');           // 读取 HTML
  // 匹配 /zl.github.io/ 下的静态资源（css/js/audio/图片等），去掉旧 ?v= 再追加新版本
  html = html.replace(
    /((?:href|src)="\/zl\.github\.io\/(?:css|js|audio)\/[^"?]+\.(?:css|js|flac|png|jpg|jpeg|svg|woff2?))(?:\?v=[^"]*)?"/g,
    '$1?v=' + VERSION + '"'                               // $1 = 资源路径，追加 ?v=时间戳
  );
  fs.writeFileSync(filePath, html);                       // 写回文件
}

// 递归扫描目录下的所有 HTML 文件
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }); // 读取目录（含文件类型信息）
  entries.forEach(e => {
    const full = path.join(dir, e.name);                  // 完整路径
    if (e.isDirectory()) {
      if (e.name !== 'page') walkDir(full);               // page/ 由 EJS 生成，跳过避免重复处理
    } else if (e.name.endsWith('.html')) {
      stampVersion(full);                                 // HTML 文件 → 更新版本号
    }
  });
}

// 为根目录 index.html 和所有子目录的 HTML 统一打版本号
stampVersion(path.join(BASE_DIR, 'index.html'));         // 首页（虽由 EJS 生成，再覆盖一次确保一致）
walkDir(path.join(BASE_DIR, 'posts'));                    // 文章详情页（posts/xxx/index.html）
walkDir(path.join(BASE_DIR, 'tags'));                     // 标签页（tags/xxx/index.html）
walkDir(path.join(BASE_DIR, 'archives'));                 // 归档页（archives/.../index.html）

console.log('Built ' + totalPages + ' page(s) + inverted search index.  Version: ' + VERSION);
