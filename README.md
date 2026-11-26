# Didwana Bullion

**Didwana Bullion** *(by New Monika Jewellers, Station Road, Didwana — PIN 341303)* is a dedicated, high-security Android application (`com.didwanabullion.app`) and PostgreSQL authentication backend built exclusively for **real-time live bullion rates** from three trusted sources:

1. **Himanshu Bullion (HB Jodhpur)**
2. **Mosun & Sons (Sujangarh)**
3. **IBJA Official Benchmark**

No e-commerce storefront, cart, or jewellery catalog—strictly live bullion terminals, arbitrage spreads, historical charts, authentication, and legal compliance.

---

## Repository Structure

```text
.
├── didwana-bullion-app/        # React + Vite + Tailwind + Capacitor Android APK
│   ├── src/
│   │   ├── components/         # SplashGate, AuthScreens, LiveRatesTab, ChartsTab, AccountTab, LegalScreens
│   │   ├── config/             # App constants, terminal metadata, API URLs
│   │   └── services/           # CapacitorHttp/fetch API client, consent-aware storage, tick audio
│   ├── android/                # Native Capacitor Android project (com.didwanabullion.app)
│   └── capacitor.config.json   # SplashScreen (#111111), StatusBar, HTTPS scheme
│
└── didwana-bullion-backend/    # Node.js + Express + PostgreSQL Auth & Compliance Backend
    ├── src/
    │   ├── db/                 # PostgreSQL pool & schema.sql (users table with UUIDs)
    │   ├── middleware/         # JWT verification & express-rate-limit brute-force protection
    │   ├── routes/             # /api/auth/* (signup, login, me, preferences, delete account)
    │   └── server.js           # Express app with helmet, CORS, and /health check
    └── render.yaml             # 1-Click Render Web Service + Managed PostgreSQL Blueprint
```

---

## Key Features

### Live 3-Terminal Bullion Board
- **Live 3-Way Arbitrage Ribbon:** Side-by-side spread cards for `Gold 995`, `Silver Peti (1KG)`, `22K 916`, and `Silver Chorsa`.
- **Terminal Switcher:** `ALL TERMINALS` | `HB JODHPUR` | `MOSUN & SONS` | `IBJA OFFICIAL`.
- **0s-Delay SSE Stream:** Real-time updates via `/api/prices/stream` with green (`▲`) / red (`▼`) tick flashes, Bid/Ask, High/Low, Mandi vs IBJA differential, and optional Web Audio tick chime.
- **Interactive Spread & History Charts:** `1D`, `1W`, `1M`, `1Y` comparisons for Gold 995 and Silver Peti.

### Authentication & Account Security
- **Branded Splash Screen:** Deep Obsidian (`#111111`) background with custom **Didwana Bullion** gold crest (`#B59A6C`).
- **Sign Up & Sign In:** Email or `+91` Mobile + Password, show/hide toggle, **Remember Me**, real-time 5-rule password strength meter (`8+ chars`, uppercase, lowercase, number, symbol), and Forgot Password support.
- **PostgreSQL Storage:** User accounts (`id` UUID, `name`, `email`, `phone`, `password_hash`, `accepted_legal_version`, `accepted_legal_at`, `cookie_functional`) stored safely in PostgreSQL with `bcryptjs` (cost 12) and parameterized SQL queries.

### Legal & Cookie Compliance
- **First-Launch Consent Banner & Preferences Modal:**
  - **Essential Storage (Always Active):** JWT session token & security state.
  - **Functional Preferences (Toggleable):** Tick audio mute/unmute, default terminal filter, chart timeframe.
- **In-App Legal Readers:** **Terms & Conditions** (indicative rates disclaimer; final physical rates confirmed at New Monika Jewellers, Didwana), **Privacy Policy** (zero third-party data selling; account deletion support at `+91 9521014851`), and **Cookies Policy** accessible before login and anytime under **Account → Legal & Privacy**.

### Android APK Security Hardening
- `android:usesCleartextTraffic="false"` in `AndroidManifest.xml`
- `network_security_config.xml` enforcing HTTPS/TLS 1.2+
- `android:allowBackup="false"` preventing unencrypted cloud backups of session storage
- `CapacitorHttp` native transport for reliable API calls on Android
- R8/ProGuard code shrinking & obfuscation (`minifyEnabled true`, `shrinkResources true`) on release builds

---

## Getting Started

### 1. Deploy or Run the PostgreSQL Backend (`didwana-bullion-backend/`)

**Option A — 1-Click Render Deploy (Recommended for Mobile APK)**
1. Connect this repository (`ayushsoni05/Didwana-Bullion`) on [Render](https://render.com) as a **Blueprint** using `didwana-bullion-backend/render.yaml`.
2. Render automatically provisions the `didwana-bullion-db` PostgreSQL database, generates `JWT_SECRET`, and deploys the HTTPS API.

**Option B — Local Development**
```bash
cd didwana-bullion-backend
cp .env.example .env
# Edit .env with your PostgreSQL DATABASE_URL and JWT_SECRET
npm install
npm start
```

Verify health:
```bash
curl http://localhost:5050/health
# {"status":"ok","database":"postgresql"}
```

---

### 2. Build the Android App & APK (`didwana-bullion-app/`)

```bash
cd didwana-bullion-app
npm install
```

Set `VITE_AUTH_BASE_URL` to your deployed HTTPS PostgreSQL backend before building (optional; defaults to `VITE_API_BASE_URL`):
```bash
# PowerShell example
$env:VITE_AUTH_BASE_URL="https://your-didwana-bullion-backend.onrender.com"
npm run build
npx cap sync android
```

Compile the Android APK:
```bash
cd android
.\gradlew assembleDebug
```
Output APK: `didwana-bullion-app/android/app/build/outputs/apk/debug/app-debug.apk`

For a Play Store / production release build, configure `signingConfigs.release` in `android/app/build.gradle` (never commit `.jks` or `key.properties`) and run:
```bash
.\gradlew assembleRelease
```

---

## API Endpoints

### Auth Backend (`didwana-bullion-backend`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server & PostgreSQL connectivity check |
| `POST` | `/api/auth/signup` | Register user in PostgreSQL & return JWT |
| `POST` | `/api/auth/login` | Authenticate via email or `+91` phone & return JWT |
| `GET` | `/api/auth/me` | Get authenticated user profile |
| `PATCH` | `/api/auth/preferences` | Update cookie/functional consent preference |
| `DELETE` | `/api/auth/me` | Permanently delete user account & data |

### Live Bullion Feeds
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/prices/latest` | Latest rates from HB Jodhpur & Mosun & Sons |
| `GET` | `/api/prices/ibja-live` | Official IBJA benchmark rates |
| `GET` | `/api/prices/stream` | Real-time 0s-delay SSE live price stream |
| `GET` | `/api/prices/history` | Historical rate series (`1D`, `1W`, `1M`, `1Y`) |

---

## Contact & Showroom

**New Monika Jewellers**
Station Road, Didwana, Rajasthan — PIN 341303
Support & Account Deletion: `+91 9521014851`
