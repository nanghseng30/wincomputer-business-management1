import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNotNull, isNull, ne, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  wcAudit,
  wcCapabilities,
  wcNoticeReads,
  wcNotices,
  wcPermissionRequests,
  wcPriceHistory,
  wcPrices,
  wcReceipts,
  wcExpenses,
  wcReceiptItems,
  wcRefunds,
  wcSessions,
  wcAccountRequests,
  wcSettings,
  wcUsers,
  wcEmployeeProfiles,
  wcRoles,
  wcRoleCapabilities,
  wcUserCapabilities,
  wcProductCategories,
  wcProducts,
  wcServiceTypes,
  wcNotificationReads,
  wcChatMessages,
  type WcUser,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  adminProcedure,
  basicProcedure,
  businessProcedure,
  ownerProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  sessionProcedure,
} from "./_core/trpc";
import {
  approvalConfigured,
  assertSigningConfigured,
  ensureDifferentFromApproval,
  hashPassword,
  isDuplicate,
  newSessionId,
  rateLimit,
  requestIp,
  SESSION_MS,
  sessionHash,
  signSession,
  verifyApproval,
  verifyPassword,
} from "./security";

const success = { success: true } as const;
const id = z.number().int().positive().max(2147483647);
const amount = z.number().int().nonnegative().max(2147483647);
const username = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Use letters, numbers, dots, underscores, or hyphens."
  )
  .transform(s => s.toLowerCase());
const password = z
  .string()
  .min(8, "Password must have at least 8 characters.")
  .max(256);
const credential = z.string().min(1).max(1024);
const shortText = z.string().trim().min(1).max(1000);
const approvedRole = z.enum([
  "admin",
  "staff",
  "accountant",
  "general_worker",
  "technician",
  "sales",
  "marketing",
  "talent",
]);
const accountRole = z.enum([
  "admin",
  "staff",
  "accountant",
  "general_worker",
  "technician",
  "sales",
  "marketing",
  "talent",
  "customer",
]);
const maybeDate = z
  .string()
  .max(40)
  .refine(
    v => !Number.isNaN(Date.parse(v)) && /^\d{4}-\d\d-\d\dT/.test(v),
    "Use a valid date and time."
  )
  .nullable();
const safeUser = (u: WcUser) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  mustChangePassword: u.mustChangePassword,
  customRoleId: u.customRoleId,
});
type SafeUser = ReturnType<typeof safeUser>;
type DeviceType = "phone" | "tablet" | "laptop" | "desktop";
function detectDevice(userAgent: string | undefined): {
  type: DeviceType;
  label: string;
} {
  const ua = (userAgent || "").toLowerCase();
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua))
    return { type: "tablet", label: "Tablet" };
  if (/mobi|iphone|ipod|android/i.test(ua))
    return { type: "phone", label: "Phone" };
  if (/macintosh|windows nt|cros/i.test(ua))
    return { type: "laptop", label: "Laptop / PC" };
  return { type: "desktop", label: "Desktop" };
}
const avatarData = z
  .string()
  .regex(/^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/)
  .max(60000, "Please choose a smaller photo.");
const categories = [
  {
    id: 1,
    key: "laptop_repair",
    nameEn: "Laptop repair",
    nameMm: "Laptop ပြုပြင်ခြင်း",
  },
  {
    id: 2,
    key: "desktop_repair",
    nameEn: "Desktop repair",
    nameMm: "Desktop ပြုပြင်ခြင်း",
  },
  {
    id: 3,
    key: "windows_installation",
    nameEn: "Windows installation",
    nameMm: "Windows တပ်ဆင်ခြင်း",
  },
  {
    id: 4,
    key: "other_software_installation",
    nameEn: "Other software installation",
    nameMm: "အခြား software တပ်ဆင်ခြင်း",
  },
] as const;
async function dbRequired() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database is unavailable.",
    });
  return db;
}
// Transactions and the pooled database share the same insert interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function audit(
  db: any,
  user: WcUser,
  action: string,
  entityType: string,
  entityId: string | number,
  details: object = {}
) {
  await db.insert(wcAudit).values({
    actorId: user.id,
    actorName: user.name,
    action,
    entityType,
    entityId: String(entityId),
    details: JSON.stringify(details),
  });
}
async function notifyServerStatusTransition(
  tx: any,
  actor: WcUser,
  oldStatus: "open" | "closed",
  newStatus: "open" | "closed",
  input: {
    messageEn: string;
    messageMm: string;
    startAt: string | null;
    endAt: string | null;
  }
) {
  if (oldStatus === newStatus) return;
  const users = await tx
    .select({ id: wcUsers.id, role: wcUsers.role })
    .from(wcUsers)
    .where(eq(wcUsers.active, true));
  const closed = newStatus === "closed";
  const schedule = [
    input.startAt && `Start: ${input.startAt}`,
    input.endAt && `End: ${input.endAt}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const actorLineEn = `Changed by ${actor.name} at ${new Date().toISOString()}.`;
  const actorLineMm = `${actor.name} မှ ${new Date().toISOString()} တွင် ပြောင်းလဲခဲ့သည်။`;
  const defaultEn = closed
    ? "Staff business actions are temporarily blocked. Login, notices, password changes, and administration remain available."
    : "Business actions are available again.";
  const defaultMm = closed
    ? "ဝန်ထမ်းများ၏ လုပ်ငန်းလုပ်ဆောင်ချက်များကို ယာယီပိတ်ထားသည်။ Login၊ အသိပေးချက်၊ စကားဝှက်ပြောင်းခြင်းနှင့် စီမံခန့်ခွဲမှုများကို ဆက်လက်အသုံးပြုနိုင်သည်။"
    : "လုပ်ငန်းလုပ်ဆောင်ချက်များကို ပြန်လည်အသုံးပြုနိုင်ပါပြီ။";
  for (const recipient of users) {
    await tx.insert(wcNotices).values({
      titleEn: closed ? "Server closed" : "Server opened",
      titleMm: closed ? "ဆာဗာ ပိတ်ထားသည်" : "ဆာဗာ ဖွင့်ထားသည်",
      bodyEn: [input.messageEn || defaultEn, actorLineEn, schedule]
        .filter(Boolean)
        .join(" "),
      bodyMm: [input.messageMm || defaultMm, actorLineMm, schedule]
        .filter(Boolean)
        .join(" "),
      audience: recipient.role,
      type: "notification",
      targetUserId: recipient.id,
      createdBy: actor.id,
    });
  }
}

async function hasCapability(db: any, user: WcUser, capability: string) {
  if (user.role === "owner" || user.role === "admin") return true;
  const [direct] = await db
    .select({ id: wcUserCapabilities.id })
    .from(wcUserCapabilities)
    .where(
      and(
        eq(wcUserCapabilities.userId, user.id),
        eq(wcUserCapabilities.capability, capability)
      )
    )
    .limit(1);
  if (direct) return true;
  if (!user.customRoleId) return false;
  const [roleGrant] = await db
    .select({ id: wcRoleCapabilities.id })
    .from(wcRoleCapabilities)
    .where(
      and(
        eq(wcRoleCapabilities.roleId, user.customRoleId),
        eq(wcRoleCapabilities.capability, capability)
      )
    )
    .limit(1);
  return !!roleGrant;
}
async function assertCapability(db: any, user: WcUser, capability: string) {
  if (!(await hasCapability(db, user, capability)))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Capability required: ${capability}.`,
    });
}
function csvCell(value: unknown) {
  const s =
    value instanceof Date
      ? value.toISOString()
      : value == null
        ? ""
        : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}
function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "\uFEFF";
  const keys = Object.keys(rows[0]);
  return (
    "\uFEFF" +
    [
      keys.map(csvCell).join(","),
      ...rows.map(r => keys.map(k => csvCell(r[k])).join(",")),
    ].join("\r\n")
  );
}
async function limit(
  req: Parameters<typeof requestIp>[0],
  scope: string,
  subject?: string
) {
  await rateLimit(`${scope}-ip`, requestIp(req), 30);
  if (subject) await rateLimit(`${scope}-subject`, subject, 10);
}
function requireApproval(input: string) {
  if (!approvalConfigured())
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Owner approval password is not configured.",
    });
  if (!verifyApproval(input))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Approval password is incorrect.",
    });
}
function rejectApprovalInReason(reason: string) {
  const secret = process.env.WIN_APPROVAL_PASSWORD;
  if (secret && reason.includes(secret))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Do not include an approval password in the reason.",
    });
}
function receiptSelect() {
  return {
    id: wcReceipts.id,
    number: wcReceipts.number,
    type: wcReceipts.type,
    description: wcReceipts.description,
    amount: wcReceipts.amount,
    method: wcReceipts.method,
    paymentReceived: wcReceipts.paymentReceived,
    status: wcReceipts.status,
    customer: wcReceipts.customer,
    createdAt: wcReceipts.createdAt,
    createdByName: wcUsers.name,
  };
}
async function receiptsList() {
  const db = await dbRequired();
  return db
    .select(receiptSelect())
    .from(wcReceipts)
    .innerJoin(wcUsers, eq(wcReceipts.createdBy, wcUsers.id))
    .orderBy(desc(wcReceipts.id));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findReceipt(db: any, receiptId: number) {
  const [row] = await db
    .select(receiptSelect())
    .from(wcReceipts)
    .innerJoin(wcUsers, eq(wcReceipts.createdBy, wcUsers.id))
    .where(eq(wcReceipts.id, receiptId))
    .limit(1);
  if (!row)
    throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found." });
  return row as {
    id: number;
    number: string;
    type: "sale" | "service";
    description: string;
    amount: number;
    method: "cash" | "kbzpay" | "wavepay";
    paymentReceived: boolean;
    status: "active" | "void" | "refunded";
    customer: string | null;
    createdAt: Date;
    createdByName: string;
  };
}
function exactNumber(n: bigint): number {
  if (
    n > BigInt(Number.MAX_SAFE_INTEGER) ||
    n < BigInt(Number.MIN_SAFE_INTEGER)
  )
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Total is too large to represent safely.",
    });
  return Number(n);
}
export function validateReceiptTransition(
  receipt: { status: "active" | "void" | "refunded"; paymentReceived: boolean },
  action: "void" | "refund"
) {
  if (receipt.status !== "active")
    throw new TRPCError({
      code: "CONFLICT",
      message: "Receipt is no longer active.",
    });
  if (action === "void" && receipt.paymentReceived)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A received payment must be refunded, not voided.",
    });
  if (action === "refund" && !receipt.paymentReceived)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A payment that was not received cannot be refunded.",
    });
}
export function calculateFinancials(
  receipts: {
    amount: number;
    method: "cash" | "kbzpay" | "wavepay";
    paymentReceived: boolean;
    status: "active" | "void" | "refunded";
  }[],
  refunds: { amount: number; method: "cash" | "kbzpay" | "wavepay" }[],
  openingCash: number | null
) {
  let gross = 0n,
    refunded = 0n;
  const methods = { cash: 0n, kbzpay: 0n, wavepay: 0n };
  for (const r of receipts)
    if (r.paymentReceived && r.status !== "void") {
      const n = BigInt(r.amount);
      gross += n;
      methods[r.method] += n;
    }
  for (const r of refunds) {
    const n = BigInt(r.amount);
    refunded += n;
    methods[r.method] -= n;
  }
  return {
    income: exactNumber(gross),
    refunds: exactNumber(refunded),
    openingCash,
    cashBalance:
      openingCash === null
        ? null
        : exactNumber(BigInt(openingCash) + methods.cash),
    byMethod: {
      cash: exactNumber(methods.cash),
      kbzpay: exactNumber(methods.kbzpay),
      wavepay: exactNumber(methods.wavepay),
    },
  };
}

