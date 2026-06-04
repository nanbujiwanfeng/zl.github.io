/* ===================================
   中文 + 英文分词 — Node 端与浏览器端共享

   规则：
     - 中文 → 单字 token + 相邻二字 bigram
     - 英文/数字连续串（2 字符以上）→ 转小写
     - Set 去重，返回数组

   示例："C语言游戏" → ["c","语","言","游","戏","语言","言游","游戏","c语","语言"]

   Node 端：const tokenize = require('./js/tokenize');
   浏览器端：<script src="tokenize.js"></script> → window.tokenize
   =================================== */
(function(exports) {
  function tokenize(text) {
    const tokens = new Set();               // Set 自动去重：同一个 token 只存一份
    const lower  = text.toLowerCase();      // 统一转小写：英文不区分大小写

    // 提取所有 CJK 字符，生成单字 token + 相邻 bigram
    const cjkChars = [];                    // 按原文顺序收集所有中文字符
    const cjkRe    = /[一-鿿㐀-䶿]/g;       // 匹配基本汉字块 + 扩展A区
    let m;
    while ((m = cjkRe.exec(lower)) !== null) cjkChars.push(m[0]); // 逐个提取
    cjkChars.forEach(function(c) { tokens.add(c); });      // 单字 token：支持单字查询
    for (let i = 0; i < cjkChars.length - 1; i++) {
      tokens.add(cjkChars[i] + cjkChars[i + 1]);           // 相邻二字 bigram：提高精确度
    }

    // 提取英文/数字 token（2 字符以上，如 "html" "malloc" "2026"）
    const words = lower.match(/[a-z0-9]{2,}/g);  // 全局匹配连续字母数字
    if (words) words.forEach(function(w) { tokens.add(w); });

    return Array.from(tokens);              // Set → Array
  }

  exports.tokenize = tokenize;
})(typeof module !== 'undefined' && module.exports ? module.exports : window);
