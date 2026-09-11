import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type ActorType = "PATIENT" | "DOCTOR" | "ADMIN" | "SYSTEM";

export async function writeAuditLog(params: {
  actorType: ActorType;
  actorId?: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
