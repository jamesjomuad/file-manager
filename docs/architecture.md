# Architecture Guide

## Overview

BoardUI File Manager is a **full-stack Next.js application** that combines server-side filesystem operations with a rich client-side interface. The architecture prioritizes security, performance, and maintainability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  React 19    │  │  BoardUI     │  │  React       │  │
│  │  Components  │  │  Design Sys  │  │  Router      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Monaco      │  │  Zustand     │  │  Sharp       │  │
│  │  Editor      │  │  Stores      │  │  (Server)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                    REST API (JSON)
                           │
┌─────────────────────────────────────────────────────────┐
│                  Next.js App Router (Server)              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  API Routes  │  │  Filesystem  │  │  Archive     │  │
│  │  /api/*      │  │  Service     │  │  Service     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  Security    │  │  Thumbnail   │                     │
│  │  Layer       │  │  Service     │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                           │
                    Local Filesystem
                    (Configured Root)
```

## Core Layers

### 1. Presentation Layer (Client)

**BoardUI Design System**
- Semantic tokens (`text-text-primary`, `bg-background-primary-default`)
- Composite typography (`text-body-regular`, `text-title-1-semibold`)
- Component library (buttons, inputs, dropdowns, context menus)
- Dark mode via `[data-theme]` attribute on `<html>`

**Component Hierarchy**
```
AppShell
├── Sidebar (navigation, trash count)
├── Header (breadcrumbs, search, view controls)
├── Main Content
│   ├── FileExplorer (grid/list views)
│   ├── Editor (Monaco Editor with tabs)
│   ├── ImageViewer (filmstrip, zoom, rotate)
│   ├── TextViewer (read-only code display)
│   ├── PdfViewer (browser-native)
│   └── ArchiveBrowser (tree view, extract)
└── Modals (QuickOpen, Confirm, Compress, Extract)
```

**State Management (Zustand)**

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `settings-store` | App theme, accent color | localStorage |
| `editor-store` | Font size, word wrap, minimap | localStorage |
| `explorer-store` | View mode, sort preferences | localStorage |
| `trash-store` | Trash count, refresh actions | None (session) |
| `workspace-store` | Open tabs, active tab | sessionStorage |

### 2. Routing Layer

**Dual Routing Strategy**

1. **Next.js App Router** — Server-side routing for pages and API routes
2. **React Router (Hash)** — Client-side routing for workspace navigation

```javascript
// Hash-based URLs (client-side)
#/explorer              // File explorer (root)
#/explorer/folder/sub   // Nested folder (splat param)
#/recent                // Recent files view
#/favorites             // Favorites view
#/trash                 // Trash view
#/settings              // Settings page
#/settings/appearance   // Appearance settings
```

**Why Hash Routing?**
- Works with static hosting (no server config needed)
- Compatible with Next.js App Router
- Bookmarkable URLs with browser history support
- No conflicts with Next.js routes

**Route Configuration** (`src/lib/router/routes.js`):
```javascript
{
  path: '/',
  element: <AppLayout />,
  children: [
    { path: 'explorer', element: <ExplorerRoute /> },
    { path: 'explorer/*', element: <ExplorerRoute /> },
    { path: 'recent', element: <RecentView /> },
    { path: 'favorites', element: <FavoritesView /> },
    { path: 'trash', element: <TrashView /> },
    { path: 'settings', element: <SettingsView /> },
    { path: 'settings/appearance', element: <SettingsView /> },
  ]
}
```

### 3. Data Layer (Server)

**Filesystem Service** (`src/lib/filesystem/service.js`)

Core operations:
- `listDirectory(dirPath)` — List files with metadata
- `readFile(filePath)` — Read text content (5MB limit)
- `writeFile(filePath, content)` — Write text files
- `createDirectory(dirPath)` — Create folders
- `deleteItem(targetPath)` — Move to trash
- `renameItem(oldPath, newPath)` — Rename files/folders
- `copyItem(srcPath, destPath)` — Copy files
- `getMetadata(targetPath)` — Get file stats

All operations go through `validatePath()` for security.

**Archive Service** (`src/lib/archive/service.js`)

ZIP operations:
- `compressArchive({ outputPath, items, compressionLevel })` — Create ZIP
- `extractArchive({ archivePath, destPath, conflictStrategy })` — Extract ZIP
- `getArchiveInfo(archivePath)` — Read archive metadata
- `validateEntryPath(entryPath, destDir)` — ZIP Slip prevention

Compression levels:
- Store (0) — No compression
- Fast (1) — Fast compression
- Normal (6) — Balanced (default)
- Maximum (9) — Best compression

**Thumbnail Service** (`src/lib/image/thumbnail-service.js`)

- Server-side image processing with Sharp
- Lazy generation (on-demand)
- Cached to `.thumbnails/` directory
- Hidden from explorer (system directory)

### 4. Security Layer

**Path Validation** (`src/lib/filesystem/security.js`)

```javascript
validatePath(userPath) {
  // 1. Resolve to absolute path
  const absolutePath = path.resolve(ROOT_DIR, userPath);
  
  // 2. Check for path traversal
  if (!absolutePath.startsWith(ROOT_DIR)) {
    throw new Error('Path traversal detected');
  }
  
  // 3. Check for symlink escapes
  if (stats.isSymbolicLink()) {
    const target = await fs.realpath(absolutePath);
    if (!target.startsWith(ROOT_DIR)) {
      throw new Error('Symlink escapes root');
    }
  }
  
  return absolutePath;
}
```

**Archive Security**:
- ZIP Slip prevention (reject `../`, absolute paths)
- Executable blocking (`.exe`, `.bat`, `.cmd`, `.scr`, `.msi`, `.com`)
- Size limits (500MB/file, 2GB/archive, 100k entries)
- Decompression ratio checks (100x max)

### 5. API Layer

**REST Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/files` | GET | List directory |
| `/api/files` | POST | Create file/folder |
| `/api/files/[...path]` | GET | Read file |
| `/api/files/[...path]` | PUT | Update file |
| `/api/files/[...path]` | DELETE | Delete file |
| `/api/files/upload` | POST | Upload files |
| `/api/files/search` | GET | Search files |
| `/api/files/archive` | GET | List/Read archive |
| `/api/files/archive/compress` | POST | Create ZIP |
| `/api/files/archive/extract` | POST | Extract ZIP |
| `/api/thumbnails/[...path]` | GET | Get thumbnail |
| `/api/trash` | GET | List trash |
| `/api/trash/[...path]` | DELETE | Permanent delete |
| `/api/trash/restore` | POST | Restore from trash |
| `/api/trash/empty` | DELETE | Empty trash |

**Request/Response Format**

All endpoints return JSON:
```javascript
// Success
{
  "success": true,
  "data": { /* response data */ }
}

