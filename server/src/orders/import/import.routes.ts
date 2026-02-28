import type { FastifyInstance } from "fastify";
import { importOrdersFromCsv } from "./import.service.js";

export async function importRoutes(app: FastifyInstance) {
  app.post("/orders/import", { preHandler: app.requireAuth }, async (req, reply) => {
    const file = await req.file();

    if (!file) {
      return reply.code(400).send({ error: "NoFile", message: "Expected multipart file field" });
    }

    const name = file.filename?.toLowerCase() ?? "";
    if (!name.endsWith(".csv")) {
    }

    try {
      const summary = await importOrdersFromCsv(file);
      return reply.send(summary);
    } catch (e: any) {
      req.log.error(e);
      return reply.code(500).send({ error: "ImportFailed", message: e?.message ?? "Unknown error" });
    }
  });
}
