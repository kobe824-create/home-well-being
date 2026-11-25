import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import bcrypt from "bcryptjs";
import { publishedBusiness } from "./site-content.js";
import {
  DomainError,
  fail,
  money,
  validDay,
  asDay,
  dayText,
  clockText,
  validClock,
  invoiceTotal,
  invoiceBalance,
  scheduleConflict,
  gpsEvidence,
  distanceMeters,
  payrollTotals,
  activeStatuses,
} from "./domain.js";

const text = (value, limit = 1000) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const idOK = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const emailOK = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const storageRoot = path.resolve(
  process.env.DOCUMENT_STORAGE_PATH || "./private-documents",
);
export const publicSettings = () => {
  const business = publishedBusiness();
  return {
    businessName: business.name,
    email: business.email,
    phone: business.phone,
    phoneDisplay: business.phoneDisplay,
    whatsapp: business.whatsapp,
    address: business.address,
    hours: business.hours,
    serviceAreas: business.serviceAreas,
    currency: "RWF",
    paymentsEnabled: Boolean(
      process.env.FLUTTERWAVE_SECRET_KEY &&
        process.env.PUBLIC_URL &&
        process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    ),
    emailEnabled: Boolean(process.env.SMTP_HOST && process.env.SENDER_EMAIL),
    smsEnabled: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_SMS_FROM,
    ),
    whatsappEnabled: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM,
    ),
  };
};

