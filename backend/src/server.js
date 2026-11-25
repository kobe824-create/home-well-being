import "dotenv/config";
import crypto from "node:crypto";
import { resolve4 } from "node:dns/promises";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { installOperations, attendanceVerification } from "./operations.js";
import { createServiceAlerts } from "./jobs.js";
import { installPublicMedia } from "./public-media.js";
import { normalizeSiteContent, readSiteContent, setPublishedContent } from "./site-content.js";
import {
  scheduleConflict,
  DomainError,
  activeStatuses,
  visitWindow,
  leaveWindow,
  overlaps,
} from "./domain.js";

const port = Number(process.env.PORT || 4000);
const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "";
const adminName = (process.env.ADMIN_NAME || "Wellness Administrator").trim();
const authSecret = process.env.AUTH_SECRET || "";
const databaseUrl = (
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  ""
).trim();
const app = express();

if (
  !databaseUrl ||
  /USER:PASSWORD@HOST\/DB/i.test(databaseUrl) ||
  !adminEmail ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) ||
  adminPassword.length < 16 ||
  authSecret.length < 32 ||
  /replace|change-this/i.test(adminPassword) ||
  /replace|change-this/i.test(authSecret)
) {
  throw new Error(
    "Configure a Neon DATABASE_URL, a valid ADMIN_EMAIL, an ADMIN_PASSWORD of at least 16 characters, and an AUTH_SECRET of at least 32 characters.",
  );
}

let prisma;

async function connectToNeon(connectionString) {
  const parsed = new URL(connectionString);
  if (
    ["localhost", "127.0.0.1", "::1", "db"].includes(parsed.hostname) ||
    parsed.searchParams.get("sslmode") === "disable"
  ) {
    const pool = new pg.Pool({
      connectionString,
      ssl: false,
      max: 10,
      connectionTimeoutMillis: 5000,
    });
    await pool.query("SELECT 1");
    return pool;
  }
  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const addresses = await resolve4(parsed.hostname);
      for (const address of addresses) {
        const pool = new pg.Pool({
          host: address,
          port: Number(parsed.port || 5432),
          user: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
          database: decodeURIComponent(parsed.pathname.slice(1)),
          ssl: { servername: parsed.hostname, rejectUnauthorized: true },
          max: 10,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        });

        try {
          await pool.query("SELECT 1");
          return pool;
        } catch (error) {
          lastError = error;
          await pool.end().catch(() => {});
        }
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw lastError || new Error("Could not resolve the Neon database host.");
}

const serviceLabels = {
  elderly: "Elderly home assistance",
  childcare: "Babysitting & childcare",
  cooking: "Home cooking",
  cleaning: "Home cleaning",
  driving: "Home drivers",
  security: "Home security check",
};
const requestStatuses = [
  "New request",
  "Under review",
  "Awaiting customer confirmation",
  "Confirmed",
  "Provider assigned",
  "In progress",
  "Completed",
  "Declined",
  "Cancelled",
  "Rescheduled",
  "No-show",
  "Complaint open",
  "Delayed",
  "Unable to Complete",
];
const applicationStatuses = [
  "Application received",
  "Under review",
  "More information required",
  "Approved",
  "Not approved",
];
const paymentMethods = [
  "Not decided",
  "Cash",
  "Bank transfer",
  "Mobile money",
  "Other",
];
const clientPaymentStatuses = [
  "Not discussed",
  "Quoted",
  "Part-paid",
  "Paid",
  "Overdue",
  "Refunded",
];
const providerPaymentStatuses = ["Not recorded", "Pending", "Paid"];
const sessionCookie = {
  httpOnly: true,
  secure:
    process.env.COOKIE_SECURE === "false"
      ? false
      : process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
  maxAge: 8 * 60 * 60 * 1000,
};

const { maxAge: _sessionMaxAge, ...clearSessionCookie } = sessionCookie;

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");
const plainText = (value, max) =>
  cleanString(value).replace(/[<>]/g, "").slice(0, max);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isPhone = (value) => /^[+()\d\s-]{7,24}$/.test(value);
const isId = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const candidate = new Date(`${value}T12:00:00Z`);
  if (
    Number.isNaN(candidate.valueOf()) ||
    candidate.toISOString().slice(0, 10) !== value
  )
    return false;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const kigaliToday = `${today.year}-${today.month}-${today.day}`;
  return (
    value >= kigaliToday &&
    value <= `${Number(today.year) + 1}-${today.month}-${today.day}`
  );
};
const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const asDate = (value) => new Date(`${value}T00:00:00.000Z`);
const asTime = (value) => new Date(`1970-01-01T${value}:00.000Z`);
const timeText = (value) =>
  value instanceof Date
    ? value.toISOString().slice(11, 16)
    : String(value).slice(0, 5);
