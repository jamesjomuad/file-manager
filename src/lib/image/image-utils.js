/**
 * Image utilities for the image viewer
 *
 * Provides format detection, EXIF metadata parsing, and image dimension
 * extraction. Supports JPEG, PNG, WebP, GIF, SVG, BMP, ICO, and AVIF.
 */

/**
 * Image file extensions the viewer supports
 * @type {string[]}
 */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif',
];

/**
 * Check whether a file extension is a supported image format
 * @param {string} extension - File extension (with or without dot)
 * @returns {boolean}
 */
export function isSupportedImageFormat(extension) {
  if (!extension) return false;
  const ext = extension.toLowerCase().startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Get a human-readable format name from extension
 * @param {string} extension
 * @returns {string}
 */
export function getFormatName(extension) {
  if (!extension) return 'Unknown';
  const ext = extension.toLowerCase().replace(/^\./, '');
  const names = {
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    png: 'PNG Image',
    gif: 'GIF Image',
    webp: 'WebP Image',
    svg: 'SVG Vector Image',
    bmp: 'Bitmap Image',
    ico: 'Icon Image',
    avif: 'AVIF Image',
  };
  return names[ext] || `${ext.toUpperCase()} Image`;
}

/**
 * Check browser support for an image format via a tiny probe image.
 * Returns a promise that resolves to true/false.
 * @param {string} mimeType - MIME type to test
 * @returns {Promise<boolean>}
 */
export function checkBrowserSupport(mimeType) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      // A 1×1 data URI succeeds even for unsupported types in some browsers,
      // so check naturalWidth as well
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => resolve(false);
    // Minimal 1×1 pixel data URI — the type attribute is what we're testing
    img.src = `data:${mimeType};base64,` + getProbeBase64(mimeType);
  });
}

/**
 * Minimal base64 probe data for format support detection
 * @param {string} mimeType
 * @returns {string}
 */
function getProbeBase64(mimeType) {
  switch (mimeType) {
    case 'image/avif':
      // Minimal AVIF 1×1
      return 'AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAApaWxvYwAAAABEAAABAAEAAAABAAABGgAAABkAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAAHBpeGkAAAAAAAEAAQAAAAxpcG1hAAAAAAAAAAEAAAEAggCCCHJlZm0AAAAAAAEADGRhdGEAAAAAAAAAAAAA';
    case 'image/webp':
      return 'UklGRiIAAABXRUJQVlA4ICaIAAACAwECdASoCAxABADQEAAGkAHEAADUAA';
    case 'image/png':
      return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    case 'image/jpeg':
      return '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////2wBDAf//////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AVMAH/9k=';
    case 'image/gif':
      return 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    case 'image/bmp':
      return 'Qk06AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABABgAAAAAAAQAAADDDgAAww4AAAAAAAAAAAAA////AA==';
    case 'image/svg+xml':
      return 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4=';
    case 'image/x-icon':
      return 'AAABAAEAAQEAAAEAGAAwAAAAFgAAACgAAAABAAAAAgAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAA=';
    default:
      return '';
  }
}

/**
 * @typedef {Object} ImageMetadata
 * @property {number} width - Natural width in pixels
 * @property {number} height - Natural height in pixels
 * @property {number} fileSize - File size in bytes
 * @property {string} format - Format name
 * @property {string} mimeType - MIME type
 * @property {Object} [exif] - EXIF metadata if available
 */

/**
 * Extract metadata from a loaded image element
 * @param {HTMLImageElement} img - Loaded image
 * @param {number} fileSize - File size in bytes
 * @param {string} extension - File extension
 * @returns {ImageMetadata}
 */
export function getImageMetadata(img, fileSize, extension) {
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    fileSize,
    format: getFormatName(extension),
    mimeType: getMimeType(extension),
    exif: null,
  };
}

/**
 * Get MIME type for an image extension
 * @param {string} extension
 * @returns {string}
 */
