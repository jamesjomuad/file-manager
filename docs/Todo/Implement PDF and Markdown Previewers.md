# Implement PDF and Markdown Previewers

Implement dedicated PDF and Markdown previewers in the existing standalone File Manager application.

## Important project constraints

- This is a standalone application, not a Lerd plugin.
- Use the existing Next.js, React, BoardUI, React Router hash navigation, and Zustand architecture.
- JavaScript and JSX only. Do not introduce TypeScript or `.tsx` files.
- Use npm.
- Follow the root `AGENTS.md` and `.claude/skills/boardui/SKILL.md`.
- Always use BoardUI components for the surrounding UI.
- Inspect the existing architecture before modifying anything.
- Avoid unrelated refactoring and unnecessary dependencies.

## Phase 1: Inspect the existing implementation

Before coding, inspect:

1. Workspace tab manager and tab types.
2. File-opening and double-click handlers.
3. Existing image previewer.
4. Existing code editor and text viewer.
5. Filesystem API routes and secure file-serving utilities.
6. Zustand stores and persistence.
7. Existing theme and BoardUI components.

Identify the correct integration points and report the implementation plan.

Do not create a second tab-management system or duplicate existing file-loading logic.

## Phase 2: PDF Previewer

Evaluate suitable maintained React PDF viewer libraries. Prefer an established PDF.js-based implementation.

Implement:

- PDF rendering with page navigation.
- Current page and total page count.
- Zoom in/out.
- Fit width and fit page.
- Page rotation.
- Document search.
- Fullscreen.
- Download and print.
- Loading and error states.
- Password-protected document handling where supported.

Requirements:

- Load the PDF only when its tab is active or explicitly opened.
- Avoid rendering every page simultaneously for large documents.
- Release PDF document and worker resources when appropriate.
- Preserve page position and zoom when switching tabs.
- Support existing application light and dark themes.
- Use the existing secure filesystem service.
- Do not expose unrestricted filesystem paths.

## Phase 3: Markdown Previewer

Use `react-markdown` or another suitable maintained Markdown rendering solution.

Implement:

- GitHub-style Markdown rendering.
- Headings, paragraphs, lists, nested lists, tables, blockquotes, and horizontal rules.
- Fenced code blocks with syntax highlighting.
- Inline code.
- Task lists.
- Images and links.
- Copy buttons for code blocks.
- Optional source/preview split view.
- Preview-only mode as the default.
- Toggle between source and rendered preview.

Security and path handling:

- Do not render arbitrary raw HTML by default.
- Sanitize any HTML if raw HTML support is introduced.
- Prevent JavaScript URLs and unsafe link protocols.
- Resolve relative images and links through the existing secure filesystem service.
- Ensure relative paths cannot escape the configured root.
- Handle missing images and inaccessible files gracefully.

## Phase 4: Workspace integration

Register both previewers in the existing workspace tab architecture.

Expected behavior:

- Opening a PDF creates or activates a PDF Previewer tab.
- Opening a Markdown file creates or activates a Markdown Previewer tab.
- Opening an already-open file activates its existing tab.
- Each tab preserves its own viewing state.
- Closing a tab cleans up associated resources.
- Switching tabs must not unnecessarily reload documents.
- Handle renamed, moved, and deleted files gracefully.

Do not change the existing behavior of Explorer, Image Previewer, or Code Editor.

## Phase 5: UI and styling

- Use BoardUI components for toolbars, buttons, menus, tooltips, dialogs, and other surrounding controls.
- Follow existing theme tokens and typography.
- Support light and dark modes.
- Keep the interface clean, spacious, and consistent with the existing application.
- Avoid introducing another UI component library.

## Phase 6: Testing and validation

Test:

- Small and large PDFs.
- Multi-page PDFs.
- Password-protected and corrupted PDFs.
- Markdown files with tables, code blocks, task lists, images, and links.
- Unicode filenames and nested directories.
- Relative images and links.
- Missing files and inaccessible paths.
- Switching between multiple previewer tabs.
- Closing and reopening tabs.
- Light and dark themes.
- Security against path traversal and unsafe Markdown links.

Run existing lint, tests, and production build scripts.

## Deliverables

Report:

1. Libraries selected and why.
2. Files created and modified.
3. Features implemented.
4. Security considerations.
5. Test and build results.
6. Any limitations or deferred functionality.

Do not claim features are implemented unless they have actually been tested.