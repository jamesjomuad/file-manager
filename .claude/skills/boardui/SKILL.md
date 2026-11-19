---
name: boardui
description: >-
  Build UIs with BoardUI, the React + Tailwind CSS v4 design system for
  dashboards and agentic interfaces. Trigger whenever the user asks to build,
  restyle, or extend UI in a project that uses BoardUI, mentions BoardUI
  components or templates, or wants a dashboard, chart card, AI chat, form,
  table, auth screen, or settings page built with it. Enforces: install real
  BoardUI components instead of hand-building lookalikes, style only with
  semantic tokens and composite type utilities, merge classes with cx(), and
  let dark mode ride the tokens.
metadata:
  author: BoardUI
  version: 2026.11.14
---

# BoardUI Skill

## Skill Purpose

BoardUI is this application's **primary UI component library**. It must be preferred for all UI implementation. This skill provides detailed, practical guidance for working with BoardUI in this project.

**Core principle:** Never hand-build a lookalike of a component BoardUI already provides. Install the real component, compose it, and style it with semantic tokens.

## When to Use This Skill

Use this skill whenever:

- **Creating new UI components or pages** (file explorer, editor, settings, dialogs)
- **Modifying existing application interfaces** (file context menus, toolbars, sidebars)
- **Implementing forms, dialogs, menus, tables, or interactive controls**
- **Refactoring custom UI into BoardUI components** (replacing hand-rolled buttons, inputs, modals)
- **Working with themes, tokens, and component styling** (dark mode, accent colors, typography)
- **Adding notifications, toasts, alerts, or feedback** (Toast, Notification components)
- **Building dashboards, data displays, or charts** (if using BoardUI Pro)

**Do not use this skill for:**
- Non-UI logic (filesystem operations, API routes, business logic)
- Backend code (server-side filesystem service, security validation)
- Configuration files (Next.js config, environment variables)

## Documentation First

**Before implementing any UI with BoardUI:**

1. **Check the official documentation:** https://www.boardui.com/components
2. **Inspect the installed package and version** in `package.json` and `src/components/base/`
3. **Consult the relevant component documentation** for the specific component you need
4. **Verify actual APIs** (props, variants, slots) rather than assuming component behavior
5. **Prefer existing project examples** and established patterns in the codebase

**Never assume:**
- Component names (they are exact: `button`, not `Button` or `BoardButton`)
- Prop names or signatures (check the actual component source)
- Variant availability (some components have `variant` props, others use separate components)
- Dark mode behavior (tokens flip automatically; never write `dark:` overrides)

**Installed BoardUI components in this project:**
- `src/components/base/buttons/` — button.tsx, button.jsx, button-group.jsx, close-button.tsx
- `src/components/base/input/` — input.jsx, label.jsx, hint-text.jsx
- `src/components/base/select/` — select.jsx
- `src/components/base/context-menu/` — context-menu.jsx
- `src/components/base/date-picker/` — date-picker.jsx, shared.jsx
- `src/components/base/dropdown/` — menu-styles.js
- `src/components/base/notification/` — notification.tsx
- `src/components/base/toast/` — toast.tsx
- `src/components/base/avatar/` — avatar.tsx

**To install additional BoardUI components:**
```bash
npx boardui@latest add <component-name> --yes
```

## Component Selection

**Before creating a custom component, check if BoardUI provides it:**

### Buttons and Actions
- **`button`** — Primary, secondary, ghost, danger actions (contained, outlined, text variants)
- **`button-group`** — Segmented controls, toggle groups (view mode, sort options)
- **`close-button`** — Icon-only close/dismiss buttons (modals, dialogs, toasts)

### Inputs and Forms
- **`input`** — Text fields, search fields, password fields (with label, hint text)
- **`select`** — Dropdown selects (single, multi-select)
- **`date-picker`** — Single date selection
- **Form components** — Built on `react-aria-components`; extend installed BoardUI form components rather than raw `<input>`/`<select>`

### Dialogs and Overlays
- **Dialogs/Modals** — Compose from `button` + custom layout with semantic tokens
- **Drawers** — Slide-out panels (compose from overlay + panel)
- **Context menus** — `context-menu.jsx` (right-click menus, dropdown actions)
- **Dropdowns** — `menu-styles.js` provides styling patterns

### Data Display
- **Tables** — For simple listings (must be in `"use client"` module)
- **Cards and panels** — Compose with `bg-background-primary-default`, `border-border-button-default`, `rounded-3xl`
- **Lists** — Use semantic tokens for spacing, borders, hover states

### Feedback and Notifications
- **`toast`** — Transient notifications (success, error, info) with auto-dismiss
- **`notification`** — Persistent notification cards (used by Toast internally)
- **Alerts** — Compose with semantic tokens (`bg-background-error`, `text-text-primary`)

