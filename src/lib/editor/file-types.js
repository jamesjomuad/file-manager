/**
 * File type detection utilities for the editor
 *
 * Determines whether a file should be opened in the code editor
 * (with syntax highlighting) or the text editor (plain text),
 * and provides language detection from file extensions.
 */

/**
 * File extensions that should use the code editor with syntax highlighting
 * @type {Set<string>}
 */
const CODE_FILE_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts',
  // Web
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  // Data
  'json', 'yaml', 'yml', 'xml', 'svg', 'toml',
  // Documentation
  'md', 'mdx',
  // Backend
  'py', 'pyw', 'pyi', 'java', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'kts', 'cs',
  // C family
  'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hxx',
  // Shell
  'sh', 'bash', 'zsh', 'fish',
  // Database
  'sql',
  // Container/config
  'dockerfile', 'ini', 'cfg', 'conf', 'env',
  // Other
  'git', 'diff', 'patch', 'log',
]);

/**
 * File names that should use the code editor (files without extensions)
 * @type {Set<string>}
 */
const CODE_FILE_NAMES = new Set([
  'dockerfile',
  'makefile',
  'cmakelists.txt',
  '.bashrc',
  '.bash_profile',
  '.zshrc',
  '.gitignore',
  '.gitattributes',
  '.gitmodules',
  '.editorconfig',
  '.prettierrc',
  '.eslintrc',
  '.env',
  '.env.local',
  '.env.example',
  'docker-compose.yml',
  'docker-compose.yaml',
]);

/**
 * File extensions that are plain text (no syntax highlighting needed)
 * @type {Set<string>}
 */
const TEXT_FILE_EXTENSIONS = new Set([
  'txt', 'text', 'log', 'csv', 'tsv',
]);

/**
 * Check if a file should use the code editor (syntax highlighting)
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file should use code editor
 */
export function isCodeFile(filePath) {
  if (!filePath) return false;

  const fileName = filePath.toLowerCase().split('/').pop();

  // Check exact filename match first
  if (CODE_FILE_NAMES.has(fileName)) {
    return true;
  }

  // Extract extension
  const ext = fileName.split('.').pop();

  // Check extension mapping
  if (ext && CODE_FILE_EXTENSIONS.has(ext)) {
    return true;
  }

  return false;
}

/**
 * Check if a file should use the plain text editor
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file should use text editor
 */
export function isTextFile(filePath) {
  if (!filePath) return false;

  const fileName = filePath.toLowerCase().split('/').pop();
  const ext = fileName.split('.').pop();

  // If it's a code file, it's not a plain text file
  if (isCodeFile(filePath)) {
    return false;
  }

  // Check if it's explicitly a text file
  if (ext && TEXT_FILE_EXTENSIONS.has(ext)) {
    return true;
  }

  // Default to text editor for unknown extensions
  return true;
}

/**
 * File size threshold for showing large file warning (1MB)
 * @type {number}
 */
export const LARGE_FILE_THRESHOLD = 1024 * 1024; // 1MB

/**
 * Check if a file is considered large
 * @param {number} size - File size in bytes
 * @returns {boolean} True if file exceeds threshold
 */
export function isLargeFile(size) {
  return size > LARGE_FILE_THRESHOLD;
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get a human-readable language name from a file extension
 * @param {string} filePath - Path to the file
 * @returns {string} Language name or 'Plain Text'
 */
export function getLanguageName(filePath) {
  if (!filePath) return 'Plain Text';

  const fileName = filePath.toLowerCase().split('/').pop();
  const ext = fileName.split('.').pop();

  const languageNames = {
    'js': 'JavaScript',
    'jsx': 'JavaScript (JSX)',
    'mjs': 'JavaScript',
    'cjs': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript (TSX)',
    'mts': 'TypeScript',
    'cts': 'TypeScript',
    'html': 'HTML',
    'htm': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'json': 'JSON',
    'yaml': 'YAML',
    'yml': 'YAML',
    'xml': 'XML',
    'svg': 'SVG',
    'toml': 'TOML',
    'md': 'Markdown',
    'mdx': 'MDX',
    'py': 'Python',
    'java': 'Java',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'kts': 'Kotlin',
    'cs': 'C#',
    'c': 'C',
    'h': 'C',
    'cpp': 'C++',
    'cc': 'C++',
    'cxx': 'C++',
    'hpp': 'C++',
    'hxx': 'C++',
    'sh': 'Shell',
    'bash': 'Bash',
    'zsh': 'Zsh',
    'fish': 'Fish',
    'sql': 'SQL',
    'dockerfile': 'Docker',
    'ini': 'INI',
    'cfg': 'Config',
    'conf': 'Config',
    'env': 'Environment',
    'git': 'Git',
    'diff': 'Diff',
    'patch': 'Patch',
    'log': 'Log',
  };

  return languageNames[ext] || 'Plain Text';
}
