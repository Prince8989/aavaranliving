import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { displayStatus } from "@/lib/orders";
import { COUNTRY_NAMES } from "@/lib/markets";
import { deleteAddress, signOutAction } from "@/app/actions/account";
import { AddressForm, ProfileForm } from "./AccountForms";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const profile = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, role: true } });
  const [orders, addresses] = await Promise.all([
    // Scoped to this user: their own orders, plus guest orders placed with their (link-verified) email.
    db.order.findMany({
      where: { OR: [{ userId: user.id }, { email: profile.email }], paymentStatus: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
  ]);

  return (
    <div className="container-site py-20 lg:py-28">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="label text-walnut">Your account</p>
          <h1 className="mt-3 font-serif text-5xl">{profile.name ? `Welcome, ${profile.name}` : "Welcome"}</h1>
          <p className="mt-2 text-muted">{profile.email}</p>
        </div>
        <div className="flex gap-4">
          {profile.role === "ADMIN" && (
            <Link href="/admin" className="label border border-obsidian px-5 py-3">
              Admin
            </Link>
          )}
          <form action={signOutAction}>
            <button type="submit" className="label px-5 py-3 text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-16 grid gap-16 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="orders-title">
          <h2 id="orders-title" className="font-serif text-3xl">
            Orders
          </h2>
          {orders.length === 0 ? (
            <p className="mt-6 text-muted">You haven&apos;t placed any orders yet.</p>
          ) : (
            <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center justify-between gap-4 py-5 hover:text-walnut">
                    <span className="font-medium">{o.number}</span>
                    <span className="text-sm text-muted">{o.createdAt.toLocaleDateString("en-GB")}</span>
                    <span className="text-sm">{displayStatus(o.paymentStatus, o.fulfillmentStatus)}</span>
                    <span>{formatMoney(o.total, o.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-14">
          <section aria-labelledby="profile-title">
            <h2 id="profile-title" className="font-serif text-2xl">
              Profile
            </h2>
            <div className="mt-6">
              <ProfileForm name={profile.name ?? ""} />
            </div>
          </section>
          <section aria-labelledby="addresses-title">
            <h2 id="addresses-title" className="font-serif text-2xl">
              Saved addresses
            </h2>
            <ul className="mt-6 space-y-4">
              {addresses.map((a) => (
                <li key={a.id} className="border border-ink/10 p-4 text-sm">
                  <p className="font-medium">
                    {a.label ?? a.name} {a.isDefault && <span className="label ml-2 text-walnut">Default</span>}
                  </p>
                  <p className="mt-1 text-muted">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.postalCode}, {COUNTRY_NAMES[a.country] ?? a.country}
                  </p>
                  <form action={deleteAddress} className="mt-2">
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="text-xs text-muted underline hover:text-ink">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <details className="mt-6">
              <summary className="label cursor-pointer text-walnut">Add an address</summary>
              <div className="mt-6">
                <AddressForm />
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
