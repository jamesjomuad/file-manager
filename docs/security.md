# Security Model

## Overview

BoardUI File Manager implements a defense-in-depth security model that protects against common filesystem attacks while maintaining usability. All operations are validated server-side, and the client never has direct access to the filesystem.

## Core Principles

1. **Never trust client input** — All paths validated server-side
2. **Root directory enforcement** — Operations restricted to configured root
3. **Fail closed** — Reject ambiguous or suspicious operations
4. **Least privilege** — Minimal permissions for each operation
5. **Defense in depth** — Multiple layers of validation

## Path Validation

### Root Directory

All file operations are restricted to a configurable root directory:

```javascript
const ROOT_DIR = path.resolve(process.env.FILE_MANAGER_ROOT || './data');
```

**Configuration:**
- Set via `FILE_MANAGER_ROOT` environment variable
- Can be absolute or relative to project root
- Stored in `.env.local` (gitignored)

**Example:**
```env
FILE_MANAGER_ROOT=/var/www/files
# or
FILE_MANAGER_ROOT=./data
```

### Path Traversal Prevention

Every user-provided path goes through `validatePath()`:

```javascript
async function validatePath(userPath) {
  // 1. Resolve to absolute path
  const absolutePath = path.resolve(ROOT_DIR, userPath);
  
  // 2. Check for path traversal
  const normalizedRoot = path.normalize(ROOT_DIR);
  if (!absolutePath.startsWith(normalizedRoot)) {
    const error = new Error('Path traversal detected');
    error.status = 403;
    throw error;
  }
  
  // 3. Check if path exists
  const stats = await fs.lstat(absolutePath);
  
  // 4. Check for symlink escapes
  if (stats.isSymbolicLink()) {
    const target = await fs.realpath(absolutePath);
    if (!target.startsWith(normalizedRoot)) {
      const error = new Error('Symlink escapes root directory');
      error.status = 403;
      throw error;
    }
  }
  
  return absolutePath;
}
```

**Attack Vectors Blocked:**
- `../../etc/passwd` — Absolute path escape
- `foo/../../bar` — Relative path escape
- `foo/./bar` — Path normalization tricks
- URL-encoded traversal (`%2e%2e%2f`)
- Unicode normalization attacks

### Symlink Protection

Symbolic links are validated to prevent escapes:

```javascript
if (stats.isSymbolicLink()) {
  const target = await fs.realpath(absolutePath);
  if (!target.startsWith(normalizedRoot)) {
    throw new Error('Symlink escapes root directory');
  }
}
```

**Why:** An attacker could create a symlink pointing outside the root:
```bash
ln -s /etc/passwd data/malicious-link
```

Without validation, reading `data/malicious-link` would expose `/etc/passwd`.

### Path Resolution

Paths are normalized to prevent tricks:

```javascript
const normalizedRoot = path.normalize(ROOT_DIR);
const absolutePath = path.resolve(ROOT_DIR, userPath);
```

**What `path.normalize()` does:**
- Resolves `.` (current directory)
- Resolves `..` (parent directory)
- Removes duplicate separators
- Converts `/` to `\` on Windows

**What `path.resolve()` does:**
- Converts relative path to absolute
- Resolves against root directory
- Handles both `/` and `\` separators

## Archive Security

### ZIP Slip Prevention

Archive extraction validates every entry path:

```javascript
function validateEntryPath(entryPath, destDir) {
  // 1. Reject absolute paths
  if (path.isAbsolute(entryPath)) {
    throw new Error('Absolute paths not allowed');
  }
  
  // 2. Reject paths with traversal
  if (entryPath.includes('..')) {
    throw new Error('Path traversal not allowed');
  }
  
  // 3. Resolve and validate
  const fullPath = path.resolve(destDir, entryPath);
  const normalizedDest = path.normalize(destDir);
  
  if (!fullPath.startsWith(normalizedDest)) {
    throw new Error('Entry escapes destination directory');
  }
  
  return fullPath;
}
```

**Attack Vector:**
Malicious ZIP with entry `../../../etc/passwd` would overwrite system files.

**Blocked:**
- Absolute paths (`/etc/passwd`)
- Relative traversal (`../../etc/passwd`)
- URL-encoded traversal (`%2e%2e%2f`)
- Unicode normalization tricks

### Executable Blocking

Dangerous file types are blocked during extraction:

```javascript
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.scr', '.msi', '.com'];

