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

## Session 3 (2026-07-10)

### 背景
用户提出产品路线图 A-E，并确定「先做 A，之后立刻做 B」：
- A. 资讯 → 行动联动：RSS / Trending / Explore 里一键「稍后读 / 存为任务 / 收藏到日记」
- B. 全局剪贴板捕获（桌面端专属）：复制文字/链接时弹窗「存为任务 / 便签 / 日记」
- C. 智能规划：智能日计划编排 + 系统通知/到期提醒
- D. 日记延续：#标签浏览 + 单篇/整本导出
- E. 生活向：轻量记账 + 本地语音备忘

### 完成项（Feature A）
- **资讯→行动联动** 全量打通：每条资讯新增「稍后读 / 存为任务 / 收藏到日记」一键操作
- 新增 `src/components/news/newsActions.ts`（NewsRef / NewsActions 类型）与 `src/components/news/NewsItemActions.tsx`（三按钮组件，hover 显隐）
- `App.tsx` 新增 `handleNewsSaveTask`（→ tasksHook.handleAddTask，category=important-not-urgent, priority=low, tags=["资讯"]）与 `handleNewsSaveJournal`（→ handleUpsertJournal，新建 JournalEntry）
- 经 `MainLayout` 透传 `onNewsSaveTask/onNewsSaveJournal` 到 `NewsView`（注意：`<NewsView>` 渲染在 `MainLayout` 内，不在 `AppInner` 直接作用域）
- `NewsView` 增加 toast 反馈，并把 `actions` 下发到 TrendingView / GitHubView / RSSView / BookmarksView / ExploreView
- **ExploreView 此前未被任何地方渲染**，本次新增为 NewsView 的「视野」子标签页（此前是孤立死代码）

### 关键决策
- 「稍后读」复用既有 bookmark 机制（toggleBookmark，title+link 作唯一键）
- 存为任务默认归入「重要不紧急」象限、低优先级、打「资讯」标签，降低打扰
- 动作按钮默认 opacity-0，hover/focus 时显现，避免污染信息流视觉

### 相关文件
- `src/components/news/newsActions.ts`
- `src/components/news/NewsItemActions.tsx`
- `src/components/news/TrendingView.tsx`
- `src/components/news/GitHubView.tsx`
- `src/components/news/RSSView.tsx`
- `src/components/news/BookmarksView.tsx`
- `src/components/ExploreView.tsx`
- `src/components/NewsView.tsx`
- `src/App.tsx`

### 待办（下一步 B）
- B 依赖 Tauri 桌面 API：需确认 `src-tauri` 已启用 clipboard-plugin / global-shortcut 或监听系统剪贴板变更
- 监听复制事件 → 弹出「存为任务 / 便签 / 日记」轻量窗或面板
- 便签写入走 `useStickyNotes`（notesHook）；任务/日记复用 A 中已建 handler 思路
