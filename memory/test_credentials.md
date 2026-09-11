# Test Credentials

## Admin Accounts
- Email admin: admin@studylocus.com / admin123  (role: admin)
- Username admin (shortcut): **deep** / **deep8670**  (role: admin) — logs in from the same portal via the "Email or username" field

## Normal users
- Self-register from the Sign Up link (email + password, min 6 chars)

## Notes
- All users + login/register events are mirrored locally to backend/data/users.json and backend/data/login_activity.json (hashed passwords only).
- Admin-only endpoints: POST /api/admin/export-github, GET /api/admin/export-log
- Auth endpoints: /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me
