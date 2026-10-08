# Smart Event Management System

A full-stack, production-oriented event management platform for colleges — event discovery, QR-code
registrations, faculty-managed certificates, notifications, and analytics — built with **FastAPI + Firebase Firestore**
on the backend and **React (Vite)** on the frontend.

---

## 1. Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18 (Vite), React Router DOM, Axios, Context API, Framer Motion, React Icons, Chart.js |
| Backend    | Python, FastAPI, Firebase Admin SDK, Google Cloud Firestore, Pydantic, JWT, Bcrypt, SMTP |
| Database   | Firebase Firestore (NoSQL Document Store) |

---

## 2. Project Structure

```
smart-event-management/
├── backend/
│   ├── app/
│   │   ├── core/                  # config, firebase, security, email, file & PDF/QR utils
│   │   ├── models/                # Domain models (User, Event, Registration, Certificate, ...)
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   ├── db/                    # firestore_service (reusable Firestore queries & transactions)
│   │   ├── api/routes/            # auth, users, events, registrations, certificates, notifications, analytics
│   │   ├── dependencies.py        # get_current_user / require_role guards
│   │   └── main.py                # FastAPI app entrypoint
│   ├── uploads/                   # profile_pictures / event_posters / certificates / qrcodes
│   ├── migrate_mysql_to_firestore.py  # optional data migration tool
│   ├── requirements.txt
│   └── .env.example
├── database/
│   └── firebase_schema.md         # Firestore collections and document schema reference
├── firestore.rules                # Firestore security rules
├── frontend/
│   ├── src/
│   │   ├── api/                   # axios instance + service layer matching the backend contract
│   │   ├── components/            # layout, landing, dashboard, charts, ui, common
│   │   ├── context/               # AuthContext, ThemeContext
│   │   ├── pages/                 # landing, auth, student, faculty, shared
│   │   └── styles/global.css      # design system (glassmorphism, dark/light theme, utility classes)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 3. Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- A **Firebase Project** with **Firestore** enabled (or the local Firebase Firestore Emulator)
- An SMTP account (Gmail App Password, SendGrid, Mailgun, or Amazon SES) for real email delivery

---

## 4. Firebase Setup

### Option A: Firebase Service Account JSON (Recommended)
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a project and enable **Cloud Firestore** in Native mode.
3. Navigate to **Project Settings** -> **Service accounts**.
4. Click **Generate new private key** to download your JSON file.
5. Save this file inside `backend/` (e.g. `backend/firebase_credentials.json`).
6. Set `FIREBASE_CREDENTIALS_PATH=./firebase_credentials.json` in `backend/.env`.

### Option B: Environment Variables
Alternatively, set the individual variables in `backend/.env`:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Option C: Local Firestore Emulator (Offline / Local Dev)
If using the Firebase CLI emulator:
```
FIRESTORE_EMULATOR_HOST=localhost:8080
```

### Deploying Security Rules
Deploy `firestore.rules` with the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env with your Firebase configuration and SMTP credentials
```

### Run the backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API root: http://localhost:8000
- Interactive docs (Swagger UI): http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

---

## 6. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

- App runs at http://localhost:5173
- The Vite dev server proxies `/api` and `/uploads` to `http://localhost:8000`.

### Build for production

```bash
npm run build
npm run preview
```

---

## 7. Migrating Existing MySQL Data (Optional)

If you have legacy data in a MySQL database, use the migration utility:

```bash
cd backend
python migrate_mysql_to_firestore.py --mysql-url="mysql+pymysql://root:password@localhost:3306/smart_event_management"
```

---

## 8. Security & Business Logic Notes

- **Password Security**: Passwords are hashed with **bcrypt** (via passlib) before storing in Firestore.
- **JWT Authentication**: Uses access and refresh tokens.
- **Role-Based Access Control**: `student`, `faculty`, and `admin` roles are strictly enforced at the FastAPI dependency layer.
- **Atomic Operations**: Event registrations and seat counters use Firestore atomic transactions to prevent overbooking and race conditions.
- **Certificates**: Access-controlled by student `registration_number`.


---

## 9. Demo / Test Users

The backend contains idempotent demo accounts for testing all four roles. They are created only when `SEED_TEST_USERS=true`.

| Role | Email | Password |
|---|---|---|
| Student | student@test.com | Student@123 |
| Faculty | faculty@test.com | Faculty@123 |
| Volunteer | volunteer@test.com | Volunteer@123 |
| Admin | admin@test.com | Admin@123 |

These are demo credentials only. Change or remove them before exposing a production system to real users.

For Render, `render.yaml` enables `SEED_TEST_USERS=true` so the demo accounts are available after deployment.

## 10. Production Deployment Notes

### Frontend (Vercel or Render Static Site)
Set:

```env
VITE_API_URL=https://<your-render-backend>.onrender.com
```

### Backend (Render)
Set the production values in Render Environment Variables:

```env
APP_ENV=production
DEBUG=False
FRONTEND_URL=https://<your-frontend-domain>
CORS_ORIGINS=https://<your-frontend-domain>
FIREBASE_PROJECT_ID=<your-project>
FIREBASE_CLIENT_EMAIL=<your-service-account-email>
FIREBASE_PRIVATE_KEY=<your-private-key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail-address>
SMTP_PASSWORD=<your-gmail-app-password>
SMTP_FROM_EMAIL=<your-gmail-address>
```

Never commit `.env`, Firebase service-account JSON, private keys, API keys, SMTP passwords, or JWT secrets.

### OTP Production Flow

Registration and password-reset OTPs are generated on the backend and sent through the configured SMTP server. The OTP is not returned to the frontend. Login also supports email OTP through the backend.

A deployment smoke check is available at:

```
GET /api/health
GET /api/health/email
```

`/api/health/email` reports only whether SMTP is configured; it never exposes credentials.
