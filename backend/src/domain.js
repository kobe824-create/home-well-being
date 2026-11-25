export class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const fail = (message, status = 400) => {
  throw new DomainError(message, status);
};
export const money = (value, label = "Amount") => {
  const number = Number(value);
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    !Number.isFinite(number) ||
    number < 0 ||
    number > 999999999.99
  )
    fail(`${label} must be a positive amount or zero.`);
  return Math.round((number + Number.EPSILON) * 100) / 100;
};
export const validDay = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const asDay = (value) => {
  if (!validDay(value)) fail("Use a valid date.");
  return new Date(`${value}T00:00:00Z`);
};
export const dayText = (value) => new Date(value).toISOString().slice(0, 10);
export const clockText = (value) =>
  value instanceof Date
    ? value.toISOString().slice(11, 16)
    : String(value).slice(0, 5);
export const validClock = (value) =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const visitWindow = (visit) => {
  const start = new Date(
    `${dayText(visit.requestedDate)}T${clockText(visit.startTime)}:00+02:00`,
  );
  return {
    start,
    end: new Date(start.valueOf() + Number(visit.durationHours) * 3600000),
  };
};
export const leaveWindow = (leave) => {
  const start = new Date(
    `${dayText(leave.startDate)}T${leave.startTime || "00:00"}:00+02:00`,
  );
  const end = new Date(
    `${dayText(leave.endDate)}T${leave.endTime || "00:00"}:00+02:00`,
  );
  if (!leave.startTime && !leave.endTime) end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};
export const overlaps = (first, second) =>
  first.start < second.end && second.start < first.end;
