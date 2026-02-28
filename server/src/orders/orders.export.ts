import type { FastifyReply } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function centsToDollars(cents: number | bigint | null | undefined): string {
  const n = Number(cents ?? 0);
  return (n / 100).toFixed(2);
}


export async function streamOrdersCsv(opts: {
  reply: FastifyReply;
  where: Prisma.OrderWhereInput;
  filename?: string;
}) {
  const { reply, where } = opts;

  const filename = opts.filename ?? `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;

  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", `attachment; filename="${filename}"`);
  reply.header("Cache-Control", "no-store");

  // Header
  const header = [
    "id",
    "external_id",
    "latitude",
    "longitude",
    "timestamp",
    "subtotal",
    "composite_tax_rate",
    "tax_amount",
    "total_amount",
    "source",
    "county",
    "city",
    "reporting_code",
    "effective_date",
    "mctd_included",
  ].join(",") + "\n";

  reply.raw.write(header);

  const take = 2000;
  let cursorId: string | null = null;

  while (true) {
    const rows: any[] = await prisma.order.findMany({
      where,
      orderBy: { id: "asc" },
      take,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: {
        id: true,
        externalId: true,
        latitude: true,
        longitude: true,
        timestamp: true,
        subtotalCents: true,
        compositeTaxRate: true,
        taxCents: true,
        totalCents: true,
        source: true,
        jurisdictions: true,
      },
    });

    if (rows.length === 0) break;

    for (const o of rows) {
      const j: any = o.jurisdictions ?? {};
      const line = [
        csvEscape(o.id),
        csvEscape(o.externalId),
        csvEscape(o.latitude),
        csvEscape(o.longitude),
        csvEscape(o.timestamp.toISOString()),
        csvEscape(centsToDollars(o.subtotalCents)),
        csvEscape(String(o.compositeTaxRate)),
        csvEscape(centsToDollars(o.taxCents)),
        csvEscape(centsToDollars(o.totalCents)),
        csvEscape(o.source),
        csvEscape(j?.county ?? ""),
        csvEscape(j?.city ?? ""),
        csvEscape(j?.reporting_code ?? ""),
        csvEscape(j?.effective_date ?? ""),
        csvEscape(j?.mctd_included ?? ""),
      ].join(",") + "\n";

      if (!reply.raw.write(line)) {
        await new Promise<void>((resolve) => reply.raw.once("drain", resolve));
      }
    }

    cursorId = rows[rows.length - 1]!.id;
  }

  reply.raw.end();
}
