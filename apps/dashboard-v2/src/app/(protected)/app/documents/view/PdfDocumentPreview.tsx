"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export const PdfDocumentPreview = ({
  fileUrl,
  fileName,
}: {
  fileUrl: string;
  fileName: string;
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const options = useMemo(() => ({ standardFontDataUrl: "/standard_fonts/" }), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{fileName}</p>
          <p className="text-xs text-slate-500">
            Page {pageNumber} of {numPages || "-"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="icon" className="rounded-full" onClick={() => setScale((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" size="icon" className="rounded-full" onClick={() => setScale((value) => Math.min(2.25, Number((value + 0.1).toFixed(2))))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" size="icon" className="rounded-full" onClick={() => setPageNumber((value) => Math.max(1, value - 1))} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" size="icon" className="rounded-full" onClick={() => setPageNumber((value) => Math.min(numPages || 1, value + 1))} disabled={numPages === 0 || pageNumber >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-4 shadow-inner">
        <div className="mx-auto flex min-h-[55vh] w-full justify-center">
          <Document
            file={fileUrl}
            loading={<div className="py-10 text-sm text-slate-500">Loading PDF preview...</div>}
            onLoadSuccess={({ numPages: pages }) => {
              setNumPages(pages);
              setPageNumber((value) => Math.min(value, pages || 1));
            }}
            onLoadError={() => {
              setNumPages(0);
              setPageNumber(1);
            }}
            options={options}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderAnnotationLayer
              renderTextLayer
            />
          </Document>
        </div>
      </div>
    </div>
  );
};
