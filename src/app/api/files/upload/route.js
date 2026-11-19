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
 * Validate file size
 * @param {File} file - File object from FormData
 * @throws {Error} If validation fails
 */
function validateFile(file) {
  // Check file size only - all file types are allowed
  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`), { status: 413 });
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