### Navigation and Tabs
- **Tabs** — Compose with `button` variants + semantic tokens
- **Sidebar** — Navigation sidebar (if using BoardUI Pro)

### File Uploads
- **File upload** — Compose custom drop zone with `button` for file picker trigger

**Decision flow:**
1. Does BoardUI have this component? → Use it
2. Does BoardUI have part of it? → Compose from BoardUI primitives
3. Does BoardUI have nothing similar? → Build custom with semantic tokens, document why

## Styling and Design Tokens

**This project uses BoardUI's semantic design token system exclusively.**

### Color Tokens

**Text:**
- `text-text-primary` — Primary text (headings, body)
- `text-text-secondary` — Secondary text (descriptions, labels)
- `text-text-tertiary` — Tertiary text (hints, placeholders)
- `text-text-placeholder` — Input placeholders

**Backgrounds:**
- `bg-background-primary-default` — Primary surfaces (cards, panels)
- `bg-background-primary-hover` — Hover state for primary surfaces
- `bg-background-secondary-default` — Secondary surfaces (sidebar, header)
- `bg-background-secondary-hover` — Hover state for secondary surfaces
- `bg-background-full` — Page ground (body background)
- `bg-background-error` — Error states, destructive actions
- `bg-background-success` — Success states, confirmations

**Borders:**
- `border-border-button-default` — Button borders, card borders
- `border-border-button-group` — Button group separators
- `border-border-focus-ring` — Focus outlines
- `border-separator-border` — Hairline dividers

**Icons:**
- `text-foreground-icon-primary` — Primary icons
- `text-foreground-icon-secondary` — Secondary icons
- `text-foreground-icon-tertiary` — Tertiary icons
- `text-foreground-icon-quaternary` — Disabled icons

**Never use raw palette classes:** `text-gray-500`, `bg-white`, `bg-blue-600`, `border-gray-200`

### Typography Tokens

**Composite utilities** (set size + weight + line-height + letter-spacing together):
- `text-large-title-medium` — 64px display titles
- `text-title-1-medium` — Large section titles
- `text-title-2-medium` — Medium section titles
- `text-title-3-semibold` — Small section titles
- `text-headline-medium` — Headlines
- `text-body-medium` — Emphasized body text
- `text-body-regular` — Standard body text
- `text-caption-1-semibold` — Small labels, badges
- `text-caption-2-regular` — Tiny captions

**Never stack:** `text-sm font-medium leading-5` (use `text-body-medium` instead)

### Shadow Tokens

- `shadow-sm` — Subtle elevation (inputs, small cards)
- `shadow-md` — Medium elevation (dropdowns, popovers)
- `shadow-lg` — High elevation (modals, dialogs)
- `shadow-card` — Card elevation
- `shadow-sidebar` — Sidebar elevation

### Spacing and Shape

**Spacing:**
- Use Tailwind's 4px scale: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px)
- Prefer flex/grid `gap` over per-child margins
- Use logical properties: `ms`/`me` (margin-start/end), `ps`/`pe` (padding-start/end)

**Border radius:**
- `rounded-md` — Inputs, menu rows
- `rounded-xl` — Cards, panels
- `rounded-3xl` — Large cards, modals
- `rounded-full` — Pills, avatars

### Class Merging

**Always use `cx()` from `@/utils/cx`:**
```jsx
import { cx } from '@/utils/cx';

<div className={cx('base-classes', condition && 'conditional-class', className)} />
```

**Never use:**
- Plain `clsx` or `classnames`
- String concatenation: `'base ' + (condition ? 'active' : '')`
- Template literals for conditional classes

### Dark Mode

**Dark mode is automatic via semantic tokens:**
- Tokens flip when `.dark` class is on `<html>`
- **Never write `dark:` overrides with raw colors**
- If a pairing looks wrong in dark mode, pick a different token
- Test both light and dark modes manually

**Reference files:**
- `src/styles/theme.css` — Color tokens, semantic families
- `src/styles/typography.css` — Type ramp
- `src/styles/globals.css` — Global styles, dark mode strategy

## Custom Components

**When custom components are appropriate:**

1. **Application-specific composition** — File explorer, workspace tabs, breadcrumb navigation
2. **Business logic wrappers** — File list with selection, drag-and-drop zones
3. **Layout primitives** — App shell, sidebar, header (compose from BoardUI buttons, inputs)

**How to compose BoardUI components:**

