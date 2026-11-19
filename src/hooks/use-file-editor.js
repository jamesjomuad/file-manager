import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * @typedef {Object} UseFileEditorReturn
 * @property {string} content - Current editor content
 * @property {string} originalContent - Last saved content (from server)
 * @property {boolean} hasUnsavedChanges - Whether content differs from original
 * @property {boolean} isLoading - Whether file is loading
 * @property {boolean} isSaving - Whether file is being saved
 * @property {string|null} error - Error message if any
 * @property {Object|null} fileData - File metadata (name, path, size, etc.)
 * @property {function(string): void} setContent - Update editor content
 * @property {function(): Promise<void>} save - Save content to API
 * @property {function(): void} discard - Revert to original content
 * @property {function(string): Promise<void>} loadFile - Load a file from API
 * @property {function(string|null): void} setError - Set error state
 */

/**
 * Custom hook for managing file editor state.
 *
 * Handles:
 * - Loading file content from API
 * - Tracking unsaved changes
 * - Saving content to API
 * - Discarding changes (reverting to original)
 * - Error handling
 *
 * @param {string|null} filePath - Path of file to load (relative to root)
 * @returns {UseFileEditorReturn} Editor state and methods
 *
 * @example
 * const {
 *   content,
 *   hasUnsavedChanges,
 *   setContent,
 *   save,
 *   discard,
 *   isLoading,
 *   error
 * } = useFileEditor('src/components/Button.jsx');
 */
export function useFileEditor(filePath) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fileData, setFileData] = useState(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Load file content from API
   */
  const loadFile = useCallback(async (path) => {
    if (!path) {
      setFileData(null);
      setContent('');
      setOriginalContent('');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/files/${path}?action=read`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load file');
      }

      if (!isMountedRef.current) return;

      const fileContent = data.data.content || '';
      const fileName = data.data.path.split('/').pop();

      setFileData({
        name: fileName,
        path: data.data.path,
        size: data.data.size,
        type: data.data.type,
        modified: data.data.modified,
        created: data.data.created,
      });
      setContent(fileContent);
      setOriginalContent(fileContent);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to load file:', err);
      setError(err.message || 'Failed to load file');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Save current content to API
   */
  const save = useCallback(async () => {
    if (!filePath) {
      setError('No file path provided');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/files/${filePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save file');
      }

      if (!isMountedRef.current) return;

      // Update original content to reflect saved state
      setOriginalContent(content);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to save file:', err);
      setError(err.message || 'Failed to save file');
      throw err; // Re-throw so caller can handle
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [filePath, content]);

  /**
   * Discard changes and revert to original content
   */
  const discard = useCallback(() => {
    setContent(originalContent);
    setError(null);
  }, [originalContent]);

  /**
   * Update content and mark as dirty
   */
  const updateContent = useCallback((newContent) => {
    setContent(newContent);
  }, []);

  /**
   * Load file when filePath changes
   */
  useEffect(() => {
    loadFile(filePath);
  }, [filePath, loadFile]);

  /**
   * Compute whether content has unsaved changes
   */
  const hasUnsavedChanges = content !== originalContent;

  return {
    content,
    originalContent,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    error,
    fileData,
    setContent: updateContent,
    save,
    discard,
    loadFile,
    setError,
  };
}