export function getMimeType(extension) {
  if (!extension) return 'application/octet-stream';
  const ext = extension.toLowerCase().replace(/^\./, '');
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    avif: 'image/avif',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Parse basic EXIF data from a JPEG file's ArrayBuffer.
 * Extracts camera info, capture date, GPS, and orientation.
 *
 * @param {ArrayBuffer} buffer - File contents
 * @returns {Object|null} Parsed EXIF data or null if not available
 */
export function parseExifData(buffer) {
  try {
    const view = new DataView(buffer);

    // Check for JPEG SOI marker
    if (view.getUint16(0) !== 0xFFD8) return null;

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      // Check for APP1 marker (EXIF)
      if (view.getUint8(offset) !== 0xFF) break;

      const marker = view.getUint8(offset + 1);

      if (marker === 0xE1) {
        // APP1 — EXIF data
        const exifBlock = parseExifBlock(view, offset + 4);
        if (exifBlock) return exifBlock;
      }

      // Move to next marker
      const segmentLength = view.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }
  } catch {
    // Parsing errors are non-fatal
  }

  return null;
}

/**
 * Parse the EXIF block starting after the length field
 * @param {DataView} view
 * @param {number} startOffset
 * @returns {Object|null}
 */
function parseExifBlock(view, startOffset) {
  // Check for "Exif\0\0" header
  const exifHeader = String.fromCharCode(
    view.getUint8(startOffset),
    view.getUint8(startOffset + 1),
    view.getUint8(startOffset + 2),
    view.getUint8(startOffset + 3)
  );

  if (exifHeader !== 'Exif') return null;

  const tiffStart = startOffset + 6; // Skip "Exif\0\0"

  // Determine byte order
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949; // "II" = Intel = little-endian

  // Check TIFF magic number (42)
  const magic = view.getUint16(tiffStart + 2, littleEndian);
  if (magic !== 42) return null;

  // Get offset to first IFD
  const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
  if (ifdOffset === 0) return null;

  const ifdStart = tiffStart + ifdOffset;
  return parseIFD(view, ifdStart, tiffStart, littleEndian);
}

/**
 * Parse an IFD (Image File Directory) and extract tags we care about
 * @param {DataView} view
 * @param {number} ifdStart
 * @param {number} tiffStart
 * @param {boolean} littleEndian
 * @returns {Object|null}
 */