// Error
{
  "success": false,
  "error": "Error message"
}
```

## Design Decisions

### Why Next.js App Router?
- Server Components for performance
- API routes co-located with frontend
- Built-in optimization (images, fonts, scripts)
- Modern React patterns (Suspense, streaming)

### Why React Router (Hash)?
- Client-side navigation without page reloads
- Works with Next.js App Router
- No server configuration needed
- Compatible with static hosting

### Why Zustand?
- Lightweight (1KB)
- No boilerplate (no reducers, actions)
- React Server Components compatible
- Built-in persistence middleware

### Why Monaco Editor?
- VS Code's editor (industry standard)
- 30+ language support
- IntelliSense, find/replace, minimap
- CDN-loaded (no build config needed)

### Why BoardUI?
- Professional design system
- Semantic tokens (consistent theming)
- Accessible components (React Aria)
- Dark mode support out of the box

### Why adm-zip?
- Pure JavaScript (no native dependencies)
- Simple API for ZIP operations
- Good performance for typical use cases
- Future-proof (can add TAR, 7Z later)

### Why Sharp?
- Fastest image processing library
- Server-side thumbnail generation
- Supports all modern formats
- Low memory footprint

## Performance Optimizations

### Client-Side
- **Lazy Loading** — Monaco Editor, Image Viewer loaded on demand
- **Code Splitting** — Routes split into separate chunks
- **Image Optimization** — Lazy-load thumbnails, on-demand gallery loading
- **Virtualization** — Long file lists use virtual scrolling (future)
- **Memoization** — React.memo, useMemo, useCallback for expensive operations

### Server-Side
- **Streaming** — Large file downloads use streams
- **Caching** — Thumbnails cached to disk
- **Compression** — Gzip compression for API responses
- **Connection Pooling** — Reuse filesystem handles

### Build-Time
- **Turbopack** — Fast dev server with HMR
- **Tree Shaking** — Remove unused code
- **Minification** — Compress JavaScript/CSS
- **Optimization** — Next.js automatic image/font optimization

## Extensibility

### Adding New File Types

1. **Update `src/lib/file-type.js`**:
```javascript
const NEW_EXTENSIONS = ['.xyz'];

