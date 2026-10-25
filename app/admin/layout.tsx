import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/authz";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <div className="min-h-screen bg-[#FBF8F3] lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="on-dark bg-obsidian text-sandstone lg:min-h-screen">
        <div className="px-6 py-6">
          <Link href="/" className="font-serif text-2xl tracking-[0.3em] text-ivory">
            AAVARAN
          </Link>
          <p className="label mt-1 text-[0.6rem] text-gold">Admin</p>
        </div>
        <nav aria-label="Admin">
          <ul className="flex gap-1 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block whitespace-nowrap px-3 py-2 text-sm hover:bg-white/10 hover:text-ivory">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="hidden px-6 py-6 text-xs text-sandstone/60 lg:block">{user.email}</p>
      </aside>
      <main id="main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  );
}