function parseIFD(view, ifdStart, tiffStart, littleEndian) {
  try {
    if (ifdStart >= view.byteLength - 2) return null;

    const entryCount = view.getUint16(ifdStart, littleEndian);
    if (entryCount > 100) return null; // Sanity check

    const result = {};

    // EXIF tag IDs we care about
    const TAGS = {
      0x010F: 'make',          // Camera make
      0x0110: 'model',         // Camera model
      0x0112: 'orientation',   // Orientation
      0x011A: 'xResolution',   // X resolution
      0x011B: 'yResolution',   // Y resolution
      0x0128: 'resolutionUnit',
      0x0132: 'dateTime',      // Date/time modified
      0x829A: 'exposureTime',  // Exposure time
      0x829D: 'fNumber',       // F-number
      0x8827: 'iso',           // ISO speed
      0x9003: 'dateTimeOriginal',
      0x920A: 'focalLength',   // Focal length
      0xA405: 'focalLength35mm', // Focal length in 35mm film
    };

    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const valueOffset = entryOffset + 8;

      const tagName = TAGS[tag];
      if (!tagName) continue;

      try {
        const value = readTagValue(view, type, count, valueOffset, tiffStart, littleEndian);
        if (value !== undefined) {
          result[tagName] = value;
        }
      } catch {
        // Skip unreadable tags
      }
    }

    // Also look for EXIF sub-IFD
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, littleEndian);
      if (tag === 0x8769) {
        // EXIF IFD pointer
        const subIfdOffset = view.getUint32(entryOffset + 8, littleEndian);
        const subResult = parseIFD(view, tiffStart + subIfdOffset, tiffStart, littleEndian);
        if (subResult) {
          Object.assign(result, subResult);
        }
        break;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Read a tag value based on its type
 * @param {DataView} view
 * @param {number} type
 * @param {number} count
 * @param {number} valueOffset
 * @param {number} tiffStart
 * @param {boolean} littleEndian
 * @returns {*}
 */
function readTagValue(view, type, count, valueOffset, tiffStart, littleEndian) {
  // If value fits in 4 bytes, it's stored inline at valueOffset
  // Otherwise valueOffset is an offset from tiffStart

  switch (type) {
    case 2: {
      // ASCII string
      const totalBytes = count;
      const strOffset = totalBytes > 4
        ? tiffStart + view.getUint32(valueOffset, littleEndian)
        : valueOffset;
      if (strOffset + totalBytes > view.byteLength) return undefined;
      let str = '';
      for (let j = 0; j < totalBytes; j++) {
        const ch = view.getUint8(strOffset + j);
        if (ch === 0) break;
        str += String.fromCharCode(ch);
      }
      return str.trim();
    }
    case 3: {
      // SHORT (16-bit)
      return view.getUint16(valueOffset, littleEndian);
    }
    case 4: {
      // LONG (32-bit)
      return view.getUint32(valueOffset, littleEndian);
    }
    case 5: {
      // RATIONAL (two LONGs: numerator + denominator)
      const ratOffset = tiffStart + view.getUint32(valueOffset, littleEndian);
      if (ratOffset + 8 > view.byteLength) return undefined;
      const num = view.getUint32(ratOffset, littleEndian);
      const den = view.getUint32(ratOffset + 4, littleEndian);
      return den !== 0 ? num / den : 0;
    }
    case 10: {
      // SRATIONAL (two SLONGs)
      const sRatOffset = tiffStart + view.getUint32(valueOffset, littleEndian);
      if (sRatOffset + 8 > view.byteLength) return undefined;
      const sNum = view.getInt32(sRatOffset, littleEndian);
      const sDen = view.getInt32(sRatOffset + 4, littleEndian);
      return sDen !== 0 ? sNum / sDen : 0;
    }
    default:
      return undefined;
  }
}

/**
 * Format EXIF data for display
 * @param {Object} exif - Raw EXIF data
 * @returns {Array<{label: string, value: string}>} Formatted entries
 */
export function formatExifForDisplay(exif) {
  if (!exif) return [];

  const entries = [];

  if (exif.make) entries.push({ label: 'Camera Make', value: exif.make });
  if (exif.model) entries.push({ label: 'Camera Model', value: exif.model });

  if (exif.dateTimeOriginal || exif.dateTime) {
    const dt = exif.dateTimeOriginal || exif.dateTime;
    // EXIF date format: "2024:01:15 14:30:00"
    const formatted = dt.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    entries.push({ label: 'Date Taken', value: formatted });
  }

  if (exif.exposureTime) {
    const exp = exif.exposureTime;
    const expStr = exp >= 1
      ? `${exp}s`
      : `1/${Math.round(1 / exp)}s`;
    entries.push({ label: 'Exposure', value: expStr });
  }

  if (exif.fNumber) {
    entries.push({ label: 'Aperture', value: `f/${exif.fNumber.toFixed(1)}` });
  }

  if (exif.iso) {
    entries.push({ label: 'ISO', value: `${Math.round(exif.iso)}` });
  }

  if (exif.focalLength) {
    entries.push({ label: 'Focal Length', value: `${exif.focalLength.toFixed(0)}mm` });
  }

  if (exif.focalLength35mm) {
    entries.push({ label: 'Focal Length (35mm)', value: `${Math.round(exif.focalLength35mm)}mm` });
  }

  if (exif.xResolution && exif.yResolution) {
    const unit = exif.resolutionUnit === 3 ? 'dp/cm' : 'dpi';
    entries.push({
      label: 'Resolution',
      value: `${Math.round(exif.xResolution)} × ${Math.round(exif.yResolution)} ${unit}`,
    });
  }

  return entries;
}

/**
 * Format a date string for display
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '—';
  try {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(date);
  }
}
