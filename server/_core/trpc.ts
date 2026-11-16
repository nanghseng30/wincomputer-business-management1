import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { wcEmployeeProfiles, wcSettings } from "../../drizzle/schema";
import { getDb } from "../db";
import type { TrpcContext } from "./context";
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return {
      ...shape,
      message:
        shape.data.code === "INTERNAL_SERVER_ERROR"
          ? "An internal error occurred."
          : shape.message,
      data: { ...shape.data, stack: undefined },
    };
  },
});
export const router = t.router;
export const publicProcedure = t.procedure;
const loggedIn = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.user.active)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in." });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const passwordChanged = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in." });
  if (ctx.user.mustChangePassword)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Please change your password before continuing.",
    });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const profileCompleted = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role === "owner")
    return next({ ctx: { ...ctx, user: ctx.user } });
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database is unavailable.",
    });
  const [profile] = await db
    .select({ completed: wcEmployeeProfiles.profileCompleted })
    .from(wcEmployeeProfiles)
    .where(eq(wcEmployeeProfiles.userId, ctx.user.id))
    .limit(1);
  if (!profile?.completed)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Complete your employee profile before using the workspace.",
    });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const maintenance = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database is unavailable.",
      });
    const [settings] = await db
      .select({ enabled: wcSettings.maintenanceEnabled })
      .from(wcSettings)
      .where(eq(wcSettings.id, 1));
    if (settings?.enabled)
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "The system is temporarily unavailable for maintenance.",
      });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const admin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "owner"))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrator access is required.",
    });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const owner = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "owner")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Owner access is required.",
    });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const businessUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role === "customer")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Customer accounts have read-only workspace access.",
    });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
export const sessionProcedure = t.procedure.use(loggedIn);
export const basicProcedure = sessionProcedure.use(passwordChanged);
export const protectedProcedure = basicProcedure
  .use(profileCompleted)
  .use(maintenance);
export const businessProcedure = basicProcedure
  .use(profileCompleted)
  .use(maintenance)
  .use(businessUser);
export const adminProcedure = basicProcedure
  .use(profileCompleted)
  .use(admin)
  .use(maintenance);
export const ownerProcedure = basicProcedure
  .use(profileCompleted)
  .use(owner)
  .use(maintenance);
