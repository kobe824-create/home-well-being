// Explicit local QA/demo database only. This script does not load any .env file.
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url)
  throw new Error("Set an explicit local QA DATABASE_URL before seeding.");
const parsed = new URL(url);
if (
  !["127.0.0.1", "localhost", "db"].includes(parsed.hostname) ||
  !/(qa|test|demo)/i.test(parsed.pathname)
)
  throw new Error(
    "Demo seed is restricted to a local database whose name includes qa, test or demo.",
  );
const db = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: url, ssl: false }), {
    disposeExternalPool: true,
  }),
});
const password = "local-only-Wellness-QA-2026!";
const passwordHash = await bcrypt.hash(password, 12);
const makeUser = async (email, fullName, role) =>
  db.user.upsert({
    where: { email },
    create: { email, fullName, role, phone: "+250000000000", passwordHash },
    update: {
      fullName,
      passwordHash,
      isActive: true,
      role,
      mustChangePassword: false,
    },
  });
try {
  const admin = await makeUser(
    "qa-admin@wellness.test",
    "QA Demo Administrator",
    "ADMIN",
  );
  const operations = await makeUser(
    "qa-operations@wellness.test",
    "QA Demo Operations",
    "OPERATIONS",
  );
  const client = await makeUser(
    "qa-client@wellness.test",
    "QA Demo Client",
    "CLIENT",
  );
  const secondClient = await makeUser(
    "qa-other-client@wellness.test",
    "QA Other Client",
    "CLIENT",
  );
  const employee = await makeUser(
    "qa-employee@wellness.test",
    "QA Demo Caregiver",
    "EMPLOYEE",
  );
  const provider = await makeUser(
    "qa-provider@wellness.test",
    "QA Demo Provider",
    "PROVIDER",
  );
  const department = await db.department.upsert({
    where: { service: "elderly" },
    create: {
      name: "Elderly assistance",
      service: "elderly",
      description: "Companionship and nonmedical daily assistance.",
      hourlyRateRwf: 8000,
      minimumHours: 2,
      qualificationRules: ["First aid"],
    },
    update: {},
  });
  for (const [service, name, rate] of [
    ["childcare", "Childcare", 7000],
    ["cooking", "Home cooking", 6000],
    ["cleaning", "Home cleaning", 5000],
    ["security", "Home checks", 6000],
  ])
    await db.department.upsert({
      where: { service },
      create: {
        service,
        name,
        hourlyRateRwf: rate,
        qualificationRules:
          service === "childcare" ? ["Child safeguarding", "First aid"] : [],
        active: service !== "security",
      },
      update: {},
    });
  for (const user of [employee, provider])
    await db.staffProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        departmentId: department.id,
        jobTitle: "Home support professional",
        screeningStatus: "Cleared",
        screeningNotes: "Synthetic QA screening record, not a real credential.",
        qualifications: ["First aid"],
        hourlyRateRwf: 3500,
        status: "Active",
      },
      update: {},
    });
  let household = await db.household.findFirst({
    where: { clientId: client.id, name: "QA Demo Family Home" },
  });
  if (!household)
    household = await db.household.create({
      data: {
        clientId: client.id,
        name: "QA Demo Family Home",
        address: "Synthetic demonstration address, do not visit",
        neighborhood: "Kacyiru",
        latitude: -1.9441,
        longitude: 30.0619,
        locationApproved: true,
        geofenceMeters: 150,
        contacts: [
          {
            name: "QA Authorized Contact",
            relationship: "Family",
            phone: "+250000000000",
            isEmergency: true,
            isAuthorized: true,
          },
        ],
      },
    });
  const application = await db.providerApplication.upsert({
    where: { reference: "PRO-DEMO-001" },
    create: {
      reference: "PRO-DEMO-001",
      fullName: provider.fullName,
      phone: "+250000000000",
      email: provider.email,
      neighborhood: "Kigali",
      service: "elderly",
      experience: "Synthetic demonstration provider application.",
      languages: "English, Kinyarwanda",
      availability: "Weekdays",
      referencesText: "Synthetic reference information for QA only.",
      referenceConsent: true,
      screeningConsent: true,
      status: "Approved",
      userId: provider.id,
    },
    update: {},
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const createRequest = (reference, overrides) =>
    db.serviceRequest.upsert({
      where: { reference },
      create: {
        reference,
        fullName: client.fullName,
        phone: "+250000000000",
        email: client.email,
        preferredContact: "email",
        service: "elderly",
        neighborhood: "Kacyiru",
        requestedDate: tomorrow,
        startTime: new Date("1970-01-01T09:00:00Z"),
        durationHours: 2,
        serviceDetails: { notes: "Synthetic QA visit. Not a real booking." },
        contactConsent: true,
        clientUserId: client.id,
        householdId: household.id,
        ...overrides,
      },
      update: {},
    });
  const completed = await createRequest("WHC-DEMO-COMPLETED", {
    requestedDate: yesterday,
    status: "Completed",
    assignedEmployeeId: employee.id,
    employeeResponse: "Accepted",
  });
  await createRequest("WHC-DEMO-UPCOMING", {
    status: "Provider assigned",
    assignedEmployeeId: employee.id,
    employeeResponse: "Pending",
  });
  await createRequest("WHC-DEMO-PROVIDER", {
    startTime: new Date("1970-01-01T14:00:00Z"),
    status: "Provider assigned",
    assignedProviderId: application.id,
    providerResponse: "Pending",
  });
  await createRequest("WHC-DEMO-NEW", {
    status: "New request",
    requestedDate: tomorrow,
  });
  const arrival = new Date(yesterday);
  arrival.setUTCHours(7);
  const departure = new Date(arrival.valueOf() + 2 * 3600000);
  await db.workAttendance.upsert({
    where: {
      requestId_employeeId: {
        requestId: completed.id,
        employeeId: employee.id,
      },
    },
    create: {
      requestId: completed.id,
      employeeId: employee.id,
      checkInAt: arrival,
      checkOutAt: departure,
      checkInLatitude: -1.9441,
      checkInLongitude: 30.0619,
      checkOutLatitude: -1.9441,
      checkOutLongitude: 30.0619,
      checkInAccuracy: 10,
      checkOutAccuracy: 8,
      verificationStatus: "Verified",
      distanceMeters: 0,
    },
    update: {},
  });
  const invoice = await db.invoice.upsert({
    where: { requestId: completed.id },
    create: {
      requestId: completed.id,
      clientId: client.id,
      number: "INV-DEMO-001",
      totalRwf: 16000,
      lineItems: [
        {
          description: "QA home-assistance visit",
          quantity: 2,
          unitPriceRwf: 8000,
          totalRwf: 16000,
        },
      ],
      status: "Part-paid",
    },
    update: {},
  });
  if (!(await db.payment.findFirst({ where: { invoiceId: invoice.id } })))
    await db.payment.create({
      data: {
        invoiceId: invoice.id,
        amountRwf: 8000,
        kind: "PAYMENT",
        method: "Cash",
        reference: "DEMO-NOT-A-REAL-PAYMENT",
        recordedBy: admin.id,
      },
    });
  if (!(await db.notification.findFirst({ where: { userId: admin.id } })))
    await db.notification.create({
      data: {
        userId: admin.id,
        title: "Welcome to the local QA workspace",
        message:
          "All records labeled QA/DEMO are synthetic. External integrations are disabled without credentials.",
        link: "/staff",
      },
    });
  console.log(
    JSON.stringify(
      {
        seeded: "Synthetic local QA data only",
        accounts: [
          admin,
          operations,
          client,
          secondClient,
          employee,
          provider,
        ].map((u) => ({ email: u.email, role: u.role })),
        password,
      },
      null,
      2,
    ),
  );
} finally {
  await db.$disconnect();
}
