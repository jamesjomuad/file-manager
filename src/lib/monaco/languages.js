/**
 * Language detection for Monaco Editor
 *
 * Maps file extensions and filenames to Monaco language IDs.
 * Monaco uses different language IDs than Prism, so this is separate
 * from the existing file-types.js.
 *
 * @see https://microsoft.github.io/monaco-editor/monarch.html
 */

/**
 * File extension to Monaco language mapping
 * @type {Object.<string, string>}
 */
const EXTENSION_TO_LANGUAGE = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',

  // Data
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  svg: 'xml',

  // Documentation
  md: 'markdown',
  mdx: 'markdown',

  // Backend
  py: 'python',
  pyw: 'python',
  pyi: 'python',
  java: 'java',
  php: 'php',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  cs: 'csharp',

  // C family
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',

  // Shell
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',

  // Database
  sql: 'sql',

  // Container
  dockerfile: 'dockerfile',

  // Config
  ini: 'ini',
  toml: 'toml',
  properties: 'properties',
};

/**
 * File name to language mapping (for files without extensions)
 * @type {Object.<string, string>}
 */
const FILENAME_TO_LANGUAGE = {
  dockerfile: 'dockerfile',
  makefile: 'shell',
  cmakelists: 'shell',
  '.bashrc': 'shell',
  '.bash_profile': 'shell',
  '.zshrc': 'shell',
  '.gitignore': 'shell',
  '.gitattributes': 'shell',
  '.gitmodules': 'shell',
  '.env': 'shell',
};

/**
 * Language display names
 * @type {Object.<string, string>}
 */
export const LANGUAGE_NAMES = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'LESS',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  python: 'Python',
  java: 'Java',
  php: 'PHP',
  ruby: 'Ruby',
  go: 'Go',
  rust: 'Rust',
  swift: 'Swift',
  kotlin: 'Kotlin',
  csharp: 'C#',
  c: 'C',
  cpp: 'C++',
  shell: 'Shell',
  sql: 'SQL',
  dockerfile: 'Dockerfile',
  ini: 'INI',
  toml: 'TOML',
  properties: 'Properties',
  plaintext: 'Plain Text',
};

/**
 * Detect Monaco language from file path
 * @param {string} filePath - Path to file
 * @returns {string} Monaco language ID or 'plaintext'
 */
export function detectLanguage(filePath) {
  if (!filePath) return 'plaintext';

  const fileName = filePath.toLowerCase().split('/').pop();

  // Check exact filename match first
  if (FILENAME_TO_LANGUAGE[fileName]) {
    return FILENAME_TO_LANGUAGE[fileName];
  }

  // Extract extension
  const ext = fileName.split('.').pop();

  // Check extension mapping
  if (ext && EXTENSION_TO_LANGUAGE[ext]) {
    return EXTENSION_TO_LANGUAGE[ext];
  }

  return 'plaintext';
}

/**
 * Get display name for a language
 * @param {string} languageId - Monaco language ID
 * @returns {string} Human-readable language name
 */
export function getLanguageName(languageId) {
  return LANGUAGE_NAMES[languageId] || languageId || 'Plain Text';
}
