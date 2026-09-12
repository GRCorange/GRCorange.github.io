#!/usr/bin/env node
/* ==========================================================================
   build-weekly.mjs —— 周报构建脚本（零依赖，Node 18+）

   作用：
     读取 weekly/posts/*.md → 解析 frontmatter + Markdown → 生成 weekly/posts.js

   用法：
     node scripts/build-weekly.mjs
     npm run weekly

   为什么生成 .js 而不是 .json：
     posts.js 通过 <script> 引入，本地双击打开（file://）也能正常渲染，
     不需要起本地服务器，也不需要处理 fetch 的跨域限制。
   ========================================================================== */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'weekly', 'posts');
const OUT_FILE = path.join(ROOT, 'weekly', 'posts.js');

/* ------------------------------------------------------------ 工具函数 */

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 行内语法：代码 / 图片 / 链接 / 加粗 / 斜体 / 删除线 / 换行 */
function inline(text) {
  const codes = [];
  let out = escapeHtml(text);

  // 先把行内代码抽出，避免其中的 * _ 被误解析
  out = out.replace(/`([^`]+)`/g, (_m, c) => {
    codes.push(c);
    return `\u0000C${codes.length - 1}\u0000`;
  });

  // 图片
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, alt, src, title) =>
      `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy" decoding="async">`
  );

  // 链接（外链自动新窗口打开）
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, label, href, title) => {
      const ext = /^(https?:)?\/\//i.test(href);
      return `<a href="${href}"${title ? ` title="${title}"` : ''}${
        ext ? ' target="_blank" rel="noopener noreferrer"' : ''
      }>${label}</a>`;
    }
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 行尾两个空格 = 强制换行
  out = out.replace(/ {2,}$/g, '<br>');

  // 还原代码
  out = out.replace(/\u0000C(\d+)\u0000/g, (_m, i) => `<code>${codes[Number(i)]}</code>`);

  return out;
}

const isRawHtmlBlock = (line) => /^<\/?[a-zA-Z][\w:-]*(\s[^>]*)?\/?>/.test(line.trim());

