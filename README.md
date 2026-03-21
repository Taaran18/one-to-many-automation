# 📢 One-to-Many WhatsApp Automation

A full-stack platform to scale customer outreach via **WhatsApp bulk messaging**. Compose message templates, organise leads into groups, run campaigns, and track delivery — all from a single dashboard.

---

## 🏗️ Architecture

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
```

The system consists of **three independent services** that must all be running together:

| Service           | Tech                                   | Port | Purpose                                        |
| ----------------- | -------------------------------------- | ---- | ---------------------------------------------- |
| `frontend`        | Next.js 16 + TypeScript + Tailwind CSS | 3000 | Web UI / dashboard                             |
| `backend`         | Python 3 / FastAPI + SQLAlchemy        | 8000 | REST API, business logic, DB                   |
| `whatsapp-bridge` | Node.js / Express + whatsapp-web.js    | 3001 | WhatsApp session management & message delivery |

---

## ✨ Features

- **Lead Management** — Add, tag, and organise contacts into lead groups
- **Message Templates** — Create reusable message templates with dynamic content
- **Campaign Engine** — Schedule and run bulk WhatsApp campaigns to any lead group
- **WhatsApp Bridge** — Per-user WhatsApp sessions via QR-code scanning (no API fees)
- **Message Logs** — Track sent / delivered / failed status per recipient
- **Dashboard** — At-a-glance campaign and delivery stats via charts
- **Auth System** — JWT-based auth with email or phone number login
- **Social OAuth** — Optional Google / Apple / Microsoft SSO (configurable)
- **Live Password Strength Indicator** — Real-time password feedback on sign-up
- **Responsive UI** — Optimised for both mobile and desktop

---

## 🛠️ Technology Stack

### Frontend

|           |                         |
| --------- | ----------------------- |
| Framework | Next.js 16 (App Router) |
| Language  | TypeScript              |
| Styling   | Tailwind CSS v4         |
| Charts    | Recharts                |
| Theming   | next-themes             |

### Backend

|            |                           |
| ---------- | ------------------------- |
| Framework  | FastAPI 0.115             |
| ORM        | SQLAlchemy                |
| Database   | MySQL (via PyMySQL)       |
| Auth       | JWT (PyJWT) + OAuth2      |
| Encryption | Fernet AES (cryptography) |
| Social SSO | fastapi-sso               |

### WhatsApp Bridge

|                 |                                |
| --------------- | ------------------------------ |
| Runtime         | Node.js                        |
| Server          | Express 4                      |
| WhatsApp client | whatsapp-web.js 1.26           |
| Session storage | Local filesystem (`sessions/`) |
| QR generation   | qrcode                         |

---

## 📦 Local Setup

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- MySQL server (local or remote)
- Google Chrome / Chromium (used by Puppeteer in the WhatsApp bridge)

---

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

> **Required env variables** — see [Environment Variables](#-environment-variables) below.

Start the backend:

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:3000`.

---

### 3. WhatsApp Bridge (whatsapp-web.js)

```bash
cd whatsapp-bridge
npm install
npm start
```

The bridge runs at `http://localhost:3001`. On first use, each user must scan a QR code via the dashboard to link their WhatsApp account.

---

## 🔐 Environment Variables

All secrets live in `backend/.env`. Copy `backend/.env.example` to get started.

```env
# ── Database ──────────────────────────────────
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=onetomany_db

# ── Security ──────────────────────────────────
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your_secret_key_here

# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your_fernet_key_here

# ── OAuth (optional) ──────────────────────────
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# APPLE_CLIENT_ID=
# APPLE_CLIENT_SECRET=
# MICROSOFT_CLIENT_ID=
# MICROSOFT_CLIENT_SECRET=
```

---

## 🔌 API Overview

The FastAPI backend exposes the following route groups:

| Router      | Prefix                | Description                            |
| ----------- | --------------------- | -------------------------------------- |
| Auth        | `/register`, `/login` | Register & login with email or phone   |
| Leads       | `/leads`              | CRUD for contacts                      |
| Lead Groups | `/lead-groups`        | Organise leads into groups             |
| Templates   | `/templates`          | Message template management            |
| Campaigns   | `/campaigns`          | Create & trigger campaigns             |
| Dashboard   | `/dashboard`          | Aggregated stats                       |
| WhatsApp    | `/whatsapp`           | Session create / status / QR / destroy |

Full interactive docs: `http://localhost:8000/docs`

### WhatsApp Bridge Endpoints

| Method | Path               | Description                                                      |
| ------ | ------------------ | ---------------------------------------------------------------- |
| `POST` | `/session/create`  | Start a new WhatsApp session                                     |
| `GET`  | `/session/status`  | Get session status (`connected` / `qr_pending` / `disconnected`) |
| `GET`  | `/session/qr`      | Get base64 QR code for scanning                                  |
| `POST` | `/session/destroy` | Log out and destroy session                                      |
| `POST` | `/message/send`    | Send a WhatsApp message                                          |
| `GET`  | `/health`          | Health check                                                     |

---

## 🔒 Enabling Social OAuth

To activate Google, Microsoft, or Apple login:

1. Register the app in the respective developer console (Google Cloud Platform / Azure / Apple Developer).
2. Generate a `CLIENT_ID` and `CLIENT_SECRET`.
3. Add them to `backend/.env`.
4. The `/auth/{provider}/login` and `/auth/{provider}/callback` endpoints are already wired — add the processing logic inside `backend/main.py`.

---

## 📁 Project Structure

```
one-to-many-automation/
├── backend/                  # FastAPI REST API
│   ├── main.py               # App entry point & auth routes
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── auth.py               # JWT & password hashing
│   ├── database.py           # DB engine & session factory
│   ├── dependencies.py       # FastAPI dependencies (current user, etc.)
│   ├── routers/              # Feature routers
│   │   ├── leads.py
│   │   ├── templates.py
│   │   ├── campaigns.py
│   │   ├── dashboard.py
│   │   └── whatsapp.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # Next.js web dashboard
│   ├── app/                  # App Router pages & layouts
│   ├── components/           # Reusable React components
│   ├── lib/                  # API client helpers
│   ├── middleware.ts          # Auth middleware
│   └── package.json
├── whatsapp-bridge/          # WhatsApp session bridge
│   ├── index.js              # Express server & session management
│   └── package.json
└── .gitignore
```

---

## 📄 License

MIT
