'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { cx } from '@/utils/cx';
import { useUploadStore } from '@/stores/upload-store';
import { ConflictDialog } from './conflict-dialog';
import { toast } from '@/components/base/toast/toast';
import {
  RiUploadCloud2Line,
} from '@remixicon/react';

/**
 * Generate unique ID for upload items
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get file extension without dot, lowercased
 * @param {string} filename
 * @returns {string}
 */
function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Format file size for display
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Default max file size: 2GB
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;

/**
 * File upload zone component with drag-and-drop support.
 * Multi-file upload with conflict detection and resolution.
 *
 * @param {Object} props
 * @param {string} props.currentPath - Current directory path for uploads
 * @param {() => void} props.onUploadComplete - Callback when uploads complete (refreshes explorer)
 * @param {string[]} [props.allowedExtensions] - Accepted file extensions (without dots)
 * @param {number} [props.maxBytes] - Max file size in bytes
 * @param {string} [props.className] - Additional CSS classes
 */
export function UploadZone({
  currentPath,
  onUploadComplete,
  allowedExtensions,
  maxBytes = DEFAULT_MAX_BYTES,
  className,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejection, setRejection] = useState(null);

  // Conflict state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictFiles, setConflictFiles] = useState([]); // {name, size} for dialog display
  const [pendingUpload, setPendingUpload] = useState(null); // {allFiles: File[], conflictNames: string[], clearFiles: File[]}

  const { addFiles, updateProgress, setStatus } = useUploadStore();

  // Keep refs for latest values in async callbacks
  const currentPathRef = useRef(currentPath);
  const onUploadCompleteRef = useRef(onUploadComplete);

  useEffect(() => {
    currentPathRef.current = currentPath;
    onUploadCompleteRef.current = onUploadComplete;
  }, [currentPath, onUploadComplete]);

  // Clear rejection message after delay
  useEffect(() => {
    if (rejection) {
      const timer = setTimeout(() => setRejection(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [rejection]);

  /**
   * Validate file against extension and size constraints
   * @param {File} file
   * @returns {string|null} Error message or null if valid
   */
  const validateFile = useCallback(
    (file) => {
      if (allowedExtensions) {
        const ext = getExtension(file.name);
        const normalized = allowedExtensions.map((e) => e.toLowerCase().replace(/^\./, ''));
        if (!normalized.includes(ext)) {
          return `Only ${normalized.map((e) => e.toUpperCase()).join(', ')} files are supported`;
        }
      }
      if (file.size > maxBytes) {
        return `${file.name} is larger than ${formatFileSize(maxBytes)}`;
      }
      return null;
    },
    [allowedExtensions, maxBytes]
  );

  /**
   * Upload a single file using XHR for progress tracking
   * @param {File} file - File to upload
   * @param {string} uploadId - Upload item ID in store
   * @param {string} [overrideName] - Override filename (for rename)
   * @returns {Promise<void>}
   */
  const uploadSingleFile = useCallback(
    (file, uploadId, overrideName) => {
      return new Promise((resolve) => {
        const formData = new FormData();
        const uploadFile = overrideName
          ? new File([file], overrideName, { type: file.type })
          : file;
        formData.append('file', uploadFile);
        formData.append('path', currentPathRef.current);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            updateProgress(uploadId, percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setStatus(uploadId, 'complete');
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              setStatus(uploadId, 'error', response.error || 'Upload failed');
            } catch {
              setStatus(uploadId, 'error', `Upload failed (HTTP ${xhr.status})`);
            }
          }
          resolve();
        });

        xhr.addEventListener('error', () => {
          setStatus(uploadId, 'error', 'Network error');
          resolve();
        });

        xhr.addEventListener('abort', () => {
          setStatus(uploadId, 'error', 'Upload canceled');
          resolve();
        });

        xhr.open('POST', '/api/files/upload');
        xhr.send(formData);
      });
    },
    [updateProgress, setStatus]
  );

  /**
   * Process upload items: add to store, upload each sequentially
   * @param {Array<{file: File, id: string, action: 'skip'|'replace'|'rename'}>} items
   */
  const processUploads = useCallback(
    async (items) => {
      // Add all to upload store first
      addFiles(items.map(({ id, file }) => ({ id, filename: file.name, size: file.size })));

      // Upload sequentially
      for (const item of items) {
        if (item.action === 'skip') {
          setStatus(item.id, 'complete');
          continue;
        }

        let overrideName = null;
        if (item.action === 'rename') {
          const ext = getExtension(item.file.name);
          const baseName = ext
            ? item.file.name.slice(0, item.file.name.length - ext.length - 1)
            : item.file.name;
          overrideName = `${baseName}_${Date.now()}${ext ? `.${ext}` : ''}`;
        }

        await uploadSingleFile(item.file, item.id, overrideName);
      }

      // Notify parent to refresh explorer
      onUploadCompleteRef.current?.();
    },
    [addFiles, setStatus, uploadSingleFile]
  );

  /**
   * Check which files already exist in the destination directory
   * @param {File[]} filesToCheck
   * @returns {Promise<{conflicts: File[], clear: File[]}>}
   */
  const checkConflicts = useCallback(async (filesToCheck) => {
    const results = await Promise.allSettled(
      filesToCheck.map(async (file) => {
        const filePath = currentPathRef.current
          ? `${currentPathRef.current}/${file.name}`
          : file.name;
        try {
          const response = await fetch(`/api/files/${encodeURIComponent(filePath)}`);
          return { file, exists: response.ok };
        } catch {
          return { file, exists: false };
        }
      })
    );

    const conflicts = [];
    const clear = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value.exists) {
        conflicts.push(filesToCheck[i]);
      } else {
        clear.push(filesToCheck[i]);
      }
    }
    return { conflicts, clear };
  }, []);

  /**
   * Handle file selection (from input or drag-drop)
   * @param {FileList|File[]} selectedFiles
   */
  const handleFiles = useCallback(
    async (selectedFiles) => {
      const fileArray = Array.from(selectedFiles);
      const validFiles = [];
      const errors = [];

      // Validate each file
      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        setRejection(errors[0]);
        // Show toast notification for validation errors
        toast.error('Upload failed', {
          description: errors[0],
        });
        return;
      }

      if (validFiles.length === 0) return;

      // Check for conflicts
      const { conflicts, clear } = await checkConflicts(validFiles);

      if (conflicts.length > 0) {
        // Store conflict data and show dialog
        setConflictFiles(conflicts.map((f) => ({ name: f.name, size: f.size })));
        setPendingUpload({
          conflictFiles: conflicts,
          clearFiles: clear,
        });
        setShowConflictDialog(true);
      } else {
        // No conflicts — upload immediately
        const items = validFiles.map((file) => ({
          file,
          id: generateId(),
          action: 'replace',
        }));
        await processUploads(items);
      }
    },
    [validateFile, checkConflicts, processUploads]
  );

  /**
   * Handle conflict resolution from dialog
   * @param {Map<string, 'skip'|'replace'|'rename'>} resolutions - filename → action
   */
  const handleConflictResolution = useCallback(
    async (resolutions) => {
      setShowConflictDialog(false);

      if (!pendingUpload) return;

      const items = [];

      // Map conflicting files to their resolutions
      for (const file of pendingUpload.conflictFiles) {
        const action = resolutions.get(file.name) || 'replace';
        items.push({ file, id: generateId(), action });
      }

      // Clear files always upload
      for (const file of pendingUpload.clearFiles) {
        items.push({ file, id: generateId(), action: 'replace' });
      }

      setPendingUpload(null);
      setConflictFiles([]);

      await processUploads(items);
    },
    [pendingUpload, processUploads]
  );

  /**
   * Cancel conflict dialog
   */
  const handleConflictCancel = useCallback(() => {
    setShowConflictDialog(false);
    setPendingUpload(null);
    setConflictFiles([]);
  }, []);

  // Drag handlers
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleInputChange = (event) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    event.target.value = '';
  };

  const allowedLabel = allowedExtensions
    ? allowedExtensions
        .filter((ext) => ext.toLowerCase().replace(/^\./, '') !== 'jpeg')
        .map((ext) => ext.toUpperCase().replace(/^\./, ''))
        .join(', ')
    : 'All files';

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cx(
          'group relative rounded-2xl outline-none transition-colors duration-300 ease-out',
          'cursor-pointer bg-background-secondary-default hover:bg-background-secondary-hover',
          'focus-visible:ring-2 focus-visible:ring-border-focus-ring',
          dragOver && 'bg-background-primary-default',
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          aria-label="Choose files to upload"
          accept={allowedExtensions
            ? allowedExtensions.map((ext) => `.${ext.toLowerCase().replace(/^\./, '')}`).join(',')
            : undefined}
          className="sr-only"
          tabIndex={-1}
          onChange={handleInputChange}
        />

        {/* Dashed border */}
        <div
          aria-hidden
          className={cx(
            'pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed',
            dragOver
              ? 'border-border-button-active'
              : 'border-border-checkbox-default group-hover:border-border-button-active',
            'transition-[opacity,border-color] duration-300 ease-out'
          )}
        />

        {/* Content */}
        <div className="flex flex-col items-center justify-center gap-3.5 p-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-file-upload-icon-background p-3">
            <RiUploadCloud2Line
              className="size-6 shrink-0 text-file-upload-icon-foreground transition-colors duration-150 ease group-hover:text-file-upload-icon-foreground-hover"
              aria-hidden
            />
          </span>
          <div className="flex flex-col items-center gap-2 text-center">
            <p
              className={cx(
                'text-body-medium',
                rejection ? 'text-text-error-primary' : 'text-text-secondary'
              )}
            >
              {rejection ?? (
                <>
                  Drag and drop files here or <span className="text-accent-500">browse</span>
                </>
              )}
            </p>
            <p className="text-body-2-regular text-text-tertiary">
              {allowedLabel} (max {formatFileSize(maxBytes)})
            </p>
          </div>
        </div>
      </div>

      {/* Conflict resolution dialog */}
      <ConflictDialog
        open={showConflictDialog}
        conflicts={conflictFiles}
        onResolve={handleConflictResolution}
        onCancel={handleConflictCancel}
      />
    </>
  );
}