const dateText = (value) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
const refCode = (prefix) =>
  `${prefix}-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

function requestView(row, viewer, { includeAttendanceLocation = false } = {}) {
  const { attendance = [], reports = [], feedback = [], ...request } = row;
  const visibleReports = ["ADMIN", "OPERATIONS"].includes(viewer?.role)
    ? reports
    : ["EMPLOYEE", "PROVIDER"].includes(viewer?.role)
      ? reports.filter((report) => report.employeeId === viewer.id)
      : viewer?.role === "CLIENT"
        ? reports.filter((report) => report.kind === "service-note")
        : [];
  const view = {
    ...request,
    full_name: request.fullName,
    preferred_contact: request.preferredContact,
    requested_date_text: dateText(request.requestedDate),
    start_time: timeText(request.startTime),
    duration_hours: request.durationHours,
    service_details: request.serviceDetails,
    contact_consent: request.contactConsent,
    assigned_provider_id: request.assignedProviderId,
    provider_response: request.providerResponse,
    provider_responded_at: request.providerRespondedAt,
    provider_decline_note: request.providerDeclineNote,
    assigned_employee_id: request.assignedEmployeeId,
    employee_response: request.employeeResponse,
    employee_responded_at: request.employeeRespondedAt,
    employee_decline_note: request.employeeDeclineNote,
    client_user_id: request.clientUserId,
    quoted_amount_rwf: request.quotedAmountRwf,
    payment_method: request.paymentMethod,
    client_payment_status: request.clientPaymentStatus,
    provider_payment_status: request.providerPaymentStatus,
    transaction_reference: request.transactionReference,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    provider_name: request.assignedProvider?.fullName || null,
    provider_reference: request.assignedProvider?.reference || null,
    employee_name: request.assignedEmployee?.fullName || null,
    attendance: attendance.map((row) => ({
      id: row.id,
      employee_id: row.employeeId,
      employee_name: row.employee?.fullName || null,
      check_in_at: row.checkInAt,
      check_out_at: row.checkOutAt,
      checkInAt: row.checkInAt,
      checkOutAt: row.checkOutAt,
      verificationStatus: row.verificationStatus,
      verification_status: row.verificationStatus,
      verification_note: row.discrepancyNote,
      distance_meters: row.distanceMeters,
      discrepancyNote: row.discrepancyNote,
      distanceMeters: row.distanceMeters,
      checkInAccuracy: row.checkInAccuracy,
      checkOutAccuracy: row.checkOutAccuracy,
      ...(includeAttendanceLocation && viewer?.role === "ADMIN"
        ? {
            check_in_location: `${Number(row.checkInLatitude).toFixed(4)}, ${Number(row.checkInLongitude).toFixed(4)}`,
            check_out_location:
              row.checkOutLatitude === null
                ? null
                : `${Number(row.checkOutLatitude).toFixed(4)}, ${Number(row.checkOutLongitude).toFixed(4)}`,
          }
        : {}),
    })),
    reports: visibleReports.map((row) => ({
      id: row.id,
      kind: row.kind,
      message: row.message,
      created_at: row.createdAt,
      employee_name: row.employee?.fullName,
      ...(viewer?.role === "CLIENT"
        ? {}
        : { status: row.status, response: row.response }),
    })),
    feedback: feedback.map((row) => ({
      id: row.id,
      kind: row.kind,
      rating: row.rating,
      status: row.status,
      message: row.message,
      created_at: row.createdAt,
    })),
  };
  if (!["ADMIN", "CLIENT"].includes(viewer?.role))
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
  if (viewer?.role === "CLIENT")
    for (const key of [
      "providerDeclineNote",
      "employeeDeclineNote",
      "provider_decline_note",
      "employee_decline_note",
    ])
      delete view[key];
  if (viewer?.role !== "ADMIN") {
    delete view.providerPaymentStatus;
    delete view.provider_payment_status;
  }
  return view;
}

function applicationView(row) {
  const { user, userId, ...application } = row;
  return {
    ...application,
    full_name: application.fullName,
    references_text: application.referencesText,
    reference_consent: application.referenceConsent,
    screening_consent: application.screeningConsent,
    created_at: application.createdAt,
    updated_at: application.updatedAt,
    has_account: Boolean(userId),
    account_active: Boolean(user?.isActive),
    account_email: user?.email || null,
  };
}

function accountView(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

const smtpReady = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SENDER_EMAIL,
);
const mailer = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" }
        : undefined,
    })
  : null;

let processingOutbox = false;
async function processOutbox() {
  if (!mailer || !prisma || processingOutbox) return;
  processingOutbox = true;
  try {
    const messages = await prisma.emailOutbox.findMany({
      where: { status: { in: ["Pending", "Retry"] }, attempts: { lt: 5 } },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    for (const item of messages) {
      try {
        await mailer.sendMail({
          from: process.env.SENDER_EMAIL,
          to: item.recipient,
          subject: item.subject,
          text: item.text,
        });
        await prisma.emailOutbox.update({
          where: { id: item.id },
          data: {
            status: "Sent",
            sentAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        });
      } catch {
        await prisma.emailOutbox.update({
          where: { id: item.id },
          data: {
            status: item.attempts >= 4 ? "Failed" : "Retry",
            attempts: { increment: 1 },
            lastError:
              "Delivery failed; check SMTP configuration and provider logs.",
          },
        });
      }
    }
  } finally {
    processingOutbox = false;
  }
}
async function sendMail({ to, subject, text }) {
  if (!to || !prisma) return { status: "Disabled" };
  const item = await prisma.emailOutbox.create({
    data: {
      recipient: to,
      subject,
      text,
      status: mailer ? "Pending" : "Disabled",
    },
  });
  void processOutbox().catch(() => {});
  return { status: item.status };
}

function notifyRequest(row) {
  const service = serviceLabels[row.service];
  void sendMail({
    to: adminEmail,
    subject: `New home-care request · ${row.reference}`,
    text: `A new ${service.toLowerCase()} request is ready for review.\nReference: ${row.reference}\nPreferred time: ${dateText(row.requestedDate)} at ${timeText(row.startTime)}\nArea: ${row.neighborhood}\nOpen the team dashboard to review contact details and follow up.\n\nThis request is not yet a confirmed booking.`,
  });
  if (row.email)
    void sendMail({
      to: row.email,
      subject: `We received your request · ${row.reference}`,
      text: `Hello ${row.fullName},\n\nThank you for contacting Wellness Home Care. We received your ${service.toLowerCase()} request (${row.reference}). Our team will review the details and contact you to discuss availability, scope and pricing.\n\nYour request is not yet a confirmed booking. Please do not reply with medical records, identity documents or payment-card details.`,
    });
}

function notifyApplication(row) {
  void sendMail({
    to: adminEmail,
    subject: `Provider application · ${row.reference}`,
    text: `A provider application is ready for review.\nReference: ${row.reference}\nService category: ${serviceLabels[row.service]}\nOpen the team dashboard to review the application.\n\nSubmitting an application does not qualify the applicant for assignments.`,
  });
  if (row.email)
    void sendMail({
      to: row.email,
      subject: `Application received · ${row.reference}`,
      text: `Hello ${row.fullName},\n\nThank you for your interest in joining Wellness Home Care. Your application (${row.reference}) has been received. The team will review it and contact you about next steps. Submitting an application does not qualify you for assignments.\n\nPlease do not email identity documents; the team will share a secure process if documents are needed.`,
    });
}

function notifyStatusChange(row, status) {
  if (!row.email) return;
  const messages = {
    Confirmed:
      "The team has marked your booking as confirmed. Please contact us directly if you need to discuss the agreed details.",
    Declined:
      "The team has updated your request. Please contact us if you would like to discuss other options.",
    Cancelled:
      "The team has updated your booking as cancelled. Please contact us if you have any questions.",
    Rescheduled:
      "The team has updated the requested schedule. A member of the team will contact you to agree the new details.",
  };
  if (messages[status])
    void sendMail({
      to: row.email,
      subject: `Update to your request · ${row.reference}`,
      text: `Hello ${row.fullName},\n\n${messages[status]}\n\nReference: ${row.reference}`,
    });
}

function requireWebRequest(req, res, next) {
  if (req.get("X-WHC-Request") !== "wellness-web")
    return res.status(403).json({
      error: "Request could not be verified. Refresh the page and try again.",
    });
  next();
}

async function optionalAuth(req, res, next) {
  const token = req.cookies.whc_session;
  if (!token) return next();
  try {
    const claims = jwt.verify(token, authSecret, { algorithms: ["HS256"] });
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (user?.isActive && (claims.version || 0) === user.sessionVersion)
      req.user = user;
    else res.clearCookie("whc_session", clearSessionCookie);
  } catch {
    res.clearCookie("whc_session", clearSessionCookie);
  }
  next();
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.whc_session;
    if (!token) throw new Error("missing session");
    const claims = jwt.verify(token, authSecret, { algorithms: ["HS256"] });
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user?.isActive || (claims.version || 0) !== user.sessionVersion)
      throw new Error("inactive session");
    if (
      user.mustChangePassword &&
      ![
        "/api/auth/session",
        "/api/auth/password",
        "/api/auth/logout",
        "/api/workspace",
      ].includes(req.originalUrl.split("?")[0])
    )
      return res.status(403).json({
        error: "Change your temporary password before continuing.",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    req.user = user;
    next();
  } catch {
    res.clearCookie("whc_session", clearSessionCookie);
    res.status(401).json({ error: "Please sign in to continue." });
  }
}

function requireClient(req, res, next) {
  if (req.user?.role !== "CLIENT")
    return res.status(403).json({ error: "This area is for client accounts." });
  next();
}

function requireStaff(req, res, next) {
  if (!["ADMIN", "OPERATIONS", "EMPLOYEE"].includes(req.user?.role))
    return res
      .status(403)
      .json({ error: "This area is for authorized team accounts." });
  next();
}

function requireCareWorker(req, res, next) {
  if (!["ADMIN", "OPERATIONS", "EMPLOYEE", "PROVIDER"].includes(req.user?.role))
    return res.status(403).json({ error: "Care team access is required." });
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({
      error: "Only an administrator can manage team access or payment records.",
    });
  next();
}

function requireManager(req, res, next) {
  if (!["ADMIN", "OPERATIONS"].includes(req.user?.role))
    return res
      .status(403)
      .json({ error: "Operations management access is required." });
  next();
}

function requireProvider(req, res, next) {
  if (req.user?.role !== "PROVIDER")
    return res
      .status(403)
      .json({ error: "This area is for approved provider accounts." });
  next();
}

function notFound(res) {
  return res
    .status(400)
    .json({ error: "Please check the required fields and try again." });
}

async function audit(tx, actor, action, entityType, entityId, details = {}) {
  await tx.adminAuditLog.create({
    data: { actor, action, entityType, entityId, details },
  });
  if (!["document_downloaded"].includes(action)) {
    const admins = await tx.user.findMany({
      where: { role: "ADMIN", isActive: true, email: { not: actor } },
      select: { id: true },
    });
    if (admins.length)
      await tx.notification.createMany({
        data: admins.map((u) => ({
          userId: u.id,
          title: action.replaceAll("_", " ").slice(0, 180),
          message: `Review the latest ${entityType.replaceAll("_", " ")} update in your workspace.`,
          link: "/staff",
        })),
      });
  }
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use("/api/documents", express.json({ limit: "7mb" }));
app.use("/api/admin/site-content", express.json({ limit: "512kb" }));
const smallJsonBody = express.json({ limit: "50kb" });
app.use((req, res, next) => req.path === "/api/admin/public-media" ? next() : smallJsonBody(req, res, next));
app.use(cookieParser());

const publicFormLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const registerLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const documentUploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many document uploads. Wait before uploading more files.",
  },
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.user.findFirst({ select: { id: true } });
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.post(
  "/api/auth/login",
  loginLimit,
  requireWebRequest,
  async (req, res, next) => {
    try {
      const email = cleanString(req.body?.email).toLowerCase();
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      const user = await prisma.user.findUnique({ where: { email } });
      if (
        !user?.isActive ||
        !(await bcrypt.compare(password, user.passwordHash))
      )
        return res
          .status(401)
          .json({ error: "Email or password is incorrect." });
      const token = jwt.sign(
        { role: user.role, version: user.sessionVersion },
        authSecret,
        { algorithm: "HS256", subject: user.id, expiresIn: "8h" },
      );
      res.cookie("whc_session", token, sessionCookie).json(accountView(user));
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/auth/register",
  registerLimit,
  requireWebRequest,
  async (req, res, next) => {
    try {
      const fullName = cleanString(req.body?.fullName);
      const email = cleanString(req.body?.email).toLowerCase();
      const phone = cleanString(req.body?.phone);
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      if (
        fullName.length < 2 ||
        fullName.length > 120 ||
        !isEmail(email) ||
        !isPhone(phone) ||
        password.length < 12 ||
        password.length > 128
      )
        return notFound(res);
      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          phone,
          passwordHash: await bcrypt.hash(password, 12),
          role: "CLIENT",
        },
      });
      const token = jwt.sign(
        { role: user.role, version: user.sessionVersion },
        authSecret,
        { algorithm: "HS256", subject: user.id, expiresIn: "8h" },
      );
      res
        .cookie("whc_session", token, sessionCookie)
        .status(201)
        .json(accountView(user));
    } catch (error) {
      if (error.code === "P2002")
        return res
          .status(409)
          .json({ error: "An account with that email already exists." });
      next(error);
    }
  },
);

app.get("/api/auth/session", requireAuth, (req, res) =>
  res.json(accountView(req.user)),
);

app.post("/api/auth/logout", requireWebRequest, (_req, res) => {
  res.clearCookie("whc_session", clearSessionCookie).json({ ok: true });
});

app.post(
  "/api/auth/password",
  requireWebRequest,
  requireAuth,
  async (req, res, next) => {
    try {
      const currentPassword =
        typeof req.body?.currentPassword === "string"
          ? req.body.currentPassword
          : "";
      const newPassword =
        typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
      if (
        !(await bcrypt.compare(currentPassword, req.user.passwordHash)) ||
        newPassword.length < 12 ||
        newPassword.length > 128
      )
        return notFound(res);
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 12),
          mustChangePassword: false,
          sessionVersion: { increment: 1 },
        },
      });
      const token = jwt.sign(
        { role: user.role, version: user.sessionVersion },
        authSecret,
        { algorithm: "HS256", subject: user.id, expiresIn: "8h" },
      );
      res.cookie("whc_session", token, sessionCookie).json({
        message: "Your password has been changed.",
        user: accountView(user),
      });
    } catch (error) {
      next(error);
    }
  },
);

installPublicMedia(app, { requireWebRequest, requireAuth, requireAdmin, audit, getPrisma: () => prisma });

app.get("/api/site-content", async (_req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await readSiteContent(prisma));
  } catch (error) {
    next(error);
  }
});

app.put(
  "/api/admin/site-content",
  requireWebRequest,
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const content = normalizeSiteContent(req.body?.content);
      const saved = await prisma.$transaction(async (tx) => {
        const row = await tx.websiteContent.upsert({
          where: { key: "homepage" },
          create: { key: "homepage", content, updatedBy: req.user.email },
          update: { content, updatedBy: req.user.email },
        });
        await audit(
          tx,
          req.user.email,
          "website_content_updated",
          "website_content",
          row.id,
          { sections: Object.keys(content).filter((key) => key !== "version") },
        );
        return row;
      });
      setPublishedContent(saved.content);
      res.json({ content: saved.content, updatedAt: saved.updatedAt });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/client/requests",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const rows = await prisma.serviceRequest.findMany({
        where: { clientUserId: req.user.id },
        include: {
          assignedProvider: { select: { fullName: true, reference: true } },
          feedback: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(
        rows.map((row) => {
          const view = requestView(row, req.user);
          return {
            id: view.id,
            reference: view.reference,
            full_name: view.full_name,
            service: view.service,
            neighborhood: view.neighborhood,
            requested_date_text: view.requested_date_text,
            start_time: view.start_time,
            duration_hours: view.duration_hours,
            recurring: view.recurring,
            status: view.status,
            quoted_amount_rwf: view.quoted_amount_rwf,
            client_payment_status: view.client_payment_status,
            payment_method: view.payment_method,
            provider_name: view.provider_name,
            provider_reference: view.provider_reference,
            feedback: view.feedback,
            created_at: view.created_at,
            updated_at: view.updated_at,
          };
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/client/requests/:id/feedback",
  requireWebRequest,
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const kind = cleanString(req.body?.kind);
      const message = cleanString(req.body?.message);
      const rating =
        req.body?.rating === "" || req.body?.rating === null
          ? null
          : Number(req.body?.rating);
      if (
        !isId(req.params.id) ||
        !["complaint", "feedback", "new-need"].includes(kind) ||
        message.length < 10 ||
        message.length > 2000 ||
        (rating !== null &&
          (!Number.isInteger(rating) || rating < 1 || rating > 5)) ||
        (kind === "feedback" && rating === null)
      )
        return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        const request = await tx.serviceRequest.findFirst({
          where: { id: req.params.id, clientUserId: req.user.id },
        });
        if (!request) return null;
        const row = await tx.customerFeedback.create({
          data: {
            requestId: request.id,
            clientId: req.user.id,
            kind,
            rating,
            message,
          },
        });
        await audit(
          tx,
          req.user.email,
          kind === "complaint"
            ? "customer_complaint_received"
            : "customer_feedback_received",
          "customer_feedback",
          row.id,
          { requestReference: request.reference, kind },
        );
        return { ...row, requestReference: request.reference };
      });
      if (!result)
        return res
          .status(404)
          .json({ error: "That request is not linked to your account." });
      if (kind === "complaint")
        void sendMail({
          to: adminEmail,
          subject: `Customer concern needs review · ${result.requestReference}`,
          text: `A customer concern is ready for review in the team dashboard.\nReference: ${result.requestReference}\nPlease review the message and follow up through the customer’s account details.`,
        });
      res.status(201).json({
        id: result.id,
        status: result.status,
        createdAt: result.createdAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/employee/leave-requests",
  requireAuth,
  requireCareWorker,
  async (req, res, next) => {
    try {
      const rows = await prisma.employeeLeaveRequest.findMany({
        where: ["ADMIN", "OPERATIONS"].includes(req.user.role)
          ? {}
          : { employeeId: req.user.id },
        include: {
          employee: { select: { fullName: true, email: true } },
          reviewer: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(
        rows.map((row) => ({
          id: row.id,
          employee_id: row.employeeId,
          employeeId: row.employeeId,
          employee_name: row.employee.fullName,
          employeeName: row.employee.fullName,
          employee_email: row.employee.email,
          kind: row.kind,
          start_date: dateText(row.startDate),
          startDate: dateText(row.startDate),
          end_date: dateText(row.endDate),
          endDate: dateText(row.endDate),
          start_time: row.startTime,
          startTime: row.startTime,
          end_time: row.endTime,
          endTime: row.endTime,
          reason: row.reason,
          status: row.status,
          reviewer_name: row.reviewer?.fullName || null,
          reviewer_note: row.reviewerNote,
          created_at: row.createdAt,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/provider/assignments",
  requireAuth,
  requireProvider,
  async (req, res, next) => {
    try {
      const provider = await prisma.providerApplication.findUnique({
        where: { userId: req.user.id },
      });
      if (!provider || provider.status !== "Approved") return res.json([]);
      const rows = await prisma.serviceRequest.findMany({
        where: { assignedProviderId: provider.id },
        orderBy: [{ requestedDate: "asc" }, { startTime: "asc" }],
        take: 100,
      });
      res.json(
        rows.map((row) => ({
          id: row.id,
          reference: row.reference,
          full_name: row.fullName,
          phone: row.phone,
          email: row.email,
          service: row.service,
          neighborhood: row.neighborhood,
          requested_date_text: dateText(row.requestedDate),
          start_time: timeText(row.startTime),
          duration_hours: row.durationHours,
          recurring: row.recurring,
          service_details: row.serviceDetails,
          status: row.status,
          response: row.providerResponse,
          response_note: row.providerDeclineNote,
          created_at: row.createdAt,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/provider/assignments/:id/response",
  requireWebRequest,
  requireAuth,
  requireProvider,
  async (req, res, next) => {
    try {
      const response = cleanString(req.body?.response);
      const note = cleanString(req.body?.note);
      if (
        !isId(req.params.id) ||
        !["Accepted", "Declined"].includes(response) ||
        (response === "Declined" && (note.length < 10 || note.length > 500))
      )
        return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const provider = await tx.providerApplication.findUnique({
          where: { userId: req.user.id },
        });
        if (!provider || provider.status !== "Approved")
          return { missingProvider: true };
        const request = await tx.serviceRequest.findFirst({
          where: { id: req.params.id, assignedProviderId: provider.id },
        });
        if (!request) return { missing: true };
        if (
          request.providerResponse !== "Pending" ||
          !["Provider assigned", "Confirmed", "Rescheduled"].includes(
            request.status,
          )
        )
          return {
            conflict:
              "This assignment has already been answered or is no longer active.",
          };
        if (response === "Accepted") {
          const updated = await tx.serviceRequest.update({
            where: { id: request.id },
            data: {
              providerResponse: "Accepted",
              providerRespondedAt: new Date(),
              providerDeclineNote: null,
            },
          });
          await audit(
            tx,
            req.user.email,
            "provider_assignment_accepted",
            "request",
            request.id,
            { providerReference: provider.reference },
          );
          return { updated, request };
        }
        const updated = await tx.serviceRequest.update({
          where: { id: request.id },
          data: {
            assignedProviderId: null,
            providerResponse: "Declined",
            providerRespondedAt: new Date(),
            providerDeclineNote: note,
            status: "Confirmed",
          },
        });
        await audit(
          tx,
          req.user.email,
          "provider_assignment_declined",
          "request",
          request.id,
          { providerReference: provider.reference, note },
        );
        return { updated, request, declined: true };
      });
      if (result.missingProvider || result.missing)
        return res
          .status(404)
          .json({ error: "This assignment is no longer available." });
      if (result.conflict)
        return res.status(409).json({ error: result.conflict });
      if (result.declined)
        void sendMail({
          to: adminEmail,
          subject: `Provider declined assignment · ${result.request.reference}`,
          text: `A provider has declined an assignment and the visit needs a new match.\nReference: ${result.request.reference}\nOpen the admin dashboard to review the provider’s note and reassign the visit.`,
        });
      res.json({
        id: result.updated.id,
        status: result.updated.status,
        response: result.updated.providerResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/employee/leave-requests",
  requireWebRequest,
  requireAuth,
  requireCareWorker,
  async (req, res, next) => {
    try {
      const start = cleanString(req.body?.startDate ?? req.body?.start_date);
      const end = cleanString(req.body?.endDate ?? req.body?.end_date);
      const kind = cleanString(req.body?.kind) || "Time off";
      const startTime = cleanString(
        req.body?.startTime ?? req.body?.start_time,
      );
      const endTime = cleanString(req.body?.endTime ?? req.body?.end_time);
      const reason = cleanString(req.body?.reason);
      if (
        !["EMPLOYEE", "PROVIDER"].includes(req.user.role) ||
        ![
          "Time off",
          "Absence",
          "Early departure permission",
          "Schedule change",
        ].includes(kind) ||
        !validDate(start) ||
        !validDate(end) ||
        end < start ||
        reason.length < 10 ||
        reason.length > 1000
      )
        return notFound(res);
      const partial = Boolean(startTime || endTime);
      if (
        (partial ||
          ["Early departure permission", "Schedule change"].includes(kind)) &&
        (start !== end ||
          !validTime(startTime) ||
          !validTime(endTime) ||
          endTime <= startTime)
      )
        return res.status(400).json({
          error:
            "Choose one date and valid start and end times, with the end after the start.",
        });
      const data = {
        employeeId: req.user.id,
        kind,
        startDate: asDate(start),
        endDate: asDate(end),
        startTime: startTime || null,
        endTime: endTime || null,
        reason,
      };
      const row = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM users WHERE id = $1::uuid FOR UPDATE",
          req.user.id,
        );
        const requests = await tx.employeeLeaveRequest.findMany({
          where: {
            employeeId: req.user.id,
            status: { in: ["Pending", "Approved"] },
            startDate: { lte: asDate(end) },
            endDate: { gte: asDate(start) },
          },
        });
        if (
          requests.some((request) =>
            overlaps(leaveWindow(data), leaveWindow(request)),
          )
        )
          throw new DomainError(
            "You already have a pending or approved request covering that time.",
            409,
          );
        const created = await tx.employeeLeaveRequest.create({ data });
        await audit(
          tx,
          req.user.email,
          "leave_request_created",
          "employee_leave",
          created.id,
          {
            kind,
            startDate: start,
            endDate: end,
            startTime: data.startTime,
            endTime: data.endTime,
          },
        );
        return created;
      });
      res.status(201).json({ id: row.id, status: row.status });
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/leave-requests/:id/status",
  requireWebRequest,
  requireAuth,
  requireManager,
  async (req, res, next) => {
    try {
      const status = cleanString(req.body?.status);
      const reviewerNote = cleanString(req.body?.reviewerNote);
      if (
        !isId(req.params.id) ||
        !["Approved", "Declined"].includes(status) ||
        reviewerNote.length > 500
      )
        return notFound(res);
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM employee_leave_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const pending = await tx.employeeLeaveRequest.findUnique({
          where: { id: req.params.id },
        });
        if (pending && pending.status !== "Pending")
          throw new DomainError(
            "This leave request has already been reviewed.",
            409,
          );
        if (pending && status === "Approved") {
          await tx.$queryRawUnsafe(
            "SELECT id FROM users WHERE id = $1::uuid FOR UPDATE",
            pending.employeeId,
          );
          const visits = await tx.serviceRequest.findMany({
            where: {
              OR: [
                { assignedEmployeeId: pending.employeeId },
                { assignedProvider: { userId: pending.employeeId } },
              ],
              status: { in: activeStatuses },
            },
          });
          const permission = leaveWindow(pending);
          const conflict = visits.some((visit) => {
            const scheduled = visitWindow(visit);
            if (!overlaps(scheduled, permission)) return false;
            // An explicit early-departure approval can cover the remainder of
            // a visit already assigned; other conflicting work must be moved.
            return (
              pending.kind !== "Early departure permission" ||
              scheduled.start >= permission.start ||
              scheduled.end > permission.end
            );
          });
          if (conflict)
            throw new DomainError(
              "Reassign overlapping visits first. An early-departure permission must cover the remaining hours of a visit that starts before the permission.",
              409,
            );
        }
        const row = await tx.employeeLeaveRequest
          .update({
            where: { id: req.params.id },
            data: {
              status,
              reviewerId: req.user.id,
              reviewerNote: reviewerNote || null,
            },
            include: { employee: { select: { fullName: true } } },
          })
          .catch((error) =>
            error.code === "P2025" ? null : Promise.reject(error),
          );
        if (row) {
          await audit(
            tx,
            req.user.email,
            "leave_request_reviewed",
            "employee_leave",
            row.id,
            { status, employee: row.employee.fullName },
          );
          await tx.notification.create({
            data: {
              userId: row.employeeId,
              title: "Leave request reviewed",
              message: `Your request for ${dateText(row.startDate)} to ${dateText(row.endDate)} was ${status.toLowerCase()}.`,
              link: "/staff",
            },
          });
        }
        return row;
      });
      if (!updated)
        return res.status(404).json({ error: "Leave request not found." });
      res.json({
        id: updated.id,
        status: updated.status,
        reviewerNote: updated.reviewerNote,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/requests",
  publicFormLimit,
  requireWebRequest,
  optionalAuth,
  async (req, res, next) => {
    try {
      const body = req.body || {};
      if (cleanString(body.website))
        return res.status(201).json({
          reference: refCode("WHC"),
          message: "Your request was received.",
        });
      const fullName = cleanString(body.fullName);
      const phone = cleanString(body.phone);
      const email = cleanString(body.email).toLowerCase();
      const preferredContact = cleanString(body.preferredContact);
      const service = cleanString(body.service);
      const neighborhood = cleanString(body.neighborhood);
      const date = cleanString(body.date);
      const time = cleanString(body.time);
      const duration = Number(body.duration);
      const details =
        body.details &&
        typeof body.details === "object" &&
        !Array.isArray(body.details)
          ? body.details
          : {};
      if (
        fullName.length < 2 ||
        fullName.length > 100 ||
        !isPhone(phone) ||
        (email && (email.length > 254 || !isEmail(email)))
      )
        return notFound(res);
      if (
        !["phone", "whatsapp", "email"].includes(preferredContact) ||
        (preferredContact === "email" && !email)
      )
        return notFound(res);
      if (
        !Object.hasOwn(serviceLabels, service) ||
        neighborhood.length < 2 ||
        neighborhood.length > 100
      )
        return notFound(res);
      if (
        !validDate(date) ||
        !validTime(time) ||
        ![2, 3, 4, 6, 8].includes(duration) ||
        typeof body.recurring !== "boolean" ||
        body.contactConsent !== true
      )
        return notFound(res);
      if (
        service === "cooking" &&
        !Array.from({ length: 12 }, (_, index) => index + 1).includes(
          Number(details.people),
        )
      )
        return notFound(res);
      if (service === "childcare" && details.guardianAuthorization !== true)
        return res.status(400).json({
          error: "A parent or guardian must authorize this childcare request.",
        });
      if (
        service === "childcare" &&
        !["Under 2", "2–5", "6–12", "13–17"].includes(
          cleanString(details.ageRange),
        )
      )
        return notFound(res);
      const notes = cleanString(details.notes);
      if (notes.length > 600) return notFound(res);
      let safeDetails = { notes };
      if (service === "elderly") {
        const allowedSupport = [
          "Companionship",
          "Meal assistance",
          "Agreed daily activities",
          "Accompaniment",
        ];
        const supportTypes = Array.isArray(details.supportTypes)
          ? details.supportTypes
              .filter((item) => allowedSupport.includes(item))
              .slice(0, 4)
          : [];
        safeDetails = { ...safeDetails, supportTypes };
      }
      if (service === "childcare")
        safeDetails = {
          ...safeDetails,
          ageRange: cleanString(details.ageRange),
          guardianAuthorization: true,
        };
      if (service === "cooking")
        safeDetails = { ...safeDetails, people: Number(details.people) };
      if (service === "driving") {
        const vehicleArrangement = [
          "discuss",
          "household-vehicle",
          "driver-vehicle",
        ].includes(cleanString(details.vehicleArrangement))
          ? cleanString(details.vehicleArrangement)
          : "discuss";
        safeDetails = { ...safeDetails, vehicleArrangement };
      }
      let householdId = cleanString(body.householdId) || null;
      let clientUserId = req.user?.role === "CLIENT" ? req.user.id : null;
      if (householdId) {
        if (
          !isId(householdId) ||
          !req.user ||
          !["CLIENT", "ADMIN"].includes(req.user.role)
        )
          return res
            .status(403)
            .json({ error: "Sign in to use a household profile." });
        const household = await prisma.household.findFirst({
          where: {
            id: householdId,
            ...(req.user.role === "ADMIN" ? {} : { clientId: req.user.id }),
          },
        });
        if (!household)
          return res.status(404).json({ error: "Household not found." });
        clientUserId = household.clientId;
      }
      const department = await prisma.department.findUnique({
        where: { service },
      });
      if (
        department &&
        ((service !== "security" && !department.active) ||
          duration < department.minimumHours)
      )
        return res.status(400).json({
          error: `This service requires at least ${department.minimumHours} hours and an active department.`,
        });
      const occurrenceCount = body.recurring
        ? Number(body.recurrenceCount || body.recurringWeeks || 4)
        : 1;
      const frequency =
        cleanString(body.recurrenceFrequency).toLowerCase() || "weekly";
      if (
        !Number.isInteger(occurrenceCount) ||
        occurrenceCount < 1 ||
        occurrenceCount > 12 ||
        !["daily", "weekly", "monthly"].includes(frequency)
      )
        return notFound(res);
      const seriesId = body.recurring ? crypto.randomUUID() : null;
      const rows = await prisma.$transaction(async (tx) => {
        const created = [];
        for (let index = 0; index < occurrenceCount; index += 1) {
          const occurrence = asDate(date);
          if (frequency === "monthly") {
            const originalDay = occurrence.getUTCDate();
            occurrence.setUTCDate(1);
            occurrence.setUTCMonth(occurrence.getUTCMonth() + index);
            const lastDay = new Date(
              Date.UTC(
                occurrence.getUTCFullYear(),
                occurrence.getUTCMonth() + 1,
                0,
              ),
            ).getUTCDate();
            occurrence.setUTCDate(Math.min(originalDay, lastDay));
          } else
            occurrence.setUTCDate(
              occurrence.getUTCDate() + index * (frequency === "daily" ? 1 : 7),
            );
          const row = await tx.serviceRequest.create({
            data: {
              reference: refCode("WHC"),
              fullName,
              phone,
              email: email || null,
              preferredContact,
              service,
              neighborhood,
              requestedDate: occurrence,
              startTime: asTime(time),
              durationHours: duration,
              recurring: body.recurring,
              serviceDetails: safeDetails,
              contactConsent: true,
              clientUserId,
              householdId,
              seriesId,
              occurrenceIndex: index + 1,
              occurrenceCount,
              recurrenceFrequency: body.recurring ? frequency : null,
            },
          });
          created.push(row);
        }
        const admins = await tx.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: { id: true },
        });
        if (admins.length)
          await tx.notification.createMany({
            data: admins.map((u) => ({
              userId: u.id,
              title: "New service request",
              message: `${created.length} requested visit${created.length > 1 ? "s" : ""} ready for review.`,
              link: "/staff",
            })),
          });
        return created;
      });
      notifyRequest(rows[0]);
      res.status(201).json({
        reference: rows[0].reference,
        references: rows.map((r) => r.reference),
        seriesId,
        occurrenceCount,
        message: `${rows.length > 1 ? `${rows.length} requested visits are` : "Your request is"} in the review queue. We will contact you to confirm details.`,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/provider-applications",
  publicFormLimit,
  requireWebRequest,
  async (req, res, next) => {
    try {
      const body = req.body || {};
      if (cleanString(body.website))
        return res.status(201).json({
          reference: refCode("PRO"),
          message: "Your application was received.",
        });
      const fullName = cleanString(body.fullName);
      const phone = cleanString(body.phone);
      const email = cleanString(body.email).toLowerCase();
      const neighborhood = cleanString(body.neighborhood);
      const service = cleanString(body.service);
      const experience = cleanString(body.experience);
      const languages = cleanString(body.languages);
      const availability = cleanString(body.availability);
      const training = cleanString(body.training);
      const referencesText = cleanString(body.references);
      if (
        fullName.length < 2 ||
        fullName.length > 100 ||
        !isPhone(phone) ||
        (email && (email.length > 254 || !isEmail(email)))
      )
        return notFound(res);
      if (
        neighborhood.length < 2 ||
        neighborhood.length > 100 ||
        !Object.hasOwn(serviceLabels, service)
      )
        return notFound(res);
      if (
        experience.length < 10 ||
        experience.length > 1000 ||
        languages.length < 2 ||
        languages.length > 150 ||
        availability.length < 2 ||
        availability.length > 250
      )
        return notFound(res);
      if (
        training.length > 500 ||
        referencesText.length < 10 ||
        referencesText.length > 600 ||
        body.referenceConsent !== true ||
        body.screeningConsent !== true
      )
        return notFound(res);
      const row = await prisma.providerApplication.create({
        data: {
          reference: refCode("PRO"),
          fullName,
          phone,
          email: email || null,
          neighborhood,
          service,
          experience,
          languages,
          availability,
          training: training || null,
          referencesText,
          referenceConsent: true,
          screeningConsent: true,
        },
      });
      notifyApplication(row);
      res.status(201).json({
        reference: row.reference,
        message:
          "Your application was received and will be reviewed by the team.",
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/overview",
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const assignedFilter =
        req.user.role === "EMPLOYEE" ? { assignedEmployeeId: req.user.id } : {};
      const [requests, applications, requestsThisWeek] = await Promise.all([
        prisma.serviceRequest.groupBy({
          by: ["status"],
          where: assignedFilter,
          _count: { _all: true },
        }),
        ["ADMIN", "OPERATIONS"].includes(req.user.role)
          ? prisma.providerApplication.groupBy({
              by: ["status"],
              _count: { _all: true },
            })
          : Promise.resolve([]),
        prisma.serviceRequest.count({
          where: {
            ...assignedFilter,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);
      res.json({
        requestStatuses: requests.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        applicationStatuses: applications.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        requestsThisWeek,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/audit",
  requireAuth,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const rows = await prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(
        rows.map((row) => ({
          id: row.id.toString(),
          actor: row.actor,
          action: row.action,
          entity_type: row.entityType,
          details: row.details,
          created_at: row.createdAt,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/requests",
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const rows = await prisma.serviceRequest.findMany({
        where:
          req.user.role === "EMPLOYEE"
            ? { assignedEmployeeId: req.user.id }
            : {},
        include: {
          assignedProvider: { select: { fullName: true, reference: true } },
          assignedEmployee: { select: { fullName: true } },
          attendance: {
            ...(req.user.role === "EMPLOYEE"
              ? { where: { employeeId: req.user.id } }
              : {}),
            orderBy: { checkInAt: "desc" },
            take: 1,
            include: { employee: { select: { fullName: true } } },
          },
          reports: {
            include: { employee: { select: { fullName: true } } },
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy:
          req.user.role === "EMPLOYEE"
            ? [{ requestedDate: "asc" }, { startTime: "asc" }]
            : { createdAt: "desc" },
        take: 250,
      });
      res.json(
        rows.map((row) => {
          const view = requestView(row, req.user, {
            includeAttendanceLocation: req.user.role === "ADMIN",
          });
          if (req.user.role !== "ADMIN") {
            delete view.quotedAmountRwf;
            delete view.paymentMethod;
            delete view.clientPaymentStatus;
            delete view.providerPaymentStatus;
            delete view.transactionReference;
            delete view.quoted_amount_rwf;
            delete view.payment_method;
            delete view.client_payment_status;
            delete view.provider_payment_status;
            delete view.transaction_reference;
          }
          return view;
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/applications",
  requireAuth,
  requireStaff,
  async (_req, res, next) => {
    try {
      if (!["ADMIN", "OPERATIONS"].includes(_req.user.role))
        return res.json([]);
      const rows = await prisma.providerApplication.findMany({
        include: { user: { select: { email: true, isActive: true } } },
        orderBy: { createdAt: "desc" },
        take: 250,
      });
      res.json(rows.map(applicationView));
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/employees",
  requireAuth,
  requireManager,
  async (_req, res, next) => {
    try {
      const rows = await prisma.user.findMany({
        where: { role: "EMPLOYEE", mustChangePassword: true },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/admin/feedback",
  requireAuth,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const rows = await prisma.customerFeedback.findMany({
        include: {
          client: { select: { fullName: true, email: true } },
          request: { select: { reference: true, service: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      });
      res.json(
        rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          rating: row.rating,
          message: row.message,
          status: row.status,
          client_name: row.client.fullName,
          client_email: row.client.email,
          reference: row.request.reference,
          service: row.request.service,
          created_at: row.createdAt,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/feedback/:id/status",
  requireWebRequest,
  requireAuth,
  requireManager,
  async (req, res, next) => {
    try {
      const status = cleanString(req.body?.status);
      if (
        !isId(req.params.id) ||
        !["Received", "Under review", "Resolved"].includes(status)
      )
        return notFound(res);
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.customerFeedback
          .update({ where: { id: req.params.id }, data: { status } })
          .catch((error) =>
            error.code === "P2025" ? null : Promise.reject(error),
          );
        if (row)
          await audit(
            tx,
            req.user.email,
            "customer_feedback_status_changed",
            "customer_feedback",
            row.id,
            { status },
          );
        return row;
      });
      if (!updated)
        return res.status(404).json({ error: "Feedback record not found." });
      res.json({ id: updated.id, status: updated.status });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/admin/employees",
  requireWebRequest,
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const fullName = cleanString(req.body?.fullName);
      const email = cleanString(req.body?.email).toLowerCase();
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      const role = req.body?.role === "OPERATIONS" ? "OPERATIONS" : "EMPLOYEE";
      if (
        fullName.length < 2 ||
        fullName.length > 120 ||
        !isEmail(email) ||
        password.length < 12 ||
        password.length > 128
      )
        return notFound(res);
      const employee = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            fullName,
            email,
            passwordHash: await bcrypt.hash(password, 12),
            role,
            mustChangePassword: true,
          },
        });
        await audit(
          tx,
          req.user.email,
          "employee_created",
          "user",
          created.id,
          { email: created.email },
        );
        return created;
      });
      res.status(201).json(accountView(employee));
    } catch (error) {
      if (error.code === "P2002")
        return res
          .status(409)
          .json({ error: "An account with that email already exists." });
      next(error);
    }
  },
);

app.patch(
  "/api/admin/employees/:id/status",
  requireWebRequest,
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!isId(req.params.id) || typeof req.body?.isActive !== "boolean")
        return notFound(res);
      const employee = await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({
          where: {
            id: req.params.id,
            role: { in: ["EMPLOYEE", "PROVIDER", "OPERATIONS"] },
          },
        });
        if (!existing) return null;
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: { isActive: req.body.isActive },
        });
        await audit(
          tx,
          req.user.email,
          req.body.isActive ? "employee_reactivated" : "employee_deactivated",
          "user",
          updated.id,
          { email: updated.email },
        );
        return updated;
      });
      if (!employee)
        return res.status(404).json({ error: "Employee account not found." });
      res.json(accountView(employee));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/requests/:id/status",
  requireWebRequest,
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const status = cleanString(req.body?.status);
      if (!isId(req.params.id) || !requestStatuses.includes(status))
        return notFound(res);
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const existing = await tx.serviceRequest.findUnique({
          where: { id: req.params.id },
        });
        if (!existing) return null;
        if (
          req.user.role === "EMPLOYEE" &&
          existing.assignedEmployeeId !== req.user.id
        )
          return { forbidden: true };
        if (existing.status === status) return existing;
        if (
          ["Completed", "Cancelled", "Declined"].includes(existing.status) &&
          status !== "Complaint open"
        )
          return {
            conflict:
              "This closed visit cannot return to an active status. Create a new request.",
          };
        if (status === "Rescheduled")
          return {
            conflict:
              "Use a schedule change request to select the new date and time.",
          };
        if (
          ["Confirmed", "Provider assigned", "In progress", "Delayed"].includes(
            status,
          )
        ) {
          const department = await tx.department.findUnique({
            where: { service: existing.service },
          });
          if (!department?.active)
            return {
              conflict:
                "An administrator must configure and activate this service department before the visit can be confirmed or assigned.",
            };
          if (existing.durationHours < department.minimumHours)
            return {
              conflict: `This service requires at least ${department.minimumHours} hours.`,
            };
        }
        if (
          ["Cancelled", "Declined", "No-show"].includes(status) &&
          (await tx.workAttendance.findFirst({
            where: { requestId: existing.id, checkOutAt: null },
          }))
        )
          return {
            conflict:
              "Record departure before closing a visit that has already started.",
          };
        if (
          status === "Completed" &&
          !(await tx.workAttendance.findFirst({
            where: { requestId: existing.id, checkOutAt: { not: null } },
          }))
        )
          return {
            conflict: "Record arrival and departure before completing a visit.",
          };
        if (req.user.role === "EMPLOYEE") {
          if (existing.assignedEmployeeId !== req.user.id)
            return { forbidden: true };
          if (existing.employeeResponse !== "Accepted")
            return {
              conflict: "Accept this assignment before updating its status.",
            };
          if (
            !["In progress", "Completed", "No-show", "Complaint open"].includes(
              status,
            )
          )
            return { forbidden: true };
          if (
            status === "In progress" &&
            !(await tx.workAttendance.findUnique({
              where: {
                requestId_employeeId: {
                  requestId: existing.id,
                  employeeId: req.user.id,
                },
              },
            }))
          )
            return {
              conflict: "Record arrival before moving the visit in progress.",
            };
          if (status === "Completed") {
            const attendance = await tx.workAttendance.findUnique({
              where: {
                requestId_employeeId: {
                  requestId: existing.id,
                  employeeId: req.user.id,
                },
              },
            });
            if (!attendance?.checkOutAt)
              return {
                conflict: "Record departure before completing the visit.",
              };
          }
        }
        if (
          status === "Provider assigned" &&
          !existing.assignedProviderId &&
          !existing.assignedEmployeeId
        )
          return {
            conflict:
              "Assign an approved provider or team member before using this status.",
          };
        if (
          ["In progress", "Completed"].includes(status) &&
          !existing.assignedProviderId &&
          !existing.assignedEmployeeId
        )
          return {
            conflict:
              "Assign an approved provider or team member before using this status.",
          };
        const row = await tx.serviceRequest.update({
          where: { id: existing.id },
          data: { status },
        });
        await audit(tx, req.user.email, "status_changed", "request", row.id, {
          status,
        });
        if (status === "Completed" && row.clientUserId)
          await tx.notification.create({
            data: {
              userId: row.clientUserId,
              title: "Visit completed",
              message: `Visit ${row.reference} has been marked completed.`,
              link: "/account",
            },
          });
        return row;
      });
      if (!updated)
        return res.status(404).json({ error: "Request not found." });
      if (updated.forbidden)
        return res
          .status(403)
          .json({ error: "You can update only your assigned work." });
      if (updated.conflict)
        return res.status(409).json({ error: updated.conflict });
      notifyStatusChange(updated, status);
      res.json(requestView(updated, req.user));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/requests/:id/employee-assignment",
  requireWebRequest,
  requireAuth,
  requireManager,
  async (req, res, next) => {
    try {
      if (!isId(req.params.id)) return notFound(res);
      const employeeId =
        req.body?.employeeId === null || req.body?.employeeId === ""
          ? null
          : cleanString(req.body?.employeeId);
      if (employeeId !== null && !isId(employeeId)) return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const request = await tx.serviceRequest.findUnique({
          where: { id: req.params.id },
        });
        if (!request) return null;
        if (
          await tx.workAttendance.findFirst({
            where: { requestId: request.id, checkOutAt: null },
          })
        )
          return {
            conflict:
              "Record departure before changing the assignment for a visit that has already started.",
          };
        if (
          employeeId &&
          ![
            "Confirmed",
            "Rescheduled",
            "Provider assigned",
            "Delayed",
          ].includes(request.status)
        )
          return {
            conflict:
              "Confirm the visit with the customer before assigning a team member.",
          };
        if (
          employeeId &&
          !(await tx.user.findFirst({
            where: { id: employeeId, role: "EMPLOYEE", isActive: true },
          }))
        )
          return { conflict: "Choose an active employee account." };
        if (employeeId && request.assignedProviderId)
          return {
            conflict:
              "Unassign the approved provider before assigning an employee to this visit.",
          };
        if (employeeId) {
          await tx.$queryRawUnsafe(
            "SELECT id FROM users WHERE id = $1::uuid FOR UPDATE",
            employeeId,
          );
          const conflict = await scheduleConflict(tx, request, employeeId);
          if (conflict) return { conflict };
        }
        const sameAssignment =
          employeeId && employeeId === request.assignedEmployeeId;
        const updated = await tx.serviceRequest.update({
          where: { id: request.id },
          data: employeeId
            ? {
                assignedEmployeeId: employeeId,
                employeeResponse: sameAssignment
                  ? request.employeeResponse
                  : "Pending",
                employeeRespondedAt: sameAssignment
                  ? request.employeeRespondedAt
                  : null,
                employeeDeclineNote: sameAssignment
                  ? request.employeeDeclineNote
                  : null,
                status: "Provider assigned",
              }
            : {
                assignedEmployeeId: null,
                employeeResponse: "Not assigned",
                employeeRespondedAt: null,
                employeeDeclineNote: null,
                status:
                  request.status === "Provider assigned" &&
                  !request.assignedProviderId
                    ? "Confirmed"
                    : request.status,
              },
          include: {
            assignedEmployee: { select: { fullName: true } },
            assignedProvider: { select: { fullName: true, reference: true } },
          },
        });
        await audit(
          tx,
          req.user.email,
          employeeId ? "employee_assigned" : "employee_unassigned",
          "request",
          request.id,
          { employeeId, previousEmployeeId: request.assignedEmployeeId },
        );
        if (employeeId && !sameAssignment)
          await tx.notification.create({
            data: {
              userId: employeeId,
              title: "New visit assignment",
              message: `Visit ${request.reference} has been assigned to you. Review the schedule and respond in your workspace.`,
              link: "/staff",
            },
          });
        return {
          updated,
          employee:
            employeeId && !sameAssignment
              ? await tx.user.findUnique({
                  where: { id: employeeId },
                  select: { email: true },
                })
              : null,
        };
      });
      if (!result) return res.status(404).json({ error: "Request not found." });
      if (result.conflict)
        return res.status(409).json({ error: result.conflict });
      if (result.employee?.email)
        void sendMail({
          to: result.employee.email,
          subject: `A visit is waiting for your response · ${result.updated.reference}`,
          text: `A confirmed visit has been assigned to you. Sign in to review the schedule and accept or decline the assignment.\n\nReference: ${result.updated.reference}\nVisit: ${dateText(result.updated.requestedDate)} at ${timeText(result.updated.startTime)}.`,
        });
      res.json(requestView(result.updated, req.user));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/employee/assignments/:id/response",
  requireWebRequest,
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const response = cleanString(req.body?.response);
      const note = cleanString(req.body?.note);
      if (
        req.user.role !== "EMPLOYEE" ||
        !isId(req.params.id) ||
        !["Accepted", "Declined"].includes(response) ||
        (response === "Declined" && (note.length < 10 || note.length > 500))
      )
        return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const request = await tx.serviceRequest.findFirst({
          where: { id: req.params.id, assignedEmployeeId: req.user.id },
        });
        if (!request) return { missing: true };
        if (
          request.employeeResponse !== "Pending" ||
          !["Provider assigned", "Confirmed", "Rescheduled"].includes(
            request.status,
          )
        )
          return {
            conflict:
              "This assignment has already been answered or is no longer active.",
          };
        if (response === "Accepted") {
          const updated = await tx.serviceRequest.update({
            where: { id: request.id },
            data: {
              employeeResponse: "Accepted",
              employeeRespondedAt: new Date(),
              employeeDeclineNote: null,
            },
          });
          await audit(
            tx,
            req.user.email,
            "employee_assignment_accepted",
            "request",
            request.id,
            { employeeId: req.user.id },
          );
          return { updated, accepted: true, reference: request.reference };
        }
        const updated = await tx.serviceRequest.update({
          where: { id: request.id },
          data: {
            assignedEmployeeId: null,
            employeeResponse: "Declined",
            employeeRespondedAt: new Date(),
            employeeDeclineNote: note,
            status: "Confirmed",
          },
        });
        await audit(
          tx,
          req.user.email,
          "employee_assignment_declined",
          "request",
          request.id,
          { employeeId: req.user.id, note },
        );
        return { updated, declined: true, reference: request.reference };
      });
      if (result.missing)
        return res
          .status(404)
          .json({ error: "This assignment is no longer available." });
      if (result.conflict)
        return res.status(409).json({ error: result.conflict });
      if (result.accepted)
        void sendMail({
          to: adminEmail,
          subject: `Employee accepted an assignment · ${result.reference}`,
          text: `An employee has accepted the assigned visit.\nReference: ${result.reference}\nThe operations dashboard has the latest status.`,
        });
      if (result.declined)
        void sendMail({
          to: adminEmail,
          subject: `Employee declined an assignment · ${result.reference}`,
          text: `An employee has declined an assignment and the visit needs a new match.\nReference: ${result.reference}\nOpen the admin dashboard to review the reason and reassign the visit.`,
        });
      res.json({
        id: result.updated.id,
        status: result.updated.status,
        response: result.updated.employeeResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/employee/assignments/:id/attendance/:action",
  requireWebRequest,
  requireAuth,
  requireCareWorker,
  async (req, res, next) => {
    try {
      const { id, action } = req.params;
      const latitude = Number(req.body?.latitude);
      const longitude = Number(req.body?.longitude);
      if (
        !["EMPLOYEE", "PROVIDER"].includes(req.user.role) ||
        !isId(id) ||
        !["check-in", "check-out"].includes(action) ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      )
        return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          id,
        );
        const request = await tx.serviceRequest.findFirst({
          where: {
            id,
            OR: [
              { assignedEmployeeId: req.user.id },
              { assignedProvider: { userId: req.user.id, status: "Approved" } },
            ],
          },
        });
        if (!request) return { missing: true };
        const verification = await attendanceVerification(
          tx,
          request,
          req.body,
        );
        const existing = await tx.workAttendance.findUnique({
          where: {
            requestId_employeeId: { requestId: id, employeeId: req.user.id },
          },
        });
        if (action === "check-in") {
          if (existing)
            return {
              conflict: "Check-in has already been recorded for this visit.",
            };
          if (
            (req.user.role === "PROVIDER"
              ? request.providerResponse
              : request.employeeResponse) !== "Accepted"
          )
            return {
              conflict: "Accept this assignment before recording arrival.",
            };
          if (
            ![
              "Confirmed",
              "Rescheduled",
              "Provider assigned",
              "Delayed",
            ].includes(request.status)
          )
            return { conflict: "This visit is not ready for check-in." };
          const now = Date.now(),
            window = visitWindow(request);
          const localDay = new Date(now + 2 * 3600000)
            .toISOString()
            .slice(0, 10);
          if (
            localDay !== dateText(request.requestedDate) ||
            now < window.start.valueOf() - 60 * 60000 ||
            now > window.end.valueOf()
          )
            return {
              conflict:
                "Arrival is available on the scheduled day in Kigali, from 60 minutes before the start until the scheduled end.",
            };
          const attendance = await tx.workAttendance.create({
            data: {
              requestId: id,
              employeeId: req.user.id,
              checkInLatitude: latitude,
              checkInLongitude: longitude,
              checkInAccuracy: verification.evidence.accuracy,
              checkInCapturedAt: verification.evidence.capturedAt,
              distanceMeters: verification.distance,
              verificationStatus: verification.status,
              discrepancyNote: verification.note,
            },
          });
          await tx.serviceRequest.update({
            where: { id },
            data: { status: "In progress" },
          });
          await audit(
            tx,
            req.user.email,
            "attendance_check_in",
            "request",
            id,
            { employeeId: req.user.id },
          );
          if (request.clientUserId)
            await tx.notification.create({
              data: {
                userId: request.clientUserId,
                title: "Visit arrival recorded",
                message: `Arrival has been recorded for visit ${request.reference}.`,
                link: "/account",
              },
            });
          return { attendance };
        }
        if (!existing)
          return { conflict: "Record a check-in before checking out." };
        if (existing.checkOutAt)
          return {
            conflict: "Check-out has already been recorded for this visit.",
          };
        if (
          Date.now() <= new Date(existing.checkInAt).valueOf() ||
          verification.evidence.capturedAt < new Date(existing.checkInAt)
        )
          return {
            conflict:
              "Capture a fresh location after your arrival before recording departure.",
          };
        if (
          ![
            "In progress",
            "Delayed",
            "Unable to Complete",
            "Complaint open",
          ].includes(request.status)
        )
          return {
            conflict: "Only an in-progress visit can record departure.",
          };
        const scheduledEnd =
          new Date(
            `${dateText(request.requestedDate)}T${timeText(request.startTime)}:00+02:00`,
          ).valueOf() +
          request.durationHours * 3600000;
        if (Date.now() < scheduledEnd - 15 * 60000) {
          const permissions = await tx.employeeLeaveRequest.findMany({
            where: {
              employeeId: req.user.id,
              status: "Approved",
              kind: "Early departure permission",
              startDate: request.requestedDate,
              endDate: request.requestedDate,
            },
          });
          const approved = permissions.some((permission) => {
            const window = leaveWindow(permission);
            return (
              window.start.valueOf() <= Date.now() + 15 * 60000 &&
              window.end.valueOf() >= scheduledEnd
            );
          });
          if (!approved) {
            verification.status = "Flagged";
            verification.note =
              "Departure was recorded more than 15 minutes before the scheduled end without an approved early-departure permission.";
          }
        }
        const attendance = await tx.workAttendance.update({
          where: { id: existing.id },
          data: {
            checkOutAt: new Date(),
            checkOutLatitude: latitude,
            checkOutLongitude: longitude,
            checkOutAccuracy: verification.evidence.accuracy,
            checkOutCapturedAt: verification.evidence.capturedAt,
            verificationStatus:
              existing.verificationStatus === "Flagged" ||
              verification.status === "Flagged"
                ? "Flagged"
                : "Verified",
            discrepancyNote: existing.discrepancyNote || verification.note,
          },
        });
        const completed = !["Unable to Complete", "Complaint open"].includes(
          request.status,
        );
        await tx.serviceRequest.update({
          where: { id },
          data: { status: completed ? "Completed" : request.status },
        });
        await audit(tx, req.user.email, "attendance_check_out", "request", id, {
          employeeId: req.user.id,
        });
        if (request.clientUserId)
          await tx.notification.create({
            data: {
              userId: request.clientUserId,
              title: completed ? "Visit completed" : "Visit departure recorded",
              message: completed
                ? `Departure has been recorded and visit ${request.reference} is marked completed.`
                : `Departure has been recorded for visit ${request.reference}.`,
              link: "/account",
            },
          });
        return { attendance };
      });
      if (result.missing)
        return res
          .status(404)
          .json({ error: "This visit is not assigned to your account." });
      if (result.conflict)
        return res.status(409).json({ error: result.conflict });
      res.json({
        checkInAt: result.attendance.checkInAt,
        checkOutAt: result.attendance.checkOutAt,
        verificationStatus: result.attendance.verificationStatus,
        discrepancyNote: result.attendance.discrepancyNote,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/employee/assignments/:id/reports",
  requireWebRequest,
  requireAuth,
  requireCareWorker,
  async (req, res, next) => {
    try {
      const kind = cleanString(req.body?.kind);
      const message = cleanString(req.body?.message);
      if (
        !["EMPLOYEE", "PROVIDER"].includes(req.user.role) ||
        !isId(req.params.id) ||
        !["incident", "supplies", "service-note"].includes(kind) ||
        message.length < 10 ||
        message.length > 2000
      )
        return notFound(res);
      const report = await prisma.$transaction(async (tx) => {
        const request = await tx.serviceRequest.findFirst({
          where: {
            id: req.params.id,
            OR: [
              { assignedEmployeeId: req.user.id },
              { assignedProvider: { userId: req.user.id, status: "Approved" } },
            ],
          },
        });
        if (!request) return null;
        if (
          (req.user.role === "PROVIDER"
            ? request.providerResponse
            : request.employeeResponse) !== "Accepted"
        )
          return {
            conflict: "Accept this assignment before sending a visit report.",
          };
        const created = await tx.serviceReport.create({
          data: {
            requestId: request.id,
            employeeId: req.user.id,
            kind,
            message,
          },
        });
        await audit(
          tx,
          req.user.email,
          "service_report_created",
          "request",
          request.id,
          { kind, reportId: created.id },
        );
        return created;
      });
      if (report?.conflict)
        return res.status(409).json({ error: report.conflict });
      if (!report)
        return res
          .status(404)
          .json({ error: "This visit is not assigned to your account." });
      res.status(201).json({
        id: report.id,
        kind: report.kind,
        createdAt: report.createdAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/requests/:id/assignment",
  requireWebRequest,
  requireAuth,
  requireManager,
  async (req, res, next) => {
    try {
      if (!isId(req.params.id)) return notFound(res);
      const providerId =
        req.body?.providerId === null || req.body?.providerId === ""
          ? null
          : cleanString(req.body?.providerId);
      if (providerId !== null && !isId(providerId)) return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          "SELECT id FROM service_requests WHERE id = $1::uuid FOR UPDATE",
          req.params.id,
        );
        const request = await tx.serviceRequest.findUnique({
          where: { id: req.params.id },
        });
        if (!request) return { missing: true };
        if (
          await tx.workAttendance.findFirst({
            where: { requestId: request.id, checkOutAt: null },
          })
        )
          return {
            conflict:
              "Record departure before changing the assignment for a visit that has already started.",
          };
        if (providerId && request.assignedEmployeeId)
          return {
            conflict:
              "Unassign the employee before assigning an approved provider to this visit.",
          };
        if (providerId === null) {
          const updated = await tx.serviceRequest.update({
            where: { id: request.id },
            data: {
              assignedProviderId: null,
              providerResponse: "Not assigned",
              providerRespondedAt: null,
              providerDeclineNote: null,
              status:
                request.status === "Provider assigned"
                  ? "Confirmed"
                  : request.status,
            },
            include: {
              assignedProvider: { select: { fullName: true, reference: true } },
            },
          });
          await audit(
            tx,
            req.user.email,
            "provider_unassigned",
            "request",
            request.id,
            { previousProviderId: request.assignedProviderId },
          );
          return { updated };
        }
        const provider = await tx.providerApplication.findFirst({
          where: {
            id: providerId,
            status: "Approved",
            user: { is: { isActive: true } },
          },
        });
        if (!provider)
          return {
            conflict:
              "Only an approved provider with an active portal account can be assigned.",
          };
        if (provider.service !== request.service)
          return {
            conflict:
              "That provider is not approved for this service category.",
          };
        await tx.$queryRawUnsafe(
          "SELECT id FROM users WHERE id = $1::uuid FOR UPDATE",
          provider.userId,
        );
        const scheduleError = await scheduleConflict(
          tx,
          request,
          provider.userId,
        );
        if (scheduleError) return { conflict: scheduleError };
        if (
          ![
            "Confirmed",
            "Rescheduled",
            "Provider assigned",
            "Delayed",
          ].includes(request.status)
        )
          return {
            conflict:
              "Confirm the booking with the customer before assigning a provider.",
          };
        const updated = await tx.serviceRequest.update({
          where: { id: request.id },
          data: {
            assignedProviderId: provider.id,
            providerResponse: "Pending",
            providerRespondedAt: null,
            providerDeclineNote: null,
            status: "Provider assigned",
          },
          include: {
            assignedProvider: { select: { fullName: true, reference: true } },
          },
        });
        await audit(
          tx,
          req.user.email,
          "provider_assigned",
          "request",
          request.id,
          { providerId: provider.id, providerReference: provider.reference },
        );
        if (request.assignedProviderId !== provider.id)
          await tx.notification.create({
            data: {
              userId: provider.userId,
              title: "New visit assignment",
              message: `Visit ${request.reference} has been assigned to you. Review the schedule and respond in your workspace.`,
              link: "/staff",
            },
          });
        return { updated, request, provider };
      });
      if (result.missing)
        return res.status(404).json({ error: "Request not found." });
      if (result.conflict)
        return res.status(409).json({ error: result.conflict });
      if (result.request?.email)
        void sendMail({
          to: result.request.email,
          subject: `A provider has been matched · ${result.request.reference}`,
          text: `Hello ${result.request.fullName},\n\nA provider has been matched to your confirmed booking. Our team will contact you with the agreed visit details.\n\nReference: ${result.request.reference}`,
        });
      res.json(requestView(result.updated, req.user));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/requests/:id/payment",
  requireWebRequest,
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const method = cleanString(req.body?.paymentMethod);
      const clientStatus = cleanString(req.body?.clientPaymentStatus);
      const providerStatus = cleanString(req.body?.providerPaymentStatus);
      const amount =
        req.body?.quotedAmount === "" || req.body?.quotedAmount === null
          ? null
          : Number(req.body?.quotedAmount);
      const transactionReference = cleanString(req.body?.transactionReference);
      if (
        !isId(req.params.id) ||
        !paymentMethods.includes(method) ||
        !clientPaymentStatuses.includes(clientStatus) ||
        !providerPaymentStatuses.includes(providerStatus)
      )
        return notFound(res);
      if (
        amount !== null &&
        (!Number.isFinite(amount) || amount < 0 || amount > 999999999.99)
      )
        return notFound(res);
      if (transactionReference.length > 120) return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        const row = await tx.serviceRequest
          .update({
            where: { id: req.params.id },
            data: {
              quotedAmountRwf: amount,
              paymentMethod: method,
              clientPaymentStatus: clientStatus,
              providerPaymentStatus: providerStatus,
              transactionReference: transactionReference || null,
            },
          })
          .catch((error) =>
            error.code === "P2025" ? null : Promise.reject(error),
          );
        if (row)
          await audit(
            tx,
            req.user.email,
            "payment_updated",
            "request",
            row.id,
            {
              quotedAmountRwf: amount,
              paymentMethod: method,
              clientPaymentStatus: clientStatus,
              providerPaymentStatus: providerStatus,
              transactionReference: transactionReference || null,
            },
          );
        return row;
      });
      if (!result) return res.status(404).json({ error: "Request not found." });
      res.json(requestView(result, req.user));
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/applications/:id/status",
  requireWebRequest,
  requireAuth,
  requireManager,
  async (req, res, next) => {
    try {
      const status = cleanString(req.body?.status);
      if (!isId(req.params.id) || !applicationStatuses.includes(status))
        return notFound(res);
      const result = await prisma.$transaction(async (tx) => {
        const row = await tx.providerApplication
          .update({ where: { id: req.params.id }, data: { status } })
          .catch((error) =>
            error.code === "P2025" ? null : Promise.reject(error),
          );
        if (row?.userId)
          await tx.user.update({
            where: { id: row.userId },
            data: { isActive: status === "Approved" },
          });
        if (row)
          await audit(
            tx,
            req.user.email,
            "status_changed",
            "provider_application",
            row.id,
            { status },
          );
        return row
          ? tx.providerApplication.findUnique({
              where: { id: row.id },
              include: { user: { select: { email: true, isActive: true } } },
            })
          : null;
      });
      if (!result)
        return res.status(404).json({ error: "Application not found." });
      res.json(applicationView(result));
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/admin/applications/:id/account",
  requireWebRequest,
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const email = cleanString(req.body?.email).toLowerCase();
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";
      if (
        !isId(req.params.id) ||
        !isEmail(email) ||
        password.length < 12 ||
        password.length > 128
      )
        return notFound(res);
      const created = await prisma.$transaction(async (tx) => {
        const application = await tx.providerApplication.findUnique({
          where: { id: req.params.id },
        });
        if (!application) return { missing: true };
        if (application.status !== "Approved")
          return {
            conflict:
              "Approve the application before creating provider access.",
          };
        if (application.userId)
          return { conflict: "This provider already has a sign-in account." };
        const user = await tx.user.create({
          data: {
            fullName: application.fullName,
            phone: application.phone,
            email,
            passwordHash: await bcrypt.hash(password, 12),
            role: "PROVIDER",
            mustChangePassword: true,
          },
        });
        await tx.providerApplication.update({
          where: { id: application.id },
          data: { userId: user.id },
        });
        await audit(
          tx,
          req.user.email,
          "provider_account_created",
          "provider_application",
          application.id,
          { accountEmail: user.email },
        );
        return { user, application };
      });
      if (created.missing)
        return res
          .status(404)
          .json({ error: "Provider application not found." });
      if (created.conflict)
        return res.status(409).json({ error: created.conflict });
      res.status(201).json({
        account: accountView(created.user),
        applicationId: created.application.id,
      });
    } catch (error) {
      if (error.code === "P2002")
        return res
          .status(409)
          .json({ error: "An account already uses that email address." });
      next(error);
    }
  },
);

const operationsRouter = express.Router();
app.use("/api", operationsRouter);

app.use("/api", (_req, res) =>
  res.status(404).json({ error: "That page could not be found." }),
);
app.use((error, req, res, _next) => {
  if (error instanceof DomainError)
    return res.status(error.status).json({ error: error.message });
  if (error instanceof SyntaxError && error.status === 400)
    return res
      .status(400)
      .json({ error: "The request body is invalid. Refresh and try again." });
  if (error.type === "entity.too.large")
    return res.status(413).json({
      error: req.path === "/api/admin/public-media"
        ? "This upload is too large. Choose an image up to 8 MB or an MP4 video up to 20 MB."
        : req.path === "/api/admin/site-content"
          ? "Website content is too large. Keep the content under 500 KB."
          : "This upload is too large. The maximum document size is 5 MB.",
    });
  console.error("API request failed:", error.code || error.message);
  res
    .status(500)
    .json({ error: "Something went wrong. Please try again shortly." });
});

async function start() {
  const pool = await connectToNeon(databaseUrl);
  prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    log: ["warn", "error"],
  });
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        fullName: adminName,
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "ADMIN",
      },
    });
  } else if (existingAdmin.role !== "ADMIN") {
    throw new Error(
      "ADMIN_EMAIL already belongs to a client or employee account. Set ADMIN_EMAIL to a separate address in .env.",
    );
  }
  await prisma.user.findFirst({ select: { id: true } });
  await readSiteContent(prisma);
  installOperations(operationsRouter, {
    prisma,
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
  });
  setInterval(() => void processOutbox().catch(() => {}), 60000).unref();
  const serviceAlerts = createServiceAlerts(prisma, sendMail);
  setInterval(
    () =>
      void serviceAlerts().catch((error) =>
        console.error(
          "Service alerts unavailable:",
          error.code || error.message,
        ),
      ),
    60000,
  ).unref();
  void serviceAlerts().catch(() => {});
  app.listen(port, "0.0.0.0", () =>
    console.log(`Wellness Home Care API listening on ${port}`),
  );
}

start().catch(async (error) => {
  console.error("The API could not start:", error.code || error.message);
  await prisma?.$disconnect().catch(() => {});
  process.exit(1);
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
