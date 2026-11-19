# Theme System

## Overview

BoardUI File Manager includes 10 professionally designed themes that customize the entire application appearance. Themes override BoardUI's semantic tokens via CSS custom properties, ensuring consistent styling across all components.

## Available Themes

### Dark Themes (7)

| Theme | Description | Background | Text |
|-------|-------------|------------|------|
| **Midnight Pro** | Default dark theme | `#1e1e2e` | `#cdd6f4` |
| **Dracula** | Purple-accented dark theme | `#282a36` | `#f8f8f2` |
| **One Dark Pro** | Atom-inspired dark theme | `#282c34` | `#abb2bf` |
| **Tokyo Night** | Clean dark theme | `#1a1b26` | `#a9b1d6` |
| **Catppuccin Mocha** | Warm dark theme | `#1e1e2e` | `#cdd6f4` |
| **GitHub Dark Dimmed** | GitHub's dark mode | `#22272e` | `#adbac7` |
| **Nord** | Arctic, smooth dark theme | `#2e3440` | `#d8dee9` |

### Light Themes (3)

| Theme | Description | Background | Text |
|-------|-------------|------------|------|
| **GitHub Light** | GitHub's light mode | `#ffffff` | `#24292f` |
| **Catppuccin Latte** | Warm light theme | `#eff1f5` | `#4c4f69` |
| **One Light** | Atom-inspired light theme | `#fafafa` | `#383a42` |

## Architecture

### Semantic Tokens

BoardUI uses semantic tokens (not raw color values) throughout:

```css
/* Good — semantic token */
text-text-primary
bg-background-primary-default
border-border-button-default

/* Bad — raw color */
text-gray-500
bg-white
border-gray-300
```

Semantic tokens are CSS custom properties defined in `src/styles/theme.css`:

```css
:root {
  --color-text-primary: var(--palette-neutral-900);
  --color-background-primary-default: var(--palette-neutral-0);
  --color-border-button-default: var(--palette-neutral-300);
}
```

### Theme Override

Themes override semantic tokens via `[data-theme]` attribute:

```css
[data-theme="midnight-pro"] {
  --color-text-primary: #cdd6f4;
  --color-background-primary-default: #1e1e2e;
  --color-border-button-default: #313244;
}
```

The `data-theme` attribute is set on the `<html>` element:

```html
<html data-theme="midnight-pro">
```

### Theme Application

**Settings Store** (`src/stores/settings-store.js`):

```javascript
export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'midnight-pro',
      accentColor: 'blue',
      
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      
      setAccentColor: (color) => set({ accentColor: color }),
    }),
    { name: 'file-manager-settings' }
  )
);
```

**Layout** (`src/app/layout.jsx`):

```javascript
export default function RootLayout({ children }) {
  const theme = useSettingsStore((state) => state.theme);
  
  return (
    <html data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
```

## Creating a Custom Theme

### Step 1: Define Theme CSS

Create theme in `src/styles/themes.css`:

```css
[data-theme="my-custom-theme"] {
  /* Background colors */
  --color-background-primary-default: #1a1a2e;
  --color-background-secondary-hover: #16213e;
  --color-background-selection: #0f3460;
  --color-background-sidebar: #0f0f1a;
  
  /* Text colors */
  --color-text-primary: #eaeaea;
  --color-text-secondary: #a0a0a0;
  --color-text-tertiary: #707070;
  --color-text-disabled: #505050;
  --color-text-destructive: #ef4444;
  
  /* Border colors */
  --color-border-button-default: #2a2a3e;
  --color-border-focus-ring: #3b82f6;
  --color-separator-border: #2a2a3e;
  
  /* Icon colors */
  --color-foreground-icon-secondary: #a0a0a0;
  --color-foreground-icon-tertiary: #707070;
  
  /* Accent colors (customize these) */
  --color-accent-50: #eff6ff;
  --color-accent-100: #dbeafe;
  --color-accent-500: #3b82f6;
  --color-accent-600: #2563eb;
  --color-accent-700: #1d4ed8;
  
  /* Shadow colors */
  --shadow-color: rgba(0, 0, 0, 0.3);
  
  /* Dropdown/Menu */
  --color-dropdown-item-hover: #16213e;
  --color-dropdown-item-active: #0f3460;
}
```

### Step 2: Add Theme to Store

Update `src/stores/settings-store.js`:

```javascript
const themes = [
  // ... existing themes
  {
    id: 'my-custom-theme',
    name: 'My Custom Theme',
    type: 'dark', // or 'light'
  }
];
```

### Step 3: Add Monaco Theme

Update `src/lib/monaco/monaco-themes.js`:

```javascript
export const monacoThemes = [
  // ... existing themes
  {
    id: 'my-custom-theme',
    base: 'vs-dark', // or 'vs' for light themes
    inherit: true,
    colors: {
      'editor.background': '#1a1a2e',
      'editor.foreground': '#eaeaea',
      'editor.lineHighlightBackground': '#16213e80',
      'editor.selectionBackground': '#3b82f640',
      'editorCursor.foreground': '#3b82f6',
      'editorLineNumber.foreground': '#707070',
      'editorGutter.background': '#0f0f1a',
      // ... more editor colors
    },
    rules: [
      { token: 'comment', foreground: '#6a9955' },
      { token: 'keyword', foreground: '#c586c0' },
      { token: 'string', foreground: '#ce9178' },
      { token: 'number', foreground: '#b5cea8' },
      // ... more token rules
    ]
  }
];
```

