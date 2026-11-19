# Features

## File Browsing

### Grid View
Visual card-based layout showing file thumbnails and icons. Each card displays:
- File/folder icon (or image thumbnail)
- File name
- Favorite star (top-right corner)

### List View
Tabular layout with sortable columns:
- **Name** — File name with icon
- **Size** — File size (human-readable format)
- **Modified** — Last modification date (relative or absolute)
- **Type** — File type/extension
- **Favorite** — Star toggle (optional column)

### Navigation
- **Double-click** — Open file or enter folder
- **Single-click** — Select file
- **Ctrl+Click** — Multi-select (toggle)
- **Shift+Click** — Range select
- **Arrow Keys** — Navigate selection
- **Backspace** — Navigate to parent folder
- **Breadcrumb** — Click any segment to jump to that folder

### Sorting
Sort by any column (click column header in list view):
- Name (A-Z, Z-A)
- Size (smallest first, largest first)
- Modified (oldest first, newest first)
- Type (by extension)

### View Toggle
Switch between grid and list views using the toolbar button.

## File Operations

### Create
- **New File** — Create empty text file
- **New Folder** — Create empty directory
- **Upload** — Drag-and-drop or file picker (multipart upload)

### Rename
- Right-click → **Rename** or press **F2**
- Enter new name in prompt
- Works for both files and folders

### Delete
- **Delete** key or right-click → **Delete**
- Files move to trash (recoverable)
- Confirmation dialog before deletion
- Bulk delete: select multiple files → Delete

### Copy & Move
- Select files → Ctrl+C (copy) or Ctrl+X (cut)
- Navigate to destination → Ctrl+V (paste)
- Conflict resolution: skip, replace, rename, keep both

### Multi-Select
- **Ctrl+A** — Select all files in current folder
- **Ctrl+Click** — Toggle individual files
- **Shift+Click** — Select range
- **Escape** — Clear selection
- Toolbar shows selected count

## Search

### Quick Open (Ctrl+P)
Modal search overlay:
- Type to search across all files
- Results ranked by relevance
- Keyboard navigation (↑/↓ arrows)
- Press Enter to open selected file
- Press Escape to close

### File Search
Search bar in toolbar:
- Filters current folder contents by name
- Case-insensitive matching
- Real-time filtering as you type

## Favorites

Star any file or folder for quick access:
- Click the star icon (appears in list view or grid view)
- Access favorites from sidebar → **Favorites**
- Favorites persist across sessions (localStorage)
- Remove from favorites by clicking star again

## Recent Files

Automatic tracking of recently opened files:
- Open any file to add it to recent list
- Access from sidebar → **Recent**
- Shows file name, path, and last opened time
- Maximum 50 recent files (oldest removed automatically)
- Persisted in localStorage

## Trash

### Soft Delete
- Deleted files move to `.trash/` directory
- Original path stored for restoration
- Trash count shown in sidebar (real-time updates)

### Trash Management
- **Browse Trash** — View all deleted files
- **Restore** — Move file back to original location
- **Permanent Delete** — Remove file completely
- **Empty Trash** — Delete all files in trash

### Conflict Resolution
When restoring a file:
- If original location is occupied, user is prompted
- Options: skip, replace, rename, keep both

## Preview System

### Image Preview
Supported formats: JPG, PNG, GIF, SVG, WebP, BMP, AVIF, ICO
- Opens in Image Viewer tab
- Full-featured viewer (see Image Viewer section)

### PDF Preview
- Opens in PDF Viewer tab
- Browser-native rendering via iframe
- Zoom, scroll, search

### Text Preview
- Plain text files (TXT, MD, CSV, LOG)
- Opens in Text Viewer tab
- Line numbers, monospace font
- Read-only

### Code Preview
- Code files (JS, TS, Python, PHP, Go, Rust, etc.)
- Opens in Editor tab with syntax highlighting
- Full editing capability
- See Editor section

### Quick Preview Modal
- Press Space or double-click to preview
- Modal overlay with file content
- Close with Escape or click outside
- Supported for images, text, code

## Monaco Editor