async function notifyAccountChange(
  tx: any,
  actor: WcUser,
  target: WcUser,
  action: "deactivate" | "restore" | "delete" | "role",
  reason = ""
) {
  const verb =
    action === "deactivate"
      ? "deactivated"
      : action === "restore"
        ? "restored"
        : action === "delete"
          ? "deleted"
          : "role changed";
  const mm =
    action === "deactivate"
      ? "ပိတ်ထားသည်"
      : action === "restore"
        ? "ပြန်လည်အသက်ဝင်သည်"
        : action === "delete"
          ? "ဖျက်သိမ်းထားသည်"
          : "အခန်းကဏ္ဍ ပြောင်းလဲထားသည်";
  const recipients = await tx
    .select({ id: wcUsers.id, role: wcUsers.role })
    .from(wcUsers)
    .where(
      and(
        eq(wcUsers.active, true),
        or(
          eq(wcUsers.id, target.id),
          eq(wcUsers.role, "owner"),
          eq(wcUsers.role, "admin")
        )
      )
    );
  for (const recipient of recipients)
    await tx.insert(wcNotices).values({
      titleEn: `Account ${verb}`,
      titleMm: `အကောင့် ${mm}`,
      bodyEn: `${target.name} (${target.username}) was ${verb} by ${actor.name}.${reason ? ` Reason: ${reason}` : ""}`,
      bodyMm: `${target.name} (${target.username}) ကို ${actor.name} မှ ${mm}။${reason ? ` အကြောင်းပြချက်: ${reason}` : ""}`,
      audience: recipient.role,
      type: "notification",
      targetUserId: recipient.id,
      createdBy: actor.id,
    });
}

