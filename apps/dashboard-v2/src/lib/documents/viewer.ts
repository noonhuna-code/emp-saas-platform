export type DocumentPreviewKind = "pdf" | "image" | "text" | "sheet" | "word" | "unsupported";

export type EmployeeDocumentViewerDescriptor = {
  employeeId: string;
  documentId: string;
  versionId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  title?: string | null;
  source?: string | null;
};

const INTERNAL_DOWNLOAD_PATH = /^\/api\/employees\/([^/]+)\/documents\/([^/?]+)\/download(?:\?.*)?$/i;

const TEXT_MIME_PATTERNS = [
  /^text\//i,
  /^application\/json$/i,
  /^application\/xml$/i,
  /^application\/javascript$/i,
  /^application\/x-javascript$/i,
  /^application\/x-sh$/i,
  /^application\/csv$/i,
];

const IMAGE_MIME_PATTERNS = [/^image\//i];

const TEXT_EXTENSIONS = new Set(["txt", "md", "json", "log", "xml", "yml", "yaml", "ini"]);
const SHEET_EXTENSIONS = new Set(["csv", "tsv", "xls", "xlsx"]);
const WORD_EXTENSIONS = new Set(["docx"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

export const inferExtension = (fileName?: string | null) => {
  if (!fileName) return null;
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === normalized.length - 1) return null;
  return normalized.slice(dotIndex + 1);
};

export const resolveDocumentPreviewKind = (
  mimeType?: string | null,
  fileName?: string | null,
): DocumentPreviewKind => {
  const normalizedMime = mimeType?.trim().toLowerCase() ?? "";
  const extension = inferExtension(fileName);

  if (normalizedMime === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (IMAGE_MIME_PATTERNS.some((pattern) => pattern.test(normalizedMime)) || (extension && IMAGE_EXTENSIONS.has(extension))) {
    return "image";
  }

  if (
    normalizedMime.includes("spreadsheet")
    || normalizedMime.includes("excel")
    || normalizedMime.includes("sheet")
    || (extension && SHEET_EXTENSIONS.has(extension))
  ) {
    return "sheet";
  }

  if (
    normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || (extension && WORD_EXTENSIONS.has(extension))
  ) {
    return "word";
  }

  if (TEXT_MIME_PATTERNS.some((pattern) => pattern.test(normalizedMime)) || (extension && TEXT_EXTENSIONS.has(extension))) {
    return "text";
  }

  return "unsupported";
};

export const buildEmployeeDocumentViewerHref = ({
  employeeId,
  documentId,
  versionId,
  fileName,
  mimeType,
  title,
  source,
}: EmployeeDocumentViewerDescriptor) => {
  const params = new URLSearchParams({
    employeeId,
    documentId,
  });

  if (versionId) params.set("versionId", versionId);
  if (fileName) params.set("fileName", fileName);
  if (mimeType) params.set("mimeType", mimeType);
  if (title) params.set("title", title);
  if (source) params.set("source", source);

  return `/app/documents/view?${params.toString()}`;
};

export const parseEmployeeDocumentDownloadPath = (rawUrl?: string | null): EmployeeDocumentViewerDescriptor | null => {
  if (!rawUrl) return null;

  try {
    const parsed = rawUrl.startsWith("http")
      ? new URL(rawUrl)
      : new URL(rawUrl, "https://emp.local");
    const match = parsed.pathname.match(INTERNAL_DOWNLOAD_PATH);
    if (!match) return null;

    const [, employeeId, documentId] = match;
    if (!employeeId || !documentId) return null;

    return {
      employeeId,
      documentId,
      versionId: parsed.searchParams.get("versionId"),
    };
  } catch {
    return null;
  }
};
