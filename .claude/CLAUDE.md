# Blog CLAUDE.md

## 项目概述

个人博客站点，托管在 GitHub Pages，自定义域名 `zetazero.top`。

| 项目 | 详情 |
|------|------|
| 技术栈 | 纯静态 HTML + Jekyll（仅用于构建，不使用 Jekyll 主题） |
| 仓库 | `github.com/Ha1baraA11/Ha1baraA11.github.io` |
| 域名 | `zetazero.top`（CNAME 配置，HTTPS 已签发） |
| 分支 | `main` |
| 前端依赖 | 原生 vanilla JS，无框架。外部 CDN：opentype.js、vivus（hero 手写动画） |

## 目录结构

```
/
├── index.html              # 首页（hero 动画、文章列表、打字机效果）
├── about.html              # 关于页（技能卡片、联系方式）
├── CNAME                   # 自定义域名：zetazero.top
├── robots.txt              # Disallow: /letters/
├── encrypt.mjs             # 情书内容加密辅助脚本（Node.js）
├── _posts/                 # Jekyll 文章目录
│   └── 2026-05-04-hello-world.md
├── blog/                   # 已发布的文章（HTML）
│   └── 2026/05/04/
├── assets/
│   ├── css/
│   │   ├── style.css       # 主站样式（暗色/亮色主题、弹窗样式）
│   │   └── letters.css     # 隐藏情书页面的浪漫主题样式
│   └── js/
│       └── auth.js         # PBKDF2 + AES-256-GCM 加密核心模块
└── letters/
    └── k7x9m2/
        ├── index.html      # 隐藏情书页面（Web Worker 解密 + auth 检查）
        └── data.bin         # AES-256-GCM 密文（base64），~1.36MB
```

## 设计风格

- **主色调**：`#64B5F6`（蓝色）
- **字体**：Inter UI（正文）、Caveat（手写体 hero 标题）
- **主题**：默认暗色，支持亮色切换（`data-theme="light"`）
- **动画**：SVG 手写动画（opentype.js + vivus）、打字机效果、滚动 fade-in、阅读进度条

## 隐藏情书模块

### 架构

长按首页 hero 名字 800ms → 密码弹窗 → 验证 → 跳转 `/letters/k7x9m2/` → fetch 加载 data.bin → Web Worker 解密渲染。

加密架构：PBKDF2 (100k iterations, SHA-256) → derivedKey → SHA-256 验证 + AES-256-GCM 解密。

### 安全设计

- 内容加密：仓库中只有 AES-256-GCM 密文，无密码无法解密
- 加密前 gzip 压缩，密文带 `PK01` magic marker
- 隐蔽路径：`/letters/k7x9m2/`
- SEO 屏蔽：noindex meta + robots.txt
- sessionStorage 单次令牌：120 秒 TTL，用后即销
- Web Worker 解密：主线程不阻塞
- 明文源文件和图片均在 `.gitignore` 中，不进仓库

### 内容更新流程

**使用 `update-letter` skill**（`~/.claude/skills/update-letter/SKILL.md`）。

核心规则：
- **绝对禁止**用本地 `letter-content.html` 重新加密
- 必须先解密原始密文（从 `data.bin` 读取）→ 只改目标条目 → 重新加密写回 `data.bin`
- 只改 `letters/k7x9m2/index.html` 和 `data.bin`，不改 CSS、不加新 class（除非明确要求）
- 每次改完用解密验证
- **每封信正文末尾加 ♥️**：紧跟最后一个字，前面不带标点符号（如有标点先去掉），格式如 `<p>内容♥️</p>`

### 当前内容

- 标题："小雪"，副标题："写给你的碎碎念"
- 2026.05.13 — "格外爱你"（纯文字 ♥️）
- 2026.05.10 — "母亲节"（纯文字 ♥️）
- 2026.05.09 — "小黄裙"（纯文字 ♥️）
- 2026.05.08 — "今天"（纯文字 ♥️）
- 2026.04.03 — "第三次见面"（纯文字 ♥️）
- 2026.01.09 — "第二次见面"（纯文字 ♥️）
- 2025.09.14 — "我们在一起了"（纯文字 ♥️）
- 2025.08.22 — "第一次见面"（纯文字 ♥️）

### 关键文件

| 文件 | 说明 |
|------|------|
| `assets/js/auth.js` | SALT/VERIFIER 常量、PBKDF2 + AES-GCM + SHA-256（仅 crypto.subtle） |
| `assets/css/letters.css` | 浪漫主题（玫瑰粉、Cormorant Garamond、信纸卡片） |
| `letters/k7x9m2/index.html` | Web Worker 解密 + pako 解压 + auth 检查 + fetch 加载 data.bin |
| `letters/k7x9m2/data.bin` | AES-256-GCM 密文（base64），由 encrypt.mjs 生成 |
| `encrypt.mjs` | 加密辅助脚本，gzip 压缩 + PK01 marker + AES-256-GCM，输出到 data.bin |

## .gitignore 规则

以下文件仅本地存在，不进仓库：
- `letters/k7x9m2/letter-content.html`（情书明文）
- `letters/k7x9m2/xiaoxue.png`（小雪头像）
- `letters/k7x9m2/zaiyiqi.jpg`（在一起插画）

## 部署

- push 到 `main` 分支即自动部署（GitHub Pages）
- 部署通常 1-2 分钟
- HTTPS 已签发：`https://zetazero.top/`（强制 HTTPS）