export const appRouter = router({
  auth: router({
    status: publicProcedure.query(async ({ ctx }) => {
      const db = await dbRequired();
      const [owner] = await db
        .select({ id: wcUsers.id })
        .from(wcUsers)
        .where(eq(wcUsers.ownerGuard, 1))
        .limit(1);
      return {
        initialized: !!owner,
        approvalConfigured: approvalConfigured(),
        user: ctx.user ? safeUser(ctx.user) : null,
      };
    }),
    // Compatibility for an unused starter hook; never exposes hashes or bypasses restrictions.
    me: protectedProcedure.query(
      ({ ctx }): (SafeUser & { email: null }) | null => ({
        ...safeUser(ctx.user),
        email: null,
      })
    ),
    setup: publicProcedure
      .input(
        z.object({ username, password, approvalPassword: credential }).strict()
      )
      .mutation(async ({ ctx, input }) => {
        await limit(ctx.req, "setup", input.username);
        requireApproval(input.approvalPassword);
        ensureDifferentFromApproval(input.password);
        assertSigningConfigured();
        const db = await dbRequired();
        const [existing] = await db
          .select({ id: wcUsers.id })
          .from(wcUsers)
          .where(eq(wcUsers.ownerGuard, 1))
          .limit(1);
        if (existing)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Initial owner setup has already been completed.",
          });
        const passwordHash = await hashPassword(input.password);
        const sid = newSessionId(),
          token = await signSession(sid);
        try {
          await db.transaction(async tx => {
            const [created] = await tx
              .insert(wcUsers)
              .values({
                username: input.username,
                name: input.username,
                passwordHash,
                role: "owner",
                ownerGuard: 1,
              })
              .$returningId();
            const [owner] = await tx
              .select()
              .from(wcUsers)
              .where(eq(wcUsers.id, created.id))
              .limit(1);
            await tx.insert(wcSessions).values({
              id: sessionHash(sid),
              userId: owner.id,
              expiresAt: new Date(Date.now() + SESSION_MS),
              lastSeenAt: new Date(),
              deviceType: detectDevice(ctx.req.headers["user-agent"]).type,
              deviceLabel: detectDevice(ctx.req.headers["user-agent"]).label,
              userAgent: String(ctx.req.headers["user-agent"] || "").slice(
                0,
                320
              ),
            });
            await audit(tx, owner, "owner.setup", "user", owner.id);
          });
        } catch (e) {
          if (isDuplicate(e))
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Initial setup is already complete or the username is unavailable.",
            });
          throw e;
        }
        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: SESSION_MS,
        });
        return success;
      }),
    requestAccount: publicProcedure
      .input(
        z
          .object({
            username,
            name: z.string().trim().min(2).max(120),
            password,
            requestedRole: approvedRole,
            phone: z.string().trim().min(5).max(80),
            businessEmail: z.string().trim().email().max(320),
            address: z.string().trim().min(2).max(500),
            dateOfBirth: z.string().trim().max(20).nullable(),
            nationalId: z.string().trim().max(120).nullable(),
            emergencyContact: z.string().trim().max(300).nullable(),
            jobTitle: z.string().trim().min(2).max(160),
            avatarData,
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        await limit(ctx.req, "account-request", input.username);
        const db = await dbRequired();
        const [owner] = await db
          .select({ id: wcUsers.id })
          .from(wcUsers)
          .where(eq(wcUsers.ownerGuard, 1))
          .limit(1);
        if (!owner)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Owner setup must be completed before requesting access.",
          });
        ensureDifferentFromApproval(input.password);
        const [existingUser] = await db
          .select({ id: wcUsers.id })
          .from(wcUsers)
          .where(eq(wcUsers.username, input.username))
          .limit(1);
        if (existingUser)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username is already in use.",
          });
        const [existingRequest] = await db
          .select({
            id: wcAccountRequests.id,
            status: wcAccountRequests.status,
          })
          .from(wcAccountRequests)
          .where(eq(wcAccountRequests.username, input.username))
          .limit(1);
        if (existingRequest?.status === "pending")
          throw new TRPCError({
            code: "CONFLICT",
            message: "An access request for this username is already pending.",
          });
        const passwordHash = await hashPassword(input.password);
        try {
          await db
            .insert(wcAccountRequests)
            .values({
              username: input.username,
              name: input.name,
              passwordHash,
              requestedRole: input.requestedRole,
              phone: input.phone,
              businessEmail: input.businessEmail,
              address: input.address,
              dateOfBirth: input.dateOfBirth,
              nationalId: input.nationalId,
              emergencyContact: input.emergencyContact,
              jobTitle: input.jobTitle,
              avatarData: input.avatarData,
            })
            .onDuplicateKeyUpdate({
              set: {
                name: input.name,
                passwordHash,
                requestedRole: input.requestedRole,
                phone: input.phone,
                businessEmail: input.businessEmail,
                address: input.address,
                dateOfBirth: input.dateOfBirth,
                nationalId: input.nationalId,
                emergencyContact: input.emergencyContact,
                jobTitle: input.jobTitle,
                avatarData: input.avatarData,
                status: "pending",
                decisionNote: null,
                reviewedBy: null,
                reviewedAt: null,
              },
            });
        } catch (e) {
          if (isDuplicate(e))
            throw new TRPCError({
              code: "CONFLICT",
              message: "Username is already in use or has a pending request.",
            });
          throw e;
        }
        return success;
      }),
    registerCustomer: publicProcedure
      .input(
        z
          .object({
            username,
            name: z.string().trim().min(2).max(120),
            password,
            phone: z.string().trim().min(5).max(80),
            businessEmail: z.string().trim().email().max(320).nullable(),
            address: z.string().trim().max(500).nullable(),
            avatarData: avatarData.nullable().optional(),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        await limit(ctx.req, "customer-register", input.username);
        ensureDifferentFromApproval(input.password);
        assertSigningConfigured();
        const db = await dbRequired();
        const [owner] = await db
          .select({ id: wcUsers.id })
          .from(wcUsers)
          .where(eq(wcUsers.ownerGuard, 1))
          .limit(1);
        if (!owner)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Owner setup must be completed before customer registration.",
          });
        const [existing] = await db
          .select({ id: wcUsers.id })
          .from(wcUsers)
          .where(eq(wcUsers.username, input.username))
          .limit(1);
        if (existing)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username is already in use.",
          });
        const [request] = await db
          .select({ id: wcAccountRequests.id })
          .from(wcAccountRequests)
          .where(eq(wcAccountRequests.username, input.username))
          .limit(1);
        if (request)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username is already reserved by an access request.",
          });
        const passwordHash = await hashPassword(input.password);
        const sid = newSessionId();
        const token = await signSession(sid);
        try {
          await db.transaction(async tx => {
            const [created] = await tx
              .insert(wcUsers)
              .values({
                username: input.username,
                name: input.name,
                passwordHash,
                role: "customer",
                mustChangePassword: false,
              })
              .$returningId();
            await tx.insert(wcEmployeeProfiles).values({
              userId: created.id,
              phone: input.phone,
              businessEmail: input.businessEmail,
              address: input.address,
              jobTitle: "Customer",
              avatarData: input.avatarData ?? null,
              profileCompleted: true,
            });
            await tx.insert(wcNotices).values({
              titleEn: "Customer account created",
              titleMm: "ဖောက်သည်အကောင့် ဖန်တီးပြီးပါပြီ",
              bodyEn:
                "Your customer account is active. Thank you for providing your information respectfully.",
              bodyMm:
                "သင့်ဖောက်သည်အကောင့်ကို အသက်ဝင်စွာ ဖန်တီးပြီးပါပြီ။ အချက်အလက်များကို လေးစားစွာ ဖြည့်သွင်းပေးသည့်အတွက် ကျေးဇူးတင်ပါသည်။",
              audience: "customer",
              type: "notification",
              targetUserId: created.id,
              createdBy: created.id,
            });
            await tx.insert(wcSessions).values({
              id: sessionHash(sid),
              userId: created.id,
              expiresAt: new Date(Date.now() + SESSION_MS),
              lastSeenAt: new Date(),
              deviceType: detectDevice(ctx.req.headers["user-agent"]).type,
              deviceLabel: detectDevice(ctx.req.headers["user-agent"]).label,
              userAgent: String(ctx.req.headers["user-agent"] || "").slice(
                0,
                320
              ),
            });
            const [customer] = await tx
              .select()
              .from(wcUsers)
              .where(eq(wcUsers.id, created.id))
              .limit(1);
            await audit(tx, customer, "customer.register", "user", created.id);
          });
        } catch (e) {
          if (isDuplicate(e))
            throw new TRPCError({
              code: "CONFLICT",
              message: "Username is already in use.",
            });
          throw e;
        }
        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: SESSION_MS,
        });
        return success;
      }),
    heartbeat: sessionProcedure
      .input(
        z
          .object({
            deviceType: z.enum(["phone", "tablet", "laptop", "desktop"]),
            deviceLabel: z.string().trim().min(1).max(80),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.sessionId) return success;
        const db = await dbRequired();
        await db
          .update(wcSessions)
          .set({
            lastSeenAt: new Date(),
            deviceType: input.deviceType,
            deviceLabel: input.deviceLabel,
            userAgent: String(ctx.req.headers["user-agent"] || "").slice(
              0,
              320
            ),
          })
          .where(eq(wcSessions.id, sessionHash(ctx.sessionId)));
        return success;
      }),
    login: publicProcedure
      .input(z.object({ username, password: credential }).strict())
      .mutation(async ({ ctx, input }) => {
        await limit(ctx.req, "login", input.username);
        assertSigningConfigured();
        const db = await dbRequired();
        const [user] = await db
          .select()
          .from(wcUsers)
          .where(eq(wcUsers.username, input.username))
          .limit(1);
        // Equal work for a missing account, without creating a user or recording credentials.
        const dummy =
          "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
        const valid = await verifyPassword(
          input.password,
          user?.passwordHash ?? dummy
        );
        if (!valid || !user || !user.active)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Incorrect username or password.",
          });
        const sid = newSessionId(),
          token = await signSession(sid);
        await db.transaction(async tx => {
          // Lock the account so a simultaneous password reset cannot leave a new valid session.
          const [latest] = await tx
            .select()
            .from(wcUsers)
            .where(eq(wcUsers.id, user.id))
            .for("update");
          if (!latest?.active || latest.passwordHash !== user.passwordHash)
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Please try signing in again.",
            });
          await tx.insert(wcSessions).values({
            id: sessionHash(sid),
            userId: user.id,
            expiresAt: new Date(Date.now() + SESSION_MS),
            lastSeenAt: new Date(),
            deviceType: detectDevice(ctx.req.headers["user-agent"]).type,
            deviceLabel: detectDevice(ctx.req.headers["user-agent"]).label,
            userAgent: String(ctx.req.headers["user-agent"] || "").slice(
              0,
              320
            ),
          });
          await audit(tx, latest, "auth.login", "user", user.id);
          await tx.insert(wcNotices).values({
            titleEn: `Sign-in confirmed: ${latest.name}`,
            titleMm: `အကောင့်ဝင်ရောက်မှု အတည်ပြုပါသည်: ${latest.name}`,
            bodyEn: `You signed in as ${latest.name}, ${latest.role}.`,
            bodyMm: `${latest.name}၊ ${latest.role} အဖြစ် အကောင့်ဝင်ရောက်ထားပါသည်။`,
            audience: latest.role,
            type: "notification",
            targetUserId: latest.id,
            createdBy: latest.id,
          });
        });
        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: SESSION_MS,
        });
        return success;
      }),
    changePassword: sessionProcedure
      .input(
        z
          .object({ currentPassword: credential, newPassword: password })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        await limit(ctx.req, "password-change", String(ctx.user.id));
        ensureDifferentFromApproval(input.newPassword);
        if (input.currentPassword === input.newPassword)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Choose a new password different from your current password.",
          });
        if (
          !(await verifyPassword(input.currentPassword, ctx.user.passwordHash))
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Current password is incorrect.",
          });
        const hash = await hashPassword(input.newPassword);
        const db = await dbRequired();
        await db.transaction(async tx => {
          const [latest] = await tx
            .select()
            .from(wcUsers)
            .where(eq(wcUsers.id, ctx.user.id))
            .for("update");
          if (!latest?.active || latest.passwordHash !== ctx.user.passwordHash)
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Please log in again.",
            });
          await tx
            .update(wcUsers)
            .set({ passwordHash: hash, mustChangePassword: false })
            .where(eq(wcUsers.id, ctx.user.id));
          await tx.delete(wcSessions).where(eq(wcSessions.userId, ctx.user.id));
          // Keep only the current session; all other sessions are revoked.
          if (ctx.sessionId)
            await tx.insert(wcSessions).values({
              id: sessionHash(ctx.sessionId),
              userId: ctx.user.id,
              expiresAt: new Date(Date.now() + SESSION_MS),
            });
          await audit(tx, latest, "auth.change_password", "user", latest.id);
        });
        return success;
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.sessionId) {
        const db = await dbRequired();
        await db
          .delete(wcSessions)
          .where(eq(wcSessions.id, sessionHash(ctx.sessionId)));
      }
      ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
      return success;
    }),
  }),
  profile: router({
    get: basicProcedure.query(async ({ ctx }) => {
      const db = await dbRequired();
      const [profile] = await db
        .select()
        .from(wcEmployeeProfiles)
        .where(eq(wcEmployeeProfiles.userId, ctx.user.id))
        .limit(1);
      return (
        profile ?? {
          userId: ctx.user.id,
          phone: null,
          businessEmail: null,
          address: null,
          dateOfBirth: null,
          nationalId: null,
          emergencyContact: null,
          jobTitle: null,
          department: null,
          avatarReference: null,
          avatarData: null,
          profileCompleted: false,
        }
      );
    }),
    update: basicProcedure
      .input(
        z
          .object({
            phone: z.string().trim().max(80).nullable(),
            businessEmail: z.string().trim().email().max(320).nullable(),
            address: z.string().trim().max(500).nullable(),
            dateOfBirth: z.string().trim().max(20).nullable(),
            nationalId: z.string().trim().max(120).nullable(),
            emergencyContact: z.string().trim().max(300).nullable(),
            jobTitle: z.string().trim().max(160).nullable(),
            department: z.string().trim().max(160).nullable(),
            avatarReference: z.string().trim().max(500).nullable(),
            avatarData: avatarData.nullable().optional(),
            profileCompleted: z.boolean(),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        const { avatarData: nextAvatarData, ...profileInput } = input;
        await db.transaction(async tx => {
          await tx
            .insert(wcEmployeeProfiles)
            .values({
              userId: ctx.user.id,
              ...profileInput,
              avatarData: nextAvatarData ?? null,
            })
            .onDuplicateKeyUpdate({
              set: {
                ...profileInput,
                ...(nextAvatarData !== undefined
                  ? { avatarData: nextAvatarData }
                  : {}),
              },
            });
          await audit(
            tx,
            ctx.user,
            "profile.update",
            "employee_profile",
            ctx.user.id,
            {
              ...profileInput,
              avatarData: nextAvatarData ? "[image]" : null,
              nationalId: input.nationalId ? "[redacted]" : null,
            }
          );
        });
        return success;
      }),
  }),
  overview: router({
    stats: protectedProcedure.query(async () => {
      const db = await dbRequired();
      return db.transaction(async tx => {
        const receipts = await tx
          .select({
            amount: wcReceipts.amount,
            method: wcReceipts.method,
            paymentReceived: wcReceipts.paymentReceived,
            status: wcReceipts.status,
            createdAt: wcReceipts.createdAt,
          })
          .from(wcReceipts);
        const refunds = await tx
          .select({ amount: wcRefunds.amount, method: wcRefunds.method })
          .from(wcRefunds);
        const expenses = await tx
          .select({
            amount: wcExpenses.amount,
            createdAt: wcExpenses.createdAt,
          })
          .from(wcExpenses);
        const settings = await tx
          .select({ openingCash: wcSettings.openingCash })
          .from(wcSettings)
          .where(eq(wcSettings.id, 1))
          .limit(1);
        const recent = await tx
          .select(receiptSelect())
          .from(wcReceipts)
          .innerJoin(wcUsers, eq(wcReceipts.createdBy, wcUsers.id))
          .orderBy(desc(wcReceipts.id))
          .limit(5);
        const dailyReports = Array.from({ length: 7 }, (_, offset) => {
          const date = new Date();
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() - (6 - offset));
          return {
            date: date.toISOString().slice(0, 10),
            receipts: 0,
            total: 0,
            received: 0,
            pending: 0,
            expenses: 0,
            profit: 0,
          };
        });
        const dailyMap = new Map(dailyReports.map(row => [row.date, row]));
        for (const receipt of receipts) {
          const row = dailyMap.get(
            new Date(receipt.createdAt).toISOString().slice(0, 10)
          );
          if (!row || receipt.status !== "active") continue;
          row.receipts += 1;
          row.total += receipt.amount;
          if (receipt.paymentReceived) row.received += receipt.amount;
          else row.pending += receipt.amount;
        }
        for (const expense of expenses) {
          const row = dailyMap.get(
            new Date(expense.createdAt).toISOString().slice(0, 10)
          );
          if (row) row.expenses += expense.amount;
        }
        for (const row of dailyReports)
          row.profit = row.received - row.expenses;
        const expenseTotal = expenses.reduce(
          (sum, item) => sum + item.amount,
          0
        );
        return {
          receiptsCount: receipts.length,
          ...calculateFinancials(
            receipts,
            refunds,
            settings[0]?.openingCash ?? null
          ),
          expenses: expenseTotal,
          profit:
            calculateFinancials(receipts, refunds, null).income - expenseTotal,
          recentReceipts: recent,
          dailyReports,
        };
      });
    }),
  }),
  expenses: router({
    list: businessProcedure.query(async ({ ctx }) => {
      const db = await dbRequired();
      await assertCapability(db, ctx.user, "manage_expenses");
      return db.select().from(wcExpenses).orderBy(desc(wcExpenses.id));
    }),
    create: businessProcedure
      .input(
        z
          .object({
            category: shortText,
            description: shortText,
            amount,
            method: z.enum(["cash", "kbzpay", "wavepay"]),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await assertCapability(db, ctx.user, "manage_expenses");
        const [row] = await db
          .insert(wcExpenses)
          .values({ ...input, createdBy: ctx.user.id })
          .$returningId();
        await audit(db, ctx.user, "expense.create", "expense", row.id, input);
        return { ...success, id: row.id };
      }),
  }),
  receipts: router({
    list: protectedProcedure.query(receiptsList),
    create: businessProcedure
      .input(
        z
          .object({
            type: z.enum(["sale", "service"]),
            description: shortText,
            amount,
            method: z.enum(["cash", "kbzpay", "wavepay"]),
            paymentReceived: z.boolean(),
            customer: z.string().trim().max(200).optional(),
            items: z
              .array(
                z
                  .object({
                    productId: id.optional(),
                    serviceTypeId: id.optional(),
                    description: shortText,
                    quantity: z.number().int().positive().max(100000),
                    unitPrice: amount,
                  })
                  .strict()
              )
              .max(100)
              .optional(),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        const number = `WC-${Date.now().toString(36).toUpperCase()}-${randomBytes(6).toString("hex").toUpperCase()}`;
        return db.transaction(async tx => {
          const [created] = await tx
            .insert(wcReceipts)
            .values({
              ...input,
              customer: input.customer || null,
              number,
              createdBy: ctx.user.id,
            })
            .$returningId();
          if (input.items?.length) {
            const total = input.items.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0
            );
            if (total !== input.amount)
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Receipt amount must equal the item total.",
              });
            for (const item of input.items) {
              if ((item.productId ? 1 : 0) + (item.serviceTypeId ? 1 : 0) !== 1)
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message:
                    "Each item must reference exactly one product or service.",
                });
              await tx.insert(wcReceiptItems).values({
                receiptId: created.id,
                productId: item.productId ?? null,
                serviceTypeId: item.serviceTypeId ?? null,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.quantity * item.unitPrice,
              });
            }
          }
          await audit(tx, ctx.user, "receipt.create", "receipt", created.id, {
            number,
            amount: input.amount,
            method: input.method,
            paymentReceived: input.paymentReceived,
            itemCount: input.items?.length ?? 0,
          });
          return findReceipt(tx, created.id);
        });
      }),
    transition: adminProcedure
      .input(
        z
          .object({
            id,
            action: z.enum(["void", "refund"]),
            reason: shortText,
            approvalPassword: credential,
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        await limit(ctx.req, "approval", String(ctx.user.id));
        requireApproval(input.approvalPassword);
        rejectApprovalInReason(input.reason);
        const db = await dbRequired();
        return db.transaction(async tx => {
          const [receipt] = await tx
            .select()
            .from(wcReceipts)
            .where(eq(wcReceipts.id, input.id))
            .for("update");
          if (!receipt)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Receipt not found.",
            });
          validateReceiptTransition(receipt, input.action);
          const next = input.action === "void" ? "void" : "refunded";
          await tx
            .update(wcReceipts)
            .set({ status: next })
            .where(eq(wcReceipts.id, receipt.id));
          if (next === "refunded")
            await tx.insert(wcRefunds).values({
              receiptId: receipt.id,
              amount: receipt.amount,
              method: receipt.method,
              actorId: ctx.user.id,
              reason: input.reason,
            });
          await audit(
            tx,
            ctx.user,
            `receipt.${input.action}`,
            "receipt",
            receipt.id,
            {
              oldStatus: "active",
              newStatus: next,
              reason: input.reason,
              approverId: ctx.user.id,
              approverRole: ctx.user.role,
              approvalPasswordVerified: true,
            }
          );
          return findReceipt(tx, receipt.id);
        });
      }),
  }),
  prices: router({
    list: protectedProcedure.query(async () => {
      const db = await dbRequired();
      const stored = await db.select().from(wcPrices);
      return categories.map(c => {
        const p = stored.find(x => x.id === c.id);
        return {
          ...c,
          amount: p?.amount ?? null,
          updatedAt: p?.updatedAt ?? null,
        };
      });
    }),
    update: businessProcedure
      .input(z.object({ id, amount: amount.nullable() }).strict())
      .mutation(async ({ ctx, input }) => {
        if (!categories.some(c => c.id === input.id))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unknown service category.",
          });
        const db = await dbRequired();
        await assertCapability(db, ctx.user, "manage_prices");
        await db.transaction(async tx => {
          await tx
            .insert(wcPrices)
            .values({ id: input.id, amount: null })
            .onDuplicateKeyUpdate({ set: { id: input.id } });
          const [old] = await tx
            .select()
            .from(wcPrices)
            .where(eq(wcPrices.id, input.id))
            .for("update");
          await tx
            .update(wcPrices)
            .set({ amount: input.amount, updatedAt: new Date() })
            .where(eq(wcPrices.id, input.id));
          await tx.insert(wcPriceHistory).values({
            priceId: input.id,
            oldAmount: old.amount,
            newAmount: input.amount,
            actorId: ctx.user.id,
          });
          await audit(tx, ctx.user, "price.update", "price", input.id, {
            oldAmount: old.amount,
            newAmount: input.amount,
          });
        });
        return success;
      }),
  }),
  team: router({
    list: adminProcedure.query(async () => {
      const db = await dbRequired();
      return db
        .select({
          id: wcUsers.id,
          username: wcUsers.username,
          name: wcUsers.name,
          role: wcUsers.role,
          mustChangePassword: wcUsers.mustChangePassword,
          active: wcUsers.active,
          avatarData: wcEmployeeProfiles.avatarData,
          avatarReference: wcEmployeeProfiles.avatarReference,
          jobTitle: wcEmployeeProfiles.jobTitle,
          department: wcEmployeeProfiles.department,
        })
        .from(wcUsers)
        .leftJoin(wcEmployeeProfiles, eq(wcEmployeeProfiles.userId, wcUsers.id))
        .where(isNull(wcUsers.deletedAt))
        .orderBy(wcUsers.id);
    }),
    requests: ownerProcedure.query(async () => {
      const db = await dbRequired();
      return db
        .select({
          id: wcAccountRequests.id,
          username: wcAccountRequests.username,
          name: wcAccountRequests.name,
          requestedRole: wcAccountRequests.requestedRole,
          phone: wcAccountRequests.phone,
          businessEmail: wcAccountRequests.businessEmail,
          address: wcAccountRequests.address,
          dateOfBirth: wcAccountRequests.dateOfBirth,
          nationalId: wcAccountRequests.nationalId,
          emergencyContact: wcAccountRequests.emergencyContact,
          jobTitle: wcAccountRequests.jobTitle,
          avatarData: wcAccountRequests.avatarData,
          status: wcAccountRequests.status,
          decisionNote: wcAccountRequests.decisionNote,
          createdAt: wcAccountRequests.createdAt,
        })
        .from(wcAccountRequests)
        .where(eq(wcAccountRequests.status, "pending"))
        .orderBy(desc(wcAccountRequests.id));
    }),
    decideRequest: ownerProcedure
      .input(
        z
          .object({
            id,
            decision: z.enum(["approved", "rejected"]),
            note: z.string().trim().max(1000),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await db.transaction(async tx => {
          const [request] = await tx
            .select()
            .from(wcAccountRequests)
            .where(eq(wcAccountRequests.id, input.id))
            .for("update");
          if (!request || request.status !== "pending")
            throw new TRPCError({
              code: "CONFLICT",
              message: "This account request has already been reviewed.",
            });
          if (input.decision === "rejected") {
            await tx
              .update(wcAccountRequests)
              .set({
                status: "rejected",
                decisionNote: input.note || null,
                reviewedBy: ctx.user.id,
                reviewedAt: new Date(),
              })
              .where(eq(wcAccountRequests.id, input.id));
            await audit(
              tx,
              ctx.user,
              "account_request.reject",
              "account_request",
              input.id,
              {
                username: request.username,
                note: input.note || null,
              }
            );
            return;
          }
          const [existing] = await tx
            .select({ id: wcUsers.id })
            .from(wcUsers)
            .where(eq(wcUsers.username, request.username))
            .limit(1);
          if (existing)
            throw new TRPCError({
              code: "CONFLICT",
              message: "Username is already in use.",
            });
          const [created] = await tx
            .insert(wcUsers)
            .values({
              username: request.username,
              name: request.name,
              passwordHash: request.passwordHash,
              role: request.requestedRole,
              mustChangePassword: false,
            })
            .$returningId();
          await tx.insert(wcEmployeeProfiles).values({
            userId: created.id,
            phone: request.phone,
            businessEmail: request.businessEmail,
            address: request.address,
            dateOfBirth: request.dateOfBirth,
            nationalId: request.nationalId,
            emergencyContact: request.emergencyContact,
            jobTitle: request.jobTitle,
            avatarData: request.avatarData,
            profileCompleted: false,
          });
          await tx
            .update(wcAccountRequests)
            .set({
              status: "approved",
              decisionNote: input.note || null,
              reviewedBy: ctx.user.id,
              reviewedAt: new Date(),
            })
            .where(eq(wcAccountRequests.id, input.id));
          await tx.insert(wcNotices).values({
            titleEn: "Your Win Computer account is approved",
            titleMm: "သင့် Win Computer အကောင့်ကို ခွင့်ပြုပြီးပါပြီ",
            bodyEn: `Your ${request.requestedRole.replace("_", " ")} account is approved. Please complete your profile before using the workspace.`,
            bodyMm: `${request.requestedRole.replace("_", " ")} ရာထူးအကောင့်ကို Owner မှ ခွင့်ပြုပြီးပါပြီ။ Workspace အသုံးမပြုမီ ကိုယ်ရေးအချက်အလက်ကို ဖြည့်စွက်ပေးပါ။`,
            audience: request.requestedRole,
            type: "notification",
            targetUserId: created.id,
            createdBy: ctx.user.id,
          });
          await audit(
            tx,
            ctx.user,
            "account_request.approve",
            "account_request",
            input.id,
            {
              username: request.username,
              createdUserId: created.id,
              role: request.requestedRole,
              note: input.note || null,
            }
          );
        });
        return success;
      }),
    create: ownerProcedure
      .input(
        z
          .object({
            username,
            name: z.string().trim().min(1).max(120),
            password,
            role: approvedRole,
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        ensureDifferentFromApproval(input.password);
        if (input.role === "admin" && ctx.user.role !== "owner")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner may create administrator accounts.",
          });
        const db = await dbRequired(),
          passwordHash = await hashPassword(input.password);
        try {
          await db.transaction(async tx => {
            const [created] = await tx
              .insert(wcUsers)
              .values({
                username: input.username,
                name: input.name,
                passwordHash,
                role: input.role,
                mustChangePassword: true,
              })
              .$returningId();
            await audit(tx, ctx.user, "team.create", "user", created.id, {
              username: input.username,
              role: input.role,
            });
            await tx.insert(wcNotices).values({
              titleEn: "Complete your employee profile",
              titleMm: "ဝန်ထမ်းကိုယ်ရေးအချက်အလက် ဖြည့်စွက်ပါ",
              bodyEn:
                "Please complete your business contact profile after signing in.",
              bodyMm:
                "အကောင့်ဝင်ပြီး လုပ်ငန်းဆက်သွယ်ရန် ကိုယ်ရေးအချက်အလက်များ ဖြည့်စွက်ပါ။",
              audience: input.role,
              type: "notification",
              targetUserId: created.id,
              createdBy: ctx.user.id,
            });
          });
        } catch (e) {
          if (isDuplicate(e))
            throw new TRPCError({
              code: "CONFLICT",
              message: "Username is already in use.",
            });
          throw e;
        }
        return success;
      }),
    update: ownerProcedure
      .input(
        z
          .object({
            id,
            name: z.string().trim().min(1).max(120),
            role: accountRole,
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        const [target] = await db
          .select()
          .from(wcUsers)
          .where(eq(wcUsers.id, input.id))
          .limit(1);
        if (!target || target.role === "owner" || target.id === ctx.user.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This account cannot be edited here.",
          });
        if (
          ctx.user.role !== "owner" &&
          (target.role === "admin" || input.role === "admin")
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner may change administrator authority.",
          });
        await db
          .update(wcUsers)
          .set({ name: input.name, role: input.role })
          .where(eq(wcUsers.id, input.id));
        await audit(db, ctx.user, "team.update", "user", input.id, {
          name: input.name,
          role: input.role,
        });
        await db.insert(wcNotices).values({
          titleEn: "Account role updated",
          titleMm: "အကောင့်အခန်းကဏ္ဍ ပြောင်းလဲပြီးပါပြီ",
          bodyEn: `Your account role was updated by ${ctx.user.name}.`,
          bodyMm: `${ctx.user.name} မှ သင့်အကောင့်အခန်းကဏ္ဍကို ပြောင်းလဲလိုက်ပါပြီ။`,
          audience: target.role,
          type: "notification",
          targetUserId: target.id,
          createdBy: ctx.user.id,
        });
        return success;
      }),
    reset: ownerProcedure
      .input(z.object({ id, password }).strict())
      .mutation(async ({ ctx, input }) => {
        ensureDifferentFromApproval(input.password);
        const db = await dbRequired(),
          passwordHash = await hashPassword(input.password);
        await db.transaction(async tx => {
          const [target] = await tx
            .select()
            .from(wcUsers)
            .where(eq(wcUsers.id, input.id))
            .for("update");
          if (!target)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found.",
            });
          if (target.role === "owner")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "The owner must change their own password.",
            });
          if (target.id === ctx.user.id)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Use change password for your own account.",
            });
          await tx
            .update(wcUsers)
            .set({ passwordHash, mustChangePassword: true })
            .where(eq(wcUsers.id, target.id));
          await tx.delete(wcSessions).where(eq(wcSessions.userId, target.id));
          await audit(tx, ctx.user, "team.reset_password", "user", target.id);
        });
        return success;
      }),
  }),
  presence: router({
    list: adminProcedure.query(async () => {
      const db = await dbRequired();
      const cutoff = new Date(Date.now() - 90_000);
      const people = await db
        .select({
          id: wcUsers.id,
          name: wcUsers.name,
          username: wcUsers.username,
          role: wcUsers.role,
        })
        .from(wcUsers)
        .where(eq(wcUsers.active, true))
        .orderBy(wcUsers.name);
      const sessions = await db
        .select({
          sessionId: wcSessions.id,
          userId: wcSessions.userId,
          deviceType: wcSessions.deviceType,
          deviceLabel: wcSessions.deviceLabel,
          lastSeenAt: wcSessions.lastSeenAt,
        })
        .from(wcSessions)
        .where(gt(wcSessions.expiresAt, new Date()))
        .orderBy(desc(wcSessions.lastSeenAt));
      const latest = new Map<number, (typeof sessions)[number]>();
      for (const session of sessions) {
        if (!latest.has(session.userId)) latest.set(session.userId, session);
      }
      return people.map(person => {
        const session = latest.get(person.id);
        const lastSeenAt = session?.lastSeenAt ?? null;
        const online = Boolean(lastSeenAt && lastSeenAt > cutoff);
        return {
          ...person,
          sessionId: session?.sessionId ?? null,
          deviceType: session?.deviceType ?? null,
          deviceLabel: session?.deviceLabel ?? null,
          lastSeenAt,
          online,
          offlineSeconds: lastSeenAt
            ? Math.max(
                0,
                Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000)
              )
            : null,
        };
      });
    }),
  }),
  permissions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbRequired();
      return db
        .select({
          id: wcPermissionRequests.id,
          requesterId: wcPermissionRequests.requesterId,
          requesterName: wcUsers.name,
          capability: wcPermissionRequests.capability,
          reason: wcPermissionRequests.reason,
          status: wcPermissionRequests.status,
          createdAt: wcPermissionRequests.createdAt,
          decisionNote: wcPermissionRequests.decisionNote,
        })
        .from(wcPermissionRequests)
        .innerJoin(wcUsers, eq(wcUsers.id, wcPermissionRequests.requesterId))
        .where(
          ctx.user.role === "staff"
            ? eq(wcPermissionRequests.requesterId, ctx.user.id)
            : undefined
        )
        .orderBy(desc(wcPermissionRequests.id));
    }),
    request: protectedProcedure
      .input(
        z
          .object({ capability: z.literal("manage_prices"), reason: shortText })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "staff")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Administrators already have this permission.",
          });
        rejectApprovalInReason(input.reason);
        const db = await dbRequired();
        await db.transaction(async tx => {
          const [created] = await tx
            .insert(wcPermissionRequests)
            .values({ ...input, requesterId: ctx.user.id })
            .$returningId();
          const admins = await tx
            .select({ id: wcUsers.id, role: wcUsers.role })
            .from(wcUsers)
            .where(
              and(
                eq(wcUsers.active, true),
                or(eq(wcUsers.role, "admin"), eq(wcUsers.role, "owner"))
              )
            );
          for (const a of admins)
            await tx.insert(wcNotices).values({
              titleEn: "Permission request",
              titleMm: "လုပ်ပိုင်ခွင့်တောင်းဆိုချက်",
              bodyEn: `${ctx.user.name} requested permission to manage prices.`,
              bodyMm: `${ctx.user.name} က ဈေးနှုန်းစီမံခွင့် တောင်းဆိုထားပါသည်။`,
              audience: a.role,
              type: "notification",
              targetUserId: a.id,
              createdBy: ctx.user.id,
            });
          await audit(
            tx,
            ctx.user,
            "permission.request",
            "permission",
            created.id,
            { capability: input.capability, reason: input.reason }
          );
        });
        return success;
      }),
    decide: ownerProcedure
      .input(
        z
          .object({
            id,
            decision: z.enum(["approved", "rejected"]),
            note: z.string().trim().max(1000),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        rejectApprovalInReason(input.note);
        const db = await dbRequired();
        await db.transaction(async tx => {
          const [request] = await tx
            .select()
            .from(wcPermissionRequests)
            .where(eq(wcPermissionRequests.id, input.id))
            .for("update");
          if (!request)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Permission request not found.",
            });
          if (request.status !== "pending")
            throw new TRPCError({
              code: "CONFLICT",
              message: "This request has already been decided.",
            });
          await tx
            .update(wcPermissionRequests)
            .set({
              status: input.decision,
              decisionNote: input.note || null,
              decidedBy: ctx.user.id,
              decidedAt: new Date(),
            })
            .where(eq(wcPermissionRequests.id, input.id));
          if (input.decision === "approved")
            await tx
              .insert(wcCapabilities)
              .values({
                userId: request.requesterId,
                capability: request.capability,
                grantedBy: ctx.user.id,
              })
              .onDuplicateKeyUpdate({ set: { grantedBy: ctx.user.id } });
          const [recipient] = await tx
            .select()
            .from(wcUsers)
            .where(eq(wcUsers.id, request.requesterId));
          if (recipient)
            await tx.insert(wcNotices).values({
              titleEn: "Permission decision",
              titleMm: "လုပ်ပိုင်ခွင့် ဆုံးဖြတ်ချက်",
              bodyEn: `Your price management request was ${input.decision}.`,
              bodyMm:
                input.decision === "approved"
                  ? "သင့်ဈေးနှုန်းစီမံခွင့်ကို ခွင့်ပြုပြီးပါပြီ။"
                  : "သင့်ဈေးနှုန်းစီမံခွင့်ကို ငြင်းပယ်ထားပါသည်။",
              audience: recipient.role,
              type: "notification",
              targetUserId: recipient.id,
              createdBy: ctx.user.id,
            });
          await audit(
            tx,
            ctx.user,
            "permission.decide",
            "permission",
            request.id,
            {
              decision: input.decision,
              note: input.note,
              requesterId: request.requesterId,
              capability: request.capability,
            }
          );
        });
        return success;
      }),
  }),
  notices: router({
    list: basicProcedure.query(async ({ ctx }) => {
      const db = await dbRequired();
      const rows = await db
        .select({
          id: wcNotices.id,
          titleEn: wcNotices.titleEn,
          titleMm: wcNotices.titleMm,
          bodyEn: wcNotices.bodyEn,
          bodyMm: wcNotices.bodyMm,
          audience: wcNotices.audience,
          type: wcNotices.type,
          readId: wcNoticeReads.id,
          createdAt: wcNotices.createdAt,
        })
        .from(wcNotices)
        .leftJoin(
          wcNoticeReads,
          and(
            eq(wcNoticeReads.noticeId, wcNotices.id),
            eq(wcNoticeReads.userId, ctx.user.id)
          )
        )
        .where(
          and(
            or(
              eq(wcNotices.audience, "all"),
              eq(wcNotices.audience, ctx.user.role)
            ),
            or(
              isNull(wcNotices.targetUserId),
              eq(wcNotices.targetUserId, ctx.user.id)
            )
          )
        )
        .orderBy(desc(wcNotices.id));
      return rows.map(({ readId, ...notice }) => ({
        ...notice,
        read: readId !== null,
      }));
    }),
    create: ownerProcedure
      .input(
        z
          .object({
            titleEn: z.string().trim().min(1).max(200),
            titleMm: z.string().trim().min(1).max(200),
            bodyEn: z.string().trim().min(1).max(2000),
            bodyMm: z.string().trim().min(1).max(2000),
            audience: z.enum(["all", "owner", "admin", "staff"]),
            type: z.enum(["announcement", "maintenance"]),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await db.transaction(async tx => {
          const [created] = await tx
            .insert(wcNotices)
            .values({ ...input, createdBy: ctx.user.id })
            .$returningId();
          await audit(tx, ctx.user, "notice.create", "notice", created.id, {
            audience: input.audience,
            type: input.type,
          });
        });
        return success;
      }),
    markRead: basicProcedure
      .input(z.object({ id }).strict())
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        const [notice] = await db
          .select({ id: wcNotices.id })
          .from(wcNotices)
          .where(
            and(
              eq(wcNotices.id, input.id),
              or(
                eq(wcNotices.audience, "all"),
                eq(wcNotices.audience, ctx.user.role)
              ),
              or(
                isNull(wcNotices.targetUserId),
                eq(wcNotices.targetUserId, ctx.user.id)
              )
            )
          )
          .limit(1);
        if (!notice)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notice not found.",
          });
        await db
          .insert(wcNoticeReads)
          .values({ noticeId: input.id, userId: ctx.user.id })
          .onDuplicateKeyUpdate({ set: { noticeId: input.id } });
        return success;
      }),
  }),
  admin: router({
    serverStatus: basicProcedure.query(async () => {
      const db = await dbRequired();
      const [s] = await db
        .select()
        .from(wcSettings)
        .where(eq(wcSettings.id, 1))
        .limit(1);
      return {
        status: s?.maintenanceEnabled ? ("closed" as const) : ("open" as const),
        messageEn: s?.messageEn ?? "",
        messageMm: s?.messageMm ?? "",
        startAt: s?.startAt ?? null,
        endAt: s?.endAt ?? null,
        scheduleIsConfigured: !!(s?.startAt || s?.endAt),
        note: "Schedule fields are informational; no background scheduler is claimed." as const,
      };
    }),
    maintenance: basicProcedure.query(async () => {
      const db = await dbRequired();
      const [s] = await db
        .select()
        .from(wcSettings)
        .where(eq(wcSettings.id, 1))
        .limit(1);
      return {
        enabled: s?.maintenanceEnabled ?? false,
        messageEn: s?.messageEn ?? "",
        messageMm: s?.messageMm ?? "",
        startAt: s?.startAt ?? null,
        endAt: s?.endAt ?? null,
      };
    }),
    setServerStatus: ownerProcedure
      .input(
        z
          .object({
            status: z.enum(["open", "closed"]),
            messageEn: z.string().trim().max(1000),
            messageMm: z.string().trim().max(1000),
            startAt: maybeDate,
            endAt: maybeDate,
          })
          .strict()
          .refine(
            v =>
              !v.startAt ||
              !v.endAt ||
              Date.parse(v.startAt) <= Date.parse(v.endAt),
            "End time must be after start time."
          )
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await db.transaction(async tx => {
          await tx
            .insert(wcSettings)
            .values({ id: 1 })
            .onDuplicateKeyUpdate({ set: { id: 1 } });
          const [old] = await tx
            .select()
            .from(wcSettings)
            .where(eq(wcSettings.id, 1))
            .for("update");
          const oldStatus = old.maintenanceEnabled ? "closed" : "open";
          const newStatus = input.status;
          await tx
            .update(wcSettings)
            .set({
              maintenanceEnabled: newStatus === "closed",
              messageEn: input.messageEn,
              messageMm: input.messageMm,
              startAt: input.startAt,
              endAt: input.endAt,
            })
            .where(eq(wcSettings.id, 1));
          await audit(tx, ctx.user, "settings.server_status", "settings", 1, {
            oldStatus,
            newStatus,
            actor: ctx.user.name,
            messageEn: input.messageEn,
            messageMm: input.messageMm,
            startAt: input.startAt,
            endAt: input.endAt,
          });
          await notifyServerStatusTransition(
            tx,
            ctx.user,
            oldStatus,
            newStatus,
            input
          );
        });
        return success;
      }),
    setMaintenance: ownerProcedure
      .input(
        z
          .object({
            enabled: z.boolean(),
            messageEn: z.string().trim().max(1000),
            messageMm: z.string().trim().max(1000),
            startAt: maybeDate,
            endAt: maybeDate,
          })
          .strict()
          .refine(
            v =>
              !v.startAt ||
              !v.endAt ||
              Date.parse(v.startAt) <= Date.parse(v.endAt),
            "End time must be after start time."
          )
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await db.transaction(async tx => {
          await tx
            .insert(wcSettings)
            .values({ id: 1 })
            .onDuplicateKeyUpdate({ set: { id: 1 } });
          const [old] = await tx
            .select()
            .from(wcSettings)
            .where(eq(wcSettings.id, 1))
            .for("update");
          const oldStatus = old.maintenanceEnabled ? "closed" : "open";
          const newStatus = input.enabled ? "closed" : "open";
          await tx
            .update(wcSettings)
            .set({
              maintenanceEnabled: input.enabled,
              messageEn: input.messageEn,
              messageMm: input.messageMm,
              startAt: input.startAt,
              endAt: input.endAt,
            })
            .where(eq(wcSettings.id, 1));
          await audit(tx, ctx.user, "settings.maintenance", "settings", 1, {
            oldStatus,
            newStatus,
            oldEnabled: old.maintenanceEnabled,
            newEnabled: input.enabled,
            startAt: input.startAt,
            endAt: input.endAt,
          });
          await notifyServerStatusTransition(
            tx,
            ctx.user,
            oldStatus,
            newStatus,
            input
          );
        });
        return success;
      }),
    setOpeningCash: ownerProcedure
      .input(z.object({ amount }).strict())
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await db.transaction(async tx => {
          await tx
            .insert(wcSettings)
            .values({ id: 1 })
            .onDuplicateKeyUpdate({ set: { id: 1 } });
          const [old] = await tx
            .select()
            .from(wcSettings)
            .where(eq(wcSettings.id, 1))
            .for("update");
          await tx
            .update(wcSettings)
            .set({ openingCash: input.amount })
            .where(eq(wcSettings.id, 1));
          await audit(tx, ctx.user, "settings.opening_cash", "settings", 1, {
            oldAmount: old.openingCash,
            newAmount: input.amount,
          });
        });
        return success;
      }),
  }),
  roles: router({
    list: protectedProcedure.query(async () => {
      const db = await dbRequired();
      const [roles, grants] = await Promise.all([
        db.select().from(wcRoles).orderBy(wcRoles.name),
        db
          .select({
            roleId: wcRoleCapabilities.roleId,
            capability: wcRoleCapabilities.capability,
          })
          .from(wcRoleCapabilities),
      ]);
      return roles.map(role => ({
        ...role,
        capabilities: grants
          .filter(grant => grant.roleId === role.id)
          .map(grant => grant.capability),
      }));
    }),
    create: ownerProcedure
      .input(
        z
          .object({
            name: shortText,
            description: z.string().trim().max(500).optional(),
            capabilities: z.array(shortText).max(100),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        return db.transaction(async tx => {
          const [r] = await tx
            .insert(wcRoles)
            .values({
              name: input.name,
              description: input.description || null,
              createdBy: ctx.user.id,
            })
            .$returningId();
          for (const capability of [...new Set(input.capabilities)])
            await tx
              .insert(wcRoleCapabilities)
              .values({ roleId: r.id, capability, grantedBy: ctx.user.id });
          await audit(tx, ctx.user, "role.create", "role", r.id, {
            name: input.name,
            capabilities: input.capabilities,
          });
          return success;
        });
      }),
    update: ownerProcedure
      .input(
        z
          .object({
            id,
            name: shortText,
            description: z.string().trim().max(500).nullable(),
            active: z.boolean(),
            capabilities: z.array(shortText).max(100),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        return db.transaction(async tx => {
          const [role] = await tx
            .select()
            .from(wcRoles)
            .where(eq(wcRoles.id, input.id))
            .limit(1);
          if (!role)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Role not found.",
            });
          await tx
            .update(wcRoles)
            .set({
              name: input.name,
              description: input.description,
              active: input.active,
            })
            .where(eq(wcRoles.id, input.id));
          await tx
            .delete(wcRoleCapabilities)
            .where(eq(wcRoleCapabilities.roleId, input.id));
          for (const capability of [...new Set(input.capabilities)])
            await tx
              .insert(wcRoleCapabilities)
              .values({ roleId: input.id, capability, grantedBy: ctx.user.id });
          await audit(tx, ctx.user, "role.update", "role", input.id, input);
          return success;
        });
      }),
    delete: ownerProcedure
      .input(z.object({ id }).strict())
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        const assigned = await db
          .select({ id: wcUsers.id })
          .from(wcUsers)
          .where(eq(wcUsers.customRoleId, input.id))
          .limit(1);
        if (assigned.length)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Role is assigned to users; deactivate or reassign them first.",
          });
        await db.delete(wcRoles).where(eq(wcRoles.id, input.id));
        await audit(db, ctx.user, "role.delete", "role", input.id);
        return success;
      }),
    assign: ownerProcedure
      .input(z.object({ userId: id, roleId: id.nullable() }).strict())
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        const [target] = await db
          .select()
          .from(wcUsers)
          .where(eq(wcUsers.id, input.userId))
          .limit(1);
        if (!target || target.role === "owner")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User cannot receive a custom role.",
          });
        await db
          .update(wcUsers)
          .set({ customRoleId: input.roleId })
          .where(eq(wcUsers.id, input.userId));
        await audit(db, ctx.user, "role.assign", "user", input.userId, {
          roleId: input.roleId,
        });
        await db.insert(wcNotices).values({
          titleEn: "Custom role assignment updated",
          titleMm: "စိတ်ကြိုက်အခန်းကဏ္ဍ သတ်မှတ်မှု ပြောင်းလဲပြီးပါပြီ",
          bodyEn: `Your custom role assignment was updated by ${ctx.user.name}.`,
          bodyMm: `${ctx.user.name} မှ သင့်စိတ်ကြိုက်အခန်းကဏ္ဍ သတ်မှတ်မှုကို ပြောင်းလဲလိုက်ပါပြီ။`,
          audience: target.role,
          type: "notification",
          targetUserId: target.id,
          createdBy: ctx.user.id,
        });
        return success;
      }),
  }),
  catalog: router({
    products: router({
      list: protectedProcedure.query(async () =>
        (await dbRequired()).select().from(wcProducts).orderBy(wcProducts.name)
      ),
      create: adminProcedure
        .input(
          z
            .object({
              categoryId: id.nullable().optional(),
              sku: shortText,
              name: shortText,
              unit: shortText,
              purchasePrice: amount,
              salePrice: amount,
              active: z.boolean().optional(),
            })
            .strict()
        )
        .mutation(async ({ ctx, input }) => {
          const db = await dbRequired();
          await assertCapability(db, ctx.user, "manage_catalog");
          const [r] = await db
            .insert(wcProducts)
            .values({
              ...input,
              categoryId: input.categoryId ?? null,
              active: input.active ?? true,
              createdBy: ctx.user.id,
            })
            .$returningId();
          await audit(db, ctx.user, "product.create", "product", r.id, input);
          return success;
        }),
      update: adminProcedure
        .input(
          z
            .object({
              id,
              categoryId: id.nullable(),
              sku: shortText,
              name: shortText,
              unit: shortText,
              purchasePrice: amount,
              salePrice: amount,
              active: z.boolean(),
            })
            .strict()
        )
        .mutation(async ({ ctx, input }) => {
          const db = await dbRequired();
          await assertCapability(db, ctx.user, "manage_catalog");
          await db
            .update(wcProducts)
            .set(input)
            .where(eq(wcProducts.id, input.id));
          await audit(
            db,
            ctx.user,
            "product.update",
            "product",
            input.id,
            input
          );
          return success;
        }),
    }),
    categories: router({
      list: protectedProcedure.query(async () =>
        (await dbRequired())
          .select()
          .from(wcProductCategories)
          .orderBy(wcProductCategories.name)
      ),
      create: adminProcedure
        .input(z.object({ name: shortText }).strict())
        .mutation(async ({ ctx, input }) => {
          const db = await dbRequired();
          await assertCapability(db, ctx.user, "manage_catalog");
          const [r] = await db
            .insert(wcProductCategories)
            .values({ name: input.name, createdBy: ctx.user.id })
            .$returningId();
          await audit(
            db,
            ctx.user,
            "product_category.create",
            "product_category",
            r.id,
            input
          );
          return success;
        }),
    }),
    services: router({
      list: protectedProcedure.query(async () =>
        (await dbRequired())
          .select()
          .from(wcServiceTypes)
          .orderBy(wcServiceTypes.name)
      ),
      create: adminProcedure
        .input(
          z
            .object({
              name: shortText,
              price: amount,
              active: z.boolean().optional(),
            })
            .strict()
        )
        .mutation(async ({ ctx, input }) => {
          const db = await dbRequired();
          await assertCapability(db, ctx.user, "manage_catalog");
          const [duplicate] = await db
            .select({ id: wcServiceTypes.id })
            .from(wcServiceTypes)
            .where(eq(wcServiceTypes.name, input.name))
            .limit(1);
          if (duplicate)
            throw new TRPCError({
              code: "CONFLICT",
              message: "A service with this name already exists.",
            });
          const [r] = await db
            .insert(wcServiceTypes)
            .values({
              ...input,
              active: input.active ?? true,
              createdBy: ctx.user.id,
            })
            .$returningId();
          await audit(
            db,
            ctx.user,
            "service_type.create",
            "service_type",
            r.id,
            input
          );
          return success;
        }),
      update: adminProcedure
        .input(
          z
            .object({ id, name: shortText, price: amount, active: z.boolean() })
            .strict()
        )
        .mutation(async ({ ctx, input }) => {
          const db = await dbRequired();
          await assertCapability(db, ctx.user, "manage_catalog");
          const [duplicate] = await db
            .select({ id: wcServiceTypes.id })
            .from(wcServiceTypes)
            .where(
              and(
                eq(wcServiceTypes.name, input.name),
                ne(wcServiceTypes.id, input.id)
              )
            )
            .limit(1);
          if (duplicate)
            throw new TRPCError({
              code: "CONFLICT",
              message: "A service with this name already exists.",
            });
          await db
            .update(wcServiceTypes)
            .set(input)
            .where(eq(wcServiceTypes.id, input.id));
          await audit(
            db,
            ctx.user,
            "service_type.update",
            "service_type",
            input.id,
            input
          );
          return success;
        }),
    }),
  }),
  chat: router({
    contacts: basicProcedure.query(async ({ ctx }) => {
      const db = await dbRequired();
      return db
        .select({
          id: wcUsers.id,
          name: wcUsers.name,
          username: wcUsers.username,
          role: wcUsers.role,
          avatarData: wcEmployeeProfiles.avatarData,
          avatarReference: wcEmployeeProfiles.avatarReference,
          jobTitle: wcEmployeeProfiles.jobTitle,
          department: wcEmployeeProfiles.department,
        })
        .from(wcUsers)
        .leftJoin(wcEmployeeProfiles, eq(wcEmployeeProfiles.userId, wcUsers.id))
        .where(and(eq(wcUsers.active, true), isNull(wcUsers.deletedAt)))
        .orderBy(wcUsers.name);
    }),
    messages: basicProcedure
      .input(z.object({ userId: id }).strict())
      .query(async ({ ctx, input }) => {
        const db = await dbRequired();
        return db
          .select({
            id: wcChatMessages.id,
            senderId: wcChatMessages.senderId,
            recipientId: wcChatMessages.recipientId,
            body: wcChatMessages.body,
            createdAt: wcChatMessages.createdAt,
            senderName: wcUsers.name,
            attachmentData: wcChatMessages.attachmentData,
            attachmentMime: wcChatMessages.attachmentMime,
          })
          .from(wcChatMessages)
          .innerJoin(wcUsers, eq(wcUsers.id, wcChatMessages.senderId))
          .where(
            or(
              and(
                eq(wcChatMessages.senderId, ctx.user.id),
                eq(wcChatMessages.recipientId, input.userId)
              ),
              and(
                eq(wcChatMessages.senderId, input.userId),
                eq(wcChatMessages.recipientId, ctx.user.id)
              )
            )
          )
          .orderBy(wcChatMessages.createdAt);
      }),
    send: basicProcedure
      .input(
        z
          .object({
            recipientId: id,
            body: z.string().trim().max(2000).optional().default(""),
            attachmentData: avatarData.nullable().optional(),
            attachmentMime: z.string().trim().max(80).nullable().optional(),
          })
          .strict()
          .refine(input => Boolean(input.body || input.attachmentData), {
            message: "Write a message or attach an image.",
          })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.recipientId === ctx.user.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose another user.",
          });
        const db = await dbRequired();
        const [recipient] = await db
          .select({
            id: wcUsers.id,
            active: wcUsers.active,
            deletedAt: wcUsers.deletedAt,
          })
          .from(wcUsers)
          .where(eq(wcUsers.id, input.recipientId))
          .limit(1);
        if (!recipient || !recipient.active || recipient.deletedAt)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This account is no longer available.",
          });
        await db.insert(wcChatMessages).values({
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          body: input.body || "📷 Image",
          attachmentData: input.attachmentData ?? null,
          attachmentMime: input.attachmentMime ?? null,
        });
        await db.insert(wcNotices).values({
          titleEn: `New message from ${ctx.user.name}`,
          titleMm: `${ctx.user.name} မှ စာအသစ်ရောက်ရှိပါသည်`,
          bodyEn: "You have a new internal chat message. Open Chat to read it.",
          bodyMm:
            "အတွင်းရေး chat စာအသစ် ရောက်ရှိပါသည်။ Chat ကိုဖွင့်၍ ဖတ်ရှုပါ။",
          audience: recipient.id === ctx.user.id ? ctx.user.role : "all",
          type: "notification",
          targetUserId: recipient.id,
          createdBy: ctx.user.id,
        });
        return success;
      }),
  }),
  settings: router({
    get: protectedProcedure.query(async () => {
      const db = await dbRequired();
      const [s] = await db
        .select()
        .from(wcSettings)
        .where(eq(wcSettings.id, 1))
        .limit(1);
      return (
        s ?? {
          welcomeTextMm: "",
          contactViber: null,
          contactTelegram: null,
          contactPhone: null,
          contactKbzPay: null,
          contactWavePay: null,
          logoReference: null,
        }
      );
    }),
    update: ownerProcedure
      .input(
        z
          .object({
            welcomeTextMm: z.string().trim().max(1000),
            contactViber: z.string().trim().max(120).nullable(),
            contactTelegram: z.string().trim().max(120).nullable(),
            contactPhone: z.string().trim().max(80).nullable(),
            contactKbzPay: z.string().trim().max(120).nullable(),
            contactWavePay: z.string().trim().max(120).nullable(),
            logoReference: z.string().trim().max(500).nullable(),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await db
          .insert(wcSettings)
          .values({ id: 1 })
          .onDuplicateKeyUpdate({ set: { id: 1 } });
        await db.update(wcSettings).set(input).where(eq(wcSettings.id, 1));
        await audit(
          db,
          ctx.user,
          "settings.business.update",
          "settings",
          1,
          input
        );
        return success;
      }),
  }),
  lifecycle: router({
    restore: adminProcedure
      .input(z.object({ id }).strict())
      .mutation(async ({ ctx, input }) => {
        const db = await dbRequired();
        await db.transaction(async tx => {
          const [target] = await tx
            .select()
            .from(wcUsers)
            .where(eq(wcUsers.id, input.id))
            .limit(1);
          if (!target || target.role === "owner")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "The owner account is protected.",
            });
          await tx
            .update(wcUsers)
            .set({
              active: true,
              deletedAt: null,
              lifecycleReason: null,
              lifecycleAt: null,
              lifecycleBy: null,
            })
            .where(eq(wcUsers.id, input.id));
          await audit(tx, ctx.user, "team.restore", "user", input.id);
          await notifyAccountChange(tx, ctx.user, target, "restore");
        });
        return success;
      }),
    archive: adminProcedure.query(async () => {
      const db = await dbRequired();
      return db
        .select({
          id: wcUsers.id,
          name: wcUsers.name,
          username: wcUsers.username,
          role: wcUsers.role,
          active: wcUsers.active,
          deletedAt: wcUsers.deletedAt,
          lifecycleReason: wcUsers.lifecycleReason,
          lifecycleAt: wcUsers.lifecycleAt,
          lifecycleBy: wcUsers.lifecycleBy,
        })
        .from(wcUsers)
        .where(and(eq(wcUsers.active, false), isNotNull(wcUsers.lifecycleAt)))
        .orderBy(desc(wcUsers.lifecycleAt));
    }),
    deactivate: adminProcedure
      .input(
        z.object({ id, reason: z.string().trim().min(2).max(1000) }).strict()
      )
      .mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot deactivate your own account.",
          });
        const db = await dbRequired();
        await db.transaction(async tx => {
          const [target] = await tx
            .select()
            .from(wcUsers)
            .where(eq(wcUsers.id, input.id))
            .limit(1);
          if (!target || target.role === "owner")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "The owner account is protected.",
            });
          await tx
            .update(wcUsers)
            .set({
              active: false,
              lifecycleReason: input.reason,
              lifecycleAt: new Date(),
              lifecycleBy: ctx.user.id,
            })
            .where(eq(wcUsers.id, input.id));
          await tx.delete(wcSessions).where(eq(wcSessions.userId, input.id));
          await audit(tx, ctx.user, "team.deactivate", "user", input.id, {
            targetName: target.name,
            targetUsername: target.username,
            reason: input.reason,
          });
          await notifyAccountChange(
            tx,
            ctx.user,
            target,
            "deactivate",
            input.reason
          );
        });
        return success;
      }),
    delete: adminProcedure
      .input(
        z.object({ id, reason: z.string().trim().min(2).max(1000) }).strict()
      )
      .mutation(async ({ ctx, input }) => {
        if (input.id === ctx.user.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot delete your own account.",
          });
        const db = await dbRequired();
        const [target] = await db
          .select()
          .from(wcUsers)
          .where(eq(wcUsers.id, input.id))
          .limit(1);
        if (!target || target.role === "owner")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The owner cannot be deleted.",
          });
        await db.transaction(async tx => {
          await tx
            .update(wcUsers)
            .set({
              active: false,
              deletedAt: new Date(),
              lifecycleReason: input.reason,
              lifecycleAt: new Date(),
              lifecycleBy: ctx.user.id,
              username: `deleted-${target.id}-${target.username}`,
            })
            .where(eq(wcUsers.id, input.id));
          await tx.delete(wcSessions).where(eq(wcSessions.userId, input.id));
          await audit(tx, ctx.user, "team.delete", "user", input.id, {
            targetName: target.name,
            targetUsername: target.username,
            reason: input.reason,
          });
          await notifyAccountChange(
            tx,
            ctx.user,
            target,
            "delete",
            input.reason
          );
        });
        return success;
      }),
  }),
  exports: router({
    csv: protectedProcedure
      .input(
        z
          .object({
            table: z.enum([
              "receipts",
              "expenses",
              "products",
              "services",
              "users",
              "audit",
            ]),
          })
          .strict()
      )
      .query(async ({ ctx, input }) => {
        const db = await dbRequired();
        let rows: Record<string, unknown>[];
        if (input.table === "receipts")
          rows = await db.select().from(wcReceipts);
        else if (input.table === "expenses")
          rows = await db.select().from(wcExpenses);
        else if (input.table === "products")
          rows = await db.select().from(wcProducts);
        else if (input.table === "services")
          rows = await db.select().from(wcServiceTypes);
        else if (input.table === "users") {
          await assertCapability(db, ctx.user, "manage_users");
          rows = await db
            .select({
              id: wcUsers.id,
              username: wcUsers.username,
              name: wcUsers.name,
              role: wcUsers.role,
              customRoleId: wcUsers.customRoleId,
              active: wcUsers.active,
              createdAt: wcUsers.createdAt,
            })
            .from(wcUsers);
        } else {
          await assertCapability(db, ctx.user, "view_audit");
          rows = await db.select().from(wcAudit);
        }
        return {
          filename: `wincomputer-${input.table}.csv`,
          mime: "text/csv; charset=utf-8",
          content: csv(rows),
        };
      }),
    json: protectedProcedure
      .input(
        z
          .object({
            table: z.enum([
              "prices",
              "products",
              "services",
              "expenses",
              "settings",
            ]),
          })
          .strict()
      )
      .query(async ({ ctx, input }) => {
        const db = await dbRequired();
        let rows: unknown;
        if (input.table === "prices") rows = await db.select().from(wcPrices);
        else if (input.table === "products")
          rows = await db.select().from(wcProducts);
        else if (input.table === "services")
          rows = await db.select().from(wcServiceTypes);
        else if (input.table === "expenses")
          rows = await db.select().from(wcExpenses);
        else {
          await assertCapability(db, ctx.user, "manage_settings");
          const [settings] = await db
            .select()
            .from(wcSettings)
            .where(eq(wcSettings.id, 1));
          rows = settings ?? null;
        }
        return {
          filename: `wincomputer-${input.table}.json`,
          mime: "application/json; charset=utf-8",
          content: JSON.stringify(rows, null, 2),
        };
      }),
    importJson: ownerProcedure
      .input(
        z
          .object({
            table: z.enum([
              "prices",
              "products",
              "services",
              "expenses",
              "settings",
            ]),
            content: z.string().trim().min(2).max(100000),
            overwrite: z.literal(true),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(input.content);
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Import file must contain valid JSON.",
          });
        }
        const db = await dbRequired();
        return db.transaction(async tx => {
          let rowCount = 0;
          if (input.table === "prices") {
            const rows = z
              .array(
                z.object({
                  id: id,
                  amount: amount.nullable(),
                })
              )
              .max(20)
              .parse(parsed);
            await tx.delete(wcPrices);
            for (const row of rows)
              await tx
                .insert(wcPrices)
                .values({ id: row.id, amount: row.amount });
            rowCount = rows.length;
          } else if (input.table === "services") {
            const rows = z
              .array(
                z.object({
                  name: shortText,
                  price: amount,
                  active: z.boolean(),
                })
              )
              .max(1000)
              .parse(parsed);
            await tx.delete(wcServiceTypes);
            for (const row of rows)
              await tx.insert(wcServiceTypes).values({
                name: row.name,
                price: row.price,
                active: row.active,
                createdBy: ctx.user.id,
              });
            rowCount = rows.length;
          } else if (input.table === "products") {
            const rows = z
              .array(
                z.object({
                  categoryId: id.nullable(),
                  sku: shortText,
                  name: shortText,
                  unit: shortText,
                  purchasePrice: amount,
                  salePrice: amount,
                  active: z.boolean(),
                })
              )
              .max(1000)
              .parse(parsed);
            await tx.delete(wcProducts);
            for (const row of rows)
              await tx.insert(wcProducts).values({
                ...row,
                createdBy: ctx.user.id,
              });
            rowCount = rows.length;
          } else if (input.table === "expenses") {
            const rows = z
              .array(
                z.object({
                  category: shortText,
                  description: shortText,
                  amount,
                  method: z.enum(["cash", "kbzpay", "wavepay"]),
                })
              )
              .max(10000)
              .parse(parsed);
            await tx.delete(wcExpenses);
            for (const row of rows)
              await tx
                .insert(wcExpenses)
                .values({ ...row, createdBy: ctx.user.id });
            rowCount = rows.length;
          } else {
            const row = z
              .object({
                welcomeTextMm: z.string().trim().max(1000),
                contactViber: z.string().trim().max(120).nullable(),
                contactTelegram: z.string().trim().max(120).nullable(),
                contactPhone: z.string().trim().max(80).nullable(),
                contactKbzPay: z.string().trim().max(120).nullable(),
                contactWavePay: z.string().trim().max(120).nullable(),
                logoReference: z.string().trim().max(500).nullable(),
              })
              .parse(parsed);
            await tx
              .insert(wcSettings)
              .values({ id: 1 })
              .onDuplicateKeyUpdate({ set: { id: 1 } });
            await tx.update(wcSettings).set(row).where(eq(wcSettings.id, 1));
            rowCount = 1;
          }
          await audit(tx, ctx.user, "data.import", input.table, 1, {
            table: input.table,
            rowCount,
            overwrite: true,
          });
          return { ...success, rowCount };
        });
      }),
  }),
  audit: router({
    list: adminProcedure
      .input(
        z
          .object({ page: z.number().int().min(0).default(0) })
          .default({ page: 0 })
      )
      .query(async ({ input }) => {
        const db = await dbRequired();
        const items = await db
          .select({
            id: wcAudit.id,
            actorName: wcAudit.actorName,
            action: wcAudit.action,
            entityType: wcAudit.entityType,
            entityId: wcAudit.entityId,
            details: wcAudit.details,
            createdAt: wcAudit.createdAt,
          })
          .from(wcAudit)
          .orderBy(desc(wcAudit.id));
        const start = input.page * 10;
        return {
          items: items.slice(start, start + 10),
          hasNext: items.length > start + 10,
          page: input.page,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