### Features
- **Multi-tab** — Open multiple files simultaneously
- **Unsaved Changes** — Dot indicator on modified tabs
- **Auto-Save** — Ctrl+S to save (manual)
- **Find & Replace** — Ctrl+F (find), Ctrl+H (replace)
- **Minimap** — Code overview (toggle in settings)
- **Word Wrap** — Toggle in settings
- **Font Size** — Adjustable (8-32px)
- **Line Numbers** — Toggle in settings
- **Code Folding** — Collapse code blocks
- **Bracket Matching** — Highlight matching brackets
- **Auto-Indent** — Automatic indentation
- **Multi-Cursor** — Alt+Click to add cursor

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` | Switch to next tab |
| `Ctrl+Shift+Tab` | Switch to previous tab |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |
| `Ctrl+G` | Go to line |
| `Ctrl+D` | Select next occurrence |
| `Ctrl+/` | Toggle line comment |
| `Ctrl+Shift+/` | Toggle block comment |

### Language Support
30+ languages with syntax highlighting:
- JavaScript, TypeScript, JSX, TSX
- HTML, CSS, SCSS, LESS
- JSON, YAML, XML, TOML, INI
- Python, Ruby, Go, Rust, Java, C, C++
- PHP, SQL, Bash, PowerShell, Batch
- Markdown, Dockerfile, and more

### Tab Management
- **Drag to Reorder** — Reorganize tabs
- **Right-Click Tab** — Context menu:
  - Close
  - Close Others
  - Close All
  - Close to the Right
- **Middle-Click** — Close tab
- **Unsaved Indicator** — Dot on modified tabs

## Image Viewer

### Navigation
- **Filmstrip** — Browse all images in folder (bottom panel)
- **Arrow Keys** — Previous/next image
- **Double-Click** — Toggle fullscreen
- **Gallery Mode** — On-demand loading (performance)

### Transformations
- **Zoom** — Mouse wheel, pinch-to-zoom, toolbar buttons
- **Pan** — Click and drag
- **Rotate** — 90°, 180°, 270° (toolbar buttons)
- **Flip** — Horizontal, vertical (toolbar buttons)
- **Reset** — Return to original view

### EXIF Metadata
Display image information:
- Dimensions (width × height)
- File size
- Format (JPEG, PNG, etc.)
- Camera model (if available)
- Exposure, aperture, ISO (if available)
- Date taken (if available)

### Performance
- **On-Demand Loading** — Images loaded when needed
- **Lazy Thumbnails** — Generated server-side with Sharp
- **Cached Thumbnails** — Stored in `.thumbnails/` directory
- **Background Metadata** — EXIF data fetched asynchronously

## Text Viewer

- Read-only text display
- Line numbers
- Monospace font
- Syntax highlighting (optional)
- Scroll with mouse wheel
- Search within text (Ctrl+F)

## PDF Viewer

- Browser-native rendering (iframe)
- Zoom in/out
- Scroll pages
- Search text
- Print (browser print dialog)

## Archive Management

### Create ZIP
- Select files/folders → Right-click → **Compress to ZIP**
- Choose archive name
- Select compression level:
  - Store (0) — No compression
  - Fast (1) — Quick compression
  - Normal (6) — Balanced (default)
  - Maximum (9) — Best compression
- Include hidden files (optional checkbox)
- Progress indicator
- Result: original size, compressed size, ratio

### Extract ZIP
- Right-click ZIP file → **Extract Here** or **Extract To...**
- Choose destination folder
- Select conflict resolution:
  - **Skip** — Don't overwrite existing files
  - **Replace** — Overwrite existing files
  - **Rename** — Add suffix to avoid conflicts
  - **Keep Both** — Create copy with unique name
- Preserve folder structure (optional)
- Progress indicator
- Result: extracted count, skipped count, errors

### Browse ZIP
- Right-click ZIP file → **Open Archive**
- Opens in Archive Browser tab
- Tree view of contents
- Display:
  - File/folder names
  - Original size
  - Compressed size
  - Compression ratio
  - Modified date
- Preview files (images, text, code)
- Extract selected files
- Search within archive

### Security
- ZIP Slip prevention (reject malicious paths)
- Executable blocking (`.exe`, `.bat`, `.cmd`, `.scr`, `.msi`, `.com`)
- Size limits (500MB/file, 2GB/archive, 100k entries)
- Decompression ratio checks (100x max)
- Path traversal prevention

## Workspace Tabs

### Tab Types
- **Explorer** — File browsing (always available)
- **Editor** — Code editing
- **Image Viewer** — Image preview
- **Text Viewer** — Text preview
- **PDF Viewer** — PDF preview
- **Archive Browser** — ZIP browsing

### Tab Management
- **Open Tab** — Double-click file or use context menu
- **Close Tab** — Click X, middle-click, or Ctrl+W
- **Reorder Tabs** — Drag and drop
- **Switch Tabs** — Click tab or Ctrl+Tab
- **Persist State** — Tabs restored on page reload

### Drag-to-Reorder
- Click and hold tab
- Drag to new position
- Drop to reorder
- Visual feedback during drag

## Theme System

### 10 Built-in Themes

**Dark Themes:**
1. Midnight Pro (default)
2. Dracula
3. One Dark Pro
4. Tokyo Night
5. Catppuccin Mocha
6. GitHub Dark Dimmed
7. Nord

**Light Themes:**
1. GitHub Light
2. Catppuccin Latte
3. One Light

### Customization
- Change theme via Settings → Appearance
- Editor theme syncs automatically
- Accent color customization
- Persistent across sessions

### Theme Architecture
- BoardUI semantic tokens (CSS custom properties)
- `[data-theme="theme-id"]` attribute on `<html>`
- No raw color classes (always use tokens)
- Dark mode automatic via theme

## Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Quick Open |
| `Ctrl+A` | Select all files |
| `Delete` | Delete selected files |
| `F2` | Rename selected file |
| `Escape` | Clear selection |
| `Enter` | Open selected file |
| `Backspace` | Navigate to parent folder |
| `Arrow Keys` | Navigate file selection |

### Editor
| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file |
| `Ctrl+W` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |

## Context Menus

### File Context Menu
Right-click any file or folder:
- **Open** — Open file (if previewable)
- **Open in Editor** — Open in code editor
- **Open in Image Viewer** — Open in image viewer
- **Preview** — Quick preview modal
- **Rename** — Rename file/folder
- **Delete** — Move to trash
- **Compress to ZIP** — Create archive
- **Extract Here** — Extract ZIP contents
- **Extract To...** — Extract to chosen folder
- **Open Archive** — Browse ZIP contents

### Tab Context Menu
Right-click editor tab:
- **Close** — Close this tab
- **Close Others** — Close all other tabs
- **Close All** — Close all tabs
- **Close to the Right** — Close tabs to the right

## Responsive Design

### Desktop (1200px+)
- Full sidebar visible
- Grid/List view
- Multi-column layout

### Tablet (768px - 1199px)
- Collapsible sidebar
- Grid/List view
- Adjusted spacing

### Mobile (< 768px)
- Hidden sidebar (toggle button)
- List view preferred
- Touch-optimized controls

## Accessibility

- **Keyboard Navigation** — All features accessible via keyboard
- **ARIA Labels** — Screen reader support
- **Focus Management** — Visible focus indicators
- **High Contrast** — Works with system high contrast mode
- **Semantic HTML** — Proper heading hierarchy
- **Color Contrast** — WCAG AA compliant

## Performance

### Optimizations
- **Lazy Loading** — Monaco Editor, Image Viewer loaded on demand
- **Code Splitting** — Routes split into chunks
- **Image Optimization** — Lazy-load thumbnails
- **Caching** — Thumbnails cached to disk
- **Memoization** — React.memo for expensive components
- **Virtualization** — Long lists optimized (future)

### Benchmarks
- Initial load: < 2 seconds
- File listing: < 100ms (1000 files)
- Image preview: < 500ms (5MB image)
- ZIP extraction: ~10MB/s (typical archive)

---

**Last Updated:** November 2026
