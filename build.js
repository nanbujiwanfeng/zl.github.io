/* ===================================
   静态博客构建脚本 — 从文章源文件生成分页首页

   运行时机：
     每次新增/修改文章后，运行 `node build.js`
     或在 deploy.sh 中自动调用

   工作流程：
     1. 读取 search.json（文章元数据列表）
     2. 逐个打开 posts/文章名/index.html，提取文章正文 HTML
     3. 读取 index.html 模板，按标记拆分
     4. 按 POSTS_PER_PAGE 分页，每页插入对应文章
     5. 生成 index.html（第1页）和 page/N/index.html（第2页起）
     6. 自动更新侧边栏"最新文章"列表
   =================================== */

// ==================== 导入 Node.js 内置模块 ====================
const fs   = require('fs');   // 文件系统：读写文件
const path = require('path'); // 路径处理：拼接路径、获取目录名

// ==================== 配置项（按需修改） ====================
const POSTS_PER_PAGE = 5;                                // 每页显示的文章数量
const SITE_ROOT      = '/zl.github.io';                  // 站点根路径（GitHub Pages 子目录）
const SITE_URL       = 'https://nanbujiwanfeng.github.io'; // 站点完整域名
const BASE_DIR       = __dirname;                         // 项目根目录（当前脚本所在目录）
const BLOG_TITLE     = '南不及晚风的博客';                  // 博客名称，用于 <title> 标签

// ==================== 模板标记（在 index.html 中定位替换区） ====================
const TITLE_START = '<!-- TITLE -->';       // 页面标题开始标记
const TITLE_END   = '<!-- TITLE_END -->';   // 页面标题结束标记（中间内容会被替换为"博客名"或"第N页 | 博客名"）
const OG_START    = '<!-- OG_URL -->';      // Open Graph URL 开始标记
const OG_END      = '<!-- OG_URL_END -->';  // Open Graph URL 结束标记（中间内容替换为当前页面的文件名）
const ART_START   = '<!-- ARTICLES_START -->'; // 文章列表区域开始标记
const ART_END     = '<!-- ARTICLES_END -->';   // 文章列表区域结束标记（中间插入当前页的文章 HTML）

// ==================== 读取数据 ====================
const searchData = JSON.parse(                               // 解析 JSON 字符串为数组
  fs.readFileSync(path.join(BASE_DIR, 'search.json'), 'utf8') // 同步读取 search.json
);
const template = fs.readFileSync(                             // 读取模板文件
  path.join(BASE_DIR, 'index.html'), 'utf8'                  // 模板就是 index.html 本身
);

// ==================== 模板解析 ====================
// 将 index.html 按标记拆分为多个片段，方便后续拼接
function parseTemplate() {
  const p = {};          // 存放拆分后的各片段
  let pos = 0;           // 当前扫描位置（在模板字符串中的索引）

  // 辅助函数：从当前位置找到下一个标记，标记之前的文本存入 p[key]，然后将 pos 移到标记之后
  function chunkUntil(marker, key) {
    const i = template.indexOf(marker, pos); // 从 pos 开始查找标记
    if (i === -1) throw new Error('Marker not found: ' + marker); // 找不到标记则报错
    p[key] = template.substring(pos, i);     // 标记之前的文本 → 存入 p[key]
    pos = i + marker.length;                  // 跳过标记，继续往后扫描
  }

  // 1) 从模板开头到 TITLE_START 之前的内容（DOCTYPE、<head>、meta 等）
  chunkUntil(TITLE_START, 'before_title');

  // 2) TITLE_START 和 TITLE_END 之间的原始标题文本（会被替换）
  p.title = template.substring(pos, template.indexOf(TITLE_END, pos));
  pos = template.indexOf(TITLE_END, pos) + TITLE_END.length; // 跳过 TITLE_END

  // 3) TITLE_END 到 OG_START 之间的内容（meta viewport、og:title 等不变的 meta 标签）
  chunkUntil(OG_START, 'after_title');

  // 4) OG_START 和 OG_END 之间的原始 URL 文件名（会被替换）
  p.og_url = template.substring(pos, template.indexOf(OG_END, pos));
  pos = template.indexOf(OG_END, pos) + OG_END.length; // 跳过 OG_END

  // 5) OG_END 到 ART_START 之间的内容（CSS 引用、header、导航、搜索框等页面外壳）
  chunkUntil(ART_START, 'after_og');

  // 6) ART_START 和 ART_END 之间的原始文章 HTML（会被替换）
  const artEnd = template.indexOf(ART_END, pos); // 找到 ART_END 的位置
  p.articles = template.substring(pos, artEnd);   // 两个标记之间的文章区域
  pos = artEnd + ART_END.length;                   // 跳过 ART_END

  // 7) ART_END 之后的所有内容（侧边栏、页脚、移动端菜单、<script> 标签等）
  p.tail = template.substring(pos);

  return p; // 返回拆分后的所有片段
}

