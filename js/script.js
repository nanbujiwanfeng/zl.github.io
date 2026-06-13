/* ===================================
   博客前端脚本 — 页面交互逻辑（原生 JS，零外部依赖）

   功能模块：
     一、Banner 轮播图 — 三图自动切换 + 箭头 + 圆点
     二、背景音乐   — 右下角悬浮按钮，默认静音
     三、搜索       — 倒排索引搜索 + 键盘导航
     四、分享       — QQ/微信/QQ空间 + 复制链接
     五、图片灯箱   — 原生灯箱自动包裹
     六、移动端菜单 — 汉堡菜单侧滑
   =================================== */

(function() {                             // IIFE：隔离作用域，避免污染全局

  // ==============================================
  // 一、Banner 轮播图
  // 三张图片自动循环，支持左右箭头和底部圆点切换
  // ==============================================

  const bannerSlides = [                  // 轮播图片路径数组
    '/zl.github.io/images/1.jpg',         // 第 1 张
    '/zl.github.io/images/2.jpg',         // 第 2 张
    '/zl.github.io/images/3.jpg'          // 第 3 张
  ];

  (function() {
    const banner = document.getElementById('banner');
    const header = document.getElementById('header');
    if (!banner || bannerSlides.length === 0) return;

    /* 构建 HTML：首张图直接设 src，其余图用 data-src 延迟加载 */
    let imgs = '', dots = '';
    for (let i = 0; i < bannerSlides.length; i++) {
      const srcAttr = i === 0 ? ' src="' + bannerSlides[i] + '"' : ' data-src="' + bannerSlides[i] + '"';
      imgs += '<img class="banner-slide' + (i === 0 ? ' is-active' : '') + '"' + srcAttr + ' alt="">';
      dots += '<button class="banner-dot' + (i === 0 ? ' is-active' : '') + '"></button>';
    }
    banner.insertAdjacentHTML('beforeend', imgs);
    header.insertAdjacentHTML('beforeend',
      '<button class="banner-arrow banner-prev">&#8249;</button>' +
      '<button class="banner-arrow banner-next">&#8250;</button>' +
      '<div class="banner-dots">' + dots + '</div>'
    );

    const slideEls = banner.querySelectorAll('.banner-slide');
    const dotEls  = header.querySelectorAll('.banner-dot');

    // 标记每张图是否已触发加载，避免重复设置 src
    const loaded = [true, false, false];

    // 懒加载指定索引的图片（从 data-src 搬到 src）
    function lazyLoad(i) {
      if (loaded[i]) return;
      const el = slideEls[i];
      const src = el.getAttribute('data-src');
      if (!src) return;
      el.setAttribute('src', src);
      el.removeAttribute('data-src');
      loaded[i] = true;
    }

    // 首张图片加载完成 → 移除骨架屏 + 预加载第 2 张
    const firstSlide = slideEls[0];
    function onFirstLoad() {
      banner.classList.add('is-loaded');
      lazyLoad(1);
    }
    if (firstSlide.complete) { onFirstLoad(); }
    else { firstSlide.addEventListener('load', onFirstLoad); }

    let idx = 0;
    let timer;

    function go(n) {
      slideEls[idx].classList.remove('is-active');
      dotEls[idx].classList.remove('is-active');
      idx = (n + bannerSlides.length) % bannerSlides.length;
      lazyLoad(idx);                                    // 切换到该图时才加载
      slideEls[idx].classList.add('is-active');
      dotEls[idx].classList.add('is-active');
    }

    function next()  { go(idx + 1); }     // 下一张
    function prev()  { go(idx - 1); }     // 上一张
    function start() { timer = setInterval(next, 4000); } // 每 4 秒自动切换
    function stop()  { clearInterval(timer); }             // 停止自动播放

    // 事件委托：在 header 上统一监听箭头和圆点的点击
    header.addEventListener('click', function(e) {
      if (e.target.classList.contains('banner-next')) {   // 点击右箭头
        e.stopPropagation(); stop(); next(); start();      // 手动切图后重置定时器
      } else if (e.target.classList.contains('banner-prev')) { // 点击左箭头
        e.stopPropagation(); stop(); prev(); start();
      } else if (e.target.classList.contains('banner-dot')) {  // 点击圆点
        e.stopPropagation(); stop();
        for (let i = 0; i < dotEls.length; i++) {         // 找到是第几个圆点
          if (dotEls[i] === e.target) { go(i); break; }
        }
        start();
      }
    });

    start();                              // 启动自动播放
  })();

  // ==============================================
  // 二、背景音乐
  // 页面右下角悬浮圆形按钮，默认静音自动循环播放
  // 点击取消静音 / 再次点击恢复静音
  // ==============================================

  (function() {
    var audio = null;                     // 延迟创建：首屏不加载 38MB 音频
    var playing = false;

    var btn = document.createElement('button');
    btn.id = 'music-btn';
    btn.title = '点击播放背景音乐';
    btn.innerHTML = '&#9834;';
    document.body.appendChild(btn);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      // 首次点击才创建 audio，避免页面加载时下载 38MB FLAC
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'bgm';
        audio.loop = true;
        audio.muted = true;
        audio.src = '/zl.github.io/audio/昔涟.flac';
        document.body.appendChild(audio);
        btn.title = '音乐加载中…';
      }
      if (!playing) {
        audio.muted = false;
        audio.play().then(function() {
          btn.classList.add('is-playing');
          btn.title = '音乐播放中 — 点击静音';
          playing = true;
        });
      } else {
        audio.muted = true;
        btn.classList.remove('is-playing');
        btn.title = '点击播放背景音乐';
        playing = false;
      }
    });
  })();

  // ==============================================
  // 三、搜索功能
  // 点击放大镜图标 → 滑出搜索框
  // 输入时实时搜索倒排索引
  // 支持上下箭头选择 + Enter 跳转 + Escape 关闭
  // ==============================================

  const searchWrap   = document.getElementById('search-form-wrap'); // 搜索框外层容器
  const searchInput  = document.querySelector('.search-form-input');// 搜索输入框
  const searchForm   = document.querySelector('.search-form');      // 搜索表单
  let isSearchAnim   = false;                                       // 动画锁：防止动画期间重复点击
  const searchAnimDuration = 200;                                   // 动画时长（与 CSS transition 一致）

  function startSearchAnim() { isSearchAnim = true; }               // 标记动画开始
  function stopSearchAnim(cb) {                                     // 动画结束后释放锁
    setTimeout(function() { isSearchAnim = false; if (cb) cb(); }, searchAnimDuration);
  }

  // 点击放大镜图标 → 滑入搜索框
  document.querySelector('.nav-search-btn').addEventListener('click', function() {
    if (isSearchAnim) return;             // 动画进行中，忽略重复点击

    startSearchAnim();                    // 加锁
    const old = document.getElementById('search-results'); // 清除旧搜索结果
    if (old) old.remove();
    searchInput.value = '';               // 清空输入框
    searchWrap.classList.add('is-active');// CSS transition 滑入
    stopSearchAnim(function() { searchInput.focus(); }); // 动画完成后聚焦
  });

  // 搜索框失去焦点 → 延迟关闭（等搜索结果点击事件先触发）
  searchInput.addEventListener('blur', function() {
    setTimeout(function() {
      if (!document.querySelector('.search-result-item:hover')) { // 鼠标不在结果项上
        startSearchAnim();
        searchWrap.classList.remove('is-active'); // CSS transition 滑出
        const r = document.getElementById('search-results');
        if (r) r.remove();                // 清除搜索结果
        stopSearchAnim();
      }
    }, 150);                              // 150ms 延迟，让 click 事件先触发
  });

  // ---- 本地搜索（倒排索引，O(1) 查词 → O(n) 交集排序） ----
  let searchIndex = null;                 // 缓存已加载的倒排索引

  // 加载搜索索引（仅首次请求网络，之后走缓存）
  function loadSearchData(cb) {
    if (searchIndex) return cb(searchIndex); // 已缓存，直接回调
    fetch('/zl.github.io/search-index.json') // 请求倒排索引 JSON
      .then(function(r) { return r.json(); })// 解析 JSON
      .then(function(data) { searchIndex = data; cb(data); }); // 缓存后回调
  }

  // 倒排索引搜索：每个 token 在索引中查找匹配的文章，按命中数降序排列
  function doSearch(query, data) {
    const tokens = tokenize(query);       // 查询分词（全局 tokenize，来自 tokenize.js）
    if (!tokens.length) return [];        // 空查询 → 空结果

    const scores = {};                    // { slug: 命中次数 }
    tokens.forEach(function(token) {
      const ids = data.index[token];          // 在倒排索引中查找
      if (!ids) return;                   // 该 token 无匹配
      ids.forEach(function(id) { scores[id] = (scores[id] || 0) + 1; }); // 累加命中数
    });

    return Object.keys(scores)            // 取出所有匹配的 slug
      .sort(function(a, b) {              // 排序：命中数降序 → 日期降序
        var diff = scores[b] - scores[a]; // 命中数差
        if (diff !== 0) return diff;      // 命中数不同：高的在前
        return data.articles[b].date.localeCompare(data.articles[a].date); // 命中数相同：日期新的在前
      })
      .map(function(id) {                 // slug → 结果对象
        var doc = data.articles[id];      // 从文章元数据表取值
        return { title: doc.title, url: '/zl.github.io/posts/' + id + '/', date: doc.date };
      });
  }

  // 显示搜索结果列表（挂到 #search-form-wrap 内部，CSS 自然定位）
  function showResults(results) {
    const old = document.getElementById('search-results');
    if (old) old.remove();                // 清除旧结果

    const div = document.createElement('div');
    div.id = 'search-results';            // CSS 中已定义绝对定位（top:100%）

    if (!results.length) {
      div.innerHTML = '<div class="search-no-result">没有找到相关文章</div>';
    } else {
      let h = '';                         // 拼接搜索结果 HTML
      results.forEach(function(item) {
        h += '<a class="search-result-item" href="' + item.url + '">'
           + '<span class="search-result-title">' + item.title + '</span>'   // 文章标题
           + '<span class="search-result-date">' + item.date + '</span>'     // 发布日期
           + '</a>';
      });
      div.innerHTML = h;
    }
    searchWrap.appendChild(div);          // 挂到搜索框容器内部，无需手动算坐标
  }

  // 输入事件：实时搜索
  searchInput.addEventListener('input', function() {
    loadSearchData(function(data) { showResults(doSearch(searchInput.value, data)); });
  });

  // 回车提交：阻止默认跳转，触发搜索
  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();                   // 阻止表单默认提交（会跳转到 Google）
    loadSearchData(function(data) { showResults(doSearch(searchInput.value, data)); });
  });

  // 键盘导航：上下箭头选结果 + Enter 跳转 + Escape 关闭
  searchInput.addEventListener('keydown', function(e) {
    const items = document.querySelectorAll('.search-result-item'); // 所有结果项
    if (!items.length) return;            // 没有结果时不处理

    const cur = document.querySelector('.search-result-item.active'); // 当前高亮项

    if (e.key === 'ArrowDown') {          // ↓：下一项
      e.preventDefault();                 // 阻止光标移动
      if (!cur) { items[0].classList.add('active'); } // 无选中 → 选第一项
      else {
        const idx = Array.prototype.indexOf.call(items, cur); // 当前项索引
        cur.classList.remove('active');   // 取消当前
        items[(idx + 1) % items.length].classList.add('active'); // 循环下一项
      }
    } else if (e.key === 'ArrowUp') {     // ↑：上一项
      e.preventDefault();
      if (!cur) { items[items.length - 1].classList.add('active'); } // 无选中 → 选最后一项
      else {
        const idx = Array.prototype.indexOf.call(items, cur);
        cur.classList.remove('active');
        items[(idx - 1 + items.length) % items.length].classList.add('active'); // 循环上一项
      }
    } else if (e.key === 'Enter') {       // Enter：跳转到选中文章
      e.preventDefault();
      if (cur) window.location.href = cur.getAttribute('href'); // 获取结果项的 href
    } else if (e.key === 'Escape') {      // Esc：关闭搜索
      const r = document.getElementById('search-results');
      if (r) r.remove();                  // 移除搜索结果
      searchInput.blur();                 // 让搜索框失焦（触发关闭动画）
    }
  });

  // ==============================================
  // 四、分享功能
  // 点击"分享"链接 → 弹出分享面板（QQ / 微信 / QQ空间 / 复制）
  // ==============================================

  let shareBox = null;                    // 单例分享弹窗，全局复用

  // 获取元素相对于文档的绝对坐标（getBoundingClientRect + 滚动偏移）
  function getOffset(el) {
    const r = el.getBoundingClientRect(); // 视口相对坐标
    return { top: r.top + window.scrollY, left: r.left + window.scrollX }; // 文档绝对坐标
  }

  // 全局点击代理：处理分享相关逻辑
  document.addEventListener('click', function(e) {

    // ---- 点击"分享"链接 ----
    if (e.target.closest('.article-share-link')) {
      e.stopPropagation();               // 阻止冒泡到 body（否则立即关闭）
      const link       = e.target.closest('.article-share-link');
      const url        = link.getAttribute('data-url');       // 文章完整 URL
      const encodedUrl = encodeURIComponent(url);              // URL 编码（社交平台参数用）
      const title      = link.getAttribute('data-title');     // 文章标题
      const offset     = getOffset(link);                      // 分享按钮的文档坐标

      // 构建分享按钮 HTML（每次点击重新生成，因为 URL 可能不同）
      function buildShareHtml() {
        return '<a href="https://connect.qq.com/widget/shareqq/index.html?url=' + encodedUrl + '&title=' + encodeURIComponent(title) + '&source=南不及晚风的博客" class="article-share-qq" target="_blank" rel="noopener noreferrer" title="分享到QQ">QQ</a>' +  // QQ 好友分享
               '<button class="article-share-wechat" title="复制链接，打开微信粘贴即可分享">微信</button>' +  // 微信无网页分享 API，改为复制链接
               '<a href="https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=' + encodedUrl + '&title=' + encodeURIComponent(title) + '" class="article-share-qzone" target="_blank" rel="noopener noreferrer" title="分享到QQ空间">QQ空间</a>' +  // QQ 空间分享
               '<button class="article-share-copy" title="复制链接到剪贴板">复制</button>';  // 通用复制
      }

      if (!shareBox) {                    // 首次创建弹窗
        shareBox = document.createElement('div');
        shareBox.className = 'article-share-box'; // CSS 默认 display:none
        shareBox.innerHTML =
          '<input class="article-share-input" value="' + url + '">' +  // 可复制的链接输入框
          '<div class="article-share-links">' + buildShareHtml() + '</div>'; // 社交按钮
        document.body.appendChild(shareBox);  // 挂到 body
      } else {                            // 复用已有弹窗
        shareBox.querySelector('.article-share-input').value = url;   // 更新链接
        shareBox.querySelector('.article-share-links').innerHTML = buildShareHtml(); // 更新按钮
      }

      shareBox.style.top  = (offset.top + 25) + 'px';  // 定位：按钮下方 25px
      shareBox.style.left = offset.left + 'px';        // 对齐按钮左侧
      shareBox.classList.add('is-active');             // CSS display:block
      return;
    }

    // ---- 点击弹窗内部 ----
    if (e.target.closest('.article-share-box')) {
      e.stopPropagation();               // 不冒泡到 body
      if (e.target.classList.contains('article-share-box-input')) e.target.select(); // 点击输入框 → 全选链接
      if (e.target.classList.contains('article-share-copy') || e.target.classList.contains('article-share-wechat')) {
        const input = shareBox.querySelector('.article-share-input');
        navigator.clipboard.writeText(input.value).then(function() { // 写入剪贴板
          var orig = e.target.textContent; // 保存原始文字
          e.target.textContent = e.target.classList.contains('article-share-wechat') ? '已复制，去微信粘贴' : '已复制';
          setTimeout(function() { e.target.textContent = orig; }, 2000); // 2 秒后恢复
        });
      }
      return;
    }

    // ---- 点击其他地方 → 关闭弹窗 ----
    if (shareBox) shareBox.classList.remove('is-active');
  });

  // ==============================================
  // 五、图片灯箱（原生实现，替代 fancybox）
  // 自动为文章正文中的图片包裹点击放大链接
  // 支持同组图片左右切换 + 键盘导航
  // ==============================================

  let lbOverlay, lbImg, lbCaption;        // 灯箱 DOM 元素引用
  let lbGroup = [];                       // 当前组的图片链接数组
  let lbIndex = 0;                        // 当前显示图片在组内的索引

  // 确保灯箱 DOM 已构建（懒初始化，首次使用时才创建）
  function ensureLightbox() {
    if (lbOverlay) return;                // 已构建，跳过
    lbOverlay = document.createElement('div');
    lbOverlay.id = 'lightbox-overlay';    // 固定定位全屏遮罩
    lbOverlay.innerHTML =
      '<div class="lightbox-bg"></div>' +           // 半透明背景（点击关闭）
      '<button class="lightbox-close">&times;</button>' +  // 关闭按钮 ×
      '<button class="lightbox-prev">&#8249;</button>' +   // 上一张 ‹
      '<button class="lightbox-next">&#8250;</button>' +   // 下一张 ›
      '<img class="lightbox-img" src="">' +                 // 大图
      '<div class="lightbox-caption"></div>';               // 图片说明文字
    document.body.appendChild(lbOverlay);
    lbImg     = lbOverlay.querySelector('.lightbox-img');     // 缓存图片元素引用
    lbCaption = lbOverlay.querySelector('.lightbox-caption'); // 缓存说明文字元素引用

      var savedOverflow;                            // 打开灯箱前 body 的 overflow 值

    // 关闭灯箱
    function close() {
      lbOverlay.classList.remove('is-active'); // 隐藏遮罩
      document.body.style.overflow = savedOverflow; // 恢复之前的滚动状态（不盲清，避免覆盖其他组件的设置）
    }

    // 显示组内第 n 张（n 支持负值，自动循环）
    function show(n) {
      lbIndex = (n + lbGroup.length) % lbGroup.length; // 循环取模
      lbImg.src = lbGroup[lbIndex].href;               // 设置大图 src
      lbCaption.textContent = lbGroup[lbIndex].getAttribute('data-caption') || ''; // 设置说明
    }

    lbOverlay.querySelector('.lightbox-bg').addEventListener('click', close);      // 点击背景关闭
    lbOverlay.querySelector('.lightbox-close').addEventListener('click', close);    // 点击 × 关闭
    lbOverlay.querySelector('.lightbox-prev').addEventListener('click', function() { show(lbIndex - 1); }); // 上一张
    lbOverlay.querySelector('.lightbox-next').addEventListener('click', function() { show(lbIndex + 1); }); // 下一张

    // 全局键盘导航（仅在灯箱打开时响应）
    document.addEventListener('keydown', function(e) {
      if (!lbOverlay.classList.contains('is-active')) return; // 灯箱未打开，忽略
      if (e.key === 'Escape')    close();             // Esc 关闭
      if (e.key === 'ArrowLeft')  show(lbIndex - 1);  // ← 上一张
      if (e.key === 'ArrowRight') show(lbIndex + 1);  // → 下一张
    });
  }

  // 初始化灯箱：为文章正文中的图片包裹点击放大链接
  function initLightbox() {
    ensureLightbox();                     // 确保 DOM 已构建

    document.querySelectorAll('.article-entry').forEach(function(entry, i) {
                                          // 遍历每篇文章的正文区域，i = 文章序号（用于分组）
      entry.querySelectorAll('img').forEach(function(img) {
                                          // 遍历正文中的所有图片
        if (img.closest('a[data-lightbox]')) return; // 已包裹过，跳过

        if (img.alt) {                    // 有 alt 文字 → 在图片下方添加说明
          img.insertAdjacentHTML('afterend', '<span class="caption">' + img.alt + '</span>');
        }

        const a = document.createElement('a'); // 创建包裹 <a>
        a.href = img.src;                 // 链接指向原图
        a.setAttribute('data-lightbox', 'gallery');    // 标记为灯箱图片
        a.setAttribute('data-caption', img.alt || ''); // 说明文字
        a.setAttribute('data-group', 'article' + i);   // 分组：同一篇文章的图可左右切换
        img.parentElement.insertBefore(a, img);        // 插入 <a> 到图片前面
        a.appendChild(img);               // 把图片移入 <a>
      });
    });
  }

  // 全局点击代理：点击灯箱图片 → 打开灯箱
  document.body.addEventListener('click', function(e) {
    const link = e.target.closest('a[data-lightbox="gallery"]'); // 是否点击了灯箱链接
    if (!link) return;                    // 不是灯箱链接，忽略
    e.preventDefault();                   // 阻止默认跳转

    ensureLightbox();                     // 确保灯箱 DOM 已构建
    const group = link.getAttribute('data-group'); // 获取分组标识
    lbGroup = Array.from(document.querySelectorAll('a[data-lightbox="gallery"][data-group="' + group + '"]')); // 同组所有图片
    lbIndex = lbGroup.indexOf(link);      // 当前图片在组内的索引
    lbImg.src = link.href;                // 设置大图
    lbCaption.textContent = link.getAttribute('data-caption') || ''; // 设置说明
    lbOverlay.classList.add('is-active'); // 显示灯箱
    savedOverflow = document.body.style.overflow; // 保存打开灯箱前的 overflow 值
    document.body.style.overflow = 'hidden'; // 禁止页面滚动
  });

  initLightbox();                         // 页面加载时初始化灯箱包裹

  // ==============================================
  // 六、滚动渐入动画
  // 文章卡片在滚动进入视口时带淡入上移效果
  // ==============================================

  (function() {
    if (typeof window === 'undefined') return;

    // 为首页文章卡片和侧边栏部件添加动画初始状态
    const cards = document.querySelectorAll('.article, .widget-wrap');
    if (!cards.length) return;

    // 使用 IntersectionObserver 做高性能滚动检测
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

      cards.forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
      });
    }
  })();

  // ==============================================
  // 七、移动端菜单
  // 点击汉堡图标 → #wrap 右移，露出左侧菜单
  // 点击页面内容区 → 关闭菜单
  // ==============================================

  const container = document.getElementById('container'); // 最外层容器 #container
  const wrap      = document.getElementById('wrap');      // 内容包装器 #wrap
  let isMobileNavAnim = false;                            // 动画锁：防止动画期间重复点击
  const mobileNavAnimDuration = 200;                      // 动画时长（与 CSS transition 一致）

  function startMobileAnim()  { isMobileNavAnim = true; }                    // 标记动画开始
  function stopMobileAnim()   { setTimeout(function() { isMobileNavAnim = false; }, mobileNavAnimDuration); } // 延迟解锁

  // 点击汉堡图标：开关菜单
  document.getElementById('main-nav-toggle').addEventListener('click', function() {
    if (isMobileNavAnim) return;          // 动画进行中，忽略
    startMobileAnim();                    // 加锁
    container.classList.toggle('mobile-nav-open'); // 切换 CSS class（#wrap left:280px + overflow:hidden）
    stopMobileAnim();                     // 动画结束后解锁
  });

  // 点击内容区（#wrap）：如果菜单打开则关闭
  wrap.addEventListener('click', function() {
    if (isMobileNavAnim || !container.classList.contains('mobile-nav-open')) return; // 动画中或菜单已关
    container.classList.remove('mobile-nav-open'); // 关闭菜单
  });

})();                                     // IIFE 结束
