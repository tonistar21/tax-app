import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { toCents, roundTaxCents } from "../tax/money.js";
import { lookupByCountyCity } from "../tax/pub718.provider.js";
import { buildBreakdown } from "../tax/breakdown.js";
import { resolveJurisdiction } from "../geo/resolver.js";
import { OrdersQuerySchema } from "./orders.query.js";
import { streamOrdersCsv } from "./orders.export.js";

const CreateOrderSchema = z.object({
  external_id: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  subtotal: z.number().positive(),
  timestamp: z.string().datetime().optional()
});

function buildOrdersWhere(q: any) {
  const where: any = {};
  const andConditions: any[] = [];

  if (q.importBatchId) andConditions.push({ importBatchId: q.importBatchId });
  if (q.externalId) andConditions.push({ externalId: q.externalId });
  if (q.source) andConditions.push({ source: q.source });

  if (q.dateFrom || q.dateTo) {
    const t: any = {};
    if (q.dateFrom) t.gte = new Date(q.dateFrom);
    if (q.dateTo) t.lte = new Date(q.dateTo);
    andConditions.push({ timestamp: t });
  }

  if (q.minRate !== undefined || q.maxRate !== undefined) {
    const r: any = {};
    if (q.minRate !== undefined) r.gte = q.minRate;
    if (q.maxRate !== undefined) r.lte = q.maxRate;
    andConditions.push({ compositeTaxRate: r });
  }

  if (q.county) {
    andConditions.push({ jurisdictions: { path: ["county"], equals: q.county } });
  }
  if (q.city) {
    andConditions.push({ jurisdictions: { path: ["city"], equals: q.city } });
  }

  if (andConditions.length > 0) where.AND = andConditions;
  return where;
}

