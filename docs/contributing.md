# Contributing Guide

Thank you for your interest in contributing to BoardUI File Manager! This guide will help you get started.

## Code of Conduct

This project follows a [Code of Conduct](../.github/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title** — Summarize the issue
- **Steps to reproduce** — Be specific
- **Expected behavior** — What should happen
- **Actual behavior** — What actually happens
- **Environment** — OS, Node.js version, browser
- **Screenshots** — If applicable
- **Logs** — Console errors, server logs

Use the [Bug Report template](../.github/ISSUE_TEMPLATE/bug_report.md).

### Suggesting Features

Feature suggestions are welcome! Please include:

- **Use case** — What problem does this solve?
- **Proposed solution** — How should it work?
- **Alternatives** — Other approaches considered
- **Mockups** — Visual examples if applicable

Use the [Feature Request template](../.github/ISSUE_TEMPLATE/feature_request.md).

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/board-ui.git
cd board-ui

# 2. Install dependencies
npm install

# 3. Create environment file
echo "FILE_MANAGER_ROOT=./data" > .env.local

# 4. Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # REST API endpoints
│   └── workspace/         # Main workspace page
├── components/            # React components
│   ├── base/             # BoardUI components
│   ├── workspace/        # Workspace shell & tabs
│   ├── file-manager/     # File browsing components
│   ├── editor/           # Monaco Editor wrapper
│   ├── image-viewer/     # Image viewer
│   └── archive/          # Archive dialogs
├── lib/                   # Business logic
│   ├── filesystem/       # Filesystem operations
│   ├── archive/          # Archive operations
│   ├── image/            # Image processing
│   ├── monaco/           # Monaco Editor config
│   └── router/           # React Router setup
├── stores/               # Zustand state management
├── hooks/                # React hooks
├── contexts/             # React contexts
└── styles/               # Global styles & themes
```

## Coding Standards

### Language

- **JavaScript/JSX only** — No TypeScript
- Use `.js` and `.jsx` extensions
- Use JSDoc for type documentation

### Components

- **Functional components** — No class components
- **Semantic tokens** — Use BoardUI tokens (never raw colors)
- **BoardUI components** — Prefer BoardUI over custom implementations
- **Accessibility** — Use React Aria primitives

```jsx
// Good ✅
import { Button } from '@/components/base/buttons/button';
import { RiDeleteBinLine } from '@remixicon/react';

export function DeleteButton({ onClick }) {
  return (
    <Button 
      variant="danger" 
      leadingIcon={RiDeleteBinLine}
      onClick={onClick}
    >
      Delete
    </Button>
  );
}

// Bad ❌
export function DeleteButton({ onClick }) {
  return (
    <button 
      className="bg-red-500 text-white px-4 py-2 rounded"
      onClick={onClick}
    >
      Delete
    </button>
  );
}
```

### Styling

- **Semantic tokens only** — `text-text-primary`, not `text-gray-500`
- **Composite typography** — `text-body-regular`, not `text-sm font-normal`
- **Use `cx()` utility** — From `@/utils/cx` for class merging
- **Logical properties** — `ms`/`me` instead of `ml`/`mr`

```jsx
// Good ✅
<div className={cx(
  'text-body-regular',
  'text-text-primary',
  'bg-background-primary-default',
  className
)}>

// Bad ❌
<div className={`text-sm font-normal text-gray-900 bg-white ${className}`}>
```

### State Management

- **Zustand** for global state
- **React state** for component-local state
- **Context** for theme/providers

```javascript
// Good ✅ — Zustand store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'midnight-pro',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'settings' }
  )
);