function isBlockedExecutable(filename) {
  const ext = path.extname(filename).toLowerCase();
  return BLOCKED_EXTENSIONS.includes(ext);
}
```

**Why:** Prevents accidental execution of malicious binaries extracted from archives.

**Blocked Extensions:**
- `.exe` — Windows executable
- `.bat` — Batch script
- `.cmd` — Command script
- `.scr` — Screensaver (often malware)
- `.msi` — Windows installer
- `.com` — DOS executable

**User Action Required:**
User must manually extract and approve executable files.

### Size Limits

Archives are validated against size limits:

```javascript
const LIMITS = {
  MAX_FILE_SIZE: 500 * 1024 * 1024,      // 500MB per file
  MAX_ARCHIVE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB per archive
  MAX_ENTRY_COUNT: 100000,                 // 100k entries
  MAX_DECOMPRESSION_RATIO: 100,            // 100x expansion
};
```

**Why:** Prevents:
- Denial of service (huge archives)
- Zip bombs (small archive, huge extraction)
- Resource exhaustion (too many entries)

**Zip Bomb Detection:**
```javascript
const ratio = uncompressedSize / compressedSize;
if (ratio > MAX_DECOMPRESSION_RATIO) {
  throw new Error('Suspicious decompression ratio');
}
```

### Entry Count Limits

Archives with too many entries are rejected:

```javascript
if (entries.length > MAX_ENTRY_COUNT) {
  throw new Error('Too many entries');
}
```

**Why:** Prevents resource exhaustion from archives with millions of entries.

## File Upload Security

### File Type Validation

Uploads are validated against allowed types:

```javascript
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'application/json',
  'application/zip',
];
```

**Why:** Prevents upload of executable files or other dangerous content.

### File Size Limits

Upload size is capped:

```javascript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
```

**Why:** Prevents:
- Denial of service (huge uploads)
- Disk space exhaustion
- Memory exhaustion during processing

### Filename Sanitization

Uploaded filenames are sanitized:

```javascript
function sanitizeFilename(filename) {
  // Remove path separators
  filename = filename.replace(/[/\\]/g, '_');
  
  // Remove control characters
  filename = filename.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Remove leading/trailing dots and spaces
  filename = filename.replace(/^[\.\s]+|[\.\s]+$/g, '');
  
  // Limit length
  if (filename.length > 255) {
    filename = filename.substring(0, 255);
  }
  
  return filename;
}
```

**Why:** Prevents:
- Path traversal via filename
- Hidden files (leading dots)
- Invalid characters
- Excessively long names

## API Security

### Server-Side Validation

All API routes validate input server-side:

```javascript
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    // Validate path server-side
    const validatedPath = await validatePath(filePath);
    
    // Read file
    const content = await fs.readFile(validatedPath, 'utf8');
    
    return Response.json({ success: true, data: content });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

**Why:** Client can be compromised; server is trusted.

### Error Handling

Errors don't leak sensitive information:

```javascript
catch (error) {
  // Log full error server-side
  console.error('File operation failed:', error);
  
  // Return generic message to client
  return Response.json(
    { success: false, error: 'Operation failed' },
    { status: 500 }
  );
}
```

**Why:** Prevents information disclosure (file paths, system details).

### Rate Limiting (Future)

API routes should implement rate limiting:

