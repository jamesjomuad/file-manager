# Add BoardUI File Upload to the File Manager

Integrate the official BoardUI File Upload component into the existing standalone File Manager.

Reference:
https://www.boardui.com/components/file-upload

## Objective
Provide a polished drag-and-drop file upload experience that integrates naturally with the File Explorer.

## Features

1. Drag-and-drop files directly into the current Explorer directory.
2. Click the upload area to open the native file picker.
3. Support multiple file selection.
4. Display an upload queue with:
   - Filename
   - File size
   - Upload progress
   - Upload status
5. Support canceling uploads where technically possible.
6. Display clear success and failure feedback.
7. Handle duplicate filenames with explicit Skip, Replace, and Rename options.
8. Refresh the current directory listing after successful uploads without resetting its navigation state.
9. Preserve existing workspace tabs and selections where possible.

## Integration

- Use the official BoardUI File Upload component as the UI foundation.
- Follow the existing BoardUI design conventions and application theme.
- Use Zustand only for upload state that needs to be shared across components.
- Keep temporary upload form state local where appropriate.
- Do not place file binary data in Zustand.
- Integrate with the existing Next.js server-side filesystem services.
- Upload files only into the currently selected directory.
- Keep uploads independent of React Router navigation and workspace tab state.

## Security and reliability

- Validate the destination against the configured filesystem root.
- Do not trust frontend-supplied paths or filenames.
- Prevent path traversal and unauthorized overwrites.
- Enforce configurable file-size limits.
- Handle interrupted uploads and network/server errors.
- Avoid loading entire files into memory unnecessarily.
- Do not overwrite existing files without explicit user confirmation.

## Implementation process

1. Inspect the linked BoardUI component documentation and existing project dependencies.
2. Inspect the current filesystem API and directory refresh mechanism.
3. Verify the component's compatibility with the existing Next.js, React, and BoardUI versions.
4. Implement using existing conventions and avoid unnecessary dependencies.
5. Keep JavaScript and JSX only.
6. Run lint, relevant tests, and production build.

Do not redesign the Explorer or introduce unrelated upload features.