# 更新日志

本文档记录 QiYun List 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-06-27

### 新增
- 四象限任务管理功能
- 多视图切换（矩阵、列表、日历）
- 任务详情（标题、描述、备注、截止日期、收藏、置顶）
- 快速添加任务，支持 AI 自动分类
- 番茄钟计时器
- 便签功能（浮动窗口，多种颜色）
- 数据分析（任务完成统计和可视化）
- 桌面小组件（卡片、列表、添加、计时、便签视图）
- 个性化定制（主题颜色、卡片背景、图钉样式、字体、界面风格）
- 日落模式（自动夜间模式）
- AI 集成（OpenAI、Anthropic 等服务）
- WebDAV 数据同步
- 本地数据存储

### 技术栈
- 前端：React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- 后端：Tauri 2 + Rust
- 动画：Framer Motion
- 图标：Lucide React

### 已知问题
- 初始版本，可能存在一些未知问题
- AI 分类功能需要配置 API 密钥
- WebDAV 同步需要配置服务器信息