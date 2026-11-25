# Requirements and delivery map

This project combines the public booking website in the development brief with the administrator, household and worker operations in the system requirements. The original documents are in [`mary_job_documents`](../mary_job_documents/). Read this document with the setup instructions in [README](../README.md) and the [integration configuration](INTEGRATIONS.md).

The website uses a request-and-confirm model. A submitted request, a provider application, a local checkout session or a queued email is not evidence of a confirmed booking, approved provider, received payment or delivered message.

## Core operating workflow

1. A household submits a request with a service, area, date, time, duration, necessary service details and contact consent. The system returns a reference and leaves the request unconfirmed.
2. Operations reviews suitability, the service scope, price, household location, worker screening and availability. A preferred worker request remains subject to company approval.
3. The administrator confirms the agreed details and assigns an approved worker. The worker accepts or declines with a reason.
4. At the assigned household, the worker records GPS arrival, submits activity/incident/supply updates, and records departure. The household can follow service status and attendance times.
5. The household can submit feedback or a complaint. Operations records completion and resolves concerns.
6. Invoices and payment records track the household balance; approved completed work supports worker earnings and payment approval.

## Role and module checklist

| Source requirement | Required behavior and access boundary |
| --- | --- |
| SRS 3.1, 3.13: employee records | Admin creates and manages accounts, screening, qualifications, references, departments, permitted profile changes, availability, contracts and work history. Suspension prevents continued account access. |
| Brief 7: provider applications | Public applications collect experience, languages, availability, relevant training, two references and screening/reference consent. Applications move through review, further-information, approved or not-approved states; submission alone grants no assignment eligibility. |
| SRS 3.2, 3.8: clients and households | Clients manage their own household information and authorized family contacts; admins manage client accounts, service history and concerns. Other households remain private. |
| SRS 3.3: departments | Admin maintains service categories, requirements, qualification rules, prices and assignment rules. Security services remain subject to business approval and applicable arrangements. |
| SRS 3.4, 3.9, 3.14: assignments | Review, confirmation, approved worker selection, acceptance/decline, reassignment, household instructions, schedule checks and progress changes. Clients request changes/cancellation; administrators review them. |
| SRS 3.14: work schedules | Workers can manage multiple assigned households and view daily, weekly or monthly work. Overlapping assignments and approved leave must prevent conflicting assignments. |
| SRS 3.5, 3.15, 5: attendance | Record arrival and departure coordinates and timestamps only on explicit attendance actions, compare with the approved household location, retain history and surface irregularities. Workers can report technical GPS problems. |
| SRS 3.10: household monitoring | Household sees its assigned worker, agreed service, recorded arrival/departure, activity reports and delayed/completed status. |
| SRS 3.11, 3.16: service reporting | Worker reports daily activities, challenges, incidents and missing supplies. Household reports needs, rates completed services and raises complaints. |
| SRS 3.17: leave and permission | Worker submits leave, early departure/absence or schedule-change requests with reasons; administrator records a decision and review note. |
| SRS 3.6, 3.12, 6.1: client finance | Service quotations, invoices, due dates, partial/full payment and refund records, outstanding balances, payment history, transaction references and receipts. |
| SRS 6.2: worker finance | Payment arrangements and contract rates, eligible completed work and hours, earnings calculation, approval, payment dates and transaction references. |
| SRS 3.7, Brief 8: reporting | Employee/client totals, departments, active/completed services, attendance/punctuality, unresolved complaints, revenue/expenses, unpaid invoices and worker payments; export operational and financial summaries. |
| SRS 7, Brief 9: communication | Notify the relevant household, worker and administrator about requests, assignments, decisions, attendance, delays, completion, leave, needs, complaints, invoices and payments. Consent applies to optional reminders and external messaging. |
| SRS 8, Brief 8/12: administration | Role and ownership checks, secure passwords, private document access, important action audit trails, spam protection, backups and recovery. |

## Booking and assignment states

The brief's booking states are **New request**, **Under review**, **Awaiting customer confirmation**, **Confirmed**, **Provider assigned**, **In progress** and **Completed**. Alternative outcomes include **Declined**, **Cancelled**, **Rescheduled**, **No-show** and **Complaint open**.

The SRS additionally describes worker work states: **Assigned**, **Accepted**, **In Progress**, **Completed**, **Delayed** and **Unable to Complete**. Worker acceptance is separate from the booking's confirmation state. A complaint does not prove that a service was completed, and a payment status does not confirm an assignment.

### Recurring services

Recurring work must consist of dated occurrences rather than repeated attendance against one undated request. Each occurrence needs its own assignment, attendance session, status and invoice. A series does not guarantee the same worker or automatic confirmation of every date.

## Service-specific requirements

### Elderly home assistance

- Describe companionship, meal assistance, agreed everyday activities and accompaniment as non-medical help.
- Collect required support, days/hours, location and relevant accessibility or communication needs.
- Do not present the service as emergency response, diagnosis, nursing or medication administration. Clinical services need separately approved professional arrangements.

