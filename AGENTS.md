# File Manager Application - Agent Guidelines

## Project Overview

This is a **standalone File Manager application** built with Next.js and BoardUI. The primary objective is to explore and learn the Next.js framework and BoardUI component library while developing a functional file manager.

**Important:** This project is completely independent of Lerd. Do not implement Lerd plugin integration, Lerd APIs, plugin manifests, or Lerd-specific filesystem restrictions.

## Technology Stack

### Core Framework
- **Next.js 16.4.6** (App Router)
- **React 19.3.0** (with Server Components)
- **JavaScript/JSX only** (no TypeScript)
- **Node.js** (native filesystem APIs)

### UI Framework
- **BoardUI** (fully integrated design system)
- **Tailwind CSS v4.3.3**
- **React Aria Components** (accessible primitives)
- **Remix Icons** (@remixicon/react)

### Build Tools
- **Turbopack** (development bundler)
- **ESLint 9** (code linting)
- **npm** (package manager)

## Language Requirements

**JavaScript/JSX Only:**
- Use `.js` and `.jsx` files exclusively
- No TypeScript (`.ts`, `.tsx`)
- No `tsconfig.json`
- No TypeScript tooling or dependencies
- Use JSDoc comments for type documentation

## Application Architecture

### Router: App Router (Next.js)

```
src/app/
├── layout.jsx              # Root layout with BoardUI providers
├── page.jsx               # Home page (redirect to /files)
├── globals.css            # Global styles (BoardUI theme)
├── files/
│   └── page.jsx          # Main file explorer
├── editor/
│   └── page.jsx          # File editor with tabs
├── settings/
│   └── page.jsx          # Application settings
└── api/
    └── files/
        ├── route.js      # GET (list), POST (create)
        └── [...path]/route.js  # GET (read), PUT (update), DELETE
```

### Component Structure

```
src/components/
├── base/                  # BoardUI components (installed)
│   ├── buttons/
│   ├── input/
│   ├── select/
│   ├── dropdown/
│   └── date-picker/
├── layout/               # Application shell
│   ├── app-shell.jsx
│   ├── sidebar.jsx
│   └── header.jsx
└── file-manager/         # File manager components
    ├── file-list.jsx
    ├── file-grid.jsx
    ├── file-icon.jsx
    ├── breadcrumb.jsx
    └── file-toolbar.jsx
```

### Feature Modules

```
src/features/
├── explorer/             # File browsing logic
├── editor/               # File editing logic
├── preview/              # File preview logic
└── search/               # Search functionality
```

### Business Logic

```
src/lib/
├── filesystem/
│   ├── service.js        # Filesystem operations
│   ├── security.js       # Path validation & security
│   └── utils.js          # Helper functions
└── constants.js          # App-wide constants

src/services/
└── file-service.js       # High-level file operations

src/hooks/
├── use-files.js          # File data fetching
├── use-file-operations.js # File CRUD operations
└── use-navigation.js     # Navigation state
```

## BoardUI Integration

### Design System Status: ✓ Fully Installed

BoardUI is completely integrated with:

