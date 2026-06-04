/* ===================================
   博客前端脚本 — 页面交互逻辑（原生 JS，零外部依赖）

   功能模块：
     一、Banner 轮播图 — 三图自动切换 + 箭头 + 圆点
     二、背景音乐   — 右下角悬浮按钮，默认静音
     三、搜索       — 本地 JSON 搜索 + 键盘导航
     四、分享       — 文章链接复制 + 社交平台分享
     五、图片灯箱   — 原生灯箱自动包裹
     六、移动端菜单 — 汉堡菜单侧滑
   =================================== */

(function() {

  // ==============================================
  // 一、Banner 轮播图
  // 三张图片自动循环，支持左右箭头和底部圆点切换
  // ==============================================

  const bannerSlides = [
    '/zl.github.io/images/1.jpg',
    '/zl.github.io/images/2.jpg',
    '/zl.github.io/images/3.jpg'
  ];

  (function() {
    const banner = document.getElementById('banner');
    const header = document.getElementById('header');
    if (!banner || bannerSlides.length === 0) return;

    /* 预加载第一张图片，减少首屏等待时间 */
    const preload = new Image();
    preload.src = bannerSlides[0];

    /* 构建图片和圆点的 HTML */
    let imgs = '', dots = '';
    for (let i = 0; i < bannerSlides.length; i++) {
      imgs += '<img class="banner-slide' + (i === 0 ? ' is-active' : '') + '" src="' + bannerSlides[i] + '" alt="">';
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

    let idx = 0;
    let timer;

    // 切换到第 n 张
    function go(n) {
      slideEls[idx].classList.remove('is-active');
      dotEls[idx].classList.remove('is-active');
      idx = (n + bannerSlides.length) % bannerSlides.length;
      slideEls[idx].classList.add('is-active');
      dotEls[idx].classList.add('is-active');
    }

    function next()  { go(idx + 1); }
    function prev()  { go(idx - 1); }
    function start() { timer = setInterval(next, 4000); }
    function stop()  { clearInterval(timer); }

    header.addEventListener('click', function(e) {
      if (e.target.classList.contains('banner-next')) {
        e.stopPropagation(); stop(); next(); start();
      } else if (e.target.classList.contains('banner-prev')) {
        e.stopPropagation(); stop(); prev(); start();
      } else if (e.target.classList.contains('banner-dot')) {
        e.stopPropagation(); stop();
        for (let i = 0; i < dotEls.length; i++) {
          if (dotEls[i] === e.target) { go(i); break; }
        }
        start();
      }
    });

    start();
  })();

  // ==============================================
  // 二、背景音乐
  // 页面右下角悬浮圆形按钮，默认静音自动循环播放
  // 点击取消静音 / 再次点击恢复静音
  // ==============================================

  (function() {
    const audio = document.createElement('audio');
    audio.id = 'bgm';
    audio.src = '/zl.github.io/audio/昔涟.flac';
    audio.autoplay = true;
    audio.muted = true;
    audio.loop = true;
    document.body.appendChild(audio);

    const btn = document.createElement('button');
    btn.id = 'music-btn';
    btn.title = '音乐';
    btn.innerHTML = '&#9834;';
    document.body.appendChild(btn);

    let playing = false;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!playing) {
        audio.muted = false;
        audio.play().then(function() {
          btn.classList.add('is-playing');
          playing = true;
        });
      } else {
        audio.muted = true;
        btn.classList.remove('is-playing');
        playing = false;
      }
    });
  })();

  // ==============================================
  // 三、搜索功能
  // 点击放大镜图标 → 滑出搜索框
  // 输入时实时搜索 search.json
  // 支持上下箭头选择 + Enter 跳转 + Escape 关闭
  // ==============================================

  const searchWrap   = document.getElementById('search-form-wrap');
  const searchInput  = document.querySelector('.search-form-input');
  const searchForm   = document.querySelector('.search-form');
  let isSearchAnim   = false;
  const searchAnimDuration = 200;

  function startSearchAnim() { isSearchAnim = true; }
  function stopSearchAnim(cb) {
    setTimeout(function() { isSearchAnim = false; if (cb) cb(); }, searchAnimDuration);
  }

  function getOffset(el) {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, left: r.left + window.scrollX };
  }

  document.querySelector('.nav-search-btn').addEventListener('click', function() {
    if (isSearchAnim) return;

    startSearchAnim();
    const old = document.getElementById('search-results');
    if (old) old.remove();
    searchInput.value = '';
    searchWrap.classList.add('is-active');
    stopSearchAnim(function() { searchInput.focus(); });
  });

  searchInput.addEventListener('blur', function() {
    setTimeout(function() {
      if (!document.querySelector('.search-result-item:hover')) {
        startSearchAnim();
        searchWrap.classList.remove('is-active');
        const r = document.getElementById('search-results');
        if (r) r.remove();
        stopSearchAnim();
      }
    }, 150);
  });

  // ---- 本地搜索（从 search.json 加载索引） ----
  let searchData = null;

  function loadSearchData(cb) {
    if (searchData) return cb(searchData);
    fetch('/zl.github.io/search.json')
      .then(function(r) { return r.json(); })
      .then(function(data) { searchData = data; cb(data); });
  }

  function doSearch(query, data) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return data.filter(function(item) {
      return [item.title, item.tags.join(' '), item.content].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }

  function showResults(results) {
    const old = document.getElementById('search-results');
    if (old) old.remove();

    const offset = getOffset(searchForm);
    const width  = searchForm.offsetWidth;
    const top    = offset.top + searchForm.offsetHeight + 5;
    const left   = offset.left;

    const div = document.createElement('div');
    div.id = 'search-results';
    div.style.cssText = 'position:absolute;top:' + top + 'px;left:' + left + 'px;width:' + width + 'px';

    if (!results.length) {
      div.innerHTML = '<div class="search-no-result">没有找到相关文章</div>';
    } else {
      let h = '';
      results.forEach(function(item) {
        h += '<a class="search-result-item" href="' + item.url + '">'
           + '<span class="search-result-title">' + item.title + '</span>'
           + '<span class="search-result-date">' + item.date + '</span>'
           + '</a>';
      });
      div.innerHTML = h;
    }
    document.body.appendChild(div);
  }

  searchInput.addEventListener('input', function() {
    loadSearchData(function(data) { showResults(doSearch(searchInput.value, data)); });
  });

  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    loadSearchData(function(data) { showResults(doSearch(searchInput.value, data)); });
  });

  searchInput.addEventListener('keydown', function(e) {
    const items = document.querySelectorAll('.search-result-item');
    if (!items.length) return;

    const cur = document.querySelector('.search-result-item.active');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!cur) { items[0].classList.add('active'); }
      else {
        const idx = Array.prototype.indexOf.call(items, cur);
        cur.classList.remove('active');
        items[(idx + 1) % items.length].classList.add('active');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cur) { items[items.length - 1].classList.add('active'); }
      else {
        const idx = Array.prototype.indexOf.call(items, cur);
        cur.classList.remove('active');
        items[(idx - 1 + items.length) % items.length].classList.add('active');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cur) window.location.href = cur.getAttribute('href');
    } else if (e.key === 'Escape') {
      const r = document.getElementById('search-results');
      if (r) r.remove();
      searchInput.blur();
    }
  });

  // ==============================================
  // 四、分享功能
  // 点击"分享"链接 → 弹出分享面板
  // ==============================================

  let shareBox = null;  // 单例分享弹窗，复用

  document.addEventListener('click', function(e) {
    // 点击分享链接
    if (e.target.closest('.article-share-link')) {
      e.stopPropagation();
      const link = e.target.closest('.article-share-link');
      const url        = link.getAttribute('data-url');
      const encodedUrl = encodeURIComponent(url);
      const title      = link.getAttribute('data-title');
      const offset     = getOffset(link);

      if (!shareBox) {
        shareBox = document.createElement('div');
        shareBox.className = 'article-share-box';
        shareBox.innerHTML =
          '<input class="article-share-input" value="' + url + '">' +
          '<div class="article-share-links">' +
            '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodedUrl + '" class="article-share-twitter" target="_blank" rel="noopener noreferrer" title="Twitter"><span class="fa fa-twitter"></span></a>' +
            '<a href="https://www.facebook.com/sharer.php?u=' + encodedUrl + '" class="article-share-facebook" target="_blank" title="Facebook"><span class="fa fa-facebook"></span></a>' +
            '<a href="http://pinterest.com/pin/create/button/?url=' + encodedUrl + '" class="article-share-pinterest" target="_blank" title="Pinterest"><span class="fa fa-pinterest"></span></a>' +
            '<a href="https://www.linkedin.com/shareArticle?mini=true&url=' + encodedUrl + '" class="article-share-linkedin" target="_blank" title="LinkedIn"><span class="fa fa-linkedin"></span></a>' +
          '</div>';
        document.body.appendChild(shareBox);
      } else {
        shareBox.querySelector('.article-share-input').value = url;
        const links = shareBox.querySelector('.article-share-links');
        links.innerHTML =
          '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodedUrl + '" class="article-share-twitter" target="_blank" rel="noopener noreferrer" title="Twitter"><span class="fa fa-twitter"></span></a>' +
          '<a href="https://www.facebook.com/sharer.php?u=' + encodedUrl + '" class="article-share-facebook" target="_blank" title="Facebook"><span class="fa fa-facebook"></span></a>' +
          '<a href="http://pinterest.com/pin/create/button/?url=' + encodedUrl + '" class="article-share-pinterest" target="_blank" title="Pinterest"><span class="fa fa-pinterest"></span></a>' +
          '<a href="https://www.linkedin.com/shareArticle?mini=true&url=' + encodedUrl + '" class="article-share-linkedin" target="_blank" title="LinkedIn"><span class="fa fa-linkedin"></span></a>';
      }

      shareBox.style.top  = (offset.top + 25) + 'px';
      shareBox.style.left = offset.left + 'px';
      shareBox.classList.add('is-active');
      return;
    }

    // 点击弹窗内
    if (e.target.closest('.article-share-box')) {
      e.stopPropagation();
      if (e.target.classList.contains('article-share-box-input')) e.target.select();
      return;
    }

    // 其他地方 — 关闭所有弹窗
    if (shareBox) shareBox.classList.remove('is-active');
  });

  // ==============================================
  // 五、图片灯箱（原生实现，替代 fancybox）
  // 自动为文章正文中的图片包裹点击放大链接
  // ==============================================

  let lbOverlay, lbImg, lbCaption;
  let lbGroup = [];
  let lbIndex = 0;

  function ensureLightbox() {
    if (lbOverlay) return;
    lbOverlay = document.createElement('div');
    lbOverlay.id = 'lightbox-overlay';
    lbOverlay.innerHTML =
      '<div class="lightbox-bg"></div>' +
      '<button class="lightbox-close">&times;</button>' +
      '<button class="lightbox-prev">&#8249;</button>' +
      '<button class="lightbox-next">&#8250;</button>' +
      '<img class="lightbox-img" src="">' +
      '<div class="lightbox-caption"></div>';
    document.body.appendChild(lbOverlay);
    lbImg     = lbOverlay.querySelector('.lightbox-img');
    lbCaption = lbOverlay.querySelector('.lightbox-caption');

    function close() {
      lbOverlay.classList.remove('is-active');
      document.body.style.overflow = '';
    }

    function show(n) {
      lbIndex = (n + lbGroup.length) % lbGroup.length;
      lbImg.src = lbGroup[lbIndex].href;
      lbCaption.textContent = lbGroup[lbIndex].getAttribute('data-caption') || '';
    }

    lbOverlay.querySelector('.lightbox-bg').addEventListener('click', close);
    lbOverlay.querySelector('.lightbox-close').addEventListener('click', close);
    lbOverlay.querySelector('.lightbox-prev').addEventListener('click', function() { show(lbIndex - 1); });
    lbOverlay.querySelector('.lightbox-next').addEventListener('click', function() { show(lbIndex + 1); });

    document.addEventListener('keydown', function(e) {
      if (!lbOverlay.classList.contains('is-active')) return;
      if (e.key === 'Escape')    close();
      if (e.key === 'ArrowLeft')  show(lbIndex - 1);
      if (e.key === 'ArrowRight') show(lbIndex + 1);
    });
  }

  function initLightbox() {
    ensureLightbox();

    document.querySelectorAll('.article-entry').forEach(function(entry, i) {
      entry.querySelectorAll('img').forEach(function(img) {
        if (img.closest('a[data-lightbox]')) return;

        if (img.alt) {
          img.insertAdjacentHTML('afterend', '<span class="caption">' + img.alt + '</span>');
        }

        const a = document.createElement('a');
        a.href = img.src;
        a.setAttribute('data-lightbox', 'gallery');
        a.setAttribute('data-caption', img.alt || '');
        a.setAttribute('data-group', 'article' + i);
        img.parentElement.insertBefore(a, img);
        a.appendChild(img);
      });
    });
  }

  document.body.addEventListener('click', function(e) {
    const link = e.target.closest('a[data-lightbox="gallery"]');
    if (!link) return;
    e.preventDefault();

    ensureLightbox();
    const group = link.getAttribute('data-group');
    lbGroup = Array.from(document.querySelectorAll('a[data-lightbox="gallery"][data-group="' + group + '"]'));
    lbIndex = lbGroup.indexOf(link);
    lbImg.src = link.href;
    lbCaption.textContent = link.getAttribute('data-caption') || '';
    lbOverlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  });

  initLightbox();

  // ==============================================
  // 六、移动端菜单
  // 点击汉堡图标 → #wrap 右移，露出左侧菜单
  // ==============================================

  const container = document.getElementById('container');
  const wrap      = document.getElementById('wrap');
  let isMobileNavAnim = false;
  const mobileNavAnimDuration = 200;

  function startMobileAnim()  { isMobileNavAnim = true; }
  function stopMobileAnim()   { setTimeout(function() { isMobileNavAnim = false; }, mobileNavAnimDuration); }

  document.getElementById('main-nav-toggle').addEventListener('click', function() {
    if (isMobileNavAnim) return;
    startMobileAnim();
    container.classList.toggle('mobile-nav-open');
    stopMobileAnim();
  });

  wrap.addEventListener('click', function() {
    if (isMobileNavAnim || !container.classList.contains('mobile-nav-open')) return;
    container.classList.remove('mobile-nav-open');
  });

})();
