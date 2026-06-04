const fs = require('fs');
const path = require('path');

const POSTS_PER_PAGE = 5;
const SITE_ROOT = '/zl.github.io';
const SITE_URL = 'https://nanbujiwanfeng.github.io';
const BASE_DIR = __dirname;
const BLOG_TITLE = '南不及晚风的博客';

// --- markers ---
const TITLE_START = '<!-- TITLE -->';
const TITLE_END   = '<!-- TITLE_END -->';
const OG_START    = '<!-- OG_URL -->';
const OG_END      = '<!-- OG_URL_END -->';
const ART_START   = '<!-- ARTICLES_START -->';
const ART_END     = '<!-- ARTICLES_END -->';

// --- read data ---
const searchData = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'search.json'), 'utf8'));
const template   = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');

// --- parse template into parts ---
function parseTemplate() {
  const p = {};
  let pos = 0;

  function chunkUntil(marker, key) {
    const i = template.indexOf(marker, pos);
    if (i === -1) throw new Error('Marker not found: ' + marker);
    p[key] = template.substring(pos, i);
    pos = i + marker.length;
  }

  chunkUntil(TITLE_START, 'before_title');
  p.title = template.substring(pos, template.indexOf(TITLE_END, pos));
  pos = template.indexOf(TITLE_END, pos) + TITLE_END.length;

  chunkUntil(OG_START, 'after_title');
  p.og_url = template.substring(pos, template.indexOf(OG_END, pos));
  pos = template.indexOf(OG_END, pos) + OG_END.length;

  chunkUntil(ART_START, 'after_og');
  const artEnd = template.indexOf(ART_END, pos);
  p.articles = template.substring(pos, artEnd);
  p.tail = template.substring(artEnd + ART_END.length);

  return p;
}

const p = parseTemplate();

// --- extract article-entry content from a post file ---
function extractContent(postUrl) {
  const slug = postUrl.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, '');
  const filePath = path.join(BASE_DIR, 'posts', slug, 'index.html');
  if (!fs.existsSync(filePath)) return '';

  const html = fs.readFileSync(filePath, 'utf8');
  const startMarker = '<div class="e-content article-entry"';
  const idx = html.indexOf(startMarker);
  if (idx === -1) return '';

  let pos = html.indexOf('>', idx) + 1;
  let depth = 1;

  while (depth > 0 && pos < html.length) {
    const nextDiv = html.indexOf('<div', pos);
    const nextClose = html.indexOf('</div>', pos);

    if (nextClose === -1) return '';

    if (nextDiv !== -1 && nextDiv < nextClose) {
      depth++;
      pos = nextDiv + 4;
    } else {
      depth--;
      pos = nextClose + 6;
    }
  }

  return html.substring(html.indexOf('>', idx) + 1, pos - 6).trim();
}

// --- build one listing article ---
function buildArticle(post) {
  const slug = post.url.replace(SITE_ROOT + '/posts/', '').replace(/\/$/, '');
  const content = extractContent(post.url);

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

// --- build page nav ---
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

// --- build sidebar recent posts ---
function buildRecentPosts() {
  return searchData.slice(0, 5).map(p =>
    '          <li>\n            <a href="' + p.url + '">' + p.title + '</a>\n          </li>'
  ).join('\n');
}

// --- generate pages ---
const totalPages = Math.ceil(searchData.length / POSTS_PER_PAGE);

for (let page = 1; page <= totalPages; page++) {
  const start = (page - 1) * POSTS_PER_PAGE;
  const pagePosts = searchData.slice(start, start + POSTS_PER_PAGE);

  const articlesHtml = pagePosts.map(buildArticle).join('\n\n');
  const pageNavHtml = buildPageNav(page, totalPages);
  const title = page === 1 ? BLOG_TITLE : '第' + page + '页 | ' + BLOG_TITLE;
  const ogFile = page === 1 ? 'index.html' : 'page/' + page + '/index.html';

  // Update sidebar recent posts
  const tail = p.tail.replace(
    /(最新文章<\/h3>\s*<div class="widget">\s*<ul>\s*)[\s\S]*?(<\/ul>\s*<\/div>\s*<\/div>)/,
    '$1\n' + buildRecentPosts() + '\n        $2'
  );

  const html =
    p.before_title + TITLE_START + title + TITLE_END +
    p.after_title + OG_START + ogFile + OG_END +
    p.after_og + ART_START + '\n' +
    articlesHtml + '\n' + pageNavHtml + '\n' +
    ART_END + tail;

  if (page === 1) {
    fs.writeFileSync(path.join(BASE_DIR, 'index.html'), html);
  } else {
    const dir = path.join(BASE_DIR, 'page', String(page));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }
}

console.log('Built ' + totalPages + ' page(s), ' + searchData.length + ' article(s).');
