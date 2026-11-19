# API Reference

## Overview

All API endpoints follow RESTful conventions and return JSON responses. The base URL is the application root (e.g., `http://localhost:3000`).

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (invalid input) |
| 403 | Forbidden (path traversal, permission denied) |
| 404 | Not found |
| 500 | Server error |

---

## File Operations

### List Directory

**`GET /api/files?path=<relativePath>`**

List contents of a directory.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | No | Relative path from root. Empty = root directory |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "documents",
      "path": "documents",
      "type": "directory",
      "size": 0,
      "extension": null,
      "createdAt": "2026-11-15T10:30:00.000Z",
      "modifiedAt": "2026-11-19T14:22:00.000Z",
      "isHidden": false
    },
    {
      "name": "readme.md",
      "path": "readme.md",
      "type": "file",
      "size": 2048,
      "extension": ".md",
      "createdAt": "2026-11-10T08:15:00.000Z",
      "modifiedAt": "2026-11-18T16:45:00.000Z",
      "isHidden": false
    }
  ]
}
```

**Notes:**
- System directories (`.trash`, `.thumbnails`) are hidden from results
- Results sorted by type (directories first), then by name
- Hidden files (starting with `.`) are included but flagged

---

### Read File

**`GET /api/files/<path>`**

Read file content.

**Parameters:**
Path is encoded in the URL: `/api/files/documents%2Freadme.md`

**Response (text file):**
```json
{
  "success": true,
  "data": {
    "content": "# Hello World\n\nThis is a markdown file.",
    "encoding": "utf8",
    "size": 42,
    "type": "text"
  }
}
```

**Response (binary file):**
```json
{
  "success": true,
  "data": {
    "content": "base64-encoded-data...",
    "encoding": "base64",
    "size": 102400,
    "type": "binary"
  }
}
```

**Notes:**
- Text files read as UTF-8 (up to 5MB limit)
- Binary files read as base64
- Images served via thumbnail API instead

---

### Create File/Folder

**`POST /api/files`**

Create a new file or directory.

**Body:**
```json
{
  "type": "file",
  "path": "documents/new-file.txt",
  "content": "Optional initial content"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `"file"` or `"directory"` |
| `path` | string | Yes | Relative path for new item |
| `content` | string | No | Initial content (files only) |

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "documents/new-file.txt",
    "type": "file"
  }
}
```

---

### Update File

**`PUT /api/files/<path>`**

Update file content or rename.

**Body (update content):**
```json
{
  "content": "Updated file content"
}
```

**Body (rename):**
```json
{
  "newPath": "documents/renamed-file.txt"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | No | New file content |
| `newPath` | string | No | New path (for rename) |

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "documents/renamed-file.txt",
    "updated": true
  }
}
```

**Notes:**
- Either `content` or `newPath` must be provided
- Rename validates both old and new paths

---

### Delete File/Folder

**`DELETE /api/files/<path>`**

Delete a file or directory (moves to trash).

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "documents/old-file.txt",
    "deleted": true,
    "trashPath": ".trash/documents/old-file.txt"
  }
}
```

**Notes:**
- Files are moved to `.trash/` directory (recoverable)
- Original path stored for restoration
- Use trash API for permanent deletion

---

### Upload Files

**`POST /api/files/upload`**

Upload one or more files via multipart form data.

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | File(s) to upload |
| `path` | string | No | Destination directory (relative) |

**Response:**
```json
{
  "success": true,
  "data": {
    "uploaded": [
      {
        "name": "photo.jpg",
        "path": "images/photo.jpg",
        "size": 102400
      }
    ],
    "count": 1
  }
}
```

**Notes:**
- Max file size: 50MB per file
- Allowed types: images, PDFs, text files, ZIP archives
- Filenames sanitized on upload
- Conflicting names get suffix (`photo (1).jpg`)

---

### Search Files

**`GET /api/files/search?query=<searchTerm>&path=<basePath>`**

Search for files by name.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search term |
| `path` | string | No | Base path to search from |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "search-results.md",
      "path": "documents/search-results.md",
      "type": "file",
      "size": 512,
      "extension": ".md",
      "modifiedAt": "2026-11-18T16:45:00.000Z"
    }
  ]
}
```

---

## Archive Operations

### List Archive Contents

**`GET /api/files/archive?path=<archivePath>`**

List entries in a ZIP archive.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Relative path to ZIP file |

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "archive.zip",
    "path": "archive.zip",
    "size": 102400,
    "compressedSize": 51200,
    "ratio": 0.5,
    "entries": [
      {
        "name": "documents",
        "path": "documents/",
        "type": "directory",
        "size": 0,
        "compressedSize": 0,
        "modifiedAt": "2026-11-15T10:30:00.000Z"
      },
      {
        "name": "readme.md",
        "path": "documents/readme.md",
        "type": "file",
        "size": 2048,
        "compressedSize": 800,
        "modifiedAt": "2026-11-10T08:15:00.000Z"
      }
    ]
  }
}
```

---

### Read Archive Entry

**`GET /api/files/archive?path=<archivePath>&entry=<entryPath>`**