const p = parseTemplate(); // 执行模板解析，得到各片段

// ==================== 从文章详情页提取正文 HTML ====================
// 参数 postUrl：文章 URL，如 "/zl.github.io/posts/hello-world/"
// 返回：文章正文的 HTML 字符串（.e-content.article-entry 内部的全部内容）
function extractContent(postUrl) {
  // 从 URL 中提取文章目录名（slug），如 "/zl.github.io/posts/hello-world/" → "hello-world"
  const slug = postUrl.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, '');

  // 拼接文章详情页的文件路径：posts/hello-world/index.html
  const filePath = path.join(BASE_DIR, 'posts', slug, 'index.html');
  if (!fs.existsSync(filePath)) return ''; // 文件不存在则返回空字符串

  const html = fs.readFileSync(filePath, 'utf8'); // 读取文章详情页的完整 HTML
  const startMarker = '<div class="e-content article-entry"'; // 正文区域的开头标记
  const idx = html.indexOf(startMarker);                      // 查找正文区域的起始位置
  if (idx === -1) return ''; // 找不到正文区域则返回空字符串

  // 用深度计数法精确提取正文 HTML（处理正文内可能嵌套的 <div> 标签）
  let pos   = html.indexOf('>', idx) + 1; // 跳过正文 <div> 的开始标签
  let depth = 1;                           // 嵌套深度计数器，起始为 1（进入了正文 div）

  // 逐层匹配 <div 和 </div>，直到深度归零（找到了与正文 div 配对的结束标签）
  while (depth > 0 && pos < html.length) {
    const nextDiv   = html.indexOf('<div', pos);   // 下一个 <div 的位置（可能是嵌套子 div）
    const nextClose = html.indexOf('</div>', pos); // 下一个 </div> 的位置（可能是关闭嵌套或关闭正文区域）

    if (nextClose === -1) return ''; // 找不到任何 </div>，HTML 结构异常，返回空

    if (nextDiv !== -1 && nextDiv < nextClose) {
      depth++;            // 遇到 <div：嵌套层级 +1
      pos = nextDiv + 4;  // 跳过 '<div'
    } else {
      depth--;              // 遇到 </div>：嵌套层级 -1
      pos = nextClose + 6;  // 跳过 '</div>'
    }
  }

  // 提取正文内容：从正文 div 开始标签之后 → 到匹配的 </div> 之前
  return html.substring(html.indexOf('>', idx) + 1, pos - 6).trim();
}

// ==================== 构建单篇文章的列表卡片 HTML ====================
// 参数 post：search.json 中的一篇文章对象 { title, url, date, tags }
// 返回：完整的 <article> 列表卡片 HTML 字符串
function buildArticle(post) {
  const slug    = post.url.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, ''); // URL → 目录名
  const content = extractContent(post.url); // 从文章详情页提取正文 HTML

  // 构建标签列表（如果有标签的话）
  let tagsHtml = ''; // 默认为空
  if (post.tags && post.tags.length > 0) {
    // 每个标签生成一个 <li> → <a> 链接，指向 /tags/标签名/
    tagsHtml = '\n  <ul class="article-tag-list" itemprop="keywords">' +
      post.tags.map(t => '<li class="article-tag-list-item"><a class="article-tag-list-link" href="' +
        SITE_ROOT + '/tags/' + t + '/" rel="tag">' + t + '</a></li>').join('') +
      '</ul>\n';
  }

  // 用数组拼接 HTML（可读性更好，每个部分一行）
  return [
    '<article id="post-' + slug + '" class="h-entry article article-type-post" itemprop="blogPost" itemscope itemtype="https://schema.org/BlogPosting">',
    '  <div class="article-meta">',                                 // 卡片元信息区
    '    <a href="' + post.url + '" class="article-date">',         // 日期链接：点击跳转文章详情页
    '      <time class="dt-published" datetime="' + post.date + '" itemprop="datePublished">' + post.date + '</time>', // 发布日期
    '    </a>',
    '  </div>',
    '  <div class="article-inner">',                                // 卡片正文区
    '    <header class="article-header">',                          // 文章标题头
    '      <h1 itemprop="name">',
    '        <a class="p-name article-title" href="' + post.url + '">' + post.title + '</a>', // 可点击的文章标题
    '      </h1>',
    '    </header>',
    '    <div class="e-content article-entry" itemprop="articleBody">', // 文章正文容器
    '      ' + content,                                             // 从文章详情页提取的正文 HTML
    '    </div>',
    '    <footer class="article-footer">',                          // 卡片脚注区
    '      <a data-url="' + SITE_URL + post.url + '" data-title="' + post.title + '" class="article-share-link"><span class="fa fa-share">分享</span></a>', // 分享按钮
    tagsHtml,                                                       // 标签列表（无标签时为空）
    '    </footer>',
    '  </div>',
    '</article>'
  ].join('\n'); // 用换行符拼接数组为一个字符串
}