export function installOperations(router, ctx) {
  const {
    prisma: db,
    requireAuth,
    requireAdmin,
    requireManager,
    requireWebRequest,
    requestView,
    applicationView,
    accountView,
    audit,
    sendMail,
    publicFormLimit,
    loginLimit,
    documentUploadLimit,
  } = ctx;
  const route = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof DomainError)
        return res.status(error.status).json({ error: error.message });
      if (error.code === "P2002")
        return res
          .status(409)
          .json({ error: "A record with those details already exists." });
      if (error.code === "P2025")
        return res.status(404).json({ error: "That record was not found." });
      next(error);
    }
  };
  const auth = [requireAuth];
  const write = [requireWebRequest, requireAuth];
  const admin = [...auth, requireAdmin];
  const adminWrite = [...write, requireAdmin];
  const manager = [...auth, requireManager];
  const managerWrite = [...write, requireManager];
  const isManager = (u) => ["ADMIN", "OPERATIONS"].includes(u.role);
  const note = async (userId, title, message, link = "/account") =>
    userId &&
    db.notification.create({ data: { userId, title, message, link } });
  const notifyAdmins = async (title, message) => {
    const users = await db.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    if (users.length)
      await db.notification.createMany({
        data: users.map(({ id }) => ({
          userId: id,
          title,
          message,
          link: "/staff",
        })),
      });
  };
  const invoiceView = (invoice) => ({ ...invoice, ...invoiceBalance(invoice) });
  const ownInvoice = async (id, user, tx = db) => {
    if (!idOK(id)) fail("Invalid invoice.", 404);
    const invoice = await tx.invoice.findUnique({
      where: { id },
      include: { payments: { orderBy: { createdAt: "asc" } } },
    });
    if (!invoice || (user.role !== "ADMIN" && invoice.clientId !== user.id))
      fail("Invoice not found.", 404);
    return invoice;
  };
  const ownedHousehold = async (id, user, tx = db) => {
    const household =
      idOK(id) && (await tx.household.findUnique({ where: { id } }));
    if (!household || (!isManager(user) && household.clientId !== user.id))
      fail("Household not found.", 404);
    if (
      !(await tx.user.findFirst({
        where: { id: household.clientId, role: "CLIENT" },
      }))
    )
      fail("Households must belong to a client account.", 409);
    return household;
  };
  const assignedIds = async (user) => {
    if (user.role === "EMPLOYEE") return { assignedEmployeeId: user.id };
    if (user.role === "PROVIDER") {
      const provider = await db.providerApplication.findUnique({
        where: { userId: user.id },
      });
      return {
        assignedProviderId:
          provider?.id || "00000000-0000-4000-8000-000000000000",
      };
    }
    return user.role === "CLIENT" ? { clientUserId: user.id } : {};
  };
  const summary = async (query = {}) => {
    const from = query.startDate ? asDay(query.startDate) : null,
      to = query.endDate
        ? new Date(`${dayText(asDay(query.endDate))}T23:59:59.999Z`)
        : null;
    if (from && to && from > to)
      fail("Report start date must precede end date.");
    const range =
      from || to
        ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
        : undefined;
    const timestampRange =
      from || to
        ? {
            ...(from
              ? { gte: new Date(`${dayText(from)}T00:00:00+02:00`) }
              : {}),
            ...(to
              ? { lte: new Date(`${dayText(to)}T23:59:59.999+02:00`) }
              : {}),
          }
        : undefined;
    const [
      requests,
      invoices,
      payroll,
      expenses,
      feedback,
      attendance,
      staff,
      payments,
    ] = await Promise.all([
      db.serviceRequest.groupBy({
        by: ["status"],
        where: { requestedDate: range },
        _count: { _all: true },
      }),
      db.invoice.findMany({
        where: { createdAt: timestampRange },
        include: { payments: true },
      }),
      db.payroll.findMany({
        where: { status: "Paid", paidAt: timestampRange },
      }),
      db.expense.findMany({ where: { date: range } }),
      db.customerFeedback.count({
        where: { kind: "complaint", status: { not: "Resolved" } },
      }),
      db.workAttendance.findMany({ where: { verificationStatus: "Flagged" } }),
      db.user.count({
        where: { role: { in: ["EMPLOYEE", "PROVIDER"] }, isActive: true },
      }),
      db.payment.findMany({
        where: { createdAt: timestampRange, status: "Recorded" },
      }),
    ]);
    const revenueRwf = payments.reduce(
      (n, p) => n + (p.kind === "REFUND" ? -1 : 1) * Number(p.amountRwf),
      0,
    );
    const expenseRwf = expenses.reduce((n, p) => n + Number(p.amountRwf), 0),
      payrollPaidRwf = payroll
        .filter((p) => p.status === "Paid")
        .reduce((n, p) => n + Number(p.netRwf), 0);
    const monthly = {};
    for (const payment of payments) {
      const month = dayText(
        new Date(new Date(payment.createdAt).valueOf() + 2 * 3600000),
      ).slice(0, 7);
      monthly[month] ||= { month, revenueRwf: 0, expenseRwf: 0, payrollRwf: 0 };
      monthly[month].revenueRwf +=
        (payment.kind === "REFUND" ? -1 : 1) * Number(payment.amountRwf);
    }
    for (const expense of expenses) {
      const month = dayText(expense.date).slice(0, 7);
      monthly[month] ||= { month, revenueRwf: 0, expenseRwf: 0, payrollRwf: 0 };
      monthly[month].expenseRwf += Number(expense.amountRwf);
    }
    for (const pay of payroll.filter((p) => p.status === "Paid")) {
      const month = dayText(
        new Date(new Date(pay.paidAt).valueOf() + 2 * 3600000),
      ).slice(0, 7);
      monthly[month] ||= { month, revenueRwf: 0, expenseRwf: 0, payrollRwf: 0 };
      monthly[month].payrollRwf += Number(pay.netRwf);
    }
    return {
      monthly: Object.values(monthly).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      startDate: query.startDate || null,
      endDate: query.endDate || null,
      requestStatuses: requests.map((x) => ({
        status: x.status,
        count: x._count._all,
      })),
      totalRequests: requests.reduce((n, x) => n + x._count._all, 0),
      invoicedRwf: invoices.reduce((n, i) => n + Number(i.totalRwf), 0),
      revenueRwf,
      outstandingRwf: invoices.reduce(
        (n, i) => n + invoiceBalance(i).balanceRwf,
        0,
      ),
      expenseRwf,
      payrollPaidRwf,
      netCashRwf: revenueRwf - expenseRwf - payrollPaidRwf,
      openComplaints: feedback,
      flaggedAttendance: attendance.length,
      activeStaff: staff,
    };
  };

  router.get(
    "/public-settings",
    route(async (_req, res) =>
      res.json({
        ...publicSettings(),
        departments: await db.department.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
        }),
      }),
    ),
  );
  router.post(
    "/contact",
    publicFormLimit,
    requireWebRequest,
    route(async (req, res) => {
      const name = text(req.body.name, 120),
        email = text(req.body.email, 254).toLowerCase(),
        phone = text(req.body.phone, 24),
        subject = text(req.body.subject, 160),
        message = text(req.body.message, 2000);
      if (
        name.length < 2 ||
        !emailOK(email) ||
        !subject ||
        message.length < 10 ||
        req.body.consent !== true
      )
        fail("Complete your name, email, subject, message and consent.");
      const row = await db.contactEnquiry.create({
        data: { name, email, phone, subject, message },
      });
      await notifyAdmins(
        "New contact enquiry",
        `A website enquiry is ready for review: ${subject}.`,
      );
      await sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: "New website enquiry",
        text: `A new enquiry is in the operations workspace. Reference: ${row.id}.`,
      });
      res.status(201).json({
        reference: row.id,
        message: "Your message has been received. Our team will follow up.",
      });
    }),
  );

  router.get(
    "/workspace",
    ...auth,
    route(async (req, res) => {
      const user = req.user,
        isAdmin = user.role === "ADMIN",
        management = isManager(user),
        staff = ["ADMIN", "OPERATIONS", "EMPLOYEE", "PROVIDER"].includes(
          user.role,
        );
      if (user.mustChangePassword)
        return res.json({
          user: accountView(user),
          requests: [],
          applications: [],
          employees: [],
          clients: [],
          administrators: [],
          staffProfiles: [],
          households: [],
          departments: [],
          notifications: [],
          invoices: [],
          payroll: [],
          expenses: [],
          feedback: [],
          leaveRequests: [],
          documents: [],
          serviceChanges: [],
          contacts: [],
          summary: {},
          settings: publicSettings(),
        });
      const filter = await assignedIds(user);
      const rows = await db.serviceRequest.findMany({
        where: filter,
        include: {
          assignedEmployee: { select: { fullName: true } },
          assignedProvider: {
            select: { fullName: true, reference: true, userId: true },
          },
          attendance: { include: { employee: { select: { fullName: true } } } },
          reports: {
            include: { employee: { select: { fullName: true } } },
            orderBy: { createdAt: "desc" },
          },
          feedback: true,
        },
        orderBy: [{ requestedDate: "desc" }, { createdAt: "desc" }],
        take: 1000,
      });
      const householdIds = rows.map((r) => r.householdId).filter(Boolean);
      const [
        applications,
        users,
        households,
        departments,
        notifications,
        invoices,
        payroll,
        expenses,
        feedback,
        leaveRequests,
        documents,
        serviceChanges,
        contacts,
      ] = await Promise.all([
        management
          ? db.providerApplication.findMany({
              include: { user: { select: { email: true, isActive: true } } },
            })
          : [],
        management
          ? db.user.findMany({
              where: { role: { in: ["EMPLOYEE", "PROVIDER", "OPERATIONS"] } },
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
              },
            })
          : [],
        db.household.findMany({
          where: management
            ? {}
            : user.role === "CLIENT"
              ? { clientId: user.id }
              : { id: { in: householdIds } },
        }),
        db.department.findMany({ orderBy: { name: "asc" } }),
        db.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        ["ADMIN", "CLIENT"].includes(user.role)
          ? db.invoice.findMany({
              where: isAdmin ? {} : { clientId: user.id },
              include: { payments: true },
              orderBy: { createdAt: "desc" },
            })
          : [],
        ["ADMIN", "EMPLOYEE", "PROVIDER"].includes(user.role)
          ? db.payroll.findMany({
              where: isAdmin ? {} : { employeeId: user.id },
              orderBy: { periodStart: "desc" },
            })
          : [],
        isAdmin ? db.expense.findMany({ orderBy: { date: "desc" } }) : [],
        management
          ? db.customerFeedback.findMany({
              include: {
                client: { select: { fullName: true } },
                request: { select: { reference: true, service: true } },
              },
              orderBy: { createdAt: "desc" },
            })
          : user.role === "CLIENT"
            ? db.customerFeedback.findMany({ where: { clientId: user.id } })
            : [],
        staff
          ? db.employeeLeaveRequest.findMany({
              where: management ? {} : { employeeId: user.id },
              include: {
                employee: { select: { fullName: true } },
                reviewer: { select: { fullName: true } },
              },
              orderBy: { createdAt: "desc" },
            })
          : [],
        user.role !== "OPERATIONS"
          ? db.privateDocument.findMany({
              where: isAdmin ? {} : { ownerUserId: user.id },
              select: {
                id: true,
                name: true,
                mimeType: true,
                size: true,
                category: true,
                status: true,
                ownerUserId: true,
                householdId: true,
                reviewerNote: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            })
          : [],
        ["ADMIN", "OPERATIONS", "CLIENT"].includes(user.role)
          ? db.serviceChange.findMany({
              where: management ? {} : { clientId: user.id },
              orderBy: { createdAt: "desc" },
            })
          : [],
        management
          ? db.contactEnquiry.findMany({
              orderBy: { createdAt: "desc" },
              take: 100,
            })
          : [],
      ]);
      const profiles = await db.staffProfile.findMany({
        where: management ? {} : { userId: user.id },
      });
      if (!isAdmin)
        for (const p of profiles) {
          delete p.hourlyRateRwf;
          delete p.monthlySalaryRwf;
        }
      const clients = management
        ? await db.user.findMany({
            where: { role: "CLIENT" },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              isActive: true,
            },
          })
        : [];
      const administrators = management
        ? await db.user.findMany({
            where: { role: "ADMIN", isActive: true },
            select: { id: true, fullName: true, email: true },
          })
        : [];
      const workerUsers = await db.user.findMany({
        where: {
          id: {
            in: rows
              .flatMap((row) => [
                row.assignedEmployeeId,
                row.assignedProvider?.userId,
              ])
              .filter(Boolean),
          },
        },
        select: { id: true, fullName: true },
      });
      const workerProfiles = await db.staffProfile.findMany({
        where: {
          userId: { in: workerUsers.map((u) => u.id) },
          screeningStatus: "Cleared",
        },
      });
      const requests = rows.map((row) => {
        const view = requestView(row, user, {
          includeAttendanceLocation: isAdmin,
        });
        const worker = workerProfiles.find(
          (p) =>
            p.userId ===
            (row.assignedEmployeeId || row.assignedProvider?.userId),
        );
        view.workerProfile = worker
          ? {
              jobTitle: worker.jobTitle,
              qualifications: worker.qualifications,
              departmentId: worker.departmentId,
            }
          : null;
        if (!isAdmin && user.role !== "CLIENT")
          for (const key of [
            "quotedAmountRwf",
            "paymentMethod",
            "clientPaymentStatus",
            "providerPaymentStatus",
            "transactionReference",
            "quoted_amount_rwf",
            "payment_method",
            "client_payment_status",
            "provider_payment_status",
            "transaction_reference",
          ])
            delete view[key];
        return view;
      });
      res.json({
        user: accountView(user),
        requests,
        clients,
        administrators,
        applications: applications.map(applicationView),
        employees: users.map((u) => ({
          ...u,
          profile: profiles.find((p) => p.userId === u.id) || null,
        })),
        staffProfiles: profiles,
        households,
        departments,
        notifications,
        invoices: invoices.map(invoiceView),
        payroll,
        expenses,
        feedback: feedback.map((f) => ({
          ...f,
          client_name: f.client?.fullName,
          reference: f.request?.reference,
          service: f.request?.service,
          created_at: f.createdAt,
        })),
        leaveRequests: leaveRequests.map((l) => ({
          ...l,
          employee_name: l.employee?.fullName,
          reviewer_name: l.reviewer?.fullName,
          start_date: dayText(l.startDate),
          end_date: dayText(l.endDate),
          reviewer_note: l.reviewerNote,
        })),
        documents,
        serviceChanges,
        contacts,
        summary: isAdmin
          ? await summary()
          : management
            ? {
                requestStatuses: (
                  await db.serviceRequest.groupBy({
                    by: ["status"],
                    _count: { _all: true },
                  })
                ).map((x) => ({ status: x.status, count: x._count._all })),
                openComplaints: feedback.filter(
                  (f) => f.kind === "complaint" && f.status !== "Resolved",
                ).length,
              }
            : {},
        settings: publicSettings(),
      });
    }),
  );

  function householdData(body, user, existing) {
    const name = text(body.name, 120),
      address = text(body.address, 500),
      neighborhood = text(body.neighborhood, 120);
    if (name.length < 2 || address.length < 5 || neighborhood.length < 2)
      fail("A household name, address and neighbourhood are required.");
    let latitude =
      body.latitude === "" ||
      body.latitude === undefined ||
      body.latitude === null
        ? null
        : Number(body.latitude);
    let longitude =
      body.longitude === "" ||
      body.longitude === undefined ||
      body.longitude === null
        ? null
        : Number(body.longitude);
    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        (!Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180))
    )
      fail("Provide valid latitude and longitude together.");
    const geofenceMeters = Number(body.geofenceMeters || 150);
    if (
      !Number.isInteger(geofenceMeters) ||
      geofenceMeters < 50 ||
      geofenceMeters > 1000
    )
      fail("The attendance radius must be between 50 and 1,000 metres.");
    const contacts = Array.isArray(body.contacts)
      ? body.contacts.slice(0, 12).map((c) => ({
          name: text(c.name, 120),
          relationship: text(c.relationship, 80),
          phone: text(c.phone, 24),
          email: text(c.email, 254),
          isEmergency: c.isEmergency === true,
          isAuthorized: c.isAuthorized === true,
        }))
      : [];
    if (
      contacts.some(
        (c) => !c.name || !c.phone || (c.email && !emailOK(c.email)),
      )
    )
      fail(
        "Every contact needs a name and phone; email must be valid when supplied.",
      );
    const locationChanged =
      existing &&
      ((existing.latitude === null ? null : Number(existing.latitude)) !==
        latitude ||
        (existing.longitude === null ? null : Number(existing.longitude)) !==
          longitude ||
        Number(existing.geofenceMeters) !== geofenceMeters);
    return {
      name,
      address,
      neighborhood,
      latitude,
      longitude,
      geofenceMeters,
      contacts,
      notes: text(body.notes, 2000),
      locationApproved:
        isManager(user) && body.locationApproved === true
          ? true
          : (existing?.locationApproved && !locationChanged) || false,
    };
  }
  router.get(
    "/households",
    ...auth,
    route(async (req, res) =>
      res.json(
        await db.household.findMany({
          where: isManager(req.user) ? {} : { clientId: req.user.id },
        }),
      ),
    ),
  );
  router.post(
    "/households",
    ...write,
    route(async (req, res) => {
      if (!["CLIENT", "ADMIN", "OPERATIONS"].includes(req.user.role))
        fail("Client or administrator access is required.", 403);
      const clientId = isManager(req.user)
        ? text(req.body.clientId)
        : req.user.id;
      if (
        !idOK(clientId) ||
        !(await db.user.findFirst({ where: { id: clientId, role: "CLIENT" } }))
      )
        fail("Choose a valid client account for the household.");
      const row = await db.household.create({
        data: { ...householdData(req.body, req.user), clientId },
      });
      await audit(db, req.user.email, "household_created", "household", row.id);
      res.status(201).json(row);
    }),
  );
  router.patch(
    "/households/:id",
    ...write,
    route(async (req, res) => {
      const existing = await ownedHousehold(req.params.id, req.user);
      const row = await db.household.update({
        where: { id: existing.id },
        data: householdData({ ...existing, ...req.body }, req.user, existing),
      });
      await audit(db, req.user.email, "household_updated", "household", row.id);
      res.json(row);
    }),
  );
  router.patch(
    "/requests/:id/household",
    ...write,
    route(async (req, res) => {
      if (!idOK(req.params.id)) fail("Request not found.", 404);
      const row = await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const request = await tx.serviceRequest.findUnique({
          where: { id: req.params.id },
        });
        if (
          !request ||
          (!isManager(req.user) && request.clientUserId !== req.user.id)
        )
          fail("Request not found.", 404);
        const household = await ownedHousehold(
          req.body.householdId,
          req.user,
          tx,
        );
        if (request.clientUserId && household.clientId !== request.clientUserId)
          fail("The household must belong to the request client.");
        if (request.householdId !== household.id) {
          if (
            await tx.workAttendance.findFirst({
              where: { requestId: request.id },
            })
          )
            fail(
              "The household cannot change after attendance has been recorded.",
              409,
            );
          if (
            !isManager(req.user) &&
            ![
              "New request",
              "Under review",
              "Awaiting customer confirmation",
            ].includes(request.status)
          )
            fail(
              "Ask the team to review a household change for a confirmed or assigned visit.",
              409,
            );
        }
        const invoice = await tx.invoice.findUnique({
          where: { requestId: request.id },
        });
        if (invoice?.clientId && invoice.clientId !== household.clientId)
          fail("The invoice belongs to another client account.", 409);
        const updated = await tx.serviceRequest.update({
          where: { id: request.id },
          data: {
            householdId: household.id,
            clientUserId: request.clientUserId || household.clientId,
          },
        });
        if (invoice && !invoice.clientId)
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { clientId: household.clientId },
          });
        await audit(
          tx,
          req.user.email,
          "request_household_linked",
          "request",
          request.id,
        );
        return updated;
      });
      res.json(requestView(row, req.user));
    }),
  );

  const departmentData = (body) => {
    const name = text(body.name, 100),
      service = text(body.service, 32),
      minimumHours = Number(body.minimumHours || 2);
    if (
      !name ||
      !["elderly", "childcare", "cooking", "cleaning", "security"].includes(
        service,
      ) ||
      !Number.isInteger(minimumHours) ||
      minimumHours < 1 ||
      minimumHours > 24
    )
      fail("Provide a department name, service and valid minimum hours.");
    return {
      name,
      service,
      description: text(body.description, 1000),
      hourlyRateRwf: money(body.hourlyRateRwf || 0),
      minimumHours,
      qualificationRules: (Array.isArray(body.qualificationRules)
        ? body.qualificationRules
        : typeof body.qualificationRules === "string"
          ? body.qualificationRules.split(/[,\n]/)
          : []
      )
        .slice(0, 20)
        .map((r) => text(r, 120))
        .filter(Boolean),
      active: body.active !== false,
    };
  };
  router.post(
    "/departments",
    ...adminWrite,
    route(async (req, res) =>
      res
        .status(201)
        .json(await db.department.create({ data: departmentData(req.body) })),
    ),
  );
  router.patch(
    "/departments/:id",
    ...adminWrite,
    route(async (req, res) => {
      const current = await db.department.findUnique({
        where: { id: req.params.id },
      });
      if (!current) fail("Department not found.", 404);
      res.json(
        await db.department.update({
          where: { id: current.id },
          data: departmentData({ ...current, ...req.body }),
        }),
      );
    }),
  );
  router.put(
    "/staff-profiles/:userId",
    ...managerWrite,
    route(async (req, res) => {
      const user =
        idOK(req.params.userId) &&
        (await db.user.findFirst({
          where: {
            id: req.params.userId,
            role: { in: ["EMPLOYEE", "PROVIDER"] },
          },
        }));
      if (!user) fail("Staff account not found.", 404);
      const existing = await db.staffProfile.findUnique({
        where: { userId: user.id },
      });
      const b = { ...(existing || {}), ...req.body },
        availability = Array.isArray(b.availability)
          ? b.availability.slice(0, 21)
          : [];
      if (
        availability.some(
          (s) =>
            !Number.isInteger(Number(s.day)) ||
            s.day < 0 ||
            s.day > 6 ||
            !validClock(s.start) ||
            !validClock(s.end) ||
            s.end <= s.start,
        )
      )
        fail("Availability needs a weekday and valid start/end times.");
      if (
        !["Pending", "In review", "Cleared", "Rejected"].includes(
          b.screeningStatus,
        ) ||
        !["Active", "Paused", "Ended"].includes(b.status || "Active")
      )
        fail("Choose a valid screening and contract status.");
      const departmentId = text(b.departmentId) || null;
      if (
        departmentId &&
        (!idOK(departmentId) ||
          !(await db.department.findUnique({ where: { id: departmentId } })))
      )
        fail("Choose a valid department.");
      if (b.contractStart && b.contractEnd && b.contractEnd < b.contractStart)
        fail("Contract end must follow its start.");
      const data = {
        departmentId,
        jobTitle: text(b.jobTitle, 120),
        screeningStatus: b.screeningStatus,
        screeningNotes: text(b.screeningNotes, 2000),
        qualifications: Array.isArray(b.qualifications)
          ? b.qualifications.slice(0, 30).map((q) => text(q, 120))
          : [],
        availability,
        hourlyRateRwf: money(b.hourlyRateRwf || 0),
        monthlySalaryRwf: money(b.monthlySalaryRwf || 0),
        contractStart: b.contractStart ? asDay(b.contractStart) : null,
        contractEnd: b.contractEnd ? asDay(b.contractEnd) : null,
        status: b.status || "Active",
      };
      if (req.user.role !== "ADMIN") {
        data.hourlyRateRwf = existing?.hourlyRateRwf || 0;
        data.monthlySalaryRwf = existing?.monthlySalaryRwf || 0;
      }
      const row = await db.staffProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...data },
        update: data,
      });
      await audit(db, req.user.email, "staff_profile_updated", "user", user.id);
      if (req.user.role !== "ADMIN") {
        delete row.hourlyRateRwf;
        delete row.monthlySalaryRwf;
      }
      res.json(row);
    }),
  );

  router.post(
    "/documents",
    ...write,
    documentUploadLimit,
    route(async (req, res) => {
      if (req.user.role === "OPERATIONS")
        fail("Private document access is restricted.", 403);
      const name = text(req.body.name, 180),
        mimeType = text(req.body.mimeType, 100),
        category = text(req.body.category, 64);
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      const ownerUserId =
        req.user.role === "ADMIN" && req.body.ownerUserId
          ? req.body.ownerUserId
          : req.user.id;
      if (
        !name ||
        !category ||
        !allowed.includes(mimeType) ||
        !idOK(ownerUserId) ||
        !(await db.user.findUnique({ where: { id: ownerUserId } }))
      )
        fail("Choose a PDF, JPEG or PNG document and its category.");
      if (
        typeof req.body.contentBase64 !== "string" ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(req.body.contentBase64)
      )
        fail("Document content is invalid.");
      const bytes = Buffer.from(req.body.contentBase64, "base64");
      if (!bytes.length || bytes.length > 5 * 1024 * 1024)
        fail("Documents must be between 1 byte and 5 MB.");
      const matches =
        mimeType === "application/pdf"
          ? bytes.subarray(0, 5).toString() === "%PDF-"
          : mimeType === "image/png"
            ? bytes
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!matches)
        fail("The file content does not match its selected document type.");
      let householdId = null;
      if (req.body.householdId)
        householdId = (await ownedHousehold(req.body.householdId, req.user)).id;
      await fs.mkdir(storageRoot, { recursive: true, mode: 0o700 });
      const storageKey = `${crypto.randomUUID()}.bin`,
        filename = path.join(storageRoot, storageKey);
      await fs.writeFile(filename, bytes, { mode: 0o600, flag: "wx" });
      let row;
      try {
        row = await db.privateDocument.create({
          data: {
            uploaderId: req.user.id,
            ownerUserId,
            householdId,
            name,
            mimeType,
            size: bytes.length,
            storageKey,
            category,
          },
        });
      } catch (error) {
        await fs.unlink(filename);
        throw error;
      }
      await audit(db, req.user.email, "document_uploaded", "document", row.id, {
        category,
      });
      await notifyAdmins(
        "Document ready for review",
        "A private document was uploaded.",
      );
      const { storageKey: _key, ...view } = row;
      res.status(201).json(view);
    }),
  );
  router.get(
    "/documents/:id/download",
    ...auth,
    route(async (req, res) => {
      if (req.user.role === "OPERATIONS")
        fail("Private document access is restricted.", 403);
      const row =
        idOK(req.params.id) &&
        (await db.privateDocument.findUnique({ where: { id: req.params.id } }));
      if (
        !row ||
        (req.user.role !== "ADMIN" && row.ownerUserId !== req.user.id)
      )
        fail("Document not found.", 404);
      const filename = path.join(storageRoot, path.basename(row.storageKey));
      try {
        await fs.access(filename);
      } catch {
        fail(
          "Document storage is unavailable. Ask an administrator to restore the document.",
          503,
        );
      }
      await audit(
        db,
        req.user.email,
        "document_downloaded",
        "document",
        row.id,
      );
      res.set({
        "Content-Type": row.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.download(filename, row.name.replace(/[\r\n"\\/]/g, "_"));
    }),
  );
  router.patch(
    "/documents/:id/review",
    ...adminWrite,
    route(async (req, res) => {
      if (
        !idOK(req.params.id) ||
        !["Approved", "Rejected"].includes(req.body.status)
      )
        fail("Choose an approval decision.");
      const row = await db.privateDocument.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          reviewerNote: text(req.body.note, 1000),
          reviewerId: req.user.id,
        },
      });
      await audit(db, req.user.email, "document_reviewed", "document", row.id, {
        status: row.status,
      });
      await note(
        row.ownerUserId,
        "Document review updated",
        `${row.name}: ${row.status}.`,
      );
      res.json({
        id: row.id,
        status: row.status,
        reviewerNote: row.reviewerNote,
      });
    }),
  );
  router.patch(
    "/notifications/:id",
    ...write,
    route(async (req, res) => {
      const row =
        idOK(req.params.id) &&
        (await db.notification.findFirst({
          where: { id: req.params.id, userId: req.user.id },
        }));
      if (!row) fail("Notification not found.", 404);
      res.json(
        await db.notification.update({
          where: { id: row.id },
          data: { readAt: req.body.read === false ? null : new Date() },
        }),
      );
    }),
  );

  router.post(
    "/invoices",
    ...adminWrite,
    route(async (req, res) => {
      const request =
        idOK(req.body.requestId) &&
        (await db.serviceRequest.findUnique({
          where: { id: req.body.requestId },
        }));
      if (!request) fail("Choose a valid service request.");
      const amounts = invoiceTotal(req.body.lineItems);
      const invoice = await db.$transaction(async (tx) => {
        const row = await tx.invoice.create({
          data: {
            requestId: request.id,
            clientId: request.clientUserId,
            number: `WHC-${new Date().getFullYear()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
            ...amounts,
            dueDate: req.body.dueDate ? asDay(req.body.dueDate) : null,
          },
          include: { payments: true },
        });
        await tx.serviceRequest.update({
          where: { id: request.id },
          data: {
            quotedAmountRwf: amounts.totalRwf,
            clientPaymentStatus: "Quoted",
          },
        });
        await audit(tx, req.user.email, "invoice_created", "invoice", row.id, {
          totalRwf: amounts.totalRwf,
        });
        return row;
      });
      await note(
        invoice.clientId,
        "Your invoice is ready",
        `${invoice.number} is ready in your account.`,
      );
      res.status(201).json(invoiceView(invoice));
    }),
  );
  router.get(
    "/invoices/:id",
    ...auth,
    route(async (req, res) => {
      const invoice = await ownInvoice(req.params.id, req.user);
      const request = await db.serviceRequest.findUnique({
        where: { id: invoice.requestId },
        select: {
          fullName: true,
          email: true,
          phone: true,
          reference: true,
          requestedDate: true,
          service: true,
        },
      });
      res.json({
        ...invoiceView(invoice),
        customer: request,
        business: publicSettings(),
      });
    }),
  );
  async function recordPayment(tx, invoice, data, actor) {
    const amountRwf = money(data.amountRwf),
      kind = data.kind || "PAYMENT";
    if (amountRwf <= 0 || !["PAYMENT", "REFUND"].includes(kind))
      fail("Enter a payment or refund amount greater than zero.");
    const balance = invoiceBalance(invoice);
    if (kind === "REFUND" && amountRwf > balance.netPaidRwf)
      fail("The refund cannot exceed the net amount paid.");
    if (kind === "PAYMENT" && amountRwf > balance.balanceRwf)
      fail("The payment cannot exceed the invoice balance.");
    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountRwf,
        kind,
        method: data.method,
        reference: text(data.reference, 180),
        providerReference: data.providerReference || null,
        recordedBy: actor?.id || null,
      },
    });
    const updated = { ...invoice, payments: [...invoice.payments, payment] },
      totals = invoiceBalance(updated);
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: totals.status },
    });
    await tx.serviceRequest.update({
      where: { id: invoice.requestId },
      data: {
        clientPaymentStatus:
          totals.status === "Unpaid" ? "Quoted" : totals.status,
        paymentMethod: data.method,
        transactionReference: payment.reference,
      },
    });
    if (actor)
      await audit(
        tx,
        actor.email,
        kind === "REFUND" ? "refund_recorded" : "payment_recorded",
        "invoice",
        invoice.id,
        { amountRwf, reference: payment.reference },
      );
    return invoiceView({ ...updated, status: totals.status });
  }
  router.post(
    "/invoices/:id/payments",
    ...adminWrite,
    route(async (req, res) => {
      if (
        !["Cash", "Bank transfer", "Mobile money", "Other"].includes(
          req.body.method,
        ) ||
        !text(req.body.reference)
      )
        fail(
          "Choose a payment method and provide a transaction/receipt reference.",
        );
      const invoice = await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM invoices WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        return recordPayment(
          tx,
          await ownInvoice(req.params.id, req.user, tx),
          req.body,
          req.user,
        );
      });
      await note(
        invoice.clientId,
        "Payment record updated",
        `The payment record for ${invoice.number} has been updated.`,
      );
      res.status(201).json(invoice);
    }),
  );
  router.post(
    "/invoices/:id/checkout",
    ...write,
    route(async (req, res) => {
      if (!publicSettings().paymentsEnabled)
        fail(
          "Online payments are not configured yet. Contact the team to arrange payment.",
          503,
        );
      const invoice = await ownInvoice(req.params.id, req.user),
        balance = invoiceBalance(invoice);
      if (balance.balanceRwf <= 0)
        fail("This invoice has no outstanding balance.", 409);
      const customer = invoice.clientId
        ? await db.user.findUnique({ where: { id: invoice.clientId } })
        : null;
      if (!customer?.email)
        fail(
          "This invoice needs a client account with an email address before online payment.",
        );
      const txRef = `whc-${crypto.randomUUID()}`;
      await db.checkoutSession.create({
        data: { invoiceId: invoice.id, txRef, amountRwf: balance.balanceRwf },
      });
      const response = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: balance.balanceRwf,
          currency: "RWF",
          redirect_url: `${process.env.PUBLIC_URL.replace(/\/$/, "")}/account?payment=return`,
          customer: { email: customer.email, name: customer.fullName },
          customizations: {
            title: publicSettings().businessName,
            description: invoice.number,
          },
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json().catch(() => ({}));
      const url = result.data?.link;
      if (
        !response.ok ||
        result.status !== "success" ||
        typeof url !== "string" ||
        !url.startsWith("https://")
      ) {
        await db.checkoutSession.update({
          where: { txRef },
          data: { status: "Failed" },
        });
        fail(
          "The payment provider could not create a checkout. Try again later.",
          502,
        );
      }
      res.json({ url });
    }),
  );
  router.post(
    "/payments/flutterwave/webhook",
    route(async (req, res) => {
      const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || "",
        supplied = req.get("verif-hash") || "";
      if (
        !secret ||
        secret.length !== supplied.length ||
        !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
      )
        fail("Webhook authorization failed.", 401);
      const providerId = String(req.body?.data?.id || "");
      if (!/^\d+$/.test(providerId)) fail("Missing transaction identifier.");
      const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/${providerId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          },
          signal: AbortSignal.timeout(20000),
        },
      );
      const result = await response.json(),
        data = result.data;
      if (
        !response.ok ||
        result.status !== "success" ||
        data?.status !== "successful" ||
        data.currency !== "RWF"
      )
        fail("Payment verification failed.", 400);
      const session = await db.checkoutSession.findUnique({
        where: { txRef: data.tx_ref },
      });
      if (!session || money(data.amount) !== Number(session.amountRwf))
        fail("Payment reference or amount does not match.");
      await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM checkout_sessions WHERE id = $1::uuid FOR UPDATE",
          session.id,
        );
        if (
          await tx.payment.findUnique({
            where: { providerReference: `flutterwave:${providerId}` },
          })
        )
          return;
        const current = await tx.checkoutSession.findUnique({
          where: { id: session.id },
        });
        if (current.status === "Paid") return;
        await tx.$queryRawUnsafe(
          "SELECT id FROM invoices WHERE id = $1::uuid FOR UPDATE",
          session.invoiceId,
        );
        const invoice = await tx.invoice.findUnique({
          where: { id: session.invoiceId },
          include: { payments: true },
        });
        if (Number(session.amountRwf) > invoiceBalance(invoice).balanceRwf) {
          await tx.checkoutSession.update({
            where: { id: session.id },
            data: { status: "Needs review", providerId },
          });
          await tx.notification.createMany({
            data: (
              await tx.user.findMany({
                where: { role: "ADMIN" },
                select: { id: true },
              })
            ).map((u) => ({
              userId: u.id,
              title: "Payment requires reconciliation",
              message:
                "An online payment arrived after the invoice balance changed. Review it with the provider.",
              link: "/staff",
            })),
          });
          return;
        }
        await recordPayment(
          tx,
          invoice,
          {
            amountRwf: session.amountRwf,
            kind: "PAYMENT",
            method: "Mobile money",
            reference: String(data.flw_ref || providerId),
            providerReference: `flutterwave:${providerId}`,
          },
          null,
        );
        await tx.checkoutSession.update({
          where: { id: session.id },
          data: { status: "Paid", providerId },
        });
      });
      res.json({ received: true });
    }),
  );

  router.post(
    "/payroll/calculate",
    ...adminWrite,
    route(async (req, res) => {
      if (
        !idOK(req.body.employeeId) ||
        !validDay(req.body.periodStart) ||
        !validDay(req.body.periodEnd) ||
        req.body.periodEnd < req.body.periodStart
      )
        fail("Choose a staff member and valid payroll period.");
      if (
        (asDay(req.body.periodEnd) - asDay(req.body.periodStart)) / 86400000 >
        92
      )
        fail("Payroll periods cannot exceed 93 days.");
      const row = await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM users WHERE id = $1::uuid FOR UPDATE",
          req.body.employeeId,
        );
        const employee = await tx.user.findFirst({
          where: {
            id: req.body.employeeId,
            role: { in: ["EMPLOYEE", "PROVIDER"] },
          },
        });
        if (!employee) fail("Choose a staff member and valid payroll period.");
        const profile = await tx.staffProfile.findUnique({
          where: { userId: employee.id },
        });
        if (
          !profile ||
          (Number(profile.hourlyRateRwf) <= 0 &&
            Number(profile.monthlySalaryRwf) <= 0)
        )
          fail("Set the staff member’s contracted pay rate first.");
        const overlap = await tx.payroll.findFirst({
          where: {
            employeeId: employee.id,
            periodStart: { lte: asDay(req.body.periodEnd) },
            periodEnd: { gte: asDay(req.body.periodStart) },
          },
        });
        if (overlap)
          fail("A payroll record already covers part of that period.", 409);
        const attendance = await tx.workAttendance.findMany({
          where: {
            employeeId: employee.id,
            verificationStatus: { in: ["Verified", "Approved"] },
            request: { status: { in: ["Completed", "Complaint open"] } },
            checkOutAt: {
              not: null,
              gte: new Date(`${req.body.periodStart}T00:00:00+02:00`),
            },
            checkInAt: {
              lte: new Date(`${req.body.periodEnd}T23:59:59.999+02:00`),
            },
          },
          include: {
            request: {
              select: {
                requestedDate: true,
                startTime: true,
                durationHours: true,
              },
            },
          },
        });
        const totals = payrollTotals(
          attendance,
          req.body.periodStart,
          req.body.periodEnd,
          profile.hourlyRateRwf,
          profile.monthlySalaryRwf,
          req.body.deductionsRwf,
        );
        const payroll = await tx.payroll.create({
          data: {
            employeeId: employee.id,
            periodStart: asDay(req.body.periodStart),
            periodEnd: asDay(req.body.periodEnd),
            rateRwf: profile.hourlyRateRwf,
            ...totals,
          },
        });
        await audit(
          tx,
          req.user.email,
          "payroll_calculated",
          "payroll",
          payroll.id,
        );
        return { ...payroll, employeeName: employee.fullName };
      });
      res.status(201).json(row);
    }),
  );
  router.patch(
    "/payroll/:id",
    ...adminWrite,
    route(async (req, res) => {
      if (
        !idOK(req.params.id) ||
        !["Approved", "Paid"].includes(req.body.status)
      )
        fail("Choose a valid payroll action.");
      const row = await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM payroll WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const current = await tx.payroll.findUnique({
          where: { id: req.params.id },
        });
        if (!current) fail("Payroll not found.", 404);
        if (
          (req.body.status === "Approved" && current.status !== "Draft") ||
          (req.body.status === "Paid" && current.status !== "Approved")
        )
          fail("Payroll must be calculated, approved, then marked paid.", 409);
        if (req.body.status === "Paid" && !text(req.body.reference))
          fail("A payment reference is required.");
        const updated = await tx.payroll.update({
          where: { id: current.id },
          data:
            req.body.status === "Approved"
              ? { status: "Approved", approvedBy: req.user.id }
              : {
                  status: "Paid",
                  paidAt: new Date(),
                  reference: text(req.body.reference, 180),
                },
        });
        await audit(
          tx,
          req.user.email,
          req.body.status === "Paid" ? "payroll_paid" : "payroll_approved",
          "payroll",
          current.id,
        );
        return updated;
      });
      await note(
        row.employeeId,
        "Payroll updated",
        `Your ${dayText(row.periodStart)} to ${dayText(row.periodEnd)} payroll is ${row.status.toLowerCase()}.`,
        "/staff",
      );
      res.json(row);
    }),
  );
  router.post(
    "/expenses",
    ...adminWrite,
    route(async (req, res) => {
      if (
        !validDay(req.body.date) ||
        !text(req.body.category) ||
        text(req.body.description).length < 3 ||
        money(req.body.amountRwf) <= 0
      )
        fail("Complete the expense date, category, description and amount.");
      const row = await db.expense.create({
        data: {
          date: asDay(req.body.date),
          category: text(req.body.category, 80),
          description: text(req.body.description, 500),
          amountRwf: money(req.body.amountRwf),
          reference: text(req.body.reference, 180) || null,
          createdBy: req.user.id,
        },
      });
      await audit(db, req.user.email, "expense_recorded", "expense", row.id);
      res.status(201).json(row);
    }),
  );
  router.post(
    "/service-changes",
    ...write,
    route(async (req, res) => {
      const request =
        idOK(req.body.requestId) &&
        (await db.serviceRequest.findUnique({
          where: { id: req.body.requestId },
        }));
      if (
        !request ||
        (!isManager(req.user) &&
          (req.user.role !== "CLIENT" || request.clientUserId !== req.user.id))
      )
        fail("Request not found.", 404);
      if (
        ["Completed", "Cancelled", "Declined", "In progress"].includes(
          request.status,
        )
      )
        fail("This visit can no longer be changed through this form.", 409);
      const kind = req.body.kind,
        reason = text(req.body.reason, 1000);
      if (!["Cancel", "Reschedule"].includes(kind) || reason.length < 5)
        fail("Choose the change type and explain the reason.");
      if (
        await db.serviceChange.findFirst({
          where: { requestId: request.id, status: "Pending" },
        })
      )
        fail("This request already has a pending change.", 409);
      const requestedDate = req.body.requestedDate || req.body.date,
        startTime = req.body.startTime || req.body.time,
        durationHours = Number(req.body.durationHours || request.durationHours);
      if (
        kind === "Reschedule" &&
        (!validDay(requestedDate) ||
          requestedDate < dayText(new Date()) ||
          !validClock(startTime) ||
          !Number.isInteger(durationHours) ||
          durationHours < 1 ||
          durationHours > 12)
      )
        fail("Choose a future date, valid time and duration.");
      const row = await db.serviceChange.create({
        data: {
          requestId: request.id,
          clientId: request.clientUserId || req.user.id,
          kind,
          reason,
          ...(kind === "Reschedule"
            ? { requestedDate: asDay(requestedDate), startTime, durationHours }
            : {}),
        },
      });
      await notifyAdmins(
        `${kind} request`,
        `Review a schedule change for ${request.reference}.`,
      );
      res.status(201).json(row);
    }),
  );
  router.patch(
    "/service-changes/:id",
    ...managerWrite,
    route(async (req, res) => {
      if (
        !idOK(req.params.id) ||
        !["Approved", "Declined"].includes(req.body.status)
      )
        fail("Choose an approval decision.");
      const result = await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_changes WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const change = await tx.serviceChange.findUnique({
          where: { id: req.params.id },
        });
        if (!change || change.status !== "Pending")
          fail("This change is unavailable or has already been reviewed.", 409);
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          change.requestId,
        );
        const request = await tx.serviceRequest.findUnique({
          where: { id: change.requestId },
        });
        if (req.body.status === "Approved") {
          if (
            ["In progress", "Completed", "Cancelled", "Declined"].includes(
              request.status,
            )
          )
            fail("This visit can no longer be changed.", 409);
          if (change.kind === "Reschedule") {
            const candidate = {
              ...request,
              requestedDate: change.requestedDate,
              startTime: new Date(`1970-01-01T${change.startTime}:00Z`),
              durationHours: change.durationHours,
            };
            let assignedUserId = request.assignedEmployeeId;
            if (request.assignedProviderId)
              assignedUserId = (
                await tx.providerApplication.findUnique({
                  where: { id: request.assignedProviderId },
                })
              )?.userId;
            const department = await tx.department.findUnique({
              where: { service: request.service },
            });
            if (
              !department?.active ||
              candidate.durationHours < department.minimumHours
            )
              fail(
                "The rescheduled visit needs an active service department and its minimum duration.",
                409,
              );
            if (assignedUserId) {
              await tx.$queryRawUnsafe(
                "SELECT id FROM users WHERE id = $1::uuid FOR UPDATE",
                assignedUserId,
              );
              const conflict = await scheduleConflict(
                tx,
                candidate,
                assignedUserId,
              );
              if (conflict) fail(conflict, 409);
            }
            await tx.serviceRequest.update({
              where: { id: request.id },
              data: {
                requestedDate: candidate.requestedDate,
                startTime: candidate.startTime,
                durationHours: candidate.durationHours,
                status: "Rescheduled",
                employeeResponse: request.assignedEmployeeId
                  ? "Pending"
                  : request.employeeResponse,
                providerResponse: request.assignedProviderId
                  ? "Pending"
                  : request.providerResponse,
              },
            });
          } else
            await tx.serviceRequest.update({
              where: { id: request.id },
              data: { status: "Cancelled" },
            });
        }
        const row = await tx.serviceChange.update({
          where: { id: change.id },
          data: {
            status: req.body.status,
            reviewerNote: text(req.body.reviewerNote, 1000),
            reviewedBy: req.user.id,
          },
        });
        await audit(
          tx,
          req.user.email,
          "service_change_reviewed",
          "request",
          request.id,
          { kind: change.kind, status: row.status },
        );
        return row;
      });
      await note(
        result.clientId,
        "Schedule change reviewed",
        `Your ${result.kind.toLowerCase()} request was ${result.status.toLowerCase()}.`,
      );
      res.json(result);
    }),
  );
  router.patch(
    "/feedback/:id",
    ...managerWrite,
    route(async (req, res) => {
      if (
        !idOK(req.params.id) ||
        !["Received", "Under review", "Resolved"].includes(req.body.status)
      )
        fail("Choose a follow-up status.");
      const assignedTo = text(req.body.assignedTo) || null,
        resolution = text(req.body.resolution, 2000);
      if (
        assignedTo &&
        (!idOK(assignedTo) ||
          !(await db.user.findFirst({
            where: { id: assignedTo, role: "ADMIN", isActive: true },
          })))
      )
        fail("Choose an active administrator to own this case.");
      if (req.body.status === "Resolved" && resolution.length < 5)
        fail("Add a resolution note before closing this case.");
      const row = await db.customerFeedback.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          assignedTo,
          resolution,
          resolvedAt: req.body.status === "Resolved" ? new Date() : null,
        },
      });
      await audit(
        db,
        req.user.email,
        "feedback_reviewed",
        "customer_feedback",
        row.id,
        { status: row.status },
      );
      await note(
        row.clientId,
        "Your feedback has an update",
        `Your case is ${row.status.toLowerCase()}. ${resolution}`,
      );
      res.json(row);
    }),
  );
  router.patch(
    "/contacts/:id",
    ...managerWrite,
    route(async (req, res) => {
      if (!["New", "Under review", "Resolved"].includes(req.body.status))
        fail("Choose a follow-up status.");
      const row = await db.contactEnquiry.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          responseNote: text(req.body.responseNote, 2000),
        },
      });
      res.json(row);
    }),
  );

  router.get(
    "/reports/summary",
    ...admin,
    route(async (req, res) => res.json(await summary(req.query))),
  );
  router.get(
    "/reports/export",
    ...admin,
    route(async (req, res) => {
      const type = req.query.type;
      const sources = {
        requests: () => db.serviceRequest.findMany(),
        payments: () => db.payment.findMany(),
        payroll: () => db.payroll.findMany(),
        expenses: () => db.expense.findMany(),
        providers: () => db.providerApplication.findMany(),
        complaints: () =>
          db.customerFeedback.findMany({ where: { kind: "complaint" } }),
        attendance: () => db.workAttendance.findMany(),
      };
      if (!Object.hasOwn(sources, type))
        fail(
          "Choose requests, payments, payroll, expenses, providers, complaints or attendance.",
        );
      const rows = await sources[type](),
        columns = {
          requests: [
            "reference",
            "fullName",
            "service",
            "requestedDate",
            "status",
            "quotedAmountRwf",
            "clientPaymentStatus",
          ],
          payments: [
            "id",
            "invoiceId",
            "amountRwf",
            "kind",
            "method",
            "reference",
            "createdAt",
          ],
          payroll: [
            "employeeId",
            "periodStart",
            "periodEnd",
            "hours",
            "grossRwf",
            "deductionsRwf",
            "netRwf",
            "status",
          ],
          expenses: [
            "date",
            "category",
            "description",
            "amountRwf",
            "reference",
          ],
          providers: [
            "reference",
            "fullName",
            "service",
            "status",
            "availability",
          ],
          complaints: [
            "id",
            "requestId",
            "message",
            "status",
            "assignedTo",
            "resolution",
          ],
          attendance: [
            "requestId",
            "employeeId",
            "checkInAt",
            "checkOutAt",
            "verificationStatus",
            "distanceMeters",
            "reviewNote",
          ],
        }[type];
      const cell = (x) => {
        let value = x instanceof Date ? x.toISOString() : String(x ?? "");
        if (/^[=+@\-]/.test(value)) value = `'${value}`;
        return `"${value.replaceAll('"', '""')}"`;
      };
      const csv = [columns, ...rows.map((row) => columns.map((c) => row[c]))]
        .map((row) => row.map(cell).join(","))
        .join("\r\n");
      res
        .set({
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="wellness-${type}.csv"`,
          "Cache-Control": "no-store",
        })
        .send(`\uFEFF${csv}`);
    }),
  );

  router.patch(
    "/auth/profile",
    ...write,
    route(async (req, res) => {
      const fullName = text(req.body.fullName, 120),
        phone = text(req.body.phone, 24);
      if (fullName.length < 2 || (phone && !/^[+()\d\s-]{7,24}$/.test(phone)))
        fail("Provide your name and a valid phone number.");
      const user = await db.user.update({
        where: { id: req.user.id },
        data: { fullName, phone: phone || null },
      });
      res.json(accountView(user));
    }),
  );
  router.post(
    "/admin/clients",
    ...adminWrite,
    route(async (req, res) => {
      const fullName = text(req.body.fullName, 120),
        email = text(req.body.email, 254).toLowerCase(),
        phone = text(req.body.phone, 24),
        password =
          typeof req.body.password === "string" ? req.body.password : "";
      if (
        fullName.length < 2 ||
        !emailOK(email) ||
        !/^[+()\d\s-]{7,24}$/.test(phone) ||
        password.length < 12 ||
        password.length > 128
      )
        fail(
          "Provide client name, email, phone and a temporary password with at least 12 characters.",
        );
      const user = await db.user.create({
        data: {
          fullName,
          email,
          phone,
          passwordHash: await bcrypt.hash(password, 12),
          role: "CLIENT",
          mustChangePassword: true,
        },
      });
      await audit(
        db,
        req.user.email,
        "client_account_created",
        "user",
        user.id,
      );
      res.status(201).json(accountView(user));
    }),
  );
  router.patch(
    "/admin/clients/:id",
    ...adminWrite,
    route(async (req, res) => {
      const user =
        idOK(req.params.id) &&
        (await db.user.findFirst({
          where: { id: req.params.id, role: "CLIENT" },
        }));
      if (!user) fail("Client not found.", 404);
      const data = {};
      if (req.body.fullName !== undefined) {
        data.fullName = text(req.body.fullName, 120);
        if (data.fullName.length < 2) fail("Provide a client name.");
      }
      if (req.body.phone !== undefined) {
        data.phone = text(req.body.phone, 24);
        if (!/^[+()\d\s-]{7,24}$/.test(data.phone))
          fail("Provide a valid phone.");
      }
      if (typeof req.body.isActive === "boolean")
        data.isActive = req.body.isActive;
      res.json(
        accountView(await db.user.update({ where: { id: user.id }, data })),
      );
    }),
  );
  router.patch(
    "/employee/assignments/:id/status",
    ...write,
    route(async (req, res) => {
      if (
        !["EMPLOYEE", "PROVIDER"].includes(req.user.role) ||
        !idOK(req.params.id) ||
        !["Delayed", "Unable to Complete"].includes(req.body.status) ||
        text(req.body.note).length < 5
      )
        fail("Choose a progress update and explain what happened.");
      const filter = await assignedIds(req.user);
      const row = await db.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const request = await tx.serviceRequest.findFirst({
          where: { id: req.params.id, ...filter },
        });
        if (!request || !activeStatuses.includes(request.status))
          fail("This assignment is not active.", 409);
        if (
          (req.user.role === "PROVIDER"
            ? request.providerResponse
            : request.employeeResponse) !== "Accepted"
        )
          fail("Accept the assignment before sending a progress update.", 409);
        await tx.serviceReport.create({
          data: {
            requestId: request.id,
            employeeId: req.user.id,
            kind: req.body.status === "Delayed" ? "delay" : "unable",
            message: text(req.body.note, 2000),
          },
        });
        const updated = await tx.serviceRequest.update({
          where: { id: request.id },
          data: { status: req.body.status },
        });
        await audit(
          tx,
          req.user.email,
          "visit_progress_update",
          "request",
          request.id,
          { status: req.body.status },
        );
        return updated;
      });
      await note(
        row.clientUserId,
        "A visit progress update",
        `Your visit ${row.reference} has an update: ${req.body.status.toLowerCase()}. The team will follow up.`,
      );
      res.json(requestView(row, req.user));
    }),
  );
  router.patch(
    "/attendance/:id/review",
    ...adminWrite,
    route(async (req, res) => {
      if (
        !idOK(req.params.id) ||
        !["Approved", "Rejected"].includes(req.body.status) ||
        text(req.body.note).length < 5
      )
        fail("Choose a review decision and provide a reason.");
      const row = await db.workAttendance.update({
        where: { id: req.params.id },
        data: {
          verificationStatus: req.body.status,
          reviewedBy: req.user.id,
          reviewNote: text(req.body.note, 2000),
        },
      });
      await audit(
        db,
        req.user.email,
        "attendance_reviewed",
        "request",
        row.requestId,
        { attendanceId: row.id, status: row.verificationStatus },
      );
      res.json(row);
    }),
  );
  router.patch(
    "/service-reports/:id",
    ...managerWrite,
    route(async (req, res) => {
      if (
        !idOK(req.params.id) ||
        !["Open", "Under review", "Resolved"].includes(req.body.status)
      )
        fail("Choose a report status.");
      const row = await db.serviceReport.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          response: text(req.body.response, 2000),
        },
      });
      await note(
        row.employeeId,
        "Visit report update",
        `Your report is ${row.status.toLowerCase()}. ${row.response || ""}`,
        "/staff",
      );
      res.json(row);
    }),
  );

  router.post(
    "/auth/forgot-password",
    loginLimit,
    requireWebRequest,
    route(async (req, res) => {
      const email = text(req.body.email, 254).toLowerCase(),
        response = {
          message:
            "If an active account matches and email is configured, a password reset link will be sent.",
        };
      if (!emailOK(email)) return res.json(response);
      const user = await db.user.findUnique({ where: { email } });
      if (
        user?.isActive &&
        publicSettings().emailEnabled &&
        process.env.PUBLIC_URL
      ) {
        const token = crypto.randomBytes(32).toString("hex");
        await db.$transaction(async (tx) => {
          await tx.passwordReset.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
          });
          await tx.passwordReset.create({
            data: {
              userId: user.id,
              tokenHash: crypto
                .createHash("sha256")
                .update(token)
                .digest("hex"),
              expiresAt: new Date(Date.now() + 30 * 60000),
            },
          });
        });
        await sendMail({
          to: user.email,
          subject: "Reset your Wellness Home Care password",
          text: `Use this link within 30 minutes to choose a new password:\n${process.env.PUBLIC_URL.replace(/\/$/, "")}/reset-password?token=${token}\n\nIf you did not request this, ignore this email.`,
        });
      }
      res.json(response);
    }),
  );
  router.post(
    "/auth/reset-password",
    loginLimit,
    requireWebRequest,
    route(async (req, res) => {
      const token = text(req.body.token, 100),
        password =
          typeof req.body.password === "string"
            ? req.body.password
            : typeof req.body.newPassword === "string"
              ? req.body.newPassword
              : "";
      if (
        !/^[a-f0-9]{64}$/.test(token) ||
        password.length < 12 ||
        password.length > 128
      )
        fail("Use a valid reset link and a password of 12–128 characters.");
      await db.$transaction(async (tx) => {
        const tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");
        const reset = await tx.passwordReset.findUnique({
          where: { tokenHash },
        });
        if (!reset || reset.usedAt || reset.expiresAt < new Date())
          fail("This reset link is invalid or expired. Request a new one.");
        const claimed = await tx.passwordReset.updateMany({
          where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
          data: { usedAt: new Date() },
        });
        if (claimed.count !== 1) fail("This reset link has already been used.");
        await tx.user.update({
          where: { id: reset.userId },
          data: {
            passwordHash: await bcrypt.hash(password, 12),
            mustChangePassword: false,
            sessionVersion: { increment: 1 },
          },
        });
        await tx.passwordReset.updateMany({
          where: { userId: reset.userId, usedAt: null },
          data: { usedAt: new Date() },
        });
      });
      res.json({
        message:
          "Your password has been reset. Sign in with your new password.",
      });
    }),
  );

  router.post(
    "/communications",
    ...managerWrite,
    route(async (req, res) => {
      const user =
          idOK(req.body.userId) &&
          (await db.user.findUnique({ where: { id: req.body.userId } })),
        channel = req.body.channel,
        message = text(req.body.message, 1000);
      if (!user || !message || !["email", "sms", "whatsapp"].includes(channel))
        fail("Choose an account, delivery channel and message.");
      if (channel === "email") {
        if (!publicSettings().emailEnabled)
          fail("Email delivery is not configured.", 503);
        await sendMail({
          to: user.email,
          subject: text(req.body.subject, 180) || "Wellness Home Care update",
          text: message,
        });
        return res.status(202).json({ status: "Queued" });
      }
      if (req.body.consentConfirmed !== true)
        fail(
          "Confirm the recipient agreed to receive messages on this channel.",
        );
      if (!user.phone || !/^\+\d{7,15}$/.test(user.phone.replace(/\s/g, "")))
        fail("The account needs a phone number with country code.");
      const from =
        channel === "whatsapp"
          ? process.env.TWILIO_WHATSAPP_FROM
          : process.env.TWILIO_SMS_FROM;
      if (
        !from ||
        !process.env.TWILIO_ACCOUNT_SID ||
        !process.env.TWILIO_AUTH_TOKEN
      )
        fail("This messaging channel is not configured.", 503);
      const payload = new URLSearchParams({
        From:
          channel === "whatsapp"
            ? `whatsapp:${from.replace(/^whatsapp:/, "")}`
            : from,
        To: `${channel === "whatsapp" ? "whatsapp:" : ""}${user.phone.replace(/\s/g, "")}`,
        Body: message,
      });
      if (channel === "whatsapp" && process.env.TWILIO_WHATSAPP_CONTENT_SID) {
        payload.delete("Body");
        payload.set("ContentSid", process.env.TWILIO_WHATSAPP_CONTENT_SID);
        payload.set(
          "ContentVariables",
          JSON.stringify({ 1: user.fullName, 2: message }),
        );
      }
      const result = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: payload,
          signal: AbortSignal.timeout(20000),
        },
      );
      const data = await result.json().catch(() => ({}));
      if (!result.ok || !data.sid)
        fail("The messaging provider could not accept this message.", 502);
      await audit(db, req.user.email, "message_submitted", "user", user.id, {
        channel,
        providerReference: data.sid,
      });
      res
        .status(202)
        .json({ status: data.status || "Queued", reference: data.sid });
    }),
  );
}

export async function attendanceVerification(db, request, body) {
  const evidence = gpsEvidence(body);
  const household = request.householdId
    ? await db.household.findUnique({ where: { id: request.householdId } })
    : null;
  let distance = null,
    status = "Flagged",
    note = "The household GPS baseline has not been approved.";
  if (
    household?.locationApproved &&
    household.latitude !== null &&
    household.longitude !== null
  ) {
    distance = distanceMeters(evidence, household);
    status =
      distance <= household.geofenceMeters + evidence.accuracy
        ? "Verified"
        : "Flagged";
    note =
      status === "Flagged"
        ? `Attendance was ${Math.round(distance)} metres from the approved household location.`
        : null;
  }
  return { evidence, distance, status, note };
}
