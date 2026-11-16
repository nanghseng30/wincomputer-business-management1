import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse } from "cookie";
import { and, eq, gt } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { wcSessions, wcUsers, type WcUser } from "../../drizzle/schema";
import { getDb } from "../db";
import { sessionHash, verifySession } from "../security";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: WcUser | null;
  sessionId?: string | null;
};
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const token = parse(opts.req.headers.cookie ?? "")[COOKIE_NAME];
  const sessionId = await verifySession(token);
  if (!sessionId)
    return { req: opts.req, res: opts.res, user: null, sessionId: null };
  const db = await getDb();
  if (!db) return { req: opts.req, res: opts.res, user: null, sessionId: null };
  const [match] = await db
    .select({ user: wcUsers, lastSeenAt: wcSessions.lastSeenAt })
    .from(wcSessions)
    .innerJoin(wcUsers, eq(wcSessions.userId, wcUsers.id))
    .where(
      and(
        eq(wcSessions.id, sessionHash(sessionId)),
        gt(wcSessions.expiresAt, new Date()),
        eq(wcUsers.active, true)
      )
    )
    .limit(1);
  const idleLimit = 30 * 60 * 1000;
  if (
    match?.lastSeenAt &&
    Date.now() - new Date(match.lastSeenAt).getTime() >= idleLimit
  ) {
    await db
      .delete(wcSessions)
      .where(eq(wcSessions.id, sessionHash(sessionId)));
    return { req: opts.req, res: opts.res, user: null, sessionId: null };
  }
  return {
    req: opts.req,
    res: opts.res,
    user: match?.user ?? null,
    sessionId: match ? sessionId : null,
  };
}
