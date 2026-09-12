/* ==========================================================================
   站点通用脚本：主题切换 / 顶栏描边 / 年份
   无依赖，原生 ES5+ 语法，可直接在 file:// 与 GitHub Pages 下运行
   ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------- 主题切换 + 记忆 */
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('gr-theme', next); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#0E0F11' : '#FAF9F7');
    });
  }

  /* --------------------------------------------------- 顶栏吸顶描边 */
  var topbar = document.getElementById('topbar');
  if (topbar) {
    var onScroll = function () {
      topbar.classList.toggle('is-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --------------------------------------------------- 年份 */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
