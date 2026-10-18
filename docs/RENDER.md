# Deploying on Render (demo / preview)

1. Push this project to a GitHub repo.
2. Render dashboard → **New → Blueprint** → choose the repo. Render reads `render.yaml`.
3. When prompted, fill in `APP_URL` (e.g. `https://qatarhire.onrender.com`) and `ADMIN_PASSWORD` (min 10 chars).
4. Deploy. On every start the container (`deploy/docker-entrypoint.sh`) runs migrations, seeds reference data,
   seeds the fictional demo data when `SEED_DEMO=true`, creates the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, then starts the server.

- SQLite + uploads are stored on the 1 GB disk at `/var/data` (needs a paid instance). For a free throw-away demo,
  set `plan: free` and remove the `disk:` block; data resets on each deploy.
- Emails use `MAIL_MAILER=log` (written to `storage/mail-previews`, not sent). Set `MAIL_MAILER=smtp` + `SMTP_*` for real email.
- For production, use MySQL (`DB_CONNECTION=mysql`, `DB_*`), `SEED_DEMO=false`, and see `DEPLOYMENT.md`.

Docker anywhere else:

```bash
docker build -t qatarhire .
docker run -d -p 3333:3333 -e APP_KEY=$(openssl rand -hex 16) -e APP_URL=https://your.domain \
  -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD='change-me-please' -v qh-data:/var/data qatarhire
```
