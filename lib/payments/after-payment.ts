import { db } from "@/lib/db";
import { orderConfirmationEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

/** Side effects after an order transitions to paid (runs after the DB transaction commits). */
export async function afterOrderPaid(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  await sendEmail(orderConfirmationEmail(order));
}