export function isNewType(extension) {
  const ext = normalizeExtension(extension);
  return NEW_EXTENSIONS.includes(ext);
}
```

2. **Add preview component** (if needed):
```javascript
// src/components/file-manager/file-preview-modal.jsx
if (isNewType(file.extension)) {
  return <NewTypePreview file={file} />;
}
```

3. **Update icon mapping**:
```javascript
// src/components/file-manager/file-icon.jsx
if (isNewType(extension)) {
  return <RiNewTypeLine />;
}
```

### Adding New Archive Formats

1. **Install library**:
```bash
npm install node-tar  # For TAR support
```

2. **Update archive service**:
```javascript
// src/lib/archive/service.js
import tar from 'node-tar';

export async function extractTar(archivePath, destPath) {
  await tar.x({
    file: archivePath,
    cwd: destPath,
  });
}
```

3. **Update API route**:
```javascript
// src/app/api/files/archive/extract/route.js
if (archivePath.endsWith('.tar')) {
  return extractTar(archivePath, destPath);
}
```

### Adding New Themes

1. **Update theme CSS** (`src/styles/themes.css`):
```css
[data-theme="new-theme"] {
  --color-background-primary-default: #1a1a2e;
  --color-text-primary: #eaeaea;
  /* ... more tokens ... */
}
```

2. **Add to theme list** (`src/stores/settings-store.js`):
```javascript
const themes = [
  // ... existing themes
  { id: 'new-theme', name: 'New Theme', type: 'dark' }
];
```

3. **Add Monaco theme** (`src/lib/monaco/monaco-themes.js`):
```javascript
{
  id: 'new-theme',
  base: 'vs-dark',
  inherit: true,
  colors: { /* ... */ },
  rules: [ /* ... */ ]
}
```

## Testing Strategy

### Manual Testing Checklist

**File Operations:**
- [ ] Create file/folder
- [ ] Rename file/folder
- [ ] Delete file/folder (moves to trash)
- [ ] Restore from trash
- [ ] Permanent delete from trash
- [ ] Copy/move files
- [ ] Upload files (drag-drop, file picker)

**Editor:**
- [ ] Open file in editor
- [ ] Edit and save (Ctrl+S)
- [ ] Multiple tabs
- [ ] Unsaved changes indicator
- [ ] Find & replace (Ctrl+F, Ctrl+H)
- [ ] Syntax highlighting (JS, TS, Python, etc.)

**Image Viewer:**
- [ ] Open image
- [ ] Zoom in/out (mouse wheel)
- [ ] Pan (drag)
- [ ] Rotate (90°, 180°, 270°)
- [ ] Flip (horizontal, vertical)
- [ ] Filmstrip navigation
- [ ] EXIF metadata display

**Archive:**
- [ ] Create ZIP from files
- [ ] Create ZIP from folder
- [ ] Extract ZIP (all files)
- [ ] Extract ZIP (selected files)
- [ ] Browse ZIP contents
- [ ] Preview files in ZIP
- [ ] Conflict resolution (skip/replace/rename/keep both)

**Security:**
- [ ] Path traversal attempt (`../../etc/passwd`)
- [ ] Symlink escape attempt
- [ ] ZIP Slip attempt (malicious archive)
- [ ] Executable extraction blocked
- [ ] Oversized file rejected

## Future Architecture Considerations

### WebSocket Integration
- Real-time file change notifications
- Collaborative editing
- Live sync across tabs

### Database Layer
- File metadata cache (faster search)
- User preferences (multi-user support)
- File versioning history

### Plugin System
- Custom file handlers
- Third-party integrations
- Extensible toolbar actions

### Cloud Storage
- S3 adapter
- Google Drive adapter
- Dropbox adapter
- Unified file operations interface

---

**Last Updated:** November 2026