**Semantic Tokens:**
- Color system: `text-text-primary`, `bg-background-primary-default`, `border-border-button-default`
- Typography: `text-title-1-medium`, `text-body-regular`, `text-caption-1-semibold`
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-card`, `shadow-sidebar`
- Spacing: Tailwind scale (`gap-2`, `p-4`, `m-6`)

**Components:**
- Buttons (primary, secondary, ghost, danger)
- Inputs (text, select, checkbox, radio, switch)
- Dropdowns and menus
- Date pickers
- Tables
- Cards and panels

**Key Rules:**
1. **Use semantic tokens only** - never raw palette classes (`text-gray-500`, `bg-white`)
2. **Use composite typography** - never stack `text-sm font-medium leading-5`
3. **Use `cx()` utility** - from `@/utils/cx` for class merging
4. **Pass icon components** - `leadingIcon={RiAddLine}`, not `<RiAddLine />`
5. **Prefer BoardUI components** - check `components/base/` before building custom

**Dark Mode:**
- Class-based via `.dark` on `<html>`
- Automatic via semantic tokens
- No manual `dark:` overrides with raw colors

**Reference:**
- See `src/styles/theme.css` for color tokens
- See `src/styles/typography.css` for type ramp
- See `src/styles/globals.css` for global styles
- See `AGENTS.md` in root for BoardUI design rules

## Filesystem Backend

### Architecture

**Route Handlers** (`src/app/api/files/`):
- All filesystem operations through API routes
- Server-side only (never expose filesystem to client)
- JSON responses with proper error handling

**Service Layer** (`src/lib/filesystem/service.js`):
- Business logic for file operations
- Path resolution and validation
- Error handling and logging

**Security Layer** (`src/lib/filesystem/security.js`):
- Path traversal prevention
- Symbolic link validation
- Root directory enforcement

### Configuration

**Root Directory:**
- Configurable via `FILE_MANAGER_ROOT` environment variable
- Default: `./data` (relative to project root)
- Stored in `.env.local` (gitignored)

**Example `.env.local`:**
```env
FILE_MANAGER_ROOT=./data
```

### Supported Operations

**Directory Operations:**
- List directory contents (with metadata)
- Create new directory
- Delete directory (with confirmation)

**File Operations:**
- Read file content (text, binary)
- Create new file
- Update file content
- Rename file/directory
- Move file/directory
- Copy file/directory
- Delete file/directory (with confirmation)
- Upload file
- Download file

**Metadata:**
- File size
- Creation date
- Modification date
- File type/extension
- Permissions (read/write)

### Security Requirements

**Critical Security Measures:**

1. **Path Traversal Prevention:**
   ```javascript
   // Resolve to absolute path
   const absolutePath = path.resolve(rootDir, userInput);
   // Verify it's within root
   if (!absolutePath.startsWith(rootDir)) {
     throw new Error('Path traversal detected');
   }
   ```

2. **Symbolic Link Protection:**
   ```javascript
   // Check for symlinks
   const stats = await fs.lstat(path);
   if (stats.isSymbolicLink()) {
     const target = await fs.realpath(path);
     if (!target.startsWith(rootDir)) {
       throw new Error('Symlink escapes root');
     }
   }
   ```

3. **Server-Side Validation:**
   - Never trust client-provided paths
   - Validate all operations server-side
   - Check file permissions before operations
   - Validate file sizes and types

4. **Destructive Operations:**
   - Require confirmation for delete
   - Implement soft delete (move to trash)
   - Log all destructive operations

5. **File Upload Security:**
   - Validate file types
   - Limit file sizes (default: 50MB)
   - Sanitize filenames
   - Prevent executable uploads

## Development Phases

### Phase 1: Foundation ✓ (Current)

**Objectives:**
- [x] Migrate TypeScript to JavaScript
- [x] Configure filesystem backend
- [x] Build application shell
- [x] Implement file listing (grid/list views)
- [x] Create component showcase
- [x] Verify builds (dev + production)

**Deliverables:**
- JavaScript-based Next.js application
- Working filesystem backend with security
- Application shell (sidebar, header, main area)
- File explorer with list/grid views
- Component showcase page
- This AGENTS.md file

### Phase 2: Application Shell

**Objectives:**
- [ ] Responsive sidebar navigation
- [ ] Breadcrumb navigation
- [ ] Search functionality
- [ ] Toolbar with view controls
- [ ] Sorting (name, date, size, type)
- [ ] Mock file data for testing

### Phase 3: File Explorer

**Objectives:**
- [ ] Browse directories (navigation)
- [ ] Open files (preview/edit)
- [ ] Create folders
- [ ] Rename files/folders
- [ ] Copy, move, delete operations
- [ ] Advanced search
- [ ] File selection (single, multiple)

### Phase 4: File Operations

**Objectives:**
- [ ] File upload (drag & drop, file picker)
- [ ] File download
- [ ] Bulk operations (select all, delete selected)
- [ ] Favorites system
- [ ] Recent files tracking
- [ ] Trash management (restore, permanent delete)

### Phase 5: Preview and Editor

**Objectives:**
- [x] File preview system with modal overlay
- [x] Image preview (jpg, png, gif, svg, webp)
- [x] PDF preview with iframe
- [x] Text file preview with line numbers
- [x] Monaco Editor integration (replaced Prism.js-based editor)
- [x] Multiple editor tabs with state management
- [x] Unsaved changes tracking and indicators
- [x] Keyboard shortcuts (Ctrl+S, Ctrl+W, Ctrl+Tab, Ctrl+F, Ctrl+H)
- [x] Tab context menu (close, close others, close all)
- [x] Language auto-detection from file extension
- [x] 10 Monaco themes matching app themes
- [x] Theme sync (editor theme follows app theme)

### Monaco Editor Integration

**Location:** `src/components/editor/monaco-editor.jsx`

**Architecture:**
- `'use client'` + `next/dynamic` with `ssr: false` (browser-only)
- Loaded from CDN (jsDelivr) — no webpack/vite config needed
- `MonacoEditorLoader` (dynamic import) exported as `MonacoEditor`

**Features:**
- Syntax highlighting for 14+ languages (JS, TS, HTML, CSS, JSON, MD, PHP, Python, Java, SQL, XML, YAML, Bash, and more)
- Line numbers, minimap, code folding, bracket matching with colorization
- Find and replace (Ctrl+F, Ctrl+H)
- Word wrap, auto-indent, multi-cursor, drag-and-drop
- Read-only mode, configurable font size and minimap visibility
- Smooth cursor animation, parameter hints, context menu

**Theme Integration:**
- `src/lib/monaco/monaco-themes.js` — 10 Monaco themes matching app themes
- Themes registered on first mount (guarded by `themesRegisteredRef`)
- Theme updates via `useEffect` when `currentTheme` changes
- Light themes use `vs` base, dark themes use `vs-dark` base
- Font family uses concrete values (CSS variables don't work in Monaco):
  `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Language Detection:**