Read a specific entry from a ZIP archive.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Relative path to ZIP file |
| `entry` | string | Yes | Path within the archive |

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "# Hello World\n...",
    "encoding": "utf8",
    "size": 2048,
    "compressedSize": 800,
    "type": "text"
  }
}
```

---

### Create Archive

**`POST /api/files/archive/compress`**

Create a ZIP archive from files/folders.

**Body:**
```json
{
  "outputPath": "archives/backup.zip",
  "items": [
    "documents/report.pdf",
    "images/photos"
  ],
  "compressionLevel": 6,
  "includeHidden": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `outputPath` | string | Yes | Destination path for ZIP file |
| `items` | string[] | Yes | Array of file/folder paths to compress |
| `compressionLevel` | number | No | 0 (store), 1 (fast), 6 (normal), 9 (max). Default: 6 |
| `includeHidden` | boolean | No | Include hidden files. Default: false |

**Response:**
```json
{
  "success": true,
  "data": {
    "outputPath": "archives/backup.zip",
    "originalSize": 10485760,
    "compressedSize": 5242880,
    "ratio": 0.5,
    "fileCount": 42,
    "folderCount": 3
  }
}
```

---

### Extract Archive

**`POST /api/files/archive/extract`**

Extract a ZIP archive.

**Body:**
```json
{
  "archivePath": "archives/backup.zip",
  "destPath": "extracted",
  "entries": ["documents/report.pdf"],
  "conflictStrategy": "rename",
  "preserveStructure": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `archivePath` | string | Yes | Path to ZIP file |
| `destPath` | string | Yes | Destination directory |
| `entries` | string[] | No | Specific entries to extract (all if omitted) |
| `conflictStrategy` | string | No | `skip`, `replace`, `rename`, `keepBoth`. Default: `skip` |
| `preserveStructure` | boolean | No | Keep folder structure. Default: true |

**Response:**
```json
{
  "success": true,
  "data": {
    "extracted": 42,
    "skipped": 3,
    "errors": []
  }
}
```

**Conflict Strategies:**
| Strategy | Behavior |
|----------|----------|
| `skip` | Don't overwrite existing files |
| `replace` | Overwrite existing files |
| `rename` | Add suffix to avoid conflicts (`file (1).txt`) |
| `keepBoth` | Create copy with unique name |

---

## Thumbnail Operations

### Get Thumbnail

**`GET /api/thumbnails/<path>?size=<size>`**

Get or generate a thumbnail for an image file.

**Parameters:**
Path is encoded in the URL: `/api/thumbnails/images%2Fphoto.jpg`

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `size` | string | No | `small` (64px), `medium` (128px), `large` (256px). Default: `medium` |

**Response:** Image data (JPEG format)
- Content-Type: `image/jpeg`
- Cached to `.thumbnails/` directory

---

## Trash Operations

### List Trash

**`GET /api/trash`**

List all items in trash.

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "name": "old-file.txt",
        "path": ".trash/documents/old-file.txt",
        "originalPath": "documents/old-file.txt",
        "type": "file",
        "size": 1024,
        "deletedAt": "2026-11-19T14:22:00.000Z"
      }
    ],
    "count": 1,
    "totalSize": 1024
  }
}
```

---

### Restore from Trash

**`POST /api/trash/restore`**

Restore a file from trash to its original location.

**Body:**
```json
{
  "path": ".trash/documents/old-file.txt"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Trash path of item to restore |

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "documents/old-file.txt",
    "restored": true
  }
}
```

---

### Permanent Delete

**`DELETE /api/trash/<path>`**

Permanently delete a file from trash.

**Response:**
```json
{
  "success": true,
  "data": {
    "path": ".trash/documents/old-file.txt",
    "deleted": true
  }
}
```

---

### Empty Trash

**`DELETE /api/trash/empty`**

Permanently delete all items in trash.

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 5,
    "freedSpace": 10485760
  }
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Common Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Invalid request body` | Missing required fields |
| 400 | `File too large` | Upload exceeds 50MB limit |
| 400 | `Invalid file type` | Upload type not allowed |
| 403 | `Path traversal detected` | Path escapes root directory |
| 403 | `Symlink escapes root directory` | Symlink points outside root |
| 403 | `Entry escapes destination directory` | ZIP Slip detected |
| 404 | `Path does not exist` | File/folder not found |
| 500 | `Operation failed` | Unexpected server error |

---

## Rate Limits (Future)

API endpoints may be rate-limited in the future:

| Endpoint | Limit |
|----------|-------|
| File operations | 100 requests/minute |
| Upload | 20 requests/minute |
| Archive operations | 10 requests/minute |
| Search | 60 requests/minute |

---

## Authentication (Future)

API endpoints will require authentication in future versions:

```
Authorization: Bearer <token>
```

---

## Examples

### Complete File Workflow

```bash
# 1. List root directory
curl http://localhost:3000/api/files

# 2. Create a new file
curl -X POST http://localhost:3000/api/files \
  -H "Content-Type: application/json" \
  -d '{"type": "file", "path": "hello.txt", "content": "Hello World"}'

# 3. Read the file
curl http://localhost:3000/api/files/hello.txt

# 4. Update the file
curl -X PUT http://localhost:3000/api/files/hello.txt \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello Updated World"}'

# 5. Delete the file (moves to trash)
curl -X DELETE http://localhost:3000/api/files/hello.txt

# 6. List trash
curl http://localhost:3000/api/trash

# 7. Restore from trash
curl -X POST http://localhost:3000/api/trash/restore \
  -H "Content-Type: application/json" \
  -d '{"path": ".trash/hello.txt"}'
```

### Archive Workflow

```bash
# 1. Create archive from files
curl -X POST http://localhost:3000/api/files/archive/compress \
  -H "Content-Type: application/json" \
  -d '{
    "outputPath": "backup.zip",
    "items": ["documents", "images"],
    "compressionLevel": 6
  }'

# 2. Browse archive contents
curl "http://localhost:3000/api/files/archive?path=backup.zip"

# 3. Read specific entry
curl "http://localhost:3000/api/files/archive?path=backup.zip&entry=documents/readme.md"

# 4. Extract archive
curl -X POST http://localhost:3000/api/files/archive/extract \
  -H "Content-Type: application/json" \
  -d '{
    "archivePath": "backup.zip",
    "destPath": "restored",
    "conflictStrategy": "rename"
  }'
```

---

**Last Updated:** November 2026
