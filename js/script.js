(function($){
  // ==================== 轮播图 ====================
  var bannerSlides = [
    '/zl.github.io/images/1.jpg',
    '/zl.github.io/images/2.jpg',
    '/zl.github.io/images/3.jpg'
  ];

  (function() {
    var $banner = $('#banner');
    var $header = $('#header');
    if (!$banner.length || bannerSlides.length === 0) return;

    /* 预加载第一张图片，提前发起请求 */
    var preload = new Image();
    preload.src = bannerSlides[0];

    var imgs = '', dots = '';
    for (var i = 0; i < bannerSlides.length; i++) {
      imgs += '<img class="banner-slide' + (i === 0 ? ' is-active' : '') + '" src="' + bannerSlides[i] + '" alt="">';
      dots += '<button class="banner-dot' + (i === 0 ? ' is-active' : '') + '"></button>';
    }
    $banner.append(imgs);                    /* 图片放在 #banner 里 */
    $header.append(                          /* 箭头+圆点放在 #header 里，z-index 才能生效 */
      '<button class="banner-arrow banner-prev">&#8249;</button>' +
      '<button class="banner-arrow banner-next">&#8250;</button>' +
      '<div class="banner-dots">' + dots + '</div>'
    );

    var idx = 0, timer;

    function go(n) {
      $banner.find('.banner-slide').eq(idx).removeClass('is-active');
      $header.find('.banner-dot').eq(idx).removeClass('is-active');
      idx = (n + bannerSlides.length) % bannerSlides.length;
      $banner.find('.banner-slide').eq(idx).addClass('is-active');
      $header.find('.banner-dot').eq(idx).addClass('is-active');
    }

    function next() { go(idx + 1); }
    function prev() { go(idx - 1); }
    function start() { timer = setInterval(next, 4000); }
    function stop()  { clearInterval(timer); }

    $header.on('click', '.banner-next', function(e) { e.stopPropagation(); stop(); next(); start(); });
    $header.on('click', '.banner-prev', function(e) { e.stopPropagation(); stop(); prev(); start(); });
    $header.on('click', '.banner-dot',  function(e) { e.stopPropagation(); stop(); go($header.find('.banner-dot').index(this)); start(); });

    start();
  })();

  // ==================== 背景音乐 ====================
  (function() {
    var $audio = $('<audio id="bgm" src="/zl.github.io/audio/昔涟.flac" autoplay muted loop></audio>');
    $('body').append($audio);
    var audio = $audio[0];
    var $btn = $('<button id="music-btn" title="音乐">&#9834;</button>');
    $('body').append($btn);

    var playing = false; /* muted不算真正播放 */
    $btn.on('click', function(e) {
      e.stopPropagation();
      if (!playing) {
        audio.muted = false;     /* 取消静音 */
        audio.play().then(function() {
          $btn.addClass('is-playing');
          playing = true;
        });
      } else {
        audio.muted = true;      /* 静音 */
        $btn.removeClass('is-playing');
        playing = false;
      }
    });
  })();

  // Search
  var $searchWrap = $('#search-form-wrap'),
    isSearchAnim = false,
    searchAnimDuration = 200;

  var startSearchAnim = function(){
    isSearchAnim = true;
  };

  var stopSearchAnim = function(callback){
    setTimeout(function(){
      isSearchAnim = false;
      callback && callback();
    }, searchAnimDuration);
  };

  $('.nav-search-btn').on('click', function(){
    if (isSearchAnim) return;

    startSearchAnim();
    $('#search-results').remove();
    $('.search-form-input').val('');
    $searchWrap.addClass('is-active');
    stopSearchAnim(function(){
      $('.search-form-input').focus();
    });
  });

  $('.search-form-input').on('blur', function(){
    setTimeout(function(){
      if (!$('.search-result-item:hover').length) {
        startSearchAnim();
        $searchWrap.removeClass('is-active');
        $('#search-results').remove();
        stopSearchAnim();
      }
    }, 150);
  });

  // ---- 本地搜索 ----
  var searchData = null;

  function loadSearchData(callback) {
    if (searchData) return callback(searchData);
    $.getJSON('/zl.github.io/search.json', function(data) {
      searchData = data;
      callback(data);
    });
  }

  function doSearch(query, data) {
    var q = query.toLowerCase().trim();
    if (!q) return [];
    return data.filter(function(item) {
      var fields = [item.title, item.tags.join(' '), item.content].join(' ').toLowerCase();
      return fields.indexOf(q) !== -1;
    });
  }

  function showResults(results) {
    $('#search-results').remove();
    var $form = $searchWrap.find('.search-form');
    var offset = $form.offset();
    var width = $form.outerWidth();
    if (!results.length) {
      var $noResult = $('<div id="search-results"><div class="search-no-result">没有找到相关文章</div></div>');
      $('body').append($noResult);
      $noResult.css({ position: 'absolute', top: offset.top + $form.outerHeight() + 5, left: offset.left, width: width });
      return;
    }
    var html = ['<div id="search-results">'];
    results.forEach(function(item) {
      html.push(
        '<a class="search-result-item" href="' + item.url + '">',
          '<span class="search-result-title">' + item.title + '</span>',
          '<span class="search-result-date">' + item.date + '</span>',
        '</a>'
      );
    });
    html.push('</div>');
    var $results = $(html.join(''));
    $('body').append($results);
    $results.css({ position: 'absolute', top: offset.top + $form.outerHeight() + 5, left: offset.left, width: width });
  }

  var $searchInput = $('.search-form-input');

  $searchInput.on('input', function() {
    loadSearchData(function(data) {
      var results = doSearch($searchInput.val(), data);
      showResults(results);
    });
  });

  $('.search-form').on('submit', function(e) {
    e.preventDefault();
    loadSearchData(function(data) {
      var results = doSearch($searchInput.val(), data);
      showResults(results);
    });
  });

  $searchInput.on('keydown', function(e) {
    var $items = $('.search-result-item');
    if (!$items.length) return;

    var $current = $items.filter('.active');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!$current.length) {
        $items.first().addClass('active');
      } else {
        var idx = $items.index($current);
        $current.removeClass('active');
        $items.eq((idx + 1) % $items.length).addClass('active');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!$current.length) {
        $items.last().addClass('active');
      } else {
        var idx = $items.index($current);
        $current.removeClass('active');
        $items.eq((idx - 1 + $items.length) % $items.length).addClass('active');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if ($current.length) {
        window.location.href = $current.attr('href');
      }
    } else if (e.key === 'Escape') {
      $('#search-results').remove();
      $searchInput.blur();
    }
  });

  // Share
  $('body').on('click', function(){
    $('.article-share-box.is-active').removeClass('is-active');
  }).on('click', '.article-share-link', function(e){
    e.stopPropagation();

    var $this = $(this),
      url = $this.attr('data-url'),
      encodedUrl = encodeURIComponent(url),
      id = 'article-share-box-' + $this.attr('data-id'),
      title = $this.attr('data-title'),
      offset = $this.offset();

    if ($('#' + id).length){
      var box = $('#' + id);

      if (box.hasClass('is-active')){
        box.removeClass('is-active');
        return;
      }
    } else {
      var html = [
        '<div id="' + id + '" class="article-share-box">',
          '<input class="article-share-input" value="' + url + '">',
          '<div class="article-share-links">',
            '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodedUrl + '" class="article-share-twitter" target="_blank" title="Twitter"><span class="fa fa-twitter"></span></a>',
            '<a href="https://www.facebook.com/sharer.php?u=' + encodedUrl + '" class="article-share-facebook" target="_blank" title="Facebook"><span class="fa fa-facebook"></span></a>',
            '<a href="http://pinterest.com/pin/create/button/?url=' + encodedUrl + '" class="article-share-pinterest" target="_blank" title="Pinterest"><span class="fa fa-pinterest"></span></a>',
            '<a href="https://www.linkedin.com/shareArticle?mini=true&url=' + encodedUrl + '" class="article-share-linkedin" target="_blank" title="LinkedIn"><span class="fa fa-linkedin"></span></a>',
          '</div>',
        '</div>'
      ].join('');

      var box = $(html);

      $('body').append(box);
    }

    $('.article-share-box.is-active').hide();

    box.css({
      top: offset.top + 25,
      left: offset.left
    }).addClass('is-active');
  }).on('click', '.article-share-box', function(e){
    e.stopPropagation();
  }).on('click', '.article-share-box-input', function(){
    $(this).select();
  }).on('click', '.article-share-box-link', function(e){
    e.preventDefault();
    e.stopPropagation();

    window.open(this.href, 'article-share-box-window-' + Date.now(), 'width=500,height=450');
  });

  // Caption
  $('.article-entry').each(function(i){
    $(this).find('img').each(function(){
      if ($(this).parent().hasClass('fancybox') || $(this).parent().is('a')) return;

      var alt = this.alt;

      if (alt) $(this).after('<span class="caption">' + alt + '</span>');

      $(this).wrap('<a href="' + this.src + '" data-fancybox=\"gallery\" data-caption="' + alt + '"></a>')
    });

    $(this).find('.fancybox').each(function(){
      $(this).attr('rel', 'article' + i);
    });
  });

  if ($.fancybox){
    $('.fancybox').fancybox();
  }

  // Mobile nav
  var $container = $('#container'),
    isMobileNavAnim = false,
    mobileNavAnimDuration = 200;

  var startMobileNavAnim = function(){
    isMobileNavAnim = true;
  };

  var stopMobileNavAnim = function(){
    setTimeout(function(){
      isMobileNavAnim = false;
    }, mobileNavAnimDuration);
  }

  $('#main-nav-toggle').on('click', function(){
    if (isMobileNavAnim) return;

    startMobileNavAnim();
    $container.toggleClass('mobile-nav-open');
    stopMobileNavAnim();
  });

  $('#wrap').on('click', function(){
    if (isMobileNavAnim || !$container.hasClass('mobile-nav-open')) return;

    $container.removeClass('mobile-nav-on');
  });
})(jQuery);
