import { db, type Tx } from "@/lib/db";

export async function audit(
  entry: { actorId?: string | null; action: string; entity: string; entityId?: string | null; data?: unknown; ip?: string | null },
  client: Tx | typeof db = db
) {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      data: entry.data === undefined ? undefined : JSON.parse(JSON.stringify(entry.data)),
      ip: entry.ip ?? null,
    },
  });
}
