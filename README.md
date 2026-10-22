# Multi-Factor Authentication (React + Express + Passport + MongoDB)

A full-stack auth starter with email/password sign-in (Passport local strategy), TOTP two-factor authentication (speakeasy), QR-code enrollment, one-time backup codes and server-side session management stored in MongoDB.

```
multi-factor-authentication/
├── client/   React 18 + Vite + React Router (UI)
└── server/   Node.js + Express + Passport + Mongoose (API)
```

## Quick start

Requirements: Node 18+ and MongoDB (local install, Atlas, or `docker compose up -d mongo`).

```bash
# 1. Install everything
npm run install:all

# 2. Configure the API
cp server/.env.example server/.env
npm --prefix server run gen:keys      # paste SESSION_SECRET + TOTP_ENCRYPTION_KEY into server/.env

# 3. Start MongoDB (if you don't already have one running)
npm run mongo:up

# 4. Run API (http://localhost:5050 — or whatever PORT is in server/.env) + web (http://localhost:5173)
#    The React dev proxy reads PORT from server/.env automatically.
npm run dev
```

Open http://localhost:5173, create an account, and you'll be taken straight to the 2FA setup wizard.

Run the end-to-end API smoke test (28 checks — full login/2FA/session flow) while the API is running:

```bash
npm run test:e2e
```

## Features

**Authentication**
- Register / sign in with email + password via **Passport `LocalStrategy`**, bcrypt (12 rounds)
- Two-step login: password → short-lived *pending-MFA* state (5 min) → TOTP or backup code → full session
- Generic error messages + constant-time dummy hash so emails can't be enumerated
- **Account lockout** after 5 wrong passwords (15 min), per-IP **rate limiting** on login and OTP endpoints
- Max 5 wrong codes per pending sign-in before the user must start over

**Two-factor (TOTP)**
- Enrollment wizard: get an app → **scan QR code** (or type the key) → confirm a code → save backup codes
- Secrets generated with **speakeasy**, encrypted at rest with **AES-256-GCM**
- ±1 time-step window for clock drift and **replay protection** (the same code can't be used twice)
- 10 **one-time backup codes** (SHA-256 hashed), copy / download / print, regenerate with a fresh TOTP code
- Disabling 2FA requires password **and** a current code
- Enabling 2FA signs out every other session that was only password-verified

**Sessions**
- `express-session` + `connect-mongo` — sessions live in MongoDB, cookie is `httpOnly`, `sameSite=lax`, `secure` in production
- Session ID regenerated on login (no session fixation), sliding idle timeout (60 min), optional **"Keep me signed in"** (14 days), hard 30-day cap
- **Devices & sessions** page: browser / OS / IP / last activity for every session, sign out one or all others
- Changing your password signs out all other devices; sessions created before a password change are rejected
- Client-side inactivity warning with a "Stay signed in" option

**Hardening**
- CSRF synchronizer token (`X-CSRF-Token`) + Origin check on every state-changing request
- `helmet`, strict CORS, 10 kB JSON body limit, `Cache-Control: no-store` on API responses
- zod request validation, central error handler with machine-readable error codes
- 90-day **security activity log** (sign-ins, failures, lockouts, 2FA changes, revoked sessions…)
- Delete account (password + 2FA code)

## API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/auth/session` | – | Bootstrap: auth state, user, pending-MFA, CSRF token |
| GET | `/api/auth/csrf` | – | Get a CSRF token |
| POST | `/api/auth/register` | guest | `{ name, email, password }` |
| POST | `/api/auth/login` | – | `{ email, password, remember }` → `{ mfaRequired }` |
| POST | `/api/auth/2fa/verify` | pending | `{ code }` — 6-digit TOTP or backup code |
| POST | `/api/auth/2fa/cancel` | pending | Abandon the 2FA step |
| GET | `/api/auth/me` | ✔ | Current user + session info |
| POST | `/api/auth/logout` | ✔ | Destroy session |
| GET | `/api/2fa/status` | ✔ | Enabled? backup codes remaining |
| POST | `/api/2fa/setup` | ✔ | New secret → QR code data-URL + manual key |
| POST | `/api/2fa/enable` | ✔ | `{ code }` → backup codes |
| POST | `/api/2fa/disable` | ✔ | `{ password, code }` |
| POST | `/api/2fa/backup-codes` | ✔ | `{ code }` → new backup codes |
| GET | `/api/sessions` | ✔ | Active sessions |
| DELETE | `/api/sessions/:id` | ✔ | Sign out one device |
| DELETE | `/api/sessions` | ✔ | Sign out all other devices |
| GET | `/api/account/activity` | ✔ | Security log (`?limit&before`) |
| PATCH | `/api/account/profile` | ✔ | `{ name }` |
| POST | `/api/account/password` | ✔ | `{ currentPassword, newPassword }` |
| DELETE | `/api/account` | ✔ | `{ password, code? }` |

All mutating requests need the `X-CSRF-Token` header (the client handles this automatically).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Sign-up/sign-in says *"Can't reach the API at …"* | Start the API (`npm run dev:server`) and check MongoDB is running. The proxy target is printed when Vite starts. |
| API exits with *"Port … is already in use"* | Change `PORT` in `server/.env` (on macOS, 5000 is taken by AirPlay Receiver). Restart **both** API and web so the proxy picks it up. |
| *"Request origin … is not allowed"* | Add the URL you open the app on to `CLIENT_ORIGIN` (comma-separated). |
| API exits with *"Could not connect to MongoDB"* | `brew services start mongodb-community` or `npm run mongo:up`, and check `MONGO_URI`. |

## Production notes

- Set `NODE_ENV=production`, a real `CLIENT_ORIGIN`, and serve over HTTPS (secure cookies). `trust proxy` is enabled in production for nginx / load balancers.
- Serve `client/dist` from the same domain as the API (or a reverse proxy routing `/api` to Express) so the session cookie stays first-party.
- Keep `TOTP_ENCRYPTION_KEY` stable — rotating it makes existing 2FA secrets unreadable.
- `express-rate-limit` uses in-memory counters; use a Redis store when running multiple API instances.
