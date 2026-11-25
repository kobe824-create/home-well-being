# Integrations and configuration

Keep configuration in the project's untracked `.env`; use `.env.example` as the field reference. Provider secrets belong on the API server. Do not put database passwords, SMTP passwords, payment keys or messaging tokens into `VITE_*` variables, public content or committed files.

The application must retain useful local behavior when optional providers are unconfigured: requests, assignments, attendance, in-app notifications, manual invoice transactions and reports do not require an external payment or messaging account. A queued message is not a delivered message, and a hosted checkout link is not a completed payment.

## Application and database

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL application connection. For Neon this can be the pooled URL. |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL/Neon connection for migrations and backups; use the non-pooler Neon hostname. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | First administrator account bootstrap. Use a real owner-controlled address and a unique initial password. |
| `AUTH_SECRET` | Server-side session signing secret. Generate a long random value. |
| `NODE_ENV`, `COOKIE_SECURE` | Runtime mode and secure-session cookie behavior. Use `COOKIE_SECURE=false` only for local HTTP development, and `true` for public HTTPS. |
| `LOCAL_POSTGRES_PASSWORD` | Password for the optional Compose `local-db` PostgreSQL service. |
| `PUBLIC_URL` | Canonical browser URL for password reset links and hosted-payment returns. Use HTTPS publicly. |
| `DOCUMENT_STORAGE_PATH` | Private server-side uploaded-document directory. Persist and back up the document bytes separately from the database. |

The API uses the direct connection when `DATABASE_URL_UNPOOLED` is supplied. Changing the bootstrap password in configuration does not by itself reset an already-created administrator account; use the application's password workflow.

## Business information

Set the genuine owner-approved values for `BUSINESS_NAME`, `BUSINESS_EMAIL`, `BUSINESS_PHONE`, `BUSINESS_WHATSAPP`, `BUSINESS_ADDRESS`, `BUSINESS_HOURS` and `SERVICE_AREAS`. Leave unknown contact values blank. These fields describe the business; they do not activate an SMS/WhatsApp sending account or prove that a service category is approved to operate.

## Email

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SENDER_EMAIL` from the selected mail provider. Port 465 uses implicit TLS in the current adapter. Other supported SMTP settings depend on the provider account. Authenticate a sender address/domain approved by the provider.

Email is persisted to an outbox. The API retries pending/retry entries every 60 seconds, up to five attempts. Without SMTP, entries are marked `Disabled`; they are not silently treated as sent. Email covers acknowledgements and operational notifications. Password reset depends on an address that can receive mail. Staff review sensitive household/care information inside authenticated workspaces rather than ordinary email bodies.

## Hosted payments

The payment adapter uses Flutterwave hosted checkout. The template reserves `FLUTTERWAVE_PUBLIC_KEY`; hosted checkout uses the server-side `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET` and `PUBLIC_URL`. Set these after the business has an approved provider account. Use provider test credentials for test transactions.

- Authenticated invoice checkout: `POST /api/invoices/:id/checkout`.
- Provider webhook: `POST /api/payments/flutterwave/webhook` on the public API origin.
- Browser return: `/account?payment=return` on `PUBLIC_URL`.

The server creates a checkout reference for the outstanding RWF balance and returns a hosted HTTPS checkout URL. The browser does not collect card details. A successful browser return does not mark an invoice paid. The webhook is authenticated and the server verifies the transaction, reference, currency and amount with the payment provider before recording a payment. Repeated callbacks must not create duplicate payment entries. Payments that arrive after the invoice balance has changed require reconciliation.

Manual cash, bank and mobile-money records remain available without a gateway. Recording a refund or marking payroll paid records an action already carried out by the business; it does not automatically send a bank transfer, payout or provider refund.

## SMS and WhatsApp

The selected provider configuration is represented by `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` and `TWILIO_WHATSAPP_FROM`. The business needs the appropriate registered sender, approved WhatsApp configuration/templates and recipient consent. A public contact WhatsApp number is separate from an authenticated sending identity.

Authenticated administrators can request delivery with `POST /api/communications`: `userId`, `channel` (`email`, `sms` or `whatsapp`), `message`, optional email `subject`, and `consentConfirmed: true` for SMS/WhatsApp. The recipient account must have a country-code phone number for messaging. Twilio acceptance returns a provider reference and its submission status; the current adapter does not implement delivery-status callbacks or guarantee delivery. For proactive WhatsApp updates, set `TWILIO_WHATSAPP_CONTENT_SID` to an approved template with variable `1` for the recipient’s name and `2` for the update message. The server then sends `ContentSid`/`ContentVariables` without a free-text `Body`. Template approval and sender registration remain provider-side setup.

Credentials remain blank until supplied. Missing provider configuration returns an actionable setup response; it does not pretend to send messages.

## GPS

Attendance uses browser/device geolocation; no Google Maps API key is required for the implemented coordinate collection. A worker explicitly starts arrival/departure collection. The browser gathers at least three recent, stable readings. The API validates coordinate ranges, accuracy (within 100 m), sample count and freshness (within 60 seconds, with limited future-clock tolerance) against the approved household location. The current geofence calculation includes the reading’s reported accuracy; attendance needing review is flagged according to the Wellness requirements.

Browser location requires permission and a secure context. `localhost` is suitable for local browser development; a remote phone visiting a plain HTTP LAN address may not receive location access. Use HTTPS for phone/device checks. The web server must allow same-origin geolocation in its `Permissions-Policy`; continuous background tracking is not enabled.

## Activation and verification

After editing configuration, recreate the API service so it receives the new values:

```sh
docker compose up -d --build api
```

Before connecting real customer payments or external recipients, verify provider test mode, sender identity, callback reachability and recipient ownership. Confirm a payment from the server's verified transaction result, not from a return URL, screenshot or client-supplied status.

Provider flags in `GET /api/public-settings` and the authenticated workspace indicate configured credentials, not a live provider health check. Local startup, migration, seed and backup instructions are in [README](../README.md).

## Provider references

The adapters follow [Flutterwave v3 webhook verification](https://developer.flutterwave.com/v3.0.0/docs/webhooks), [transaction verification](https://developer.flutterwave.com/v3.0.0/docs/transaction-verification), and the [Twilio Message resource](https://www.twilio.com/docs/messaging/api/message-resource). Without `TWILIO_WHATSAPP_CONTENT_SID`, WhatsApp uses free text during an active customer-service conversation. Outside that window, configure an approved template with the variable mapping above. See [Twilio template sending](https://www.twilio.com/docs/content/send-templates-created-with-the-content-template-builder). Configure and validate the selected sender before enabling WhatsApp for staff.