```javascript
// Future: Add rate limiting middleware
if (requestCount > MAX_REQUESTS_PER_MINUTE) {
  return Response.json(
    { success: false, error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

## Authentication & Authorization (Future)

### Current State
- Single-user application
- No authentication required
- All users have full access to root directory

### Planned Features
- User authentication (OAuth, JWT)
- Role-based access control (admin, editor, viewer)
- Per-directory permissions
- File-level access control
- Audit logging

### Implementation Plan
```javascript
// Middleware for authentication
async function authenticate(request) {
  const token = request.headers.get('Authorization');
  const user = await verifyToken(token);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

// Middleware for authorization
async function authorize(user, path, action) {
  const permissions = await getPermissions(user, path);
  
  if (!permissions.includes(action)) {
    throw new Error('Forbidden');
  }
}
```

## Security Best Practices

### For Developers

1. **Always validate paths** — Use `validatePath()` for every operation
2. **Never expose filesystem to client** — All operations via API routes
3. **Use parameterized queries** — Prevent injection attacks
4. **Sanitize all input** — Filenames, paths, content
5. **Log security events** — Track failed operations
6. **Keep dependencies updated** — `npm audit` regularly
7. **Test with malicious input** — Path traversal, zip bombs, etc.

### For Deployment

1. **Set restrictive FILE_MANAGER_ROOT** — Don't expose entire filesystem
2. **Use reverse proxy** — Nginx/Apache in front of Next.js
3. **Enable HTTPS** — Encrypt all traffic
4. **Set security headers** — CSP, X-Frame-Options, etc.
5. **Restrict file permissions** — Read-only where possible
6. **Monitor logs** — Watch for suspicious activity
7. **Regular backups** — Protect against data loss

### For Users

1. **Don't share root directory** — Keep files private
2. **Review uploaded files** — Check before opening
3. **Be cautious with archives** — Only extract trusted ZIPs
4. **Keep software updated** — Apply security patches
5. **Use strong passwords** — When authentication is added

## Security Testing

### Manual Testing Checklist

**Path Traversal:**
- [ ] Try `../../etc/passwd` in file operations
- [ ] Try URL-encoded traversal (`%2e%2e%2f`)
- [ ] Try Unicode normalization tricks

**Symlink Attacks:**
- [ ] Create symlink outside root
- [ ] Try to read/write via symlink
- [ ] Verify symlink validation works

**Archive Attacks:**
- [ ] Create ZIP with `../` entries
- [ ] Create ZIP bomb (high compression ratio)
- [ ] Create ZIP with executable files
- [ ] Verify all attacks blocked

**Upload Attacks:**
- [ ] Upload executable file
- [ ] Upload oversized file
- [ ] Upload file with malicious filename
- [ ] Verify validation works

**API Attacks:**
- [ ] Send malformed JSON
- [ ] Send missing required fields
- [ ] Send invalid paths
- [ ] Verify error handling

### Automated Testing

```javascript
describe('Security', () => {
  test('blocks path traversal', async () => {
    const response = await fetch('/api/files?path=../../etc/passwd');
    expect(response.status).toBe(403);
  });
  
  test('blocks symlink escape', async () => {
    await fs.symlink('/etc/passwd', 'data/malicious');
    const response = await fetch('/api/files?path=malicious');
    expect(response.status).toBe(403);
  });
  
  test('blocks ZIP Slip', async () => {
    const zip = createMaliciousZip(['../../../etc/passwd']);
    const response = await fetch('/api/files/archive/extract', {
      method: 'POST',
      body: JSON.stringify({ archivePath: zip.path })
    });
    expect(response.status).toBe(400);
  });
});
```

## Security Incidents

### Reporting
If you discover a security vulnerability:
1. **Don't open public issue** — Email security@yourdomain.com
2. **Include details** — Steps to reproduce, impact, potential fix
3. **Allow time to fix** — Don't disclose publicly until patched
4. **Credit** — You'll be credited in the security advisory

### Response Process
1. Acknowledge receipt within 48 hours
2. Investigate and confirm vulnerability
3. Develop and test fix
4. Release security patch
5. Publish security advisory
6. Credit reporter

## Compliance

### GDPR
- No personal data collected (single-user app)
- File operations logged locally (can be disabled)
- No data sent to third parties
- User controls all data

### OWASP Top 10
- **A01: Broken Access Control** — Path validation, root enforcement
- **A02: Cryptographic Failures** — HTTPS recommended, no sensitive data in transit
- **A03: Injection** — No SQL, no command injection vectors
- **A04: Insecure Design** — Defense in depth, fail closed
- **A05: Security Misconfiguration** — Documented configuration
- **A06: Vulnerable Components** — Regular dependency updates
- **A07: Authentication Failures** — Future: strong authentication
- **A08: Software and Data Integrity** — File validation, archive security
- **A09: Security Logging** — Future: audit logging
- **A10: Server-Side Request Forgery** — No external requests

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [ZIP Slip](https://snyk.io/research/zip-slip-vulnerability)
- [Zip Bombs](https://www.wikiwand.com/en/Zip_bomb)

---

**Last Updated:** November 2026
