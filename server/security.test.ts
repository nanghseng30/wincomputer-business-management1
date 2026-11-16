import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter, calculateFinancials, validateReceiptTransition } from "./routers";
import { approvalConfigured, hashPassword, newSessionId, signSession, verifyApproval, verifyPassword, verifySession } from "./security";
import type { TrpcContext } from "./_core/context";

const makeContext = (mustChangePassword: boolean): TrpcContext => ({
  user: { id: 123, username: "sample", name: "Sample", passwordHash: "not-a-real-hash", role: "staff", ownerGuard: null, mustChangePassword, active: true, createdAt: new Date(), updatedAt: new Date() },
  req: { headers: {}, protocol: "https" } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});
afterEach(() => vi.unstubAllEnvs());
describe("standalone authentication", () => {
  it("uses different salts and verifies only the correct password", async () => {
    const a = await hashPassword("example password"); const b = await hashPassword("example password");
    expect(a).not.toBe(b); expect(a).not.toContain("example password");
    expect(await verifyPassword("example password", a)).toBe(true);
    expect(await verifyPassword("wrong password", a)).toBe(false);
    expect(await verifyPassword("anything", "invalid")).toBe(false);
  });
  it("fails closed when approval is absent", () => {
    vi.stubEnv("WIN_APPROVAL_PASSWORD", "");
    expect(approvalConfigured()).toBe(false); expect(verifyApproval("")).toBe(false);
    vi.stubEnv("WIN_APPROVAL_PASSWORD", "unit-test-approval");
    expect(verifyApproval("unit-test-approval")).toBe(true); expect(verifyApproval("wrong")).toBe(false);
  });
  it("binds signed sessions to the project, rejects tampering and fails closed without a key", async () => {
    vi.stubEnv("MANUS_PROJECT_ID", "unit-project"); vi.stubEnv("MANUS_JWT_SECRET", "unit-test-signing-secret");
    const sid = newSessionId(), token = await signSession(sid);
    expect(await verifySession(token)).toBe(sid); expect(await verifySession(token + "x")).toBeNull();
    vi.stubEnv("MANUS_PROJECT_ID", "different-project"); expect(await verifySession(token)).toBeNull();
    vi.stubEnv("MANUS_JWT_SECRET", ""); vi.stubEnv("APP_SESSION_SECRET", "local-only-key");
    await expect(signSession(sid)).rejects.toThrow("not configured");
    vi.stubEnv("MANUS_PROJECT_ID", "");
    await expect(signSession(sid)).rejects.toThrow("too short");
    vi.stubEnv("APP_SESSION_SECRET", "local-test-secret-at-least-32-bytes-long");
    expect(await verifySession(await signSession(sid))).toBe(sid);
  });
  it("blocks protected queries and mutations until the password is changed", async () => {
    const caller = appRouter.createCaller(makeContext(true));
    await expect(caller.prices.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.receipts.create({ type: "sale", description: "Test", amount: 100, method: "cash", paymentReceived: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.notices.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("blocks staff from administrator actions", async () => {
    const caller = appRouter.createCaller(makeContext(false));
    const anon = appRouter.createCaller({ ...makeContext(false), user: null });
    await expect(caller.team.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(anon.team.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
describe("receipt state and financial calculations", () => {
  it("only permits voiding unpaid active receipts and refunding paid active receipts", () => {
    expect(() => validateReceiptTransition({ status: "active", paymentReceived: false }, "void")).not.toThrow();
    expect(() => validateReceiptTransition({ status: "active", paymentReceived: true }, "refund")).not.toThrow();
    expect(() => validateReceiptTransition({ status: "active", paymentReceived: true }, "void")).toThrow();
    expect(() => validateReceiptTransition({ status: "active", paymentReceived: false }, "refund")).toThrow();
    expect(() => validateReceiptTransition({ status: "refunded", paymentReceived: true }, "refund")).toThrow();
    expect(() => validateReceiptTransition({ status: "void", paymentReceived: false }, "void")).toThrow();
  });
  it("uses only actual receipts, separately reports refunds and computes net methods", () => {
    const rows = [
      { amount: 100, method: "cash" as const, paymentReceived: true, status: "active" as const },
      { amount: 40, method: "cash" as const, paymentReceived: true, status: "refunded" as const },
      { amount: 50, method: "kbzpay" as const, paymentReceived: false, status: "active" as const },
      { amount: 60, method: "wavepay" as const, paymentReceived: true, status: "active" as const },
    ];
    const refunds = [{ amount: 40, method: "cash" as const }];
    expect(calculateFinancials(rows, refunds, null)).toEqual({ income: 200, refunds: 40, openingCash: null, cashBalance: null, byMethod: { cash: 100, kbzpay: 0, wavepay: 60 } });
    expect(calculateFinancials(rows, refunds, 25).cashBalance).toBe(125);
  });
});
