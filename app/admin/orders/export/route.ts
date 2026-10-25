import { currentUser, isAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { orderWhere, ordersCsv } from "@/lib/admin/orders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!isAdmin(user)) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const orders = await db.order.findMany({
    where: orderWhere(url.searchParams.get("q") ?? undefined, url.searchParams.get("status") ?? undefined),
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });
  await audit({ actorId: user!.id, action: "orders.export", entity: "Order", data: { count: orders.length } });
  return new Response(ordersCsv(orders), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aavaran-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
