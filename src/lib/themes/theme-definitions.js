/**
 * Theme definitions for the File Manager
 *
 * Each theme provides a complete color palette with:
 * - Background colors (primary, secondary, tertiary, elevated, overlay)
 * - Text colors (primary, secondary, tertiary, disabled)
 * - Border colors (default, subtle, strong)
 * - Interactive colors (buttons, links)
 * - Editor colors (background, gutter, line highlight, selection, cursor)
 * - Sidebar colors (background, item hover, item active)
 * - Status colors (success, warning, error, info)
 * - Syntax highlighting colors (keyword, string, number, comment, function, variable, operator)
 * - Scrollbar colors (track, thumb, thumb-hover)
 *
 * @typedef {Object} ThemeDefinition
 * @property {string} id - Unique theme identifier (kebab-case)
 * @property {string} name - Human-readable theme name
 * @property {'dark'|'light'} type - Theme type for system preference matching
 * @property {Object} colors - Color palette object
 * @property {Object<string, string>} colors - CSS color values keyed by semantic name
 */

/**
 * Array of all available theme definitions
 * @type {ThemeDefinition[]}
 */
export const themes = [
  // ===== DARK THEMES =====

  // 1. Midnight Pro (Default)
  {
    id: 'midnight-pro',
    name: 'Midnight Pro',
    type: 'dark',
    colors: {
      // Backgrounds
      'bg-primary': '#1e1e2e',
      'bg-secondary': '#181825',
      'bg-tertiary': '#11111b',
      'bg-elevated': '#252537',
      'bg-overlay': '#0f0f1a',

      // Text
      'text-primary': '#cdd6f4',
      'text-secondary': '#a6adc8',
      'text-tertiary': '#6c7086',
      'text-disabled': '#45475a',

      // Borders
      'border-default': '#313244',
      'border-subtle': '#252537',
      'border-strong': '#45475a',

      // Interactive
      'button-primary-bg': '#89b4fa',
      'button-primary-text': '#1e1e2e',
      'button-primary-hover': '#74c7ec',
      'button-secondary-bg': '#313244',
      'button-secondary-text': '#cdd6f4',
      'button-secondary-hover': '#45475a',

      // Editor
      'editor-bg': '#1e1e2e',
      'editor-gutter': '#181825',
      'editor-line-highlight': '#252537',
      'editor-selection': '#89b4fa40',
      'editor-cursor': '#f5e0dc',

      // Sidebar
      'sidebar-bg': '#181825',
      'sidebar-item-hover': '#252537',
      'sidebar-item-active': '#313244',

      // Status colors
      'success': '#a6e3a1',
      'warning': '#f9e2af',
      'error': '#f38ba8',
      'info': '#89b4fa',

      // Syntax highlighting
      'syntax-keyword': '#cba6f7',
      'syntax-string': '#a6e3a1',
      'syntax-number': '#fab387',
      'syntax-comment': '#6c7086',
      'syntax-function': '#89b4fa',
      'syntax-variable': '#f5c2e7',
      'syntax-operator': '#89dceb',

      // Scrollbar
      'scrollbar-track': '#181825',
      'scrollbar-thumb': '#313244',
      'scrollbar-thumb-hover': '#45475a',
    },
  },

  // 2. Dracula
  {
    id: 'dracula',
    name: 'Dracula',
    type: 'dark',
    colors: {
      'bg-primary': '#282a36',
      'bg-secondary': '#21222c',
      'bg-tertiary': '#191a21',
      'bg-elevated': '#343746',
      'bg-overlay': '#15161c',

      'text-primary': '#f8f8f2',
      'text-secondary': '#bfbfbf',
      'text-tertiary': '#6272a4',
      'text-disabled': '#44475a',

      'border-default': '#44475a',
      'border-subtle': '#343746',
      'border-strong': '#6272a4',

      'button-primary-bg': '#bd93f9',
      'button-primary-text': '#282a36',
      'button-primary-hover': '#c3a5ff',
      'button-secondary-bg': '#44475a',
      'button-secondary-text': '#f8f8f2',
      'button-secondary-hover': '#6272a4',

      'editor-bg': '#282a36',
      'editor-gutter': '#21222c',
      'editor-line-highlight': '#343746',
      'editor-selection': '#44475a80',
      'editor-cursor': '#f8f8f2',

      'sidebar-bg': '#21222c',
      'sidebar-item-hover': '#343746',
      'sidebar-item-active': '#44475a',

      'success': '#50fa7b',
      'warning': '#f1fa8c',
      'error': '#ff5555',
      'info': '#8be9fd',

      'syntax-keyword': '#ff79c6',
      'syntax-string': '#f1fa8c',
      'syntax-number': '#bd93f9',
      'syntax-comment': '#6272a4',
      'syntax-function': '#50fa7b',
      'syntax-variable': '#ffb86c',
      'syntax-operator': '#ff79c6',

      'scrollbar-track': '#21222c',
      'scrollbar-thumb': '#44475a',
      'scrollbar-thumb-hover': '#6272a4',
    },
  },

  // 3. One Dark Pro
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    type: 'dark',
    colors: {
      'bg-primary': '#282c34',
      'bg-secondary': '#21252b',
      'bg-tertiary': '#1b1f23',
      'bg-elevated': '#2c313a',
      'bg-overlay': '#181a1f',

      'text-primary': '#abb2bf',
      'text-secondary': '#848b98',
      'text-tertiary': '#5c6370',
      'text-disabled': '#4b5263',

      'border-default': '#3e4451',
      'border-subtle': '#2c313a',
      'border-strong': '#5c6370',

      'button-primary-bg': '#61afef',
      'button-primary-text': '#282c34',
      'button-primary-hover': '#79b8f5',
      'button-secondary-bg': '#3e4451',
      'button-secondary-text': '#abb2bf',
      'button-secondary-hover': '#5c6370',

      'editor-bg': '#282c34',
      'editor-gutter': '#21252b',
      'editor-line-highlight': '#2c313a',
      'editor-selection': '#3e445180',
      'editor-cursor': '#528bff',

      'sidebar-bg': '#21252b',
      'sidebar-item-hover': '#2c313a',
      'sidebar-item-active': '#3e4451',

      'success': '#98c379',
      'warning': '#e5c07b',
      'error': '#e06c75',
      'info': '#61afef',

      'syntax-keyword': '#c678dd',
      'syntax-string': '#98c379',
      'syntax-number': '#d19a66',
      'syntax-comment': '#5c6370',
      'syntax-function': '#61afef',
      'syntax-variable': '#e06c75',
      'syntax-operator': '#56b6c2',

      'scrollbar-track': '#21252b',
      'scrollbar-thumb': '#3e4451',
      'scrollbar-thumb-hover': '#5c6370',
    },
  },

  // 4. Tokyo Night
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    type: 'dark',
    colors: {
      'bg-primary': '#1a1b26',
      'bg-secondary': '#16161e',
      'bg-tertiary': '#101014',
      'bg-elevated': '#24283b',
      'bg-overlay': '#0d0d12',

      'text-primary': '#a9b1d6',
      'text-secondary': '#9aa5ce',
      'text-tertiary': '#565f89',
      'text-disabled': '#414868',

      'border-default': '#3b4261',
      'border-subtle': '#24283b',
      'border-strong': '#565f89',

      'button-primary-bg': '#7aa2f7',
      'button-primary-text': '#1a1b26',
      'button-primary-hover': '#89b4fa',
      'button-secondary-bg': '#3b4261',
      'button-secondary-text': '#a9b1d6',
      'button-secondary-hover': '#565f89',

      'editor-bg': '#1a1b26',
      'editor-gutter': '#16161e',
      'editor-line-highlight': '#24283b',
      'editor-selection': '#3b426180',
      'editor-cursor': '#c0caf5',

      'sidebar-bg': '#16161e',
      'sidebar-item-hover': '#24283b',
      'sidebar-item-active': '#3b4261',

      'success': '#9ece6a',
      'warning': '#e0af68',
      'error': '#f7768e',
      'info': '#7dcfff',

      'syntax-keyword': '#bb9af7',
      'syntax-string': '#9ece6a',
      'syntax-number': '#ff9e64',
      'syntax-comment': '#565f89',
      'syntax-function': '#7aa2f7',
      'syntax-variable': '#c0caf5',
      'syntax-operator': '#89ddff',

      'scrollbar-track': '#16161e',
      'scrollbar-thumb': '#3b4261',
      'scrollbar-thumb-hover': '#565f89',
    },
  },

  // 5. Catppuccin Mocha
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    type: 'dark',
    colors: {
      'bg-primary': '#1e1e2e',
      'bg-secondary': '#181825',
      'bg-tertiary': '#11111b',
      'bg-elevated': '#313244',
      'bg-overlay': '#0f0f1a',

      'text-primary': '#cdd6f4',
      'text-secondary': '#bac2de',
      'text-tertiary': '#6c7086',
      'text-disabled': '#45475a',

      'border-default': '#313244',
      'border-subtle': '#1e1e2e',
      'border-strong': '#585b70',

      'button-primary-bg': '#f5c2e7',
      'button-primary-text': '#1e1e2e',
      'button-primary-hover': '#f2d4e7',
      'button-secondary-bg': '#313244',
      'button-secondary-text': '#cdd6f4',
      'button-secondary-hover': '#45475a',

      'editor-bg': '#1e1e2e',
      'editor-gutter': '#181825',
      'editor-line-highlight': '#313244',
      'editor-selection': '#f5c2e740',
      'editor-cursor': '#f5e0dc',

      'sidebar-bg': '#181825',
      'sidebar-item-hover': '#313244',
      'sidebar-item-active': '#45475a',

      'success': '#a6e3a1',
      'warning': '#f9e2af',
      'error': '#f38ba8',
      'info': '#89b4fa',

      'syntax-keyword': '#cba6f7',
      'syntax-string': '#a6e3a1',
      'syntax-number': '#fab387',
      'syntax-comment': '#6c7086',
      'syntax-function': '#89b4fa',
      'syntax-variable': '#f5c2e7',
      'syntax-operator': '#89dceb',

      'scrollbar-track': '#181825',
      'scrollbar-thumb': '#313244',
      'scrollbar-thumb-hover': '#45475a',
    },
  },

  // 6. GitHub Dark Dimmed
  {
    id: 'github-dark-dimmed',
    name: 'GitHub Dark Dimmed',
    type: 'dark',
    colors: {
      'bg-primary': '#22272e',
      'bg-secondary': '#1c2128',
      'bg-tertiary': '#161b22',
      'bg-elevated': '#2d333b',
      'bg-overlay': '#13171d',

      'text-primary': '#adbac7',
      'text-secondary': '#909dab',
      'text-tertiary': '#636e7b',
      'text-disabled': '#444c56',

      'border-default': '#373e47',
      'border-subtle': '#2d333b',
      'border-strong': '#545d68',

      'button-primary-bg': '#347d39',
      'button-primary-text': '#ffffff',
      'button-primary-hover': '#46954a',
      'button-secondary-bg': '#373e47',
      'button-secondary-text': '#adbac7',
      'button-secondary-hover': '#545d68',

      'editor-bg': '#22272e',
      'editor-gutter': '#1c2128',
      'editor-line-highlight': '#2d333b',
      'editor-selection': '#347d3940',
      'editor-cursor': '#adbac7',

      'sidebar-bg': '#1c2128',
      'sidebar-item-hover': '#2d333b',
      'sidebar-item-active': '#373e47',

      'success': '#57ab5a',
      'warning': '#c69026',
      'error': '#e5534b',
      'info': '#539bf5',

      'syntax-keyword': '#f47067',
      'syntax-string': '#96d0ff',
      'syntax-number': '#6cb6ff',
      'syntax-comment': '#636e7b',
      'syntax-function': '#dcbdfb',
      'syntax-variable': '#f69d50',
      'syntax-operator': '#f47067',

      'scrollbar-track': '#1c2128',
      'scrollbar-thumb': '#373e47',
      'scrollbar-thumb-hover': '#545d68',
    },
  },

  // 7. Nord
  {
    id: 'nord',
    name: 'Nord',
    type: 'dark',
    colors: {
      'bg-primary': '#2e3440',
      'bg-secondary': '#3b4252',
      'bg-tertiary': '#242933',
      'bg-elevated': '#434c5e',
      'bg-overlay': '#1f242d',

      'text-primary': '#d8dee9',
      'text-secondary': '#e5e9f0',
      'text-tertiary': '#4c566a',
      'text-disabled': '#3b4252',

      'border-default': '#434c5e',
      'border-subtle': '#3b4252',
      'border-strong': '#4c566a',

      'button-primary-bg': '#88c0d0',
      'button-primary-text': '#2e3440',
      'button-primary-hover': '#8fbcbb',
      'button-secondary-bg': '#434c5e',
      'button-secondary-text': '#d8dee9',
      'button-secondary-hover': '#4c566a',

      'editor-bg': '#2e3440',
      'editor-gutter': '#3b4252',
      'editor-line-highlight': '#434c5e',
      'editor-selection': '#434c5e80',
      'editor-cursor': '#d8dee9',

      'sidebar-bg': '#3b4252',
      'sidebar-item-hover': '#434c5e',
      'sidebar-item-active': '#4c566a',

      'success': '#a3be8c',
      'warning': '#ebcb8b',
      'error': '#bf616a',
      'info': '#81a1c1',

      'syntax-keyword': '#81a1c1',
      'syntax-string': '#a3be8c',
      'syntax-number': '#b48ead',
      'syntax-comment': '#616e88',
      'syntax-function': '#88c0d0',
      'syntax-variable': '#d8dee9',
      'syntax-operator': '#81a1c1',

      'scrollbar-track': '#3b4252',
      'scrollbar-thumb': '#434c5e',
      'scrollbar-thumb-hover': '#4c566a',
    },
  },

  // ===== LIGHT THEMES =====

  // 8. GitHub Light
  {
    id: 'github-light',
    name: 'GitHub Light',
    type: 'light',
    colors: {
      'bg-primary': '#ffffff',
      'bg-secondary': '#f6f8fa',
      'bg-tertiary': '#eaeef2',
      'bg-elevated': '#ffffff',
      'bg-overlay': '#fafbfc',

      'text-primary': '#1f2328',
      'text-secondary': '#57606a',
      'text-tertiary': '#6e7781',
      'text-disabled': '#afb8c1',

      'border-default': '#d0d7de',
      'border-subtle': '#eaeef2',
      'border-strong': '#afb8c1',

      'button-primary-bg': '#1f883d',
      'button-primary-text': '#ffffff',
      'button-primary-hover': '#1a7f37',
      'button-secondary-bg': '#f6f8fa',
      'button-secondary-text': '#1f2328',
      'button-secondary-hover': '#eaeef2',

      'editor-bg': '#ffffff',
      'editor-gutter': '#f6f8fa',
      'editor-line-highlight': '#f6f8fa',
      'editor-selection': '#0366d625',
      'editor-cursor': '#1f2328',

      'sidebar-bg': '#f6f8fa',
      'sidebar-item-hover': '#eaeef2',
      'sidebar-item-active': '#d0d7de',

      'success': '#1a7f37',
      'warning': '#9a6700',
      'error': '#cf222e',
      'info': '#0969da',

      'syntax-keyword': '#cf222e',
      'syntax-string': '#0a3069',
      'syntax-number': '#0550ae',
      'syntax-comment': '#6e7781',
      'syntax-function': '#8250df',
      'syntax-variable': '#953800',
      'syntax-operator': '#cf222e',

      'scrollbar-track': '#f6f8fa',
      'scrollbar-thumb': '#d0d7de',
      'scrollbar-thumb-hover': '#afb8c1',
    },
  },

  // 9. Catppuccin Latte
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    type: 'light',
    colors: {
      'bg-primary': '#eff1f5',
      'bg-secondary': '#e6e9ef',
      'bg-tertiary': '#dce0e8',
      'bg-elevated': '#eff1f5',
      'bg-overlay': '#dce0e8',

      'text-primary': '#4c4f69',
      'text-secondary': '#5c5f77',
      'text-tertiary': '#6c6f85',
      'text-disabled': '#9ca0b0',

      'border-default': '#ccd0da',
      'border-subtle': '#e6e9ef',
      'border-strong': '#bcc0cc',

      'button-primary-bg': '#1e66f5',
      'button-primary-text': '#eff1f5',
      'button-primary-hover': '#2a6ef5',
      'button-secondary-bg': '#e6e9ef',
      'button-secondary-text': '#4c4f69',
      'button-secondary-hover': '#ccd0da',

      'editor-bg': '#eff1f5',
      'editor-gutter': '#e6e9ef',
      'editor-line-highlight': '#ccd0da',
      'editor-selection': '#1e66f540',
      'editor-cursor': '#4c4f69',

      'sidebar-bg': '#e6e9ef',
      'sidebar-item-hover': '#ccd0da',
      'sidebar-item-active': '#bcc0cc',

      'success': '#40a02b',
      'warning': '#df8e1d',
      'error': '#d20f39',
      'info': '#1e66f5',

      'syntax-keyword': '#8839ef',
      'syntax-string': '#40a02b',
      'syntax-number': '#fe640b',
      'syntax-comment': '#6c6f85',
      'syntax-function': '#1e66f5',
      'syntax-variable': '#ea76cb',
      'syntax-operator': '#04a5e5',

      'scrollbar-track': '#e6e9ef',
      'scrollbar-thumb': '#ccd0da',
      'scrollbar-thumb-hover': '#bcc0cc',
    },
  },

  // 10. One Light
  {
    id: 'one-light',
    name: 'One Light',
    type: 'light',
    colors: {
      'bg-primary': '#fafafa',
      'bg-secondary': '#f0f0f1',
      'bg-tertiary': '#e5e5e6',
      'bg-elevated': '#ffffff',
      'bg-overlay': '#fafafa',

      'text-primary': '#383a42',
      'text-secondary': '#606166',
      'text-tertiary': '#a0a1a7',
      'text-disabled': '#c8c8ca',

      'border-default': '#d4d4d6',
      'border-subtle': '#e5e5e6',
      'border-strong': '#a0a1a7',

      'button-primary-bg': '#4078f2',
      'button-primary-text': '#ffffff',
      'button-primary-hover': '#528bff',
      'button-secondary-bg': '#f0f0f1',
      'button-secondary-text': '#383a42',
      'button-secondary-hover': '#e5e5e6',

      'editor-bg': '#fafafa',
      'editor-gutter': '#f0f0f1',
      'editor-line-highlight': '#f0f0f1',
      'editor-selection': '#4078f240',
      'editor-cursor': '#383a42',

      'sidebar-bg': '#f0f0f1',
      'sidebar-item-hover': '#e5e5e6',
      'sidebar-item-active': '#d4d4d6',

      'success': '#50a14f',
      'warning': '#c18401',
      'error': '#e45649',
      'info': '#4078f2',

      'syntax-keyword': '#a626a4',
      'syntax-string': '#50a14f',
      'syntax-number': '#986801',
      'syntax-comment': '#a0a1a7',
      'syntax-function': '#4078f2',
      'syntax-variable': '#e45649',
      'syntax-operator': '#0184bc',

      'scrollbar-track': '#f0f0f1',
      'scrollbar-thumb': '#d4d4d6',
      'scrollbar-thumb-hover': '#a0a1a7',
    },
  },
];

/**
 * Get theme by ID
 * @param {string} id - Theme ID
 * @returns {ThemeDefinition|undefined} Theme object or undefined
 */
export function getThemeById(id) {
  return themes.find((theme) => theme.id === id);
}

/**
 * Get default theme ID
 * @returns {string} Default theme ID
 */
export function getDefaultThemeId() {
  return 'midnight-pro';
}

/**
 * Get themes filtered by type
 * @param {'dark'|'light'} type - Theme type
 * @returns {ThemeDefinition[]} Filtered themes
 */
export function getThemesByType(type) {
  return themes.filter((theme) => theme.type === type);
}
