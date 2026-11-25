# Wellness Home Care

A React and Express home-care booking and operations system for Kigali. Households request help, administrators review and coordinate services, and approved employees/providers manage assigned visits. PostgreSQL stores the records through Prisma.

Bookings use manual review and confirmation. Submitting a request does not promise instant availability. Provider applications do not automatically create approved providers or assignments.

## Start locally

Requirements: Docker with Docker Compose, or Node.js 22+ and PostgreSQL for a manual development setup.

1. Work from the project root. Create `.env` from `.env.example` only if you do not already have one; preserve an existing configured file.
2. Choose the database connection and set `ADMIN_EMAIL`, an `ADMIN_PASSWORD` of at least 16 characters and an `AUTH_SECRET` of at least 32 random characters. `openssl rand -hex 32` can generate a signing secret.
3. Leave optional payment, SMTP, SMS and WhatsApp credentials blank until you have provider accounts. The local operational tools still work without them.
4. Build and start with the configured PostgreSQL/Neon connection:

   ```sh
   docker compose up -d --build
   docker compose ps
   ```

5. Open [http://localhost:8080](http://localhost:8080). The API health endpoint is `/api/health` through the same web origin.

The API deploys committed Prisma migrations before startup and creates the configured administrator if that email does not already exist. It does not overwrite an existing administrator password on restart. Use the password workflow to change an existing account's credentials.

### Database choices

- **Local PostgreSQL:** use a separate development database. Never point test or sample-data commands at a database containing real customers.
- **Neon:** set `DATABASE_URL` to the application connection and `DATABASE_URL_UNPOOLED` to the direct connection. The direct hostname does not contain `-pooler`. Preserve `sslmode=require` and URL-encode password characters. The API prefers the direct URL when supplied; migrations and backups also use it.

For an entirely local database, set these values in `.env` (replace `YOUR_LOCAL_PASSWORD` with the same URL-safe password in both places):

```dotenv
DATABASE_URL=postgresql://wellness:YOUR_LOCAL_PASSWORD@db:5432/wellness?sslmode=disable
DATABASE_URL_UNPOOLED=
LOCAL_POSTGRES_PASSWORD=YOUR_LOCAL_PASSWORD
COOKIE_SECURE=false
PUBLIC_URL=http://localhost:8080
```

Then include the local database profile:

```sh
docker compose --profile local-db up -d --build
```

The database is reachable by API/backup containers as `db:5432` and by host development tools as `127.0.0.1:5434`. It persists in `wellness-postgres`. External Neon deployments do not need that profile. Set `COOKIE_SECURE=true` and the real HTTPS `PUBLIC_URL` for public deployment.

## Open the correct workspace

| Address | Who uses it |
| --- | --- |
| `/` | Public service information and booking requests |
| `/account` | Clients: households, own services, notifications, invoices and feedback |
| `/staff` | Administrator, operations staff, employees and approved providers; tools follow account role |
| `/admin` | Team sign-in alias |

The administrator creates team accounts, including limited operations access, and approves provider applications. Operations staff coordinate service records while administrator-only tools protect finances and account access. Employees/providers see assigned households and relevant work information. Clients see their own households and requests.

Administrators can edit the public pages, contact information, photos, video, FAQs, policies and other site copy under **Website content** in the workspace. Review the draft preview before publishing. The current public contact is 0785706884 and u.mary@ddin.rw. Uploaded public media is stored in its own persistent volume; deployment backups must include that volume. See [docs/WEBSITE-CONTENT.md](docs/WEBSITE-CONTENT.md) for the editing and storage details.

## Operating the system

1. Set departments, approved rates, worker screening, qualifications, contracts and availability.
2. A client submits a request, or a series of dated requests for regular help. Operations agrees service scope, schedule, provider, price and cancellation terms before confirming.
3. Link the request to the correct saved household. The administrator reviews and approves its attendance location.
4. Assign an eligible worker. Availability conflicts and approved leave must be resolved before the assignment proceeds.
5. The worker accepts, records arrival, submits service updates and records departure. Browser GPS is collected only when attendance is requested.
6. Review feedback, complaints, supplies and change requests. Issue an invoice, record received payments/refunds and reconcile its balance.
7. Calculate worker pay from eligible work and the configured pay terms, review it, then record an actual payment with its reference.

Recurring work is managed as separate dated occurrences, each with its own assignment, attendance and financial records. The series remains subject to review; recurrence does not automatically confirm availability.

## Configuration and integrations

[docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) lists the database, business-contact and provider settings. Secrets stay in the untracked server `.env` and are not embedded in browser bundles.

- In-app notifications work locally.
- SMTP enables email acknowledgements, operational mail and password recovery.
- Hosted payment checkout requires the configured gateway and verified webhook processing; a redirect does not establish payment.
- SMS/WhatsApp need the selected provider's account, sender and consent configuration.
- Manual invoice transactions and payroll payment records do not transfer money themselves.
- Browser GPS needs no Google Maps API key. Allow location in the browser; use localhost or HTTPS. Phones visiting a plain HTTP LAN address may not receive location access.

### Attendance and pay rules

GPS records include multiple fresh readings, accuracy and capture time. Missing/unapproved household baselines and attendance outside the accepted range are flagged for administrator review. An approved early-departure permission can cover the remaining hours of an existing visit; other leave conflicts require reassignment first. Early departure without permission is flagged. Approval does not itself promise extra paid hours. This project follows the Wellness SRS attendance review model. It does not continuously track employees.

The minute-based background check creates appointment reminders within two hours, late-arrival alerts after 15 minutes and missed-check-in alerts after the scheduled end. These are operational alerts, not emergency monitoring.

Hourly payroll uses checked-out attendance on completed assignments with `Verified` or administrator-`Approved` verification. Verified time is limited to the scheduled visit window; extra hours require an administrator approval and review note. Monthly salary currently prorates the agreed monthly amount by inclusive calendar days / 30. That is an explicit calculation assumption for the owner to confirm against the actual contract; it is not a tax or statutory payroll engine. Overlapping payroll periods are rejected.

## Migrations and development

Production-style startup applies existing migrations with `prisma migrate deploy`; do not use `prisma migrate reset` against customer data. Commit schema changes with an additive migration.

Typical commands inside the API container:

```sh
docker compose exec api npx prisma migrate status
docker compose exec api npx prisma generate
```

The application bootstrap creates only the initial administrator; ordinary startup does not require demo data. The optional `npm run seed:demo` command in `backend` is intended for a dedicated synthetic database. It refuses remote targets and database names without `qa`, `test` or `demo`. Apply migrations to that separate database before seeding; do not use the project’s real customer connection.

The frontend production build runs from `frontend`:

```sh
npm ci
npm run build
```

The frontend development server proxies `/api` to an API on port 4000. Set `VITE_PROXY_TARGET` to use a different local API port. Keep browser calls on one origin so cookie sessions and protected document downloads use the expected authentication.

### Manual development without Compose

Use a separate local PostgreSQL database and set the database URLs in the root `.env` to its host address (for example `127.0.0.1`, not the Compose-only `db` hostname). For local HTTP set `COOKIE_SECURE=false` and `PUBLIC_URL=http://localhost:5173`.

From the project root, start the API:

```sh
cd backend
npm ci
node --env-file=../.env node_modules/prisma/build/index.js migrate deploy
node --env-file=../.env node_modules/prisma/build/index.js generate
node --env-file=../.env src/server.js
```

In a second terminal, start the website:

```sh
cd frontend
npm ci
npm run dev
```

The default API port is 4000 and Vite uses 5173. This explicitly loads the root environment file for the API. No sample accounts are created by ordinary startup.

## Private documents and backups

Uploaded PDF/JPEG/PNG records are stored outside public web assets and downloaded through authenticated ownership/admin checks. Current upload limit is 5 MB. The database stores metadata; preserving PostgreSQL alone does not preserve document bytes. Compose mounts `wellness-documents` at `/app/private-documents`; do not place it under `frontend/public` or expose it through Nginx.

The backup worker creates PostgreSQL custom-format dumps in a persistent backup volume and retains 14 days. Inspect it with:

```sh
docker compose logs --tail=100 backup
```

Export document bytes separately, with restrictive local file permissions:

```sh
umask 077
mkdir -p backups
docker compose exec -T api sh -c 'tar -C "$DOCUMENT_STORAGE_PATH" -czf - .' > backups/private-documents.tar.gz
```

Keep encrypted copies of both database backups and private document storage outside the deployment host. Rehearse restoring both together in a separate environment. Stop writes and preserve a current backup before intentionally replacing existing records.

A restore must target the intended database. The existing worker can restore an explicitly selected dump:

```sh
docker compose exec -T backup sh -ec 'pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "/backups/$1"' sh wellness-YYYY-MM-DDTHHMMSSZ.dump
```

Replace the sample filename with an actual retained dump. This replaces matching database records; it does not restore uploaded files by itself.

## Production setup

Use an HTTPS reverse proxy and the correct canonical public URL. Configure secure cookies, approved business contacts and real provider credentials on the server. Keep PostgreSQL and private document storage private, retain persistent volumes across rebuilds, and maintain recovery copies outside the host.

To apply local source/configuration updates after reviewing them:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api
```

Do not remove database/document/backup volumes when updating the application.

## Requirements and business decisions

[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) maps the two supplied briefs to workflows, source evidence and remaining decisions. The owner still supplies the final brand, contact channels, launch neighbourhoods, hours, prices, screening/insurance/service rules, worker agreements and approved policies. Local functionality and draft policy pages do not claim those operating decisions have been completed.

## Services

- `web`: Nginx serves the React build on port 8080 and proxies `/api`.
- `api`: Express on internal port 4000 with Prisma/PostgreSQL.
- `backup`: scheduled PostgreSQL dumps.
- `db`: optional PostgreSQL 18 service under `--profile local-db`, bound to host loopback port 5434.

Stop services with `docker compose down`; retain named volumes to preserve local data and documents.
