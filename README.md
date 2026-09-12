<<<<<<< HEAD
# GRCorange.github.io
=======
# 郭睿宸 · 个人站点

一个可以直接部署到 **GitHub Pages** 的纯静态个人站点，两页结构：

| 页面 | 文件 | 作用 |
| --- | --- | --- |
| 首页 | `index.html` | 个人照片、个人介绍、电话与 QQ |
| 周报 | `weekly.html` | 上传方式说明 + 已发布的周报列表，点击条目展开阅读 |

零框架、零构建依赖、可离线打开。全站手写 HTML / CSS / JavaScript。

---

## 一、目录结构

```
.
├── index.html                  # 首页
├── weekly.html                 # 周报页
├── assets/
│   ├── css/style.css           # 全部样式（含明暗双主题）
│   ├── js/main.js              # 主题切换、顶栏吸顶描边
│   ├── js/weekly.js            # 周报列表渲染、展开收起
│   └── img/profile.jpg         # 首页头像（替换成你自己的照片）
├── weekly/
│   ├── posts/                  # ★ 周报源文件，写在这里
│   │   └── _TEMPLATE.md        # 模板（复制它改成日期名，下划线开头不会被发布）
│   └── posts.js                # 自动生成，请勿手动编辑
├── scripts/
│   └── build-weekly.mjs        # 构建脚本：md → posts.js
├── .github/workflows/build-weekly.yml   # 推送后自动重建
├── .nojekyll                   # 0 字节，但必须留：关闭 GitHub Pages 的 Jekyll 处理
├── .gitignore
├── README.md
└── package.json
```

---

## 二、上线到 GitHub Pages（约 3 分钟）

1. 在 GitHub 新建一个仓库，例如 `guo-ruichen.github.io`
   （用 `<你的用户名>.github.io` 作为仓库名，网址就是根路径；用别的名字则网址为 `https://<用户名>.github.io/<仓库名>/`）。
2. 把本项目所有文件推上去：
   ```bash
   git init
   git add .
   git commit -m "init: 个人站点"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
3. 打开仓库的 **Settings → Pages**，把 **Source** 设为 **Deploy from a branch**，
   **Branch** 选 `main`、目录选 `/ (root)`，保存。
4. 等 1 分钟左右，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。

> 站点内所有路径都使用相对路径，部署在子目录（`/repo-name/`）下同样正常。

---

## 三、怎么持续"上传"一篇新周报

### 方式 A：写好 Markdown，推送到 GitHub（推荐）

1. 复制 `weekly/posts/_TEMPLATE.md`，重命名为日期，例如 `weekly/posts/2026-09-19.md`；
2. 填好开头的元信息（标题 / 日期 / 周次 / 标签 / 摘要）和正文；
3. 本地运行一次构建并推送：
   ```bash
   npm run weekly     # 生成 weekly/posts.js
   git add .
   git commit -m "weekly: 第 2 周"
   git push
   ```

**忘记运行 `npm run weekly` 也没关系** —— 推送后 GitHub Actions 会自动重建并提交，线上始终是最新的。

### 方式 B：直接在 GitHub 网页上写

打开 `weekly/posts/` → *Add file → Create new file* → 命名 `2026-09-19.md` → 粘贴模板内容 → 提交。
Actions 会自动完成构建，一两分钟后线上更新。

### 元信息字段说明

```yaml
---
title: 这一周的标题          # 必填
date: 2026-09-19            # 必填，必须是 YYYY-MM-DD
week: 第 2 周               # 可选，显示在列表左侧日期下方
tags: 学习, 项目, 复盘       # 可选，显示为该条目标题下方的标签
summary: 一句话摘要          # 可选，不填则自动截取正文首段
---
```

正文支持常用 Markdown：标题、**加粗**、*斜体*、`行内代码`、列表、引用、代码块、表格、分隔线、链接、图片。
图片放进 `assets/img/`，正文里写 `![说明](assets/img/xxx.png)`（路径相对网站根目录）。

---

## 四、本地预览

用浏览器直接打开 `index.html` 即可（双击就行）。周报数据是通过 `<script>` 标签载入的，
不依赖服务器，所以 `file://` 下同样能正常浏览，效果和 GitHub Pages 上一致。

---

## 五、改成你自己的内容

| 想改什么 | 改哪里 |
| --- | --- |
| 头像照片 | 覆盖 `assets/img/profile.jpg`（竖版 3:4 最佳，如 480×640） |
| 姓名 / 英文名 | `index.html` 里的 `.hero__name` |
| 电话 / QQ | `index.html` 里的 `.info` 两行；电话同时要改 `href="tel:13459421799"` |
| 配色 / 圆角 / 字体 | `assets/css/style.css` 顶部 `:root` 变量，暗色在 `html[data-theme="dark"]` |
| 强调色 | `--accent`（默认朱砂红 `#B23B2E`，暗色下自动切到 `#E06F5F`） |
| 站点标题 / 描述 | 两个 HTML 文件的 `<title>` 与 `meta[name="description"]` |

---

## 六、特性清单

- 极简排版，明暗双主题（跟随系统，可手动切换并记忆）
- 完全响应式，适配手机 / 平板 / 桌面
- 周报支持点击展开全文、锚点深链（`weekly.html#2026-09-19`，即该篇的日期）
- 尊重 `prefers-reduced-motion`，键盘可访问（跳转链接、焦点样式、`aria` 属性完备）
- 无 CDN、无外部字体、无追踪脚本，首屏零外部请求

---

© 郭睿宸
>>>>>>> 6e28a96 (修复目录结构)
