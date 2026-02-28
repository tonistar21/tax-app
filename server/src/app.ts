import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

import { authPlugin } from "./auth/auth.plugin.js";
import { authRoutes } from "./auth/auth.routes.js";

import { healthRoutes } from "./health/health.routes.js";
import { ordersRoutes } from "./orders/orders.routes.js";
import { importRoutes } from "./orders/import/import.routes.js";
import { filingRoutes } from "./orders/filing/filing.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(multipart);

  app.register(authPlugin);
  
  app.register(healthRoutes);
  app.register(authRoutes); 
  
  app.register(ordersRoutes);
  app.register(importRoutes);
  app.register(filingRoutes);
  return app;
}
