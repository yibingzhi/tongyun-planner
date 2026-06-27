# QiYun List

A modern todo management application built with Tauri + React + TypeScript, using the Eisenhower Matrix for task management.

## Features

### Core Features
- **Four-Quadrant Task Management**: Categorize tasks based on importance/urgency dimensions
  - Important & Urgent (Do First)
  - Important & Not Urgent (Schedule)
  - Urgent & Not Important (Delegate)
  - Not Urgent & Not Important (Don't Do)
- **Multiple Views**: Matrix view, list view, calendar view
- **Task Details**: Title, description, notes, due date, favorites, pinning
- **Quick Add**: Smart task creation with AI auto-categorization
- **Pomodoro Timer**: Built-in Pomodoro technique timer
- **Sticky Notes**: Floating note windows with multiple colors
- **Analytics**: Task completion statistics and visualization
- **Desktop Widget**: Standalone widget window with card, list, add, timer, and notes views

### Personalization
- **Theme Colors**: Rose, Matcha, Sky, Lavender, Coral, Chamomile
- **Card Backgrounds**: Solid, Grid, Lined, Watercolor, Doodle
- **Pin Styles**: Pin, Tape, Clip, Heart, Smiley
- **Font Options**: Sans-serif, Rounded, Serif
- **Interface Styles**: Transparent, Matte, Solid
- **Sunset Mode**: Automatic night mode with customizable time and warmth

### AI Integration
- **Smart Categorization**: Support for OpenAI, Anthropic, and other AI services
- **Auto-classification**: Automatic quadrant recommendation based on task content
- **Custom Prompts**: Customizable system prompts for AI classification

### Data Sync
- **WebDAV Sync**: Data backup and synchronization via WebDAV protocol
- **Local Storage**: Local data persistence using Tauri Store plugin

## Screenshots

> 💡 Place your application screenshots in the `screenshots/` directory and update the paths below

| Matrix View | List View | Calendar View |
|:---:|:---:|:---:|
| ![Matrix View](screenshots/matrix-view.png) | ![List View](screenshots/list-view.png) | ![Calendar View](screenshots/calendar-view.png) |
| **Desktop Widget** | **Pomodoro Timer** | **Settings** |
| ![Desktop Widget](screenshots/widget.png) | ![Pomodoro Timer](screenshots/pomodoro.png) | ![Settings](screenshots/settings.png) |

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Hooks

### Backend
- **Desktop Framework**: Tauri 2
- **Language**: Rust
- **Data Storage**: Tauri Store plugin

### Development Tools
- **Package Manager**: npm
- **Code Linting**: TypeScript type checking
- **Formatting**: Prettier (optional)

## Architecture

For detailed architecture documentation, please see the [ARCHITECTURE.md](ARCHITECTURE.md) file.

## FAQ

For frequently asked questions, please see the [FAQ.md](FAQ.md) file.

## Roadmap

For future plans and roadmap, please see the [ROADMAP.md](ROADMAP.md) file.

## Installation Requirements

### Development Environment
- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Rust**: 1.70 or higher
- **System Dependencies**:
  - Windows: Microsoft Visual Studio C++ Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### Runtime Environment
- Windows 10/11, macOS 12+, Linux (major distributions)

## Development Guide

### 1. Clone the Project
```bash
git clone https://gitee.com/your-username/qiyun-list.git
cd qiyun-list
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run tauri dev
```

### 4. Build for Production
```bash
npm run tauri build
```

### Available Scripts
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend
- `npm run tauri dev` - Start Tauri development mode
- `npm run tauri build` - Build production version
- `npm run typecheck` - TypeScript type checking
- `npm run check:rust` - Rust code checking
- `npm run check` - Full check (frontend + backend)

## Project Structure

```
qiyun-list/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── MatrixView.tsx  # Four-quadrant matrix view
│   │   ├── ListView.tsx    # List view
│   │   ├── CalendarView.tsx# Calendar view
│   │   ├── Sidebar.tsx     # Sidebar
│   │   ├── SettingsView.tsx# Settings page
│   │   └── ...             # Other components
│   ├── App.tsx             # Main application component
│   ├── types.ts            # TypeScript type definitions
│   ├── constants.ts        # Constants and configuration
│   └── index.css           # Global styles
├── src-tauri/              # Tauri backend
│   ├── src/                # Rust source code
│   ├── icons/              # Application icons
│   ├── capabilities/       # Permission configuration
│   └── tauri.conf.json     # Tauri configuration
├── public/                 # Static assets
├── package.json            # Frontend dependencies
└── vite.config.ts          # Vite configuration
```

## Configuration

### Tauri Configuration (`src-tauri/tauri.conf.json`)
- Application ID: `com.qiyunlist.app`
- Main window: 1020×720, borderless design
- Widget window: 300×400, always-on-top, transparent, skip taskbar

### Application Settings
In the application settings page, you can configure:
- Theme colors and styles
- AI service provider and API keys
- WebDAV synchronization parameters
- Sunset mode timing
- Reminder sound types

## Contributing

For detailed contributing guidelines, please see the [CONTRIBUTING.md](CONTRIBUTING.md) file.

1. Fork this repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Create Pull Request

### Code Standards
- Frontend: Follow TypeScript strict mode, use ESLint
- Backend: Follow Rust official style guidelines
- Commit messages: Use Chinese or English, clearly describe changes

### Code of Conduct
Please follow the code of conduct for this project. See the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) file for details.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Security Policy

For security policy, please see the [SECURITY.md](SECURITY.md) file.

## Support Channels

For support channels, please see the [SUPPORT.md](SUPPORT.md) file.

## Acknowledgments

For acknowledgments, please see the [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) file.

## Changelog

For detailed changelog, please see the [CHANGELOG.md](CHANGELOG.md) file.

### v0.1.0 (2026-06-27)
- Initial release
- Four-quadrant task management
- Multiple view switching
- Pomodoro timer integration
- Desktop widget support
- AI smart categorization
- WebDAV data synchronization
