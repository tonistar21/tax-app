import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PrismaClient } from "@prisma/client";
import type { FilingSummaryResponse } from "./filing.types.js";

function toIsoDateOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function nextDayUtc(dateIso: string): Date {
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function moneyForm(n: number): string {
  return n.toFixed(2);
}

export async function getFilingSummary(prisma: PrismaClient, query: any): Promise<FilingSummaryResponse> {
  const dateFrom = toIsoDateOrNull(query?.dateFrom);
  const dateTo = toIsoDateOrNull(query?.dateTo);

  const whereParts: string[] = [];
  const params: any[] = [];

  if (dateFrom) {
    params.push(new Date(`${dateFrom}T00:00:00.000Z`));
    whereParts.push(`"timestamp" >= $${params.length}`);
  }
  if (dateTo) {
    params.push(nextDayUtc(dateTo));
    whereParts.push(`"timestamp" < $${params.length}`);
  }

  whereParts.push(`("jurisdictions"->>'reporting_code') IS NOT NULL`);
  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      reporting_code: string;
      county: string | null;
      city: string | null;
      taxable_sales_cents: bigint;
      tax_cents: bigint;
    }>
  >(
    `
    SELECT
      ("jurisdictions"->>'reporting_code') as reporting_code,
      ("jurisdictions"->>'county') as county,
      ("jurisdictions"->>'city') as city,
      SUM("subtotalCents") as taxable_sales_cents,
      SUM("taxCents") as tax_cents
    FROM "Order"
    ${whereSql}
    GROUP BY 1,2,3
    ORDER BY SUM("subtotalCents") DESC
    `,
    ...params
  );

  const mapped = rows.map((r) => ({
    reporting_code: r.reporting_code,
    county: r.county,
    city: r.city,
    taxable_sales: Number(r.taxable_sales_cents) / 100,
    tax_collected: Number(r.tax_cents) / 100,
  }));

  const totalsAgg = mapped.reduce(
    (acc, r) => {
      acc.sales += r.taxable_sales;
      acc.tax += r.tax_collected;
      return acc;
    },
    { sales: 0, tax: 0 }
  );

  return {
    date_from: dateFrom,
    date_to: dateTo,
    rows: mapped,
    totals: {
      taxable_sales: Number(totalsAgg.sales.toFixed(2)),
      tax_collected: Number(totalsAgg.tax.toFixed(2)),
      grand_total: Number((totalsAgg.sales + totalsAgg.tax).toFixed(2)),
      jurisdictions_count: mapped.length,
    },
  };
}

