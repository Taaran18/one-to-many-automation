# OneToMany — WhatsApp Automation Platform

A full-stack platform to scale customer outreach via **WhatsApp bulk messaging**. Compose message templates, organise leads into groups, run campaigns, and track delivery — all from a single dashboard.

---

## Architecture

```
┌────────────────────┐      REST/JSON      ┌──────────────────────┐
│   Next.js Frontend │ ◄──────────────────► │  FastAPI Backend     │
│   localhost:3000   │                      │  localhost:8000      │
└────────────────────┘                      └──────────┬───────────┘
                                                       │ REST/JSON
                                            ┌──────────▼───────────┐
                                            │  WhatsApp Bridge     │
                                            │  (whatsapp-web.js)   │
                                            │  localhost:3001      │
                                            └──────────────────────┘
                                                       │
                                            ┌──────────▼───────────┐
                                            │  Supabase (PostgreSQL│
                                            │  cloud database)     │
                                            └──────────────────────┘
```

| Service           | Tech                                   | Port | Purpose                                        |
| ----------------- | -------------------------------------- | ---- | ---------------------------------------------- |
| `frontend`        | Next.js 16 + TypeScript + Tailwind CSS | 3000 | Web UI / dashboard                             |
| `backend`         | Python 3 / FastAPI + SQLAlchemy        | 8000 | REST API, business logic, DB                   |
| `whatsapp-bridge` | Node.js / Express + whatsapp-web.js    | 3001 | WhatsApp session management & message delivery |

---

## Features

- **Lead Management** — Add, tag, import/export contacts into lead groups
- **Message Templates** — Create QR templates with variable placeholders or submit Meta-approved templates
- **Campaign Engine** — Schedule one-time, daily, weekly (day picker) or monthly (day-of-month) campaigns to multiple lead groups
- **Tag System** — Tag campaigns and templates for organisation; full tag management modal
- **WhatsApp Dual Mode** — Connect via QR code (no API fees) or Meta Cloud API (official Business API)
- **Meta Template Builder** — Submit templates to Meta for approval with header (text/image), body, footer, and button components
- **Image Uploads** — Drag-and-drop image upload for template headers, served as static files
- **Message Logs** — Track sent / delivered / failed status per recipient per run
- **Dashboard** — At-a-glance campaign and delivery stats via charts
- **Auth System** — JWT-based auth with email or phone number login
- **Responsive UI** — Optimised for both desktop and mobile

---

## Technology Stack

### Frontend

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Theming | next-themes (dark/light mode) |

### Backend

| | |
|---|---|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy |
| Database | PostgreSQL via Supabase |
| Driver | psycopg2-binary |
| Auth | JWT (PyJWT) + OAuth2 |
| Encryption | Fernet AES (cryptography) |

### WhatsApp Bridge

| | |
|---|---|
| Runtime | Node.js |
| Server | Express 4 |
| WhatsApp client | whatsapp-web.js |
| Session storage | Local filesystem (`sessions/`) |

---

## Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- A [Supabase](https://supabase.com) account (free tier works)
- Google Chrome / Chromium (used by Puppeteer in the WhatsApp bridge)

---

## Setup

### 1. Clone and configure environment

```bash
git clone https://github.com/Taaran18/one-to-many-automation.git
cd one-to-many-automation
```

Copy the example env and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` — at minimum set:
- `DATABASE_URL` — your Supabase PostgreSQL connection string
- `SECRET_KEY` — random hex string
- `ENCRYPTION_KEY` — Fernet key

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Tables are created automatically on first run. API available at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

UI available at `http://localhost:3000`.

### 4. WhatsApp Bridge

```bash
cd whatsapp-bridge
npm install
npm start
```

Bridge runs at `http://localhost:3001`. On first use each user scans a QR code via the dashboard.

---

## Environment Variables

All secrets live in `backend/.env`. See `backend/.env.example` for the full template.

```env
# Supabase PostgreSQL connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# JWT signing secret — generate with:
# python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your_secret_key_here

# Fernet encryption key (for Meta access tokens) — generate with:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your_fernet_key_here
```

### Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → General** and note your **Reference ID**
3. Your connection string is:
   ```
   postgresql://postgres:[DB-PASSWORD]@db.[REFERENCE-ID].supabase.co:5432/postgres
   ```
   > If your password has spaces or special characters, URL-encode them (space → `%20`)
4. Paste it as `DATABASE_URL` in `backend/.env`
5. Run the backend once — SQLAlchemy will create all tables automatically

---

## API Overview

| Router      | Prefix                | Description                            |
| ----------- | --------------------- | -------------------------------------- |
| Auth        | `/register`, `/login` | Register & login with email or phone   |
| Leads       | `/leads`              | CRUD for contacts + group management   |
| Templates   | `/templates`          | QR and Meta template management        |
| Campaigns   | `/campaigns`          | Create, schedule, start, tag campaigns |
| Dashboard   | `/dashboard`          | Aggregated stats and charts            |
| WhatsApp    | `/whatsapp`           | QR session / Meta API connection       |

Full interactive docs: `http://localhost:8000/docs`

---

## Project Structure

```
one-to-many-automation/
├── backend/                  # FastAPI REST API
│   ├── main.py               # App entry point, auth routes, image upload
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── auth.py               # JWT & password hashing
│   ├── database.py           # DB engine & session factory
│   ├── dependencies.py       # FastAPI dependencies
│   ├── routers/
│   │   ├── leads.py          # Leads & lead groups
│   │   ├── templates.py      # QR + Meta template management
│   │   ├── campaigns.py      # Campaign CRUD, start, rerun, duplicate
│   │   ├── dashboard.py      # Stats & charts
│   │   └── whatsapp.py       # WA session & Meta API connection
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # Next.js dashboard
│   ├── app/                  # App Router pages
│   ├── components/           # Reusable UI components
│   ├── lib/                  # API client, types
│   └── package.json
├── whatsapp-bridge/          # WhatsApp session bridge
│   ├── index.js
│   └── package.json
└── .gitignore
```

---

## License

MIT
