import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ROOT_DIR } from '@/lib/filesystem/security';
import { getFileCategory } from '@/lib/filesystem/utils';

/**
 * GET /api/files/search?q=...&limit=50
 *
 * Recursively searches the filesystem for files matching the query.
 * Uses BFS with a depth limit and file count limit for performance.
 */

const MAX_RESULTS = 50;
const MAX_DEPTH = 10;
const MAX_DIRS_SCANNED = 500;
const HIDDEN_DIRS = new Set(['node_modules', '.git', '.next', '.trash', '.thumbnails', '__pycache__']);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), MAX_RESULTS);

    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = [];
    let dirsScanned = 0;

    // BFS search
    const queue = [{ dir: ROOT_DIR, relPath: '', depth: 0 }];

    while (queue.length > 0 && results.length < limit && dirsScanned < MAX_DIRS_SCANNED) {
      const { dir, relPath, depth } = queue.shift();
      dirsScanned++;

      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        continue; // Skip inaccessible directories
      }

      for (const entry of entries) {
        if (results.length >= limit) break;

        const name = entry.name;

        // Skip hidden files/dirs (starting with .) except dotfiles that match query
        if (name.startsWith('.') && HIDDEN_DIRS.has(name)) continue;

        const fullPath = path.join(dir, name);
        const entryRelPath = relPath ? path.join(relPath, name) : name;
        const isDir = entry.isDirectory();
        const isFile = entry.isFile();

        // Check if name matches
        const nameMatch = name.toLowerCase().includes(query);
        const pathMatch = entryRelPath.toLowerCase().includes(query);

        if (nameMatch || pathMatch) {
          try {
            const stats = await fs.stat(fullPath);
            results.push({
              name,
              path: entryRelPath,
              type: isDir ? 'directory' : 'file',
              size: stats.size,
              extension: isFile ? path.extname(name) : null,
              category: isFile ? getFileCategory(name) : null,
            });
          } catch {
            // Skip inaccessible
          }
        }

        // Enqueue subdirectories
        if (isDir && depth < MAX_DEPTH && !HIDDEN_DIRS.has(name)) {
          queue.push({ dir: fullPath, relPath: entryRelPath, depth: depth + 1 });
        }
      }
    }

    // Sort: exact filename matches first, then path matches, then alphabetical
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === query;
      const bExact = b.name.toLowerCase() === query;
      if (aExact !== bExact) return aExact ? -1 : 1;

      const aNameMatch = a.name.toLowerCase().includes(query);
      const bNameMatch = b.name.toLowerCase().includes(query);
      if (aNameMatch !== bNameMatch) return aNameMatch ? -1 : 1;

      // Directories first among equals
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;

      return a.path.localeCompare(b.path);
    });

    return NextResponse.json({ success: true, data: results.slice(0, limit) });
  } catch (error) {
    console.error('GET /api/files/search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
