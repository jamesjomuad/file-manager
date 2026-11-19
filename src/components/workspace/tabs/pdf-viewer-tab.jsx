'use client';

import { memo } from 'react';
import { PdfViewer } from '@/components/pdf/pdf-viewer';

/**
 * PDF viewer tab — full-featured PDF document viewer
 *
 * Uses react-pdf (PDF.js) with page navigation, zoom, rotation,
 * search, fullscreen, download, and print capabilities.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export const PdfViewerTabContent = memo(function PdfViewerTabContent({ tab }) {
  const pdfUrl = `/api/files/${tab.path}?action=download`;

  return (
    <PdfViewer
      fileUrl={pdfUrl}
      fileName={tab.title}
      embedded={true}
    />
  );
});
