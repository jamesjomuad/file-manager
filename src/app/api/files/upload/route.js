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
  // Documents
  'application/json',
  'application/xml',
  'application/rtf',
  // Archives
  'application/zip',
  'application/x-tar',
  'application/gzip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

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

  // Check file type
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw Object.assign(new Error(`File type not allowed: ${file.type}`), { status: 400 });
  }
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

        // Validate final path is within root
        const normalizedRoot = path.normalize(ROOT_DIR);
        if (!filePath.startsWith(normalizedRoot + path.sep) && filePath !== normalizedRoot) {
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