export async function ordersRoutes(app: FastifyInstance) {
  app.post("/orders", { preHandler: app.requireAuth }, async (req, reply) => {
    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "ValidationError", details: parsed.error.flatten() });
    }

    const body = parsed.data;
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    let loc;
    try {
      loc = await resolveJurisdiction(body.latitude, body.longitude);
    } catch (e: any) {
      const errorMsg = e?.message ?? String(e);
      
      if (errorMsg.includes("Out of scope")) {
        const subtotalCents = toCents(body.subtotal);
        
        const created = await prisma.order.create({
          data: {
            importBatchId: null,
            importRowNumber: null,

            externalId: body.external_id ?? null,
            latitude: body.latitude.toString(),
            longitude: body.longitude.toString(),
            timestamp,
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
          },
        });

        return {
          id: created.id,
          import_batch_id: created.importBatchId,
          import_row_number: created.importRowNumber,
          external_id: created.externalId,
          latitude: Number(created.latitude),
          longitude: Number(created.longitude),
          timestamp: created.timestamp.toISOString(),
          subtotal: created.subtotalCents / 100,

          composite_tax_rate: Number(created.compositeTaxRate),
          tax_amount: created.taxCents / 100,
          total_amount: created.totalCents / 100,

          breakdown: {
            state_rate: Number(created.stateRate),
            county_rate: Number(created.countyRate),
            city_rate: Number(created.cityRate),
            special_rates: created.specialRates,
          },
          jurisdictions: created.jurisdictions,
        };
      }

      return reply.code(400).send({ error: "LocationResolveError", message: errorMsg });
    }

    const jurisdiction = lookupByCountyCity({ county: loc.county, city: loc.city ?? null });
    const breakdown = buildBreakdown(jurisdiction.compositeRate, jurisdiction.mctdIncluded);

    if (jurisdiction.city) {
      breakdown.cityRate = breakdown.countyRate;
      breakdown.countyRate = 0;
    }

    const subtotalCents = toCents(body.subtotal);
    const taxCents = roundTaxCents(subtotalCents, jurisdiction.compositeRate);
    const totalCents = subtotalCents + taxCents;

    const created = await prisma.order.create({
      data: {
        importBatchId: null,
        importRowNumber: null,

        externalId: body.external_id ?? null,
        latitude: body.latitude.toString(),
        longitude: body.longitude.toString(),
        timestamp,
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
      },
    });

    return {
      id: created.id,
      import_batch_id: created.importBatchId,
      import_row_number: created.importRowNumber,
      external_id: created.externalId,
      latitude: Number(created.latitude),
      longitude: Number(created.longitude),
      timestamp: created.timestamp.toISOString(),
      subtotal: created.subtotalCents / 100,

      composite_tax_rate: Number(created.compositeTaxRate),
      tax_amount: created.taxCents / 100,
      total_amount: created.totalCents / 100,

      breakdown: {
        state_rate: Number(created.stateRate),
        county_rate: Number(created.countyRate),
        city_rate: Number(created.cityRate),
        special_rates: created.specialRates,
      },
      jurisdictions: created.jurisdictions,
    };
  });

  app.get("/orders/summary", { preHandler: app.requireAuth }, async (req, reply) => {
    const parsed = OrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "ValidationError", details: parsed.error.flatten() });
    }
    const q = parsed.data;

    const where = buildOrdersWhere(q);

    const [total, outCount, sums] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { AND: [where, { source: "out_of_state" }] } }),
      prisma.order.aggregate({
        where,
        _sum: { subtotalCents: true, taxCents: true, totalCents: true },
      }),
    ]);

    return {
      total,
      ny_state: total - outCount,
      out_of_state: outCount,
      revenue_total: Number(sums._sum.subtotalCents ?? 0) / 100,
      tax_total: Number(sums._sum.taxCents ?? 0) / 100,
      grand_total: Number(sums._sum.totalCents ?? 0) / 100,
    };
  });

  app.get("/orders/export", { preHandler: app.requireAuth }, async (req, reply) => {
    const parsed = OrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "ValidationError", details: parsed.error.flatten() });
    }
    const q = parsed.data;

    const where = buildOrdersWhere(q);

    await streamOrdersCsv({
      reply,
      where,
      filename: "orders_report.csv",
    });
  });

  app.get("/orders/analytics", { preHandler: app.requireAuth }, async (_req, _reply) => {
    const rows = await prisma.$queryRaw<
      Array<{ county: string | null; subtotal_cents: bigint | number }>
    >`
      SELECT
        (jurisdictions->>'county') AS county,
        SUM("subtotalCents") AS subtotal_cents
      FROM "Order"
      WHERE (jurisdictions->>'county') IS NOT NULL
        AND "source" <> 'out_of_state'
      GROUP BY county
      ORDER BY subtotal_cents DESC
      LIMIT 3
    `;

    return {
      top_counties: rows.map((r) => ({
        county: r.county,
        subtotal: Number(r.subtotal_cents ?? 0) / 100,
      })),
    };
  });

  app.get("/orders", { preHandler: app.requireAuth }, async (req, reply) => {
    const parsed = OrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "ValidationError", details: parsed.error.flatten() });
    }
    const q = parsed.data;

    const skip = (q.page - 1) * q.pageSize;
    const take = q.pageSize;

    const where = buildOrdersWhere(q);

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take,
      }),
    ]);

    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: rows.map((o) => ({
        id: o.id,
        import_batch_id: o.importBatchId,
        import_row_number: o.importRowNumber,
        external_id: o.externalId,
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        timestamp: o.timestamp.toISOString(),
        subtotal: o.subtotalCents / 100,
        composite_tax_rate: Number(o.compositeTaxRate),
        tax_amount: o.taxCents / 100,
        total_amount: o.totalCents / 100,
        breakdown: {
          state_rate: Number(o.stateRate),
          county_rate: Number(o.countyRate),
          city_rate: Number(o.cityRate),
          special_rates: o.specialRates,
        },
        jurisdictions: o.jurisdictions,
        source: o.source,
      })),
    };
  });
}
