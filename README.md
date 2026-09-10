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

Generate the shared value with `openssl rand -hex 32`. On Railway, use the app
backend's private service hostname for `AXONLINK_APP_API_URL`. The browser must
never receive this secret or call the internal app endpoints directly.
