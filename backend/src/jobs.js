import { visitWindow, activeStatuses } from "./domain.js";

// Service alerts are idempotent across process restarts. No continuous GPS tracking.
export function createServiceAlerts(db, sendMail) {
  let running = false;
  return async function serviceAlerts(now = Date.now()) {
    if (running) return;
    running = true;
    try {
      const requests = await db.serviceRequest.findMany({
        where: { status: { in: activeStatuses } },
        include: {
          assignedProvider: { select: { userId: true } },
          attendance: true,
        },
      });
      const admins = await db.user.findMany({
        where: { role: { in: ["ADMIN", "OPERATIONS"] }, isActive: true },
        select: { id: true },
      });
      for (const request of requests) {
        const { start, end } = visitWindow(request),
          arrival = request.attendance.some((a) => a.checkInAt);
        const workerId =
          request.assignedEmployeeId || request.assignedProvider?.userId;
        let event;
        if (!arrival && now > end.valueOf())
          event = {
            key: "missed",
            title: "Visit needs an attendance review",
            message: `No arrival was recorded for ${request.reference}. Confirm the outcome with the household and worker.`,
          };
        else if (!arrival && now > start.valueOf() + 15 * 60000)
          event = {
            key: "late",
            title: "Arrival is overdue",
            message: `Arrival for ${request.reference} is more than 15 minutes overdue. Follow up with the assigned worker.`,
          };
        else if (
          !arrival &&
          workerId &&
          start.valueOf() > now &&
          start.valueOf() - now <= 2 * 3600000
        )
          event = {
            key: "reminder",
            title: "Upcoming visit reminder",
            message: `${request.reference} is scheduled to start within two hours. Check your schedule and agreed handover details.`,
          };
        if (!event) continue;
        const userIds =
          event.key === "reminder"
            ? [workerId, request.clientUserId].filter(Boolean)
            : [...admins.map((a) => a.id), workerId].filter(Boolean);
        for (const userId of [...new Set(userIds)]) {
          const dedupeKey = `${request.id}:${event.key}:${start.toISOString()}:${userId}`;
          const created = await db.notification.createMany({
            data: [
              {
                userId,
                dedupeKey,
                title: event.title,
                message: event.message,
                link: "/account",
              },
            ],
            skipDuplicates: true,
          });
          if (
            created.count &&
            event.key === "reminder" &&
            request.contactConsent
          ) {
            const user = await db.user.findUnique({
              where: { id: userId },
              select: { email: true },
            });
            if (user?.email)
              await sendMail({
                to: user.email,
                subject: event.title,
                text: event.message,
              });
          }
        }
      }
    } finally {
      running = false;
    }
  };
}
