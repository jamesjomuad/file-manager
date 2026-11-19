'use client';

import { memo } from 'react';

/**
 * PDF viewer tab — displays PDF files in a browser PDF viewer
 *
 * Uses an iframe pointed at the file API's download endpoint.
 * Browsers with built-in PDF viewers (Chrome, Edge, Firefox) will
 * render the PDF natively with zoom, search, and page navigation.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export const PdfViewerTabContent = memo(function PdfViewerTabContent({ tab }) {
  const pdfUrl = `/api/files/${tab.path}?action=download`;

  return (
    <div className="flex h-full bg-background-secondary-default">
      <iframe
        src={pdfUrl}
        title={`PDF: ${tab.title}`}
        className="w-full h-full border-0"
      />
    </div>
  );
});