export function invoiceTotal(items) {
  if (!Array.isArray(items) || !items.length || items.length > 30)
    fail("Add between 1 and 30 invoice items.");
  const lineItems = items.map((item) => {
    const description = String(item.description || "")
      .trim()
      .slice(0, 250);
    const quantity = Number(item.quantity);
    if (
      !description ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 10000
    )
      fail("Each invoice item needs a description and valid quantity.");
    const unitPriceRwf = money(item.unitPriceRwf, "Unit price");
    return {
      description,
      quantity,
      unitPriceRwf,
      totalRwf: Math.round(quantity * unitPriceRwf * 100) / 100,
    };
  });
  return {
    lineItems,
    totalRwf: money(lineItems.reduce((sum, item) => sum + item.totalRwf, 0)),
  };
}
export function invoiceBalance(invoice) {
  const netPaidRwf =
    Math.round(
      (invoice.payments || [])
        .filter((p) => p.status === "Recorded")
        .reduce(
          (sum, p) =>
            sum + (p.kind === "REFUND" ? -1 : 1) * Number(p.amountRwf),
          0,
        ) * 100,
    ) / 100;
  const balanceRwf = Math.max(
    0,
    Math.round((Number(invoice.totalRwf) - netPaidRwf) * 100) / 100,
  );
  return {
    netPaidRwf,
    balanceRwf,
    status:
      netPaidRwf <= 0
        ? (invoice.payments || []).some((p) => p.kind === "REFUND")
          ? "Refunded"
          : "Unpaid"
        : balanceRwf === 0
          ? "Paid"
          : "Part-paid",
  };
}
export function distanceMeters(a, b) {
  const radians = (x) => (x * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude),
    dLon = radians(b.longitude - a.longitude);
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(sin), Math.sqrt(1 - sin));
}
export function gpsEvidence(body, now = Date.now()) {
  if (
    typeof body.latitude !== "number" ||
    typeof body.longitude !== "number" ||
    typeof body.accuracy !== "number"
  )
    fail("A valid GPS position and accuracy are required.");
  const latitude = Number(body.latitude),
    longitude = Number(body.longitude),
    accuracy = Number(body.accuracy);
  const capturedAt = new Date(body.capturedAt);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    fail("A valid GPS position is required.");
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 100)
    fail(
      "GPS accuracy must be within 100 metres. Move near a window or outdoors and try again.",
    );
  if (
    Number.isNaN(capturedAt.valueOf()) ||
    now - capturedAt.valueOf() > 60000 ||
    capturedAt.valueOf() - now > 10000
  )
    fail("GPS reading is too old. Capture a fresh location.");
  if (
    !Number.isInteger(Number(body.sampleCount)) ||
    Number(body.sampleCount) < 3
  )
    fail("Collect at least three fresh GPS readings.");
  return { latitude, longitude, accuracy, capturedAt };
}
export const activeStatuses = [
  "Confirmed",
  "Rescheduled",
  "Provider assigned",
  "In progress",
  "Delayed",
];
export async function scheduleConflict(
  db,
  request,
  userId,
  { excludeId = request.id } = {},
) {
  const window = visitWindow(request);
  const [staff, leave, requests, provider] = await Promise.all([
    db.staffProfile.findUnique({ where: { userId } }),
    db.employeeLeaveRequest.findMany({
      where: {
        employeeId: userId,
        status: "Approved",
        startDate: {
          lte: asDay(dayText(new Date(window.end.valueOf() - 1 + 2 * 3600000))),
        },
        endDate: {
          gte: asDay(dayText(new Date(window.start.valueOf() + 2 * 3600000))),
        },
      },
    }),
    db.serviceRequest.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        status: { in: activeStatuses },
        OR: [{ assignedEmployeeId: userId }, { assignedProvider: { userId } }],
      },
    }),
    db.providerApplication.findUnique({ where: { userId } }),
  ]);
  if (!staff)
    return "Complete a screened staff profile before assigning visits.";
  if (leave.some((request) => overlaps(window, leaveWindow(request))))
    return "This team member has approved leave during the visit.";
  if (
    staff &&
    (staff.status !== "Active" || staff.screeningStatus !== "Cleared")
  )
    return "Complete screening and activate the staff profile before assigning visits.";
  if (!staff.departmentId)
    return "Choose a team member in the correct active service department.";
  {
    const department = await db.department.findUnique({
      where: { id: staff.departmentId },
    });
    if (!department?.active || department.service !== request.service)
      return "Choose a team member in the correct active service department.";
    const qualifications = Array.isArray(staff.qualifications)
      ? staff.qualifications.map((q) => String(q).toLowerCase())
      : [];
    if (
      Array.isArray(department.qualificationRules) &&
      department.qualificationRules.some(
        (rule) => !qualifications.includes(String(rule).toLowerCase()),
      )
    )
      return "This team member does not meet the department qualification requirements.";
  }
  if (provider && provider.service !== request.service)
    return "The provider is not approved for this service.";
  if (
    staff?.contractStart &&
    dayText(staff.contractStart) > dayText(request.requestedDate)
  )
    return "The visit falls before the staff contract starts.";
  if (
    staff?.contractEnd &&
    dayText(staff.contractEnd) < dayText(request.requestedDate)
  )
    return "The visit falls after the staff contract ends.";
  if (Array.isArray(staff?.availability) && staff.availability.length) {
    const day = new Date(
      `${dayText(request.requestedDate)}T12:00:00Z`,
    ).getUTCDay();
    const startMinutes =
      Number(clockText(request.startTime).slice(0, 2)) * 60 +
      Number(clockText(request.startTime).slice(3, 5));
    if (
      !staff.availability.some(
        (slot) =>
          Number(slot.day) === day &&
          startMinutes >=
            Number(slot.start.slice(0, 2)) * 60 +
              Number(slot.start.slice(3, 5)) &&
          startMinutes + request.durationHours * 60 <=
            Number(slot.end.slice(0, 2)) * 60 + Number(slot.end.slice(3, 5)),
      )
    )
      return "The visit is outside this team member’s available hours.";
  }
  return requests.some((other) => overlaps(window, visitWindow(other)))
    ? "This team member already has an overlapping visit."
    : null;
}
export function payrollTotals(
  attendance,
  periodStart,
  periodEnd,
  hourlyRate,
  monthlySalary,
  deductions,
) {
  const start = new Date(`${periodStart}T00:00:00+02:00`).valueOf(),
    end = new Date(`${periodEnd}T23:59:59.999+02:00`).valueOf();
  const hours =
    Math.round(
      attendance.reduce((sum, row) => {
        if (
          !row.checkOutAt ||
          (row.verificationStatus !== "Verified" &&
            (row.verificationStatus !== "Approved" ||
              typeof row.reviewNote !== "string" ||
              !row.reviewNote.trim()))
        )
          return sum;
        let creditedStart = Math.max(new Date(row.checkInAt).valueOf(), start),
          creditedEnd = Math.min(new Date(row.checkOutAt).valueOf(), end);
        if (row.verificationStatus === "Verified") {
          if (!row.request) return sum;
          const scheduled = visitWindow(row.request);
          creditedStart = Math.max(creditedStart, scheduled.start.valueOf());
          creditedEnd = Math.min(creditedEnd, scheduled.end.valueOf());
        }
        return Number.isFinite(creditedStart) && Number.isFinite(creditedEnd)
          ? sum + Math.max(0, creditedEnd - creditedStart) / 3600000
          : sum;
      }, 0) * 100,
    ) / 100;
  const days =
    Math.round((asDay(periodEnd) - asDay(periodStart)) / 86400000) + 1;
  const grossRwf = money(
    Number(monthlySalary) > 0
      ? (Number(monthlySalary) * days) / 30
      : hours * Number(hourlyRate),
  );
  const deductionsRwf = money(deductions || 0);
  if (deductionsRwf > grossRwf) fail("Deductions cannot exceed gross pay.");
  return {
    hours,
    grossRwf,
    deductionsRwf,
    netRwf: money(grossRwf - deductionsRwf),
  };
}
