/* ===================================
   博客前端脚本 — 页面交互逻辑

   依赖：
     jQuery 3.6.4（必须先加载）
     fancybox（可选，图片灯箱）

   功能模块：
     一、Banner 轮播图 — 三图自动切换 + 箭头 + 圆点
     二、背景音乐   — 右下角悬浮按钮，默认静音
     三、搜索       — 本地 JSON 搜索 + 键盘导航
     四、分享       — 文章链接复制 + 社交平台分享
     五、图片灯箱   — fancybox 自动包裹
     六、移动端菜单 — 汉堡菜单侧滑
   =================================== */

(function($) {

  // ==============================================
  // 一、Banner 轮播图
  // 三张图片自动循环，支持左右箭头和底部圆点切换
  // ==============================================

  const bannerSlides = [                          // 轮播图片路径数组
    '/zl.github.io/images/1.jpg',                 // 第1张
    '/zl.github.io/images/2.jpg',                 // 第2张
    '/zl.github.io/images/3.jpg'                  // 第3张
  ];

  (function() {
    const $banner = $('#banner');                  // 轮播容器
    const $header = $('#header');                  // header（箭头和圆点挂在这里，z-index 才能生效）
    if (!$banner.length || bannerSlides.length === 0) return; // 没有 banner 或没配置图片则退出

    /* 预加载第一张图片，减少首屏等待时间 */
    const preload = new Image();
    preload.src = bannerSlides[0];

    /* 构建图片和圆点的 HTML */
    let imgs = '', dots = '';
    for (let i = 0; i < bannerSlides.length; i++) {
      imgs += '<img class="banner-slide' + (i === 0 ? ' is-active' : '') + '" src="' + bannerSlides[i] + '" alt="">';
      dots += '<button class="banner-dot' + (i === 0 ? ' is-active' : '') + '"></button>';
    }
    $banner.append(imgs);                          // 图片放入 #banner
    $header.append(                                // 箭头和圆点放入 #header（z-index 高于 #banner）
      '<button class="banner-arrow banner-prev">&#8249;</button>' +  // 左箭头
      '<button class="banner-arrow banner-next">&#8250;</button>' +  // 右箭头
      '<div class="banner-dots">' + dots + '</div>'                  // 圆点容器
    );

    let idx = 0;                                   // 当前显示的图片索引
    let timer;                                     // 自动播放定时器

    // 切换到第 n 张
    function go(n) {
      $banner.find('.banner-slide').eq(idx).removeClass('is-active'); // 隐藏当前
      $header.find('.banner-dot').eq(idx).removeClass('is-active');   // 取消当前圆点
      idx = (n + bannerSlides.length) % bannerSlides.length;          // 循环索引（支持负值）
      $banner.find('.banner-slide').eq(idx).addClass('is-active');    // 显示新图
      $header.find('.banner-dot').eq(idx).addClass('is-active');      // 高亮新圆点
    }

    function next()  { go(idx + 1); }              // 下一张
    function prev()  { go(idx - 1); }              // 上一张
    function start() { timer = setInterval(next, 4000); } // 开始自动播放：4秒切换
    function stop()  { clearInterval(timer); }             // 停止自动播放

    // 点击右箭头：停止自动播放 → 切下一张 → 重新计时（防止手动切换后立即被自动切走）
    $header.on('click', '.banner-next', function(e) { e.stopPropagation(); stop(); next(); start(); });
    // 点击左箭头
    $header.on('click', '.banner-prev', function(e) { e.stopPropagation(); stop(); prev(); start(); });
    // 点击圆点：跳到对应图片
    $header.on('click', '.banner-dot',  function(e) { e.stopPropagation(); stop(); go($header.find('.banner-dot').index(this)); start(); });

    start();                                       // 启动自动播放
  })();

  // ==============================================
  // 二、背景音乐
  // 页面右下角悬浮圆形按钮，默认静音自动循环播放
  // 点击取消静音 / 再次点击恢复静音
  // ==============================================

  (function() {
    const $audio = $('<audio id="bgm" src="/zl.github.io/audio/昔涟.flac" autoplay muted loop></audio>');
    $('body').append($audio);                      // 将 <audio> 追加到页面
    const audio = $audio[0];                       // 原生 DOM 元素，用于调用 .play() 和 .muted

    const $btn = $('<button id="music-btn" title="音乐">&#9834;</button>');
    $('body').append($btn);                        // 将按钮追加到页面（CSS 固定定位在右下角）

    let playing = false;                           // 标记是否真正播放（muted 不算 playing）
    $btn.on('click', function(e) {
      e.stopPropagation();
      if (!playing) {
        audio.muted = false;                       // 取消静音
        audio.play().then(function() {             // 开始播放（返回 Promise）
          $btn.addClass('is-playing');             // 按钮变蓝色
          playing = true;
        });
      } else {
        audio.muted = true;                        // 恢复静音
        $btn.removeClass('is-playing');            // 按钮恢复默认色
        playing = false;
      }
    });
  })();

  // ==============================================
  // 三、搜索功能
  // 点击放大镜图标 → 滑出搜索框
  // 输入时实时搜索 search.json（本地 JSON 索引）
  // 支持上下箭头选择 + Enter 跳转 + Escape 关闭
  // ==============================================

  const $searchWrap = $('#search-form-wrap');      // 搜索框容器
  const $searchInput = $('.search-form-input');    // 搜索输入框
  let isSearchAnim = false;                        // 防止动画期间重复点击
  const searchAnimDuration = 200;                  // 动画时长（毫秒，与 CSS transition 一致）

  // 搜索框滑入
  function startSearchAnim() { isSearchAnim = true; }

  // 搜索框滑出后执行回调（延时 = 动画时长）
  function stopSearchAnim(callback) {
    setTimeout(function() {
      isSearchAnim = false;
      callback && callback();
    }, searchAnimDuration);
  }

  // 点击放大镜图标：滑入搜索框
  $('.nav-search-btn').on('click', function() {
    if (isSearchAnim) return;                      // 动画进行中，忽略重复点击

    startSearchAnim();
    $('#search-results').remove();                 // 清除上次的搜索结果
    $searchInput.val('');                          // 清空输入框
    $searchWrap.addClass('is-active');             // 触发 CSS 滑入动画
    stopSearchAnim(function() {
      $searchInput.focus();                        // 动画完成后聚焦输入框
    });
  });

  // 搜索框失去焦点 → 延迟关闭（让搜索结果点击事件有机会触发）
  $searchInput.on('blur', function() {
    setTimeout(function() {
      if (!$('.search-result-item:hover').length) { // 鼠标没有悬停在结果项上才关闭
        startSearchAnim();
        $searchWrap.removeClass('is-active');       // 触发 CSS 滑出动画
        $('#search-results').remove();              // 清除搜索结果
        stopSearchAnim();
      }
    }, 150);                                       // 150ms 延迟，等待搜索结果点击
  });

  // ---- 本地搜索（从 search.json 加载索引） ----
  let searchData = null;                           // 缓存已加载的搜索数据

  // 加载搜索数据（仅首次请求网络，之后走缓存）
  function loadSearchData(callback) {
    if (searchData) return callback(searchData);    // 已缓存，直接回调
    $.getJSON('/zl.github.io/search.json', function(data) {
      searchData = data;                           // 缓存数据
      callback(data);
    });
  }

  // 执行搜索：在标题、标签、正文中匹配关键词（不区分大小写）
  function doSearch(query, data) {
    const q = query.toLowerCase().trim();           // 转小写 + 去首尾空格
    if (!q) return [];                              // 空查询 → 返回空数组
    return data.filter(function(item) {
      const fields = [item.title, item.tags.join(' '), item.content].join(' ').toLowerCase();
      return fields.indexOf(q) !== -1;              // 子字符串匹配
    });
  }

  // 显示搜索结果列表
  function showResults(results) {
    $('#search-results').remove();                  // 清除旧结果

    const $form = $searchWrap.find('.search-form');
    const offset = $form.offset();                  // 搜索框在页面中的位置
    const width  = $form.outerWidth();              // 搜索框宽度（结果面板等宽）

    // 无结果提示
    if (!results.length) {
      const $noResult = $('<div id="search-results"><div class="search-no-result">没有找到相关文章</div></div>');
      $('body').append($noResult);
      $noResult.css({ position: 'absolute', top: offset.top + $form.outerHeight() + 5, left: offset.left, width: width });
      return;
    }

    // 构建结果列表 HTML
    const html = ['<div id="search-results">'];
    results.forEach(function(item) {
      html.push(
        '<a class="search-result-item" href="' + item.url + '">',
          '<span class="search-result-title">' + item.title + '</span>',
          '<span class="search-result-date">' + item.date + '</span>',
        '</a>'
      );
    });
    html.push('</div>');

    const $results = $(html.join(''));
    $('body').append($results);                     // 挂到 body，用绝对定位对齐搜索框
    $results.css({ position: 'absolute', top: offset.top + $form.outerHeight() + 5, left: offset.left, width: width });
  }

  // 输入事件：实时搜索
  $searchInput.on('input', function() {
    loadSearchData(function(data) {
      const results = doSearch($searchInput.val(), data);
      showResults(results);
    });
  });

  // 回车提交：也触发搜索（防止表单默认提交跳转到 Google）
  $('.search-form').on('submit', function(e) {
    e.preventDefault();                              // 阻止表单默认提交行为
    loadSearchData(function(data) {
      const results = doSearch($searchInput.val(), data);
      showResults(results);
    });
  });

  // 键盘导航：上下箭头选结果 + Enter 跳转 + Escape 关闭
  $searchInput.on('keydown', function(e) {
    const $items = $('.search-result-item');
    if (!$items.length) return;                     // 没有搜索结果时不处理

    const $current = $items.filter('.active');       // 当前高亮项

    if (e.key === 'ArrowDown') {                    // 下箭头：选中下一项
      e.preventDefault();
      if (!$current.length) {
        $items.first().addClass('active');           // 没选中任何项 → 选第一项
      } else {
        const idx = $items.index($current);
        $current.removeClass('active');
        $items.eq((idx + 1) % $items.length).addClass('active'); // 循环到下一项
      }
    } else if (e.key === 'ArrowUp') {               // 上箭头：选中上一项
      e.preventDefault();
      if (!$current.length) {
        $items.last().addClass('active');            // 没选中任何项 → 选最后一项
      } else {
        const idx = $items.index($current);
        $current.removeClass('active');
        $items.eq((idx - 1 + $items.length) % $items.length).addClass('active'); // 循环到上一项
      }
    } else if (e.key === 'Enter') {                 // 回车：跳转到选中文章
      e.preventDefault();
      if ($current.length) {
        window.location.href = $current.attr('href');
      }
    } else if (e.key === 'Escape') {                // Escape：关闭搜索结果
      $('#search-results').remove();
      $searchInput.blur();                           // 同时让搜索框失焦（触发关闭动画）
    }
  });

  // ==============================================
  // 四、分享功能
  // 点击"分享"链接 → 弹出分享面板
  // 可复制文章链接，或分享到 Twitter / Facebook 等平台
  // ==============================================

  // 点击页面任意位置关闭所有分享弹窗
  $('body').on('click', function() {
    $('.article-share-box.is-active').removeClass('is-active');
  }).on('click', '.article-share-link', function(e) {
    e.stopPropagation();                            // 阻止冒泡到 body（否则立即关闭）

    const $this = $(this);
    const url       = $this.attr('data-url');        // 文章完整 URL
    const encodedUrl = encodeURIComponent(url);       // URL 编码后的版本（用于社交平台分享链接）
    const id        = 'article-share-box-' + $this.attr('data-id'); // 唯一弹窗 ID
    const title     = $this.attr('data-title');      // 文章标题
    const offset    = $this.offset();                // 分享按钮位置

    // 如果弹窗已存在
    if ($('#' + id).length) {
      const box = $('#' + id);
      if (box.hasClass('is-active')) {
        box.removeClass('is-active');                // 已打开 → 关闭
        return;
      }
    } else {
      // 弹窗不存在 → 创建新弹窗
      const html = [
        '<div id="' + id + '" class="article-share-box">',
          '<input class="article-share-input" value="' + url + '">',  // 可复制的链接输入框
          '<div class="article-share-links">',
            '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodedUrl + '" class="article-share-twitter" target="_blank" rel="noopener noreferrer" title="Twitter"><span class="fa fa-twitter"></span></a>',
            '<a href="https://www.facebook.com/sharer.php?u=' + encodedUrl + '" class="article-share-facebook" target="_blank" title="Facebook"><span class="fa fa-facebook"></span></a>',
            '<a href="http://pinterest.com/pin/create/button/?url=' + encodedUrl + '" class="article-share-pinterest" target="_blank" title="Pinterest"><span class="fa fa-pinterest"></span></a>',
            '<a href="https://www.linkedin.com/shareArticle?mini=true&url=' + encodedUrl + '" class="article-share-linkedin" target="_blank" title="LinkedIn"><span class="fa fa-linkedin"></span></a>',
          '</div>',
        '</div>'
      ].join('');

      const box = $(html);
      $('body').append(box);                         // 挂到 body
    }

    // 关闭其他已打开的分享弹窗
    $('.article-share-box.is-active').hide();

    // 定位并显示弹窗
    box.css({ top: offset.top + 25, left: offset.left }).addClass('is-active');
  }).on('click', '.article-share-box', function(e) {
    e.stopPropagation();                            // 点击弹窗内部不关闭
  }).on('click', '.article-share-box-input', function() {
    $(this).select();                               // 点击输入框 → 全选链接方便复制
  }).on('click', '.article-share-box-link', function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.open(this.href, 'article-share-box-window-' + Date.now(), 'width=500,height=450'); // 新窗口打开分享链接
  });

  // ==============================================
  // 五、图片灯箱
  // 自动为文章正文中的图片包裹 fancybox 链接
  // 点击图片 → 灯箱放大查看
  // ==============================================

  $('.article-entry').each(function(i) {
    $(this).find('img').each(function() {
      // 已经包裹过的跳过（父元素是 fancybox 或 a 标签）
      if ($(this).parent().hasClass('fancybox') || $(this).parent().is('a')) return;

      const alt = this.alt;

      // 有 alt 文字 → 在图片下方添加说明
      if (alt) $(this).after('<span class="caption">' + alt + '</span>');

      // 包裹 fancybox 链接
      $(this).wrap('<a href="' + this.src + '" data-fancybox="gallery" data-caption="' + alt + '"></a>');
    });

    // 关联同一篇文章的图片为一组（左右切换浏览）
    $(this).find('.fancybox').each(function() {
      $(this).attr('rel', 'article' + i);
    });
  });

  // 初始化 fancybox 灯箱（如果已加载）
  if ($.fancybox) {
    $('.fancybox').fancybox();
  }

  // ==============================================
  // 六、移动端菜单
  // 点击汉堡图标 → #wrap 右移，露出左侧菜单
  // 点击页面内容区 → 关闭菜单
  // ==============================================

  const $container = $('#container');               // 最外层容器
  let isMobileNavAnim = false;                      // 防止动画期间重复点击
  const mobileNavAnimDuration = 200;                // 动画时长（毫秒）

  function startMobileNavAnim() { isMobileNavAnim = true; }
  function stopMobileNavAnim() {
    setTimeout(function() { isMobileNavAnim = false; }, mobileNavAnimDuration);
  }

  // 点击汉堡图标：开关菜单
  $('#main-nav-toggle').on('click', function() {
    if (isMobileNavAnim) return;                    // 动画进行中，忽略

    startMobileNavAnim();
    $container.toggleClass('mobile-nav-open');       // 添加/移除 CSS class（触发滑动动画）
    stopMobileNavAnim();
  });

  // 点击内容区（#wrap）：如果菜单打开中则关闭
  $('#wrap').on('click', function() {
    if (isMobileNavAnim || !$container.hasClass('mobile-nav-open')) return;
    $container.removeClass('mobile-nav-open');       // 关闭菜单
  });

})(jQuery);