- `src/lib/monaco/languages.js` — Maps file extensions to Monaco language IDs
- `detectLanguage(filePath)` — Returns language ID from extension
- `getLanguageName(languageId)` — Returns human-readable language name
- Covers: JavaScript, TypeScript, HTML, CSS/SCSS/LESS, JSON, YAML, XML, Markdown, Python, Java, PHP, Ruby, Go, Rust, Swift, Kotlin, C#, C, C++, Shell, SQL, Dockerfile, INI, TOML

**Props:**
- `value` — Editor content
- `onChange` — Change handler
- `filePath` — For language detection
- `language` — Override language ID
- `readOnly` — Read-only mode
- `className` — Additional classes
- `showMinimap` — Show/hide minimap (default: true)
- `wordWrap` — Word wrap mode (default: 'on')
- `fontSize` — Font size (default: 14)
- `showLineNumbers` — Show/hide line numbers (default: true)

## Coding Conventions

### File Naming
- **Components:** `kebab-case.jsx` (e.g., `file-list.jsx`)
- **Utilities:** `kebab-case.js` (e.g., `file-service.js`)
- **Hooks:** `camelCase.js` with `use` prefix (e.g., `use-files.js`)
- **API Routes:** `route.js` (Next.js convention)

### Component Structure
```jsx
// Imports
import { useState } from 'react';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.className - Additional classes
 */
export function ComponentName({ className, ...props }) {
  // State and hooks first
  const [state, setState] = useState();
  
  // Computed values
  const derived = useMemo(() => /* ... */);
  
  // Event handlers
  const handleClick = () => { /* ... */ };
  
  // Render
  return (
    <div className={cx('base-classes', className)}>
      {/* JSX */}
    </div>
  );
}
```

### JSDoc Type Documentation
```javascript
/**
 * File metadata
 * @typedef {Object} FileMetadata
 * @property {string} name - File name
 * @property {string} path - Full path
 * @property {number} size - Size in bytes
 * @property {string} type - 'file' | 'directory'
 * @property {Date} createdAt - Creation date
 * @property {Date} modifiedAt - Modification date
 */

/**
 * List directory contents
 * @param {string} directoryPath - Path relative to root
 * @returns {Promise<FileMetadata[]>} Array of file metadata
 */
export async function listDirectory(directoryPath) {
  // Implementation
}
```

### Import Order
1. React and React hooks
2. Next.js imports
3. BoardUI components (`@/components/base/`)
4. Local components (`@/components/`)
5. Utilities and hooks
6. Styles (last)

### Styling
- **Always use semantic tokens** from BoardUI
- **Never use raw colors** (`text-gray-500`, `bg-white`)
- **Use `cx()` for class merging** (not string concatenation)
- **Prefer flex/grid `gap`** over margins
- **Use logical properties** (`ms`/`me`, `ps`/`pe`, `start`/`end`)

### Error Handling
```javascript
// API Route error handling
export async function GET(request) {
  try {
    const data = await fetchData();
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

## Security Best Practices

### Path Validation
```javascript
import path from 'path';
import fs from 'fs/promises';

const ROOT_DIR = process.env.FILE_MANAGER_ROOT || './data';

/**
 * Validate and resolve path
 * @param {string} userPath - User-provided path
 * @returns {Promise<string>} Validated absolute path
 * @throws {Error} If path is invalid or escapes root
 */
