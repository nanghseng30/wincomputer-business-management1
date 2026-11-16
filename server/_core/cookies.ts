import type { CookieOptions, Request } from "express";
export function getSessionCookieOptions(req: Request): CookieOptions {
  // The server trusts the managed/public reverse proxy in index.ts, so
  // req.protocol reflects the browser-facing HTTPS scheme. Plain local HTTP
  // remains usable without Secure cookies.
  const secure = req.protocol === "https";
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