// Bad ❌ — Prop drilling
function App() {
  const [theme, setTheme] = useState('midnight-pro');
  return <Child theme={theme} setTheme={setTheme} />;
}
```

### API Routes

- **Validate all input** — Use `validatePath()` for paths
- **Return consistent JSON** — `{ success, data/error }`
- **Handle errors gracefully** — Don't leak sensitive info

```javascript
// Good ✅
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const validatedPath = await validatePath(filePath);
    const content = await fs.readFile(validatedPath, 'utf8');
    
    return Response.json({ 
      success: true, 
      data: { content } 
    });
  } catch (error) {
    console.error('Read failed:', error);
    return Response.json(
      { success: false, error: 'Failed to read file' },
      { status: error.status || 500 }
    );
  }
}
```

### File Naming

- **Components** — `kebab-case.jsx` (e.g., `file-list.jsx`)
- **Utilities** — `kebab-case.js` (e.g., `file-service.js`)
- **Hooks** — `camelCase.js` with `use` prefix (e.g., `use-files.js`)
- **API Routes** — `route.js` (Next.js convention)

### Imports

Order imports:
1. React and React hooks
2. Next.js imports
3. BoardUI components (`@/components/base/`)
4. Local components (`@/components/`)
5. Utilities and hooks
6. Styles (last)

```jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/base/buttons/button';
import { FileList } from '@/components/file-manager/file-list';
import { useFiles } from '@/hooks/use-files';
import { cx } from '@/utils/cx';
```

## Testing

### Manual Testing

Before submitting a PR, test your changes:

1. **Dev server** — `npm run dev`
2. **Production build** — `npm run build`
3. **Linting** — `npm run lint`
4. **Browser testing** — Chrome, Firefox, Safari
5. **Responsive** — Desktop, tablet, mobile
6. **Dark mode** — Test all themes
7. **Keyboard navigation** — All shortcuts work

### Testing Checklist

**File Operations:**
- [ ] Create file/folder
- [ ] Rename file/folder
- [ ] Delete file/folder
- [ ] Copy/move files
- [ ] Upload files

**Editor:**
- [ ] Open file
- [ ] Edit and save
- [ ] Multiple tabs
- [ ] Find & replace
- [ ] Keyboard shortcuts

**Image Viewer:**
- [ ] Open image
- [ ] Zoom/pan
- [ ] Rotate/flip
- [ ] Filmstrip navigation

**Archive:**
- [ ] Create ZIP
- [ ] Extract ZIP
- [ ] Browse ZIP

**Security:**
- [ ] Path traversal blocked
- [ ] ZIP Slip blocked
- [ ] Executable extraction blocked

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Code style (no logic change)
- `refactor` — Code refactor (no feature/fix)
- `perf` — Performance improvement
- `test` — Adding tests
- `chore` — Maintenance

### Examples

```
feat(editor): add multi-cursor support

Add Alt+Click to create multiple cursors in the Monaco editor.
Users can now edit multiple locations simultaneously.

Closes #42
```

```
fix(security): block path traversal in archive extraction

Validate entry paths before extraction to prevent ZIP Slip attacks.
Added tests for malicious archive paths.

Fixes #87
```

```
docs(api): update API reference with new endpoints

Add documentation for archive compress/extract endpoints.
Include request/response examples.
```

## Branch Naming

- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation
- `refactor/description` — Code refactoring
- `test/description` — Test additions

## Pull Request Process

1. **Update documentation** — If you changed features
2. **Add tests** — If applicable
3. **Run lint** — `npm run lint`
4. **Test thoroughly** — Follow testing checklist
5. **Write clear description** — What and why
6. **Link issues** — Reference related issues
7. **Request review** — Tag maintainers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Manual testing completed
- [ ] All tests pass
- [ ] Linting passes

## Screenshots
If applicable, add screenshots

## Related Issues
Closes #123
```

## Code Review

All PRs require review before merging. Reviewers will check:

- Code quality and style
- Test coverage
- Documentation
- Security implications
- Performance impact

### Review Checklist

- [ ] Code follows style guidelines
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] Commit messages are clear

## Adding New Features

### New File Type Support

1. Update `src/lib/file-type.js`
2. Add preview component (if needed)
3. Update icon mapping
4. Add tests

### New Theme

1. Add CSS to `src/styles/themes.css`
2. Add to `src/stores/settings-store.js`
3. Add Monaco theme to `src/lib/monaco/monaco-themes.js`
4. Test all components

### New API Endpoint

1. Create route in `src/app/api/`
2. Validate all input
3. Handle errors gracefully
4. Update API documentation
5. Add tests

## Security

### Reporting Vulnerabilities

**Don't open public issues for security vulnerabilities.**

Email: security@yourdomain.com

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Guidelines

- Always validate paths with `validatePath()`
- Never expose filesystem to client
- Sanitize all user input
- Use semantic tokens (no raw colors)
- Follow OWASP best practices

See [Security Model](security.md) for details.

## Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Keep it up to date

### Documentation Files

- `README.md` — Project overview
- `docs/architecture.md` — Technical architecture
- `docs/features.md` — Feature documentation
- `docs/security.md` — Security model
- `docs/api-reference.md` — API documentation
- `docs/themes.md` — Theme system
- `docs/contributing.md` — This file

## Getting Help

- **GitHub Discussions** — Ask questions
- **GitHub Issues** — Report bugs
- **Discord** — Chat with maintainers (if available)

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- Documentation acknowledgments

Thank you for contributing! 🎉

---

**Last Updated:** November 2026
