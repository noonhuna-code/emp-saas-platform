import { inferExtension, resolveDocumentPreviewKind } from "@/lib/documents/viewer";

export type ReadableSheetTable = {
  name: string;
  rows: string[][];
};

export type ReadableDocumentResult =
  | { kind: "text"; text: string; searchText: string }
  | { kind: "sheet"; sheets: ReadableSheetTable[]; searchText: string }
  | { kind: "word"; html: string; text: string; searchText: string }
  | { kind: "unsupported"; searchText: string };

const sanitizeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const normalizeSearchText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const decodeText = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(new Uint8Array(buffer));
};

const parseSheetDocument = async (buffer: ArrayBuffer): Promise<ReadableDocumentResult> => {
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(buffer, { type: "array" });
  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return {
        name: sheetName,
        rows: [],
      } satisfies ReadableSheetTable;
    }
    const matrix = xlsx.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
      header: 1,
      blankrows: false,
      raw: false,
    });

    const rows = matrix
      .map((row) => row.map((cell) => sanitizeCell(cell)))
      .filter((row) => row.some((cell) => cell.length > 0));

    return {
      name: sheetName,
      rows,
    } satisfies ReadableSheetTable;
  });

  const searchText = normalizeSearchText(
    sheets
      .flatMap((sheet) => [sheet.name, ...sheet.rows.flat()])
      .join(" ")
  );

  return {
    kind: "sheet",
    sheets,
    searchText,
  };
};

const parseWordDocument = async (buffer: ArrayBuffer): Promise<ReadableDocumentResult> => {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const text = normalizeSearchText(result.value.replace(/<[^>]+>/g, " "));
  return {
    kind: "word",
    html: result.value,
    text,
    searchText: text,
  };
};

export const parseReadableDocument = async (args: {
  buffer: ArrayBuffer;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<ReadableDocumentResult> => {
  const previewKind = resolveDocumentPreviewKind(args.mimeType, args.fileName);

  if (previewKind === "text") {
    const text = decodeText(args.buffer);
    const searchText = normalizeSearchText(text);
    return { kind: "text", text, searchText };
  }

  if (previewKind === "sheet") {
    return parseSheetDocument(args.buffer);
  }

  if (previewKind === "word" && inferExtension(args.fileName) === "docx") {
    return parseWordDocument(args.buffer);
  }

  return { kind: "unsupported", searchText: "" };
};
