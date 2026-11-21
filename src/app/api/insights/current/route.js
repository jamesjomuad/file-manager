import { NextResponse } from 'next/server';
import { ROOT_DIR, validatePath } from '@/lib/filesystem/security';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/insights/current
 * 
 * Returns lightweight stats for the current directory (or root if not specified).
 * Query params:
 *   - path: Relative path to directory (optional, defaults to root)
 * 
 * This is instant - no full scan, just reads the immediate directory.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const relativePath = searchParams.get('path') || '';

  try {
    const { absolutePath: targetPath } = await validatePath(relativePath);
    
    // Read directory contents
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    let fileCount = 0;
    let folderCount = 0;
    let totalSize = 0;
    const fileTypes = new Map();

    for (const entry of entries) {
      if (entry.isFile()) {
        fileCount++;
        
        // Get file size and type
        try {
          const stats = await fs.stat(path.join(targetPath, entry.name));
          totalSize += stats.size;
          
          // Categorize by extension
          const ext = path.extname(entry.name).toLowerCase();
          const category = categorizeExtension(ext);
          fileTypes.set(category, (fileTypes.get(category) || 0) + 1);
        } catch {
          // Skip files we can't stat
        }
      } else if (entry.isDirectory()) {
        folderCount++;
      }
    }

    // Convert fileTypes map to object
    const typeDistribution = {};
    for (const [category, count] of fileTypes.entries()) {
      typeDistribution[category] = count;
    }

    return NextResponse.json({
      success: true,
      data: {
        path: relativePath || '/',
        fileCount,
        folderCount,
        totalSize,
        typeDistribution,
      },
    });
  } catch (error) {
    console.error('Error fetching current directory stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

/**
 * Categorize file by extension (simplified version of scanner's categorizeFile).
 * @param {string} ext - File extension (with dot)
 * @returns {string} Category name
 */
function categorizeExtension(ext) {
  const categories = {
    documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.md', '.tex', '.pages'],
    images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif'],
    videos: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'],
    audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
    archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz'],
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.html', '.css', '.scss', '.less', '.json', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bash', '.ps1'],
    spreadsheets: ['.xls', '.xlsx', '.csv', '.ods', '.numbers'],
    executables: ['.exe', '.msi', '.app', '.dmg', '.deb', '.rpm', '.apk', '.ipa'],
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  return 'other';
}
