# Axonlink Admin Backend

Separate Express/Prisma/PostgreSQL API for Axonlink administrator authentication.

## Included endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Accept an invitation or bootstrap the first super admin |
| POST | `/api/auth/login` | Log in and receive an access token plus refresh cookie |
| POST | `/api/auth/refresh` | Rotate the refresh session and issue a new access token |
| POST | `/api/auth/logout` | Revoke the current refresh session |
| POST | `/api/auth/forgot-password` | Send a generic password-reset response and email a code |
| POST | `/api/auth/verify-reset-code` | Verify the six-digit code and issue a short reset token |
| POST | `/api/auth/reset-password` | Set a new password and revoke existing sessions |
| GET | `/api/auth/me` | Return the authenticated administrator |
| POST | `/api/auth/invitations` | Create an invitation; super-admin only |

## Local setup

1. Copy `.env.example` to `.env` and change every secret.
2. Create a PostgreSQL database named `axonlink_admin` or update `DATABASE_URL`.
3. Install dependencies: `npm install`.
4. Create the schema: `npx prisma migrate dev --name init`.
5. Start the API: `npm run dev`.

The default local URL is `http://localhost:5040`. The frontend runs on `http://localhost:5173`.

## First administrator

Only the first account can use `ADMIN_BOOTSTRAP_SECRET`. Send it in the `X-Admin-Bootstrap-Secret` header when calling `/api/auth/signup`. Remove this environment value after the first super admin exists. Every later account must use an invitation token created by a super admin.

## Frontend request flow

- Store the short-lived access token in application memory.
- Send `credentials: "include"` so the browser accepts the HTTP-only refresh cookie.
- On a `401`, call `/api/auth/refresh`, update the access token, and retry once.
- Never store the refresh token in local storage.

Password recovery is a three-step flow: forgot password, verify reset code, then reset password. In development, when SMTP is not configured, the six-digit code is written to the backend terminal.

## Railway connection

On the backend service, use Railway's private Postgres variable reference:

```env
DATABASE_URL=${{AxonlinkAdmin.DATABASE_URL}}
CORS_ALLOWED_ORIGINS=https://your-admin-frontend.example
```

Replace `AxonlinkAdmin` with the exact name of the PostgreSQL service. On the
frontend service, set `VITE_ADMIN_API_URL` to the backend's generated public
HTTPS domain. Do not put a database URL or any token secret in the frontend.

## Axonlink app backend connection

Patient, clinician, appointment, referral, and access-grant data remains owned
by `axonlinkappbackend`. Configure the admin service with:

```env
AXONLINK_APP_API_URL=http://your-app-backend:5030
AXONLINK_SERVICE_SECRET=the-same-random-secret-used-by-the-app-backend
```

Configure `axonlinkappbackend` with:

```env
ADMIN_SERVICE_SECRET=the-same-random-secret-used-by-the-admin-backend
```

Generate the shared value with `openssl rand -hex 32`. When both services share private network connectivity, use the app
backend's private service hostname for `AXONLINK_APP_API_URL`; otherwise use its
public HTTPS origin. The browser must
never receive this secret or call the internal app endpoints directly.

## Production deployment on Railway

Use a dedicated PostgreSQL database for this admin service. Do not point its
Prisma migrations at the app backend database. The two services exchange data
through the authenticated app API.

Railway service settings (repository root contains `package.json`):

- Branch: `main`; root directory: leave empty.
- Build command: automatic dependency installation; no compilation needed.
- Start command: `npm run start:production`.
- Pre-deploy command: leave empty with this start command (it runs migrations).
- Healthcheck: `/api/health`.
- Runtime: Node 22, selected by `package.json`.
- Let Railway provide `PORT`; generate a public HTTPS domain after deployment.

`start:production` checks configuration, applies committed Prisma migrations,
then starts the API. It exits on a configuration or migration failure. Never
use `prisma migrate dev` or `prisma migrate reset` against production.

Set these variables on the **admin backend** service:

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}`, using the admin database service's exact name |
| `ACCESS_TOKEN_SECRET` | A unique random secret |
| `REFRESH_TOKEN_SECRET` | Another unique random secret |
| `RESET_TOKEN_SECRET` | Another unique random secret |
| `ADMIN_BOOTSTRAP_SECRET` | A separate random secret for first-admin creation; remove afterward |
| `ADMIN_FRONTEND_URL` | Actual admin frontend HTTPS origin, without a trailing slash |
| `CORS_ALLOWED_ORIGINS` | Exact admin frontend origins, comma-separated, without trailing slashes |
| `AXONLINK_APP_API_URL` | `https://axonlinkappbackend-production-ac34.up.railway.app` (no `/api` suffix) |
| `AXONLINK_SERVICE_SECRET` | Exactly the app backend's production `ADMIN_SERVICE_SECRET` |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | Production sending key from Resend |
| `EMAIL_FROM` | Sender on your verified Resend domain, optionally `AxonLink Admin <address@your-domain>` |

Generate each new secret separately with `openssl rand -hex 32`. Keep secrets
out of Git and the Vercel frontend. For separate Railway projects, use the app
backend's public HTTPS URL above; a private hostname only works where private
network connectivity is available.

Resend uses HTTPS and does not require SMTP variables. Existing SMTP deployments
remain supported with `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. A Resend webhook
secret is not used by this admin service.

Set `VITE_ADMIN_API_URL` in the admin Vercel project to the **admin backend's**
public HTTPS origin and redeploy that frontend. Prefer a custom API hostname
under the same domain as the admin website so browser third-party-cookie
restrictions do not interfere with its refresh-cookie flow.

### Verification before opening production access

1. Run `npm ci`, `npm test`, `npx prisma validate`, and `npx prisma generate`.
2. With production variables configured, run `npm run env:check` (reports names,
   never secret values).
3. Deploy and confirm successful migrations and `/api/health` returning 200.
   The health endpoint checks process availability, not database connectivity.
4. Bootstrap the first super admin as described above, then remove
   `ADMIN_BOOTSTRAP_SECRET` and redeploy. Invitations remain the signup path.
5. Verify login, page reload/session refresh, logout, password-reset email,
   invitation email, and a live patient/clinician list from the app backend.

Local unit tests do not establish successful Railway deployment, database
migration, browser cookie behavior, or actual email delivery.
