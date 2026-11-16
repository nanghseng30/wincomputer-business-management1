import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

describe("auth.logout", () => {
  it("clears the browser cookie and reports success even if already logged out", async () => {
    const calls: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie(name: string, options: Record<string, unknown>) { calls.push({ name, options }); } } as unknown as TrpcContext["res"],
    };
    expect(await appRouter.createCaller(ctx).auth.logout()).toEqual({ success: true });
    expect(calls).toEqual([{ name: COOKIE_NAME, options: { secure: true, sameSite: "none", httpOnly: true, path: "/" } }]);
  });
});