/** 块级语法解析 */
function markdownToHtml(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [];

  const flush = () => {
    if (!para.length) return;
    const raw = para.join('\n');
    out.push(isRawHtmlBlock(para[0]) ? raw : `<p>${inline(raw).replace(/\n/g, '<br>')}</p>`);
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 围栏代码块
    if (/^```/.test(line.trim())) {
      flush();
      const lang = line.trim().slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) buf.push(lines[i++]);
      out.push(
        `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(
          buf.join('\n')
        )}</code></pre>`
      );
      continue;
    }

    // 分隔线
    if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) {
      flush();
      out.push('<hr>');
      continue;
    }

    // 标题
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const level = Math.min(h[1].length + 1, 6); // # 映射为 h2，避免与页面 h1 冲突
      out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      continue;
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      i--;
      out.push(`<blockquote>${markdownToHtml(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // 表格（| a | b | + 分隔行）
    if (line.includes('|') && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || '')) {
      flush();
      const cells = (row) =>
        row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) rows.push(cells(lines[i++]));
      i--;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`
      );
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*[-*+]\s+/, '').trim()));
        i++;
      }
      i--;
      out.push(`<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`);
      continue;
    }

    // 有序列表
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(inline(lines[i].replace(/^\s*\d+[.)]\s+/, '').trim()));
        i++;
      }
      i--;
      out.push(`<ol>${items.map((t) => `<li>${t}</li>`).join('')}</ol>`);
      continue;
    }

    // 空行 = 段落结束
    if (!line.trim()) {
      flush();
      continue;
    }

    para.push(line);
  }

  flush();
  return out.join('\n');
}

/* ------------------------------------------------------- frontmatter */

function parseFrontmatter(raw) {
  const meta = {};
  let body = raw;
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(raw);
  if (m) {
    body = raw.slice(m[0].length);
    m[1].split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if (/^["'].*["']$/.test(val)) val = val.slice(1, -1);
      meta[key] = val;
    });
  }
  return { meta, body };
}

const splitTags = (s) =>
  String(s || '')
    .split(/[,，、|]/)
    .map((t) => t.trim())
    .filter(Boolean);

/* --------------------------------------------------------- 主流程 */

const BOLD = '\u001b[1m';
const DIM = '\u001b[2m';
const RED = '\u001b[31m';
const GREEN = '\u001b[32m';
const RESET = '\u001b[0m';

async function main() {
  if (!existsSync(POSTS_DIR)) {
    console.error(`${RED}找不到目录：${POSTS_DIR}${RESET}`);
    process.exit(1);
  }

  // 忽略以 _ 或 . 开头的文件（如 _TEMPLATE.md）
  const files = (await readdir(POSTS_DIR))
    .filter((f) => /\.(md|markdown)$/i.test(f) && !/^[_.]/.test(f))
    .sort();

  const posts = [];
  const problems = [];

  for (const file of files) {
    const slug = file.replace(/\.(md|markdown)$/i, '');
    const raw = await readFile(path.join(POSTS_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);

    // 标题：frontmatter > 正文首个 # 标题 > 文件名
    let title = meta.title;
    if (!title) {
      const h1 = /^\s*#\s+(.+)$/m.exec(body);
      title = h1 ? h1[1].trim() : slug;
    }
    // 去掉正文里被用作标题的那个 #
    if (!meta.title) body.replace(/^\s*#\s+.+$/m, '');

    const date = (meta.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      problems.push(`${file}：date 缺失或格式不对（应为 YYYY-MM-DD）`);
    }

    const html = markdownToHtml(body.trim());

    // 摘要：frontmatter > 自动截取正文第一段
    let summary = meta.summary || meta.excerpt || '';
    if (!summary) {
      const firstP = /<p>([\s\S]*?)<\/p>/.exec(html);
      if (firstP) {
        summary = firstP[1].replace(/<[^>]+>/g, '').slice(0, 96);
        if (summary.length >= 96) summary += '…';
      }
    }

    posts.push({
      slug,
      title,
      date,
      week: meta.week || '',
      tags: splitTags(meta.tags || meta.tag),
      summary,
      html,
    });
  }

  posts.sort((a, b) => (a.date === b.date ? b.slug.localeCompare(a.slug) : b.date.localeCompare(a.date)));

  const payload = JSON.stringify(posts, null, 2).replace(/<\/(script)/gi, '<\\/$1');

  const banner = [
    '/* ------------------------------------------------------------------',
    ' * 本文件由 scripts/build-weekly.mjs 自动生成，请勿手动编辑。',
    ' * 新增一篇周报：在 weekly/posts/ 下新建 .md 文件，然后运行：',
    ' *     npm run weekly',
    ' * （推送到 GitHub 后，Actions 也会自动重建一次）',
    ' * ------------------------------------------------------------------ */',
    '',
  ].join('\n');

  const prev = existsSync(OUT_FILE) ? await readFile(OUT_FILE, 'utf8') : '';
  const next = `${banner}window.WEEKLY_POSTS = ${payload};\n`;

  if (prev === next) {
    console.log(`${DIM}内容无变化，跳过写入。${RESET}`);
  } else {
    await writeFile(OUT_FILE, next, 'utf8');
  }

  console.log(`${GREEN}✓${RESET} 已生成 ${BOLD}weekly/posts.js${RESET} —— 共 ${posts.length} 篇周报`);
  posts.slice(0, 5).forEach((p) => {
    console.log(`   ${DIM}${p.date || '日期缺失'}${RESET}  ${p.title}`);
  });
  if (posts.length > 5) console.log(`   ${DIM}…还有 ${posts.length - 5} 篇${RESET}`);

  if (problems.length) {
    console.log(`\n${RED}注意：${RESET}`);
    problems.forEach((p) => console.log(`   - ${p}`));
    // 不阻塞构建，只在 CI 上给个提醒
  }
}

main().catch((err) => {
  console.error(`${RED}构建失败：${RESET}`, err);
  process.exit(1);
});
