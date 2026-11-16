import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust the managed proxy, or an explicitly configured local reverse proxy.
  if (process.env.MANUS_PROJECT_ID || process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use("/api/trpc", (req, res, next) => {
    // JSON mutations require a CORS preflight, which this server does not grant.
    if (req.method === "POST" && (!req.is("application/json") || req.get("sec-fetch-site") === "cross-site")) {
      res.status(403).json({ error: "Invalid request origin or content type" }); return;
    }
    next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "128kb" }));
  app.use(express.urlencoded({ limit: "128kb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  // Standalone accounts only; do not leave the starter OAuth callback active.
  app.use("/api/oauth", (_req, res) => res.sendStatus(404));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
