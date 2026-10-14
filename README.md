# Tangy's Profile

A completely web-based PHP rewrite of Tangy's profile/link-in-bio application. The visual structure, monochrome styling, public sections, contact flow, redirects, and admin workflow are preserved without React, TypeScript, Firebase, or a Node runtime.

## Requirements

- PHP 8.1+
- PDO SQLite extension
- Sessions enabled
- Writable `data/` and `files/` directories

## Run locally

```bash
php -S 0.0.0.0:8080 index.php
```

Open `http://localhost:8080`. On the first run, visit `/admin/setup` and create an administrator account. There are no hard-coded default credentials.

## Deployment

Point the web server document root at this directory and configure all unknown routes to `index.php` (the included `.htaccess` handles Apache). For Nginx, use a `try_files` fallback to `/index.php?$query_string`.

The SQLite database is created at `data/profile.sqlite`. Keep `data/` and `files/` writable by PHP and protect the database from direct web access.

## Main routes

- `/` — public profile
- `/admin/setup` — one-time administrator setup
- `/admin/login` — administrator login
- `/admin` — settings and inbox management
- `/api/settings`, `/api/messages`, `/api/auth/*` — JSON endpoints

## Security improvements in this rewrite

- Single PHP session-based authentication system
- Passwords stored with `password_hash()`; no default admin/admin credentials
- CSRF protection for state-changing authenticated requests
- Prepared SQLite statements
- Safe output escaping and server-side contact validation
- Firebase, JWT, Node, and client-only admin authentication removed
