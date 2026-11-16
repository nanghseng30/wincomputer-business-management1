import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import type { Request } from "express";
import { wcRateLimits } from "../drizzle/schema";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const SESSION_MS = 12 * 60 * 60 * 1000;
export { SESSION_MS };
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, salt, hex, extra] = encoded.split("$");
  if (scheme !== "scrypt" || !/^[0-9a-f]{32}$/.test(salt ?? "") || !/^[0-9a-f]{128}$/.test(hex ?? "") || extra !== undefined) return false;
  const key = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(hex, "hex"));
}
export function approvalConfigured(): boolean { return !!process.env.WIN_APPROVAL_PASSWORD; }
export function verifyApproval(input: string): boolean {
  const secret = process.env.WIN_APPROVAL_PASSWORD;
  if (!secret) return false;
  return timingSafeEqual(createHash("sha256").update(input).digest(), createHash("sha256").update(secret).digest());
}
export function ensureDifferentFromApproval(password: string) {
  if (approvalConfigured() && verifyApproval(password)) throw new TRPCError({ code: "BAD_REQUEST", message: "Login password must be different from the approval password." });
}
function signingKey() {
  const managed = !!process.env.MANUS_PROJECT_ID;
  const secret = managed ? process.env.MANUS_JWT_SECRET : process.env.APP_SESSION_SECRET;
  if (!secret || (!managed && Buffer.byteLength(secret, "utf8") < 32)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Session signing secret is not configured or is too short." });
  return new TextEncoder().encode(secret);
}
export function assertSigningConfigured() { signingKey(); }
export function newSessionId() { return randomBytes(32).toString("hex"); }
export function sessionHash(token: string) { return sha256(token); }
export async function signSession(sid: string) {
  const project = process.env.MANUS_PROJECT_ID || "self-host";
  return new SignJWT({ sid, project, kind: "wc-session" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime("12h").sign(signingKey());
}
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    if (payload.kind !== "wc-session" || payload.project !== (process.env.MANUS_PROJECT_ID || "self-host") || typeof payload.sid !== "string" || !/^[0-9a-f]{64}$/.test(payload.sid)) return null;
    return payload.sid;
  } catch { return null; }
}
/** Shared database-backed fixed-window limits: no credentials or raw IPs are stored. */
export async function rateLimit(scope: string, identifier: string, max: number, windowSeconds = 900) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const id = sha256(`${scope}\0${identifier}`);
  await db.insert(wcRateLimits).values({ id, attempts: 1, windowStart: new Date() }).onDuplicateKeyUpdate({ set: {
    attempts: sql`IF(TIMESTAMPDIFF(SECOND, ${wcRateLimits.windowStart}, CURRENT_TIMESTAMP) >= ${windowSeconds}, 1, ${wcRateLimits.attempts} + 1)`,
    windowStart: sql`IF(TIMESTAMPDIFF(SECOND, ${wcRateLimits.windowStart}, CURRENT_TIMESTAMP) >= ${windowSeconds}, CURRENT_TIMESTAMP, ${wcRateLimits.windowStart})`,
  }});
  const [row] = await db.select().from(wcRateLimits).where(eq(wcRateLimits.id, id));
  if (!row || row.attempts > max) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." });
}
export function requestIp(req: Request): string { return req.ip || req.socket?.remoteAddress || "unknown"; }
export function isDuplicate(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "ER_DUP_ENTRY" || e?.cause?.code === "ER_DUP_ENTRY";
}
