'use client';

import { useState } from 'react';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import {
  RiFileLine,
  RiSkipDownLine,
  RiRefreshLine,
  RiEditLine,
} from '@remixicon/react';

/**
 * Format file size for display
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Dialog for resolving filename conflicts during upload.
 * Shows list of conflicting files and allows user to choose resolution strategy.
 *
 * @param {Object} props
 * @param {boolean} props.open - Dialog visibility
 * @param {Array<{name: string, size: number}>} props.conflicts - Conflicting files
 * @param {(resolutions: Map<string, 'skip'|'replace'|'rename'>) => void} props.onResolve - Callback with resolutions (keyed by filename)
 * @param {() => void} props.onCancel - Cancel callback
 */
export function ConflictDialog({ open, conflicts, onResolve, onCancel }) {
  // Initialize all files to 'skip' by default
  const [resolutions, setResolutions] = useState(() => {
    const map = new Map();
    conflicts.forEach((file) => map.set(file.name, 'skip'));
    return map;
  });

  const [globalAction, setGlobalAction] = useState('skip');

  // Reset resolutions when conflicts change
  useState(() => {
    const map = new Map();
    conflicts.forEach((file) => map.set(file.name, 'skip'));
    setResolutions(map);
    setGlobalAction('skip');
  });

  if (!open || conflicts.length === 0) return null;

  const handleApplyToAll = (action) => {
    setGlobalAction(action);
    const newResolutions = new Map();
    conflicts.forEach((file) => newResolutions.set(file.name, action));
    setResolutions(newResolutions);
  };

  const handleIndividualChange = (fileName, action) => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(fileName, action);
      return next;
    });
  };

  const handleResolve = () => {
    onResolve(resolutions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-background-primary-default p-6 shadow-lg">
        <h2 className="text-title-2-semibold text-text-primary mb-4">
          Resolve Filename Conflicts
        </h2>

        <p className="text-body-regular text-text-secondary mb-6">
          {conflicts.length} file{conflicts.length !== 1 ? 's' : ''} already exist in this
          directory. Choose how to handle each file.
        </p>

        {/* Global actions */}
        <div className="flex gap-2 mb-4 p-3 rounded-lg bg-background-secondary-default">
          <Button
            variant={globalAction === 'skip' ? 'primary' : 'secondary'}
            onClick={() => handleApplyToAll('skip')}
            leadingIcon={RiSkipDownLine}
            className="flex-1"
          >
            Skip All
          </Button>
          <Button
            variant={globalAction === 'replace' ? 'primary' : 'secondary'}
            onClick={() => handleApplyToAll('replace')}
            leadingIcon={RiRefreshLine}
            className="flex-1"
          >
            Replace All
          </Button>
          <Button
            variant={globalAction === 'rename' ? 'primary' : 'secondary'}
            onClick={() => handleApplyToAll('rename')}
            leadingIcon={RiEditLine}
            className="flex-1"
          >
            Rename All
          </Button>
        </div>

        {/* File list */}
        <div className="max-h-96 overflow-y-auto mb-6 space-y-2">
          {conflicts.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-3 rounded-lg border border-border-button-default bg-background-primary-default"
            >
              <RiFileLine className="size-5 text-foreground-icon-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-body-medium text-text-primary truncate">
                  {file.name}
                </p>
                <p className="text-caption-1-regular text-text-tertiary">
                  {formatSize(file.size)}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleIndividualChange(file.name, 'skip')}
                  className={cx(
                    'px-3 py-1 rounded text-caption-1-medium transition-colors',
                    resolutions.get(file.name) === 'skip'
                      ? 'bg-background-primary-hover text-text-primary'
                      : 'text-text-secondary hover:bg-background-secondary-default'
                  )}
                >
                  Skip
                </button>
                <button
                  onClick={() => handleIndividualChange(file.name, 'replace')}
                  className={cx(
                    'px-3 py-1 rounded text-caption-1-medium transition-colors',
                    resolutions.get(file.name) === 'replace'
                      ? 'bg-background-primary-hover text-text-primary'
                      : 'text-text-secondary hover:bg-background-secondary-default'
                  )}
                >
                  Replace
                </button>
                <button
                  onClick={() => handleIndividualChange(file.name, 'rename')}
                  className={cx(
                    'px-3 py-1 rounded text-caption-1-medium transition-colors',
                    resolutions.get(file.name) === 'rename'
                      ? 'bg-background-primary-hover text-text-primary'
                      : 'text-text-secondary hover:bg-background-secondary-default'
                  )}
                >
                  Rename
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleResolve}>
            Continue Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
