# BoardUI File Manager

A modern, feature-rich file manager built with **Next.js 16** and **BoardUI**. Browse, edit, preview, and manage files through a professional interface powered by the BoardUI design system.

![File Manager Demo](https://img.shields.io/badge/Next.js-16.4.6-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.3.0-blue?style=for-the-badge&logo=react)
![BoardUI](https://img.shields.io/badge/BoardUI-Latest-purple?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

### 📁 File Management
- **Browse & Navigate** — Grid and list views with sorting (name, size, date, type)
- **Create & Organize** — Create files and folders, rename, move, copy, delete
- **Multi-Select** — Select multiple files for bulk operations
- **Drag & Drop** — Upload files by dragging them into the browser
- **Trash System** — Deleted files go to trash with restore capability
- **Favorites** — Star files and folders for quick access
- **Recent Files** — Track recently opened files

### 🔍 Search & Navigation
- **Quick Open** — Press `Ctrl+P` to search and open any file instantly
- **Breadcrumb Navigation** — Navigate through folder hierarchy
- **Hash-Based Routing** — Bookmarkable URLs with browser history support
- **Search** — Find files by name across the filesystem

### 📝 Code Editor
- **Monaco Editor** — Full-featured code editor from VS Code
- **Multi-Tab** — Open multiple files in tabs with drag-to-reorder
- **30+ Languages** — Syntax highlighting for JavaScript, TypeScript, Python, PHP, Go, Rust, and more
- **Unsaved Changes** — Visual indicators for modified files
- **Keyboard Shortcuts** — `Ctrl+S` save, `Ctrl+W` close, `Ctrl+F` find, `Ctrl+H` replace
- **10 Themes** — Editor themes match application themes
- **Minimap** — Code overview with minimap toggle
- **Find & Replace** — Full regex support

### 🖼️ Image Viewer
- **Filmstrip Gallery** — Browse all images in a folder
- **Zoom & Pan** — Mouse wheel zoom, drag to pan, pinch-to-zoom
- **Rotate & Flip** — Rotate 90°, flip horizontal/vertical
- **EXIF Metadata** — View camera settings, dimensions, file size
- **On-Demand Loading** — Lazy-load images for performance
- **Supported Formats** — JPG, PNG, GIF, WebP, SVG, BMP, AVIF, ICO

### 📄 Document Preview
- **PDF Viewer** — Browser-native PDF rendering
- **Text Viewer** — Plain text with line numbers
- **Archive Browser** — Browse ZIP contents without extraction
- **File Preview Modal** — Quick preview without opening full viewer

### 🗜️ Archive Management
- **Create ZIP Archives** — Compress files and folders with 4 compression levels
- **Extract Archives** — Extract with conflict resolution (skip/replace/rename/keep both)
- **Browse Archives** — View ZIP contents like a folder
- **Extract Selected** — Extract specific files from archives
- **Progress Tracking** — Real-time compression/extraction progress
- **Security** — ZIP Slip prevention, executable blocking, size limits

### 🎨 10 Professional Themes
**Dark Themes (7):**
- Midnight Pro (default)
- Dracula
- One Dark Pro
- Tokyo Night
- Catppuccin Mocha
- GitHub Dark Dimmed
- Nord

**Light Themes (3):**
- GitHub Light
- Catppuccin Latte
- One Light

Customize accent colors, editor fonts, word wrap, minimap, and more.

### ⌨️ Keyboard Shortcuts
- `Ctrl+P` — Quick Open
- `Ctrl+A` — Select all files
- `Delete` — Delete selected files
- `F2` — Rename selected file
- `Escape` — Clear selection
- `Enter` — Open selected file
- `Backspace` — Navigate to parent folder
- `Arrow Keys` — Navigate file selection
- `Ctrl+S` — Save file (editor)
- `Ctrl+W` — Close tab (editor)
- `Ctrl+F` — Find (editor)
- `Ctrl+H` — Find & Replace (editor)

### 🎯 Workspace Features
- **Tabbed Interface** — Explorer, Editor, Image Viewer, Text Viewer, PDF Viewer, Archive Browser
- **Drag-to-Reorder Tabs** — Reorganize workspace tabs
- **Persistent State** — Remember open tabs and workspace layout
- **Responsive Design** — Works on desktop and tablet

### 🔒 Security
- **Path Traversal Prevention** — All paths validated against root directory
- **Symlink Protection** — Prevent symlink escapes
- **ZIP Slip Prevention** — Validate archive entries before extraction
- **Executable Blocking** — Block `.exe`, `.bat`, `.cmd`, `.scr`, `.msi`, `.com` extraction
- **Size Limits** — 500MB per file, 2GB archive, 100k entries
- **Server-Side Validation** — Never trust client-provided paths

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/board-ui.git
cd board-ui
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure root directory:**

Create `.env.local` in the project root:
```env
FILE_MANAGER_ROOT=./data
```

Or use an absolute path:
```env
FILE_MANAGER_ROOT=/path/to/your/files
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Open in browser:**
```
http://localhost:3000
```

## 📦 Production Build

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## 🏗️ Architecture

```
board-ui/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── files/           # File operations
│   │   │   ├── trash/           # Trash operations
│   │   │   └── thumbnails/      # Thumbnail generation
│   │   ├── workspace/           # Main workspace page
│   │   └── layout.jsx           # Root layout
│   ├── components/
│   │   ├── base/                # BoardUI components
│   │   ├── workspace/           # Workspace shell & tabs
│   │   ├── file-manager/        # File browsing components
│   │   ├── editor/              # Monaco Editor wrapper
│   │   ├── image-viewer/        # Image viewer components
│   │   └── archive/             # Archive dialogs
│   ├── lib/
│   │   ├── filesystem/          # Filesystem service & security
│   │   ├── archive/             # Archive operations (ZIP)
│   │   ├── image/               # Image processing utilities
│   │   ├── monaco/              # Monaco Editor themes & config
│   │   └── router/              # React Router setup
│   ├── stores/                  # Zustand state management
│   ├── hooks/                   # React hooks
│   ├── contexts/                # React contexts
│   └── styles/                  # Global styles & themes
├── data/                        # Default file root (created on first run)
└── public/                      # Static assets
```

### Key Technologies
- **Next.js 16.4.6** — React framework with App Router
- **React 19.3.0** — UI library with Server Components
- **BoardUI** — Design system with semantic tokens
- **Tailwind CSS v4** — Utility-first CSS
- **React Aria Components** — Accessible UI primitives
- **Monaco Editor** — VS Code's editor (CDN-loaded)
- **Zustand** — Lightweight state management
- **React Router** — Hash-based client-side routing
- **adm-zip** — ZIP archive operations
- **Sharp** — High-performance image processing

## 📚 Documentation

- **[Architecture Guide](docs/architecture.md)** — Technical architecture and design decisions
- **[Features](docs/features.md)** — Detailed feature documentation
- **[Security Model](docs/security.md)** — Security architecture and best practices
- **[API Reference](docs/api-reference.md)** — REST API documentation
- **[Theme System](docs/themes.md)** — Creating and customizing themes
- **[Contributing](docs/contributing.md)** — Contribution guidelines

## 🛠️ Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Code Style

- **JavaScript/JSX only** — No TypeScript
- **Semantic tokens** — Use BoardUI design tokens (never raw colors)
- **Functional components** — Modern React patterns
- **JSDoc comments** — Document all functions and components
- **BoardUI components** — Prefer BoardUI over custom implementations

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_MANAGER_ROOT` | Root directory for file operations | `./data` |

### Editor Settings

Configurable via Settings page or `src/stores/editor-store.js`:
- Font size (8-32px, default: 14)
- Word wrap (on/off/wordWrapColumn)
- Minimap (toggle)
- Theme (synced with app theme)

## 🗺️ Roadmap

### Planned Features
- **Additional Archive Formats** — TAR, TAR.GZ, 7Z, RAR
- **Real-time Updates** — WebSocket for live file changes
- **User Authentication** — Multi-user support with permissions
- **Cloud Storage** — S3, Google Drive, Dropbox integration
- **File Sharing** — Share files via public links
- **File Versioning** — Track file history and restore versions
- **Collaborative Editing** — Real-time collaborative code editing
- **Advanced Search** — Full-text search with filters
- **File Comparison** — Diff viewer for code files
- **Terminal Integration** — Embedded terminal for command execution

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/contributing.md) for guidelines.

### Quick Contribution Guide
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow code style guidelines
4. Test your changes
5. Commit with conventional messages
6. Push and open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Next.js](https://nextjs.org/)** — React framework
- **[BoardUI](https://www.boardui.com/)** — Design system and components
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** — VS Code's editor
- **[React Aria](https://react-spectrum.adobe.com/react-aria/)** — Accessible components
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first CSS
- **[Zustand](https://zustand-demo.pmnd.rs/)** — State management
- **[Remix Icons](https://remixicon.com/)** — Icon library
- **[Sharp](https://sharp.pixelplumbing.com/)** — Image processing

## 📞 Support

- **Issues** — [GitHub Issues](https://github.com/yourusername/board-ui/issues)
- **Discussions** — [GitHub Discussions](https://github.com/yourusername/board-ui/discussions)

## 🌟 Show Your Support

If you find this project useful, please consider giving it a star ⭐ on GitHub!

---

**Built with ❤️ using Next.js and BoardUI**
