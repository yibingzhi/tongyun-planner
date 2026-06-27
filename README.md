# QiYun List

一款基于 Tauri + React + TypeScript 构建的现代化待办事项管理应用，采用艾森豪威尔四象限法则进行任务管理。

## 功能特性

### 核心功能
- **四象限任务管理**：基于重要/紧急维度将任务分为四个象限
  - 重要且紧急（立即处理）
  - 重要不紧急（计划安排）
  - 紧急不重要（委托他人）
  - 不重要不紧急（尽量不做）
- **多视图切换**：矩阵视图、列表视图、日历视图
- **任务详情**：支持标题、描述、备注、截止日期、收藏、置顶
- **快速添加**：智能任务添加，支持 AI 自动分类
- **番茄钟计时**：内置番茄工作法计时器
- **便签功能**：浮动便签窗口，支持多种颜色
- **数据分析**：任务完成统计和可视化
- **桌面小组件**：独立的小组件窗口，支持卡片、列表、添加、计时、便签等多种视图

### 个性化定制
- **主题颜色**：蜜桃粉、抹茶绿、天空蓝、香芋紫、珊瑚橙、甘菊黄
- **卡片背景**：纯色、网格、横线、水彩、涂鸦
- **图钉样式**：图钉、胶带、回形针、爱心、笑脸
- **字体选择**：无衬线、圆体、衬线
- **界面风格**：透明、磨砂、实体
- **日落模式**：自动夜间模式，支持自定义时间和色温

### AI 集成
- **智能分类**：支持 OpenAI、Anthropic 等 AI 服务
- **自动归类**：根据任务内容自动推荐象限分类
- **自定义提示词**：可自定义 AI 分类的系统提示词

### 数据同步
- **WebDAV 同步**：支持 WebDAV 协议进行数据备份和同步
- **本地存储**：使用 Tauri Store 插件进行本地数据持久化

## 界面展示

> 💡 将您的应用截图放在 `screenshots/ 目录中，并更新以下路径`

| 矩阵视图 | 列表视图 | 日历视图 |
|:---:|:---:|:---:|
| ![矩阵视图](screenshots/matrix-view.png) | ![列表视图](screenshots/list-view.png) | ![日历视图](screenshots/calendar-view.png) |
| **桌面小组件** | **番茄钟** | **设置页面** |
| ![桌面小组件](screenshots/widget.png) | ![番茄钟](screenshots/pomodoro.png) | ![设置页面](screenshots/settings.png) |

## 技术栈

### 前端
- **框架**：React 19 + TypeScript
- **构建工具**：Vite 7
- **样式**：Tailwind CSS 4
- **动画**：Framer Motion
- **图标**：Lucide React
- **状态管理**：React Hooks

### 后端
- **桌面框架**：Tauri 2
- **语言**：Rust
- **数据存储**：Tauri Store 插件

### 开发工具
- **包管理**：npm
- **代码检查**：TypeScript 类型检查
- **格式化**：Prettier（可选）

## 项目架构

详细的架构说明请查看 [ARCHITECTURE.md](ARCHITECTURE.md) 文件。

## 常见问题

常见问题解答请查看 [FAQ.md](FAQ.md) 文件。

## 项目路线图

未来规划请查看 [ROADMAP.md](ROADMAP.md) 文件。

## 安装要求

### 开发环境
- **Node.js**：18.0 或更高版本
- **npm**：9.0 或更高版本
- **Rust**：1.70 或更高版本
- **系统依赖**：
  - Windows：Microsoft Visual Studio C++ Build Tools
  - macOS：Xcode Command Line Tools
  - Linux：`sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### 运行环境
- Windows 10/11、macOS 12+、Linux（主流发行版）

## 开发指南

### 1. 克隆项目
```bash
git clone https://gitee.com/your-username/qiyun-list.git
cd qiyun-list
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发服务器
```bash
npm run tauri dev
```

### 4. 构建生产版本
```bash
npm run tauri build
```

### 可用脚本
- `npm run dev` - 启动前端开发服务器
- `npm run build` - 构建前端
- `npm run tauri dev` - 启动 Tauri 开发模式
- `npm run tauri build` - 构建生产版本
- `npm run typecheck` - TypeScript 类型检查
- `npm run check:rust` - Rust 代码检查
- `npm run check` - 完整检查（前端 + 后端）

## 项目结构

```
qiyun-list/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   │   ├── MatrixView.tsx  # 四象限矩阵视图
│   │   ├── ListView.tsx    # 列表视图
│   │   ├── CalendarView.tsx# 日历视图
│   │   ├── Sidebar.tsx     # 侧边栏
│   │   ├── SettingsView.tsx# 设置页面
│   │   └── ...             # 其他组件
│   ├── App.tsx             # 主应用组件
│   ├── types.ts            # TypeScript 类型定义
│   ├── constants.ts        # 常量和配置
│   └── index.css           # 全局样式
├── src-tauri/              # Tauri 后端
│   ├── src/                # Rust 源码
│   ├── icons/              # 应用图标
│   ├── capabilities/       # 权限配置
│   └── tauri.conf.json     # Tauri 配置
├── public/                 # 静态资源
├── package.json            # 前端依赖
└── vite.config.ts          # Vite 配置
```

## 配置说明

### Tauri 配置 (`src-tauri/tauri.conf.json`)
- 应用标识：`com.qiyunlist.app`
- 主窗口：1020×720，无边框设计
- 小组件窗口：300×400，置顶、透明、无任务栏

### 应用设置
在应用内设置页面可以配置：
- 主题颜色和样式
- AI 服务提供商和 API 密钥
- WebDAV 同步参数
- 日落模式时间
- 提醒声音类型

## 贡献指南

详细的贡献指南请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 文件。

1. Fork 本仓库
2. 新建功能分支：`git checkout -b feature/your-feature`
3. 提交代码：`git commit -m 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 新建 Pull Request

### 代码规范
- 前端：遵循 TypeScript 严格模式，使用 ESLint
- 后端：遵循 Rust 官方风格指南
- 提交信息：使用中文或英文，清晰描述变更内容

### 行为准则
请遵守本项目的行为准则，详情请查看 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 文件。

## 许可证

本项目基于 MIT 许可证开源。详情请参阅 [LICENSE](LICENSE) 文件。

## 安全策略

安全策略请查看 [SECURITY.md](SECURITY.md) 文件。

## 支持渠道

支持渠道请查看 [SUPPORT.md](SUPPORT.md) 文件。

## 致谢

致谢列表请查看 [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) 文件。

## 更新日志

详细的更新日志请查看 [CHANGELOG.md](CHANGELOG.md) 文件。

### v0.1.0 (2026-06-27)
- 初始版本发布
- 实现四象限任务管理
- 支持多种视图切换
- 集成番茄钟计时器
- 添加桌面小组件
- 支持 AI 智能分类
- 实现 WebDAV 数据同步