```jsx
// Custom file toolbar using BoardUI ButtonGroup
import { ButtonGroup } from '@/components/base/buttons/button-group';
import { Button } from '@/components/base/buttons/button';
import { RiGridLine, RiListLine } from '@remixicon/react';

export function FileToolbar({ viewMode, onViewModeChange }) {
  return (
    <ButtonGroup>
      <Button
        iconOnly
        selected={viewMode === 'grid'}
        onClick={() => onViewModeChange('grid')}
        leadingIcon={RiGridLine}
      >
        Grid view
      </Button>
      <Button
        iconOnly
        selected={viewMode === 'list'}
        onClick={() => onViewModeChange('list')}
        leadingIcon={RiListLine}
      >
        List view
      </Button>
    </ButtonGroup>
  );
}
```

**Never do:**
- Rebuild a BoardUI component from scratch (e.g., custom button with raw `<button>` + manual styling)
- Introduce another UI library (Material-UI, Ant Design, Chakra) without explicit approval
- Duplicate BoardUI functionality (e.g., custom toast when BoardUI toast exists)

**If BoardUI lacks a component you need:**
1. Check if BoardUI Pro has it (https://www.boardui.com/pricing)
2. Build the smallest compatible custom solution
3. Use BoardUI semantic tokens for styling
4. Document why it is necessary (inline comment or AGENTS.md update)

## Accessibility

**All UI must be accessible:**

### Keyboard Navigation
- **All interactive elements must be keyboard-accessible** (buttons, links, inputs, menus)
- **Focus order must be logical** (top-to-bottom, left-to-right, or as designed)
- **Focus states must be visible** — `outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring`
- **Escape key closes overlays** (modals, dialogs, dropdowns, context menus)
- **Arrow keys navigate menus** (up/down for vertical, left/right for horizontal)

### Labels and ARIA
- **All inputs must have labels** — Use BoardUI `label` component or `aria-label`
- **Icon-only buttons must have `aria-label`** — `<Button iconOnly aria-label="Close" />`
- **Dialogs must have `aria-modal="true"` and `role="dialog"`**
- **Alerts and toasts must have `role="alert"` or `role="status"`**
- **Live regions for dynamic content** — `aria-live="polite"` for status updates

### Semantic HTML
- **Use semantic elements** — `<button>` for actions, `<a>` for links, `<input>` for form fields
- **Headings must be hierarchical** — `<h1>` → `<h2>` → `<h3>` (no skipping levels)
- **Lists must use `<ul>`/`<ol>`** — File lists, navigation menus
- **Tables must use `<table>`** — Data grids, file metadata

### Focus Management
- **Modals trap focus** — Focus stays within modal while open
- **Focus returns to trigger** — When modal closes, focus returns to the button that opened it
- **Skip links for main content** — Optional but recommended for complex layouts

### Color and Contrast
- **Never use color alone to convey information** — Add icons, text, or patterns
- **Maintain WCAG AA contrast** — Semantic tokens are pre-tested for contrast
- **Test with color blindness simulators** — Ensure UI is usable without color perception

## Implementation Checklist

**Before considering BoardUI-related work complete:**

- [ ] **Inspected existing components** in `src/components/base/`
- [ ] **Consulted BoardUI documentation** at https://www.boardui.com/components
- [ ] **Used BoardUI components** for all UI controls (buttons, inputs, selects, dialogs)
- [ ] **Styled with semantic tokens only** (no raw palette classes)
- [ ] **Used composite typography** (no stacked `text-sm font-medium leading-5`)
- [ ] **Merged classes with `cx()`** (no string concatenation)
- [ ] **Tested in light mode** — colors, spacing, typography correct
- [ ] **Tested in dark mode** — `.dark` class on `<html>`, tokens flip correctly
- [ ] **Keyboard navigation works** — Tab through all interactive elements
- [ ] **Focus states visible** — `focus-visible:ring-2 focus-visible:ring-border-focus-ring`
- [ ] **ARIA labels present** — Icon-only buttons, inputs, dialogs
- [ ] **Responsive layout works** — Mobile, tablet, desktop
- [ ] **No TypeScript errors** (if using TypeScript files)
- [ ] **Build passes** — `npm run build` exits with code 0
- [ ] **Lint passes** — `npm run lint` has no new errors

**Common mistakes to avoid:**
- ❌ `text-gray-500` → ✅ `text-text-secondary`
- ❌ `text-sm font-medium leading-5` → ✅ `text-body-medium`
- ❌ `className="base " + (active ? "active" : "")` → ✅ `cx("base", active && "active")`
- ❌ `dark:bg-gray-800` → ✅ Use semantic token that flips automatically
- ❌ `<button className="...">` → ✅ `<Button className="...">`
- ❌ Custom toast implementation → ✅ `import { toast } from "@/components/base/toast/toast"`
