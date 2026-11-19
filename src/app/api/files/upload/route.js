import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { validatePath, ROOT_DIR } from '@/lib/filesystem/security';
import { sanitizeFilename } from '@/lib/filesystem/utils';

/**
 * Maximum file size in bytes (default: 50MB)
 * @type {number}
 */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);

/**
 * Allowed MIME types for upload
 * @type {string[]}
 */
const ALLOWED_UPLOAD_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/avif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  // PDFs
  'application/pdf',
  // Text files
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/markdown',
  'text/csv',
  'text/xml',
  'text/tab-separated-values',
  // Documents
  'application/json',
  'application/xml',
  'application/rtf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-tar',
  'application/gzip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-bzip2',
  // Binary/Octet stream (allow for unknown types - validate by extension instead)
  'application/octet-stream',
  // Fonts
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  // Audio/Video
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/ogg',
];

/**
 * Allowed file extensions (lowercase, without dot)
 * Used as fallback when MIME type is unknown
 * @type {Set<string>}
 */
const ALLOWED_EXTENSIONS = new Set([
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf',
  // Text/Code
  'txt', 'md', 'json', 'xml', 'csv', 'tsv', 'html', 'css', 'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rb', 'php', 'swift', 'kt',
  'sh', 'bash', 'ps1', 'bat', 'cmd',
  // Archives
  'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
  // Audio/Video
  'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi', 'mov',
  // Fonts
  'ttf', 'otf', 'woff', 'woff2',
  // Config/Data
  'yml', 'yaml', 'toml', 'ini', 'cfg', 'log',
]);

/**
 * Get file extension from filename
 * @param {string} filename
 * @returns {string}
 */
function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Validate file type and size
 * @param {File} file - File object from FormData
 * @throws {Error} If validation fails
 */
function validateFile(file) {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`), { status: 413 });
  }

  // Check file type by MIME type or extension
  const mimeType = file.type;
  const extension = getExtension(file.name);
  
  // Allow if MIME type is in whitelist
  if (ALLOWED_UPLOAD_TYPES.includes(mimeType)) {
    return;
  }
  
  // Fallback: allow if extension is in whitelist (for unknown MIME types)
  if (extension && ALLOWED_EXTENSIONS.has(extension)) {
    return;
  }
  
  throw Object.assign(new Error(`File type not allowed: ${mimeType || 'unknown'} (${extension ? `.${extension}` : 'no extension'})`), { status: 400 });
}

/**
 * POST /api/files/upload - Upload one or more files
 * Accepts multipart/form-data with:
 *   - file: File object (can be multiple)
 *   - path: string (optional, destination directory relative to root)
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file');
    const destPath = formData.get('path') || '';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate destination path
    const { absolutePath: destDir } = await validatePath(destPath || '.');

    // Process each file
    const results = [];
    for (const file of files) {
      try {
        // Validate file
        validateFile(file);

        // Sanitize filename
        const sanitized = sanitizeFilename(file.name);
        const filePath = path.join(destDir, sanitized);

        // Validate final path is within root (handle drive roots like D:\)
        const normalizedRoot = path.normalize(ROOT_DIR);
        const resolvedFilePath = path.resolve(filePath);
        const rootPrefix = normalizedRoot.endsWith(path.sep) 
          ? normalizedRoot 
          : normalizedRoot + path.sep;
        
        if (!resolvedFilePath.startsWith(rootPrefix) && resolvedFilePath !== normalizedRoot) {
          throw Object.assign(new Error('Invalid file path'), { status: 403 });
        }

        // Convert File to Buffer and write
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);

        // Get file stats
        const stats = await fs.stat(filePath);

        results.push({
          success: true,
          name: sanitized,
          path: path.join(destPath || '', sanitized),
          size: stats.size,
          type: file.type,
          modifiedAt: stats.mtime.toISOString(),
        });
      } catch (error) {
        results.push({
          success: false,
          name: file.name,
          error: error.message,
          status: error.status || 500,
        });
      }
    }

    // Check if any files failed
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${failed.length} file(s) failed to upload`,
          results,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} file(s) uploaded successfully`,
      results,
    });
  } catch (error) {
    console.error('POST /api/files/upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
