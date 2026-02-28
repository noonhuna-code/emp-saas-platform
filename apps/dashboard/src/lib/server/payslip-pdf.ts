import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { PayslipDetail } from "@emp/services/payroll.service";

const PAGE_WIDTH = 595.28; // A4 portrait in points
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const LINE_HEIGHT = 16;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);

const formatPeriodLabel = (period: string) => {
  const [yearPart, monthPart] = period.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return period;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

const sanitizeFileNamePart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "payslip";

export const buildPayslipPdfFilename = (detail: PayslipDetail): string => {
  const employee = sanitizeFileNamePart(detail.employee.name || "employee");
  const period = sanitizeFileNamePart(detail.period || "period");
  return `payslip-${employee}-${period}.pdf`;
};

type Canvas = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
};

const addPage = (doc: PDFDocument, font: PDFFont, fontBold: PDFFont): Canvas => ({
  doc,
  page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
  font,
  fontBold,
  y: PAGE_HEIGHT - MARGIN_TOP
});

const ensureSpace = (canvas: Canvas, heightNeeded: number): Canvas => {
  if (canvas.y - heightNeeded >= MARGIN_BOTTOM) {
    return canvas;
  }
  return addPage(canvas.doc, canvas.font, canvas.fontBold);
};

const drawText = (
  canvas: Canvas,
  text: string,
  options?: { x?: number; size?: number; bold?: boolean; color?: [number, number, number] }
) => {
  const x = options?.x ?? MARGIN_X;
  const size = options?.size ?? 11;
  const font = options?.bold ? canvas.fontBold : canvas.font;
  const color = options?.color ? rgb(options.color[0], options.color[1], options.color[2]) : rgb(0.09, 0.11, 0.15);
  canvas.page.drawText(text, { x, y: canvas.y, size, font, color });
};

const newLine = (canvas: Canvas, multiplier = 1) => {
  canvas.y -= LINE_HEIGHT * multiplier;
};

const drawDivider = (canvas: Canvas) => {
  canvas.page.drawLine({
    start: { x: MARGIN_X, y: canvas.y },
    end: { x: PAGE_WIDTH - MARGIN_X, y: canvas.y },
    thickness: 0.8,
    color: rgb(0.84, 0.86, 0.9)
  });
  newLine(canvas, 0.8);
};

const drawKeyValueRow = (canvas: Canvas, label: string, value: string) => {
  drawText(canvas, label, { bold: true });
  drawText(canvas, value, { x: 220 });
  newLine(canvas);
};

const drawAmountRow = (canvas: Canvas, label: string, amount: number) => {
  drawText(canvas, label);
  const amountText = money(amount);
  const size = 11;
  const width = canvas.font.widthOfTextAtSize(amountText, size);
  drawText(canvas, amountText, { x: PAGE_WIDTH - MARGIN_X - width, size });
  newLine(canvas);
};

const drawSectionHeader = (canvas: Canvas, title: string) => {
  drawText(canvas, title, { size: 12, bold: true, color: [0.12, 0.18, 0.32] });
  newLine(canvas);
  drawDivider(canvas);
};

export const renderPayslipPdf = async (detail: PayslipDetail): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  doc.setTitle(`Payslip ${detail.period}`);
  doc.setSubject("Payroll payslip snapshot");
  doc.setCreator("Leaveflow Dashboard");
  doc.setProducer("Leaveflow Dashboard");
  doc.setAuthor("Leaveflow");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let canvas = addPage(doc, font, fontBold);

  drawText(canvas, "Company Payslip", { size: 18, bold: true, color: [0.08, 0.12, 0.2] });
  newLine(canvas, 1.3);
  drawText(canvas, `Payroll Period: ${formatPeriodLabel(detail.period)}`, { size: 11, bold: true });
  newLine(canvas);
  drawText(canvas, `Processed At: ${detail.processedAt || "-"}`);
  newLine(canvas);
  drawText(canvas, `Status: ${detail.status}${detail.isLocked ? " (Locked)" : ""}`);
  newLine(canvas, 1.2);
  drawDivider(canvas);
  newLine(canvas, 0.4);

  canvas = ensureSpace(canvas, 120);
  drawSectionHeader(canvas, "Employee Summary");
  drawKeyValueRow(canvas, "Employee Name", detail.employee.name || "Employee");
  drawKeyValueRow(canvas, "Employee Code", detail.employee.code ?? "-");
  drawKeyValueRow(canvas, "Employee ID", detail.employee.id);
  drawKeyValueRow(canvas, "Entry ID", detail.entryId);
  newLine(canvas, 0.8);

  canvas = ensureSpace(canvas, 120);
  drawSectionHeader(canvas, "Earnings");
  for (const item of detail.earnings) {
    canvas = ensureSpace(canvas, 24);
    drawAmountRow(canvas, item.label, item.amount);
  }
  newLine(canvas, 0.6);

  canvas = ensureSpace(canvas, 80);
  drawSectionHeader(canvas, "Deductions");
  for (const item of detail.deductions) {
    canvas = ensureSpace(canvas, 24);
    drawAmountRow(canvas, item.label, item.amount);
  }
  newLine(canvas, 0.6);

  canvas = ensureSpace(canvas, 110);
  drawSectionHeader(canvas, "Totals");
  drawAmountRow(canvas, "Gross", detail.totals.gross);
  drawAmountRow(canvas, "Deductions", detail.totals.deductions);
  drawAmountRow(canvas, "Net", detail.totals.net);
  newLine(canvas, 0.8);
  drawDivider(canvas);
  drawText(canvas, "Read-only snapshot generated from persisted payroll entry values.", {
    size: 9,
    color: [0.36, 0.4, 0.47]
  });

  return doc.save();
};

