# 开发历史归档

## Session 1 (2026-07-06)

### 完成项
- **缓存与重试机制** (`src/utils/cache.ts`): 实现 `getCachedData<T>` / `setCachedData<T>` / `clearCache` / `fetchWithRetry`
- **TrendingView.tsx**: localStorage 缓存（30min TTL）+ 自动重试（1次）
- **RSSView.tsx**: localStorage 缓存（30min TTL），先显示缓存再后台刷新，失败保留缓存
- **ExploreView.tsx**: `addFeed` / `refreshFeed` 添加 `fetchWithRetry`（1次重试）
- **CalendarView.tsx**: 修复心情选择器弹出位置（`left-0` → `right-0`，加 `relative` 包装器）
- **Scale 类修复**: `scale-101/102/103` → `scale-105`, `scale-120` → `scale-110`, `active:scale-97/99` → `active:scale-95`（跨5个文件）
- **Sidebar.tsx**: 修复文件编码损坏（中文乱码导致 Babel 语法报错），通过 `git checkout HEAD` 恢复
- **SettingsView.tsx**: 新增"AI 智能体集成"卡片，复制 WebDAV 工具定义（含预填凭据、所有数据类型 schema、curl 示例、manifest.json 版本管理说明）
- **Dark mode**: 为 AI 集成卡片添加 `dark:` Tailwind 变体支持
- **AI tool prompt**: 多轮迭代优化（去除对话式风格→纯工具定义→包含所有 WebDAV 数据类型→去除 index.html 需求→新增 manifest.json 版本管理）

### 关键决策
- localStorage 缓存替代内存缓存，支持跨页面/跨会话持久化
- fetchWithRetry(1次重试, 1.5s延迟) 平衡响应速度与网络容错
- AI 工具定义使用自包含 Markdown 而非 OpenAI function-calling JSON，兼容多种 AI 助手
- manifest.json 版本管理必不可少：WebDAV 写入后不更新 manifest 则同步不会拉取
- 不要求生成 index.html（用户反馈后去除）

### 相关文件
- `src/utils/cache.ts`
- `src/components/news/TrendingView.tsx`
- `src/components/news/RSSView.tsx`
- `src/components/ExploreView.tsx`
- `src/components/CalendarView.tsx`
- `src/utils/sync/types.ts`
- `src/utils/sync/webdavProvider.ts`
- `src/components/SettingsView.tsx`

## Session 2 (2026-07-06)

### 完成项
- **AGENTS.md**: 创建本文件，用于跨会话持久记录开发历史
- **git pull**: 拉取远端提交（包含已在 Session 1 中讨论的 dark mode 修改、Android/iOS 图标资源、Gitee 镜像脚本等）
- **Dark mode 全量扫描**: 确认远端 commit `7c5c55d` 已包含 TrendingView / RSSView / ExploreView / CalendarView 的 `dark:` 变体，本地未丢失改动

### 关键决策
- AGENTS.md 作为持久化归档文件，解决跨会话上下文丢失问题
- `.opencode/` 目录部分 gitignore，不适合放归档文件，因此放项目根目录

### 相关文件
- `AGENTS.md`（本文件）
