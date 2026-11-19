import path from 'path';

/**
 * Image file extensions supported for preview
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.avif', '.ico'];

/**
 * PDF file extension
 */
const PDF_EXTENSIONS = ['.pdf'];

/**
 * Text file extensions (plain text, no syntax highlighting)
 */
const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.log'];

/**
 * Code file extensions (with syntax highlighting support)
 */
const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.jsonc',
  '.html', '.htm', '.xml',
  '.css', '.scss', '.sass', '.less',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
  '.php', '.sql', '.yaml', '.yml', '.toml', '.ini', '.conf',
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
];

/**
 * Check if a file extension is an image
 * @param {string} extension - File extension (with or without dot)
 * @returns {boolean}
 */
export function isImage(extension) {
  const ext = normalizeExtension(extension);
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Check if a file extension is a PDF
 * @param {string} extension - File extension (with or without dot)
 * @returns {boolean}
 */
export function isPDF(extension) {
  const ext = normalizeExtension(extension);
  return PDF_EXTENSIONS.includes(ext);
}

/**
 * Check if a file extension is plain text (no syntax highlighting)
 * @param {string} extension - File extension (with or without dot)
 * @returns {boolean}
 */
export function isText(extension) {
  const ext = normalizeExtension(extension);
  return TEXT_EXTENSIONS.includes(ext);
}

/**
 * Check if a file extension is code (with syntax highlighting)
 * @param {string} extension - File extension (with or without dot)
 * @returns {boolean}
 */
export function isCode(extension) {
  const ext = normalizeExtension(extension);
  return CODE_EXTENSIONS.includes(ext);
}

/**
 * Get the preview type for a file based on its extension
 * @param {string} extension - File extension (with or without dot)
 * @returns {'image' | 'pdf' | 'text' | 'code' | null} Preview type or null if not previewable
 */
export function getPreviewType(extension) {
  const ext = normalizeExtension(extension);
  
  if (isImage(ext)) return 'image';
  if (isPDF(ext)) return 'pdf';
  if (isCode(ext)) return 'code';
  if (isText(ext)) return 'text';
  
  return null;
}

/**
 * Check if a file can be previewed
 * @param {string} extension - File extension (with or without dot)
 * @returns {boolean}
 */
export function canPreview(extension) {
  return getPreviewType(extension) !== null;
}

/**
 * Get language identifier for syntax highlighting
 * @param {string} extension - File extension (with or without dot)
 * @returns {string|null} Language identifier or null
 */
export function getLanguage(extension) {
  const ext = normalizeExtension(extension);
  
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.jsonc': 'json',
    '.html': 'html',
    '.htm': 'html',
    '.xml': 'xml',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.py': 'python',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.php': 'php',
    '.sql': 'sql',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.ini': 'ini',
    '.conf': 'ini',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.ps1': 'powershell',
    '.bat': 'batch',
    '.cmd': 'batch',
    '.md': 'markdown',
    '.markdown': 'markdown',
  };
  
  return languageMap[ext] || null;
}

/**
 * Normalize extension to lowercase with dot prefix
 * @param {string} extension - Extension with or without dot
 * @returns {string} Normalized extension
 */
function normalizeExtension(extension) {
  if (!extension) return '';
  const ext = extension.toLowerCase();
  return ext.startsWith('.') ? ext : `.${ext}`;
}
