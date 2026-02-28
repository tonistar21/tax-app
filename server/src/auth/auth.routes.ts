import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "ValidationError", details: parsed.error.flatten() });
    }

    const { username, password } = parsed.data;

    if (username === "admin" && password === "betterme2026") {
      const token = app.jwt.sign(
        { role: "admin", sub: "admin" },
        { expiresIn: "12h" }
      );

      return {
        token,
        token_type: "Bearer",
        expires_in: 12 * 60 * 60,
      };
    }

    return reply.code(401).send({ error: "InvalidCredentials" });
  });

  app.get("/auth/me", { preHandler: app.requireAuth }, async (req) => {
    if (env.AUTH_ENABLED !== "true") {
      return { sub: "admin", role: "admin", auth_enabled: false };
    }

    return { ...(req.user as any), auth_enabled: true };
  });
}
