/* ==========================================================================
   周报页渲染：列表 / 展开收起 / 深链
   数据来源：weekly/posts.js（由 scripts/build-weekly.mjs 生成）
   ========================================================================== */
(function () {
  'use strict';

  var mount = document.getElementById('timeline');
  if (!mount) return;

  var posts = Array.isArray(window.WEEKLY_POSTS) ? window.WEEKLY_POSTS.slice() : [];

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  var plainText = function (html) {
    var d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  };

  var readingTime = function (html) {
    var n = plainText(html).length;
    return Math.max(1, Math.round(n / 380)) + ' 分钟';
  };

  var prettyDate = function (iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '未标注日期';
    return m[1] + '.' + m[2] + '.' + m[3];
  };

  /* ---------------------------------------------------- 无数据兜底 */
  if (!posts.length) {
    mount.innerHTML =
      '<div class="empty">' +
        '<strong>还没有周报。</strong>' +
        '按上面的说明，在 <code>weekly/posts/</code> 里一个 <code>.md</code> 文件，' +
        '运行 <code>npm run weekly</code>，这里就会出现第一篇周报????????。<br>' +
        '（若你刚 clone 下来，说明生成文件尚未构建）' +
        '按上面的说明，在 <code>weekly/posts/</code> 里新建一个 <code>.md</code> 文件，' +
        '运行 <code>npm run weekly</code>，这里就会出现第一篇！！！！！。<br>' +
        '（若你刚 clone 下来，说明生成文件尚未构建。）' +
      '</div>';
    return;
  }

  /* ---------------------------------------------------- 展开 / 收起 */
  var CHEVRON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5"/></svg>';

  var state = { open: {} };

  function setOpen(article, open) {
    var slug = article.getAttribute('data-slug');
    var head = article.querySelector('.post__head');
    article.classList.toggle('is-open', open);
    if (head) head.setAttribute('aria-expanded', String(open));
    state.open[slug] = open;
  }

  mount.addEventListener('click', function (e) {
    var head = e.target.closest('.post__head');
    if (!head) return;
    var article = head.closest('.post');
    if (!article) return;
    var willOpen = !article.classList.contains('is-open');
    setOpen(article, willOpen);
    if (willOpen) {
      try { history.replaceState(null, '', '#' + encodeURIComponent(article.getAttribute('data-slug'))); } catch (err) {}
    }
  });

  /* ---------------------------------------------------- 渲染 */
  function render() {
    mount.innerHTML = posts.map(function (p) {
      var isOpen = !!state.open[p.slug];
      var dateCell = prettyDate(p.date) + (p.week ? '<br>' + esc(p.week) : '');
      var tags = (p.tags || []).map(function (t) {
        return '<span class="post__tag">' + esc(t) + '</span>';
      }).join('');

      return '' +
        '<article class="post' + (isOpen ? ' is-open' : '') + '" data-slug="' + esc(p.slug) + '" id="p-' + esc(p.slug) + '">' +
          '<button class="post__head" type="button" aria-expanded="' + isOpen + '" aria-controls="body-' + esc(p.slug) + '">' +
            '<span class="post__date">' + dateCell + '</span>' +
            '<span class="post__main">' +
              '<span class="post__title">' + esc(p.title) + '</span>' +
              (p.summary ? '<span class="post__summary">' + esc(p.summary) + '</span>' : '') +
              '<span class="post__tags">' + tags +
                '<span class="post__tag">阅读约 ' + readingTime(p.html) + '</span>' +
              '</span>' +
            '</span>' +
            '<span class="post__toggle">' + CHEVRON + '</span>' +
          '</button>' +
          '<div class="post__body" id="body-' + esc(p.slug) + '">' +
            '<div><div class="post__inner"><div class="prose">' + (p.html || '') + '</div></div></div>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  render();

  /* ---------------------------------------------------- 深链：#slug 或 #p-slug */
  function openFromHash() {
    var raw = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (!raw) return;
    var slug = raw.replace(/^p-/, '');
    var article = mount.querySelector('.post[data-slug="' + slug.replace(/"/g, '\\"') + '"]');
    if (!article) return;
    setOpen(article, true);
    var head = article.querySelector('.post__head');
    if (head) head.setAttribute('aria-expanded', 'true');
    setTimeout(function () {
      article.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  if (location.hash) {
    // 等布局稳定后再滚动，避免定位偏移
    if (document.readyState === 'complete') openFromHash();
    else window.addEventListener('load', openFromHash);
  }
})();
