import { parse } from "csv-parse";
import type { MultipartFile } from "@fastify/multipart";
import pLimit from "p-limit";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { resolveJurisdiction } from "../../geo/resolver.js";
import { lookupByCountyCity } from "../../tax/pub718.provider.js";
import { buildBreakdown } from "../../tax/breakdown.js";
import { toCents, roundTaxCents } from "../../tax/money.js";
import type { ImportRow, ImportRowError, ImportSummary } from "./import.types.js";

const RowSchema = z.object({
  id: z.string().optional(),
  longitude: z.string(),
  latitude: z.string(),
  timestamp: z.string(),
  subtotal: z.string(),
});

function toNumberStrict(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Not a number: "${v}"`);
  return n;
}

function parseRow(raw: any): ImportRow {
  const parsed = RowSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid CSV row shape");

  const r = parsed.data;
  return {
    external_id: r.id ?? null,
    longitude: toNumberStrict(r.longitude),
    latitude: toNumberStrict(r.latitude),
    timestamp: String(r.timestamp),
    subtotal: toNumberStrict(r.subtotal),
  };
}

export async function importOrdersFromCsv(file: MultipartFile): Promise<ImportSummary> {
  const errors: ImportRowError[] = [];
  let totalRows = 0;
  let inserted = 0;

  const batch = await prisma.importBatch.create({
    data: { filename: file.filename ?? null },
    select: { id: true },
  });
  const importBatchId = batch.id;

  const limit = pLimit(32);

  const buffer: any[] = [];
  const BATCH_SIZE = 500;

  async function flush() {
    if (buffer.length === 0) return;

    const dataToInsert = [...buffer];
    buffer.length = 0;

    const result = await prisma.order.createMany({ 
      data: dataToInsert,
      skipDuplicates: true 
    });
    
    inserted += result.count;
  }

  let flushing: Promise<void> | null = null;

  async function flushLocked() {
    if (flushing) return flushing;
    flushing = (async () => {
      try {
        await flush();
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  const parser = (file.file as any).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  const tasks: Promise<void>[] = [];
  let rowIndex = 0;

  for await (const record of parser) {
    rowIndex += 1;
    totalRows += 1;

    const rowNumber = rowIndex;

    const task = limit(async () => {
      let row: ImportRow;
      try {
        row = parseRow(record);
      } catch (e: any) {
        errors.push({ row: rowNumber, external_id: record?.id ?? null, reason: e?.message ?? "Row parse error" });
        return;
      }

      if (row.latitude < -90 || row.latitude > 90 || row.longitude < -180 || row.longitude > 180) {
        errors.push({ row: rowNumber, external_id: row.external_id, reason: "Invalid latitude/longitude range" });
        return;
      }
      if (!(row.subtotal > 0)) {
        errors.push({ row: rowNumber, external_id: row.external_id, reason: "Subtotal must be > 0" });
        return;
      }

      const dt = new Date(row.timestamp);
      if (isNaN(dt.getTime())) {
        errors.push({ row: rowNumber, external_id: row.external_id, reason: "Invalid timestamp" });
        return;
      }

      let loc;
      try {
        loc = await resolveJurisdiction(row.latitude, row.longitude);
      } catch (e: any) {
        const errorMsg = e?.message ?? "Location resolve error";
        
        if (errorMsg.includes("Out of scope")) {
          const subtotalCents = toCents(row.subtotal);
          
          buffer.push({
            importBatchId,
            importRowNumber: rowNumber,
            externalId: row.external_id ?? null,
            latitude: row.latitude.toString(),
            longitude: row.longitude.toString(),
            timestamp: dt,
            subtotalCents,

            compositeTaxRate: "0",
            taxCents: 0,
            totalCents: subtotalCents, 

            stateRate: "0",
            countyRate: "0",
            cityRate: "0",
            specialRates: [], 

            jurisdictions: {
              source: "out_of_state",
              effective_date: null,
              reporting_code: null,
              county: null,
              city: null,
              matched_key: null,
              mctd_included: false,
              resolved_from: {
                method: "postgis",
                status: "out_of_scope",
                county: null,
                city: null
              }
            } as any,
            source: "out_of_state"
          });

          if (buffer.length >= BATCH_SIZE) {
            await flushLocked();
          }
          return;
        }

        errors.push({ row: rowNumber, external_id: row.external_id, reason: errorMsg });
        return;
      }

      let jurisdiction;
      try {
        jurisdiction = lookupByCountyCity({ county: loc.county, city: loc.city ?? null });
      } catch (e: any) {
        errors.push({ row: rowNumber, external_id: row.external_id, reason: e?.message ?? "Tax lookup error" });
        return;
      }

      const breakdown = buildBreakdown(jurisdiction.compositeRate, jurisdiction.mctdIncluded);
      if (jurisdiction.city) {
        breakdown.cityRate = breakdown.countyRate;
        breakdown.countyRate = 0;
      }

      const subtotalCents = toCents(row.subtotal);
      const taxCents = roundTaxCents(subtotalCents, jurisdiction.compositeRate);
      const totalCents = subtotalCents + taxCents;

      buffer.push({
        importBatchId,
        importRowNumber: rowNumber, 

        externalId: row.external_id ?? null,
        latitude: row.latitude.toString(),
        longitude: row.longitude.toString(),
        timestamp: dt,
        subtotalCents,

        compositeTaxRate: jurisdiction.compositeRate.toString(),
        taxCents,
        totalCents,

        stateRate: breakdown.stateRate.toString(),
        countyRate: breakdown.countyRate.toString(),
        cityRate: breakdown.cityRate.toString(),
        specialRates: breakdown.specialRates as any,

        jurisdictions: {
          source: jurisdiction.source,
          effective_date: jurisdiction.effectiveDate,
          reporting_code: jurisdiction.reportingCode,
          county: jurisdiction.county,
          city: jurisdiction.city,
          matched_key: jurisdiction.matchedKey,
          mctd_included: jurisdiction.mctdIncluded,
          resolved_from: {
            method: "postgis",
            county: loc.county,
            city: loc.city
          }
        } as any,
        source: jurisdiction.source
      });

      if (buffer.length >= BATCH_SIZE) {
        await flushLocked();
      }
    });

    tasks.push(task);
  }

  await Promise.all(tasks);
  await flushLocked();

  await prisma.importBatch.update({
    where: { id: importBatchId },
    data: { totalRows },
  });

  return {
    import_batch_id: importBatchId,
    total_rows: totalRows,
    inserted,
    failed: errors.length,
    errors: errors.slice(0, 2000), 
  };
}
