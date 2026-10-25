import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { ForbiddenError, isAdmin, requireAdmin, requireAdminPage, requireUser } = await import("@/lib/authz");

describe("admin authorization", () => {
  beforeEach(() => authMock.mockReset());

  it("only the ADMIN role is an admin", () => {
    expect(isAdmin({ role: "ADMIN" })).toBe(true);
    expect(isAdmin({ role: "CUSTOMER" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("rejects anonymous and customer users on admin operations", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
    authMock.mockResolvedValue({ user: { id: "u1", role: "CUSTOMER" } });
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows admins", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "ADMIN", email: "a@b.co" } });
    await expect(requireAdmin()).resolves.toMatchObject({ id: "a1" });
  });

  it("sends anonymous visitors to login and hides admin pages from customers", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/login?callbackUrl=%2Fadmin");
    await expect(requireUser("/account")).rejects.toThrow("REDIRECT:/login?callbackUrl=%2Faccount");
    authMock.mockResolvedValue({ user: { id: "u1", role: "CUSTOMER" } });
    await expect(requireAdminPage()).rejects.toThrow("NOT_FOUND");
  });
});
