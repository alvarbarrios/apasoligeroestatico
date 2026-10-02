# Auth testing — A Paso Ligero (single owner)

Configure the admin account via environment variables `ADMIN_EMAIL` and `ADMIN_PASSWORD` before running auth flows; do not commit real credentials.

1. MongoDB: `db.users.findOne({role:"admin"},{password_hash:1})` → hash starts with `$2b$`; indexes: users.email unique, login_attempts.identifier.
2. API:
   - `curl -X POST $API/api/auth/login -H 'Content-Type: application/json' -d '{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD"}'` → 200 `{access_token,...}`
   - `curl $API/api/auth/me -H "Authorization: Bearer <token>"` → admin user
   - wrong password → 401; 5 wrong in a row → 429 for 15 min
   - `/api/admin/guestbook` without token → 401
3. Frontend: /admin shows login form (admin-login-form); after login shows moderation table; token in localStorage `apl_token`; logout clears.