export async function validatePath(userPath) {
  // Resolve to absolute
  const absolutePath = path.resolve(ROOT_DIR, userPath);
  
  // Check if within root
  const normalizedRoot = path.normalize(ROOT_DIR);
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new Error('Path traversal detected');
  }
  
  // Check if exists
  try {
    const stats = await fs.lstat(absolutePath);
    
    // Check for symlinks
    if (stats.isSymbolicLink()) {
      const target = await fs.realpath(absolutePath);
      if (!target.startsWith(normalizedRoot)) {
        throw new Error('Symlink escapes root directory');
      }
    }
    
    return absolutePath;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Path does not exist');
    }
    throw error;
  }
}
```

### File Upload Validation
```javascript
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'application/json',
  'application/zip',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function validateUpload(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type not allowed: ${file.type}`);
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.size} bytes`);
  }
  
  // Sanitize filename
  const sanitized = file.name.replace(/[^a-z0-9._-]/gi, '_');
  return sanitized;
}
```

## Testing Strategy

### Manual Testing Checklist

**Phase 1:**
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes successfully
- [ ] `npm run lint` passes
- [ ] File listing displays correctly
- [ ] Navigation between directories works
- [ ] Grid/list view toggle functions
- [ ] Dark mode toggle works
- [ ] Responsive layout on mobile

**Phase 2:**
- [ ] Create file/folder
- [ ] Rename file/folder
- [ ] Delete file/folder (with confirmation)
- [ ] Copy/paste operations
- [ ] Move operations
- [ ] Search functionality
- [ ] Sorting by name/date/size/type

**Phase 3:**
- [ ] File upload (various types)
- [ ] File download
- [ ] Multi-select operations
- [ ] Favorites add/remove
- [ ] Recent files tracking
- [ ] Trash operations

**Phase 4:**
- [ ] Image preview
- [ ] PDF preview
- [ ] Text file preview
- [ ] Code editor with syntax highlighting
- [ ] Multiple tabs
- [ ] Unsaved changes warning

### Security Testing
- [ ] Attempt path traversal (`../../etc/passwd`)
- [ ] Attempt symlink escape
- [ ] Upload disallowed file types
- [ ] Upload oversized files
- [ ] Access non-existent paths
- [ ] Concurrent operations

## Deployment Considerations

### Environment Variables
```env
# Required
FILE_MANAGER_ROOT=./data

# Optional
MAX_FILE_SIZE=52428800
ALLOWED_UPLOAD_TYPES=image/*,application/pdf,text/*
```

### Build Optimization
- Turbopack for development (fast HMR)
- Production build with `npm run build`
- Static assets optimized automatically
- API routes compiled separately

### Production Checklist
- [ ] Set `FILE_MANAGER_ROOT` to production path
- [ ] Configure file upload limits
- [ ] Set up logging
- [ ] Enable error tracking
- [ ] Configure CORS (if needed)
- [ ] Set up monitoring
- [ ] Review security headers

## Known Limitations

### Current Limitations
1. **No real-time updates** - manual refresh required
2. **No file versioning** - overwrites without history
3. **No concurrent editing** - last write wins
4. **No user authentication** - single-user only
5. **No file sharing** - local filesystem only

### Future Enhancements (Out of Scope)
- WebSocket for real-time updates
- File versioning system
- Collaborative editing
- User authentication and permissions
- Cloud storage integration
- File sharing with links
- Advanced search (full-text)
- File previews (Office documents)

## Troubleshooting

### Common Issues

**Issue: `npm run dev` fails with module not found**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue: File operations fail with "Path traversal detected"**
```bash
# Solution: Check FILE_MANAGER_ROOT in .env.local
# Ensure path is absolute or relative to project root
FILE_MANAGER_ROOT=./data
```

**Issue: Dark mode not working**
```bash
# Solution: Check .dark class on <html>
# Verify theme.css is imported in globals.css
```

**Issue: BoardUI components not styled**
```bash
# Solution: Ensure globals.css is imported in layout.jsx
# Check that semantic tokens are used (not raw colors)
```

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [React Aria Components](https://react-spectrum.adobe.com/react-aria/)
- [Remix Icons](https://remixicon.com/)

### Local Documentation
- `node_modules/next/dist/docs/` - Next.js reference
- `src/styles/theme.css` - BoardUI color tokens
- `src/styles/typography.css` - BoardUI type ramp
- `AGENTS.md` (root) - BoardUI design rules

## Development Workflow

### Starting Development
```bash
# Install dependencies (first time)
npm install

# Start development server
npm run dev

# Open browser
# http://localhost:3000
```

### Building for Production
```bash
# Create production build
npm run build

# Start production server
npm start
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### Adding New Features
1. Create component in appropriate directory
2. Add JSDoc documentation
3. Use BoardUI semantic tokens
4. Test in both light and dark mode
5. Verify responsive behavior
6. Update AGENTS.md if adding new patterns

## Conclusion

This File Manager application demonstrates modern Next.js development with the BoardUI design system. The project emphasizes:

- **Learning** - Exploring Next.js App Router, Server Components, and Route Handlers
- **Security** - Robust path validation and filesystem protection
- **Quality** - Clean code, semantic tokens, accessible components
- **Maintainability** - Clear structure, JSDoc documentation, consistent conventions

The application is standalone and independent of Lerd, focusing purely on file management functionality with a professional, modern interface.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
