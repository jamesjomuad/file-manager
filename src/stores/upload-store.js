import { create } from 'zustand';

/**
 * @typedef {Object} UploadItem
 * @property {string} id - Unique identifier
 * @property {string} filename - File name
 * @property {number} size - File size in bytes
 * @property {number} progress - Upload progress (0-100)
 * @property {'pending'|'uploading'|'complete'|'error'|'conflict'} status - Upload status
 * @property {string} [error] - Error message if failed
 * @property {'skip'|'replace'|'rename'} [conflictAction] - Resolution for conflicts
 */

/**
 * Upload store for managing file upload queue state.
 * Stores metadata only, not File objects (kept in component state).
 */
export const useUploadStore = create((set, get) => ({
  /**
   * Upload queue
   * @type {UploadItem[]}
   */
  uploadQueue: [],

  /**
   * Add files to upload queue
   * @param {Array<{id: string, filename: string, size: number}>} files
   */
  addFiles: (files) =>
    set((state) => ({
      uploadQueue: [
        ...state.uploadQueue,
        ...files.map((file) => ({
          id: file.id,
          filename: file.filename,
          size: file.size,
          progress: 0,
          status: 'pending',
        })),
      ],
    })),

  /**
   * Update upload progress for a file
   * @param {string} id - File ID
   * @param {number} progress - Progress percentage (0-100)
   */
  updateProgress: (id, progress) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.map((item) =>
        item.id === id ? { ...item, progress, status: 'uploading' } : item
      ),
    })),

  /**
   * Set upload status for a file
   * @param {string} id - File ID
   * @param {'pending'|'uploading'|'complete'|'error'|'conflict'} status
   * @param {string} [error] - Error message
   */
  setStatus: (id, status, error) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.map((item) =>
        item.id === id
          ? { ...item, status, error: error || item.error, progress: status === 'complete' ? 100 : item.progress }
          : item
      ),
    })),

  /**
   * Set conflict resolution action for a file
   * @param {string} id - File ID
   * @param {'skip'|'replace'|'rename'} action
   */
  setConflictAction: (id, action) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.map((item) =>
        item.id === id ? { ...item, conflictAction: action, status: 'pending' } : item
      ),
    })),

  /**
   * Remove a file from the queue
   * @param {string} id - File ID
   */
  removeFile: (id) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.filter((item) => item.id !== id),
    })),

  /**
   * Clear all completed, error, or skipped files from queue
   */
  clearCompleted: () =>
    set((state) => ({
      uploadQueue: state.uploadQueue.filter(
        (item) => item.status === 'pending' || item.status === 'uploading'
      ),
    })),

  /**
   * Clear entire queue
   */
  clearQueue: () => set({ uploadQueue: [] }),

  /**
   * Get queue statistics
   * @returns {{total: number, pending: number, uploading: number, complete: number, error: number, conflict: number}}
   */
  getStats: () => {
    const queue = get().uploadQueue;
    return {
      total: queue.length,
      pending: queue.filter((i) => i.status === 'pending').length,
      uploading: queue.filter((i) => i.status === 'uploading').length,
      complete: queue.filter((i) => i.status === 'complete').length,
      error: queue.filter((i) => i.status === 'error').length,
      conflict: queue.filter((i) => i.status === 'conflict').length,
    };
  },
}));