### Babysitting and childcare

- Confirm the supported age range and booking options through the business operating policy.
- Collect age range, requested schedule, guardian contact and necessary care instructions through the appropriate private workflow.
- Require identity, reference and suitability screening before assigning childcare work.
- Record guardian authorization and agreed handover contacts; provide arrival/departure confirmation.
- Do not publish children's information or photographs without explicit informed permission.

### Home cooking

- Collect people served, meal preferences, allergies/dietary restrictions and schedule.
- Agree who supplies ingredients, kitchen equipment and cleaning materials.
- Communicate food hygiene expectations and finalize the business's food-handling requirements.

### Cleaning and security

The SRS lists these as departments in addition to the three initial public categories. The business controls which are offered. Security services must remain unavailable until standards, licensing arrangements, insurance and procedures have been checked. Driving/errand services are later brief enhancements, not part of the three-category launch.

## Public content and design checklist

- Home, Services, individual service details, How It Works, About, Become a Provider, Contact, FAQs and Policies.
- Main navigation and a prominent booking action; service cards and a clear request/review/confirmation explanation.
- Contact channels, service area and operating hours. The supplied public contact is 0785706884 and u.mary@ddin.rw; administrators can update these in the website editor.
- Warm, calm, professional design; mobile-first layouts, readable fonts, sufficient contrast, accessible labels and clear actions.
- Lightweight, compressed, appropriately licensed/permissioned photography. Only genuine consented testimonials.
- English at launch; Kinyarwanda is an optional later language.
- Page titles, descriptions, headings, local Kigali information and basic traffic/service/request analytics.
- Policies cover privacy, terms, cancellation/refunds, safeguarding and incident escalation. Draft product copy does not establish a final legal policy.

## Implementation and review record

| Area | Implementation evidence | Review performed |
| --- | --- | --- |
| Accounts and ownership | `backend/src/server.js`, `operations.js`; `AuthPage.jsx` | Role/ownership source review; sample administrator sign-in and workspace |
| Households, staff profiles and private documents | Private household/profile/document routes and portal forms | Owner/admin access, file size/type checks, stored-file isolation and screening gates reviewed |
| Departments, requests, assignments and schedules | Booking handlers, `domain.js`, portal request/schedule tools | Public three-step request saved with reference; conflict, service, screening and leave rules reviewed |
| Recurring occurrences | Series ID, separate dated request records | Daily/weekly/monthly date generation reviewed; separate attendance per occurrence |
| Attendance and reports | Browser `geolocation.js`; GPS evidence and attendance handlers | Multi-reading, range, accuracy, freshness and arrival window reviewed; physical phone GPS requires device acceptance before launch |
| Leave, changes and complaints | Partial leave migration; scoped request/review handlers | Full-day and time-window overlap, review notes, complaint/lifecycle separation reviewed |
| Invoices, payments, payroll and expenses | Financial routes and calculation rules | Balance/refund limits, serialized payment/payroll writes, scheduled-hour bounds and provider verification reviewed |
| Notifications and external adapters | In-app notifications, alerts, outbox, checkout/messaging adapters | Local optional-provider states visible; real delivery and provider sandbox settlement await keys |
| Public pages, accessibility and design | `PublicSite.jsx`, `Portal.jsx`, local fonts/assets, responsive styles | Desktop and mobile visual review, booking form, workspace navigation and dialog inspection; production bundle builds |
| Deployment, migrations and recovery | Compose, six additive Prisma migrations, backup workflow | Migrations applied and client generated on a separate synthetic local PostgreSQL database; existing project database/configuration untouched |

This record describes local implementation and review. Live provider deliveries, real money settlement, physical-device GPS and production recovery must be accepted in their actual operating environments after configuration. No real customer bookings, messages, payments or payroll transfers were made during development.

## Business-owner decisions before live service

These decisions require actual business information and approval; the application must not invent them:

- Registration details, logo approval, WhatsApp/social channels and any additional contact routes. The supplied phone and email are already set and can be updated by an administrator.
- Launch neighbourhoods, travel limits, opening hours, booking lead times and after-hours support.
- Service age ranges and exclusions, screening standards, reference checks, qualifications, safeguarding/handover rules and incident escalation.
- Worker employment/contractor model, agreements, rates, commission, overtime, transport/supplies/ingredients, deductions and payment arrangements.
- Approved payment and messaging providers, commercial accounts, verified sender identities, consent and cancellation/refund rules.
- Privacy notices, access responsibilities, retention/deletion periods, insurance and applicable local legal/licensing review.
- Backup custody, encrypted off-host copies, recovery rehearsal and deployment support contacts.

## Explicit later enhancements

The documents identify automated scheduling, advanced performance analytics, a demand-justified native mobile app, Kinyarwanda, and driving/errand services as later work. Online integrations require provider credentials and provider-side activation; local records and placeholder configuration do not imply live external service.