// ==================== 构建分页导航栏 HTML ====================
// 参数 page：当前页码，total：总页数
// 返回：<nav id="page-nav"> 分页导航的 HTML（只有1页时返回空字符串）
function buildPageNav(page, total) {
  if (total <= 1) return ''; // 只有1页，不需要分页导航

  // 辅助函数：根据页码返回对应的 URL（第1页 → /，第2页起 → /page/N/）
  function url(n) { return n === 1 ? SITE_ROOT + '/' : SITE_ROOT + '/page/' + n + '/'; }

  let html = '<nav id="page-nav">\n';                 // 分页导航容器
  if (page > 1) {
    html += '  <a class="extend prev" rel="prev" href="' + url(page - 1) + '">上一页</a>\n'; // 上一页按钮
  }
  for (let i = 1; i <= total; i++) {                  // 遍历所有页码
    if (i === page) {
      html += '  <span class="page-number current">' + i + '</span>\n'; // 当前页：不可点击的纯文本
    } else {
      html += '  <a class="page-number" href="' + url(i) + '">' + i + '</a>\n'; // 其他页：可点击链接
    }
  }
  if (page < total) {
    html += '  <a class="extend next" rel="next" href="' + url(page + 1) + '">下一页</a>\n'; // 下一页按钮
  }
  html += '</nav>';
  return html;
}

// ==================== 构建侧边栏"最新文章"列表 ====================
// 取 searchData 前 5 篇（与首页排序一致），生成 <li> 列表
function buildRecentPosts() {
  return searchData.slice(0, 5).map(p =>               // 取前5篇文章
    '          <li>\n            <a href="' + p.url + '">' + p.title + '</a>\n          </li>'
  ).join('\n');                                        // 拼接所有 <li>
}

// ==================== 生成所有分页 ====================
const totalPages = Math.ceil(searchData.length / POSTS_PER_PAGE); // 总页数 = 向上取整(文章总数 ÷ 每页篇数)

for (let page = 1; page <= totalPages; page++) {                // 逐页生成
  const start     = (page - 1) * POSTS_PER_PAGE;                 // 当前页起始索引
  const pagePosts = searchData.slice(start, start + POSTS_PER_PAGE); // 当前页的文章数组

  const articlesHtml = pagePosts.map(buildArticle).join('\n\n'); // 当前页所有文章的 HTML
  const pageNavHtml  = buildPageNav(page, totalPages);           // 分页导航栏 HTML
  const title        = page === 1                                // 页面 <title>
    ? BLOG_TITLE                                                  // 第1页：博客名
    : '第' + page + '页 | ' + BLOG_TITLE;                         // 第2页起：第N页 | 博客名
  const ogFile       = page === 1                                // OG URL 中的文件名
    ? 'index.html'                                                // 第1页：index.html
    : 'page/' + page + '/index.html';                             // 第2页起：page/N/index.html

  // 更新侧边栏"最新文章"（用正则匹配替换 widget 中的 <li> 列表）
  const tail = p.tail.replace(
    /(最新文章<\/h3>\s*<div class="widget">\s*<ul>\s*)[\s\S]*?(<\/ul>\s*<\/div>\s*<\/div>)/,
    '$1\n' + buildRecentPosts() + '\n        $2'                 // 保留容器标签，只替换中间的 <li> 列表
  );

  // 拼接完整页面 HTML
  const html =
    p.before_title + TITLE_START + title + TITLE_END +            // <head> 前半 + 标题
    p.after_title  + OG_START    + ogFile + OG_END   +            // meta 标签 + OG URL
    p.after_og     + ART_START   + '\n' +                         // 页面外壳 + 文章区开始
    articlesHtml   + '\n' + pageNavHtml + '\n' +                  // 当前页文章 + 分页导航
    ART_END        + tail;                                        // 文章区结束 + 尾部（侧边栏/页脚/脚本）

  // 写入文件
  if (page === 1) {
    fs.writeFileSync(path.join(BASE_DIR, 'index.html'), html);   // 第1页：写入根目录 index.html
  } else {
    const dir = path.join(BASE_DIR, 'page', String(page));        // 第2页起：创建 page/N/ 目录
    fs.mkdirSync(dir, { recursive: true });                       // recursive=true 自动创建父目录
    fs.writeFileSync(path.join(dir, 'index.html'), html);         // 写入 page/N/index.html
  }
}

// 输出构建结果
console.log('Built ' + totalPages + ' page(s), ' + searchData.length + ' article(s).');