### Step 4: Test Theme

1. Open Settings → Appearance
2. Select your custom theme
3. Verify all components render correctly
4. Check both light and dark mode (if applicable)
5. Test editor with various file types

## Token Reference

### Background Tokens

| Token | Usage | Example |
|-------|-------|---------|
| `--color-background-primary-default` | Main content background | Page background |
| `--color-background-secondary-hover` | Hover state | List item hover |
| `--color-background-selection` | Selected items | File selection |
| `--color-background-sidebar` | Sidebar background | Navigation sidebar |
| `--color-background-tertiary` | Tertiary surfaces | Cards, panels |

### Text Tokens

| Token | Usage | Example |
|-------|-------|---------|
| `--color-text-primary` | Primary text | File names, headings |
| `--color-text-secondary` | Secondary text | File sizes, dates |
| `--color-text-tertiary` | Tertiary text | Placeholders, hints |
| `--color-text-disabled` | Disabled text | Disabled buttons |
| `--color-text-destructive` | Error/danger text | Delete buttons |

### Border Tokens

| Token | Usage | Example |
|-------|-------|---------|
| `--color-border-button-default` | Default borders | Button borders |
| `--color-border-focus-ring` | Focus indicators | Input focus rings |
| `--color-separator-border` | Dividers | List separators |

### Accent Tokens

| Token | Usage | Example |
|-------|-------|---------|
| `--color-accent-50` | Lightest accent | Badge backgrounds |
| `--color-accent-100` | Light accent | Hover states |
| `--color-accent-500` | Primary accent | Buttons, links |
| `--color-accent-600` | Dark accent | Button hover |
| `--color-accent-700` | Darkest accent | Button active |

## Accent Colors

Users can customize the accent color independently of the theme:

**Available Colors:**
- Blue (default)
- Purple
- Green
- Orange
- Red
- Pink
- Teal
- Yellow

**Implementation:**

Accent colors override `--color-accent-*` tokens:

```css
[data-accent="purple"] {
  --color-accent-500: #a855f7;
  --color-accent-600: #9333ea;
  --color-accent-700: #7e22ce;
}
```

**Usage:**

```javascript
// Settings store
const accentColor = useSettingsStore((state) => state.accentColor);

// Apply to HTML
document.documentElement.setAttribute('data-accent', accentColor);
```

## Dark Mode Detection

The application automatically applies dark mode based on the theme type:

```javascript
const theme = themes.find(t => t.id === currentTheme);
const isDark = theme.type === 'dark';

// Apply dark class for Tailwind
document.documentElement.classList.toggle('dark', isDark);
```

BoardUI components use semantic tokens, so they automatically adapt to dark/light mode without manual `dark:` overrides.

## Theme Persistence

Themes are persisted to localStorage:

```javascript
persist(
  (set) => ({ /* ... */ }),
  { name: 'file-manager-settings' }
)
```

On page reload:
1. Read theme from localStorage
2. Apply `data-theme` attribute to `<html>`
3. Apply `dark` class if dark theme
4. Monaco Editor syncs to matching theme

## Best Practices

### Do's

✅ **Always use semantic tokens** — `text-text-primary`, not `text-gray-500`
✅ **Test both light and dark** — Ensure readability in both modes
✅ **Use composite typography** — `text-body-regular`, not `text-sm font-normal`
✅ **Follow BoardUI patterns** — Check existing themes for reference
✅ **Test with Monaco Editor** — Editor theme must match app theme

### Don'ts

❌ **Never use raw colors** — `bg-white`, `text-blue-500`
❌ **Never stack utilities** — `text-sm font-medium leading-5`
❌ **Never use `dark:` with raw colors** — Use semantic tokens
❌ **Never skip accent tokens** — Accent colors must be defined
❌ **Never hardcode theme in components** — Use settings store

## Debugging Themes

### Browser DevTools

Inspect theme tokens:
```css
/* Check computed styles */
element {
  color: var(--color-text-primary);
  /* Inspect what it resolves to */
}
```

### Console Commands

```javascript
// Check current theme
document.documentElement.getAttribute('data-theme');

// Check accent color
document.documentElement.getAttribute('data-accent');

// List all theme tokens
getComputedStyle(document.documentElement)
  .getPropertyValue('--color-text-primary');
```

### Common Issues

**Problem:** Text invisible on dark background
**Solution:** Ensure `--color-text-primary` has sufficient contrast

**Problem:** Editor theme doesn't match
**Solution:** Check Monaco theme ID matches app theme ID

**Problem:** Accent color not applying
**Solution:** Verify `data-accent` attribute is set on `<html>`

## Resources

- [BoardUI Documentation](https://www.boardui.com/docs/theming)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Source: src/styles/themes.css](../src/styles/themes.css)
- [Source: src/stores/settings-store.js](../src/stores/settings-store.js)
- [Source: src/lib/monaco/monaco-themes.js](../src/lib/monaco/monaco-themes.js)

---

**Last Updated:** November 2026