export function filingSummaryToCsv(summary: FilingSummaryResponse): string {
  const header = ["reporting_code", "county", "city", "taxable_sales", "tax_collected"].join(",");
  const lines = summary.rows.map((r) => {
    const county = (r.county ?? "").replace(/"/g, '""');
    const city = (r.city ?? "").replace(/"/g, '""');
    return [r.reporting_code, `"${county}"`, `"${city}"`, moneyForm(r.taxable_sales), moneyForm(r.tax_collected)].join(",");
  });
  const footer = ["", '"TOTAL"', '""', moneyForm(summary.totals.taxable_sales), moneyForm(summary.totals.tax_collected)].join(",");
  return [header, ...lines, footer].join("\n");
}

const PAGE2_CODES = ['0021','0181','0221','0321','0481','0441','0431','0511','0561','0651','0711','0861','0831','0921','1021','1131','1221','1311','1451','1521','1621','1791','1741','1751','1811','1911','2011','2121','2221','2321','2411','2511','2541','2611','2781','2811','2911','3010','3015','3018','3121','3211','3321','3481','3501','3561','3621'];
const PAGE3_CODES = ['3731','3881','3921','4091','4012','4111','4131','4241','4321','4411','4511','4691','4711','4821','4921','5081','5021','5111','5281','5211','5311','5421','5581','5521','6861','6513','6511','5621','5721','8081','8061','8091'];

export async function generateSt100Pdf(prisma: PrismaClient, query: any): Promise<Uint8Array> {
  const summary = await getFilingSummary(prisma, query);
  const templatePath = process.env.ST100_TEMPLATE_PATH || "/data/st100.pdf";
  let templateBytes = await fs.readFile(templatePath).catch(() => fs.readFile(path.resolve(process.cwd(), "../data/st100.pdf")));

  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const drawRight = (page: any, text: string, xRight: number, y: number, customSize = 8.5) => {
    const size = text.length > 9 ? customSize - 1.5 : customSize;
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - w, y, size, font, color: rgb(0, 0, 0) });
  };

  const X_SALES = 420; 
  const X_TAX = 556;   
  
  const PAGE2_START_Y = 618.2; 
  const PAGE3_START_Y = 682.0; 
  const ROW_H = 12.00; 

  const codeTotals = new Map<string, { sales: number, tax: number }>();
  for (const r of summary.rows) {
    const code = r.reporting_code;
    const curr = codeTotals.get(code) || { sales: 0, tax: 0 };
    codeTotals.set(code, { sales: curr.sales + r.taxable_sales, tax: curr.tax + r.tax_collected });
  }

  for (const [code, totals] of codeTotals.entries()) {
    const p2Idx = PAGE2_CODES.indexOf(code);
    const p3Idx = PAGE3_CODES.indexOf(code);

    if (p2Idx !== -1) {
      const y = PAGE2_START_Y - (p2Idx * ROW_H);
      drawRight(pages[1], moneyForm(totals.sales), X_SALES, y);
      drawRight(pages[1], moneyForm(totals.tax), X_TAX, y);
    } else if (p3Idx !== -1) {
      const y = PAGE3_START_Y - (p3Idx * ROW_H);
      drawRight(pages[2], moneyForm(totals.sales), X_SALES, y);
      drawRight(pages[2], moneyForm(totals.tax), X_TAX, y);
    }
  }

  const p4 = pages[3];
  const taxStr = moneyForm(summary.totals.tax_collected);
  drawRight(p4, taxStr, 528, 520, 9); 
  drawRight(p4, taxStr, 528, 483, 9); 
  drawRight(p4, taxStr, 528, 362, 10); 

  const addAppxPage = (title: string, info: string) => {
    const p = pdfDoc.addPage();
    const { height } = p.getSize();
    p.drawText(title, { x: 50, y: height - 60, size: 16, font });
    p.drawText(info, { x: 50, y: height - 80, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
    const yHeader = height - 110;
    p.drawText("Code", { x: 50, y: yHeader, size: 10, font });
    p.drawText("Jurisdiction", { x: 100, y: yHeader, size: 10, font });
    p.drawText("Sales", { x: 380, y: yHeader, size: 10, font });
    p.drawText("Tax", { x: 480, y: yHeader, size: 10, font });
    return { p, yStart: yHeader - 15 };
  };

  const periodInfo = `Period: ${summary.date_from ?? "ALL"} -> ${summary.date_to ?? "ALL"} | Jurisdictions: ${summary.totals.jurisdictions_count}`;
  let { p, yStart } = addAppxPage("Detailed Jurisdiction Worksheet", periodInfo);
  let y = yStart;

  for (const r of summary.rows.sort((a,b) => b.taxable_sales - a.taxable_sales)) {
    if (y < 60) { const next = addAppxPage("Detailed Jurisdiction Worksheet (Cont.)", periodInfo); p = next.p; y = next.yStart; }
    p.drawText(r.reporting_code, { x: 50, y, size: 9, font });
    p.drawText(`${r.county ?? ""}${r.city ? ', ' + r.city : ''}`.slice(0, 45), { x: 100, y, size: 9, font });
    drawRight(p, moneyForm(r.taxable_sales), 430, y, 9);
    drawRight(p, moneyForm(r.tax_collected), 530, y, 9);
    y -= 14;
  }

  return pdfDoc.save();
}
