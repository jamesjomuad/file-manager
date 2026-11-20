import path from 'path';

/**
 * Get a human-readable file type category.
 * @param {string} filename
 * @returns {string}
 */
export function getFileCategory(filename) {
  const ext = path.extname(filename).toLowerCase();
  const categories = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.avif'],
    document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv', '.md'],
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.css', '.html', '.htm', '.xml', '.json', '.yaml', '.yml', '.toml', '.sh', '.bash', '.sql'],
    video: ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm'],
    audio: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'],
    archive: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2'],
  };
  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) return category;
  }
  return 'other';
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Sanitize a filename for safe storage.
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
  // Replace invalid characters with underscore
  // Allow leading dots (e.g., .env, .gitignore)
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
