/**
 * File icon module
 *
 * Provides file and folder icon resolution based on filename, extension, and MIME type.
 *
 * @example
 * import { getFileIcon, getFolderIcon } from '@/lib/file-icons';
 *
 * const icon = getFileIcon({ name: 'package.json' });
 * // => { icon: RiNodeLine, color: '#339933', label: 'Node.js Package' }
 *
 * const folderIcon = getFolderIcon({ name: 'node_modules' });
 * // => { icon: RiNodeLine, color: '#339933' }
 */

export {
  resolveFileIcon,
  resolveFolderIcon,
  getSupportedExtensions,
  getExactFilenames,
} from './file-icon-registry';
