import path from 'path';

/**
 * Centralized archive format registry.
 * 
 * Defines all recognized archive formats and which ones the backend
 * can actually process (browse contents, extract files).
 * 
 * Only formats with `supported: true` should expose Extract / Open Archive
 * actions in the UI.
 * 
 * @module archive/formats
 */

/**
 * @typedef {Object} ArchiveFormat
 * @property {string} id - Canonical format identifier
 * @property {string} label - Human-readable label
 * @property {string[]} extensions - Extensions (lowercase, with dot) that identify this format
 * @property {boolean} supported - Whether the backend can browse and extract
 * @property {boolean} browsable - Whether the archive browser can list contents
 * @property {boolean} extractable - Whether extraction is supported
 * @property {boolean} compoundExt - Whether the format uses compound extensions (e.g. .tar.gz)
 */

/**
 * Known archive formats, ordered by specificity.
 * Compound extensions (.tar.gz) must appear BEFORE simple ones (.gz)
 * so detection tries the more specific match first.
 */
const FORMATS = [
  // ZIP — natively supported via adm-zip
  {
    id: 'zip',
    label: 'ZIP Archive',
    extensions: ['.zip'],
    supported: true,
    browsable: true,
    extractable: true,
    compoundExt: false,
  },
  // 7-Zip — supported via 7z.exe
  {
    id: '7z',
    label: '7-Zip Archive',
    extensions: ['.7z'],
    supported: true,
    browsable: true,
    extractable: true,
    compoundExt: false,
  },
  // TAR.GZ — identified but not natively supported
  {
    id: 'tar.gz',
    label: 'Compressed Tar Archive',
    extensions: ['.tar.gz', '.tgz'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: true,
  },
  // TAR.BZ2
  {
    id: 'tar.bz2',
    label: 'Bzip2 Tar Archive',
    extensions: ['.tar.bz2', '.tbz2'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: true,
  },
  // TAR.XZ
  {
    id: 'tar.xz',
    label: 'XZ Tar Archive',
    extensions: ['.tar.xz', '.txz'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: true,
  },
  // TAR — identified but not natively supported
  {
    id: 'tar',
    label: 'Tar Archive',
    extensions: ['.tar'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: false,
  },
  // GZIP — standalone .gz (not .tar.gz)
  {
    id: 'gz',
    label: 'Gzip Archive',
    extensions: ['.gz'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: false,
  },
  // BZIP2
  {
    id: 'bz2',
    label: 'Bzip2 Archive',
    extensions: ['.bz2'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: false,
  },
  // XZ
  {
    id: 'xz',
    label: 'XZ Archive',
    extensions: ['.xz'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: false,
  },
  // RAR — identified but not natively supported
  {
    id: 'rar',
    label: 'RAR Archive',
    extensions: ['.rar'],
    supported: false,
    browsable: false,
    extractable: false,
    compoundExt: false,
  },
];

/**
 * All recognized archive extensions (lowercase, with dot),
 * including compound extensions.
 * @type {Set<string>}
 */
const ALL_EXTENSIONS = new Set(
  FORMATS.flatMap((f) => f.extensions)
);

/**
 * Detect the archive format for a filename or path.
 * 
 * Handles:
 * - Case-insensitive matching (.ZIP, .Zip, .zip)
 * - Compound extensions (.tar.gz before .gz)
 * - Full filenames and bare extensions
 * 
 * @param {string} filenameOrPath — Filename or path
 * @returns {ArchiveFormat|null} Matched format, or null if not an archive
 */
export function detectArchiveFormat(filenameOrPath) {
  if (!filenameOrPath) return null;

  const lower = filenameOrPath.toLowerCase().replace(/\\/g, '/');

  // Try compound extensions first (they're ordered before simple ones in FORMATS)
  for (const format of FORMATS) {
    for (const ext of format.extensions) {
      if (lower.endsWith(ext)) {
        return format;
      }
    }
  }

  return null;
}

/**
 * Check if a filename/path is a recognized archive format.
 * @param {string} filenameOrPath
 * @returns {boolean}
 */
export function isArchiveFile(filenameOrPath) {
  return detectArchiveFormat(filenameOrPath) !== null;
}

/**
 * Check if a file is a supported archive (backend can browse/extract).
 * @param {string} filenameOrPath
 * @returns {boolean}
 */
export function isSupportedArchive(filenameOrPath) {
  const format = detectArchiveFormat(filenameOrPath);
  return format !== null && format.supported;
}

/**
 * Check if a file extension is a recognized archive extension.
 * Handles compound extensions (e.g. '.gz' for 'file.tar.gz').
 * @param {string} ext — File extension from path.extname() (may be just '.gz' for '.tar.gz' files)
 * @param {string} [filename] — Full filename for compound extension detection
 * @returns {boolean}
 */
export function isArchiveExtension(ext, filename) {
  if (!ext) return false;

  // If we have the full filename, use full detection
  if (filename) {
    return isArchiveFile(filename);
  }

  // Otherwise check the simple extension against known extensions
  return ALL_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Get all supported (extractable) archive extensions.
 * @returns {string[]}
 */
export function getSupportedArchiveExtensions() {
  return FORMATS.filter((f) => f.supported).flatMap((f) => f.extensions);
}

/**
 * Get all recognized archive extensions (supported or not).
 * @returns {string[]}
 */
export function getAllArchiveExtensions() {
  return Array.from(ALL_EXTENSIONS);
}

/**
 * Get a format by its ID.
 * @param {string} id — Format ID (e.g. 'zip', '7z')
 * @returns {ArchiveFormat|undefined}
 */
export function getFormat(id) {
  return FORMATS.find((f) => f.id === id);
}

/**
 * Get all registered formats.
 * @returns {ArchiveFormat[]}
 */
export function getAllFormats() {
  return [...FORMATS];
}

/**
 * Convenience: check if an extension (from file metadata) is a supported archive.
 * 
 * This is the primary function for context menu and UI checks.
 * It handles the `extension` field from file metadata (which comes from path.extname)
 * and uses the filename for compound extension detection when needed.
 * 
 * @param {string} ext — File extension (e.g. '.zip', '.7z', '.gz')
 * @param {string} [name] — Full filename for compound extension detection
 * @returns {boolean}
 */
export function isExtractableArchive(ext, name) {
  // First check via full filename (handles compound extensions)
  if (name) {
    const format = detectArchiveFormat(name);
    return format !== null && format.extractable;
  }
  
  // Fall back to simple extension check
  if (!ext) return false;
  const format = detectArchiveFormat(`file${ext}`);
  return format !== null && format.extractable;
}

/**
 * Convenience: check if an archive format is browsable.
 * @param {string} ext — File extension
 * @param {string} [name] — Full filename for compound extension detection
 * @returns {boolean}
 */
export function isBrowsableArchive(ext, name) {
  if (name) {
    const format = detectArchiveFormat(name);
    return format !== null && format.browsable;
  }
  if (!ext) return false;
  const format = detectArchiveFormat(`file${ext}`);
  return format !== null && format.browsable;
}
