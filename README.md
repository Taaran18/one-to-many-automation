# One to Many WhatsApp Automation

A premium, highly-responsive web application designed to scale customer outreach through intelligent WhatsApp automation. It features a modern, ultra-secure authentication system built for speed and seamless user experience.

## 🚀 Key Features

* **Advanced Authentication**: Start automating instantly with fluid Sign-In/Sign-Up flows.
* **Dual-Identifier Login**: Support for logging in securely via Email or International Mobile Number.
* **Intelligent Phone Validation**: Built-in 10-digit/variable-digit validation across 15+ major country codes with native flag emojis.
* **Real OAuth Integrations**: Pre-configured Social Login buttons for Google, Apple, and Microsoft (powered by `fastapi-sso`).
* **Military-Grade Security**: Passwords are no longer hashed one-way; the system utilizes high-grade, two-way AES Database encryption via the `cryptography` library for superior data handling.
* **Live Password Strength Indicator**: Real-time visual validation on password creation (checking constraints dynamically).
* **Fully Responsive UI/UX**: Automatically transforms from a sleek mobile-focused card into a premium, wide-view desktop layout featuring custom SaaS branding elements ("Nano Banana").

## 🛠️ Technology Stack

**Frontend (Client)**

* Next.js (App Router)
* React
* Tailwind CSS (Vanilla CSS styling + utility classes)
* TypeScript

**Backend (Server)**

* Python 3 / FastAPI
* SQLAlchemy ORM
* PyMySQL
* Cryptography (AES-Fernet object encryption)
* PyJWT (Session state)
* FastAPI SSO (Social OAuth logic)

## 📦 Local Setup Instructions

### 1. Setting up the Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

*Note: Make sure to copy `.env.example` to `.env` and fill in your MySQL database credentials and OAuth API keys. To scaffold the MySQL table structure, use the provided models.*

Run the backend server:

```bash
uvicorn main:app --reload
```

### 2. Setting up the Frontend

```bash
cd frontend
npm install
```

Run the frontend server:

```bash
npm run dev
```

The application will be running at `http://localhost:3000`.

## 🔒 Enabling Social OAuth

To activate the Google, Microsoft, and Apple login buttons, you must:

1. Register the application in the respective Developer Consoles (Google Cloud Platform, Apple Developer, Azure).
2. Generate the `CLIENT_ID` and `CLIENT_SECRET`.
3. Paste these keys into the backend `.env` file.
4. Uncomment the OAuth processing boilerplate located at the bottom of `backend/main.py`.
