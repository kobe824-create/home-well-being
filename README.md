# Wellness Home Care

A React and Express operations system for a Kigali home-assistance service, packaged as Docker services: the website, the API and a scheduled backup worker. The application database is hosted on Neon.

## Start locally with Docker

1. Open the root `.env` file and set `DATABASE_URL` to Neon's pooled connection string and `DATABASE_URL_UNPOOLED` to its direct connection string (the hostname has no `-pooler`). The API prefers the direct URL when provided; Prisma migrations and scheduled `pg_dump` backups use it as well. Keep `sslmode=require` and URL-encode special characters in the database password.
2. Set a unique administrator email, administrator password (at least 16 characters), and a random authentication secret (at least 32 characters). For example, `openssl rand -hex 32` creates a suitable secret.
3. From this folder, run:

   ```sh
   docker compose up --build
   ```

4. Open [http://localhost:8080](http://localhost:8080). The public website is at `/`, client accounts are at `/account`, and team sign-in is at `/staff` (also available at `/admin`).

The site stores service requests, provider applications, editable homepage content, visit attendance, service reports, customer feedback, employee time-off requests and administrator activity in Neon PostgreSQL. Request and application forms display a reference after saving. Requests remain unconfirmed until an administrator contacts the customer and agrees the scope, provider, price and terms.

The backup worker creates a PostgreSQL custom-format backup after it can reach Neon, then every 24 hours. It retains 14 days in the separate `wellness-backups` Docker volume. Use `docker compose logs -f backup` to check its status. The backup volume remains when the stack is stopped.

To restore, first stop the web and API services and make a Neon backup or branch before replacing records. Then pass the exact backup filename to:

```sh
docker compose exec -T backup sh -ec 'pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "/backups/$1"' sh wellness-YYYY-MM-DDTHHMMSSZ.dump
```

Restoring replaces matching records in the database. For real customer data, copy backups to encrypted off-site storage and rehearse recovery before launch; the Docker volume alone protects against container rebuilds, not loss of the host.

## Administrator email alerts

The dashboard is the default inbox. To send email acknowledgements and new-item alerts, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SENDER_EMAIL` in `.env`, then recreate the API with `docker compose up -d --build api`. The email alerts omit names, phone numbers and free-text care details; authorized staff can review those in the dashboard.

## Included

- Responsive service pages for elderly home assistance, babysitting and a combined home-services offer for cooking, cleaning and home security checks.
- Client registration and sign-in with a private dashboard for requests submitted while signed in, plus feedback and complaint submission.
- Request-and-confirm booking enquiries, with basic validation, consent, a honeypot field, rate limiting and reference numbers.
- A provider application form with status tracking. Applications do not automatically approve providers.
- Separate administrator, employee, provider and client workspaces. Admins create provider access only after approval; providers can accept or decline their assignments. Employees only see their assigned visits, must accept or decline with a reason, and can record arrival/departure, submit visit or incident notes, request supplies, and request time off. GPS coordinates are stored only when an employee explicitly records arrival or departure; the app does not continuously track location.
- Admin controls for requests, provider applications and access, approved-provider and employee assignment, manual RWF payment records, employee access, client feedback, employee leave, and the activity log.
- An admin homepage editor for the public headline, service cards, approach statement, and three welcome-card images/messages. The dashboard carousel advances automatically and can be edited without a code deployment. The supplied green image is included as its first slide.
- Prisma-managed Neon PostgreSQL schema and migrations. Additive migrations for website content, visit attendance, service reports, customer feedback, leave requests, provider access, and employee assignment responses run automatically on API startup.
- Optional email via SMTP; no online payments or instant availability.
- A custom, photo-led visual design and dashboard layout, with motion effects, stock photography and short Pexels video clips. The design is hand-built; no AI-generated visual assets are used.

## Before accepting live bookings

The provided briefs treat the business name as provisional and leave business contact channels, launch neighbourhoods, hours, prices, provider standards, safeguarding, insurance, payment and cancellation terms, privacy practices and local legal requirements for the owner to confirm. The website marks these as development-stage items rather than inventing contact details, reviews or completed screening claims. Replace the draft policy summaries and complete the operating procedures and local professional review before launch.

Compose serves the site over HTTP for local development. Put an HTTPS reverse proxy in front of it before public use; secure cookies and browser location require HTTPS on the public deployment. Before taking live bookings, arrange off-host encrypted backups and a restore rehearsal, configure SMTP, complete the business policies and contacts, and review safeguarding, privacy and local legal requirements.

Providers can review and respond to assigned visits, but live provider/employee availability, calendar conflict checking, and schedule-change workflows are not included. Payments are recorded manually; online mobile-money/card checkout, client invoices/receipts, payroll calculations, revenue/expense statements, and advanced financial reports are not included. The SRS items for household profiles and authorized family contacts, employee profile/document management, and secure document storage also need a scoped implementation before claiming full requirements coverage. Complete these features and the operating policies before calling the system fully compliant with every brief requirement.

## Services and ports

- `web`: Nginx serves the built React site on port `8080` and proxies `/api` to Express.
- `api`: Express on port `4000` (internal to the Compose network), using Prisma and the configured Neon connection.
- `backup`: daily `pg_dump` worker with 14-day retention in a named Docker volume. It uses `DATABASE_URL_UNPOOLED` for a direct Neon connection.

Stop the stack with `docker compose down`. Database records remain in Neon; the named backup volume is retained.
