// 给所有页面注入浏览量显示和JS引入
hexo.extend.injector.register('body_end', () => {
  return `
    <!-- 浏览量显示 -->
    <span>本文阅读量：<span id="my-blog-view-count">加载中...</span></span>
    <!-- 引入自研浏览量JS -->
    <script src="/my-blog-view.js"></script>
  `;
}, 'default');