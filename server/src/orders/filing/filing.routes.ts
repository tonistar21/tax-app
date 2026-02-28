import type { FastifyInstance } from "fastify";
import { getFilingSummary, filingSummaryToCsv, generateSt100Pdf } from "./filing.service.js";
import { prisma } from "../../db/prisma.js"; 

export async function filingRoutes(app: FastifyInstance) {
  const requireAuth = (app as any).requireAuth;

  app.get(
    "/orders/filing/summary",
    { preHandler: requireAuth },
    async (req, reply) => {
      const summary = await getFilingSummary(prisma, (req as any).query);
      return reply.send(summary);
    }
  );

  app.get(
    "/orders/filing/export.csv",
    { preHandler: requireAuth },
    async (req, reply) => {
      const summary = await getFilingSummary(prisma, (req as any).query);
      const csv = filingSummaryToCsv(summary);
      reply.header("Content-Type", "text/csv; charset=utf-8").header("Content-Disposition", `attachment; filename="jurisdiction_summary.csv"`).send(csv);
    }
  );

  app.get(
    "/orders/filing/st100.pdf",
    { preHandler: requireAuth },
    async (req, reply) => {
      const pdfBytes = await generateSt100Pdf(prisma, (req as any).query);
      reply.header("Content-Type", "application/pdf").header("Content-Disposition", `attachment; filename="st100_filled.pdf"`).send(Buffer.from(pdfBytes));
    }
  );
}
