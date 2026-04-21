# Auth Testing Playbook — Rintaki App

Rintaki supports TWO auth flows on the same MongoDB `users` collection:

1. **Email/Password (JWT)** — `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/refresh`
2. **Emergent Google OAuth (session_token)** — `/api/auth/google/session` (exchanges `session_id` for `session_token` cookie)

Both set httpOnly cookies:
- `access_token` (JWT, 15m) + `refresh_token` (7d) for JWT flow
- `session_token` (7d) for Google flow

`get_current_user` checks `session_token` cookie first, then `access_token`, then `Authorization: Bearer` header.

## MongoDB Verification

```
mongosh
use rintaki_db
db.users.find({role: "admin"}).pretty()
db.users.createIndex({email: 1}, {unique: true})
```

Check: `user_id` field is a string UUID (not _id), bcrypt hash starts with `$2b$`.

## Curl Tests

Register:
```
curl -c cookies.txt -X POST $URL/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"user1@test.com","password":"Pass1234","name":"User One"}'
```

Login (admin):
```
curl -c cookies.txt -X POST $URL/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@rintaki.org","password":"Admin@Rintaki2026"}'
```

Me:
```
curl -b cookies.txt $URL/api/auth/me
```

Google session (simulated — needs real session_id from Emergent Auth):
```
curl -c cookies.txt -X POST $URL/api/auth/google/session -H 'X-Session-ID: <session_id>'
```

## Browser Testing

For Google auth, the frontend redirects to:
```
https://auth.emergentagent.com/?redirect=<window.location.origin>/auth/callback
```

After Google auth the user lands at `/auth/callback#session_id=XXX`. The frontend extracts that fragment, POSTs to `/api/auth/google/session` with `X-Session-ID` header, which sets the `session_token` cookie.

## Seed Credentials

- Admin: `admin@rintaki.org` / `Admin@Rintaki2026`
- Test user (JWT): create via register endpoint or seed `user1@test.com` / `Pass1234`

## Success criteria

- `/api/auth/me` returns user after either login method.
- Protected endpoints (forums POST, messages, admin newsletter creation) return 401 without auth and 200 with cookie.
- Admin-only endpoints return 403 for non-admin users.
